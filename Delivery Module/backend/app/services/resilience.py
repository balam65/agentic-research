from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx

from app.core.exceptions import UpstreamServiceError

T = TypeVar("T")


def is_transient_error(exc: Exception) -> bool:
    transient_types = (
        httpx.ConnectError,
        httpx.TimeoutException,
        httpx.NetworkError,
        OSError,
    )
    return isinstance(exc, transient_types)


async def retry_async(
    operation: Callable[[], Awaitable[T]],
    *,
    attempts: int,
    base_delay_seconds: float,
    failure_message: str,
) -> T:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return await operation()
        except Exception as exc:
            last_error = exc
            if attempt >= attempts or not is_transient_error(exc):
                break
            await asyncio.sleep(base_delay_seconds * attempt)

    raise UpstreamServiceError(f"{failure_message}: {last_error}") from last_error
