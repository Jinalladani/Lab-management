import os
import sys
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Security: Require SECRET_KEY to be set in production
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        if os.getenv("FLASK_ENV") == "production":
            print("ERROR: SECRET_KEY environment variable is required in production", file=sys.stderr)
            sys.exit(1)
        else:
            # Development fallback - clearly marked as insecure
            SECRET_KEY = "dev_secret_key_change_in_production_!@#$%^&*()"
            print("WARNING: Using development SECRET_KEY. Set SECRET_KEY environment variable for production.", file=sys.stderr)

    # Database configuration with validation
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "lab_management")
    DB_USER = os.getenv("DB_USER", "lab_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    
    # Validate database configuration
    if not DB_PASSWORD:
        if os.getenv("FLASK_ENV") == "production":
            print("ERROR: DB_PASSWORD environment variable is required in production", file=sys.stderr)
            sys.exit(1)
        else:
            print("WARNING: DB_PASSWORD not set. Using default for development only.", file=sys.stderr)
            DB_PASSWORD = "lab_password"

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SMTP settings for password reset OTP emails
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", os.getenv("SMTP_USERNAME", ""))
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ["true", "1", "yes"]

    # OTP expiration (minutes)
    FORGOT_PASSWORD_OTP_TTL_MINUTES = int(
        os.getenv("FORGOT_PASSWORD_OTP_TTL_MINUTES", "10")
    )

    # JWT settings with security validation
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        if os.getenv("FLASK_ENV") == "production":
            print("ERROR: JWT_SECRET_KEY environment variable is required in production", file=sys.stderr)
            sys.exit(1)
        else:
            JWT_SECRET_KEY = SECRET_KEY
            print("WARNING: Using SECRET_KEY as JWT_SECRET_KEY. Set JWT_SECRET_KEY environment variable for production.", file=sys.stderr)
    
    JWT_ACCESS_TOKEN_EXPIRES = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "24")
    )  # hours
    
    # Security settings
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", "16777216"))  # 16MB default
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))