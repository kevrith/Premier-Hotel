"""
Authentication Middleware and Dependencies
Supports both Bearer token (Authorization header) and httpOnly cookie authentication
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.core.config import settings
from app.core.supabase import get_supabase, get_supabase_admin
from supabase import Client

# Make security optional to allow cookie fallback
security = HTTPBearer(auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Get current authenticated user
    Supports both Bearer token (Authorization header) and httpOnly cookie authentication
    """
    token = None

    # First try Bearer token from Authorization header
    if credentials and credentials.credentials:
        token = credentials.credentials
    # Fall back to httpOnly cookie
    elif request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no token found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(token)

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Get user from database
    # Try users table first (for auth_secure users)
    # Then try profiles table (for Supabase auth users)
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()

        if not response.data:
            # Try profiles table
            response = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = response.data[0]

        # Check if user is active
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not active",
            )

        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
):
    """Get current active user (alias for get_current_user)"""
    return current_user


def require_role(required_roles: list[str]):
    """Dependency factory to check if user has required role"""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker


# Role-specific dependencies
async def require_admin(current_user: dict = Depends(get_current_user)):
    """
    Require admin role ONLY
    SECURITY: Managers should NOT have admin privileges
    Use require_manager_or_admin() for operations accessible to both
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_manager_or_admin(current_user: dict = Depends(get_current_user)):
    """Require manager OR admin role"""
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Admin access required",
        )
    return current_user


async def require_owner_or_admin(current_user: dict = Depends(get_current_user)):
    """Require owner OR admin role (for financial operations)"""
    if current_user.get("role") not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner or Admin access required",
        )
    return current_user


async def require_staff(current_user: dict = Depends(get_current_user)):
    """Require staff role (chef, waiter, cleaner, manager, admin)"""
    if current_user.get("role") not in ["chef", "waiter", "cleaner", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


async def require_chef(current_user: dict = Depends(get_current_user)):
    """Require chef role"""
    if current_user.get("role") not in ["chef", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chef access required",
        )
    return current_user
