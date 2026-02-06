"""Permission checking utilities"""
from typing import List
from fastapi import HTTPException, status


def check_permission(user: dict, required_permission: str) -> bool:
    """Check if user has a specific permission"""
    # Admins have all permissions
    if user.get("role") == "admin":
        return True
    
    # Check user's permissions array
    user_permissions = user.get("permissions", [])
    return required_permission in user_permissions


def require_permission(required_permission: str):
    """Decorator to require a specific permission"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get current_user from kwargs
            current_user = kwargs.get("current_user")
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not check_permission(current_user, required_permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {required_permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(required_permissions: List[str]):
    """Decorator to require any of the specified permissions"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Admin has all permissions
            if current_user.get("role") == "admin":
                return await func(*args, **kwargs)
            
            # Check if user has any of the required permissions
            user_permissions = current_user.get("permissions", [])
            if not any(perm in user_permissions for perm in required_permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"One of these permissions required: {', '.join(required_permissions)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
