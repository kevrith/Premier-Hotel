"""
Premier Hotel API - FastAPI Main Application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging_config import configure_logging, logger
from app.core.supabase import get_supabase_admin
from app.api.v1.router import api_router
from app.services.email_queue_processor import start_email_queue_processor, stop_email_queue_processor
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import asyncio
from datetime import datetime, timezone

# Configure structured logging
configure_logging()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Premier Hotel Management System API with Supabase",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow configured origins + any private LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
# allow_origin_regex covers all hotel LAN devices without manual IP config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r'https?://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?',
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request size limit middleware (prevent DoS)
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """
    Limit request body size to prevent memory exhaustion attacks

    Limits:
    - Default: 10MB
    - File uploads: Handled separately with additional validation
    """
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB

    # Check Content-Length header
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_SIZE:
        return JSONResponse(
            status_code=413,
            content={
                "error": "Request Entity Too Large",
                "message": f"Request body exceeds maximum size of {MAX_REQUEST_SIZE / (1024*1024)}MB"
            }
        )

    response = await call_next(request)
    return response


# Cross-Origin-Opener-Policy middleware
# "same-origin-allow-popups" lets the Google OAuth popup communicate back
# to the opener window (required for @react-oauth/google popup flow)
@app.middleware("http")
async def set_coop_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    return response


# Request timing + tracking middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add response time header and track request metrics"""
    from app.api.v1.endpoints.system_health import request_tracker
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # Track metrics (skip health/docs endpoints)
    path = request.url.path
    if not any(p in path for p in ["/health", "/docs", "/redoc", "/openapi"]):
        request_tracker["total"] += 1
        if response.status_code >= 400:
            request_tracker["errors"] += 1
        ms = int(process_time * 1000)
        request_tracker["response_times"].append(ms)
        # Keep only last 1000 response times to avoid memory growth
        if len(request_tracker["response_times"]) > 1000:
            request_tracker["response_times"] = request_tracker["response_times"][-1000:]

    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": str(exc),
                "type": type(exc).__name__,
            },
        )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "message": "Something went wrong"},
    )


# Health check endpoint
@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to Premier Hotel API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ==================== APPLICATION LIFECYCLE ====================

_keepalive_task: asyncio.Task = None
_eod_task: asyncio.Task = None

async def _db_keepalive():
    """
    Ping the database every 3 minutes to prevent Supabase free-tier cold starts.
    Pings BOTH the regular and admin clients so all endpoints stay warm.
    """
    from app.core.supabase import get_supabase, get_supabase_admin
    while True:
        await asyncio.sleep(180)  # 3 minutes
        try:
            def _ping():
                get_supabase().table("users").select("id").limit(1).execute()
                get_supabase_admin().table("users").select("id").limit(1).execute()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _ping)
            logger.debug("DB keepalive ping sent (both clients)")
        except Exception as e:
            logger.warning(f"DB keepalive ping failed: {e}")


async def _midnight_eod_closer():
    """
    Every night at the configured business-day-start hour EAT, automatically
    mark all remaining active orders as 'served' so kitchen and waiter screens
    start the next business day clean.

    Uses the business_day_config setting (default 06:00 EAT) so that late-night
    orders (e.g. 01:00) are correctly attributed to the previous business day.
    """
    from app.core.business_day import get_business_day_start_hour, EAT_OFFSET
    from datetime import timedelta

    while True:
        try:
            supabase = get_supabase_admin()
            start_hour = get_business_day_start_hour(supabase)

            now_utc = datetime.now(timezone.utc)
            now_eat = now_utc + EAT_OFFSET

            # Next rollover = today at start_hour EAT; if already past, use tomorrow
            next_rollover_eat = now_eat.replace(
                hour=start_hour, minute=0, second=0, microsecond=0
            )
            if now_eat >= next_rollover_eat:
                next_rollover_eat += timedelta(days=1)

            next_rollover_utc = next_rollover_eat - EAT_OFFSET
            sleep_secs = (next_rollover_utc - now_utc).total_seconds()
            if sleep_secs < 0:
                sleep_secs = 0

            logger.info(
                f"[EOD] Next business-day rollover in {sleep_secs/3600:.1f}h "
                f"(at {next_rollover_eat.strftime('%H:%M')} EAT)"
            )
            await asyncio.sleep(sleep_secs)
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.error(f"[EOD] Sleep calculation failed: {e}")
            await asyncio.sleep(3600)  # retry in 1h
            continue

        # Rollover time reached — close the previous business day's active orders
        try:
            from app.core.business_day import get_business_day_range, get_business_day_date_label
            supabase = get_supabase_admin()
            # The previous business day ended at this moment — query its range
            # by going back 1 second so we're still inside the old window
            from app.core.business_day import get_business_day_start_hour, EAT_OFFSET, DEFAULT_START_HOUR
            start_hour = get_business_day_start_hour(supabase)
            # Previous window: (yesterday at start_hour EAT) → (today at start_hour EAT)
            now_utc = datetime.now(timezone.utc)
            now_eat = now_utc + EAT_OFFSET
            prev_day_eat = (now_eat - timedelta(days=1)).date()
            prev_start_eat = datetime(prev_day_eat.year, prev_day_eat.month, prev_day_eat.day, start_hour, 0, 0)
            prev_start_utc = prev_start_eat - EAT_OFFSET
            prev_end_utc   = prev_start_utc + timedelta(hours=24)

            biz_start = prev_start_utc.strftime("%Y-%m-%dT%H:%M:%S")
            biz_end   = prev_end_utc.strftime("%Y-%m-%dT%H:%M:%S")

            ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "in-progress", "ready"]
            res = supabase.table("orders").select("id").in_(
                "status", ACTIVE_STATUSES
            ).gte("created_at", biz_start).lte("created_at", biz_end).execute()

            ids = [o["id"] for o in (res.data or [])]
            if ids:
                supabase.table("orders").update({
                    "status": "served",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "notes": "[Auto-closed at business day rollover]",
                }).in_("id", ids).execute()
                logger.info(f"[EOD] Auto-closed {len(ids)} orders for business day {prev_day_eat}")
            else:
                logger.info(f"[EOD] No active orders to close for business day {prev_day_eat}")
        except Exception as e:
            logger.error(f"[EOD] Auto-close failed: {e}")


