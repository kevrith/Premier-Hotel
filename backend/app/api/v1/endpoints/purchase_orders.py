"""
Purchase Order Management API - Enterprise Level
Complete purchasing workflow: Create PO → Approve → Send → Receive → Pay
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
from app.middleware.auth_secure import get_current_user, require_role
from app.core.supabase import get_supabase
from supabase import Client
from pydantic import BaseModel, Field
import uuid

router = APIRouter()


# =====================================================
# PYDANTIC MODELS
# =====================================================

class SupplierCreate(BaseModel):
    name: str = Field(..., max_length=200)
    contact_person: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=100)
    payment_terms: Optional[str] = Field(None, max_length=100)
    credit_limit: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=100)
    payment_terms: Optional[str] = Field(None, max_length=100)
    credit_limit: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(active|inactive|blocked)$")
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class PurchaseOrderItemCreate(BaseModel):
    inventory_item_id: str
    quantity_ordered: float = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)
    discount_percentage: float = Field(0, ge=0, le=100)
    discount_amount: float = Field(0, ge=0)
    notes: Optional[str] = None


class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    expected_delivery_date: Optional[date] = None
    items: List[PurchaseOrderItemCreate]
    tax_amount: float = Field(0, ge=0)
    shipping_cost: float = Field(0, ge=0)
    discount_amount: float = Field(0, ge=0)
    payment_due_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    tax_amount: Optional[float] = Field(None, ge=0)
    shipping_cost: Optional[float] = Field(None, ge=0)
    discount_amount: Optional[float] = Field(None, ge=0)
    payment_due_date: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


class GoodsReceiptCreate(BaseModel):
    po_id: str
    receipt_date: date = Field(default_factory=date.today)
    items: List[Dict[str, Any]]  # [{po_item_id, quantity_received, quality_status, notes}]
    inspection_status: str = Field(..., pattern="^(passed|failed|partial)$")
    quality_notes: Optional[str] = None
    notes: Optional[str] = None


class PaymentRecord(BaseModel):
    amount: float = Field(..., gt=0)
    payment_date: date
    payment_method: str = Field(..., max_length=50)
    reference: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_po_number(supabase: Client) -> str:
    """Generate unique PO number: PO-YYYY-0001"""
    year = datetime.now().year

    # Get count of POs this year
    result = supabase.table("purchase_orders").select("po_number").like(
        "po_number", f"PO-{year}-%"
    ).execute()

    next_num = len(result.data) + 1
    return f"PO-{year}-{str(next_num).zfill(4)}"


def generate_grn_number(supabase: Client) -> str:
    """Generate unique GRN number: GRN-YYYY-0001"""
    year = datetime.now().year

    result = supabase.table("goods_received_notes").select("grn_number").like(
        "grn_number", f"GRN-{year}-%"
    ).execute()

    next_num = len(result.data) + 1
    return f"GRN-{year}-{str(next_num).zfill(4)}"


def generate_supplier_code(supabase: Client) -> str:
    """Generate unique supplier code: SUP-001"""
    result = supabase.table("suppliers").select("code").execute()
    next_num = len(result.data) + 1
    return f"SUP-{str(next_num).zfill(3)}"


# =====================================================
# SUPPLIER ENDPOINTS
# =====================================================

@router.get("/suppliers")
async def get_suppliers(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all suppliers with filters"""
    try:
        query = supabase.table("suppliers").select("*")

        if status_filter:
            query = query.eq("status", status_filter)

        if search:
            query = query.or_(f"name.ilike.%{search}%,code.ilike.%{search}%,contact_person.ilike.%{search}%")

        query = query.order("name").range(skip, skip + limit - 1)

        response = query.execute()

        return {
            "suppliers": response.data,
            "total": len(response.data),
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch suppliers: {str(e)}"
        )


@router.post("/suppliers")
async def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new supplier"""
    try:
        supplier_data = supplier.model_dump(exclude_none=True)
        supplier_data["code"] = generate_supplier_code(supabase)
        supplier_data["created_by_user_id"] = current_user["id"]

        response = supabase.table("suppliers").insert(supplier_data).execute()

        return response.data[0]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create supplier: {str(e)}"
        )


@router.patch("/suppliers/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    supplier: SupplierUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update supplier information"""
    try:
        update_data = supplier.model_dump(exclude_none=True)
        response = supabase.table("suppliers").update(update_data).eq("id", supplier_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update supplier: {str(e)}"
        )


# =====================================================
# PURCHASE ORDER ENDPOINTS
# =====================================================

