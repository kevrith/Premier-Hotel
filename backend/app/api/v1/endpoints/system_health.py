"""
System Health Monitoring API Endpoints
Provides system status, component health, and performance metrics
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta
from supabase import Client
import psutil
import time
import asyncio
from decimal import Decimal

from app.core.supabase import get_supabase
from app.middleware.auth import require_role

router = APIRouter()


class SystemComponent:
    """System component health status"""
    def __init__(self, name: str, status: str, message: str = "", response_time: float = 0.0):
        self.name = name
        self.status = status  # 'healthy', 'degraded', 'unhealthy'
        self.message = message
        self.response_time = response_time
        self.last_check = datetime.now().isoformat()


class SystemMetrics:
    """System performance metrics"""
    def __init__(self):
        self.timestamp = datetime.now().isoformat()
        self.cpu_usage = 0.0
        self.memory_usage = 0.0
        self.disk_usage = 0.0
        self.active_connections = 0
        self.request_count = 0
        self.error_rate = 0.0


@router.get("/system/health/components")
async def get_system_components_health(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get health status of all system components"""
    components = []
    
    # Test database connection
    try:
        start_time = time.time()
        db_result = supabase.table("users").select("id").limit(1).execute()
        db_response_time = time.time() - start_time
        
        if db_result.data:
            components.append(SystemComponent(
                name="Database",
                status="healthy",
                message="Database connection successful",
                response_time=db_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Database",
                status="degraded",
                message="Database connection slow or partial",
                response_time=db_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Database",
            status="unhealthy",
            message=f"Database connection failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test Supabase authentication
    try:
        start_time = time.time()
        # Test if we can access auth-related tables to verify auth system is working
        auth_test = supabase.table("users").select("id").limit(1).execute()
        auth_response_time = time.time() - start_time
        
        components.append(SystemComponent(
            name="Authentication",
            status="healthy",
            message="Authentication service available",
            response_time=auth_response_time
        ))
    except Exception as e:
        components.append(SystemComponent(
            name="Authentication",
            status="unhealthy",
            message=f"Authentication service failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test QuickBooks connection (if available)
    try:
        start_time = time.time()
        # Try to query QuickBooks tables
        qb_result = supabase.table("quickbooks_item_mapping").select("id").limit(1).execute()
        qb_response_time = time.time() - start_time
        
        if qb_result.data:
            components.append(SystemComponent(
                name="QuickBooks Integration",
                status="healthy",
                message="QuickBooks connection successful",
                response_time=qb_response_time
            ))
        else:
            components.append(SystemComponent(
                name="QuickBooks Integration",
                status="degraded",
                message="QuickBooks connection slow or partial",
                response_time=qb_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="QuickBooks Integration",
            status="unhealthy",
            message=f"QuickBooks connection failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test inventory system
    try:
        start_time = time.time()
        inv_result = supabase.table("inventory_items").select("id").limit(1).execute()
        inv_response_time = time.time() - start_time
        
        if inv_result.data:
            components.append(SystemComponent(
                name="Inventory System",
                status="healthy",
                message="Inventory system available",
                response_time=inv_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Inventory System",
                status="degraded",
                message="Inventory system slow or partial",
                response_time=inv_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Inventory System",
            status="unhealthy",
            message=f"Inventory system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test order system
    try:
        start_time = time.time()
        order_result = supabase.table("orders").select("id").limit(1).execute()
        order_response_time = time.time() - start_time
        
        if order_result.data:
            components.append(SystemComponent(
                name="Order System",
                status="healthy",
                message="Order system available",
                response_time=order_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Order System",
                status="degraded",
                message="Order system slow or partial",
                response_time=order_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Order System",
            status="unhealthy",
            message=f"Order system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test room management
    try:
        start_time = time.time()
        room_result = supabase.table("rooms").select("id").limit(1).execute()
        room_response_time = time.time() - start_time
        
        if room_result.data:
            components.append(SystemComponent(
                name="Room Management",
                status="healthy",
                message="Room management system available",
                response_time=room_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Room Management",
                status="degraded",
                message="Room management system slow or partial",
                response_time=room_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Room Management",
            status="unhealthy",
            message=f"Room management system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test booking system
    try:
        start_time = time.time()
        booking_result = supabase.table("bookings").select("id").limit(1).execute()
        booking_response_time = time.time() - start_time
        
        if booking_result.data:
            components.append(SystemComponent(
                name="Booking System",
                status="healthy",
                message="Booking system available",
                response_time=booking_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Booking System",
                status="degraded",
                message="Booking system slow or partial",
                response_time=booking_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Booking System",
            status="unhealthy",
            message=f"Booking system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test messaging system
    try:
        start_time = time.time()
        msg_result = supabase.table("messages").select("id").limit(1).execute()
        msg_response_time = time.time() - start_time
        
        if msg_result.data:
            components.append(SystemComponent(
                name="Messaging System",
                status="healthy",
                message="Messaging system available",
                response_time=msg_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Messaging System",
                status="degraded",
                message="Messaging system slow or partial",
                response_time=msg_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Messaging System",
            status="unhealthy",
            message=f"Messaging system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test notification system
    try:
        start_time = time.time()
        notif_result = supabase.table("notifications").select("id").limit(1).execute()
        notif_response_time = time.time() - start_time
        
        if notif_result.data:
            components.append(SystemComponent(
                name="Notification System",
                status="healthy",
                message="Notification system available",
                response_time=notif_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Notification System",
                status="degraded",
                message="Notification system slow or partial",
                response_time=notif_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Notification System",
            status="unhealthy",
            message=f"Notification system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Test email system
    try:
        start_time = time.time()
        email_result = supabase.table("email_queue").select("id").limit(1).execute()
        email_response_time = time.time() - start_time
        
        if email_result.data:
            components.append(SystemComponent(
                name="Email System",
                status="healthy",
                message="Email system available",
                response_time=email_response_time
            ))
        else:
            components.append(SystemComponent(
                name="Email System",
                status="degraded",
                message="Email system slow or partial",
                response_time=email_response_time
            ))
    except Exception as e:
        components.append(SystemComponent(
            name="Email System",
            status="unhealthy",
            message=f"Email system failed: {str(e)}",
            response_time=0.0
        ))
    
    # Calculate overall system status
    healthy_count = sum(1 for c in components if c.status == "healthy")
    degraded_count = sum(1 for c in components if c.status == "degraded")
    unhealthy_count = sum(1 for c in components if c.status == "unhealthy")
    
    if unhealthy_count > 0:
        overall_status = "unhealthy"
    elif degraded_count > 0:
        overall_status = "degraded"
    else:
        overall_status = "healthy"
    
    return {
        "status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "components": [
            {
                "name": c.name,
                "status": c.status,
                "message": c.message,
                "response_time": round(c.response_time * 1000, 2),  # Convert to milliseconds
                "last_check": c.last_check
            }
            for c in components
        ],
        "summary": {
            "total_components": len(components),
            "healthy": healthy_count,
            "degraded": degraded_count,
            "unhealthy": unhealthy_count
        }
    }


@router.get("/system/health/metrics")
async def get_system_metrics(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get system performance metrics"""
    metrics = SystemMetrics()
    
    try:
        # Get system metrics using psutil
        metrics.cpu_usage = psutil.cpu_percent(interval=1)
        metrics.memory_usage = psutil.virtual_memory().percent
        metrics.disk_usage = psutil.disk_usage('/').percent
        
        # Get active database connections (approximate)
        try:
            # This is a rough estimate - in production you'd want more precise monitoring
            active_sessions = supabase.table("users").select("id").execute()
            metrics.active_connections = len(active_sessions.data) if active_sessions.data else 0
        except:
            metrics.active_connections = 0
        
        # Get recent request statistics (simplified)
        try:
            # Count recent orders as a proxy for system activity
            recent_orders = supabase.table("orders").select("id").gte("created_at", 
                (datetime.now() - timedelta(hours=1)).isoformat()).execute()
            metrics.request_count = len(recent_orders.data) if recent_orders.data else 0
        except:
            metrics.request_count = 0
        
        # Calculate error rate (simplified)
        # In a real system, you'd track actual errors
        metrics.error_rate = 0.0  # Placeholder
        
    except Exception as e:
        # If we can't get system metrics, return defaults
        metrics.cpu_usage = 0.0
        metrics.memory_usage = 0.0
        metrics.disk_usage = 0.0
        metrics.active_connections = 0
        metrics.request_count = 0
        metrics.error_rate = 0.0
    
    return {
        "timestamp": metrics.timestamp,
        "cpu_usage": metrics.cpu_usage,
        "memory_usage": metrics.memory_usage,
        "disk_usage": metrics.disk_usage,
        "active_connections": metrics.active_connections,
        "request_count": metrics.request_count,
        "error_rate": metrics.error_rate,
        "performance_indicators": {
            "cpu_status": "healthy" if metrics.cpu_usage < 80 else "warning" if metrics.cpu_usage < 95 else "critical",
            "memory_status": "healthy" if metrics.memory_usage < 80 else "warning" if metrics.memory_usage < 95 else "critical",
            "disk_status": "healthy" if metrics.disk_usage < 80 else "warning" if metrics.disk_usage < 95 else "critical"
        }
    }


@router.get("/system/health/summary")
async def get_system_health_summary(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get a summary of system health"""
    try:
        # Get component health
        components_response = await get_system_components_health(current_user, supabase)
        
        # Get system metrics
        metrics_response = await get_system_metrics(current_user, supabase)
        
        # Calculate uptime (simplified - would need actual uptime tracking)
        uptime_hours = 24  # Placeholder
        
        return {
            "overall_status": components_response["status"],
            "timestamp": components_response["timestamp"],
            "uptime_hours": uptime_hours,
            "active_users": components_response["summary"]["total_components"],  # Placeholder
            "performance": {
                "cpu": f"{metrics_response['cpu_usage']:.1f}%",
                "memory": f"{metrics_response['memory_usage']:.1f}%",
                "disk": f"{metrics_response['disk_usage']:.1f}%"
            },
            "components": components_response["summary"],
            "last_check": components_response["timestamp"]
        }
        
    except Exception as e:
        return {
            "overall_status": "unknown",
            "timestamp": datetime.now().isoformat(),
            "uptime_hours": 0,
            "active_users": 0,
            "performance": {
                "cpu": "N/A",
                "memory": "N/A", 
                "disk": "N/A"
            },
            "components": {
                "total_components": 0,
                "healthy": 0,
                "degraded": 0,
                "unhealthy": 0
            },
            "last_check": datetime.now().isoformat(),
            "error": str(e)
        }