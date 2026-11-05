"""App settings, read from environment variables (prefix ``QL_``) or a ``.env`` file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="QL_", extra="ignore")

    app_name: str = "Quantic Learning API"
    # Origins allowed to call the API from a browser. 8081 is the Expo web dev server.
    # Override with e.g. QL_CORS_ORIGINS='["https://app.quanticlearning.com"]'
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
