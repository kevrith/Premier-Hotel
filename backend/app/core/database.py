"""
Database Connection Pool for QuickBooks Integration

Provides asyncpg connection pool for QuickBooks sync operations.
Uses environment variables for database configuration.
"""

import asyncpg
import os
from typing import Optional
from functools import lru_cache


class DatabasePool:
    """Singleton database connection pool manager."""

    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        """
        Get or create the connection pool.

        Returns:
            asyncpg.Pool: Database connection pool
        """
        if cls._pool is None:
            # Get database credentials from environment
            database_url = os.getenv(
                'DATABASE_URL',
                'postgresql://postgres:postgres@localhost:5432/premier_hotel'
            )

            # Create connection pool with SSL for Supabase
            cls._pool = await asyncpg.create_pool(
                database_url,
                min_size=5,
                max_size=20,
                command_timeout=60,
                ssl='require',  # Required for Supabase connections
            )

        return cls._pool

    @classmethod
    async def close_pool(cls):
        """Close the connection pool."""
        if cls._pool is not None:
            await cls._pool.close()
            cls._pool = None


async def get_db_pool() -> Optional[asyncpg.Pool]:
    """
    Dependency for FastAPI endpoints to get database pool.

    Returns None if pool cannot be created (e.g., Supabase blocks direct connections).

    Usage:
        @app.get("/endpoint")
        async def endpoint(db_pool: Optional[asyncpg.Pool] = Depends(get_db_pool)):
            if db_pool:
                async with db_pool.acquire() as conn:
                    result = await conn.fetchrow("SELECT * FROM table")

    Returns:
        Optional[asyncpg.Pool]: Database connection pool or None
    """
    try:
        return await DatabasePool.get_pool()
    except Exception as e:
        # Supabase blocks direct PostgreSQL connections from external IPs
        print(f"[WARNING] Database pool unavailable: {e}")
        return None


async def init_db():
    """Initialize database connection pool on startup."""
    await DatabasePool.get_pool()
    print("✓ Database connection pool initialized")


async def close_db():
    """Close database connection pool on shutdown."""
    await DatabasePool.close_pool()
    print("✓ Database connection pool closed")
