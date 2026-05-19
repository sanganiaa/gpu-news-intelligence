import re
import html

# Regex compiled once at import time for efficiency
_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_PUNCT_RE = re.compile(r"[^a-zA-Z0-9\s\-'.,!?;:()\"]")
_WHITESPACE_RE = re.compile(r"\s+")


def clean(text: str) -> str:
    """
    Return a normalised version of *text* suitable for NLP.

    Pipeline:
      1. Decode HTML entities (&amp; → &)
      2. Strip HTML tags
      3. Remove URLs
      4. Remove non-printable / non-ASCII characters
      5. Collapse runs of whitespace
      6. Strip leading / trailing whitespace
    """
    if not text:
        return ""

    text = html.unescape(text)
    text = _TAG_RE.sub(" ", text)
    text = _URL_RE.sub(" ", text)
    text = _PUNCT_RE.sub(" ", text)
    text = _WHITESPACE_RE.sub(" ", text)
    return text.strip()
