import spacy
from .schema import NamedEntity

_nlp = None  # loaded lazily on first use to avoid blocking import


def _get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def process(text: str) -> tuple[list[str], list[NamedEntity]]:
    """
    Run spaCy over *text* and return:
      - tokens: non-stop, non-punct, alphabetic lemmas (lowercase)
      - entities: NamedEntity list with label and char offsets

    Uses the small English model (en_core_web_sm).  The caller is responsible
    for passing already-cleaned text so entity offsets are stable.
    """
    nlp = _get_nlp()
    doc = nlp(text)

    tokens = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop
        and not token.is_punct
        and token.is_alpha
        and len(token.text) > 1
    ]

    entities = [
        NamedEntity(
            text=ent.text,
            label=ent.label_,
            start=ent.start_char,
            end=ent.end_char,
        )
        for ent in doc.ents
        if ent.label_ in {
            "ORG", "PERSON", "GPE", "PRODUCT", "NORP", "FAC", "LOC", "EVENT",
        }
    ]

    return tokens, entities
