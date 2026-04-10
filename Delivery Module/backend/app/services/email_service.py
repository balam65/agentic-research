from __future__ import annotations

import base64
from email.message import EmailMessage
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BadRequestError
from app.models.schemas import DeliveryFormat


class EmailService:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def send_delivery_email(
        self,
        *,
        recipient_email: str,
        subject: str,
        filename: str,
        format: DeliveryFormat,
        content_bytes: bytes,
        client_name: str,
    ) -> dict[str, Any]:
        if self._settings.mail_provider != "gmail_oauth":
            raise BadRequestError(
                "MAIL_PROVIDER must be configured as 'gmail_oauth' for email delivery.",
                error_code="mail_provider_not_supported",
            )

        required = {
            "MAIL_SENDER_EMAIL": self._settings.mail_sender_email,
            "MAIL_OAUTH_CLIENT_ID": self._settings.mail_oauth_client_id,
            "MAIL_OAUTH_CLIENT_SECRET": self._settings.mail_oauth_client_secret,
            "MAIL_OAUTH_REFRESH_TOKEN": self._settings.mail_oauth_refresh_token,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise BadRequestError(
                f"Email delivery is not configured. Missing env vars: {', '.join(missing)}",
                error_code="mail_not_configured",
            )

        access_token = await self._fetch_access_token()
        raw_message = self._build_mime_message(
            recipient_email=recipient_email,
            subject=subject,
            filename=filename,
            format=format,
            content_bytes=content_bytes,
            client_name=client_name,
        )

        payload = {"raw": raw_message}
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=self._settings.request_timeout_seconds) as client:
            response = await client.post(
                self._settings.mail_gmail_send_url,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def _fetch_access_token(self) -> str:
        payload = {
            "client_id": self._settings.mail_oauth_client_id,
            "client_secret": self._settings.mail_oauth_client_secret,
            "refresh_token": self._settings.mail_oauth_refresh_token,
            "grant_type": "refresh_token",
        }
        if self._settings.mail_oauth_scopes:
            payload["scope"] = self._settings.mail_oauth_scopes

        async with httpx.AsyncClient(timeout=self._settings.request_timeout_seconds) as client:
            response = await client.post(self._settings.mail_oauth_token_url, data=payload)
            response.raise_for_status()
            token_payload = response.json()

        access_token = token_payload.get("access_token")
        if not access_token:
            raise BadRequestError(
                "OAuth token exchange succeeded without an access token.",
                error_code="mail_token_missing",
            )
        return access_token

    def _build_mime_message(
        self,
        *,
        recipient_email: str,
        subject: str,
        filename: str,
        format: DeliveryFormat,
        content_bytes: bytes,
        client_name: str,
    ) -> str:
        message = EmailMessage()
        sender_label = self._settings.mail_sender_name or "Delivery System"
        message["To"] = recipient_email
        message["From"] = f"{sender_label} <{self._settings.mail_sender_email}>"
        message["Subject"] = subject
        if self._settings.mail_reply_to:
            message["Reply-To"] = self._settings.mail_reply_to

        message.set_content(
            (
                f"Hello,\n\n"
                f"Your requested delivery data for {client_name} is attached.\n\n"
                f"Format: {format.value.upper()}\n"
                f"Filename: {filename}\n\n"
                f"Regards,\n{sender_label}"
            )
        )
        subtype = "json" if format == DeliveryFormat.json else "csv"
        message.add_attachment(
            content_bytes,
            maintype="application",
            subtype=subtype,
            filename=filename,
        )

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        return encoded_message

    async def send_notification_email(
        self,
        *,
        recipient_email: str,
        subject: str,
        filename: str,
        format: DeliveryFormat,
        client_name: str,
        delivery_type: str,
        download_url: str | None = None,
        s3_key: str | None = None,
        webhook_status_code: int | None = None,
    ) -> dict[str, Any]:
        if self._settings.mail_provider != "gmail_oauth":
            raise BadRequestError(
                "MAIL_PROVIDER must be configured as 'gmail_oauth' for email delivery.",
                error_code="mail_provider_not_supported",
            )

        required = {
            "MAIL_SENDER_EMAIL": self._settings.mail_sender_email,
            "MAIL_OAUTH_CLIENT_ID": self._settings.mail_oauth_client_id,
            "MAIL_OAUTH_CLIENT_SECRET": self._settings.mail_oauth_client_secret,
            "MAIL_OAUTH_REFRESH_TOKEN": self._settings.mail_oauth_refresh_token,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise BadRequestError(
                f"Email delivery is not configured. Missing env vars: {', '.join(missing)}",
                error_code="mail_not_configured",
            )

        access_token = await self._fetch_access_token()
        raw_message = self._build_notification_message(
            recipient_email=recipient_email,
            subject=subject,
            filename=filename,
            format=format,
            client_name=client_name,
            delivery_type=delivery_type,
            download_url=download_url,
            s3_key=s3_key,
            webhook_status_code=webhook_status_code,
        )

        payload = {"raw": raw_message}
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=self._settings.request_timeout_seconds) as client:
            response = await client.post(
                self._settings.mail_gmail_send_url,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    def _build_notification_message(
        self,
        *,
        recipient_email: str,
        subject: str,
        filename: str,
        format: DeliveryFormat,
        client_name: str,
        delivery_type: str,
        download_url: str | None = None,
        s3_key: str | None = None,
        webhook_status_code: int | None = None,
    ) -> str:
        message = EmailMessage()
        sender_label = self._settings.mail_sender_name or "Delivery System"
        message["To"] = recipient_email
        message["From"] = f"{sender_label} <{self._settings.mail_sender_email}>"
        message["Subject"] = subject
        if self._settings.mail_reply_to:
            message["Reply-To"] = self._settings.mail_reply_to

        body_lines = [
            "Hello,\n",
            f"Your requested delivery data has been completed for {client_name}.\n",
            f"Delivery type: {delivery_type}\n",
            f"Format: {format.value.upper()}\n",
            f"Filename: {filename}\n",
        ]

        if download_url:
            body_lines.append(f"Download URL: {download_url}\n")
        if s3_key:
            body_lines.append(f"S3 key: {s3_key}\n")
        if webhook_status_code is not None:
            body_lines.append(f"Webhook status code: {webhook_status_code}\n")

        body_lines.append("\nPlease check the delivery details.")
        body_lines.append(f"\n\nRegards,\n{sender_label}")

        message.set_content("\n".join(body_lines))
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        return encoded_message
