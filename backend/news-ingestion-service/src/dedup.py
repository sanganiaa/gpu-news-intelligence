import hashlib

# In-memory store — swap for Redis in production
_seen_ids: set = set()


def make_id(url: str) -> str:
    """Generate a stable short ID from a URL using SHA256."""
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def is_duplicate(article_id: str) -> bool:
    return article_id in _seen_ids


def mark_seen(article_id: str):
    _seen_ids.add(article_id)


def seen_count() -> int:
    return len(_seen_ids)


def clear():
    """Clear dedup store — useful for testing."""
    _seen_ids.clear()
