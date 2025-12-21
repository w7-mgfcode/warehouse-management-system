"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms"

    # JWT
    JWT_SECRET: str = "your-super-secret-key-change-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Valkey (Redis replacement)
    VALKEY_URL: str = "valkey://localhost:6379"

    # Application
    TIMEZONE: str = "Europe/Budapest"
    LANGUAGE: str = "hu"
    DEBUG: bool = True

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Email (SMTP)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "wms@example.com"
    SMTP_FROM_NAME: str = "WMS - Raktárkezelő Rendszer"
    SMTP_TLS: bool = True
    EMAIL_ENABLED: bool = False

    # Expiry alert settings
    EXPIRY_WARNING_DAYS: int = 14
    EXPIRY_CRITICAL_DAYS: int = 7
    ALERT_RECIPIENT_EMAILS: str = ""  # Comma-separated list

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "WMS - Warehouse Management System"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
