import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_list_create_details_and_no_future_routes() -> None:
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client,
    ):
        health = await client.get("/health")
        assert health.status_code == 200
        assert health.json() == {
            "status": "healthy",
            "service": "payflow",
            "version": "1.0.0",
        }
        seeded = await client.get("/payments")
        assert seeded.status_code == 200 and len(seeded.json()) == 18
        created = await client.post(
            "/payments",
            json={"customer": "any-customer-id-999!", "amount": "499.000"},
        )
        assert created.status_code == 201
        record = created.json()
        assert record["customer"] == "any-customer-id-999!" and record["amount"] == "499.00"
        assert record["status"] == "SUCCESS"
        assert record["created_at"] == record["updated_at"]
        detail_id = record["id"].lower().replace("pay-", "PAY-")
        assert (await client.get(f"/payments/{detail_id}")).status_code == 200
        assert (await client.get("/payments/PAY-FFFFFF")).status_code == 404
        invalid_amount = await client.post(
            "/payments", json={"customer": "any-customer-id-999!", "amount": "1.001"}
        )
        assert invalid_amount.status_code == 422
        assert (await client.get("/payments", params={"status": "success"})).status_code == 422
        invalid_customer = await client.get("/payments", params={"customer": ""})
        assert invalid_customer.status_code == 422
        assert (await client.post("/payments/PAY-FFFFFF/refund")).status_code == 404
        assert (await client.get("/customers")).status_code == 404


@pytest.mark.asyncio
async def test_thb_currency_create_and_validation() -> None:
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client,
    ):
        created = await client.post(
            "/payments",
            json={"customer": "thb-customer", "amount": "1250.50", "currency": "THB"},
        )
        assert created.status_code == 201
        data = created.json()
        assert data["currency"] == "THB"
        assert data["amount"] == "1250.50"
        payment_id = data["id"]

        fetched = await client.get(f"/payments/{payment_id}")
        assert fetched.status_code == 200
        assert fetched.json()["currency"] == "THB"

        created_lower = await client.post(
            "/payments",
            json={"customer": "thb-customer", "amount": "99.00", "currency": "thb"},
        )
        assert created_lower.status_code == 201
        assert created_lower.json()["currency"] == "THB"

        invalid_currency = await client.post(
            "/payments",
            json={"customer": "thb-customer", "amount": "99.00", "currency": "IDR"},
        )
        assert invalid_currency.status_code == 422
