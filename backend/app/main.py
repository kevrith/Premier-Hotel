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
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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
@app.get("/health")
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

async def _db_keepalive():
    """
    Ping the database every 4 minutes to prevent Supabase free-tier cold starts.
    Cold starts cause 10-15 second delays on the first query after idle.
    """
    from app.core.supabase import get_supabase_admin
    import concurrent.futures
    while True:
        await asyncio.sleep(240)  # 4 minutes
        try:
            def _ping():
                sb = get_supabase_admin()
                sb.table("users").select("id").limit(1).execute()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _ping)
            logger.debug("DB keepalive ping sent")
        except Exception as e:
            logger.warning(f"DB keepalive ping failed: {e}")


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

    # Warm up the DB connection on startup (avoids cold-start delay on first user request)
    try:
        def _warmup():
            get_supabase_admin().table("users").select("id").limit(1).execute()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _warmup)
        logger.info("✅ Database connection warmed up")
    except Exception as e:
        logger.warning(f"DB warmup failed (non-fatal): {e}")

    # Start keepalive background task
    _keepalive_task = asyncio.create_task(_db_keepalive())
    logger.info("✅ DB keepalive task started (pings every 4 min to prevent cold starts)")

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
