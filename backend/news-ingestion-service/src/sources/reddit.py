from datetime import datetime, timezone

import httpx

from ..dedup import is_duplicate, make_id, mark_seen
from ..schema import Article

REDDIT_TOP_URL = "https://www.reddit.com/r/{subreddit}/top.json"
SUBREDDITS = ("investing", "stocks")

HEADERS = {
    "User-Agent": "gpu-news-intelligence/1.0 news ingestion service"
}


def _created_utc_to_datetime(value) -> datetime:
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


async def fetch_reddit_top_posts(limit_per_subreddit: int = 10) -> list[Article]:
    """Fetch top posts from finance subreddits via Reddit's public JSON API."""
    articles: list[Article] = []

    try:
        async with httpx.AsyncClient(timeout=10, headers=HEADERS) as client:
            for subreddit in SUBREDDITS:
                response = await client.get(
                    REDDIT_TOP_URL.format(subreddit=subreddit),
                    params={
                        "t": "day",
                        "limit": limit_per_subreddit,
                        "raw_json": 1,
                    },
                    follow_redirects=True,
                )
                data = response.json()

                children = data.get("data", {}).get("children", [])
                for child in children:
                    post = child.get("data", {})
                    if post.get("stickied"):
                        continue

                    permalink = post.get("permalink", "")
                    if not permalink:
                        continue

                    url = f"https://www.reddit.com{permalink}"
                    article_id = make_id(url)
                    if is_duplicate(article_id):
                        continue

                    title = post.get("title", "").strip()
                    score = post.get("score", 0)
                    comments = post.get("num_comments", 0)
                    summary = f"r/{subreddit} top post. Score: {score}. Comments: {comments}."

                    article = Article(
                        id=article_id,
                        ticker="REDDIT",
                        source="reddit",
                        content_type="reddit",
                        title=title,
                        summary=summary,
                        url=url,
                        published_at=_created_utc_to_datetime(post.get("created_utc")),
                        ingested_at=datetime.now(timezone.utc),
                        raw_text=post.get("selftext", ""),
                    )
                    mark_seen(article_id)
                    articles.append(article)

    except Exception as e:
        print(f"[Reddit] Error fetching top posts: {e}")

    return articles
