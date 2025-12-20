"""
Staff Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Optional
from datetime import date, datetime, time
from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user, require_role
from app.schemas.staff import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    StaffShiftCreate,
    StaffShiftUpdate,
    StaffShiftResponse,
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceUpdate,
    AttendanceResponse,
    PerformanceEvaluationCreate,
    PerformanceEvaluationUpdate,
    PerformanceEvaluationResponse,
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveApproval,
    LeaveRequestResponse,
    StaffStats,
    AttendanceStats
)

router = APIRouter()


# ============================================
# Staff CRUD Endpoints
# ============================================

@router.post("/", response_model=StaffResponse)
async def create_staff(
    staff: StaffCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new staff member.
    Only admin and managers can create staff.
    """
    try:
        # Calculate days count for leaves
        staff_data = staff.model_dump()

        result = supabase.table("staff").insert(staff_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create staff member"
            )

        return StaffResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating staff: {str(e)}"
        )


@router.get("/", response_model=List[StaffResponse])
async def list_staff(
    department: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List all staff members with optional filtering.
    """
    try:
        query = supabase.table("staff").select("*")

        if department:
            query = query.eq("department", department)

        if status_filter:
            query = query.eq("status", status_filter)

        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)

        result = query.execute()

        return [StaffResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff: {str(e)}"
        )


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get staff member details by ID.
    """
    try:
        result = supabase.table("staff").select("*").eq("id", staff_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )

        # Check if user can view this staff member
        staff_data = result.data[0]
        user_role = current_user.get("role", "customer")

        if user_role not in ["admin", "manager"] and staff_data["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this staff member"
            )

        return StaffResponse(**staff_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff: {str(e)}"
        )


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    staff_update: StaffUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Update staff member information.
    Only admin and managers can update staff.
    """
    try:
        # Get existing staff member
        existing = supabase.table("staff").select("*").eq("id", staff_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )

        # Update with only provided fields
        update_data = staff_update.model_dump(exclude_unset=True)

        result = supabase.table("staff").update(update_data).eq("id", staff_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update staff member"
            )

        return StaffResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating staff: {str(e)}"
        )


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    current_user: dict = Depends(require_role(["admin"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Delete a staff member.
    Only admin can delete staff.
    """
    try:
        result = supabase.table("staff").delete().eq("id", staff_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member not found"
            )

        return {"message": "Staff member deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting staff: {str(e)}"
        )


# ============================================
# Staff Shift Endpoints
# ============================================

@router.post("/shifts", response_model=StaffShiftResponse)
async def create_shift(
    shift: StaffShiftCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a new shift for a staff member.
    """
    try:
        shift_data = shift.model_dump()
        # Convert time objects to strings for JSON serialization
        shift_data["start_time"] = shift.start_time.isoformat()
        shift_data["end_time"] = shift.end_time.isoformat()

        result = supabase.table("staff_shifts").insert(shift_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create shift"
            )

        return StaffShiftResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating shift: {str(e)}"
        )


@router.get("/shifts", response_model=List[StaffShiftResponse])
async def list_shifts(
    staff_id: Optional[str] = None,
    shift_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    List shifts with optional filtering.
    """
    try:
        query = supabase.table("staff_shifts").select("*")

        if staff_id:
            query = query.eq("staff_id", staff_id)

        if shift_date:
            query = query.eq("shift_date", shift_date.isoformat())

        if start_date:
            query = query.gte("shift_date", start_date.isoformat())

        if end_date:
            query = query.lte("shift_date", end_date.isoformat())

        query = query.range(skip, skip + limit - 1).order("shift_date", desc=True)

        result = query.execute()

        return [StaffShiftResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching shifts: {str(e)}"
        )


@router.get("/shifts/my-shifts", response_model=List[StaffShiftResponse])
async def get_my_shifts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get shifts for the current logged-in staff member.
    """
    try:
        # Get staff record for current user
        staff_result = supabase.table("staff").select("id").eq("user_id", current_user["id"]).execute()

        if not staff_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff record not found for current user"
            )

        staff_id = staff_result.data[0]["id"]

        # Get shifts
        query = supabase.table("staff_shifts").select("*").eq("staff_id", staff_id)

        if start_date:
            query = query.gte("shift_date", start_date.isoformat())

        if end_date:
            query = query.lte("shift_date", end_date.isoformat())

        query = query.order("shift_date", desc=False)

        result = query.execute()

        return [StaffShiftResponse(**item) for item in result.data]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching shifts: {str(e)}"
        )


@router.put("/shifts/{shift_id}", response_model=StaffShiftResponse)
async def update_shift(
    shift_id: str,
    shift_update: StaffShiftUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Update a shift.
    """
    try:
        update_data = shift_update.model_dump(exclude_unset=True)

        # Convert time objects to strings if present
        if "start_time" in update_data and update_data["start_time"]:
            update_data["start_time"] = update_data["start_time"].isoformat()
        if "end_time" in update_data and update_data["end_time"]:
            update_data["end_time"] = update_data["end_time"].isoformat()

        result = supabase.table("staff_shifts").update(update_data).eq("id", shift_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shift not found"
            )

        return StaffShiftResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating shift: {str(e)}"
        )


# ============================================
# Attendance Endpoints
# ============================================

@router.post("/attendance/check-in", response_model=AttendanceResponse)
async def check_in(
    attendance: AttendanceCheckIn,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Staff check-in for the day.
    """
    try:
        today = date.today()

        # Check if already checked in today
        existing = supabase.table("staff_attendance").select("*").eq("staff_id", attendance.staff_id).eq("date", today.isoformat()).execute()

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already checked in today"
            )

        # Create attendance record
        attendance_data = {
            "staff_id": attendance.staff_id,
            "date": today.isoformat(),
            "check_in_time": datetime.now().isoformat(),
            "status": "present",
            "notes": attendance.notes
        }

        result = supabase.table("staff_attendance").insert(attendance_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check in"
            )

        return AttendanceResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error checking in: {str(e)}"
        )


@router.patch("/attendance/check-out", response_model=AttendanceResponse)
async def check_out(
    attendance: AttendanceCheckOut,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Staff check-out for the day.
    """
    try:
        # Get staff record
        staff_result = supabase.table("staff").select("id").eq("user_id", current_user["id"]).execute()

        if not staff_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff record not found"
            )

        staff_id = staff_result.data[0]["id"]
        today = date.today()

        # Get today's attendance
        attendance_result = supabase.table("staff_attendance").select("*").eq("staff_id", staff_id).eq("date", today.isoformat()).execute()

        if not attendance_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No check-in record found for today"
            )

        attendance_record = attendance_result.data[0]

        if attendance_record.get("check_out_time"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already checked out today"
            )

        # Update with check-out time
        update_data = {
            "check_out_time": datetime.now().isoformat()
        }

        if attendance.notes:
            update_data["notes"] = attendance.notes

        result = supabase.table("staff_attendance").update(update_data).eq("id", attendance_record["id"]).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check out"
            )

        return AttendanceResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error checking out: {str(e)}"
        )


