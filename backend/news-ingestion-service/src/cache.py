import os
import logging
from typing import Optional

from .schema import Article

logger = logging.getLogger(__name__)

_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_TTL = 7 * 24 * 60 * 60  # 7 days in seconds


class RedisCache:
    def __init__(self):
        self._redis = None
        self._mem_articles: dict[str, dict[str, Article]] = {}  # ticker -> {id -> Article}
        self._mem_dedup: set[str] = set()

        try:
            import redis as _redis_lib
            r = _redis_lib.from_url(
                _REDIS_URL,
                socket_connect_timeout=2,
                decode_responses=True,
            )
            r.ping()
            self._redis = r
        except Exception as e:
            logger.warning(f"[Cache] Redis unavailable ({e}), using in-memory fallback")

    @property
    def connected(self) -> bool:
        return self._redis is not None

    # ── Article storage ───────────────────────────────────────────────────────

    def save_articles(self, ticker: str, articles: list[Article]):
        """Store articles in Redis sorted set key=articles:{ticker}, score=published_at, TTL 7 days."""
        if self._redis:
            pipe = self._redis.pipeline()
            for article in articles:
                pipe.set(f"article:{article.id}", article.model_dump_json(), ex=_TTL)
                pipe.zadd(f"articles:{ticker}", {article.id: article.published_at.timestamp()})
                pipe.expire(f"articles:{ticker}", _TTL)
            pipe.execute()
        else:
            if ticker not in self._mem_articles:
                self._mem_articles[ticker] = {}
            for article in articles:
                self._mem_articles[ticker].setdefault(article.id, article)

    def get_articles(self, ticker: str, limit: int = 20) -> list[Article]:
        """Return most recent N articles. Pass limit=0 for all."""
        if self._redis:
            end = (limit - 1) if limit > 0 else -1
            ids = self._redis.zrevrange(f"articles:{ticker}", 0, end)
            if not ids:
                return []
            raw_list = self._redis.mget([f"article:{aid}" for aid in ids])
            return [Article.model_validate_json(r) for r in raw_list if r]
        else:
            articles = list(self._mem_articles.get(ticker, {}).values())
            sorted_articles = sorted(articles, key=lambda a: a.published_at, reverse=True)
            return sorted_articles if limit == 0 else sorted_articles[:limit]

    def get_all_articles(self) -> list[Article]:
        """Return all articles across all tickers."""
        if self._redis:
            ticker_keys = self._redis.keys("articles:*")
            if not ticker_keys:
                return []
            pipe = self._redis.pipeline()
            for key in ticker_keys:
                pipe.zrange(key, 0, -1)
            id_lists = pipe.execute()
            all_ids = [aid for ids in id_lists for aid in ids]
            if not all_ids:
                return []
            raw_list = self._redis.mget([f"article:{aid}" for aid in all_ids])
            return [Article.model_validate_json(r) for r in raw_list if r]
        else:
            return [
                article
                for by_id in self._mem_articles.values()
                for article in by_id.values()
            ]

    def has_ticker(self, ticker: str) -> bool:
        if self._redis:
            return self._redis.exists(f"articles:{ticker}") > 0
        else:
            return ticker in self._mem_articles and bool(self._mem_articles[ticker])

    def get_article_count(self, ticker: str) -> int:
        if self._redis:
            return self._redis.zcard(f"articles:{ticker}")
        else:
            return len(self._mem_articles.get(ticker, {}))

    def get_all_tickers(self) -> list[str]:
        """Return list of tickers that have cached articles."""
        if self._redis:
            keys = self._redis.keys("articles:*")
            return [k.removeprefix("articles:") for k in keys]
        else:
            return list(self._mem_articles.keys())

    def get_ticker_counts(self) -> dict[str, int]:
        tickers = self.get_all_tickers()
        if self._redis:
            return {t: self._redis.zcard(f"articles:{t}") for t in tickers}
        else:
            return {t: len(self._mem_articles.get(t, {})) for t in tickers}

    def get_source_counts(self) -> dict[str, int]:
        """Return dict of source -> article count."""
        counts: dict[str, int] = {}
        for article in self.get_all_articles():
            source = article.source or "other"
            counts[source] = counts.get(source, 0) + 1
        return counts

    def clear_articles(self):
        if self._redis:
            art_keys = self._redis.keys("articles:*") + self._redis.keys("article:*")
            if art_keys:
                self._redis.delete(*art_keys)
        else:
            self._mem_articles.clear()

    # ── Dedup ─────────────────────────────────────────────────────────────────

    def dedup_is_seen(self, article_id: str) -> bool:
        if self._redis:
            return bool(self._redis.sismember("dedup:seen", article_id))
        else:
            return article_id in self._mem_dedup

    def dedup_mark_seen(self, article_id: str):
        if self._redis:
            pipe = self._redis.pipeline()
            pipe.sadd("dedup:seen", article_id)
            pipe.expire("dedup:seen", _TTL)
            pipe.execute()
        else:
            self._mem_dedup.add(article_id)

    def dedup_seen_count(self) -> int:
        if self._redis:
            return self._redis.scard("dedup:seen")
        else:
            return len(self._mem_dedup)

    def clear_dedup(self):
        if self._redis:
            self._redis.delete("dedup:seen")
        else:
            self._mem_dedup.clear()

    def clear(self):
        self.clear_articles()
        self.clear_dedup()


cache = RedisCache()
