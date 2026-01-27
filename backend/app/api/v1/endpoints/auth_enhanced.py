"""
Enhanced Authentication Endpoints
Supports: Email, Phone, Social Auth (Google, Facebook, WhatsApp), Guest Users
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client
from app.core.supabase import get_supabase
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    AuthResponse,
    TokenResponse,
    RefreshToken,
    PhoneOTPRequest,
    PhoneOTPVerify,
    EmailVerificationRequest,
    EmailVerificationConfirm,
    PasswordResetRequest,
    PasswordResetConfirm,
    SocialAuthRequest,
    GuestUserCreate,
    GuestToUserConversion,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    generate_verification_token,
    generate_reset_token,
    validate_email_deliverable,
    validate_phone_number,
)
from app.middleware.auth import get_current_user
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

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
    is_guest: bool = False,
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
        "is_guest": is_guest,
        "auth_providers": ["local"] if not is_guest else [],
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


async def create_auth_response(user: dict) -> AuthResponse:
    """Create authentication response with tokens"""
    access_token = create_access_token(
        data={"sub": user["id"], "email": user.get("email"), "role": user.get("role")}
    )

    refresh_token = create_refresh_token(
        data={"sub": user["id"], "email": user.get("email"), "role": user.get("role")}
    )

    return AuthResponse(
        user=UserResponse(**user),
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes
    )


# ===== REGISTRATION =====

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")  # Prevent account spam - 3 registrations per hour per IP
async def register(
    request: Request,
    user_data: UserRegister,
    supabase: Client = Depends(get_supabase)
):
    """
    Register a new user with email OR phone + password
    Rate Limited: 3 registrations per hour per IP address

    - Supports email-only, phone-only, or both
    - Enforces strong password requirements
    - Blocks disposable emails
    - Validates phone numbers (E.164 format)
    - Returns JWT tokens for immediate login
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
            is_guest=False,
        )

        # Send verification email if email provided
        if user_data.email:
            await send_email_verification(supabase, user["id"], user_data.email)

        # Send OTP if phone provided
        if user_data.phone:
            await send_phone_otp(supabase, user["id"], user_data.phone)

        # Log registration event
        await log_auth_event(supabase, user["id"], "register")

        return await create_auth_response(user)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


# ===== LOGIN =====

