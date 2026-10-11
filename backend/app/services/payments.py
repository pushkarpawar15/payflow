from collections.abc import Callable
from datetime import datetime
from uuid import uuid4

from app.exceptions import DuplicatePaymentError, PaymentNotFoundError
from app.models import Payment, PaymentCreate, PaymentStatus, normalize_customer
from app.repositories.base import PaymentRepository
from app.time import UTC


class PaymentService:
    def __init__(
        self,
        repository: PaymentRepository,
        id_generator: Callable[[], str] | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.repository = repository
        self.id_generator = id_generator or (lambda: f"PAY-{uuid4().hex[:6].upper()}")
        self.clock = clock or (lambda: datetime.now(UTC))

    async def create(self, payload: PaymentCreate) -> Payment:
        created_at = self.clock()
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            raise ValueError("Clock must return an aware datetime")
        created_at = created_at.astimezone(UTC)
        for attempt in range(5):
            payment = Payment(
                id=self.id_generator().upper(),
                customer=payload.customer,
                amount=payload.amount,
                currency=payload.currency,
                status=PaymentStatus.SUCCESS,
                created_at=created_at,
                updated_at=created_at,
            )
            try:
                return await self.repository.create(payment)
            except DuplicatePaymentError:
                if attempt == 4:
                    raise
        raise RuntimeError("Payment ID generation failed")

    async def list_payments(
        self, status: PaymentStatus | None = None, customer: str | None = None
    ) -> list[Payment]:
        normalized_customer = normalize_customer(customer) if customer is not None else None
        return await self.repository.list_payments(status=status, customer=normalized_customer)

    async def get(self, payment_id: str) -> Payment:
        normalized = payment_id.upper()
        payment = await self.repository.get(normalized)
        if payment is None:
            raise PaymentNotFoundError(normalized)
        return payment
