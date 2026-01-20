"""
Structured Logging Configuration with Loguru
Provides better logging for production debugging
"""
import sys
from loguru import logger
from app.core.config import settings
from pathlib import Path


def configure_logging():
    """
    Configure loguru for structured logging

    Log Levels:
    - DEBUG: Detailed information for diagnosing problems
    - INFO: General informational messages
    - WARNING: Warning messages for potentially harmful situations
    - ERROR: Error messages for serious problems
    - CRITICAL: Critical messages for very serious problems

    Logs are written to:
    - Console (stdout) - with colors in development
    - File (logs/app.log) - rotated daily, compressed
    - File (logs/error.log) - errors only
    """

    # Remove default logger
    logger.remove()

    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Console logging (with colors in development)
    log_level = "DEBUG" if settings.DEBUG else "INFO"

    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=log_level,
        colorize=True,
        backtrace=True,
        diagnose=settings.DEBUG,  # Only show detailed traces in debug mode
    )

    # File logging - all logs
    logger.add(
        log_dir / "app.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="DEBUG",
        rotation="500 MB",  # Rotate when file reaches 500MB
        retention="30 days",  # Keep logs for 30 days
        compression="zip",  # Compress rotated logs
        backtrace=True,
        diagnose=False,  # Don't show variable values in production logs
        enqueue=True,  # Thread-safe
    )

    # File logging - errors only
    logger.add(
        log_dir / "error.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR",
        rotation="100 MB",
        retention="90 days",  # Keep error logs longer
        compression="zip",
        backtrace=True,
        diagnose=True,  # Show full context for errors
        enqueue=True,
    )

    # JSON logging for production monitoring (optional)
    if settings.ENVIRONMENT == "production":
        logger.add(
            log_dir / "app.json",
            format="{message}",
            level="INFO",
            rotation="1 day",
            retention="30 days",
            compression="zip",
            serialize=True,  # Write as JSON
            enqueue=True,
        )

    logger.info(f"Logging configured for {settings.ENVIRONMENT} environment")
    logger.info(f"Log level: {log_level}")
    logger.info(f"Debug mode: {settings.DEBUG}")


# Custom logging helpers
def log_api_request(method: str, path: str, user_id: str = None, duration: float = None):
    """Log API request with structured data"""
    extra_data = {
        "method": method,
        "path": path,
        "user_id": user_id,
        "duration_ms": round(duration * 1000, 2) if duration else None,
    }
    logger.bind(**extra_data).info(f"{method} {path}")


def log_api_error(method: str, path: str, error: str, user_id: str = None):
    """Log API error with structured data"""
    extra_data = {
        "method": method,
        "path": path,
        "user_id": user_id,
        "error_type": type(error).__name__ if not isinstance(error, str) else "Error",
    }
    logger.bind(**extra_data).error(f"API Error: {method} {path} - {error}")


def log_database_operation(operation: str, table: str, success: bool, duration: float = None):
    """Log database operation with structured data"""
    extra_data = {
        "operation": operation,
        "table": table,
        "success": success,
        "duration_ms": round(duration * 1000, 2) if duration else None,
    }
    level = "info" if success else "error"
    getattr(logger.bind(**extra_data), level)(f"DB {operation} on {table}")


def log_payment_event(event: str, payment_id: str, amount: float, status: str):
    """Log payment event with structured data"""
    extra_data = {
        "event": event,
        "payment_id": payment_id,
        "amount": amount,
        "status": status,
    }
    logger.bind(**extra_data).info(f"Payment {event}: {payment_id} - KES {amount}")


def log_security_event(event: str, user_id: str = None, ip_address: str = None, details: str = None):
    """Log security event (login attempts, permission denials, etc.)"""
    extra_data = {
        "event": event,
        "user_id": user_id,
        "ip_address": ip_address,
    }
    logger.bind(**extra_data).warning(f"Security: {event} - {details}")


# Export configured logger
__all__ = [
    "logger",
    "configure_logging",
    "log_api_request",
    "log_api_error",
    "log_database_operation",
    "log_payment_event",
    "log_security_event",
]
