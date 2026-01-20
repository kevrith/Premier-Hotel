"""
Housekeeping Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime, date
from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user, require_role
from app.schemas.housekeeping import (
    HousekeepingTaskCreate,
    HousekeepingTaskUpdate,
    HousekeepingTaskResponse,
    TaskStartRequest,
    TaskCompleteRequest,
    RoomInspectionCreate,
    RoomInspectionUpdate,
    RoomInspectionResponse,
    HousekeepingSupplyCreate,
    HousekeepingSupplyUpdate,
    HousekeepingSupplyResponse,
    SupplyUsageCreate,
    SupplyUsageResponse,
    HousekeepingScheduleCreate,
    HousekeepingScheduleUpdate,
    HousekeepingScheduleResponse,
    LostAndFoundCreate,
    LostAndFoundUpdate,
    LostAndFoundResponse,
    RoomStatusSummary,
    HousekeepingStats,
    SupplyStats
)

router = APIRouter()


# ============================================
# Housekeeping Task Endpoints
# ============================================

@router.post("/tasks", response_model=HousekeepingTaskResponse)
async def create_task(
    task: HousekeepingTaskCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new housekeeping task.
    Only admin and managers can create tasks.
    """
    try:
        task_data = task.model_dump()

        # Convert datetime to ISO string for Supabase
        if task_data.get("scheduled_time") and hasattr(task_data["scheduled_time"], "isoformat"):
            task_data["scheduled_time"] = task_data["scheduled_time"].isoformat()

        # Remove created_by if not provided (let DB handle default or make it nullable)
        # The foreign key constraint requires a valid user ID
        if not task_data.get("created_by"):
            task_data.pop("created_by", None)

        result = supabase.table("housekeeping_tasks").insert(task_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create housekeeping task"
            )

        return HousekeepingTaskResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating task: {str(e)}"
        )


