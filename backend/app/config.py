from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore


class Settings(BaseSettings):
    """
    Central configuration loaded from environment variables / .env file.
    Access via get_settings() — never instantiate directly in business logic.
    """
    SETUP_KEY: str = "chatsetgo-setup-2024"
    INTERNAL_API_KEY: str = "chatsetgo-internal-key-2024"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # silently drop unknown env vars
    )

    # ------------------------------------------------------------------ #
    #  App                                                                  #
    # ------------------------------------------------------------------ #
    APP_NAME: str = "WhatsApp AI Suite"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_DEBUG: bool = False
    APP_SECRET_KEY: str = Field(..., min_length=32)  # used for JWT signing

    # ------------------------------------------------------------------ #
    #  Database                                                             #
    # ------------------------------------------------------------------ #
    DATABASE_URL: PostgresDsn = Field(
        ...,
        description="Async PostgreSQL DSN — must use postgresql+asyncpg:// scheme",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def force_asyncpg_scheme(cls, v: str) -> str:
        """Ensure the driver is always asyncpg regardless of what's in .env."""
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # ------------------------------------------------------------------ #
    #  Meta / WhatsApp Cloud API                                           #
    # ------------------------------------------------------------------ #
    META_VERIFY_TOKEN: str = Field(
        ...,
        description="The token you set in the Meta App Dashboard webhook config",
    )
    META_APP_SECRET: str = Field(
        ...,
        description="Used for X-Hub-Signature-256 HMAC verification",
    )
    META_ACCESS_TOKEN: str = Field(
        ...,
        description="Permanent system user token from Meta Business Manager",
    )
    META_PHONE_NUMBER_ID: str = Field(
        ...,
        description="The WhatsApp Business phone number ID from Meta dashboard",
    )
    META_API_VERSION: str = "v19.0"

    @property
    def meta_api_base_url(self) -> str:
        return f"https://graph.facebook.com/{self.META_API_VERSION}"

    @property
    def meta_messages_url(self) -> str:
        return f"{self.meta_api_base_url}/{self.META_PHONE_NUMBER_ID}/messages"

    # ------------------------------------------------------------------ #
    #  LLM Provider                                                         #
    # ------------------------------------------------------------------ #
    LLM_PROVIDER: Literal["openai", "claude", "ollama", "groq"] = "groq"
    # ---- Groq (Free tier) --------------------------------------------------
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5"
    OLLAMA_BASE_URL: AnyHttpUrl | None = None
    OLLAMA_MODEL: str = "llama3"

    # Max messages to pull from DB for LLM context window
    LLM_CONTEXT_WINDOW_MESSAGES: int = 20

    # ------------------------------------------------------------------ #
    #  CORS                                                                 #
    # ------------------------------------------------------------------ #
  
    # CORS_ORIGINS: str = "https://whatsapp-ai-suite-hazel.vercel.app"
    CORS_ORIGINS: str = "http://localhost:3000,https://whatsapp-ai-suite-hazel.vercel.app"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # ------------------------------------------------------------------ #
    #  Redis (for rate limiting + context cache in Phase 2)               #
    # ------------------------------------------------------------------ #
    REDIS_URL: str = "redis://localhost:6379/0"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    The lru_cache ensures .env is only read once per process.
    Override in tests via: app.dependency_overrides[get_settings] = lambda: ...
    """
    return Settings()