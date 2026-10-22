from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def next_run(after: datetime, local_time: str, zone: str, days: list[int]):
    """First valid local occurrence after now; DST gaps skipped, folds run once."""
    if not days:
        return None
    tz = ZoneInfo(zone)
    start = after.astimezone(tz).date()
    hour, minute = map(int, local_time.split(":")[:2])
    for offset in range(9):
        day = start + timedelta(days=offset)
        if day.weekday() not in days:
            continue
        candidate = datetime(day.year, day.month, day.day, hour, minute, tzinfo=tz, fold=0)
        utc = candidate.astimezone(timezone.utc)
        # Round-trip rejects nonexistent spring-forward times.
        if utc.astimezone(tz).replace(tzinfo=None) != candidate.replace(tzinfo=None):
            continue
        if utc > after:
            return utc
    raise ValueError("No valid generation day found")
