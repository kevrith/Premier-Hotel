"""
Premier Hotel API - FastAPI Main Application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1.router import api_router
import time

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Premier Hotel Management System API with Supabase",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add response time header to all requests"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
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


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print(f"🚀 {settings.APP_NAME} starting up...")
    print(f"📚 API Documentation: http://localhost:8000/docs")
    print(f"🔗 API Version: {settings.API_V1_PREFIX}")

    # Initialize database connection pool for QuickBooks
    # TEMP: Disabled - Supabase blocks direct PostgreSQL connections from external IPs
    # QuickBooks tables exist and are accessible via Supabase client
    # await init_db()
    print("⚠️  AsyncPG pool disabled (Supabase restriction) - App fully functional with Supabase client")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    print(f"👋 {settings.APP_NAME} shutting down...")

    # Close database connection pool
    await close_db()
