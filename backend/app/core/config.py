from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    """Application settings"""

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Application
    APP_NAME: str = "Premier Hotel API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Redis (Optional)
    REDIS_URL: str = "redis://localhost:6379"

    # M-Pesa Configuration
    MPESA_ENVIRONMENT: str = "sandbox"
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""

    # Email Configuration (Gmail SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # Gmail address
    SMTP_PASSWORD: str = ""  # Gmail app password
    EMAIL_FROM: str = ""  # From email address (same as SMTP_USER)
    EMAIL_FROM_NAME: str = "Premier Hotel"

    # Stripe Configuration
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
