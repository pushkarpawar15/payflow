class PayFlowError(Exception):
    """Base class for expected application failures."""


class RepositoryError(PayFlowError):
    pass


class DuplicatePaymentError(PayFlowError):
    pass


class PaymentNotFoundError(PayFlowError):
    pass
