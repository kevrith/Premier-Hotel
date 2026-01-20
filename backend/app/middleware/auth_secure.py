"""
Secure Authentication Middleware with Cookie Support
SECURITY: Supports httpOnly cookie authentication (primary) and Bearer token (fallback)
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.core.config import settings
from app.core.supabase import get_supabase
from app.core.cookie_auth import get_current_user_from_cookie, ACCESS_TOKEN_COOKIE_NAME
from app.core.security import decode_token
from supabase import Client

# HTTP Bearer security scheme (for backward compatibility)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    supabase: Client = Depends(get_supabase),
):
    """
    Get current authenticated user from cookie OR Bearer token

    Priority:
    1. Cookie-based authentication (preferred - XSS protection)
    2. Bearer token (fallback - for backward compatibility)

    Args:
        request: FastAPI Request object
        credentials: Optional Bearer token credentials
        supabase: Supabase client

    Returns:
        User object from database

    Raises:
        HTTPException: If authentication fails
    """
    user_payload = None

    # DEBUG LOGGING
    print(f"\n=== AUTH DEBUG ===")
    print(f"Request path: {request.url.path}")
    print(f"Cookies: {list(request.cookies.keys())}")
    print(f"Has Bearer credentials: {credentials is not None}")

    # Try cookie-based authentication first (preferred)
    try:
        cookie_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
        if cookie_token:
            print(f"Found cookie token: {cookie_token[:50]}...")
            user_payload = decode_token(cookie_token)
            if user_payload and user_payload.get("type") == "access":
                # Valid cookie token found
                print(f"✅ Cookie auth successful for user: {user_payload.get('sub')}")
                pass
            else:
                print(f"❌ Cookie token invalid or wrong type")
                user_payload = None
        else:
            print(f"❌ No cookie token found")
    except Exception as e:
        print(f"❌ Cookie auth exception: {e}")
        user_payload = None

    # Fallback to Bearer token if no valid cookie
    if not user_payload and credentials:
        token = credentials.credentials
        print(f"Trying Bearer token: {token[:50]}...")
        user_payload = decode_token(token)
        if user_payload:
            print(f"✅ Bearer auth successful for user: {user_payload.get('sub')}")
        else:
            print(f"❌ Bearer token invalid")

    # No valid authentication found
    if not user_payload:
        print(f"❌ No valid authentication - returning 401")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - please login",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user ID
    user_id: str = user_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token - missing user ID",
        )

    # Get user from database
    try:
        # Try users table (primary table for custom auth)
        response = supabase.table("users").select("*").eq("id", user_id).execute()

        if not response.data:
            # Fallback to profiles table (for Supabase auth users)
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
                detail=f"Account is {user.get('status')}. Please contact support.",
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
    """
    Dependency factory to check if user has required role

    Args:
        required_roles: List of allowed roles

    Returns:
        Dependency function that checks role

    Example:
        @router.get("/admin-only", dependencies=[Depends(require_role(["admin"]))])
    """
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}",
            )
        return current_user
    return role_checker


# ===== ROLE-SPECIFIC DEPENDENCIES =====

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
    """
    Require staff role (chef, waiter, cleaner, manager, admin)

    This dependency allows any staff member to access the endpoint
    """
    if current_user.get("role") not in ["chef", "waiter", "cleaner", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


async def require_chef(current_user: dict = Depends(get_current_user)):
    """Require chef role (chef, manager, or admin can access)"""
    if current_user.get("role") not in ["chef", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chef access required",
        )
    return current_user


async def require_waiter(current_user: dict = Depends(get_current_user)):
    """Require waiter role (waiter, manager, or admin can access)"""
    if current_user.get("role") not in ["waiter", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Waiter access required",
        )
    return current_user


async def require_cleaner(current_user: dict = Depends(get_current_user)):
    """Require cleaner role (cleaner, manager, or admin can access)"""
    if current_user.get("role") not in ["cleaner", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cleaner access required",
        )
    return current_user


async def require_customer(current_user: dict = Depends(get_current_user)):
    """Require customer role (customer only - staff should use staff endpoints)"""
    if current_user.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return current_user


async def require_customer_or_staff(current_user: dict = Depends(get_current_user)):
    """Allow both customers and staff (for endpoints like viewing orders)"""
    allowed_roles = ["customer", "chef", "waiter", "cleaner", "manager", "admin"]
    if current_user.get("role") not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authentication required",
        )
    return current_user


# ===== OPTIONAL AUTHENTICATION =====

async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    supabase: Client = Depends(get_supabase),
) -> Optional[dict]:
    """
    Get current user if authenticated, None otherwise

    Useful for endpoints that work differently for authenticated vs anonymous users
    Example: Public menu that shows personalized recommendations if logged in
    """
    try:
        return await get_current_user(request, credentials, supabase)
    except HTTPException:
        return None
