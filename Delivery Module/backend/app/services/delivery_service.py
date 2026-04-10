from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
import json
from typing import Any
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi.concurrency import run_in_threadpool
import httpx

from app.core.config import get_settings
from app.core.exceptions import BadRequestError
from app.models.schemas import (
    DeliverRequest,
    DeliveryJobStatus,
    DeliveryResponse,
    DeliveryStatus,
)
from app.services.data_service import DataService
from app.services.email_service import EmailService
from app.services.log_service import LogService


class DeliveryService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._data_service = DataService()
        self._email_service = EmailService()
        self._log_service = LogService()

    async def deliver(self, request: DeliverRequest) -> DeliveryResponse:
        client = await self._data_service.get_client(str(request.client_id))
        if not client:
            raise BadRequestError(
                f"No client found for client_id '{request.client_id}'.",
                error_code="missing_client",
            )

        records = await self._data_service.get_processed_data(client_id=str(request.client_id))
        if not records:
            raise BadRequestError(
                f"No processed data found for client_id '{request.client_id}'.",
                error_code="missing_processed_data",
            )

        delivered_at = datetime.now(UTC)
        job = await self._log_service.create_job(
            client_id=str(request.client_id),
            format=request.format,
            delivery_type=request.delivery_type,
        )
        await self._log_service.update_job(
            job_id=str(job.id),
            status=DeliveryJobStatus.running,
        )

        filename = self._build_filename(client.name, request.format.value, delivered_at)
        preview: Any = None
        download_url: str | None = None
        s3_key: str | None = None
        webhook_status_code: int | None = None
        recipient_email: str | None = None
        provider_message_id: str | None = None

        try:
            if request.format.value == "json":
                rendered_payload = self._data_service.format_as_json(records)
                content_bytes = json.dumps(rendered_payload, default=str, indent=2).encode(
                    "utf-8"
                )
                media_type = "application/json"
                preview = rendered_payload[:3]
            else:
                csv_output, media_type = self._data_service.format_as_csv(records)
                rendered_payload = csv_output
                content_bytes = csv_output.encode("utf-8")
                preview = csv_output.splitlines()[:4]

            if request.delivery_type.value == "api":
                download_url = (
                    f"{self._settings.api_base_url.rstrip('/')}/download"
                    f"?client_id={request.client_id}&format={request.format.value}"
                )
            elif request.delivery_type.value == "s3":
                s3_key = await self._upload_to_s3(
                    filename=filename,
                    content_bytes=content_bytes,
                    media_type=media_type,
                    client_bucket=client.s3_bucket,
                )
            elif request.delivery_type.value == "webhook":
                webhook_status_code = await self._send_webhook(
                    request=request,
                    filename=filename,
                    media_type=media_type,
                    records=records,
                    content_bytes=content_bytes,
                    client_webhook_url=client.webhook_url,
                )
            elif request.delivery_type.value == "email":
                recipient_email = str(request.recipient_email or client.email or "").strip()
                if not recipient_email:
                    raise BadRequestError(
                        "Recipient email is required for email delivery.",
                        error_code="missing_recipient_email",
                    )
                subject = request.email_subject or self._settings.mail_default_subject
                email_result = await self._email_service.send_delivery_email(
                    recipient_email=recipient_email,
                    subject=subject,
                    filename=filename,
                    format=request.format,
                    content_bytes=content_bytes,
                    client_name=client.name,
                )
                provider_message_id = email_result.get("id")
                await self._log_service.create_email_log(
                    client_id=str(request.client_id),
                    delivery_job_id=str(job.id),
                    recipient_email=recipient_email,
                    sender_email=self._settings.mail_sender_email or "",
                    subject=subject,
                    format=request.format,
                    status=DeliveryStatus.success,
                    provider=self._settings.mail_provider or "gmail_oauth",
                    provider_message_id=provider_message_id,
                    metadata={"filename": filename, "client_name": client.name},
                    sent_at=delivered_at,
                )

            if request.delivery_type.value != "email":
                await self._send_delivery_notification(
                    client=client,
                    request=request,
                    job_id=str(job.id),
                    filename=filename,
                    format=request.format,
                    download_url=download_url,
                    s3_key=s3_key,
                    webhook_status_code=webhook_status_code,
                )

            await self._log_service.create_log(
                client_id=str(request.client_id),
                status=DeliveryStatus.success,
                format=request.format,
                delivery_type=request.delivery_type,
                response=f"Delivered {len(records)} records for {client.name}.",
            )
            await self._log_service.update_job(
                job_id=str(job.id),
                status=DeliveryJobStatus.completed,
            )
            return DeliveryResponse(
                success=True,
                client_id=request.client_id,
                client_name=client.name,
                format=request.format,
                delivery_type=request.delivery_type,
                status=DeliveryStatus.success,
                message="Delivery completed successfully.",
                record_count=len(records),
                job_id=job.id,
                filename=filename,
                download_url=download_url,
                s3_key=s3_key,
                webhook_status_code=webhook_status_code,
                recipient_email=recipient_email,
                provider_message_id=provider_message_id,
                delivered_at=delivered_at,
                preview=preview,
            )
        except Exception as exc:
            if request.delivery_type.value == "email":
                attempted_email = str(request.recipient_email or client.email or "").strip()
                if attempted_email and self._settings.mail_sender_email:
                    await self._log_service.create_email_log(
                        client_id=str(request.client_id),
                        delivery_job_id=str(job.id),
                        recipient_email=attempted_email,
                        sender_email=self._settings.mail_sender_email,
                        subject=request.email_subject or self._settings.mail_default_subject,
                        format=request.format,
                        status=DeliveryStatus.failed,
                        provider=self._settings.mail_provider or "gmail_oauth",
                        error_message=str(exc),
                        metadata={"filename": filename, "client_name": client.name},
                    )
            await self._log_service.create_log(
                client_id=str(request.client_id),
                status=DeliveryStatus.failed,
                format=request.format,
                delivery_type=request.delivery_type,
                response=str(exc),
            )
            await self._log_service.update_job(
                job_id=str(job.id),
                status=DeliveryJobStatus.failed,
            )
            raise

    async def _upload_to_s3(
        self,
        *,
        filename: str,
        content_bytes: bytes,
        media_type: str,
        client_bucket: str | None,
    ) -> str:
        bucket_name = client_bucket or self._settings.s3_bucket_name
        if not bucket_name:
            raise BadRequestError("S3 delivery is not configured. Set S3 bucket in client or env.")

        key = f"{self._settings.s3_key_prefix.strip('/')}/{filename}"
        session = boto3.session.Session(
            aws_access_key_id=self._settings.aws_access_key_id,
            aws_secret_access_key=self._settings.aws_secret_access_key,
            region_name=self._settings.aws_region,
        )
        s3_client = session.client("s3")
        file_obj = BytesIO(content_bytes)

        try:
            await run_in_threadpool(
                s3_client.upload_fileobj,
                file_obj,
                bucket_name,
                key,
                ExtraArgs={"ContentType": media_type},
            )
        except (BotoCoreError, ClientError) as exc:
            raise BadRequestError(
                f"S3 upload failed: {exc}",
                error_code="s3_upload_failed",
            ) from exc

        return key

    async def _send_webhook(
        self,
        *,
        request: DeliverRequest,
        filename: str,
        media_type: str,
        records: list[Any],
        content_bytes: bytes,
        client_webhook_url: str | None,
    ) -> int:
        webhook_url = (
            str(request.webhook_url)
            if request.webhook_url
            else client_webhook_url
            or self._settings.webhook_url_map.get(str(request.client_id))
            or self._settings.default_webhook_url
        )
        if not webhook_url:
            raise BadRequestError(
                "Webhook delivery is not configured. Provide webhook_url or configure one in env."
            )

        async with httpx.AsyncClient(timeout=self._settings.request_timeout_seconds) as client:
            response = await client.post(
                webhook_url,
                headers={"Content-Type": media_type},
                content=content_bytes,
            )
            response.raise_for_status()
            return response.status_code

    async def _send_delivery_notification(
        self,
        *,
        client,
        request: DeliverRequest,
        job_id: str,
        filename: str,
        format: DeliveryFormat,
        download_url: str | None = None,
        s3_key: str | None = None,
        webhook_status_code: int | None = None,
    ) -> None:
        recipient_email = str(request.recipient_email or client.email or "").strip()
        if not recipient_email:
            return

        subject = request.email_subject or self._settings.mail_default_subject
        try:
            notification_result = await self._email_service.send_notification_email(
                recipient_email=recipient_email,
                subject=subject,
                filename=filename,
                format=format,
                client_name=client.name,
                delivery_type=request.delivery_type.value,
                download_url=download_url,
                s3_key=s3_key,
                webhook_status_code=webhook_status_code,
            )
            provider_message_id = notification_result.get("id")
            status = DeliveryStatus.success
            error_message = None
        except Exception as exc:
            provider_message_id = None
            status = DeliveryStatus.failed
            error_message = str(exc)

        await self._log_service.create_email_log(
            client_id=str(request.client_id),
            delivery_job_id=job_id,
            recipient_email=recipient_email,
            sender_email=self._settings.mail_sender_email or "",
            subject=subject,
            format=format,
            status=status,
            provider=self._settings.mail_provider or "gmail_oauth",
            provider_message_id=provider_message_id,
            error_message=error_message,
            metadata={
                "filename": filename,
                "client_name": client.name,
                "delivery_type": request.delivery_type.value,
                "notification_type": "delivery_completion",
            },
            sent_at=datetime.now(UTC) if status == DeliveryStatus.success else None,
        )

    @staticmethod
    def _build_filename(client_name: str, extension: str, delivered_at: datetime) -> str:
        safe_client_id = client_name.replace(" ", "-").replace("/", "-").lower()
        timestamp = delivered_at.strftime("%Y%m%dT%H%M%SZ")
        return f"{safe_client_id}-{timestamp}-{uuid4().hex[:8]}.{extension}"