@router.get("/")
async def get_purchase_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    supplier_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get purchase orders with filters"""
    try:
        query = supabase.table("purchase_orders").select(
            "*, suppliers(id, code, name, phone)"
        )

        if status_filter:
            query = query.eq("status", status_filter)

        if supplier_id:
            query = query.eq("supplier_id", supplier_id)

        if start_date:
            query = query.gte("order_date", start_date)

        if end_date:
            query = query.lte("order_date", end_date)

        query = query.order("created_at", desc=True).range(skip, skip + limit - 1)

        response = query.execute()

        return {
            "purchase_orders": response.data,
            "total": len(response.data),
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch purchase orders: {str(e)}"
        )


@router.get("/{po_id}")
async def get_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get purchase order details with items"""
    try:
        # Get PO
        po_response = supabase.table("purchase_orders").select(
            "*, suppliers(id, code, name, contact_person, phone, email, address)"
        ).eq("id", po_id).execute()

        if not po_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        po = po_response.data[0]

        # Get PO items
        items_response = supabase.table("purchase_order_items").select(
            "*, inventory_items(id, name, sku, unit_of_measure, cost_per_unit)"
        ).eq("po_id", po_id).execute()

        po["items"] = items_response.data

        return po

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch purchase order: {str(e)}"
        )