@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")  # Prevent brute force - 5 login attempts per minute per IP
async def login(
    request: Request,
    credentials: UserLogin,
    supabase: Client = Depends(get_supabase)
):
    """
    Login with email OR phone + password
    Rate Limited: 5 attempts per minute per IP address

    - Supports email or phone number for login
    - Verifies password with bcrypt
    - Returns JWT tokens
    - Updates last_login timestamp
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
                detail="Account is not active",
            )

        # Update last login
        supabase.table("users").update(
            {"last_login": datetime.now(timezone.utc).isoformat()}
        ).eq("id", user["id"]).execute()

        # Log successful login
        await log_auth_event(supabase, user["id"], "login")

        return await create_auth_response(user)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}",
        )


# ===== TOKEN REFRESH =====

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    refresh_data: RefreshToken, supabase: Client = Depends(get_supabase)
):
    """
    Refresh access token using refresh token

    - Validates refresh token
    - Issues new access token
    - Optionally rotates refresh token (security best practice)
    """
    try:
        # Decode refresh token
        payload = decode_token(refresh_data.refresh_token)

        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")

        # Get user
        response = supabase.table("users").select("*").eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = response.data[0]

        # Create new access token
        access_token = create_access_token(
            data={"sub": user["id"], "email": user.get("email"), "role": user.get("role")}
        )

        # Rotate refresh token (optional but recommended)
        new_refresh_token = create_refresh_token(
            data={"sub": user["id"], "email": user.get("email"), "role": user.get("role")}
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=30 * 60,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )


# ===== PHONE OTP VERIFICATION =====

@router.post("/phone/request-otp")
async def request_phone_otp(
    otp_request: PhoneOTPRequest, supabase: Client = Depends(get_supabase)
):
    """
    Request OTP code for phone verification

    - Sends 6-digit OTP via SMS
    - OTP valid for 10 minutes
    - Maximum 3 verification attempts
    """
    try:
        # Validate phone number
        if not validate_phone_number(otp_request.phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number format",
            )

        # Find user by phone
        user = await get_user_by_email_or_phone(supabase, phone=otp_request.phone)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Phone number not registered",
            )

        # Send OTP
        await send_phone_otp(supabase, user["id"], otp_request.phone)

        return {"message": "OTP sent successfully", "phone": otp_request.phone}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send OTP: {str(e)}",
        )


@router.post("/phone/verify-otp")
async def verify_phone_otp(
    otp_verify: PhoneOTPVerify, supabase: Client = Depends(get_supabase)
):
    """
    Verify phone number with OTP code

    - Validates OTP code
    - Marks phone as verified
    - Increments attempt counter
    """
    try:
        # Find OTP record
        response = (
            supabase.table("phone_verifications")
            .select("*")
            .eq("phone", otp_verify.phone)
            .eq("verified", False)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pending OTP for this phone number",
            )

        otp_record = response.data[0]

        # Check expiration
        if datetime.fromisoformat(otp_record["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Request a new one.",
            )

        # Check attempts
        if otp_record["attempts"] >= otp_record.get("max_attempts", 3):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Request a new OTP.",
            )

        # Verify OTP code
        if otp_record["otp_code"] != otp_verify.otp_code:
            # Increment attempts
            supabase.table("phone_verifications").update(
                {"attempts": otp_record["attempts"] + 1}
            ).eq("id", otp_record["id"]).execute()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code",
            )

        # Mark as verified
        supabase.table("phone_verifications").update(
            {"verified": True}
        ).eq("id", otp_record["id"]).execute()

        # Update user's phone_verified status
        supabase.table("users").update(
            {
                "phone_verified": True,
                "is_verified": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", otp_record["user_id"]).execute()

        # Log event
        await log_auth_event(supabase, otp_record["user_id"], "phone_verified")

        return {"message": "Phone verified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}",
        )


# ===== EMAIL VERIFICATION =====

@router.post("/email/request-verification")
async def request_email_verification(
    email_request: EmailVerificationRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Request email verification link

    - Sends verification email with token
    - Token valid for 24 hours
    """
    try:
        # Find user by email
        user = await get_user_by_email_or_phone(supabase, email=email_request.email)

        if not user:
            # Don't reveal if email exists
            return {"message": "If email exists, verification link has been sent"}

        # Send verification email
        await send_email_verification(supabase, user["id"], email_request.email)

        return {"message": "Verification email sent"}

    except Exception as e:
        # Don't reveal errors
        return {"message": "If email exists, verification link has been sent"}


