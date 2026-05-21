import json
import os
from typing import Literal

import anthropic

_client: anthropic.Anthropic | None = None

CatalystTag = Literal[
    "earnings", "fda", "merger", "rate_decision",
    "product_launch", "lawsuit", "regulation", "macro", "other"
]

_SYSTEM = """\
You are a financial news analyst. Given an article, respond with valid JSON only — no markdown, no prose.
The JSON must have exactly these keys:
  "summary"               — 3-sentence plain-English summary of the article
  "investment_implication" — one line starting with Bullish/Bearish/Neutral, mentioning the relevant ticker(s) and why
  "catalyst_tag"          — exactly one of: earnings, fda, merger, rate_decision, product_launch, lawsuit, regulation, macro, other
"""

_USER_TMPL = """\
Article title: {title}

Article text:
{text}
"""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def summarize(title: str, text: str) -> tuple[str, str, str]:
    """Return (summary_ai, investment_implication, catalyst_tag)."""
    # Truncate to ~6 000 chars to stay well within Haiku's context
    truncated = text[:6000]

    message = _get_client().messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": _USER_TMPL.format(title=title, text=truncated),
            }
        ],
        system=_SYSTEM,
    )

    raw = message.content[0].text.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: extract JSON block if the model added surrounding text
        start = raw.find("{")
        end = raw.rfind("}") + 1
        parsed = json.loads(raw[start:end])

    summary_ai: str = parsed["summary"]
    investment_implication: str = parsed["investment_implication"]
    catalyst_tag: str = parsed.get("catalyst_tag", "other")

    valid_tags = {
        "earnings", "fda", "merger", "rate_decision",
        "product_launch", "lawsuit", "regulation", "macro", "other",
    }
    if catalyst_tag not in valid_tags:
        catalyst_tag = "other"

    return summary_ai, investment_implication, catalyst_tag
