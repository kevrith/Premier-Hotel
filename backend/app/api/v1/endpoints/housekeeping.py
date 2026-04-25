"""
Housekeeping Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime, date, timezone
from app.core.supabase import get_supabase, get_supabase_admin
from app.middleware.auth_secure import get_current_user, require_role
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
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["cleaner", "housekeeping", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get tasks assigned to the current user.
    """
    try:
        user_id = current_user["id"]

        # Fetch tasks assigned to this user
        q1 = supabase.table("housekeeping_tasks").select("*").eq("assigned_to", user_id)
        if status_filter:
            q1 = q1.eq("status", status_filter)
        r1 = q1.execute()

        # Fetch unassigned tasks (assigned_to IS NULL) so cleaners can pick them up
        q2 = supabase.table("housekeeping_tasks").select("*").is_("assigned_to", "null")
        if status_filter:
            q2 = q2.eq("status", status_filter)
        r2 = q2.execute()

        # Merge, deduplicate, sort by priority then scheduled_time
        priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
        seen = set()
        combined = []
        for item in (r1.data or []) + (r2.data or []):
            if item["id"] not in seen:
                seen.add(item["id"])
                combined.append(item)
        combined.sort(key=lambda t: (
            priority_order.get(t.get("priority", "normal"), 2),
            t.get("scheduled_time") or ""
        ))

        return [HousekeepingTaskResponse(**item) for item in combined]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching my tasks: {str(e)}"
        )


