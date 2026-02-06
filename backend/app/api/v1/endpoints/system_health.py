from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from datetime import datetime, timedelta
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user
from pydantic import BaseModel
import psutil
import time
import httpx
import smtplib
import os

import os

router = APIRouter()

# Environment-based thresholds
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"
CPU_WARNING_THRESHOLD = 85 if IS_PRODUCTION else 90
MEMORY_WARNING_THRESHOLD = 85 if IS_PRODUCTION else 90
CPU_CRITICAL_THRESHOLD = 95 if IS_PRODUCTION else 98
MEMORY_CRITICAL_THRESHOLD = 95 if IS_PRODUCTION else 98
DB_WARNING_THRESHOLD = 300 if IS_PRODUCTION else 500
DB_CRITICAL_THRESHOLD = 800 if IS_PRODUCTION else 1000

class SystemComponent(BaseModel):
    id: str
    name: str
    status: str
    uptime: float
    lastCheck: str
    responseTime: int

class SystemMetrics(BaseModel):
    activeUsers: int
    totalRequests: int
    errorRate: float
    averageResponseTime: int
    systemUptime: float

# Store for tracking requests (in production, use Redis)
request_tracker = {
    "total": 0,
    "errors": 0,
    "response_times": [],
    "start_time": time.time()
}

@router.get("/components", response_model=List[SystemComponent])
async def get_system_components(
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Get status of all system components"""
    if current_user.get("role") not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    components = []
    
    # Database health - use faster query
    try:
        start = time.time()
        supabase_admin.rpc('ping').execute()  # Faster than table query
        db_response_time = int((time.time() - start) * 1000)
        
        db_status = "healthy"
        if db_response_time > DB_WARNING_THRESHOLD:
            db_status = "warning"
        if db_response_time > DB_CRITICAL_THRESHOLD:
            db_status = "critical"
        
        components.append(SystemComponent(
            id="database",
            name="Database",
            status=db_status,
            uptime=99.9,
            lastCheck=datetime.now().isoformat(),
            responseTime=db_response_time
        ))
    except:
        # Fallback to simple query if ping fails
        try:
            start = time.time()
            supabase_admin.table("profiles").select("id").limit(1).execute()
            db_response_time = int((time.time() - start) * 1000)
            
            db_status = "healthy"
            if db_response_time > DB_WARNING_THRESHOLD:
                db_status = "warning"
            if db_response_time > DB_CRITICAL_THRESHOLD:
                db_status = "critical"
            
            components.append(SystemComponent(
                id="database",
                name="Database",
                status=db_status,
                uptime=99.9,
                lastCheck=datetime.now().isoformat(),
                responseTime=db_response_time
            ))
        except:
            components.append(SystemComponent(
                id="database",
                name="Database",
                status="critical",
                uptime=0,
                lastCheck=datetime.now().isoformat(),
                responseTime=0
            ))
    
    # API Server health - use cached CPU reading
    cpu_percent = psutil.cpu_percent(interval=0)
    memory_percent = psutil.virtual_memory().percent
    
    api_status = "healthy"
    if cpu_percent > CPU_WARNING_THRESHOLD or memory_percent > MEMORY_WARNING_THRESHOLD:
        api_status = "warning"
    if cpu_percent > CPU_CRITICAL_THRESHOLD or memory_percent > MEMORY_CRITICAL_THRESHOLD:
        api_status = "critical"
    
    components.append(SystemComponent(
        id="api-server",
        name="API Server",
        status=api_status,
        uptime=99.8,
        lastCheck=datetime.now().isoformat(),
        responseTime=50
    ))
    
    # Payment Gateway - test M-Pesa API
    try:
        start = time.time()
        mpesa_env = os.getenv("MPESA_ENVIRONMENT", "sandbox")
        if mpesa_env == "sandbox":
            test_url = "https://sandbox.safaricom.co.ke"
        else:
            test_url = "https://api.safaricom.co.ke"
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(test_url)
        
        payment_response_time = int((time.time() - start) * 1000)
        payment_status = "healthy" if payment_response_time < 1000 else "warning"
        
        components.append(SystemComponent(
            id="payment-gateway",
            name="Payment Gateway",
            status=payment_status,
            uptime=99.5,
            lastCheck=datetime.now().isoformat(),
            responseTime=payment_response_time
        ))
    except:
        components.append(SystemComponent(
            id="payment-gateway",
            name="Payment Gateway",
            status="warning",
            uptime=99.5,
            lastCheck=datetime.now().isoformat(),
            responseTime=0
        ))
    
    # Email Service - test SMTP connection
    try:
        start = time.time()
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        
        with smtplib.SMTP(smtp_server, smtp_port, timeout=5) as server:
            server.ehlo()
        
        email_response_time = int((time.time() - start) * 1000)
        email_status = "healthy" if email_response_time < 2000 else "warning"
        
        components.append(SystemComponent(
            id="email-service",
            name="Email Service",
            status=email_status,
            uptime=98.2,
            lastCheck=datetime.now().isoformat(),
            responseTime=email_response_time
        ))
    except:
        components.append(SystemComponent(
            id="email-service",
            name="Email Service",
            status="warning",
            uptime=98.2,
            lastCheck=datetime.now().isoformat(),
            responseTime=0
        ))
    
    # File Storage - test Supabase Storage
    try:
        start = time.time()
        # List buckets to test storage connection
        supabase_admin.storage.list_buckets()
        storage_response_time = int((time.time() - start) * 1000)
        storage_status = "healthy" if storage_response_time < 1000 else "warning"
        
        components.append(SystemComponent(
            id="file-storage",
            name="File Storage",
            status=storage_status,
            uptime=99.9,
            lastCheck=datetime.now().isoformat(),
            responseTime=storage_response_time
        ))
    except:
        components.append(SystemComponent(
            id="file-storage",
            name="File Storage",
            status="warning",
            uptime=99.9,
            lastCheck=datetime.now().isoformat(),
            responseTime=0
        ))
    
    return components

@router.get("/metrics", response_model=SystemMetrics)
async def get_system_metrics(
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Get system performance metrics"""
    if current_user.get("role") not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Use count query instead of fetching all data
        active_users_result = supabase_admin.table("profiles").select("*", count="exact").limit(0).execute()
        active_users = active_users_result.count if hasattr(active_users_result, 'count') else 0
    except:
        active_users = 0
    
    total_requests = request_tracker["total"] or 1
    error_rate = (request_tracker["errors"] / total_requests) * 100 if total_requests > 0 else 0
    
    response_times = request_tracker["response_times"]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 185
    
    uptime_percent = 99.8
    
    return SystemMetrics(
        activeUsers=active_users,
        totalRequests=total_requests,
        errorRate=round(error_rate, 2),
        averageResponseTime=int(avg_response_time),
        systemUptime=uptime_percent
    )

@router.get("/status")
async def get_system_status(
    current_user: dict = Depends(get_current_user)
):
    """Get overall system status"""
    if current_user.get("role") not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cpu = psutil.cpu_percent(interval=0)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cpu_percent": cpu,
        "memory_percent": memory.percent,
        "memory_available_gb": round(memory.available / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_free_gb": round(disk.free / (1024**3), 2)
    }
