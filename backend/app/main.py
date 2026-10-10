import logging
import re
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import health, payments
from app.config import get_settings
from app.exceptions import PayFlowError, PaymentNotFoundError, RepositoryError
from app.logging_config import configure_logging
from app.repositories.firestore import FirestorePaymentRepository
from app.repositories.memory import MemoryPaymentRepository
from app.seed import build_seed_payments
from app.services.payments import PaymentService

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger("payflow")


@asynccontextmanager
async def lifespan(application: FastAPI):
    if settings.storage_backend == "firestore":
        from google.cloud.firestore import AsyncClient

        client = AsyncClient(
            project=settings.google_cloud_project, database=settings.firestore_database
        )
        repository = FirestorePaymentRepository(client)
    else:
        repository = MemoryPaymentRepository(build_seed_payments() if settings.should_seed else [])
    application.state.repository = repository
    application.state.payment_service = PaymentService(repository)
    try:
        yield
    finally:
        await repository.close()


app = FastAPI(title="PayFlow API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    supplied_id = request.headers.get("X-Request-ID", "")
    request_id = supplied_id if re.fullmatch(r"[A-Za-z0-9._-]{1,128}", supplied_id) else uuid4().hex
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        response = JSONResponse({"detail": "Payment operation failed"}, status_code=500)
    finally:
        duration = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "Request completed",
        extra={
            "event": "request_completed",
            "fields": {
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code if "response" in locals() else 500,
                "duration_ms": duration,
                "request_id": request_id,
            },
        },
    )
    return response


@app.exception_handler(PaymentNotFoundError)
async def payment_not_found(_: Request, exc: PaymentNotFoundError) -> JSONResponse:
    return JSONResponse({"detail": f"Payment {exc!s} not found"}, status_code=404)


@app.exception_handler(RepositoryError)
async def repository_unavailable(_: Request, __: RepositoryError) -> JSONResponse:
    return JSONResponse({"detail": "Payment storage is temporarily unavailable"}, status_code=503)


@app.exception_handler(PayFlowError)
async def payflow_failure(_: Request, __: PayFlowError) -> JSONResponse:
    return JSONResponse({"detail": "Payment operation failed"}, status_code=500)


app.include_router(health.router)
app.include_router(payments.router)
