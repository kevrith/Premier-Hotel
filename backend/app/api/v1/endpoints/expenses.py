"""
Expense Tracking API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime, date
from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user, require_role
from app.schemas.expenses import (
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseApprove, ExpenseReject, ExpenseMarkPaid, ExpenseResponse,
    BudgetCreate, BudgetUpdate, BudgetApprove, BudgetResponse,
    BudgetAllocationCreate, BudgetAllocationUpdate, BudgetAllocationResponse,
    ExpensePaymentCreate, ExpensePaymentResponse,
    ExpenseApprovalResponse,
    ExpenseStatistics, BudgetStatistics
)

router = APIRouter()

# =====================================================
# Expense Categories Endpoints
# =====================================================

@router.get("/categories", response_model=List[ExpenseCategoryResponse])
async def get_expense_categories(
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all expense categories"""
    try:
        query = supabase.table("expense_categories").select("*").order("display_order")

        if is_active is not None:
            query = query.eq("is_active", is_active)

        result = query.execute()
        return [ExpenseCategoryResponse(**cat) for cat in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching categories: {str(e)}")

@router.post("/categories", response_model=ExpenseCategoryResponse)
async def create_expense_category(
    category: ExpenseCategoryCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new expense category"""
    try:
        category_data = category.model_dump()
        result = supabase.table("expense_categories").insert(category_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create category")
        return ExpenseCategoryResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating category: {str(e)}")

@router.patch("/categories/{category_id}", response_model=ExpenseCategoryResponse)
async def update_expense_category(
    category_id: str,
    category: ExpenseCategoryUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update an expense category"""
    try:
        update_data = category.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("expense_categories").update(update_data).eq("id", category_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Category not found")
        return ExpenseCategoryResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating category: {str(e)}")

# =====================================================
# Expenses Endpoints
# =====================================================

def generate_expense_number() -> str:
    """Generate unique expense number"""
    return f"EXP-{datetime.now().strftime('%Y%m%d%H%M%S')}"

@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(
    status: Optional[str] = Query(None),
    expense_type: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all expenses with optional filters"""
    try:
        query = supabase.table("expenses").select("*").order("expense_date", desc=True)

        if status:
            query = query.eq("status", status)
        if expense_type:
            query = query.eq("expense_type", expense_type)
        if category_id:
            query = query.eq("category_id", category_id)
        if start_date:
            query = query.gte("expense_date", start_date.isoformat())
        if end_date:
            query = query.lte("expense_date", end_date.isoformat())

        query = query.range(offset, offset + limit - 1)
        result = query.execute()

        return [ExpenseResponse(**expense) for expense in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching expenses: {str(e)}")

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific expense by ID"""
    try:
        result = supabase.table("expenses").select("*").eq("id", expense_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return ExpenseResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching expense: {str(e)}")

@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    expense: ExpenseCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new expense"""
    try:
        expense_data = expense.model_dump()
        expense_data["expense_number"] = generate_expense_number()
        expense_data["total_amount"] = expense_data["amount"] + expense_data.get("tax_amount", 0)
        expense_data["status"] = "pending"
        expense_data["payment_status"] = "unpaid"
        expense_data["submitted_by"] = current_user["id"]

        result = supabase.table("expenses").insert(expense_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create expense")
        return ExpenseResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating expense: {str(e)}")

@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense: ExpenseUpdate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Update an expense"""
    try:
        update_data = expense.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Recalculate total if amount or tax changed
        if "amount" in update_data or "tax_amount" in update_data:
            existing = supabase.table("expenses").select("amount, tax_amount").eq("id", expense_id).execute()
            if existing.data:
                amount = update_data.get("amount", existing.data[0]["amount"])
                tax = update_data.get("tax_amount", existing.data[0]["tax_amount"])
                update_data["total_amount"] = float(amount) + float(tax)

        result = supabase.table("expenses").update(update_data).eq("id", expense_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return ExpenseResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating expense: {str(e)}")

@router.patch("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_id: str,
    approval: ExpenseApprove,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Approve an expense"""
    try:
        update_data = {
            "status": "approved",
            "approved_by": approval.approved_by,
            "approved_at": datetime.now().isoformat(),
            "approval_notes": approval.approval_notes
        }

        result = supabase.table("expenses").update(update_data).eq("id", expense_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return ExpenseResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error approving expense: {str(e)}")

@router.patch("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: str,
    rejection: ExpenseReject,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Reject an expense"""
    try:
        update_data = {
            "status": "rejected",
            "approved_by": rejection.approved_by,
            "approved_at": datetime.now().isoformat(),
            "approval_notes": rejection.approval_notes
        }

        result = supabase.table("expenses").update(update_data).eq("id", expense_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return ExpenseResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error rejecting expense: {str(e)}")

@router.patch("/{expense_id}/mark-paid", response_model=ExpenseResponse)
async def mark_expense_paid(
    expense_id: str,
    payment: ExpenseMarkPaid,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Mark an expense as paid"""
    try:
        update_data = {
            "status": "paid",
            "payment_status": "paid",
            "paid_date": payment.paid_date.isoformat(),
            "payment_method": payment.payment_method
        }

        result = supabase.table("expenses").update(update_data).eq("id", expense_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return ExpenseResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error marking expense as paid: {str(e)}")

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Delete an expense"""
    try:
        result = supabase.table("expenses").delete().eq("id", expense_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Expense not found")
        return {"message": "Expense deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting expense: {str(e)}")

# =====================================================
# Budgets Endpoints
# =====================================================

def generate_budget_number() -> str:
    """Generate unique budget number"""
    return f"BUD-{datetime.now().strftime('%Y%m%d%H%M%S')}"

@router.get("/budgets", response_model=List[BudgetResponse])
async def get_budgets(
    status: Optional[str] = Query(None),
    period_type: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all budgets"""
    try:
        query = supabase.table("budgets").select("*").order("start_date", desc=True)

        if status:
            query = query.eq("status", status)
        if period_type:
            query = query.eq("period_type", period_type)

        result = query.execute()
        return [BudgetResponse(**budget) for budget in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching budgets: {str(e)}")

@router.get("/budgets/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific budget by ID"""
    try:
        result = supabase.table("budgets").select("*").eq("id", budget_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Budget not found")
        return BudgetResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching budget: {str(e)}")

@router.post("/budgets", response_model=BudgetResponse)
async def create_budget(
    budget: BudgetCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new budget"""
    try:
        budget_data = budget.model_dump()
        budget_data["budget_number"] = generate_budget_number()
        budget_data["status"] = "draft"
        budget_data["created_by"] = current_user["id"]

        result = supabase.table("budgets").insert(budget_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create budget")
        return BudgetResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating budget: {str(e)}")

@router.patch("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    budget: BudgetUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update a budget"""
    try:
        update_data = budget.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("budgets").update(update_data).eq("id", budget_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Budget not found")
        return BudgetResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating budget: {str(e)}")

@router.patch("/budgets/{budget_id}/approve", response_model=BudgetResponse)
async def approve_budget(
    budget_id: str,
    approval: BudgetApprove,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Approve and activate a budget"""
    try:
        update_data = {
            "status": "active",
            "approved_by": approval.approved_by,
            "approved_at": datetime.now().isoformat()
        }

        result = supabase.table("budgets").update(update_data).eq("id", budget_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Budget not found")
        return BudgetResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error approving budget: {str(e)}")

# =====================================================
# Budget Allocations Endpoints
# =====================================================

@router.get("/budgets/{budget_id}/allocations", response_model=List[BudgetAllocationResponse])
async def get_budget_allocations(
    budget_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all allocations for a budget"""
    try:
        result = supabase.table("budget_allocations").select("*").eq("budget_id", budget_id).execute()
        return [BudgetAllocationResponse(**alloc) for alloc in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching budget allocations: {str(e)}")

@router.post("/budgets/{budget_id}/allocations", response_model=BudgetAllocationResponse)
async def create_budget_allocation(
    budget_id: str,
    allocation: BudgetAllocationCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a budget allocation"""
    try:
        allocation_data = allocation.model_dump()
        allocation_data["budget_id"] = budget_id

        result = supabase.table("budget_allocations").insert(allocation_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create budget allocation")
        return BudgetAllocationResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating budget allocation: {str(e)}")

@router.patch("/budgets/{budget_id}/allocations/{allocation_id}", response_model=BudgetAllocationResponse)
async def update_budget_allocation(
    budget_id: str,
    allocation_id: str,
    allocation: BudgetAllocationUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update a budget allocation"""
    try:
        update_data = allocation.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("budget_allocations").update(update_data).eq("id", allocation_id).eq("budget_id", budget_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Budget allocation not found")
        return BudgetAllocationResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating budget allocation: {str(e)}")

# =====================================================
# Statistics Endpoints
# =====================================================

@router.get("/statistics/expenses", response_model=ExpenseStatistics)
async def get_expense_statistics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get expense statistics"""
    try:
        query = supabase.table("expenses").select("*")

        if start_date:
            query = query.gte("expense_date", start_date.isoformat())
        if end_date:
            query = query.lte("expense_date", end_date.isoformat())

        result = query.execute()
        expenses = result.data

        # Calculate statistics
        total_expenses = len(expenses)
        total_amount = sum(float(e["total_amount"]) for e in expenses)

        pending = [e for e in expenses if e["status"] == "pending"]
        approved = [e for e in expenses if e["status"] == "approved"]
        paid = [e for e in expenses if e["status"] == "paid"]

        # Group by category
        by_category = {}
        for exp in expenses:
            cat_id = exp.get("category_id", "uncategorized")
            if cat_id not in by_category:
                by_category[cat_id] = {"count": 0, "amount": 0}
            by_category[cat_id]["count"] += 1
            by_category[cat_id]["amount"] += float(exp["total_amount"])

        # Group by type
        by_type = {}
        for exp in expenses:
            exp_type = exp["expense_type"]
            if exp_type not in by_type:
                by_type[exp_type] = {"count": 0, "amount": 0}
            by_type[exp_type]["count"] += 1
            by_type[exp_type]["amount"] += float(exp["total_amount"])

        return ExpenseStatistics(
            total_expenses=total_expenses,
            total_amount=total_amount,
            pending_expenses=len(pending),
            pending_amount=sum(float(e["total_amount"]) for e in pending),
            approved_expenses=len(approved),
            approved_amount=sum(float(e["total_amount"]) for e in approved),
            paid_expenses=len(paid),
            paid_amount=sum(float(e["total_amount"]) for e in paid),
            by_category=by_category,
            by_type=by_type,
            monthly_trend=[]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching statistics: {str(e)}")

@router.get("/statistics/budgets/{budget_id}", response_model=BudgetStatistics)
async def get_budget_statistics(
    budget_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get budget statistics"""
    try:
        # Get budget
        budget_result = supabase.table("budgets").select("*").eq("id", budget_id).execute()
        if not budget_result.data:
            raise HTTPException(status_code=404, detail="Budget not found")

        budget = budget_result.data[0]

        # Get allocations
        alloc_result = supabase.table("budget_allocations").select("*").eq("budget_id", budget_id).execute()
        allocations = alloc_result.data

        total_budget = float(budget["total_budget"])
        allocated = sum(float(a["allocated_amount"]) for a in allocations)
        spent = float(budget["spent_amount"])
        remaining = total_budget - spent
        utilization = (spent / total_budget * 100) if total_budget > 0 else 0

        # Format allocations by category
        by_category = []
        alerts = []

        for alloc in allocations:
            alloc_spent = float(alloc["spent_amount"])
            alloc_allocated = float(alloc["allocated_amount"])
            alloc_percent = (alloc_spent / alloc_allocated * 100) if alloc_allocated > 0 else 0

            by_category.append({
                "category_id": alloc["category_id"],
                "allocated": alloc_allocated,
                "spent": alloc_spent,
                "remaining": float(alloc["remaining_amount"]),
                "percent": alloc_percent
            })

            if alloc["alert_triggered"]:
                alerts.append({
                    "category_id": alloc["category_id"],
                    "allocated": alloc_allocated,
                    "spent": alloc_spent,
                    "threshold": alloc["alert_threshold_percent"]
                })

        return BudgetStatistics(
            total_budget=total_budget,
            allocated_amount=allocated,
            spent_amount=spent,
            remaining_amount=remaining,
            utilization_percent=utilization,
            by_category=by_category,
            alerts=alerts
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching budget statistics: {str(e)}")