@router.get("/tasks/{task_id}", response_model=HousekeepingTaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["cleaner", "housekeeping", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["cleaner", "housekeeping", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
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

        task_record = result.data[0]
        # If this was a cleaning task, mark the room available
        if task_record.get("task_type") == "cleaning" and task_record.get("room_id"):
            supabase.table("rooms").update({"status": "available"}).eq(
                "id", task_record["room_id"]
            ).eq("status", "cleaning").execute()

        return HousekeepingTaskResponse(**task_record)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error completing task: {str(e)}"
        )


@router.post("/tasks/self-claim", response_model=HousekeepingTaskResponse)
async def self_claim_room(
    room_id: str = Query(..., description="ID of the room to claim for cleaning"),
    current_user: dict = Depends(require_role(["cleaner", "housekeeping", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Cleaner claims an available/dirty room to clean, creating their own task."""
    try:
        # Verify the room exists and is in a claimable state
        room_res = supabase.table("rooms").select("id, room_number, status, type").eq("id", room_id).execute()
        if not room_res.data:
            raise HTTPException(status_code=404, detail="Room not found")
        room = room_res.data[0]
        if room["status"] not in ("available", "cleaning", "dirty"):
            raise HTTPException(status_code=400, detail=f"Room is {room['status']} — only available/cleaning rooms can be claimed")

        # Check for an existing active task for this room
        existing = supabase.table("housekeeping_tasks").select("id, status, assigned_to").eq("room_id", room_id).in_("status", ["pending", "assigned", "in_progress"]).execute()
        if existing.data:
            # Idempotent: if this user already claimed the room, return their existing task
            my_task = next((t for t in existing.data if t.get("assigned_to") == current_user["id"]), None)
            if my_task:
                task_res = supabase.table("housekeeping_tasks").select("*").eq("id", my_task["id"]).execute()
                if task_res.data:
                    return HousekeepingTaskResponse(**task_res.data[0])
            raise HTTPException(status_code=400, detail="Room already has an active task assigned to another cleaner")

        task_data = {
            "room_id": room_id,
            "task_type": "cleaning",
            "status": "assigned",
            "priority": "normal",
            "assigned_to": current_user["id"],
            "scheduled_time": datetime.now(timezone.utc).isoformat(),
            "notes": f"Self-claimed by {current_user.get('full_name') or current_user.get('email', 'cleaner')}",
        }
        result = supabase.table("housekeeping_tasks").insert(task_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create task")

        # Mark room as cleaning so it shows correctly
        supabase.table("rooms").update({"status": "cleaning"}).eq("id", room_id).execute()

        return HousekeepingTaskResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error claiming room: {str(e)}")


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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

    except HTTPException:
        raise
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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

        # Low stock filter applied in Python after fetch (column-to-column comparison)
        # NOTE: Supabase .lte() compares against a literal value, not another column.

        result = query.order("name", desc=False).execute()
        items = result.data

        # Apply low-stock filter in Python (column-to-column comparison)
        if low_stock:
            items = [
                s for s in items
                if float(s.get("current_stock", 0)) <= float(s.get("minimum_stock", 0))
            ]

        # Apply pagination after filtering
        items = items[skip: skip + limit]

        return [HousekeepingSupplyResponse(**item) for item in items]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching supplies: {str(e)}"
        )


@router.get("/supplies/low-stock", response_model=List[HousekeepingSupplyResponse])
async def get_low_stock_supplies(
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping"])),
    supabase: Client = Depends(get_supabase_admin)
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
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["cleaner", "housekeeping", "staff", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping"])),
    supabase: Client = Depends(get_supabase_admin)
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
        now = datetime.now(timezone.utc)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
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
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping"])),
    supabase: Client = Depends(get_supabase_admin)
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


# ============================================
# Housekeeping Schedule Endpoints
# ============================================

FREQUENCY_DAYS = {"daily": 1, "weekly": 7, "biweekly": 14, "monthly": 30, "quarterly": 90}


@router.post("/schedules", response_model=HousekeepingScheduleResponse)
async def create_schedule(
    schedule: HousekeepingScheduleCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Create a new housekeeping schedule."""
    try:
        data = schedule.model_dump()
        if data.get("preferred_time") and hasattr(data["preferred_time"], "isoformat"):
            data["preferred_time"] = data["preferred_time"].isoformat()

        # Calculate next_scheduled_at based on frequency
        from datetime import timedelta
        days = FREQUENCY_DAYS.get(data["frequency"], 30)
        data["next_scheduled_at"] = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        data["is_active"] = True

        result = supabase.table("housekeeping_schedules").insert(data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create schedule")
        return HousekeepingScheduleResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating schedule: {str(e)}")


@router.get("/schedules", response_model=List[HousekeepingScheduleResponse])
async def list_schedules(
    room_id: Optional[str] = None,
    task_type: Optional[str] = None,
    frequency: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """List housekeeping schedules with optional filters."""
    try:
        query = supabase.table("housekeeping_schedules").select("*")
        if room_id:
            query = query.eq("room_id", room_id)
        if task_type:
            query = query.eq("task_type", task_type)
        if frequency:
            query = query.eq("frequency", frequency)
        if is_active is not None:
            query = query.eq("is_active", is_active)
        result = query.order("next_scheduled_at", desc=False).execute()
        return [HousekeepingScheduleResponse(**s) for s in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching schedules: {str(e)}")


@router.get("/schedules/{schedule_id}", response_model=HousekeepingScheduleResponse)
async def get_schedule(
    schedule_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get a single housekeeping schedule."""
    result = supabase.table("housekeeping_schedules").select("*").eq("id", schedule_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return HousekeepingScheduleResponse(**result.data)


@router.put("/schedules/{schedule_id}", response_model=HousekeepingScheduleResponse)
async def update_schedule(
    schedule_id: str,
    update: HousekeepingScheduleUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Update a housekeeping schedule."""
    try:
        data = {k: v for k, v in update.model_dump().items() if v is not None}
        if "preferred_time" in data and hasattr(data["preferred_time"], "isoformat"):
            data["preferred_time"] = data["preferred_time"].isoformat()
        if "frequency" in data:
            from datetime import timedelta
            days = FREQUENCY_DAYS.get(data["frequency"], 30)
            data["next_scheduled_at"] = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = supabase.table("housekeeping_schedules").update(data).eq("id", schedule_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return HousekeepingScheduleResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating schedule: {str(e)}")


@router.patch("/schedules/{schedule_id}/complete", response_model=HousekeepingScheduleResponse)
async def complete_schedule(
    schedule_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "cleaner", "housekeeping", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Mark a schedule as last executed now and advance next_scheduled_at."""
    try:
        existing = supabase.table("housekeeping_schedules").select("*").eq("id", schedule_id).maybe_single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Schedule not found")
        rec = existing.data
        from datetime import timedelta
        days = FREQUENCY_DAYS.get(rec["frequency"], 30)
        now = datetime.now(timezone.utc)
        update_data = {
            "last_executed_at": now.isoformat(),
            "next_scheduled_at": (now + timedelta(days=days)).isoformat(),
            "updated_at": now.isoformat(),
        }
        result = supabase.table("housekeeping_schedules").update(update_data).eq("id", schedule_id).execute()
        return HousekeepingScheduleResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing schedule: {str(e)}")


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Delete a housekeeping schedule."""
    result = supabase.table("housekeeping_schedules").delete().eq("id", schedule_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Schedule not found")


# ============================================
# Performance Analytics Endpoint
# ============================================

@router.get("/stats/performance")
async def get_performance_analytics(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Real performance analytics derived from actual task and inspection data.
    Returns: metrics summary, staff_performance list, time_analytics by room type, quality_trends by day.
    """
    try:
        # ── Fetch tasks ──────────────────────────────────────────────────────
        task_query = supabase.table("housekeeping_tasks").select(
            "id, assigned_to, status, task_type, actual_duration, scheduled_time, completed_at, created_at"
        )
        if from_date:
            task_query = task_query.gte("created_at", from_date.isoformat())
        if to_date:
            task_query = task_query.lte("created_at", to_date.isoformat())
        tasks = task_query.execute().data

        # ── Fetch inspections ────────────────────────────────────────────────
        insp_query = supabase.table("room_inspections").select(
            "id, inspector_id, overall_score, cleanliness_score, status, inspection_date, created_at"
        )
        if from_date:
            insp_query = insp_query.gte("created_at", from_date.isoformat())
        if to_date:
            insp_query = insp_query.lte("created_at", to_date.isoformat())
        inspections = insp_query.execute().data

        # ── Fetch users for name lookup ──────────────────────────────────────
        users_res = supabase.table("users").select("id, full_name, first_name, last_name, email").execute()
        user_map = {}
        for u in users_res.data:
            name = u.get("full_name") or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or u.get("email", u["id"])
            user_map[u["id"]] = name

        # ── Fetch rooms for type lookup ──────────────────────────────────────
        rooms_res = supabase.table("rooms").select("id, room_number, room_type").execute()
        room_map = {r["id"]: r for r in rooms_res.data}

        # ── Overall metrics ──────────────────────────────────────────────────
        completed = [t for t in tasks if t["status"] == "completed"]
        total = len(tasks)
        completion_rate = round(len(completed) / total * 100, 1) if total else 0

        durations = [t["actual_duration"] for t in completed if t.get("actual_duration")]
        avg_cleaning_time = round(sum(durations) / len(durations), 1) if durations else 0

        scores = [i["overall_score"] for i in inspections if i.get("overall_score")]
        avg_quality_score = round(sum(scores) / len(scores), 2) if scores else 0

        now = datetime.now(timezone.utc)
        on_time = [
            t for t in completed
            if t.get("scheduled_time") and t.get("completed_at")
            and datetime.fromisoformat(t["completed_at"].replace("Z", "+00:00"))
            <= datetime.fromisoformat(t["scheduled_time"].replace("Z", "+00:00"))
        ]
        on_time_rate = round(len(on_time) / len(completed) * 100, 1) if completed else 0

        metrics = {
            "avg_cleaning_time": avg_cleaning_time,
            "avg_quality_score": avg_quality_score,
            "tasks_completed": len(completed),
            "completion_rate": completion_rate,
            "on_time_rate": on_time_rate,
            "total_tasks": total,
            "total_inspections": len(inspections),
        }

        # ── Staff performance ────────────────────────────────────────────────
        staff_tasks: dict = {}
        for t in tasks:
            uid = t.get("assigned_to")
            if not uid:
                continue
            if uid not in staff_tasks:
                staff_tasks[uid] = []
            staff_tasks[uid].append(t)

        staff_performance = []
        for uid, staff_t in staff_tasks.items():
            s_completed = [t for t in staff_t if t["status"] == "completed"]
            s_durations = [t["actual_duration"] for t in s_completed if t.get("actual_duration")]
            s_avg_time = round(sum(s_durations) / len(s_durations), 1) if s_durations else 0

            # Quality: average of inspections done by this cleaner (as inspector)
            s_inspections = [i for i in inspections if i.get("inspector_id") == uid]
            s_scores = [i["overall_score"] for i in s_inspections if i.get("overall_score")]
            s_avg_quality = round(sum(s_scores) / len(s_scores), 2) if s_scores else 0

            s_on_time = [
                t for t in s_completed
                if t.get("scheduled_time") and t.get("completed_at")
                and datetime.fromisoformat(t["completed_at"].replace("Z", "+00:00"))
                <= datetime.fromisoformat(t["scheduled_time"].replace("Z", "+00:00"))
            ]
            s_on_time_rate = round(len(s_on_time) / len(s_completed) * 100, 1) if s_completed else 0

            staff_performance.append({
                "staff_id": uid,
                "staff_name": user_map.get(uid, uid),
                "tasks_completed": len(s_completed),
                "total_tasks": len(staff_t),
                "avg_time": s_avg_time,
                "avg_quality": s_avg_quality,
                "completion_rate": round(len(s_completed) / len(staff_t) * 100, 1) if staff_t else 0,
                "on_time_rate": s_on_time_rate,
                "rooms_cleaned": len({t.get("room_id") for t in s_completed if t.get("room_id")}),
            })
        staff_performance.sort(key=lambda x: x["tasks_completed"], reverse=True)

        # ── Time analytics by room type ──────────────────────────────────────
        type_times: dict = {}
        for t in completed:
            if not t.get("actual_duration") or not t.get("room_id"):
                continue
            room = room_map.get(t["room_id"], {})
            rtype = room.get("room_type", "Unknown")
            type_times.setdefault(rtype, []).append(t["actual_duration"])

        time_analytics = []
        for rtype, times in type_times.items():
            time_analytics.append({
                "room_type": rtype,
                "avg_time": round(sum(times) / len(times), 1),
                "min_time": min(times),
                "max_time": max(times),
                "sample_size": len(times),
            })
        time_analytics.sort(key=lambda x: x["avg_time"])

        # ── Quality trends by day ────────────────────────────────────────────
        daily: dict = {}
        for insp in inspections:
            day = (insp.get("inspection_date") or insp.get("created_at") or "")[:10]
            if not day:
                continue
            daily.setdefault(day, []).append(insp)

        quality_trends = []
        for day in sorted(daily.keys()):
            day_i = daily[day]
            day_scores = [i["overall_score"] for i in day_i if i.get("overall_score")]
            passed = len([i for i in day_i if i.get("status") in ("passed", "excellent")])
            failed = len([i for i in day_i if i.get("status") == "failed"])
            quality_trends.append({
                "date": day,
                "avg_score": round(sum(day_scores) / len(day_scores), 2) if day_scores else 0,
                "inspections": len(day_i),
                "passed": passed,
                "failed": failed,
            })

        return {
            "metrics": metrics,
            "staff_performance": staff_performance,
            "time_analytics": time_analytics,
            "quality_trends": quality_trends,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching performance analytics: {str(e)}")
