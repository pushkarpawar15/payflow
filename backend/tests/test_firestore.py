from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from google.api_core.exceptions import AlreadyExists, ServiceUnavailable

from app.exceptions import DuplicatePaymentError, RepositoryError
from app.repositories.firestore import FirestorePaymentRepository
from app.seed import build_seed_payments


def make_repository() -> tuple[FirestorePaymentRepository, MagicMock, MagicMock]:
    client = MagicMock()
    collection = MagicMock()
    document = MagicMock()
    document.create = AsyncMock()
    client.collection.return_value = collection
    collection.document.return_value = document
    return FirestorePaymentRepository(client), collection, document


@pytest.mark.asyncio
async def test_create_serializes_firestore_native_values() -> None:
    repository, collection, document = make_repository()
    payment = build_seed_payments()[0]

    await repository.create(payment)

    collection.document.assert_called_once_with(payment.id)
    document.create.assert_awaited_once()
    record = document.create.await_args.args[0]
    assert "id" not in record
    assert record["amount"] == payment.amount
    assert record["status"] == payment.status.value
    assert record["created_at"] == payment.created_at
    assert isinstance(record["created_at"], datetime)


@pytest.mark.asyncio
async def test_create_translates_duplicate_and_storage_failures() -> None:
    repository, _, document = make_repository()
    payment = build_seed_payments()[0]
    document.create = AsyncMock(side_effect=AlreadyExists("duplicate"))
    with pytest.raises(DuplicatePaymentError):
        await repository.create(payment)

    original_error = ServiceUnavailable("offline")
    document.create = AsyncMock(side_effect=original_error)
    with pytest.raises(RepositoryError) as caught:
        await repository.create(payment)
    assert caught.value.__cause__ is original_error


@pytest.mark.asyncio
async def test_get_returns_none_or_validates_document_data() -> None:
    repository, collection, _ = make_repository()
    payment = build_seed_payments()[0]
    snapshot = MagicMock(exists=False)
    snapshot.id = payment.id
    collection.document.return_value.get = AsyncMock(return_value=snapshot)
    assert await repository.get(payment.id) is None

    snapshot.exists = True
    snapshot.to_dict.return_value = {
        "customer": payment.customer,
        "amount": payment.amount,
        "currency": payment.currency.value,
        "status": payment.status.value,
        "created_at": payment.created_at,
        "updated_at": payment.updated_at,
    }
    found = await repository.get(payment.id)
    assert found == payment

    snapshot.to_dict.return_value = {"amount": "corrupt"}
    with pytest.raises(RepositoryError):
        await repository.get(payment.id)


@pytest.mark.asyncio
async def test_thb_currency_firestore_storage() -> None:
    repository, collection, document = make_repository()
    base_payment = build_seed_payments()[0]
    payment = base_payment.model_copy(update={"currency": "THB"})

    await repository.create(payment)
    record = document.create.await_args.args[0]
    assert record["currency"] == "THB"

    snapshot = MagicMock(exists=True)
    snapshot.id = payment.id
    snapshot.to_dict.return_value = {
        "customer": payment.customer,
        "amount": payment.amount,
        "currency": "THB",
        "status": payment.status.value,
        "created_at": payment.created_at,
        "updated_at": payment.updated_at,
    }
    collection.document.return_value.get = AsyncMock(return_value=snapshot)
    found = await repository.get(payment.id)
    assert found is not None
    assert found.currency.value == "THB"
