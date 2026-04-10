from __future__ import annotations

from collections.abc import Iterable
from io import StringIO
import csv
import json
from typing import Any

from fastapi.concurrency import run_in_threadpool
import httpx

from app.core.config import get_settings
from app.core.exceptions import UpstreamServiceError
from app.db.supabase_client import get_supabase_client
from app.models.schemas import (
    CapabilityRecord,
    ClientRecord,
    DeliveryJobRecord,
    DeliveryLogRecord,
    ExtractedDataRecord,
    ProcessedDataRecord,
    ResearchJobRecord,
    WorldEventRecord,
)
from app.services.resilience import retry_async


class DataService:
    def __init__(self) -> None:
        self._client = get_supabase_client()
        self._settings = get_settings()

    async def get_processed_data(
        self, client_id: str | None = None
    ) -> list[ProcessedDataRecord]:
        def _query() -> list[dict[str, Any]]:
            query = (
                self._client.table("processed_data")
                .select(
                    "id, client_id, payload, status, created_at, client:clients(id, name, email, webhook_url, s3_bucket, created_at)"
                )
                .order("created_at", desc=True)
            )
            if client_id:
                query = query.eq("client_id", client_id)
            response = query.execute()
            return response.data or []

        records = await self._run_supabase_query(
            _query,
            failure_message="Supabase processed_data query failed",
        )
        return [ProcessedDataRecord.model_validate(item) for item in records]

    async def get_delivery_logs(
        self, client_id: str | None = None
    ) -> list[DeliveryLogRecord]:
        def _query() -> list[dict[str, Any]]:
            query = (
                self._client.table("delivery_logs")
                .select(
                    "id, client_id, data_id, status, format, delivery_type, response, created_at, client:clients(id, name, email, webhook_url, s3_bucket, created_at)"
                )
                .order("created_at", desc=True)
            )
            if client_id:
                query = query.eq("client_id", client_id)
            response = query.execute()
            return response.data or []

        logs = await self._run_supabase_query(
            _query,
            failure_message="Supabase delivery_logs query failed",
        )
        return [DeliveryLogRecord.model_validate(item) for item in logs]

    async def get_delivery_jobs(
        self, client_id: str | None = None
    ) -> list[DeliveryJobRecord]:
        def _query() -> list[dict[str, Any]]:
            query = (
                self._client.table("delivery_jobs")
                .select(
                    "id, client_id, data_id, format, delivery_type, status, retry_count, scheduled_at, created_at, client:clients(id, name, email, webhook_url, s3_bucket, created_at)"
                )
                .order("created_at", desc=True)
            )
            if client_id:
                query = query.eq("client_id", client_id)
            response = query.execute()
            return response.data or []

        jobs = await self._run_supabase_query(
            _query,
            failure_message="Supabase delivery_jobs query failed",
        )
        return [DeliveryJobRecord.model_validate(item) for item in jobs]

    async def get_research_jobs(self) -> list[ResearchJobRecord]:
        def _query() -> list[dict[str, Any]]:
            response = (
                self._client.table("research_jobs")
                .select(
                    "id, created_at, updated_at, title, status, input_params, final_output_url, priority"
                )
                .order("updated_at", desc=True)
                .execute()
            )
            return response.data or []

        jobs = await self._run_supabase_query(
            _query,
            failure_message="Supabase research_jobs query failed",
        )
        return [ResearchJobRecord.model_validate(item) for item in jobs]

    async def get_world_events(self) -> list[WorldEventRecord]:
        def _query() -> list[dict[str, Any]]:
            response = (
                self._client.table("world_events")
                .select(
                    "id, job_id, timestamp, event_type, source, message, payload, job:research_jobs(id, created_at, updated_at, title, status, input_params, final_output_url, priority)"
                )
                .order("timestamp", desc=True)
                .limit(50)
                .execute()
            )
            return response.data or []

        events = await self._run_supabase_query(
            _query,
            failure_message="Supabase world_events query failed",
        )
        return [WorldEventRecord.model_validate(item) for item in events]

    async def get_extracted_data(self) -> list[ExtractedDataRecord]:
        def _query() -> list[dict[str, Any]]:
            response = (
                self._client.table("extracted_data")
                .select(
                    "id, job_id, created_at, source_url, content, confidence, is_validated, job:research_jobs(id, created_at, updated_at, title, status, input_params, final_output_url, priority)"
                )
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )
            return response.data or []

        rows = await self._run_supabase_query(
            _query,
            failure_message="Supabase extracted_data query failed",
        )
        return [ExtractedDataRecord.model_validate(item) for item in rows]

    async def get_capabilities(self) -> list[CapabilityRecord]:
        def _query() -> list[dict[str, Any]]:
            response = (
                self._client.table("capability_registry")
                .select("id, name, version, is_active, description, config")
                .order("name")
                .execute()
            )
            return response.data or []

        rows = await self._run_supabase_query(
            _query,
            failure_message="Supabase capability_registry query failed",
        )
        return [CapabilityRecord.model_validate(item) for item in rows]

    async def get_clients(self) -> list[ClientRecord]:
        def _query() -> list[dict[str, Any]]:
            response = (
                self._client.table("clients")
                .select("id, name, email, webhook_url, s3_bucket, created_at")
                .order("name")
                .execute()
            )
            return response.data or []

        clients = await self._run_supabase_query(
            _query,
            failure_message="Supabase clients query failed",
        )
        return [ClientRecord.model_validate(item) for item in clients]

    async def get_client(self, client_id: str) -> ClientRecord | None:
        def _query() -> dict[str, Any] | None:
            response = (
                self._client.table("clients")
                .select("id, name, email, webhook_url, s3_bucket, created_at")
                .eq("id", client_id)
                .limit(1)
                .execute()
            )
            records = response.data or []
            return records[0] if records else None

        client = await self._run_supabase_query(
            _query,
            failure_message="Supabase client lookup failed",
        )
        return ClientRecord.model_validate(client) if client else None

    async def check_connection(self) -> dict[str, Any]:
        def _query() -> list[dict[str, Any]]:
            response = (
                self._client.table("processed_data")
                .select("id", count="exact")
                .limit(1)
                .execute()
            )
            return response.data or []

        try:
            records = await self._run_supabase_query(
                _query,
                failure_message="Supabase connectivity check failed",
            )
        except UpstreamServiceError as exc:
            return {"ok": False, "detail": exc.detail}

        return {
            "ok": True,
            "detail": "Supabase reachable",
            "sample_count": len(records),
        }

    @staticmethod
    def format_as_json(records: list[ProcessedDataRecord]) -> list[dict[str, Any]]:
        return [record.model_dump(mode="json") for record in records]

    @staticmethod
    def format_as_csv(records: list[ProcessedDataRecord]) -> tuple[str, str]:
        flattened_rows = [DataService._flatten_record(record) for record in records]
        headers = DataService._collect_headers(flattened_rows)

        buffer = StringIO()
        writer = csv.DictWriter(buffer, fieldnames=headers)
        writer.writeheader()
        writer.writerows(flattened_rows)
        return buffer.getvalue(), "text/csv"

    @staticmethod
    def _collect_headers(rows: Iterable[dict[str, Any]]) -> list[str]:
        headers: list[str] = []
        seen: set[str] = set()
        for row in rows:
            for key in row.keys():
                if key not in seen:
                    seen.add(key)
                    headers.append(key)
        return headers

    @staticmethod
    def _flatten_record(record: ProcessedDataRecord) -> dict[str, Any]:
        base = {
            "id": str(record.id),
            "client_id": str(record.client_id),
            "client_name": record.client.name if record.client else None,
            "status": record.status,
            "created_at": record.created_at.isoformat(),
        }
        payload = record.payload
        if isinstance(payload, dict):
            base.update(DataService._flatten_dict(payload))
            return base

        base["payload"] = json.dumps(payload)
        return base

    @staticmethod
    def _flatten_dict(
        payload: dict[str, Any], prefix: str = ""
    ) -> dict[str, Any]:
        flattened: dict[str, Any] = {}
        for key, value in payload.items():
            composite_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                flattened.update(DataService._flatten_dict(value, composite_key))
            elif isinstance(value, list):
                flattened[composite_key] = json.dumps(value)
            else:
                flattened[composite_key] = value
        return flattened

    async def _run_supabase_query(
        self,
        operation: Any,
        *,
        failure_message: str,
    ) -> Any:
        async def _execute() -> Any:
            try:
                return await run_in_threadpool(operation)
            except Exception as exc:
                if isinstance(exc, (httpx.HTTPError, OSError)):
                    raise
                raise UpstreamServiceError(f"{failure_message}: {exc}") from exc

        return await retry_async(
            _execute,
            attempts=self._settings.supabase_retry_attempts,
            base_delay_seconds=self._settings.supabase_retry_delay_seconds,
            failure_message=failure_message,
        )
