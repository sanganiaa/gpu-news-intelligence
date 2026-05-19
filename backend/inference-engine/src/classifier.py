"""
Rule-based market event classifier.

FinBERT handles sentiment; this module tags the *type* of market event
from the article's title + body using keyword matching. Fast and transparent
— no second model needed.
"""

import re

_RULES: list[tuple[str, list[str], float]] = [
    ("earnings", [
        r"\bearnings\b", r"\beps\b", r"\brevenue\b", r"\bquarterly results\b",
        r"\bbeat estimates\b", r"\bmissed estimates\b", r"\bguidance\b",
        r"\bq[1-4] \d{4}\b", r"\bfiscal year\b", r"\bprofit\b", r"\bloss\b",
    ], 0.85),
    ("fda", [
        r"\bfda\b", r"\bclinical trial\b", r"\bphase [123]\b", r"\bapproval\b",
        r"\bdrug\b", r"\btherapy\b", r"\btrial results\b", r"\bregulatory\b",
    ], 0.85),
    ("merger", [
        r"\bacquisition\b", r"\bmerger\b", r"\btakeover\b", r"\bbuyout\b",
        r"\bdeal\b", r"\bagreement to (buy|acquire|merge)\b", r"\bterm sheet\b",
    ], 0.80),
    ("analyst", [
        r"\bupgrade\b", r"\bdowngrade\b", r"\bprice target\b", r"\brating\b",
        r"\bbuy rating\b", r"\bsell rating\b", r"\bhold rating\b",
        r"\banalyst\b", r"\bstreet\b",
    ], 0.75),
    ("filing", [
        r"\b8-k\b", r"\b10-k\b", r"\b10-q\b", r"\bsec filing\b",
        r"\bproxy\b", r"\bshareholder\b", r"\bform 4\b",
    ], 0.90),
    ("macro", [
        r"\bfederal reserve\b", r"\bfed\b", r"\binterest rate\b", r"\binflation\b",
        r"\bgdp\b", r"\bunemployment\b", r"\bcpi\b", r"\bfomc\b", r"\btariff\b",
        r"\btrade war\b", r"\brecession\b",
    ], 0.80),
]


def classify_event(title: str | None, text: str) -> tuple[str, float]:
    """
    Returns (event_type, confidence) for the most-matched category.
    Falls back to ("other", 0.5) when nothing matches.
    """
    haystack = " ".join(filter(None, [title, text])).lower()

    best_type = "other"
    best_conf = 0.5
    best_hits = 0

    for event_type, patterns, base_conf in _RULES:
        hits = sum(1 for p in patterns if re.search(p, haystack))
        if hits > best_hits:
            best_hits = hits
            best_type = event_type
            # More pattern matches → slightly higher confidence
            best_conf = min(base_conf + 0.02 * (hits - 1), 0.99)

    return best_type, round(best_conf, 4)