@router.post("/")
async def create_purchase_order(
    po: PurchaseOrderCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new purchase order"""
    try:
        # Calculate totals
        subtotal = sum(
            item.quantity_ordered * item.unit_cost - item.discount_amount
            for item in po.items
        )

        total = subtotal + po.tax_amount + po.shipping_cost - po.discount_amount

        # Create PO
        po_data = {
            "po_number": generate_po_number(supabase),
            "supplier_id": po.supplier_id,
            "order_date": date.today().isoformat(),
            "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
            "status": "draft",
            "subtotal": float(subtotal),
            "tax_amount": po.tax_amount,
            "discount_amount": po.discount_amount,
            "shipping_cost": po.shipping_cost,
            "total": float(total),
            "payment_status": "pending",
            "payment_due_date": po.payment_due_date.isoformat() if po.payment_due_date else None,
            "notes": po.notes,
            "terms": po.terms,
            "created_by_user_id": current_user["id"]
        }

        po_response = supabase.table("purchase_orders").insert(po_data).execute()
        created_po = po_response.data[0]

        # Create PO items
        po_items = []
        for item in po.items:
            po_items.append({
                "po_id": created_po["id"],
                "inventory_item_id": item.inventory_item_id,
                "quantity_ordered": item.quantity_ordered,
                "unit_cost": item.unit_cost,
                "discount_percentage": item.discount_percentage,
                "discount_amount": item.discount_amount,
                "notes": item.notes
            })

        supabase.table("purchase_order_items").insert(po_items).execute()

        # Return full PO with items
        return await get_purchase_order(created_po["id"], current_user, supabase)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create purchase order: {str(e)}"
        )


@router.patch("/{po_id}")
async def update_purchase_order(
    po_id: str,
    po: PurchaseOrderUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update purchase order (only in draft status)"""
    try:
        # Check PO exists and is editable
        existing = supabase.table("purchase_orders").select("status").eq("id", po_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        if existing.data[0]["status"] not in ["draft"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update draft purchase orders"
            )

        # Update PO
        update_data = po.model_dump(exclude_none=True)
        response = supabase.table("purchase_orders").update(update_data).eq("id", po_id).execute()

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update purchase order: {str(e)}"
        )


@router.post("/{po_id}/approve")
async def approve_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Approve a purchase order"""
    try:
        # Check PO status
        po = supabase.table("purchase_orders").select("status, total").eq("id", po_id).execute()

        if not po.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        if po.data[0]["status"] != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only approve draft purchase orders"
            )

        # TODO: Check approval limits based on user role and amount
        # For now, allow all managers/admins to approve

        # Update status
        response = supabase.table("purchase_orders").update({
            "status": "approved",
            "approved_by_user_id": current_user["id"]
        }).eq("id", po_id).execute()

        return {
            "success": True,
            "message": "Purchase order approved",
            "po": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve purchase order: {str(e)}"
        )


@router.post("/{po_id}/send")
async def send_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Mark purchase order as sent to supplier"""
    try:
        # Check PO status
        po = supabase.table("purchase_orders").select("status").eq("id", po_id).execute()

        if not po.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        if po.data[0]["status"] not in ["approved"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only send approved purchase orders"
            )

        # Update status
        response = supabase.table("purchase_orders").update({
            "status": "sent"
        }).eq("id", po_id).execute()

        # TODO: Send email/SMS to supplier

        return {
            "success": True,
            "message": "Purchase order sent to supplier",
            "po": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send purchase order: {str(e)}"
        )


@router.post("/{po_id}/cancel")
async def cancel_purchase_order(
    po_id: str,
    reason: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Cancel a purchase order"""
    try:
        # Check PO status
        po = supabase.table("purchase_orders").select("status").eq("id", po_id).execute()

        if not po.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        if po.data[0]["status"] in ["received", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel received or already cancelled purchase orders"
            )

        # Update status
        response = supabase.table("purchase_orders").update({
            "status": "cancelled",
            "notes": f"Cancelled: {reason}\n\n{po.data[0].get('notes', '')}"
        }).eq("id", po_id).execute()

        return {
            "success": True,
            "message": "Purchase order cancelled",
            "po": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel purchase order: {str(e)}"
        )


# =====================================================
# GOODS RECEIPT NOTE (GRN) ENDPOINTS
# =====================================================

@router.post("/{po_id}/receive")
async def receive_purchase_order(
    po_id: str,
    grn: GoodsReceiptCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Receive goods against a purchase order
    This is the CRITICAL endpoint that auto-updates inventory
    """
    try:
        # Get PO details
        po = supabase.table("purchase_orders").select(
            "*, suppliers(id, name)"
        ).eq("id", po_id).execute()

        if not po.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        po_data = po.data[0]

        if po_data["status"] not in ["sent", "confirmed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only receive sent or confirmed purchase orders"
            )

        # Get PO items
        po_items = supabase.table("purchase_order_items").select(
            "*, inventory_items(id, name, current_stock, unit_of_measure, cost_per_unit)"
        ).eq("po_id", po_id).execute()

        # Create GRN
        grn_number = generate_grn_number(supabase)
        grn_data = {
            "grn_number": grn_number,
            "po_id": po_id,
            "supplier_id": po_data["supplier_id"],
            "receipt_date": grn.receipt_date.isoformat(),
            "received_by_user_id": current_user["id"],
            "inspection_status": grn.inspection_status,
            "quality_notes": grn.quality_notes,
            "notes": grn.notes
        }

        grn_response = supabase.table("goods_received_notes").insert(grn_data).execute()
        created_grn = grn_response.data[0]

        # Process each received item
        total_ordered = 0
        total_received = 0
        total_damaged = 0
        total_rejected = 0

        for received_item in grn.items:
            po_item_id = received_item["po_item_id"]
            qty_received = received_item["quantity_received"]
            quality_status = received_item.get("quality_status", "good")

            # Find matching PO item
            po_item = next((item for item in po_items.data if item["id"] == po_item_id), None)

            if not po_item:
                continue

            total_ordered += po_item["quantity_ordered"]
            total_received += qty_received

            if quality_status == "damaged":
                total_damaged += qty_received
            elif quality_status == "rejected":
                total_rejected += qty_received

            # Update PO item received quantity
            supabase.table("purchase_order_items").update({
                "quantity_received": qty_received,
                "quality_status": quality_status,
                "notes": received_item.get("notes")
            }).eq("id", po_item_id).execute()

            # **CRITICAL: AUTO-UPDATE INVENTORY**
            if quality_status == "good":
                inventory_item = po_item["inventory_items"]
                current_stock = float(inventory_item["current_stock"])
                new_stock = current_stock + qty_received

                # Update inventory stock
                supabase.table("inventory_items").update({
                    "current_stock": new_stock,
                    "last_restocked_at": datetime.now().isoformat(),
                    "last_restocked_by": current_user["id"]
                }).eq("id", inventory_item["id"]).execute()

                # Create inventory transaction
                transaction = {
                    "inventory_item_id": inventory_item["id"],
                    "transaction_type": "purchase",
                    "quantity": qty_received,
                    "unit_cost": po_item["unit_cost"],
                    "total_cost": qty_received * po_item["unit_cost"],
                    "stock_before": current_stock,
                    "stock_after": new_stock,
                    "reference_type": "purchase_order",
                    "reference_id": po_id,
                    "notes": f"GRN: {grn_number}, PO: {po_data['po_number']}",
                    "created_by_user_id": current_user["id"]
                }

                supabase.table("inventory_transactions").insert(transaction).execute()

                # Check and resolve low stock alerts
                if new_stock > inventory_item.get("reorder_point", 0):
                    supabase.table("inventory_alerts").update({
                        "is_resolved": True,
                        "resolved_at": datetime.now().isoformat(),
                        "resolved_by_user_id": current_user["id"]
                    }).eq("inventory_item_id", inventory_item["id"]).eq(
                        "is_resolved", False
                    ).execute()

        # Update GRN summary
        supabase.table("goods_received_notes").update({
            "total_items_ordered": total_ordered,
            "total_items_received": total_received,
            "total_items_damaged": total_damaged,
            "total_items_rejected": total_rejected
        }).eq("id", created_grn["id"]).execute()

        # Update PO status
        if total_received >= total_ordered:
            po_status = "received"
        else:
            po_status = "partially_received"

        supabase.table("purchase_orders").update({
            "status": po_status,
            "actual_delivery_date": grn.receipt_date.isoformat()
        }).eq("id", po_id).execute()

        return {
            "success": True,
            "message": "Goods received and inventory updated",
            "grn": created_grn,
            "summary": {
                "po_number": po_data["po_number"],
                "grn_number": grn_number,
                "supplier": po_data["suppliers"]["name"],
                "total_ordered": total_ordered,
                "total_received": total_received,
                "total_damaged": total_damaged,
                "total_rejected": total_rejected,
                "discrepancy": total_ordered - total_received
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to receive goods: {str(e)}"
        )


@router.get("/grn")
async def get_goods_received_notes(
    po_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get goods received notes"""
    try:
        query = supabase.table("goods_received_notes").select(
            "*, purchase_orders(po_number, total), suppliers(name)"
        )

        if po_id:
            query = query.eq("po_id", po_id)

        if start_date:
            query = query.gte("receipt_date", start_date)

        if end_date:
            query = query.lte("receipt_date", end_date)

        query = query.order("created_at", desc=True).range(skip, skip + limit - 1)

        response = query.execute()

        return {
            "grns": response.data,
            "total": len(response.data),
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch GRNs: {str(e)}"
        )


# =====================================================
# PAYMENT & RECONCILIATION
# =====================================================

@router.post("/{po_id}/record-payment")
async def record_payment(
    po_id: str,
    payment: PaymentRecord,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Record payment for a purchase order"""
    try:
        # Get PO
        po = supabase.table("purchase_orders").select("total, amount_paid").eq("id", po_id).execute()

        if not po.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase order not found"
            )

        po_data = po.data[0]
        current_paid = float(po_data.get("amount_paid", 0))
        new_paid = current_paid + payment.amount
        total = float(po_data["total"])

        if new_paid > total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount exceeds PO total. Outstanding: {total - current_paid}"
            )

        # Determine payment status
        if new_paid >= total:
            payment_status = "paid"
        elif new_paid > 0:
            payment_status = "partial"
        else:
            payment_status = "pending"

        # Update PO
        response = supabase.table("purchase_orders").update({
            "amount_paid": new_paid,
            "payment_status": payment_status
        }).eq("id", po_id).execute()

        # TODO: Record payment in payments table

        return {
            "success": True,
            "message": "Payment recorded",
            "po": response.data[0],
            "payment_summary": {
                "amount_paid": payment.amount,
                "total_paid": new_paid,
                "total_amount": total,
                "outstanding": total - new_paid,
                "status": payment_status
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record payment: {str(e)}"
        )


# =====================================================
# DASHBOARD & STATISTICS
# =====================================================

@router.get("/dashboard/stats")
async def get_po_dashboard_stats(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get purchase order dashboard statistics"""
    try:
        # Get all POs
        pos = supabase.table("purchase_orders").select("status, total, payment_status, amount_paid").execute()

        # Calculate stats
        total_pos = len(pos.data)
        draft_pos = len([p for p in pos.data if p["status"] == "draft"])
        pending_pos = len([p for p in pos.data if p["status"] in ["sent", "confirmed"]])
        received_pos = len([p for p in pos.data if p["status"] == "received"])

        total_value = sum(float(p["total"]) for p in pos.data)
        total_paid = sum(float(p.get("amount_paid", 0)) for p in pos.data)
        outstanding = total_value - total_paid

        # Pending deliveries (sent but not received)
        pending_deliveries = supabase.table("purchase_orders").select(
            "*, suppliers(name)"
        ).in_("status", ["sent", "confirmed"]).execute()

        return {
            "total_purchase_orders": total_pos,
            "draft_pos": draft_pos,
            "pending_delivery": pending_pos,
            "received_pos": received_pos,
            "total_value": total_value,
            "total_paid": total_paid,
            "outstanding_payments": outstanding,
            "currency": "KES",
            "pending_deliveries": pending_deliveries.data
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}"
        )
