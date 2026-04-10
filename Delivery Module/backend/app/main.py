from collections import Counter
from datetime import UTC, datetime
from io import BytesIO

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.exceptions import AppError, NotFoundError
from app.models.schemas import (
    CapabilityResponse,
    DashboardOverviewResponse,
    DataResponse,
    DeliverRequest,
    DeliveryJobsResponse,
    ErrorResponse,
    ExtractedDataResponse,
    LogsResponse,
    ResearchJobsResponse,
    StatsResponse,
    WorldEventsResponse,
)
from app.services.data_service import DataService
from app.services.delivery_service import DeliveryService

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Production-ready output and delivery module.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_service = DataService()
delivery_service = DeliveryService()


@app.exception_handler(AppError)
async def app_error_handler(_, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=exc.detail,
            error_code=exc.error_code,
        ).model_dump(),
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(_, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            detail=str(exc),
            error_code="validation_error",
        ).model_dump(),
    )


@app.get("/health")
async def healthcheck() -> JSONResponse:
    supabase_status = await data_service.check_connection()
    overall_status = "ok" if supabase_status["ok"] else "degraded"
    return JSONResponse(
        status_code=200 if supabase_status["ok"] else 503,
        content={
            "status": overall_status,
            "environment": settings.app_env,
            "services": {"supabase": supabase_status},
        },
    )


@app.get("/data")
async def get_data(client_id: str | None = Query(default=None)) -> DataResponse:
    records = await data_service.get_processed_data(client_id=client_id)
    clients = await data_service.get_clients()
    return DataResponse(items=records, count=len(records), clients=clients)


@app.get("/download")
async def download_data(
    client_id: str = Query(..., min_length=1),
    format: str = Query(default="csv", pattern="^(json|csv)$"),
) -> StreamingResponse:
    records = await data_service.get_processed_data(client_id=client_id)
    if not records:
        raise NotFoundError(f"No processed data found for client_id '{client_id}'.")

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    if format == "json":
        content = JSONResponse(content=[record.model_dump(mode="json") for record in records]).body
        filename = f"{client_id}-{timestamp}.json"
        media_type = "application/json"
    else:
        csv_output, media_type = data_service.format_as_csv(records)
        content = csv_output.encode("utf-8")
        filename = f"{client_id}-{timestamp}.csv"

    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/logs")
async def get_logs(client_id: str | None = Query(default=None)) -> LogsResponse:
    logs = await data_service.get_delivery_logs(client_id=client_id)
    return LogsResponse(items=logs, count=len(logs))


@app.get("/delivery-jobs")
async def get_delivery_jobs(
    client_id: str | None = Query(default=None),
) -> DeliveryJobsResponse:
    jobs = await data_service.get_delivery_jobs(client_id=client_id)
    return DeliveryJobsResponse(items=jobs, count=len(jobs))


@app.get("/research-jobs")
async def get_research_jobs() -> ResearchJobsResponse:
    jobs = await data_service.get_research_jobs()
    return ResearchJobsResponse(items=jobs, count=len(jobs))


@app.get("/world-events")
async def get_world_events() -> WorldEventsResponse:
    events = await data_service.get_world_events()
    return WorldEventsResponse(items=events, count=len(events))


@app.get("/extracted-data")
async def get_extracted_data() -> ExtractedDataResponse:
    rows = await data_service.get_extracted_data()
    return ExtractedDataResponse(items=rows, count=len(rows))


@app.get("/capabilities")
async def get_capabilities() -> CapabilityResponse:
    items = await data_service.get_capabilities()
    return CapabilityResponse(items=items, count=len(items))


@app.get("/stats", response_model=StatsResponse)
async def get_stats(client_id: str | None = Query(default=None)) -> StatsResponse:
    logs = await data_service.get_delivery_logs(client_id=client_id)
    counts = Counter(log.status.value for log in logs)
    return StatsResponse(
        total_logs=len(logs),
        success_count=counts.get("success", 0),
        failure_count=counts.get("failed", 0),
        last_delivery_at=logs[0].created_at if logs else None,
    )


@app.get("/overview")
async def get_overview(client_id: str | None = Query(default=None)) -> DashboardOverviewResponse:
    clients = await data_service.get_clients()
    processed = await data_service.get_processed_data(client_id=client_id)
    delivery_jobs = await data_service.get_delivery_jobs(client_id=client_id)
    research_jobs = await data_service.get_research_jobs()
    world_events = await data_service.get_world_events()
    extracted_data = await data_service.get_extracted_data()
    capabilities = await data_service.get_capabilities()
    return DashboardOverviewResponse(
        clients_count=len(clients),
        processed_count=len(processed),
        delivery_jobs_count=len(delivery_jobs),
        research_jobs_count=len(research_jobs),
        events_count=len(world_events),
        extracted_count=len(extracted_data),
        active_capabilities_count=sum(1 for item in capabilities if item.is_active),
    )


@app.post("/deliver")
async def deliver_data(request: DeliverRequest) -> JSONResponse:
    try:
        result = await delivery_service.deliver(request)
        return JSONResponse(status_code=200, content=result.model_dump(mode="json"))
    except (HTTPException, AppError):
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "detail": str(exc),
                "error_code": "delivery_failed",
            },
        ) from exc