@app.on_event("startup")
async def startup():
    """Run on application startup"""
    global _keepalive_task
    logger.info(f"🚀 {settings.APP_NAME} starting up...")
    logger.info(f"📚 API Documentation: http://localhost:8000/docs")
    logger.info(f"🔗 API Version: {settings.API_V1_PREFIX}")

    # Initialize database connection pool for QuickBooks
    # TEMP: Disabled - Supabase blocks direct PostgreSQL connections from external IPs
    # QuickBooks tables exist and are accessible via Supabase client
    # await init_db()
    logger.warning("⚠️  AsyncPG pool disabled (Supabase restriction) - App fully functional with Supabase client")

    # Warm up BOTH Supabase clients on startup so the first real user request
    # doesn't hit a cold connection. Regular client handles most endpoints;
    # admin client handles reports, admin ops, etc.
    try:
        from app.core.supabase import get_supabase
        def _warmup():
            get_supabase().table("users").select("id").limit(1).execute()
            get_supabase_admin().table("users").select("id").limit(1).execute()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _warmup)
        logger.info("✅ Both Supabase clients warmed up")
    except Exception as e:
        logger.warning(f"DB warmup failed (non-fatal): {e}")

    # Start keepalive background task
    _keepalive_task = asyncio.create_task(_db_keepalive())
    logger.info("✅ DB keepalive task started (pings every 4 min to prevent cold starts)")

    # Start midnight EOD order closer
    global _eod_task
    _eod_task = asyncio.create_task(_midnight_eod_closer())
    logger.info("✅ Business-day EOD order-closer task started")

    # Catch-up: close ALL stale active orders from any past business day.
    # This handles Render sleep gaps where multiple rollovers were missed.
    try:
        from app.core.business_day import get_business_day_range, get_business_day_start_hour, EAT_OFFSET
        from datetime import timedelta
        supabase_admin_inst = get_supabase_admin()
        start_hour = get_business_day_start_hour(supabase_admin_inst)
        now_utc = datetime.now(timezone.utc)
        now_eat = now_utc + EAT_OFFSET

        # Current business day start in UTC — anything before this is a past day
        if now_eat.hour < start_hour:
            cur_biz_day_eat = now_eat.date() - timedelta(days=1)
        else:
            cur_biz_day_eat = now_eat.date()
        cur_biz_start_utc = datetime(
            cur_biz_day_eat.year, cur_biz_day_eat.month, cur_biz_day_eat.day,
            start_hour, 0, 0
        ) - EAT_OFFSET
        cutoff = cur_biz_start_utc.strftime("%Y-%m-%dT%H:%M:%S")

        ACTIVE = ["pending", "confirmed", "preparing", "in-progress", "ready"]
        # All active orders created BEFORE the current business day started
        res = supabase_admin_inst.table("orders").select("id").in_("status", ACTIVE).lt("created_at", cutoff).execute()
        ids = [o["id"] for o in (res.data or [])]
        if ids:
            supabase_admin_inst.table("orders").update({
                "status": "served",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "notes": "[Auto-closed on startup catch-up]",
            }).in_("id", ids).execute()
            logger.info(f"[EOD-CATCHUP] Closed {len(ids)} stale orders from previous business days")
        else:
            logger.info("[EOD-CATCHUP] No stale orders to close")
    except Exception as e:
        logger.warning(f"[EOD-CATCHUP] Startup catch-up failed (non-fatal): {e}")

    try:
        # Start automatic email queue processor
        supabase = get_supabase_admin()
        await start_email_queue_processor(supabase)
        logger.info("✅ Email queue processor started (auto-sends emails every 30s)")

    except Exception as e:
        logger.error(f"❌ Error starting email queue processor: {str(e)}")


@app.on_event("shutdown")
async def shutdown():
    """Run on application shutdown"""
    global _keepalive_task
    if _keepalive_task:
        _keepalive_task.cancel()
    if _eod_task:
        _eod_task.cancel()
    logger.info(f"🛑 {settings.APP_NAME} shutting down...")

    try:
        # Stop email queue processor
        await stop_email_queue_processor()
        logger.info("Email queue processor stopped")

    except Exception as e:
        logger.error(f"Error stopping email queue processor: {str(e)}")

    # Close database connection pool
    await close_db()

    logger.info("👋 Shutdown complete")
