"""Shared string helpers for ETL tooling."""

from __future__ import annotations


def slugify(value: str) -> str:
    """Normalize an identifier into a snake-case-ish slug.

    Args:
        value: Raw identifier string.

    Returns:
        A lowercase, underscore-separated slug.
    """
    cleaned = []
    pending_underscore = False
    for char in value:
        if char.isalnum():
            if pending_underscore and cleaned:
                cleaned.append("_")
            cleaned.append(char.lower())
            pending_underscore = False
        else:
            pending_underscore = True
    return "".join(cleaned).strip("_")
