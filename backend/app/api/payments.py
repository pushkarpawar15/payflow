import logging

from fastapi import APIRouter, HTTPException, Path, Request, status

from app.api.dependencies import get_payment_service
from app.models import Payment, PaymentCreate, PaymentStatus, normalize_customer

router = APIRouter(prefix="/payments")
logger = logging.getLogger("payflow")


@router.get("", response_model=list[Payment])
async def list_payments(request: Request) -> list[Payment]:
    payment_service = get_payment_service(request)
    raw_status = request.query_params.get("status")
    try:
        payment_status = PaymentStatus(raw_status) if raw_status is not None else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid payment status") from exc
    customer = request.query_params.get("customer")
    try:
        normalized = normalize_customer(customer) if customer is not None else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid fictional customer ID") from exc
    return await payment_service.list_payments(status=payment_status, customer=normalized)


@router.post("", response_model=Payment, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreate,
    request: Request,
) -> Payment:
    payment_service = get_payment_service(request)
    payment = await payment_service.create(payload)
    logger.info(
        "Simulated payment created",
        extra={
            "event": "payment_created",
            "fields": {
                "payment_id": payment.id,
                "customer_id": payment.customer,
                "amount": payment.amount,
                "currency": payment.currency.value,
                "status": payment.status.value,
            },
        },
    )
    return payment


@router.get("/{payment_id}", response_model=Payment)
async def get_payment(
    request: Request,
    payment_id: str = Path(pattern=r"^PAY-[A-Fa-f0-9]{6}$"),
) -> Payment:
    payment_service = get_payment_service(request)
    return await payment_service.get(payment_id)
