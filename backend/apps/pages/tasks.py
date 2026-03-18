from celery import shared_task


@shared_task
def add(x: int, y: int) -> int:
    """Simple arithmetic task — used for smoke-testing Celery in dev/test."""
    return x + y
