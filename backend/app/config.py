"""App settings, read from environment variables (prefix ``QL_``) or a ``.env`` file."""

from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="QL_", extra="ignore")

    app_name: str = "Quantic Learning API"
    env: Literal["development", "test", "production"] = "development"

    # Origins allowed to call the API from a browser. 8081 is the Expo web dev server.
    # Override with e.g. QL_CORS_ORIGINS='["https://app.quanticlearning.com"]'
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]

    # SQLite for development. In production, set e.g.
    # QL_DATABASE_URL=postgresql+psycopg://user:pass@host/quantic
    database_url: str = "sqlite:///./quantic.db"
    # Apply database migrations on startup. Handy in development; production runs
    # `alembic upgrade head` as a deploy step instead.
    auto_migrate: bool = True

    jwt_secret: str = _DEV_SECRET
    access_token_minutes: int = 15
    refresh_token_days: int = 60

    @model_validator(mode="after")
    def _require_real_secret_in_production(self) -> "Settings":
        if self.env == "production" and (
            self.jwt_secret == _DEV_SECRET or len(self.jwt_secret) < 32
        ):
            raise ValueError("Set QL_JWT_SECRET to a random string of at least 32 characters.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
