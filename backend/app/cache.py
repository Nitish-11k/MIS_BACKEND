"""
Dummy caching layer for the Banking MIS API.

Cache and Redis have been disabled as per request.
"""

from typing import Any, Callable, Optional


class CacheManager:
    """
    Dummy cache manager that doesn't cache anything.
    """

    # Default TTL values for different data types (in seconds)
    TTL_SHORT = 300      # 5 minutes
    TTL_MEDIUM = 900     # 15 minutes
    TTL_LONG = 3600      # 1 hour

    def __init__(self):
        print("[CACHE] Caching is disabled")

    def _make_key(self, prefix: str, **params) -> str:
        """Generate a deterministic cache key from prefix and parameters."""
        sorted_params = sorted(params.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        if param_str:
            return f"mis:{prefix}:{param_str}"
        return f"mis:{prefix}"

    def get(self, key: str) -> Optional[Any]:
        """Always return None to simulate cache miss."""
        return None

    def set(self, key: str, value: Any, ttl: int = 900):
        """Do nothing."""
        pass

    def get_or_set(self, key: str, fetch_func: Callable, ttl: int = 900) -> Any:
        """Always compute the value and never cache it."""
        return fetch_func()

    def delete(self, key: str):
        pass

    def delete_pattern(self, pattern: str):
        pass

    def invalidate_endpoint(self, endpoint: str):
        pass

    def invalidate_all(self):
        pass

    def stats(self) -> dict:
        return {
            "backend": "disabled",
            "hits": 0,
            "misses": 0,
            "hit_rate": "0.0%",
            "memory_stats": {},
        }


# Singleton instance
cache_manager = CacheManager()
