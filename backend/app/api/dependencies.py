from fastapi import Request

from app.services.payments import PaymentService


def get_payment_service(request: Request) -> PaymentService:
    return request.app.state.payment_service
