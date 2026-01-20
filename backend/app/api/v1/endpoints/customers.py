"""
Customer history and lookup endpoints.
Provides customer search, autocomplete, and history tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.middleware.auth_secure import get_current_user

router = APIRouter()


class CustomerSearchResult(BaseModel):
    """Customer search result"""
    id: str
    customer_name: str
    customer_phone: str
    total_orders: int
    last_order_date: datetime
    preferred_table: Optional[str] = None


class CustomerDetail(BaseModel):
    """Detailed customer information"""
    id: str
    customer_name: str
    customer_phone: str
    email: Optional[str] = None
    total_orders: int
    total_spent: float
    last_order_date: datetime
    first_order_date: datetime
    preferred_table: Optional[str] = None
    dietary_preferences: List[str] = []
    notes: Optional[str] = None


class CustomerUpsertRequest(BaseModel):
    """Request to create or update customer history"""
    customer_name: str = Field(..., min_length=1, max_length=255)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    order_amount: float = Field(default=0, ge=0)


@router.get("/search", response_model=List[CustomerSearchResult])
async def search_customers(
    request: Request,
    q: str = Query(..., min_length=1, description="Search term (name or phone)"),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """
    Search for customers by name or phone number.
    Returns matching customers sorted by frequency (total orders).
    """
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        # Check if search term looks like a phone number
        if q.replace('+', '').replace(' ', '').replace('-', '').isdigit():
            # Search by phone
            response = supabase.rpc(
                'get_customer_by_phone',
                {'p_phone': q}
            ).execute()
        else:
            # Search by name
            response = supabase.rpc(
                'search_customers_by_name',
                {'p_search_term': q, 'p_limit': limit}
            ).execute()

        if not response.data:
            return []

        return [CustomerSearchResult(**customer) for customer in response.data]

    except Exception as e:
        print(f"Error searching customers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search customers: {str(e)}")


@router.get("/phone/{phone}", response_model=Optional[CustomerDetail])
async def get_customer_by_phone(
    request: Request,
    phone: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get customer details by phone number.
    Returns customer info if found, None otherwise.
    """
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        response = supabase.rpc(
            'get_customer_by_phone',
            {'p_phone': phone}
        ).execute()

        if not response.data or len(response.data) == 0:
            return None

        customer_data = response.data[0]

        # Fetch full customer details
        full_response = supabase.table('customer_history').select('*').eq('id', customer_data['id']).single().execute()

        return CustomerDetail(**full_response.data)

    except Exception as e:
        print(f"Error getting customer by phone: {e}")
        return None


@router.get("/frequent", response_model=List[CustomerSearchResult])
async def get_frequent_customers(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of frequent customers sorted by total orders.
    Useful for quick access to regular patrons.
    """
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        response = supabase.table('customer_history')\
            .select('id, customer_name, customer_phone, total_orders, last_order_date, preferred_table')\
            .order('total_orders', desc=True)\
            .order('last_order_date', desc=True)\
            .limit(limit)\
            .execute()

        return [CustomerSearchResult(**customer) for customer in response.data]

    except Exception as e:
        print(f"Error getting frequent customers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get frequent customers: {str(e)}")


@router.post("/upsert", response_model=dict)
async def upsert_customer(
    req: Request,
    data: CustomerUpsertRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create or update customer history.
    Called when an order is placed to track customer frequency.
    """
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        response = supabase.rpc(
            'upsert_customer_history',
            {
                'p_customer_name': data.customer_name,
                'p_customer_phone': data.customer_phone,
                'p_order_amount': data.order_amount
            }
        ).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to upsert customer")

        customer_id = response.data

        return {
            "success": True,
            "customer_id": customer_id,
            "message": "Customer history updated successfully"
        }

    except Exception as e:
        print(f"Error upserting customer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upsert customer: {str(e)}")


@router.get("/{customer_id}", response_model=CustomerDetail)
async def get_customer_details(
    request: Request,
    customer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed customer information by ID.
    """
    from app.core.config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        response = supabase.table('customer_history')\
            .select('*')\
            .eq('id', customer_id)\
            .single()\
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Customer not found")

        return CustomerDetail(**response.data)

    except Exception as e:
        print(f"Error getting customer details: {e}")
        raise HTTPException(status_code=404, detail="Customer not found")
