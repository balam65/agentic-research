from datetime import UTC, datetime

from fastapi.concurrency import run_in_threadpool
import httpx

from app.core.config import get_settings
from app.core.exceptions import UpstreamServiceError
from app.db.supabase_client import get_supabase_client
from app.models.schemas import (
    DeliveryFormat,
    DeliveryJobRecord,
    DeliveryJobStatus,
    DeliveryLogRecord,
    EmailDeliveryLogRecord,
    DeliveryStatus,
    DeliveryType,
)
from app.services.resilience import retry_async


class LogService:
    def __init__(self) -> None:
        self._client = get_supabase_client()
        self._settings = get_settings()

    async def create_log(
        self,
        *,
        client_id: str,
        status: DeliveryStatus,
        format: DeliveryFormat,
        delivery_type: DeliveryType,
        data_id: str | None = None,
        response: str | None = None,
    ) -> DeliveryLogRecord:
        timestamp = datetime.now(UTC)
        payload = {
            "client_id": client_id,
            "data_id": data_id,
            "status": status.value,
            "format": format.value,
            "delivery_type": delivery_type.value,
            "response": response,
            "created_at": timestamp.isoformat(),
        }

        def _insert() -> dict:
            response = self._client.table("delivery_logs").insert(payload).execute()
            inserted = response.data or []
            return inserted[0] if inserted else payload

        async def _execute() -> dict:
            try:
                return await run_in_threadpool(_insert)
            except Exception as exc:
                if isinstance(exc, (httpx.HTTPError, OSError)):
                    raise
                raise UpstreamServiceError(f"Supabase log insert failed: {exc}") from exc

        log = await retry_async(
            _execute,
            attempts=self._settings.supabase_retry_attempts,
            base_delay_seconds=self._settings.supabase_retry_delay_seconds,
            failure_message="Supabase log insert failed",
        )
        return DeliveryLogRecord.model_validate(log)

    async def create_job(
        self,
        *,
        client_id: str,
        format: DeliveryFormat,
        delivery_type: DeliveryType,
        data_id: str | None = None,
        scheduled_at: datetime | None = None,
    ) -> DeliveryJobRecord:
        payload = {
            "client_id": client_id,
            "data_id": data_id,
            "format": format.value,
            "delivery_type": delivery_type.value,
            "status": DeliveryJobStatus.pending.value,
            "retry_count": 0,
            "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
            "created_at": datetime.now(UTC).isoformat(),
        }

        def _insert() -> dict:
            response = self._client.table("delivery_jobs").insert(payload).execute()
            rows = response.data or []
            return rows[0] if rows else payload

        async def _execute() -> dict:
            try:
                return await run_in_threadpool(_insert)
            except Exception as exc:
                if isinstance(exc, (httpx.HTTPError, OSError)):
                    raise
                raise UpstreamServiceError(f"Supabase job insert failed: {exc}") from exc

        job = await retry_async(
            _execute,
            attempts=self._settings.supabase_retry_attempts,
            base_delay_seconds=self._settings.supabase_retry_delay_seconds,
            failure_message="Supabase job insert failed",
        )
        return DeliveryJobRecord.model_validate(job)

    async def update_job(
        self,
        *,
        job_id: str,
        status: DeliveryJobStatus,
        retry_count: int | None = None,
    ) -> DeliveryJobRecord:
        payload: dict[str, object] = {"status": status.value}
        if retry_count is not None:
            payload["retry_count"] = retry_count

        def _update() -> dict:
            response = (
                self._client.table("delivery_jobs")
                .update(payload)
                .eq("id", job_id)
                .execute()
            )
            rows = response.data or []
            return rows[0] if rows else {"id": job_id, **payload}

        async def _execute() -> dict:
            try:
                return await run_in_threadpool(_update)
            except Exception as exc:
                if isinstance(exc, (httpx.HTTPError, OSError)):
                    raise
                raise UpstreamServiceError(f"Supabase job update failed: {exc}") from exc

        job = await retry_async(
            _execute,
            attempts=self._settings.supabase_retry_attempts,
            base_delay_seconds=self._settings.supabase_retry_delay_seconds,
            failure_message="Supabase job update failed",
        )
        return DeliveryJobRecord.model_validate(job)

    async def create_email_log(
        self,
        *,
        client_id: str,
        recipient_email: str,
        sender_email: str,
        subject: str,
        format: DeliveryFormat,
        status: DeliveryStatus,
        provider: str,
        data_id: str | None = None,
        delivery_job_id: str | None = None,
        provider_message_id: str | None = None,
        error_message: str | None = None,
        metadata: dict | None = None,
        sent_at: datetime | None = None,
    ) -> EmailDeliveryLogRecord:
        payload = {
            "client_id": client_id,
            "data_id": data_id,
            "delivery_job_id": delivery_job_id,
            "recipient_email": recipient_email,
            "sender_email": sender_email,
            "subject": subject,
            "format": format.value,
            "status": status.value,
            "provider": provider,
            "provider_message_id": provider_message_id,
            "error_message": error_message,
            "metadata": metadata or {},
            "sent_at": sent_at.isoformat() if sent_at else None,
            "created_at": datetime.now(UTC).isoformat(),
        }

        def _insert() -> dict:
            response = self._client.table("email_delivery_logs").insert(payload).execute()
            rows = response.data or []
            return rows[0] if rows else payload

        async def _execute() -> dict:
            try:
                return await run_in_threadpool(_insert)
            except Exception as exc:
                if isinstance(exc, (httpx.HTTPError, OSError)):
                    raise
                raise UpstreamServiceError(f"Supabase email log insert failed: {exc}") from exc

        row = await retry_async(
            _execute,
            attempts=self._settings.supabase_retry_attempts,
            base_delay_seconds=self._settings.supabase_retry_delay_seconds,
            failure_message="Supabase email log insert failed",
        )
        return EmailDeliveryLogRecord.model_validate(row)
