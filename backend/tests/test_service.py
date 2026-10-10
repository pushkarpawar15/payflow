from datetime import datetime

import pytest

from app.exceptions import DuplicatePaymentError, PaymentNotFoundError
from app.models import Payment, PaymentCreate
from app.repositories.memory import MemoryPaymentRepository
from app.services.payments import PaymentService
from app.time import UTC


@pytest.mark.asyncio
async def test_create_and_list_are_deterministic() -> None:
    repository = MemoryPaymentRepository()
    service = PaymentService(
        repository,
        id_generator=lambda: "PAY-AABBCC",
        clock=lambda: datetime(2026, 1, 1, tzinfo=UTC),
    )
    payment = await service.create(PaymentCreate(customer="CUST-001", amount="499.00"))
    assert payment.status == "SUCCESS"
    assert payment.created_at == payment.updated_at
    assert (await service.list_payments())[0] == payment
    with pytest.raises(DuplicatePaymentError):
        await service.create(PaymentCreate(customer="CUST-001", amount="1"))


@pytest.mark.asyncio
async def test_id_collisions_retry_five_times() -> None:
    repository = MemoryPaymentRepository(
        [
            Payment(
                id="PAY-AABBCC",
                customer="CUST-001",
                amount="1",
                currency="INR",
                status="SUCCESS",
                created_at=datetime(2026, 1, 1, tzinfo=UTC),
                updated_at=datetime(2026, 1, 1, tzinfo=UTC),
            )
        ]
    )
    service = PaymentService(repository, id_generator=lambda: "PAY-AABBCC")
    with pytest.raises(DuplicatePaymentError):
        await service.create(PaymentCreate(customer="CUST-001", amount="1"))


@pytest.mark.asyncio
async def test_missing_payment_raises_domain_error() -> None:
    service = PaymentService(MemoryPaymentRepository())
    with pytest.raises(PaymentNotFoundError):
        await service.get("pay-aabbcc")
