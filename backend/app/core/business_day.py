"""
Business Day Utilities
======================
Enterprise hotels operate past midnight. A "business day" starts at a
configurable hour (default 06:00 EAT) rather than calendar midnight.

  - Orders placed at 01:00 on Tuesday belong to Monday's business day
    when business_day_start_hour = 6.
  - All "today" queries should use get_business_day_range() instead of
    raw calendar date boundaries.

Usage:
    from app.core.business_day import get_business_day_range, get_business_day_start_hour

    start_iso, end_iso = get_business_day_range(supabase_admin)
    query.gte("created_at", start_iso).lte("created_at", end_iso)
"""

from datetime import datetime, timedelta, timezone
from typing import Tuple

# EAT = UTC+3
EAT_OFFSET = timedelta(hours=3)
DEFAULT_START_HOUR = 6  # 06:00 EAT


def get_business_day_start_hour(supabase_admin) -> int:
    """
    Read business_day_start_hour from hotel_settings.
    Falls back to DEFAULT_START_HOUR (6) on any error.
    """
    try:
        res = (
            supabase_admin.table("hotel_settings")
            .select("setting_value")
            .eq("setting_key", "business_day_config")
            .execute()
        )
        if res.data:
            val = res.data[0]["setting_value"]
            hour = int(val.get("start_hour", DEFAULT_START_HOUR))
            return max(0, min(23, hour))
    except Exception:
        pass
    return DEFAULT_START_HOUR


def get_business_day_range(supabase_admin=None, start_hour: int = None) -> Tuple[str, str]:
    """
    Return (start_iso, end_iso) for the current business day in UTC.

    The business day runs from start_hour EAT today to start_hour EAT tomorrow.
    If the current EAT time is before start_hour, we are still in yesterday's
    business day.

    Example with start_hour=6:
      - 2025-04-10 02:00 EAT  →  business day is 2025-04-09 06:00 – 2025-04-10 05:59 EAT
      - 2025-04-10 08:00 EAT  →  business day is 2025-04-10 06:00 – 2025-04-11 05:59 EAT
    """
    if start_hour is None:
        if supabase_admin is not None:
            start_hour = get_business_day_start_hour(supabase_admin)
        else:
            start_hour = DEFAULT_START_HOUR

    now_utc = datetime.now(timezone.utc)
    now_eat = now_utc + EAT_OFFSET

    # If current EAT hour is before start_hour, we're still in yesterday's business day
    if now_eat.hour < start_hour:
        biz_day_eat = now_eat.date() - timedelta(days=1)
    else:
        biz_day_eat = now_eat.date()

    # Business day start: biz_day_eat at start_hour EAT → convert to UTC
    biz_start_eat = datetime(
        biz_day_eat.year, biz_day_eat.month, biz_day_eat.day,
        start_hour, 0, 0
    )
    biz_start_utc = biz_start_eat - EAT_OFFSET

    # Business day end: exactly 24 hours later (exclusive upper bound)
    biz_end_utc = biz_start_utc + timedelta(hours=24)

    return (
        biz_start_utc.strftime("%Y-%m-%dT%H:%M:%S"),
        biz_end_utc.strftime("%Y-%m-%dT%H:%M:%S"),
    )


def get_business_day_range_for_date(stock_date_str: str, start_hour: int) -> tuple:
    """
    Return (start_iso, end_iso) in UTC for a *specific* stock_date string (YYYY-MM-DD).

    The business day for stock_date runs from:
      stock_date at start_hour EAT  →  (stock_date + 1 day) at start_hour EAT

    This is used by the stock sheet to correctly match orders to a business day
    rather than using midnight calendar boundaries.
    """
    from datetime import date as _date
    d = _date.fromisoformat(stock_date_str)
    biz_start_eat = datetime(d.year, d.month, d.day, start_hour, 0, 0)
    biz_start_utc = biz_start_eat - EAT_OFFSET
    biz_end_utc = biz_start_utc + timedelta(hours=24)
    return (
        biz_start_utc.strftime("%Y-%m-%dT%H:%M:%S"),
        biz_end_utc.strftime("%Y-%m-%dT%H:%M:%S"),
    )


def get_business_date_label(supabase_admin=None, start_hour: int = None) -> str:
    """
    Return the current business date as YYYY-MM-DD (EAT local date of the
    business day start), useful for display and logging.
    """
    if start_hour is None:
        if supabase_admin is not None:
            start_hour = get_business_day_start_hour(supabase_admin)
        else:
            start_hour = DEFAULT_START_HOUR

    now_eat = datetime.now(timezone.utc) + EAT_OFFSET
    if now_eat.hour < start_hour:
        return (now_eat.date() - timedelta(days=1)).isoformat()
    return now_eat.date().isoformat()
