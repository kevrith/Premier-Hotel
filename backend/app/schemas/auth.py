"""
Authentication Schemas
Supports: Email, Phone, Social Auth (Google, Facebook, WhatsApp), Guest Users
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Literal
from datetime import datetime
import re


class UserBase(BaseModel):
    """Base user schema"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{8,14}$")
    full_name: str = Field(..., min_length=2, max_length=100)

    @validator('email', 'phone')
    def at_least_one_contact(cls, v, values):
        """Ensure at least email or phone is provided"""
        if 'email' in values or 'phone' in values:
            if not values.get('email') and not v:
                raise ValueError('Either email or phone number must be provided')
        return v


class UserRegister(UserBase):
    """User registration schema - email or phone + password"""
    password: str = Field(..., min_length=8, max_length=100)
    role: Literal["customer", "staff"] = "customer"

    @validator('password')
    def validate_password_strength(cls, v):
        """Enforce strong password"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class UserLogin(BaseModel):
    """User login schema - email or phone + password"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str

    @validator('email', 'phone')
    def at_least_one_identifier(cls, v, values):
        """Ensure at least email or phone is provided"""
        if 'email' in values or 'phone' in values:
            if not values.get('email') and not v:
                raise ValueError('Either email or phone number must be provided')
        return v


class UserUpdate(BaseModel):
    """User profile update schema"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePassword(BaseModel):
    """Change password schema"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str
    status: str

    # Verification status
    email_verified: bool = False
    phone_verified: bool = False
    is_verified: bool = False

    # Profile
    profile_picture: Optional[str] = None

    # Auth providers
    auth_providers: list[str] = []  # ['local', 'google', 'facebook', 'whatsapp']

    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshToken(BaseModel):
    """Refresh token schema"""
    refresh_token: str


class AuthResponse(BaseModel):
    """Complete auth response with user and tokens"""
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# ===== SOCIAL AUTHENTICATION =====

class SocialAuthRequest(BaseModel):
    """Social authentication request"""
    provider: Literal["google", "facebook", "whatsapp"]
    access_token: str  # Token from social provider
    provider_user_id: Optional[str] = None


class SocialAuthRegister(BaseModel):
    """Register new user via social auth"""
    provider: Literal["google", "facebook", "whatsapp"]
    provider_user_id: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=100)
    profile_picture: Optional[str] = None
    access_token: str


# ===== PHONE VERIFICATION =====

class PhoneOTPRequest(BaseModel):
    """Request OTP for phone number"""
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{8,14}$")


class PhoneOTPVerify(BaseModel):
    """Verify phone with OTP code"""
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{8,14}$")
    otp_code: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$")


# ===== EMAIL VERIFICATION =====

class EmailVerificationRequest(BaseModel):
    """Request email verification"""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Confirm email with verification token"""
    token: str = Field(..., min_length=32, max_length=128)


# ===== PASSWORD RESET =====

class PasswordResetRequest(BaseModel):
    """Request password reset link"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

    @validator('email', 'phone')
    def at_least_one_contact(cls, v, values):
        if 'email' in values or 'phone' in values:
            if not values.get('email') and not v:
                raise ValueError('Either email or phone number must be provided')
        return v


class PasswordResetConfirm(BaseModel):
    """Reset password with token"""
    token: str = Field(..., min_length=32)
    new_password: str = Field(..., min_length=8, max_length=100)

    @validator('new_password')
    def validate_password_strength(cls, v):
        """Enforce strong password"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


# ===== GUEST USERS =====

class GuestUserCreate(BaseModel):
    """Create anonymous guest user for checkout without signup"""
    device_id: Optional[str] = None
    session_id: Optional[str] = None


class GuestToUserConversion(BaseModel):
    """Convert guest to registered user"""
    guest_id: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)

    @validator('email', 'phone')
    def at_least_one_contact(cls, v, values):
        if 'email' in values or 'phone' in values:
            if not values.get('email') and not v:
                raise ValueError('Either email or phone number must be provided')
        return v

    @validator('password')
    def validate_password_strength(cls, v):
        """Enforce strong password"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v
