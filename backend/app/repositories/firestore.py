from typing import Any

from google.api_core.exceptions import AlreadyExists, GoogleAPICallError
from google.cloud.firestore import AsyncClient

from app.exceptions import DuplicatePaymentError, RepositoryError
from app.models import Payment, PaymentStatus
from app.repositories.base import PaymentRepository


class FirestorePaymentRepository(PaymentRepository):
    def __init__(self, client: AsyncClient) -> None:
        self._client = client
        self._collection = client.collection("payments")

    @staticmethod
    def _to_payment(data: dict[str, Any], document_id: str) -> Payment:
        try:
            return Payment.model_validate({**data, "id": document_id})
        except Exception as exc:
            raise RepositoryError("Invalid payment document") from exc

    async def create(self, payment: Payment) -> Payment:
        data = payment.model_dump(mode="json")
        data.pop("id")
        data["created_at"] = payment.created_at
        data["updated_at"] = payment.updated_at
        try:
            await self._collection.document(payment.id).create(data)
            return payment
        except AlreadyExists as exc:
            raise DuplicatePaymentError(payment.id) from exc
        except GoogleAPICallError as exc:
            raise RepositoryError("Firestore create failed") from exc

    async def get(self, payment_id: str) -> Payment | None:
        try:
            snapshot = await self._collection.document(payment_id).get()
            if not snapshot.exists:
                return None
            data = snapshot.to_dict()
            if data is None:
                raise RepositoryError("Payment document has no data")
            return self._to_payment(data, snapshot.id)
        except RepositoryError:
            raise
        except GoogleAPICallError as exc:
            raise RepositoryError("Firestore get failed") from exc

    async def list_payments(
        self, status: PaymentStatus | None = None, customer: str | None = None
    ) -> list[Payment]:
        try:
            snapshots = [snapshot async for snapshot in self._collection.stream()]
            payments = []
            for snapshot in snapshots:
                data = snapshot.to_dict()
                if data is None:
                    raise RepositoryError("Payment document has no data")
                payments.append(self._to_payment(data, snapshot.id))
            return sorted(
                (
                    payment
                    for payment in payments
                    if (status is None or payment.status == status)
                    and (customer is None or payment.customer == customer)
                ),
                key=lambda payment: payment.created_at,
                reverse=True,
            )
        except RepositoryError:
            raise
        except GoogleAPICallError as exc:
            raise RepositoryError("Firestore list failed") from exc

    async def close(self) -> None:
        try:
            await self._client.close()
        except GoogleAPICallError as exc:
            raise RepositoryError("Firestore close failed") from exc
