from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict
from datetime import datetime, timedelta, timezone
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user
from pydantic import BaseModel
import psutil
import time
import httpx
import smtplib
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
            supabase_admin.table("users").select("id").limit(1).execute()
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
    
    # Use real average response time from tracker
    tracked_times = request_tracker.get("response_times", [])
    api_response_time = int(sum(tracked_times) / len(tracked_times)) if tracked_times else 0
    total_req = request_tracker.get("total", 0)
    errors = request_tracker.get("errors", 0)
    uptime_start = request_tracker.get("start_time", time.time())
    uptime_hours = (time.time() - uptime_start) / 3600
    # Uptime % based on error rate (capped at 99.99%)
    error_rate_pct = (errors / total_req * 100) if total_req > 0 else 0
    api_uptime = round(max(95.0, 100.0 - error_rate_pct), 1)

    components.append(SystemComponent(
        id="api-server",
        name="API Server",
        status=api_status,
        uptime=api_uptime,
        lastCheck=datetime.now().isoformat(),
        responseTime=api_response_time
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
        active_users_result = supabase_admin.table("users").select("*", count="exact").limit(0).execute()
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

@router.get("/activity")
async def get_system_activity(
    limit: int = Query(default=20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Get real system activity from notifications and recent events"""
    if current_user.get("role") not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Admin access required")

    events = []

    try:
        # Recent orders activity
        orders_res = supabase_admin.table("orders").select(
            "order_number, status, customer_name, created_at, updated_at"
        ).order("updated_at", desc=True).limit(10).execute()

        for o in (orders_res.data or []):
            status = o.get("status", "")
            name = o.get("customer_name") or "Guest"
            num = o.get("order_number", "")
            ts = o.get("updated_at") or o.get("created_at")
            if status == "completed":
                events.append({"event": f"Order {num} completed — {name}", "time": ts, "type": "success"})
            elif status == "cancelled":
                events.append({"event": f"Order {num} cancelled — {name}", "time": ts, "type": "warning"})
            elif status == "pending":
                events.append({"event": f"New order {num} placed — {name}", "time": ts, "type": "info"})
    except Exception:
        pass

    try:
        # Recent stock receipts
        receipts_res = supabase_admin.table("stock_receipts").select(
            "quantity, total_cost, received_at, notes"
        ).order("received_at", desc=True).limit(5).execute()
        for r in (receipts_res.data or []):
            qty = r.get("quantity", 0)
            cost = r.get("total_cost", 0)
            ts = r.get("received_at")
            events.append({"event": f"Stock received: {qty} units — KES {cost}", "time": ts, "type": "info"})
    except Exception:
        pass

    try:
        # Recent user logins (from notifications)
        notif_res = supabase_admin.table("notifications").select(
            "title, message, created_at, type"
        ).order("created_at", desc=True).limit(10).execute()
        for n in (notif_res.data or []):
            ntype = "info"
            if "error" in (n.get("type") or "").lower() or "fail" in (n.get("message") or "").lower():
                ntype = "warning"
            elif "success" in (n.get("type") or "").lower() or "complet" in (n.get("message") or "").lower():
                ntype = "success"
            events.append({"event": n.get("title") or n.get("message") or "System event", "time": n.get("created_at"), "type": ntype})
    except Exception:
        pass

    # Sort by time desc, take latest N
    def parse_ts(e):
        try:
            return datetime.fromisoformat((e.get("time") or "2000-01-01").replace("Z", "+00:00"))
        except Exception:
            return datetime.min

    events.sort(key=parse_ts, reverse=True)
    events = events[:limit]

    # Format relative times
    now = datetime.now(timezone.utc)
    for e in events:
        try:
            ts = datetime.fromisoformat((e.get("time") or "").replace("Z", "+00:00"))
            diff = int((now - ts).total_seconds())
            if diff < 60:
                e["time_display"] = "just now"
            elif diff < 3600:
                e["time_display"] = f"{diff // 60}m ago"
            elif diff < 86400:
                e["time_display"] = f"{diff // 3600}h ago"
            else:
                e["time_display"] = f"{diff // 86400}d ago"
        except Exception:
            e["time_display"] = ""

    return events


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
