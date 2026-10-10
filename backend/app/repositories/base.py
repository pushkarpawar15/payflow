from abc import ABC, abstractmethod

from app.models import Payment, PaymentStatus


class PaymentRepository(ABC):
    @abstractmethod
    async def create(self, payment: Payment) -> Payment: ...

    @abstractmethod
    async def get(self, payment_id: str) -> Payment | None: ...

    @abstractmethod
    async def list_payments(
        self, status: PaymentStatus | None = None, customer: str | None = None
    ) -> list[Payment]: ...

    @abstractmethod
    async def close(self) -> None: ...
