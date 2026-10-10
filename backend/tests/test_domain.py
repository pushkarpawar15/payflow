from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models import Payment, PaymentCreate
from app.seed import build_seed_payments
from app.time import UTC


@pytest.mark.parametrize(
    ("amount", "expected"), [("1", "1.00"), ("1.000", "1.00"), (499, "499.00")]
)
def test_amount_is_exact_and_normalized(amount: object, expected: str) -> None:
    assert PaymentCreate(customer=" cust-001 ", amount=amount).model_dump()["amount"] == expected


@pytest.mark.parametrize("amount", [True, 0, -1, "NaN", "Infinity", "1.001"])
def test_invalid_amount_is_rejected(amount: object) -> None:
    with pytest.raises(ValidationError):
        PaymentCreate(customer="CUST-001", amount=amount)


def test_payment_requires_aware_ordered_timestamps() -> None:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    with pytest.raises(ValidationError):
        Payment(
            id="PAY-AABBCC",
            customer="CUST-001",
            amount="1",
            currency="INR",
            status="SUCCESS",
            created_at=now.replace(tzinfo=None),
            updated_at=now,
        )
    with pytest.raises(ValidationError):
        Payment(
            id="PAY-AABBCC",
            customer="CUST-001",
            amount="1",
            currency="INR",
            status="SUCCESS",
            created_at=now,
            updated_at=now.replace(year=2025),
        )


def test_seed_records_have_required_shape_and_totals() -> None:
    records = build_seed_payments(datetime(2026, 10, 10, 8, 30, 0, 800, tzinfo=UTC))
    assert len(records) == 18
    assert sum(int(record.amount[:-3]) for record in records if record.status != "FAILED") == 36984
    assert sum(int(record.amount[:-3]) for record in records if record.status == "REFUNDED") == 4698
    assert all(record.created_at == record.updated_at for record in records)
