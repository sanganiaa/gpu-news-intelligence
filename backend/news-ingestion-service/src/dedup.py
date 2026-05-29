import hashlib
from .cache import cache


def make_id(url: str) -> str:
    """Generate a stable short ID from a URL using SHA256."""
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def is_duplicate(article_id: str) -> bool:
    return cache.dedup_is_seen(article_id)


def mark_seen(article_id: str):
    cache.dedup_mark_seen(article_id)


def seen_count() -> int:
    return cache.dedup_seen_count()


def clear():
    """Clear dedup store — useful for testing."""
    cache.clear_dedup()