@router.get("/tasks", response_model=List[HousekeepingTaskResponse])
async def list_tasks(
    room_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    task_type: Optional[str] = None,
    priority: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List housekeeping tasks with optional filtering.
    """
    try:
        query = supabase.table("housekeeping_tasks").select("*")

        # Apply filters
        if room_id:
            query = query.eq("room_id", room_id)

        if assigned_to:
            query = query.eq("assigned_to", assigned_to)

        if status_filter:
            query = query.eq("status", status_filter)

        if task_type:
            query = query.eq("task_type", task_type)

        if priority:
            query = query.eq("priority", priority)

        if from_date:
            query = query.gte("scheduled_time", from_date.isoformat())

        if to_date:
            query = query.lte("scheduled_time", to_date.isoformat())

        # If user is a cleaner, only show their assigned tasks (unless admin/manager)
        user_role = current_user.get("role", "customer")
        if user_role == "cleaner" and not assigned_to:
            query = query.eq("assigned_to", current_user["id"])

        query = query.range(skip, skip + limit - 1).order("scheduled_time", desc=False)

        result = query.execute()

        return [HousekeepingTaskResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching tasks: {str(e)}"
        )


@router.get("/tasks/my-tasks", response_model=List[HousekeepingTaskResponse])
async def get_my_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(require_role(["cleaner", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get tasks assigned to the current user.
    """
    try:
        query = supabase.table("housekeeping_tasks").select("*").eq("assigned_to", current_user["id"])

        if status_filter:
            query = query.eq("status", status_filter)

        query = query.order("priority", desc=True).order("scheduled_time", desc=False)

        result = query.execute()

        return [HousekeepingTaskResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching my tasks: {str(e)}"
        )


@router.get("/tasks/{task_id}", response_model=HousekeepingTaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get task details by ID.
    """
    try:
        result = supabase.table("housekeeping_tasks").select("*").eq("id", task_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        return HousekeepingTaskResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching task: {str(e)}"
        )


@router.put("/tasks/{task_id}", response_model=HousekeepingTaskResponse)
async def update_task(
    task_id: str,
    task_update: HousekeepingTaskUpdate,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Update a housekeeping task.
    """
    try:
        # Get existing task
        existing = supabase.table("housekeeping_tasks").select("*").eq("id", task_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        update_data = task_update.model_dump(exclude_unset=True)

        result = supabase.table("housekeeping_tasks").update(update_data).eq("id", task_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update task"
            )

        return HousekeepingTaskResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating task: {str(e)}"
        )


@router.patch("/tasks/{task_id}/start", response_model=HousekeepingTaskResponse)
async def start_task(
    task_id: str,
    start_request: TaskStartRequest,
    current_user: dict = Depends(require_role(["cleaner", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Mark a task as started.
    """
    try:
        update_data = {
            "status": "in_progress",
            "started_at": start_request.started_at.isoformat() if start_request.started_at else datetime.now().isoformat()
        }

        result = supabase.table("housekeeping_tasks").update(update_data).eq("id", task_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        return HousekeepingTaskResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error starting task: {str(e)}"
        )


@router.patch("/tasks/{task_id}/complete", response_model=HousekeepingTaskResponse)
async def complete_task(
    task_id: str,
    complete_request: TaskCompleteRequest,
    current_user: dict = Depends(require_role(["cleaner", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Mark a task as completed.
    """
    try:
        update_data = {
            "status": "completed",
            "completed_at": complete_request.completed_at.isoformat() if complete_request.completed_at else datetime.now().isoformat()
        }

        if complete_request.actual_duration:
            update_data["actual_duration"] = complete_request.actual_duration

        if complete_request.issues_found:
            update_data["issues_found"] = complete_request.issues_found

        if complete_request.supplies_used:
            update_data["supplies_used"] = complete_request.supplies_used

        if complete_request.notes:
            update_data["notes"] = complete_request.notes

        result = supabase.table("housekeeping_tasks").update(update_data).eq("id", task_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        return HousekeepingTaskResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error completing task: {str(e)}"
        )


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a housekeeping task.
    """
    try:
        result = supabase.table("housekeeping_tasks").delete().eq("id", task_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )

        return {"message": "Task deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting task: {str(e)}"
        )


# ============================================
# Room Inspection Endpoints
# ============================================

@router.post("/inspections", response_model=RoomInspectionResponse)
async def create_inspection(
    inspection: RoomInspectionCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a room inspection record.
    """
    try:
        inspection_data = inspection.model_dump()

        result = supabase.table("room_inspections").insert(inspection_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create inspection"
            )

        return RoomInspectionResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating inspection: {str(e)}"
        )


@router.get("/inspections", response_model=List[RoomInspectionResponse])
async def list_inspections(
    room_id: Optional[str] = None,
    inspector_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List room inspections with optional filtering.
    """
    try:
        query = supabase.table("room_inspections").select("*")

        if room_id:
            query = query.eq("room_id", room_id)

        if inspector_id:
            query = query.eq("inspector_id", inspector_id)

        if status_filter:
            query = query.eq("status", status_filter)

        if from_date:
            query = query.gte("inspection_date", from_date.isoformat())

        if to_date:
            query = query.lte("inspection_date", to_date.isoformat())

        query = query.range(skip, skip + limit - 1).order("inspection_date", desc=True)

        result = query.execute()

        return [RoomInspectionResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching inspections: {str(e)}"
        )


# ============================================
# Housekeeping Supply Endpoints
# ============================================

@router.post("/supplies", response_model=HousekeepingSupplyResponse)
async def create_supply(
    supply: HousekeepingSupplyCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Add a new housekeeping supply to inventory.
    """
    try:
        supply_data = supply.model_dump()

        result = supabase.table("housekeeping_supplies").insert(supply_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create supply"
            )

        return HousekeepingSupplyResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating supply: {str(e)}"
        )


@router.get("/supplies", response_model=List[HousekeepingSupplyResponse])
async def list_supplies(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    low_stock: bool = False,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List housekeeping supplies with optional filtering.
    """
    try:
        query = supabase.table("housekeeping_supplies").select("*")

        if category:
            query = query.eq("category", category)

        if status_filter:
            query = query.eq("status", status_filter)

        # Low stock filter - supplies where current_stock <= minimum_stock
        if low_stock:
            # Note: This requires a custom filter that Supabase supports
            query = query.lte("current_stock", "minimum_stock")

        query = query.range(skip, skip + limit - 1).order("name", desc=False)

        result = query.execute()

        return [HousekeepingSupplyResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching supplies: {str(e)}"
        )


@router.get("/supplies/low-stock", response_model=List[HousekeepingSupplyResponse])
async def get_low_stock_supplies(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get supplies that are low in stock or out of stock.
    """
    try:
        # Get all supplies and filter in Python (Supabase has limitations on column comparisons)
        result = supabase.table("housekeeping_supplies").select("*").execute()

        low_stock_supplies = [
            HousekeepingSupplyResponse(**item)
            for item in result.data
            if float(item.get("current_stock", 0)) <= float(item.get("minimum_stock", 0))
        ]

        return low_stock_supplies

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching low stock supplies: {str(e)}"
        )


@router.put("/supplies/{supply_id}", response_model=HousekeepingSupplyResponse)
async def update_supply(
    supply_id: str,
    supply_update: HousekeepingSupplyUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Update a housekeeping supply.
    """
    try:
        update_data = supply_update.model_dump(exclude_unset=True)

        result = supabase.table("housekeeping_supplies").update(update_data).eq("id", supply_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supply not found"
            )

        return HousekeepingSupplyResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating supply: {str(e)}"
        )


@router.post("/supplies/usage", response_model=SupplyUsageResponse)
async def log_supply_usage(
    usage: SupplyUsageCreate,
    current_user: dict = Depends(require_role(["cleaner", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Log supply usage and update inventory.
    """
    try:
        usage_data = usage.model_dump()

        # Set used_by to current user if not specified
        if not usage_data.get("used_by"):
            usage_data["used_by"] = current_user["id"]

        # Create usage log
        usage_result = supabase.table("supply_usage").insert(usage_data).execute()

        if not usage_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to log supply usage"
            )

        # Update supply stock
        supply_result = supabase.table("housekeeping_supplies").select("current_stock").eq("id", usage.supply_id).execute()

        if supply_result.data:
            current_stock = float(supply_result.data[0]["current_stock"])
            new_stock = current_stock - float(usage.quantity_used)

            supabase.table("housekeeping_supplies").update({
                "current_stock": new_stock
            }).eq("id", usage.supply_id).execute()

        return SupplyUsageResponse(**usage_result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error logging supply usage: {str(e)}"
        )


# ============================================
# Lost and Found Endpoints
# ============================================

@router.post("/lost-and-found", response_model=LostAndFoundResponse)
async def create_lost_item(
    item: LostAndFoundCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Register a lost and found item.
    """
    try:
        item_data = item.model_dump()

        # Set found_by to current user if not specified
        if not item_data.get("found_by"):
            item_data["found_by"] = current_user["id"]

        result = supabase.table("lost_and_found").insert(item_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create lost and found item"
            )

        return LostAndFoundResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating lost item: {str(e)}"
        )


@router.get("/lost-and-found", response_model=List[LostAndFoundResponse])
async def list_lost_items(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List lost and found items.
    """
    try:
        query = supabase.table("lost_and_found").select("*")

        if status_filter:
            query = query.eq("status", status_filter)

        if category:
            query = query.eq("category", category)

        query = query.range(skip, skip + limit - 1).order("found_date", desc=True)

        result = query.execute()

        return [LostAndFoundResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching lost items: {str(e)}"
        )


@router.patch("/lost-and-found/{item_id}/claim", response_model=LostAndFoundResponse)
async def claim_lost_item(
    item_id: str,
    item_update: LostAndFoundUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Mark a lost item as claimed.
    """
    try:
        update_data = item_update.model_dump(exclude_unset=True)
        update_data["status"] = "claimed"
        update_data["claimed_at"] = datetime.now().isoformat()

        result = supabase.table("lost_and_found").update(update_data).eq("id", item_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lost item not found"
            )

        return LostAndFoundResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error claiming item: {str(e)}"
        )


# ============================================
# Statistics and Analytics Endpoints
# ============================================

@router.get("/stats/overview", response_model=HousekeepingStats)
async def get_housekeeping_stats(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get housekeeping statistics overview.
    """
    try:
        # Build query
        query = supabase.table("housekeeping_tasks").select("*")

        if from_date:
            query = query.gte("created_at", from_date.isoformat())

        if to_date:
            query = query.lte("created_at", to_date.isoformat())

        result = query.execute()
        tasks = result.data

        # Calculate stats
        total_tasks = len(tasks)
        pending_tasks = len([t for t in tasks if t["status"] == "pending"])
        in_progress_tasks = len([t for t in tasks if t["status"] == "in_progress"])
        completed_tasks = len([t for t in tasks if t["status"] == "completed"])

        # Overdue tasks (pending or in_progress with scheduled_time in the past)
        now = datetime.now()
        overdue_tasks = len([
            t for t in tasks
            if t["status"] in ["pending", "in_progress"]
            and t.get("scheduled_time")
            and datetime.fromisoformat(t["scheduled_time"].replace('Z', '+00:00')) < now
        ])

        # Average completion time
        completed_with_duration = [t for t in tasks if t["status"] == "completed" and t.get("actual_duration")]
        avg_completion_time = (
            sum(t["actual_duration"] for t in completed_with_duration) / len(completed_with_duration)
            if completed_with_duration else 0
        )

        # Tasks by type
        tasks_by_type = {}
        for task in tasks:
            task_type = task["task_type"]
            tasks_by_type[task_type] = tasks_by_type.get(task_type, 0) + 1

        # Tasks by priority
        tasks_by_priority = {}
        for task in tasks:
            priority = task["priority"]
            tasks_by_priority[priority] = tasks_by_priority.get(priority, 0) + 1

        return HousekeepingStats(
            total_tasks=total_tasks,
            pending_tasks=pending_tasks,
            in_progress_tasks=in_progress_tasks,
            completed_tasks=completed_tasks,
            overdue_tasks=overdue_tasks,
            avg_completion_time=avg_completion_time,
            tasks_by_type=tasks_by_type,
            tasks_by_priority=tasks_by_priority
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching housekeeping stats: {str(e)}"
        )


@router.get("/stats/room-status", response_model=RoomStatusSummary)
async def get_room_status_summary(
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get room status summary for housekeeping dashboard.
    """
    try:
        # Get all rooms
        rooms_result = supabase.table("rooms").select("*").execute()
        total_rooms = len(rooms_result.data)

        # Get recent tasks
        tasks_result = supabase.table("housekeeping_tasks").select("*").order("created_at", desc=True).limit(1000).execute()
        tasks = tasks_result.data

        # Get recent inspections
        inspections_result = supabase.table("room_inspections").select("*").order("inspection_date", desc=True).limit(100).execute()

        # Calculate room statuses based on recent tasks
        clean_rooms = len([t for t in tasks if t["status"] == "completed" and t["task_type"] == "cleaning"])
        dirty_rooms = len([t for t in tasks if t["status"] == "pending" and t["task_type"] == "cleaning"])
        in_progress_rooms = len([t for t in tasks if t["status"] == "in_progress"])
        inspected_rooms = len(inspections_result.data)

        # Maintenance required (from inspection issues or task notes)
        maintenance_required = len([
            t for t in tasks
            if t.get("issues_found") or t["task_type"] == "maintenance"
        ])

        return RoomStatusSummary(
            total_rooms=total_rooms,
            clean_rooms=clean_rooms,
            dirty_rooms=dirty_rooms,
            in_progress_rooms=in_progress_rooms,
            inspected_rooms=inspected_rooms,
            maintenance_required=maintenance_required
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching room status: {str(e)}"
        )


@router.get("/stats/supplies", response_model=SupplyStats)
async def get_supply_stats(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get housekeeping supplies statistics.
    """
    try:
        result = supabase.table("housekeeping_supplies").select("*").execute()
        supplies = result.data

        total_supplies = len(supplies)

        # Low stock and out of stock
        low_stock_items = len([
            s for s in supplies
            if float(s.get("current_stock", 0)) <= float(s.get("minimum_stock", 0))
            and float(s.get("current_stock", 0)) > 0
        ])

        out_of_stock_items = len([
            s for s in supplies
            if float(s.get("current_stock", 0)) == 0
        ])

        # Categories
        categories = {}
        for supply in supplies:
            category = supply["category"]
            categories[category] = categories.get(category, 0) + 1

        # Total inventory value
        total_inventory_value = sum(
            float(s.get("current_stock", 0)) * float(s.get("unit_cost", 0))
            for s in supplies
            if s.get("unit_cost")
        )

        return SupplyStats(
            total_supplies=total_supplies,
            low_stock_items=low_stock_items,
            out_of_stock_items=out_of_stock_items,
            categories=categories,
            total_inventory_value=total_inventory_value
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching supply stats: {str(e)}"
        )
