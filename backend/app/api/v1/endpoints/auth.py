"""
Authentication Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase import get_supabase
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserUpdate,
    ChangePassword,
    UserResponse,
    AuthResponse,
    RefreshToken,
)
from app.middleware.auth import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    security,
)
from datetime import timedelta
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, supabase: Client = Depends(get_supabase)):
    """
    Register a new user

    - Creates a new user account with email and password
    - Returns user data and authentication tokens
    """
    try:
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed",
            )

        user_id = auth_response.user.id

        # Create profile
        profile_data = {
            "id": user_id,
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "phone": user_data.phone,
            "role": "customer",
            "status": "active",
        }

        profile_response = supabase.table("profiles").insert(profile_data).execute()

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile",
            )

        user = profile_response.data[0]

        # Create tokens
        access_token = create_access_token(
            data={"sub": user_id, "email": user_data.email}
        )
        refresh_token = create_refresh_token(
            data={"sub": user_id, "email": user_data.email}
        )

        return AuthResponse(
            user=UserResponse(**user),
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except Exception as e:
        if "already registered" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin, supabase: Client = Depends(get_supabase)):
    """
    Login user

    - Authenticates user with email and password
    - Returns user data and authentication tokens
    """
    try:
        # Sign in with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        user_id = auth_response.user.id

        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found",
            )

        user = profile_response.data[0]

        # Check if user is active
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active",
            )

        # Create tokens
        access_token = create_access_token(
            data={"sub": user_id, "email": credentials.email}
        )
        refresh_token = create_refresh_token(
            data={"sub": user_id, "email": credentials.email}
        )

        return AuthResponse(
            user=UserResponse(**user),
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Logout user

    - Signs out the current user
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed",
        )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    refresh_data: RefreshToken,
    supabase: Client = Depends(get_supabase),
):
    """
    Refresh access token

    - Uses refresh token to get a new access token
    """
    try:
        # Verify refresh token
        payload = verify_token(refresh_data.refresh_token)

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        user_id = payload.get("sub")
        email = payload.get("email")

        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = profile_response.data[0]

        # Create new tokens
        access_token = create_access_token(data={"sub": user_id, "email": email})
        new_refresh_token = create_refresh_token(data={"sub": user_id, "email": email})

        return AuthResponse(
            user=UserResponse(**user),
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user profile

    - Returns the authenticated user's profile
    """
    return UserResponse(**current_user)


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Update user profile

    - Updates the current user's profile information
    """
    try:
        # Prepare update data (exclude None values)
        update_data = profile_data.model_dump(exclude_unset=True)

        if not update_data:
            return UserResponse(**current_user)

        # Update profile
        response = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", current_user["id"])
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile",
            )

        return UserResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Change password

    - Changes the current user's password
    """
    try:
        # Verify current password by attempting to sign in
        auth_response = supabase.auth.sign_in_with_password({
            "email": current_user["email"],
            "password": password_data.current_password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )

        # Update password
        supabase.auth.update_user({"password": password_data.new_password})

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password",
        )


@router.post("/forgot-password")
async def forgot_password(email: str, supabase: Client = Depends(get_supabase)):
    """
    Request password reset

    - Sends password reset email
    """
    try:
        supabase.auth.reset_password_for_email(email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        # Don't reveal if email exists
        return {"message": "If email exists, password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    supabase: Client = Depends(get_supabase),
):
    """
    Reset password with token

    - Resets password using reset token
    """
    try:
        # Verify token and update password
        payload = verify_token(token)
        user_id = payload.get("sub")

        supabase.auth.update_user({"password": new_password})

        return {"message": "Password reset successful"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
