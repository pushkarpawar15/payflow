from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    storage_backend: Literal["memory", "firestore"] = Field(
        default="memory", validation_alias="PAYFLOW_STORAGE_BACKEND"
    )
    seed_data: bool | None = Field(default=None, validation_alias="PAYFLOW_SEED_DATA")
    cors_origins: str = Field(default="localhost", validation_alias="PAYFLOW_CORS_ORIGINS")
    log_level: str = Field(default="INFO", validation_alias="PAYFLOW_LOG_LEVEL")
    google_cloud_project: str | None = Field(default=None, validation_alias="GOOGLE_CLOUD_PROJECT")
    firestore_database: str = Field(default="(default)", validation_alias="FIRESTORE_DATABASE")

    @field_validator("log_level")
    @classmethod
    def valid_log_level(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError("Unsupported log level")
        return normalized

    @field_validator("firestore_database")
    @classmethod
    def valid_database(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("FIRESTORE_DATABASE cannot be empty")
        return value.strip()

    @property
    def should_seed(self) -> bool:
        return self.seed_data if self.seed_data is not None else self.storage_backend == "memory"

    @property
    def allowed_origins(self) -> list[str]:
        return [part.strip().rstrip("/") for part in self.cors_origins.split(",") if part.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