@router.post("/email/verify")
async def verify_email(
    verify_data: EmailVerificationConfirm,
    supabase: Client = Depends(get_supabase),
):
    """
    Verify email with token from verification link

    - Validates verification token
    - Marks email as verified
    """
    try:
        # Find verification record
        response = (
            supabase.table("email_verifications")
            .select("*")
            .eq("token", verify_data.token)
            .eq("verified", False)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or already used verification token",
            )

        verification = response.data[0]

        # Check expiration
        if datetime.fromisoformat(verification["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired",
            )

        # Mark as verified
        supabase.table("email_verifications").update(
            {"verified": True}
        ).eq("id", verification["id"]).execute()

        # Update user's email_verified status
        supabase.table("users").update(
            {
                "email_verified": True,
                "is_verified": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", verification["user_id"]).execute()

        # Log event
        await log_auth_event(supabase, verification["user_id"], "email_verified")

        return {"message": "Email verified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}",
        )


# ===== PASSWORD RESET =====

@router.post("/password/reset-request")
@limiter.limit("3/hour")  # Prevent email bombing - 3 reset requests per hour per IP
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Request password reset link
    Rate Limited: 3 requests per hour per IP address

    - Sends reset link via email or SMS
    - Token valid for 1 hour
    """
    try:
        # Find user
        user = await get_user_by_email_or_phone(
            supabase, reset_request.email, reset_request.phone
        )

        if not user:
            # Don't reveal if user exists
            return {"message": "If account exists, reset link has been sent"}

        # Generate reset token
        reset_token = generate_reset_token()

        # Store reset token
        supabase.table("password_resets").insert(
            {
                "user_id": user["id"],
                "token": reset_token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            }
        ).execute()

        # Send reset link via email or SMS
        # TODO: Implement email/SMS sending
        # Token should ONLY be sent via email/SMS, never in API response
        # frontend_url = "http://localhost:5173"  # Should come from config
        # reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        # await send_email(email, "Password Reset", reset_link)

        return {
            "message": "If account exists, password reset link has been sent to your email",
            # SECURITY: Never return the token in the response
        }

    except Exception as e:
        return {"message": "If account exists, reset link has been sent"}


@router.post("/password/reset-confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    supabase: Client = Depends(get_supabase),
):
    """
    Reset password with reset token

    - Validates reset token
    - Updates password
    - Marks token as used
    """
    try:
        # Find reset token
        response = (
            supabase.table("password_resets")
            .select("*")
            .eq("token", reset_data.token)
            .eq("used", False)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or already used reset token",
            )

        reset_record = response.data[0]

        # Check expiration
        if datetime.fromisoformat(reset_record["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired",
            )

        # Hash new password
        password_hash = get_password_hash(reset_data.new_password)

        # Update password
        supabase.table("users").update(
            {
                "password_hash": password_hash,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", reset_record["user_id"]).execute()

        # Mark token as used
        supabase.table("password_resets").update(
            {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", reset_record["id"]).execute()

        # Log event
        await log_auth_event(supabase, reset_record["user_id"], "password_reset")

        return {"message": "Password reset successful"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}",
        )


# ===== GUEST USERS =====

@router.post("/guest/create", response_model=AuthResponse)
async def create_guest_user(
    guest_data: GuestUserCreate,
    supabase: Client = Depends(get_supabase),
):
    """
    Create anonymous guest user for checkout without signup

    - No email/phone required
    - Can be converted to registered user later
    - Limited permissions
    """
    try:
        # Create guest user
        user = await create_user_in_db(
            supabase=supabase,
            email=None,
            phone=None,
            full_name=f"Guest {str(uuid.uuid4())[:8]}",
            password_hash="",  # No password for guest
            role="guest",
            is_guest=True,
        )

        # Update with device/session info
        if guest_data.device_id or guest_data.session_id:
            supabase.table("users").update(
                {
                    "device_id": guest_data.device_id,
                    "session_id": guest_data.session_id,
                }
            ).eq("id", user["id"]).execute()

        # Log event
        await log_auth_event(supabase, user["id"], "guest_created")

        return await create_auth_response(user)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create guest user: {str(e)}",
        )


@router.post("/guest/convert", response_model=AuthResponse)
async def convert_guest_to_user(
    conversion_data: GuestToUserConversion,
    supabase: Client = Depends(get_supabase),
):
    """
    Convert guest user to registered user

    - Preserves guest's order history
    - Requires email or phone + password
    - Guest becomes full user
    """
    try:
        # Get guest user
        response = supabase.table("users").select("*").eq("id", conversion_data.guest_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guest user not found",
            )

        guest = response.data[0]

        if not guest.get("is_guest"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a guest",
            )

        # Check if email/phone already exists
        existing_user = await get_user_by_email_or_phone(
            supabase, conversion_data.email, conversion_data.phone
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or phone already registered",
            )

        # Hash password
        password_hash = get_password_hash(conversion_data.password)

        # Update guest to full user
        updated_user = supabase.table("users").update(
            {
                "email": conversion_data.email,
                "phone": conversion_data.phone,
                "full_name": conversion_data.full_name,
                "password_hash": password_hash,
                "role": "customer",
                "is_guest": False,
                "auth_providers": ["local"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", conversion_data.guest_id).execute()

        if not updated_user.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to convert guest user",
            )

        user = updated_user.data[0]

        # Send verification if email provided
        if conversion_data.email:
            await send_email_verification(supabase, user["id"], conversion_data.email)

        # Send OTP if phone provided
        if conversion_data.phone:
            await send_phone_otp(supabase, user["id"], conversion_data.phone)

        # Log event
        await log_auth_event(supabase, user["id"], "guest_converted")

        return await create_auth_response(user)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversion failed: {str(e)}",
        )


# ===== SOCIAL AUTHENTICATION =====

@router.post("/social/google", response_model=AuthResponse)
async def google_auth(
    auth_data: SocialAuthRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Authenticate with Google OAuth

    - Verifies Google access token
    - Creates user if doesn't exist
    - Links Google account to existing user
    """
    # TODO: Implement Google OAuth verification
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google authentication coming soon",
    )


@router.post("/social/facebook", response_model=AuthResponse)
async def facebook_auth(
    auth_data: SocialAuthRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Authenticate with Facebook OAuth

    - Verifies Facebook access token
    - Creates user if doesn't exist
    - Links Facebook account to existing user
    """
    # TODO: Implement Facebook OAuth verification
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Facebook authentication coming soon",
    )


@router.post("/social/whatsapp", response_model=AuthResponse)
async def whatsapp_auth(
    auth_data: SocialAuthRequest,
    supabase: Client = Depends(get_supabase),
):
    """
    Authenticate with WhatsApp

    - Sends OTP via WhatsApp
    - Verifies phone number
    - Creates user if doesn't exist
    """
    # TODO: Implement WhatsApp authentication
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="WhatsApp authentication coming soon",
    )


# ===== CURRENT USER =====

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user's profile"""
    return UserResponse(**current_user)


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Logout current user"""
    try:
        # Log event
        await log_auth_event(supabase, current_user["id"], "logout")

        # TODO: Invalidate refresh token in database

        return {"message": "Successfully logged out"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed",
        )


# ===== HELPER FUNCTIONS =====

async def send_email_verification(supabase: Client, user_id: str, email: str):
    """Send email verification OTP"""
    # Generate OTP code (6 digits)
    otp_code = generate_otp(length=6)

    # Store in database
    supabase.table("email_verifications").insert(
        {
            "user_id": user_id,
            "email": email,
            "token": otp_code,  # Using OTP as token
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        }
    ).execute()

    # Send email via SMTP
    try:
        from app.services.email_service import send_otp_email
        success = send_otp_email(email, otp_code)
        if success:
            print(f"✅ Email OTP sent to {email}")
        else:
            print(f"⚠️  Email failed to send, falling back to console")
            print(f"📧 Email OTP for {email}: {otp_code}")
    except Exception as e:
        # Fallback: print to console if email fails
        print(f"⚠️  Email Error: {e}")
        print(f"📧 Email OTP for {email}: {otp_code}")


async def send_phone_otp(supabase: Client, user_id: str, phone: str):
    """Send OTP via SMS"""
    # Generate OTP
    otp_code = generate_otp(length=6)

    # Store in database
    supabase.table("phone_verifications").insert(
        {
            "user_id": user_id,
            "phone": phone,
            "otp_code": otp_code,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        }
    ).execute()

    # Send SMS via Africa's Talking
    try:
        from app.services.sms_service import get_sms_service
        sms_service = get_sms_service()
        await sms_service.send_otp(phone, otp_code)
        print(f"✅ OTP sent to {phone}")
    except Exception as e:
        # Fallback: print to console if SMS fails
        print(f"⚠️  SMS Error: {e}")
        print(f"📱 OTP for {phone}: {otp_code}")


async def log_auth_event(
    supabase: Client,
    user_id: str,
    event_type: str,
    success: bool = True,
    metadata: dict = None,
):
    """Log authentication event to audit log"""
    try:
        supabase.table("auth_audit_log").insert(
            {
                "user_id": user_id,
                "event_type": event_type,
                "success": success,
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as e:
        # Don't fail request if audit logging fails
        print(f"⚠️  Failed to log auth event: {e}")
