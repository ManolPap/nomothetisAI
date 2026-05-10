from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class AppSettings(BaseSettings):
    """Application-level settings (APP_*)."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="APP_",
        case_sensitive=False,
        extra="ignore",
    )

    env: Literal["local", "dev", "staging", "prod"] = "local"
    cors_origins: list[str] = ["http://localhost:5173"]


class FeatureSettings(BaseSettings):
    """Feature-level settings (FEATURE_*)."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="FEATURE_",
        case_sensitive=False,
        extra="ignore",
    )

    field_23_google_api_key: SecretStr | None = None
    field_23_comment_attribution_model: str = "gemini-2.0-flash"
    field_23_legal_analyzer_cache_dir: str | None = None
    field_6_9_google_api_key: SecretStr | None = None
    field_6_9_tavily_api_key: SecretStr | None = None
    field_4_openai_model: str = "gpt-4.1"
    field_4_openai_api_key: SecretStr | None = None
    field_29_openai_model: str | None = None
    field_29_openai_api_key: SecretStr | None = None


class Settings:
    """Root settings container split by scope."""

    def __init__(self) -> None:
        self.app = AppSettings()
        self.feature = FeatureSettings()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

