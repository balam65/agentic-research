from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class DeliveryFormat(str, Enum):
    json = "json"
    csv = "csv"


class DeliveryType(str, Enum):
    api = "api"
    s3 = "s3"
    webhook = "webhook"
    email = "email"


class DeliveryStatus(str, Enum):
    success = "success"
    failed = "failed"


class DeliveryJobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ClientRecord(BaseModel):
    id: UUID
    name: str
    email: str | None = None
    webhook_url: str | None = None
    s3_bucket: str | None = None
    created_at: datetime | None = None


class ProcessedDataRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    client_id: UUID
    status: str | None = None
    payload: dict[str, Any] | list[Any] | str | int | float | bool | None
    created_at: datetime
    client: ClientRecord | None = None


class DeliveryLogRecord(BaseModel):
    id: UUID | None = None
    client_id: UUID
    data_id: UUID | None = None
    status: DeliveryStatus
    format: DeliveryFormat
    delivery_type: DeliveryType
    response: str | None = None
    created_at: datetime
    client: ClientRecord | None = None


class DeliveryJobRecord(BaseModel):
    id: UUID | None = None
    client_id: UUID
    data_id: UUID | None = None
    format: DeliveryFormat
    delivery_type: DeliveryType
    status: DeliveryJobStatus
    retry_count: int = 0
    scheduled_at: datetime | None = None
    created_at: datetime | None = None
    client: ClientRecord | None = None


class EmailDeliveryLogRecord(BaseModel):
    id: UUID | None = None
    client_id: UUID
    data_id: UUID | None = None
    delivery_job_id: UUID | None = None
    recipient_email: str
    sender_email: str
    subject: str
    format: DeliveryFormat
    status: DeliveryStatus
    provider: str
    provider_message_id: str | None = None
    error_message: str | None = None
    metadata: dict[str, Any] | None = None
    sent_at: datetime | None = None
    created_at: datetime


class ResearchJobRecord(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime
    title: str
    status: str | None = None
    input_params: dict[str, Any] | None = None
    final_output_url: str | None = None
    priority: int | None = 0


class WorldEventRecord(BaseModel):
    id: UUID
    job_id: UUID | None = None
    timestamp: datetime
    event_type: str
    source: str
    message: str | None = None
    payload: dict[str, Any] | list[Any] | str | int | float | bool | None = None
    research_job: ResearchJobRecord | None = Field(default=None, alias="job")


class ExtractedDataRecord(BaseModel):
    id: UUID
    job_id: UUID | None = None
    created_at: datetime
    source_url: str | None = None
    content: dict[str, Any] | list[Any] | str | int | float | bool | None = None
    confidence: float | None = 1.0
    is_validated: bool | None = False
    research_job: ResearchJobRecord | None = Field(default=None, alias="job")


class CapabilityRecord(BaseModel):
    id: UUID
    name: str
    version: str | None = None
    is_active: bool | None = True
    description: str | None = None
    config: dict[str, Any] | list[Any] | str | int | float | bool | None = None


class DeliverRequest(BaseModel):
    client_id: UUID
    format: DeliveryFormat
    delivery_type: DeliveryType
    webhook_url: HttpUrl | None = None
    recipient_email: str | None = Field(default=None, max_length=320)
    email_subject: str | None = Field(default=None, max_length=255)


class DeliveryResponse(BaseModel):
    success: bool
    client_id: UUID
    client_name: str | None = None
    format: DeliveryFormat
    delivery_type: DeliveryType
    status: DeliveryStatus
    message: str
    record_count: int
    job_id: UUID | None = None
    filename: str | None = None
    download_url: str | None = None
    s3_key: str | None = None
    webhook_status_code: int | None = None
    recipient_email: str | None = None
    provider_message_id: str | None = None
    delivered_at: datetime
    preview: Any | None = None


class StatsResponse(BaseModel):
    total_logs: int
    success_count: int
    failure_count: int
    last_delivery_at: datetime | None = None


class DataResponse(BaseModel):
    items: list[ProcessedDataRecord]
    count: int
    clients: list[ClientRecord]


class LogsResponse(BaseModel):
    items: list[DeliveryLogRecord]
    count: int


class DeliveryJobsResponse(BaseModel):
    items: list[DeliveryJobRecord]
    count: int


class ResearchJobsResponse(BaseModel):
    items: list[ResearchJobRecord]
    count: int


class WorldEventsResponse(BaseModel):
    items: list[WorldEventRecord]
    count: int


class ExtractedDataResponse(BaseModel):
    items: list[ExtractedDataRecord]
    count: int


class CapabilityResponse(BaseModel):
    items: list[CapabilityRecord]
    count: int


class DashboardOverviewResponse(BaseModel):
    clients_count: int
    processed_count: int
    delivery_jobs_count: int
    research_jobs_count: int
    events_count: int
    extracted_count: int
    active_capabilities_count: int


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
