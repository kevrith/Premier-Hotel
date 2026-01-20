"""
Centralized Error Handling
Provides secure error responses that don't expose internal details
"""
from fastapi import HTTPException, status
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AppException(HTTPException):
    """Base application exception"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        internal_message: Optional[str] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        if internal_message:
            logger.error(f"AppException: {detail} | Internal: {internal_message}")


class DatabaseError(AppException):
    """Database operation failed"""
    def __init__(self, operation: str, internal_error: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A database error occurred. Please try again later.",
            internal_message=f"Database {operation} failed: {internal_error}"
        )


class ValidationError(AppException):
    """Input validation failed"""
    def __init__(self, field: str, reason: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field}: {reason}"
        )


class AuthenticationError(AppException):
    """Authentication failed"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )


class AuthorizationError(AppException):
    """Insufficient permissions"""
    def __init__(self, required_role: Optional[str] = None):
        message = f"Access denied. {required_role} role required." if required_role else "Access denied."
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message
        )


class NotFoundError(AppException):
    """Resource not found"""
    def __init__(self, resource: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found"
        )


class ConflictError(AppException):
    """Resource conflict (e.g., duplicate, race condition)"""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=message
        )


class PaymentError(AppException):
    """Payment processing failed"""
    def __init__(self, message: str = "Payment processing failed", internal_error: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=message,
            internal_message=f"Payment error: {internal_error}"
        )


class ExternalServiceError(AppException):
    """External service (M-Pesa, email, SMS) failed"""
    def __init__(self, service: str, internal_error: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{service} is temporarily unavailable. Please try again later.",
            internal_message=f"{service} error: {internal_error}"
        )


def safe_error_response(e: Exception, operation: str = "operation") -> HTTPException:
    """
    Convert any exception to a safe HTTP response

    SECURITY: Never expose internal error details to users
    Log full error internally for debugging

    Args:
        e: The exception that occurred
        operation: Description of what was being attempted

    Returns:
        HTTPException with safe user-facing message
    """
    # Log full error details internally
    logger.error(f"Error during {operation}: {type(e).__name__}: {str(e)}", exc_info=True)

    # Return safe generic message to user
    if isinstance(e, HTTPException):
        # Already a handled exception, pass through
        return e

    # Generic error for unexpected exceptions
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred. Please try again or contact support if the problem persists."
    )


def handle_database_error(e: Exception, operation: str) -> HTTPException:
    """
    Handle database errors safely

    Args:
        e: Database exception
        operation: What database operation was being attempted

    Returns:
        Safe HTTP exception
    """
    error_str = str(e).lower()

    # Check for specific database errors
    if "unique constraint" in error_str or "duplicate key" in error_str:
        return ConflictError("A record with these details already exists.")

    if "foreign key constraint" in error_str:
        return ConflictError("Cannot perform this operation due to related records.")

    if "not null constraint" in error_str:
        return ValidationError("required field", "This field cannot be empty")

    if "check constraint" in error_str:
        return ValidationError("input", "The provided value is invalid")

    # Generic database error
    return DatabaseError(operation, str(e))


def handle_supabase_error(e: Exception, operation: str) -> HTTPException:
    """
    Handle Supabase-specific errors

    Args:
        e: Supabase exception
        operation: What operation was being attempted

    Returns:
        Safe HTTP exception
    """
    error_str = str(e)

    # Check for auth errors
    if "Invalid login credentials" in error_str:
        return AuthenticationError("Invalid email/phone or password")

    if "JWT" in error_str or "token" in error_str.lower():
        return AuthenticationError("Session expired. Please login again.")

    if "Email already registered" in error_str:
        return ConflictError("An account with this email already exists.")

    # Check for permission errors
    if "permission denied" in error_str.lower() or "row level security" in error_str.lower():
        return AuthorizationError()

    # Generic Supabase error
    logger.error(f"Supabase error during {operation}: {error_str}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="A service error occurred. Please try again."
    )


# Decorator for safe error handling
def handle_errors(operation: str = "operation"):
    """
    Decorator to wrap endpoint with error handling

    Usage:
        @handle_errors("user registration")
        async def register_user(...):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                # Already handled, re-raise
                raise
            except Exception as e:
                # Unhandled exception, convert to safe response
                raise safe_error_response(e, operation)
        return wrapper
    return decorator
