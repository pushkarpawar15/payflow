import asyncio

from app.exceptions import DuplicatePaymentError
from app.models import Payment, PaymentStatus
from app.repositories.base import PaymentRepository


class MemoryPaymentRepository(PaymentRepository):
    def __init__(self, payments: list[Payment] | None = None) -> None:
        self._payments = {payment.id: payment for payment in payments or []}
        self._lock = asyncio.Lock()

    async def create(self, payment: Payment) -> Payment:
        async with self._lock:
            if payment.id in self._payments:
                raise DuplicatePaymentError(payment.id)
            self._payments[payment.id] = payment
            return payment

    async def get(self, payment_id: str) -> Payment | None:
        async with self._lock:
            return self._payments.get(payment_id)

    async def list_payments(
        self, status: PaymentStatus | None = None, customer: str | None = None
    ) -> list[Payment]:
        async with self._lock:
            snapshot = list(self._payments.values())
        return sorted(
            (
                item
                for item in snapshot
                if (status is None or item.status == status)
                and (customer is None or item.customer == customer)
            ),
            key=lambda item: item.created_at,
            reverse=True,
        )

    async def close(self) -> None:
        return None
