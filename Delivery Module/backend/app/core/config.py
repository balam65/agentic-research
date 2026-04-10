from functools import lru_cache
from typing import Any

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Output & Delivery Module"
    app_env: str = "development"
    app_debug: bool = False
    api_prefix: str = ""
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://192.168.1.250:3000"]
    )

    supabase_url: str
    supabase_service_role_key: str

    aws_region: str = "us-east-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    s3_bucket_name: str | None = None
    s3_key_prefix: str = "deliveries"

    default_webhook_url: str | None = None
    webhook_url_map: dict[str, str] = Field(default_factory=dict)

    mail_provider: str | None = None
    mail_sender_name: str | None = None
    mail_sender_email: str | None = None
    mail_oauth_client_id: str | None = None
    mail_oauth_client_secret: str | None = None
    mail_oauth_refresh_token: str | None = None
    mail_oauth_token_url: str = "https://oauth2.googleapis.com/token"
    mail_oauth_scopes: str | None = None
    mail_default_subject: str = "Your requested delivery data"
    mail_reply_to: str | None = None
    mail_gmail_send_url: str = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

    request_timeout_seconds: float = 15.0
    api_base_url: str = "http://192.168.1.250:8000"
    supabase_retry_attempts: int = 3
    supabase_retry_delay_seconds: float = 0.5
    supabase_timeout_seconds: float = 5.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_nested_delimiter="__",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: Any,
        env_settings: Any,
        dotenv_settings: Any,
        file_secret_settings: Any,
    ) -> tuple[Any, ...]:
        return (init_settings, env_settings, dotenv_settings, file_secret_settings)


@lru_cache
def get_settings() -> Settings:
    return Settings()
