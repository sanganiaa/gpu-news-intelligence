import re

# Maps lowercase company-name variants → ticker symbol.
# Ordered so longer / more-specific strings shadow shorter ones when iterated.
_COMPANY_MAP: dict[str, str] = {
    # Semiconductors / AI hardware
    "nvidia": "NVDA",
    "nvda": "NVDA",
    "advanced micro devices": "AMD",
    "amd": "AMD",
    "intel": "INTC",
    "qualcomm": "QCOM",
    "broadcom": "AVGO",
    "marvell": "MRVL",
    "marvell technology": "MRVL",
    "taiwan semiconductor": "TSM",
    "tsmc": "TSM",
    "arm holdings": "ARM",
    "arm": "ARM",
    "asml": "ASML",
    "super micro": "SMCI",
    "supermicro": "SMCI",
    "smci": "SMCI",
    # Big tech / hyperscalers
    "apple": "AAPL",
    "microsoft": "MSFT",
    "meta": "META",
    "alphabet": "GOOGL",
    "google": "GOOGL",
    "amazon": "AMZN",
    "aws": "AMZN",
    "tesla": "TSLA",
    # Cloud / AI software
    "snowflake": "SNOW",
    "palantir": "PLTR",
    "nebius": "NBIS",
    "openai": "MSFT",       # proxy — MSFT is primary public vehicle
    "databricks": None,     # not yet public; ignored
    # Networking / storage
    "arista": "ANET",
    "arista networks": "ANET",
    "pure storage": "PSTG",
    "pstg": "PSTG",
    "seagate": "STX",
    "western digital": "WDC",
    # Others commonly mentioned in GPU/AI news
    "dell": "DELL",
    "hp": "HPE",
    "hewlett packard enterprise": "HPE",
    "ibm": "IBM",
    "oracle": "ORCL",
    "samsung": "SSNLF",
    "micron": "MU",
    "micron technology": "MU",
}

# Build a single compiled regex from all keys (longest first to avoid early shadowing)
_KEYS_SORTED = sorted(_COMPANY_MAP.keys(), key=len, reverse=True)
_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in _KEYS_SORTED) + r")\b",
    re.IGNORECASE,
)


def find_tickers(text: str, base_ticker: str | None = None) -> list[str]:
    """
    Scan *text* for company-name mentions and return deduplicated ticker list.

    *base_ticker* (from the Article) is always included if present, ensuring
    the article's primary subject is never dropped.
    """
    found: set[str] = set()

    if base_ticker:
        found.add(base_ticker.upper())

    for match in _PATTERN.finditer(text):
        ticker = _COMPANY_MAP.get(match.group(0).lower())
        if ticker:
            found.add(ticker)

    return sorted(found)
