"""Pagination helpers shared across services."""

import math


def calculate_pages(total: int, page_size: int) -> int:
    """Calculate total number of pages.

    Args:
        total: Total number of items.
        page_size: Items per page.

    Returns:
        int: Total number of pages.
    """
    if page_size <= 0:
        return 1
    return math.ceil(total / page_size) if total > 0 else 1
