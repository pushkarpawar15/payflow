from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models import Currency, Payment, PaymentCreate
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


def test_currency_enum_includes_thb() -> None:
    assert Currency.THB.value == "THB"
    assert set(Currency) == {
        Currency.INR,
        Currency.USD,
        Currency.EUR,
        Currency.GBP,
        Currency.THB,
    }


def test_payment_create_accepts_thb() -> None:
    payload = PaymentCreate(customer="CUST-001", amount="100.00", currency="THB")
    assert payload.currency == Currency.THB

    payload_lower = PaymentCreate(customer="CUST-001", amount="100.00", currency="thb")
    assert payload_lower.currency == Currency.THB


def test_payment_create_rejects_unsupported_currency() -> None:
    with pytest.raises(ValidationError):
        PaymentCreate(customer="CUST-001", amount="100.00", currency="IDR")


def test_thb_preserves_two_decimal_amount_validation() -> None:
    valid = PaymentCreate(customer="CUST-001", amount="250.50", currency=Currency.THB)
    assert valid.amount == "250.50"

    with pytest.raises(ValidationError):
        PaymentCreate(customer="CUST-001", amount="250.555", currency=Currency.THB)
