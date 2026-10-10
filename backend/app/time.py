from datetime import timezone

try:
    from datetime import UTC
except ImportError:
    UTC = timezone.utc  # noqa: UP017
