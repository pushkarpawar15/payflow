from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.time import UTC


class PaymentStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Currency(str, Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    IDR = "IDR"


def normalize_customer(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("Customer must be text")
    normalized = value.strip()
    if not normalized:
        raise ValueError("Customer ID is required")
    return normalized


def normalize_amount(value: Any) -> str:
    if isinstance(value, bool) or not isinstance(value, str | int | float | Decimal):
        raise ValueError("Amount must be a decimal value")
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Amount must be a decimal value") from exc
    if not amount.is_finite() or amount <= 0:
        raise ValueError("Amount must be positive and finite")
    try:
        normalized = amount.quantize(Decimal("0.01"))
    except InvalidOperation as exc:
        raise ValueError("Amount is outside the supported range") from exc
    if normalized != amount:
        raise ValueError("Amount may have at most two significant decimal places")
    return format(normalized, ".2f")


class PaymentCreate(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    customer: str
    amount: str
    currency: Currency = Currency.INR

    @field_validator("customer", mode="before")
    @classmethod
    def validate_customer(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("Customer must be text")
        return normalize_customer(value)

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: Any) -> str:
        return normalize_amount(value)

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) else value


class Payment(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str = Field(pattern=r"^PAY-[A-F0-9]{6}$")
    customer: str
    amount: str
    currency: Currency
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime

    @field_validator("customer")
    @classmethod
    def validate_customer(cls, value: str) -> str:
        return normalize_customer(value)

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, value: Any) -> str:
        return normalize_amount(value)

    @field_validator("created_at", "updated_at")
    @classmethod
    def require_aware_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Timestamp must be timezone-aware")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def require_ordered_timestamps(self) -> Payment:
        if self.updated_at < self.created_at:
            raise ValueError("updated_at must not precede created_at")
        return self
