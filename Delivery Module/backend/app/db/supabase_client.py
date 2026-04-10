from functools import lru_cache

import httpx
from supabase import Client, ClientOptions, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    timeout = httpx.Timeout(settings.supabase_timeout_seconds)
    options = ClientOptions(
        httpx_client=httpx.Client(timeout=timeout),
        postgrest_client_timeout=timeout,
        storage_client_timeout=timeout,
        function_client_timeout=timeout,
    )
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=options,
    )
