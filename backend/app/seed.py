from datetime import datetime, timedelta
from decimal import Decimal

from app.models import Payment, PaymentStatus
from app.time import UTC

SEEDS: tuple[tuple[str, str, str, str, int], ...] = (
    ("PAY-A10001", "CUST-001", "1299.00", "SUCCESS", 1),
    ("PAY-A10002", "CUST-004", "499.00", "SUCCESS", 4),
    ("PAY-A10003", "CUST-002", "2499.00", "REFUNDED", 22),
    ("PAY-A10004", "CUST-006", "899.00", "SUCCESS", 29),
    ("PAY-A10005", "CUST-003", "3299.00", "SUCCESS", 47),
    ("PAY-A10006", "CUST-001", "749.00", "SUCCESS", 55),
    ("PAY-A10007", "CUST-008", "5499.00", "FAILED", 70),
    ("PAY-A10008", "CUST-005", "1599.00", "SUCCESS", 78),
    ("PAY-A10009", "CUST-002", "4299.00", "SUCCESS", 96),
    ("PAY-A1000A", "CUST-007", "999.00", "SUCCESS", 103),
    ("PAY-A1000B", "CUST-003", "2199.00", "REFUNDED", 126),
    ("PAY-A1000C", "CUST-009", "649.00", "SUCCESS", 143),
    ("PAY-A1000D", "CUST-001", "8999.00", "SUCCESS", 162),
    ("PAY-A1000E", "CUST-010", "1199.00", "FAILED", 174),
    ("PAY-A1000F", "CUST-004", "3499.00", "SUCCESS", 191),
    ("PAY-A10010", "CUST-006", "799.00", "SUCCESS", 207),
    ("PAY-A10011", "CUST-005", "1899.00", "SUCCESS", 222),
    ("PAY-A10012", "CUST-002", "2799.00", "SUCCESS", 239),
)


def build_seed_payments(now: datetime | None = None) -> list[Payment]:
    instant = (now or datetime.now(UTC)).astimezone(UTC).replace(microsecond=0)
    payments: list[Payment] = []
    for payment_id, customer, amount, status, hours_ago in SEEDS:
        created_at = instant - timedelta(hours=hours_ago)
        payments.append(
            Payment(
                id=payment_id,
                customer=customer,
                amount=Decimal(amount),
                currency="INR",
                status=PaymentStatus(status),
                created_at=created_at,
                updated_at=created_at,
            )
        )
    return payments
