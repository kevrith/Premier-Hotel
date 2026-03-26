from pydantic_settings import BaseSettings
from typing import List, Optional
import secrets


class Settings(BaseSettings):
    """Application settings"""

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str  # Alternative name for service key

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str  # REQUIRED: Must be set in .env file
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Application
    APP_NAME: str = "Premier Hotel API"
    DEBUG: bool = False  # Default to False for security
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "production"  # Options: development, staging, production

    # CORS — comma-separated list of allowed origins (set FRONTEND_URL in .env for production)
    # e.g. FRONTEND_URL=https://premier-hotel.vercel.app
    FRONTEND_URL: Optional[str] = None
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    @property
    def cors_origins(self) -> List[str]:
        """Merged list: defaults + any extra origins from FRONTEND_URL."""
        origins = list(self.BACKEND_CORS_ORIGINS)
        if self.FRONTEND_URL:
            for url in self.FRONTEND_URL.split(","):
                url = url.strip()
                if url and url not in origins:
                    origins.append(url)
        return origins

    # Redis (Optional)
    REDIS_URL: str = "redis://localhost:6379"

    # M-Pesa Configuration
    MPESA_ENVIRONMENT: str = "sandbox"
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""

    # Africa's Talking SMS Configuration
    AFRICASTALKING_USERNAME: str = "sandbox"
    AFRICASTALKING_API_KEY: str = ""
    AFRICASTALKING_SENDER_ID: str = ""

    # Email Configuration (Gmail SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # Gmail address
    SMTP_PASSWORD: str = ""  # Gmail app password
    EMAIL_FROM: str = ""  # From email address (same as SMTP_USER)
    EMAIL_FROM_NAME: str = "Premier Hotel"

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Paystack Configuration
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_WEBHOOK_SECRET: str = ""

    # PayPal Configuration
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"  # sandbox | live

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
