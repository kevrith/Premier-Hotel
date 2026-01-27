"""
Secure Cookie-Based Authentication Endpoints
REPLACES: auth_enhanced.py token-based authentication
SECURITY: Uses httpOnly cookies to prevent XSS token theft
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client
from app.core.supabase import get_supabase
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    PhoneOTPRequest,
    PhoneOTPVerify,
    EmailVerificationRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    validate_email_deliverable,
    validate_phone_number,
    generate_reset_token,
)
from app.core.cookie_auth import (
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user_from_cookie,
    refresh_access_token_from_cookie,
)
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
import logging

router = APIRouter()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


# ===== HELPER FUNCTIONS =====

async def create_user_in_db(
    supabase: Client,
    email: Optional[str],
    phone: Optional[str],
    full_name: str,
    password_hash: str,
    role: str = "customer",
) -> dict:
    """Create a new user in the database"""
    user_data = {
        "id": str(uuid.uuid4()),
        "email": email,
        "phone": phone,
        "full_name": full_name,
        "password_hash": password_hash,
        "role": role,
        "status": "active",
        "auth_providers": ["local"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    response = supabase.table("users").insert(user_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )

    return response.data[0]


async def get_user_by_email_or_phone(
    supabase: Client, email: Optional[str] = None, phone: Optional[str] = None
) -> Optional[dict]:
    """Find user by email or phone"""
    if email:
        response = supabase.table("users").select("*").eq("email", email).execute()
        if response.data:
            return response.data[0]

    if phone:
        response = supabase.table("users").select("*").eq("phone", phone).execute()
        if response.data:
            return response.data[0]

    return None


async def log_auth_event(
    supabase: Client, user_id: str, event_type: str, success: bool = True
) -> None:
    """Log authentication events for security auditing"""
    try:
        supabase.table("auth_logs").insert({
            "user_id": user_id,
            "event_type": event_type,
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        # Don't fail the request if logging fails
        pass


# ===== REGISTRATION =====

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
async def register(
    request: Request,
    response: Response,
    user_data: UserRegister,
    supabase: Client = Depends(get_supabase)
):
    """
    Register a new user with httpOnly cookie authentication

    Rate Limited: 3 registrations per hour per IP address

    Security Features:
    - Tokens stored in httpOnly cookies (XSS protection)
    - SameSite=Lax cookie attribute (CSRF protection)
    - Secure flag in production (HTTPS only)
    - Strong password requirements
    - Disposable email blocking
    - Phone number validation

    Returns:
        User profile (tokens set in httpOnly cookies)
    """
    try:
        # Validate email if provided
        if user_data.email:
            if not validate_email_deliverable(user_data.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Disposable email addresses are not allowed",
                )

        # Validate phone if provided
        if user_data.phone:
            if not validate_phone_number(user_data.phone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid phone number format. Use E.164 format (+254712345678)",
                )

        # Check if user already exists
        existing_user = await get_user_by_email_or_phone(
            supabase, user_data.email, user_data.phone
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or phone already exists",
            )

        # Hash password
        password_hash = get_password_hash(user_data.password)

        # Create user
        user = await create_user_in_db(
            supabase=supabase,
            email=user_data.email,
            phone=user_data.phone,
            full_name=user_data.full_name,
            password_hash=password_hash,
            role=user_data.role,
        )

        # Set httpOnly authentication cookies
        set_auth_cookies(
            response=response,
            user_id=user["id"],
            email=user.get("email"),
            role=user.get("role")
        )

        # Log registration event
        await log_auth_event(supabase, user["id"], "register")

        # Return user profile without tokens in response body for security
        return {
            "user": UserResponse(**user),
            "message": "Registration successful. Authentication cookies set."
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log the specific error for debugging without exposing to client
        logging.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again.",
        )


# ===== LOGIN =====

@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    credentials: UserLogin,
    supabase: Client = Depends(get_supabase)
):
    """
    Login with httpOnly cookie authentication

    Rate Limited: 5 attempts per minute per IP address

    Security Features:
    - Tokens stored in httpOnly cookies (prevents XSS)
    - Brute force protection via rate limiting
    - Failed login attempt logging
    - Account status validation

    Returns:
        User profile (tokens set in httpOnly cookies)
    """
    try:
        # Find user by email or phone
        user = await get_user_by_email_or_phone(
            supabase, credentials.email, credentials.phone
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        # Verify password
        if not verify_password(credentials.password, user["password_hash"]):
            # Log failed login
            await log_auth_event(supabase, user["id"], "failed_login", success=False)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        # Check if account is active
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {user.get('status')}. Please contact support.",
            )

        # Update last login
        supabase.table("users").update(
            {"last_login": datetime.now(timezone.utc).isoformat()}
        ).eq("id", user["id"]).execute()

        # Set httpOnly authentication cookies
        set_auth_cookies(
            response=response,
            user_id=user["id"],
            email=user.get("email"),
            role=user.get("role")
        )

        # Log successful login
        await log_auth_event(supabase, user["id"], "login")

        # Return user profile without tokens in response body for security
        return {
            "user": UserResponse(**user),
            "message": "Login successful. Authentication cookies set."
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log the specific error for debugging without exposing to client
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again.",
        )


# ===== LOGOUT =====

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    supabase: Client = Depends(get_supabase)
):
    """
    Logout and clear authentication cookies

    Security:
    - Clears both access and refresh token cookies
    - Logs logout event for audit trail
    """
    try:
        # Get current user (if token is still valid)
        try:
            user_data = get_current_user_from_cookie(request)
            user_id = user_data.get("sub")

            # Log logout event
            if user_id:
                await log_auth_event(supabase, user_id, "logout")
        except HTTPException:
            # Token might be expired or invalid, still clear cookies
            pass

        # Clear authentication cookies
        clear_auth_cookies(response)

        return {"message": "Logout successful. Authentication cookies cleared."}

    except Exception as e:
        # Always clear cookies even if logging fails
        clear_auth_cookies(response)
        return {"message": "Logout successful."}


# ===== TOKEN REFRESH =====

@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response
):
    """
    Refresh access token using refresh token cookie

    Security:
    - Validates refresh token from httpOnly cookie
    - Issues new access token in httpOnly cookie
    - Prevents token theft via XSS

    Returns:
        Success message (new access token set in cookie)
    """
    try:
        # Refresh access token from cookie
        payload = refresh_access_token_from_cookie(request, response)

        return {
            "message": "Token refreshed successfully",
            "user_id": payload.get("sub"),
            "role": payload.get("role")
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}",
        )


# ===== WEBSOCKET TOKEN =====

@router.get("/ws-token")
async def get_websocket_token(
    request: Request,
    supabase: Client = Depends(get_supabase)
):
    """
    Get a JWT token for WebSocket authentication
    
    WebSocket connections cannot use httpOnly cookies, so this endpoint
    provides a short-lived JWT token specifically for WebSocket authentication.
    
    Security:
    - Validates user via httpOnly cookie first
    - Returns short-lived token (5 minutes)
    - Token is only valid for WebSocket connections
    
    Returns:
        JWT token for WebSocket authentication
    """
    try:
        # Validate user from cookie
        user_data = get_current_user_from_cookie(request)
        user_id = user_data.get("sub")
        
        # Create short-lived token for WebSocket (5 minutes)
        from app.core.security import create_access_token
        from datetime import timedelta
        
        ws_token = create_access_token(
            data={
                "sub": user_id,
                "email": user_data.get("email"),
                "role": user_data.get("role"),
                "type": "websocket"
            },
            expires_delta=timedelta(minutes=5)
        )
        
        return {"ws_token": ws_token}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate WebSocket token: {str(e)}",
        )


# ===== GET CURRENT USER =====

@router.get("/me")
async def get_current_user(
    request: Request,
    supabase: Client = Depends(get_supabase)
):
    """
    Get current authenticated user from cookie

    Security:
    - Validates access token from httpOnly cookie
    - Returns user profile without exposing tokens

    Returns:
        Current user profile
    """
    try:
        # Get user data from cookie
        user_data = get_current_user_from_cookie(request)
        user_id = user_data.get("sub")

        # Fetch full user profile from database
        response = supabase.table("users").select("*").eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = response.data[0]

        # Check if account is still active
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {user.get('status')}",
            )

        return {"user": UserResponse(**user)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}",
        )


# ===== PASSWORD RESET =====

@router.post("/password-reset/request")
@limiter.limit("3/hour")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Request password reset link

    Rate Limited: 3 requests per hour per IP

    Security:
    - Rate limited to prevent abuse
    - Doesn't reveal if email exists (security best practice)
    - Generates secure random reset token
    """
    try:
        # Find user by email
        user = await get_user_by_email_or_phone(supabase, email=reset_request.email)

        if user:
            # Generate reset token
            from datetime import timedelta
            reset_token = generate_reset_token()

            # Store reset token in database (expires in 1 hour)
            supabase.table("password_reset_tokens").insert({
                "user_id": user["id"],
                "token": reset_token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()

            # Send password reset email
            # TODO: Implement email sending
            # await send_password_reset_email(user["email"], reset_token)

            # Log password reset request
            await log_auth_event(supabase, user["id"], "password_reset_request")

        # Always return success (don't reveal if email exists)
        return {
            "message": "If the email exists, a password reset link has been sent."
        }

    except Exception as e:
        # Don't expose internal errors
        return {
            "message": "If the email exists, a password reset link has been sent."
        }


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    supabase: Client = Depends(get_supabase)
):
    """
    Confirm password reset with token

    Security:
    - Validates reset token
    - Checks token expiration
    - Hashes new password
    - Invalidates reset token after use
    """
    try:
        from datetime import timedelta

        # Find valid reset token
        response = supabase.table("password_reset_tokens").select("*").eq(
            "token", reset_data.token
        ).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        reset_record = response.data[0]

        # Check if token is expired
        expires_at = datetime.fromisoformat(reset_record["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired. Please request a new one.",
            )

        # Hash new password
        password_hash = get_password_hash(reset_data.new_password)

        # Update user password
        supabase.table("users").update({
            "password_hash": password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", reset_record["user_id"]).execute()

        # Invalidate reset token
        supabase.table("password_reset_tokens").delete().eq(
            "token", reset_data.token
        ).execute()

        # Log password reset
        await log_auth_event(supabase, reset_record["user_id"], "password_reset")

        return {"message": "Password reset successful. Please login with your new password."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}",
        )
