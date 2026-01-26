"""
Secure Cookie-Based Authentication
Implements httpOnly cookies for JWT token storage to prevent XSS attacks
"""
from fastapi import Response, Request, HTTPException, status
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.config import settings


# Cookie configuration
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"

# Cookie settings for maximum security
COOKIE_SETTINGS = {
    "httponly": True,  # Prevents JavaScript access (XSS protection)
    "secure": settings.ENVIRONMENT == "production",  # HTTPS only in production
    "samesite": "lax",  # CSRF protection (prevents cross-site requests)
    "domain": None,  # Same domain only
    "path": "/",  # Available for all paths
}


def set_auth_cookies(
    response: Response,
    user_id: str,
    email: Optional[str],
    role: str
) -> Dict[str, str]:
    """
    Set httpOnly authentication cookies and return tokens

    Args:
        response: FastAPI Response object
        user_id: User's unique identifier
        email: User's email address
        role: User's role (customer, admin, etc.)

    Returns:
        Dict with access_token and refresh_token for WebSocket use

    Security Features:
        - httpOnly: Prevents XSS attacks by blocking JavaScript access
        - secure: Ensures cookies only sent over HTTPS in production
        - samesite=lax: Prevents CSRF attacks
        - Max age: Automatic expiration
        - Tokens also returned for WebSocket authentication (which can't use cookies)
    """
    # Create tokens
    token_data = {
        "sub": user_id,
        "email": email,
        "role": role
    }

    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # Set access token cookie (30 minutes)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        **COOKIE_SETTINGS
    )

    # Set refresh token cookie (7 days)
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Convert to seconds
        **COOKIE_SETTINGS
    )

    # Return tokens for frontend storage (needed for WebSocket connections)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }


def get_token_from_cookie(request: Request, cookie_name: str) -> Optional[str]:
    """
    Extract JWT token from httpOnly cookie

    Args:
        request: FastAPI Request object
        cookie_name: Name of the cookie to extract

    Returns:
        JWT token string or None if not found
    """
    return request.cookies.get(cookie_name)


def get_current_user_from_cookie(request: Request) -> Dict[str, Any]:
    """
    Extract and validate current user from access token cookie

    Args:
        request: FastAPI Request object

    Returns:
        Decoded token payload with user information

    Raises:
        HTTPException: If token is missing, invalid, or expired
    """
    # Try to get access token from cookie
    access_token = get_token_from_cookie(request, ACCESS_TOKEN_COOKIE_NAME)

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no access token cookie found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decode and validate token
    payload = decode_token(access_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type - expected access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def refresh_access_token_from_cookie(request: Request, response: Response) -> Dict[str, Any]:
    """
    Refresh access token using refresh token cookie

    Args:
        request: FastAPI Request object
        response: FastAPI Response object

    Returns:
        New token payload

    Raises:
        HTTPException: If refresh token is missing, invalid, or expired
    """
    # Get refresh token from cookie
    refresh_token = get_token_from_cookie(request, REFRESH_TOKEN_COOKIE_NAME)

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token found - please log in again",
        )

    # Decode and validate refresh token
    payload = decode_token(refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token - please log in again",
        )

    # Verify token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type - expected refresh token",
        )

    # Create new access token with refreshed expiration
    new_access_token = create_access_token(
        data={
            "sub": payload["sub"],
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    )

    # Set new access token cookie
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=new_access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **COOKIE_SETTINGS
    )

    return payload


def clear_auth_cookies(response: Response) -> None:
    """
    Clear authentication cookies (logout)

    Args:
        response: FastAPI Response object
    """
    # Delete access token cookie
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        path=COOKIE_SETTINGS["path"],
        domain=COOKIE_SETTINGS["domain"],
        secure=COOKIE_SETTINGS["secure"],
        httponly=COOKIE_SETTINGS["httponly"],
        samesite=COOKIE_SETTINGS["samesite"],
    )

    # Delete refresh token cookie
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        path=COOKIE_SETTINGS["path"],
        domain=COOKIE_SETTINGS["domain"],
        secure=COOKIE_SETTINGS["secure"],
        httponly=COOKIE_SETTINGS["httponly"],
        samesite=COOKIE_SETTINGS["samesite"],
    )


def validate_csrf_token(request: Request, csrf_token: str) -> bool:
    """
    Validate CSRF token from request header

    Args:
        request: FastAPI Request object
        csrf_token: CSRF token from request

    Returns:
        True if valid, False otherwise

    Note:
        This is a placeholder. For production, implement proper CSRF protection:
        - Generate CSRF token on login and store in session
        - Validate token on state-changing requests (POST, PUT, DELETE)
        - Use double-submit cookie pattern or synchronizer token pattern
    """
    # TODO: Implement CSRF token validation
    # For now, SameSite=Lax provides basic CSRF protection
    return True
