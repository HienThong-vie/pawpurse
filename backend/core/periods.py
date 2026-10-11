from datetime import date, timedelta


def period_bounds(period: str, today: date) -> tuple[date, date]:
    """Return [start, end) of the budget period containing `today`."""
    if period in ("week", "weekly"):
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=7)
    if period in ("month", "monthly"):
        start = today.replace(day=1)
        if start.month == 12:
            return start, start.replace(year=start.year + 1, month=1)
        return start, start.replace(month=start.month + 1)
    # "day" / "daily" and any unknown legacy value
    return today, today + timedelta(days=1)


def previous_period_bounds(period: str, today: date) -> tuple[date, date]:
    """Return [start, end) of the period immediately before the one containing `today`."""
    current_start, _ = period_bounds(period, today)
    return period_bounds(period, current_start - timedelta(days=1))
