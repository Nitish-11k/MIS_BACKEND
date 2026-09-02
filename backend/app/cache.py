"""
Hybrid caching layer for the Banking MIS API.

Tries Redis first (if REDIS_URL is set and server is reachable).
Falls back to a thread-safe in-memory TTL cache.

Usage:
    from app.cache import cache_manager

    # Get cached data or compute it
    data = cache_manager.get_or_set("kpi:ALL:30D", fetch_function, ttl=900)

    # Invalidate specific key
    cache_manager.delete("kpi:ALL:30D")

    # Invalidate by pattern/prefix
    cache_manager.delete_pattern("kpi:*")
"""

import os
import json
import time
import threading
import hashlib
from typing import Any, Callable, Optional


class InMemoryTTLCache:
    """Thread-safe in-memory cache with TTL expiration."""

    def __init__(self):
        self._store: dict = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if time.time() > entry["expires_at"]:
                del self._store[key]
                return None
            return entry["value"]

    def set(self, key: str, value: Any, ttl: int = 900):
        with self._lock:
            self._store[key] = {
                "value": value,
                "expires_at": time.time() + ttl,
            }

    def delete(self, key: str):
        with self._lock:
            self._store.pop(key, None)

    def delete_pattern(self, pattern: str):
        """Delete all keys matching a prefix pattern (e.g. 'kpi:*')."""
        prefix = pattern.rstrip("*")
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]

    def clear(self):
        with self._lock:
            self._store.clear()

    def cleanup_expired(self):
        """Remove all expired entries."""
        now = time.time()
        with self._lock:
            expired = [k for k, v in self._store.items() if now > v["expires_at"]]
            for k in expired:
                del self._store[k]

    def stats(self) -> dict:
        with self._lock:
            now = time.time()
            total = len(self._store)
            active = sum(1 for v in self._store.values() if now <= v["expires_at"])
            return {"total_keys": total, "active_keys": active, "expired_keys": total - active}


class RedisCacheWrapper:
    """Wrapper around the redis client for consistent interface."""

    def __init__(self, redis_url: str):
        try:
            import redis
            self._client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
            self._client.ping()
            self._available = True
            print(f"[CACHE] Redis connected at {redis_url}")
        except Exception as e:
            self._available = False
            self._client = None
            print(f"[CACHE] Redis not available ({e}), using in-memory cache")

    @property
    def available(self) -> bool:
        return self._available

    def get(self, key: str) -> Optional[Any]:
        if not self._available:
            return None
        try:
            raw = self._client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            return None

    def set(self, key: str, value: Any, ttl: int = 900):
        if not self._available:
            return
        try:
            self._client.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass

    def delete(self, key: str):
        if not self._available:
            return
        try:
            self._client.delete(key)
        except Exception:
            pass

    def delete_pattern(self, pattern: str):
        if not self._available:
            return
        try:
            cursor = 0
            while True:
                cursor, keys = self._client.scan(cursor, match=pattern, count=100)
                if keys:
                    self._client.delete(*keys)
                if cursor == 0:
                    break
        except Exception:
            pass

    def clear(self):
        if not self._available:
            return
        try:
            self._client.flushdb()
        except Exception:
            pass


class CacheManager:
    """
    Hybrid cache manager.
    Uses Redis if available, otherwise falls back to in-memory TTL cache.
    """

    # Default TTL values for different data types (in seconds)
    TTL_SHORT = 300      # 5 minutes  - for frequently changing data
    TTL_MEDIUM = 900     # 15 minutes - for dashboard summaries
    TTL_LONG = 3600      # 1 hour     - for rarely changing data

    def __init__(self):
        self._memory = InMemoryTTLCache()
        redis_url = os.getenv("REDIS_URL", "")
        if redis_url:
            self._redis = RedisCacheWrapper(redis_url)
        else:
            self._redis = RedisCacheWrapper("redis://localhost:6379/0")

        self._use_redis = self._redis.available
        self._hit_count = 0
        self._miss_count = 0
        self._lock = threading.Lock()

        if self._use_redis:
            print("[CACHE] Using Redis as primary cache")
        else:
            print("[CACHE] Using in-memory TTL cache (Redis not available)")

    def _make_key(self, prefix: str, **params) -> str:
        """Generate a deterministic cache key from prefix and parameters."""
        # Sort params for consistent key generation
        sorted_params = sorted(params.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        if param_str:
            return f"mis:{prefix}:{param_str}"
        return f"mis:{prefix}"

    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        # Try Redis first
        if self._use_redis:
            val = self._redis.get(key)
            if val is not None:
                with self._lock:
                    self._hit_count += 1
                return val

        # Fall back to in-memory
        val = self._memory.get(key)
        if val is not None:
            with self._lock:
                self._hit_count += 1
            return val

        with self._lock:
            self._miss_count += 1
        return None

    def set(self, key: str, value: Any, ttl: int = 900):
        """Set a value in cache."""
        # Always set in memory for fast access
        self._memory.set(key, value, ttl)

        # Also set in Redis if available
        if self._use_redis:
            self._redis.set(key, value, ttl)

    def get_or_set(self, key: str, fetch_func: Callable, ttl: int = 900) -> Any:
        """
        Get from cache or compute and cache the result.
        This is the primary method for caching API responses.
        """
        cached = self.get(key)
        if cached is not None:
            return cached

        # Compute the value
        value = fetch_func()

        # Cache it
        self.set(key, value, ttl)
        return value

    def delete(self, key: str):
        """Delete a specific key from all cache layers."""
        self._memory.delete(key)
        if self._use_redis:
            self._redis.delete(key)

    def delete_pattern(self, pattern: str):
        """Delete keys matching a pattern from all cache layers."""
        self._memory.delete_pattern(pattern)
        if self._use_redis:
            self._redis.delete_pattern(pattern)

    def invalidate_endpoint(self, endpoint: str):
        """Invalidate all cached data for a specific API endpoint."""
        self.delete_pattern(f"mis:{endpoint}:*")

    def invalidate_all(self):
        """Clear all cached data."""
        self._memory.clear()
        if self._use_redis:
            self._redis.clear()
        print("[CACHE] All cache cleared")

    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total = self._hit_count + self._miss_count
            hit_rate = (self._hit_count / total * 100) if total > 0 else 0
            return {
                "backend": "redis" if self._use_redis else "in-memory",
                "hits": self._hit_count,
                "misses": self._miss_count,
                "hit_rate": f"{hit_rate:.1f}%",
                "memory_stats": self._memory.stats(),
            }


# Singleton instance
cache_manager = CacheManager()
