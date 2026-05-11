"""Application configuration."""
from __future__ import annotations

import os
import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    APP_NAME: str = "West Qurna Safety - Driver Violation Tracking"
    APP_ENV: str = "production"

    # Database
    DATA_DIR: str = "/data"
    DATABASE_URL: str | None = None

    # JWT
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h working day

    # CORS - comma-separated list of allowed origins. "*" allows all.
    CORS_ORIGINS: str = "*"

    # Bootstrap admin (only used when DB has zero users)
    BOOTSTRAP_ADMIN_USERNAME: str = "admin"
    BOOTSTRAP_ADMIN_PASSWORD: str = "ChangeMe!2025"
    BOOTSTRAP_ADMIN_FULL_NAME: str = "System Administrator"

    # Violation thresholds (driver-level)
    THRESHOLD_NOTICE: int = 1
    THRESHOLD_WARNING: int = 2
    THRESHOLD_SUSPENSION: int = 3
    THRESHOLD_BAN: int = 4

    # Contractor warning - percentage of violating drivers
    CONTRACTOR_WARN_PERCENT: float = 30.0

    def resolved_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # Ensure data dir exists; fall back to ./data if /data unwritable
        data_dir = self.DATA_DIR
        try:
            os.makedirs(data_dir, exist_ok=True)
        except PermissionError:
            data_dir = os.path.abspath("./data")
            os.makedirs(data_dir, exist_ok=True)
        return f"sqlite:///{data_dir}/qurna_safety.db"

    def resolved_jwt_secret(self) -> str:
        if self.JWT_SECRET:
            return self.JWT_SECRET
        # Persist a generated secret in the data dir so restarts don't invalidate tokens
        data_dir = self.DATA_DIR
        try:
            os.makedirs(data_dir, exist_ok=True)
        except PermissionError:
            data_dir = os.path.abspath("./data")
            os.makedirs(data_dir, exist_ok=True)
        secret_path = os.path.join(data_dir, ".jwt_secret")
        if os.path.exists(secret_path):
            with open(secret_path) as f:
                return f.read().strip()
        secret = secrets.token_urlsafe(64)
        with open(secret_path, "w") as f:
            f.write(secret)
        try:
            os.chmod(secret_path, 0o600)
        except OSError:
            pass
        return secret

    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
