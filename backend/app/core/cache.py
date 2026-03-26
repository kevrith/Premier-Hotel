"""
Simple in-memory TTL cache for expensive API endpoints.
No external dependencies — uses a plain dict + timestamps.
"""
import time
import hashlib
import json
from typing import Any, Optional

_store: dict[str, tuple[float, Any]] = {}   # key → (expires_at, value)


def _make_key(namespace: str, **kwargs) -> str:
    payload = json.dumps(kwargs, sort_keys=True, default=str)
    h = hashlib.md5(payload.encode()).hexdigest()[:12]
    return f"{namespace}:{h}"


def cache_get(namespace: str, **kwargs) -> Optional[Any]:
    key = _make_key(namespace, **kwargs)
    entry = _store.get(key)
    if entry and entry[0] > time.time():
        return entry[1]
    # Expired or missing
    if key in _store:
        del _store[key]
    return None


def cache_set(namespace: str, value: Any, ttl: int = 300, **kwargs) -> None:
    """Store value for `ttl` seconds (default 5 min)."""
    key = _make_key(namespace, **kwargs)
    _store[key] = (time.time() + ttl, value)


def cache_invalidate(namespace: str) -> int:
    """Remove all entries for a namespace. Returns count removed."""
    keys = [k for k in _store if k.startswith(f"{namespace}:")]
    for k in keys:
        del _store[k]
    return len(keys)


def cache_stats() -> dict:
    now = time.time()
    live = sum(1 for exp, _ in _store.values() if exp > now)
    return {"total_entries": len(_store), "live_entries": live}
