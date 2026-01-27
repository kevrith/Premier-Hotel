"""
Security utilities: Password hashing, JWT tokens, OTP generation
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets
import string
from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration - Use settings from .env
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # bcrypt has a 72-byte limit, truncate if needed
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    # bcrypt has a 72-byte limit, truncate if needed
    password = password[:72]
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token

    Args:
        data: Data to encode in token (user_id, role, etc.)
        expires_delta: Token expiration time

    Returns:
        JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create JWT refresh token (longer expiration)

    Args:
        data: Data to encode in token

    Returns:
        JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    })

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify JWT token

    Args:
        token: JWT token string

    Returns:
        Decoded token data or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logging.warning(f"JWT decode error: {str(e)}")
        return None


def generate_verification_token() -> str:
    """
    Generate secure random token for email/phone verification

    Returns:
        64-character hexadecimal token
    """
    return secrets.token_urlsafe(48)


def generate_otp(length: int = 6) -> str:
    """
    Generate numeric OTP code

    Args:
        length: Number of digits (default 6)

    Returns:
        Numeric OTP string
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_reset_token() -> str:
    """
    Generate password reset token

    Returns:
        Secure random token
    """
    return secrets.token_urlsafe(32)


# ===== EMAIL VALIDATION =====

def validate_email_deliverable(email: str) -> bool:
    """
    Basic email validation (real-world would use email verification service)

    For production, integrate with:
    - SendGrid Email Validation API
    - ZeroBounce
    - Hunter.io

    Args:
        email: Email address to validate

    Returns:
        True if email looks valid
    """
    # TODO: Integrate real email validation service
    # For now, just check basic format and common disposable domains

    disposable_domains = [
        '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'tempmail.com', 'throwaway.email', 'fakeinbox.com',
        'maildrop.cc', 'trashmail.com', 'getnada.com'
    ]

    domain = email.split('@')[1].lower() if '@' in email else ''

    if domain in disposable_domains:
        return False

    return True


# ===== PHONE VALIDATION =====

def validate_phone_number(phone: str) -> bool:
    """
    Validate Kenyan phone number format

    Accepts:
    - +254712345678 (international format)
    - 254712345678 (without +)
    - 0712345678 (local format)

    Valid Kenyan mobile prefixes:
    - Safaricom: 0710-0719, 0720-0729, 0740-0749, 0757, 0759, 0768-0769, 0790-0799
    - Airtel: 0730-0739, 0750-0756, 0760-0767, 0770-0779, 0780-0789
    - Telkom: 0770-0779

    Args:
        phone: Phone number (with or without country code)

    Returns:
        True if phone number is valid Kenyan number
    """
    import re

    # Remove spaces and dashes
    phone = phone.replace(" ", "").replace("-", "")

    # Kenya country code patterns
    # Pattern 1: +254XXXXXXXXX (international with +)
    # Pattern 2: 254XXXXXXXXX (international without +)
    # Pattern 3: 0XXXXXXXXX (local format)

    # Normalize to local format (07/01)
    if phone.startswith("+254"):
        phone = "0" + phone[4:]
    elif phone.startswith("254"):
        phone = "0" + phone[3:]

    # Valid Kenyan mobile prefixes (9 digits after 0)
    kenyan_mobile_pattern = r'^0(7[0-9]{8}|1[0-9]{8})$'

    if not re.match(kenyan_mobile_pattern, phone):
        return False

    # Additional validation: Check specific operator prefixes
    # Safaricom: 071X, 072X, 074X, 0757, 0759, 0768, 0769, 079X
    # Airtel: 073X, 075X (except 0757, 0759), 076X (except 0768, 0769), 077X, 078X
    # Telkom: 077X
    valid_prefixes = [
        '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0719',  # Safaricom
        '0720', '0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729',  # Safaricom
        '0740', '0741', '0742', '0743', '0744', '0745', '0746', '0747', '0748', '0749',  # Safaricom
        '0757', '0759',  # Safaricom
        '0768', '0769',  # Safaricom
        '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799',  # Safaricom
        '0730', '0731', '0732', '0733', '0734', '0735', '0736', '0737', '0738', '0739',  # Airtel
        '0750', '0751', '0752', '0753', '0754', '0755', '0756',  # Airtel
        '0760', '0761', '0762', '0763', '0764', '0765', '0766', '0767',  # Airtel
        '0770', '0771', '0772', '0773', '0774', '0775', '0776', '0777', '0778', '0779',  # Airtel/Telkom
        '0780', '0781', '0782', '0783', '0784', '0785', '0786', '0787', '0788', '0789',  # Airtel
        '0110', '0111', '0112', '0113', '0114', '0115', '0116', '0117', '0118', '0119',  # Safaricom (newer)
    ]

    prefix = phone[:4]
    return prefix in valid_prefixes


def normalize_kenyan_phone(phone: str) -> str:
    """
    Normalize Kenyan phone number to international format

    Args:
        phone: Phone number in any format

    Returns:
        Normalized phone in +254XXXXXXXXX format
    """
    # Remove spaces and dashes
    phone = phone.replace(" ", "").replace("-", "")

    # Already in international format with +
    if phone.startswith("+254"):
        return phone

    # International format without +
    if phone.startswith("254"):
        return "+" + phone

    # Local format
    if phone.startswith("0"):
        return "+254" + phone[1:]

    # Invalid format
    raise ValueError("Invalid phone number format")