@router.get("/attendance", response_model=List[AttendanceResponse])
async def list_attendance(
    staff_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List attendance records.
    """
    try:
        query = supabase.table("staff_attendance").select("*")

        if staff_id:
            query = query.eq("staff_id", staff_id)

        if start_date:
            query = query.gte("date", start_date.isoformat())

        if end_date:
            query = query.lte("date", end_date.isoformat())

        query = query.range(skip, skip + limit - 1).order("date", desc=True)

        result = query.execute()

        return [AttendanceResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching attendance: {str(e)}"
        )


# ============================================
# Leave Request Endpoints
# ============================================

@router.post("/leaves", response_model=LeaveRequestResponse)
async def create_leave_request(
    leave_request: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a leave request.
    """
    try:
        # Calculate days count
        days_count = (leave_request.end_date - leave_request.start_date).days + 1

        leave_data = leave_request.model_dump()
        leave_data["days_count"] = days_count

        result = supabase.table("staff_leaves").insert(leave_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create leave request"
            )

        return LeaveRequestResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating leave request: {str(e)}"
        )


@router.get("/leaves", response_model=List[LeaveRequestResponse])
async def list_leave_requests(
    staff_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List leave requests.
    """
    try:
        query = supabase.table("staff_leaves").select("*")

        if staff_id:
            query = query.eq("staff_id", staff_id)

        if status_filter:
            query = query.eq("status", status_filter)

        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)

        result = query.execute()

        return [LeaveRequestResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leave requests: {str(e)}"
        )


@router.patch("/leaves/{leave_id}/approve", response_model=LeaveRequestResponse)
async def approve_leave(
    leave_id: str,
    approval: LeaveApproval,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Approve or reject a leave request.
    """
    try:
        update_data = {
            "status": approval.status,
            "approved_by": current_user["id"],
            "approved_at": datetime.now().isoformat()
        }

        if approval.notes:
            update_data["notes"] = approval.notes

        result = supabase.table("staff_leaves").update(update_data).eq("id", leave_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave request not found"
            )

        return LeaveRequestResponse(**result.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error approving leave: {str(e)}"
        )


# ============================================
# Performance Evaluation Endpoints
# ============================================

@router.post("/evaluations", response_model=PerformanceEvaluationResponse)
async def create_evaluation(
    evaluation: PerformanceEvaluationCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Create a performance evaluation.
    """
    try:
        eval_data = evaluation.model_dump()

        result = supabase.table("staff_performance").insert(eval_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create evaluation"
            )

        return PerformanceEvaluationResponse(**result.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating evaluation: {str(e)}"
        )


@router.get("/evaluations", response_model=List[PerformanceEvaluationResponse])
async def list_evaluations(
    staff_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    List performance evaluations.
    """
    try:
        query = supabase.table("staff_performance").select("*")

        if staff_id:
            query = query.eq("staff_id", staff_id)

        query = query.range(skip, skip + limit - 1).order("evaluation_date", desc=True)

        result = query.execute()

        return [PerformanceEvaluationResponse(**item) for item in result.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching evaluations: {str(e)}"
        )


# ============================================
# Stats Endpoints
# ============================================

@router.get("/stats/overview", response_model=StaffStats)
async def get_staff_stats(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get staff statistics overview.
    """
    try:
        # Get total staff
        all_staff = supabase.table("staff").select("*").execute()

        total_staff = len(all_staff.data)
        active_staff = len([s for s in all_staff.data if s["status"] == "active"])
        on_leave = len([s for s in all_staff.data if s["status"] == "on_leave"])

        # Count by department
        departments = {}
        for staff in all_staff.data:
            dept = staff["department"]
            departments[dept] = departments.get(dept, 0) + 1

        # Calculate average attendance rate
        # This is a simplified calculation - you may want to enhance this
        attendance_rate = 95.0  # Placeholder

        return StaffStats(
            total_staff=total_staff,
            active_staff=active_staff,
            on_leave=on_leave,
            departments=departments,
            average_attendance_rate=attendance_rate
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching staff stats: {str(e)}"
        )
