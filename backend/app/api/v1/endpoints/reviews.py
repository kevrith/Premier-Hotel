"""
Customer Reviews & Ratings API Endpoints
Handles review creation, moderation, responses, and statistics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime
import random
import string

from app.core.supabase import get_supabase_client
from app.core.auth import get_current_user, require_role
from app.schemas.reviews import (
    ReviewCategoryCreate,
    ReviewCategoryUpdate,
    ReviewCategoryResponse,
    ReviewCreate,
    ReviewUpdate,
    ReviewModerate,
    ReviewResponse,
    ReviewResponseCreate,
    ReviewResponseUpdate,
    ReviewResponseResponse,
    ReviewHelpfulnessCreate,
    ReviewHelpfulnessResponse,
    ReviewImageCreate,
    ReviewImageResponse,
    ReviewReportCreate,
    ReviewReportUpdate,
    ReviewReportResponse,
    ReviewStats,
    RoomReviewSummary,
)

router = APIRouter()


# =====================================================
# Helper Functions
# =====================================================

def generate_review_number() -> str:
    """Generate unique review number (e.g., RV-2024-001234)"""
    year = datetime.now().year
    random_digits = ''.join(random.choices(string.digits, k=6))
    return f"RV-{year}-{random_digits}"


# =====================================================
# Review Categories Endpoints
# =====================================================

@router.get("/categories", response_model=List[ReviewCategoryResponse])
async def get_review_categories(
    is_active: Optional[bool] = Query(True),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all review categories"""
    try:
        query = supabase.table("review_categories").select("*")
        if is_active is not None:
            query = query.eq("is_active", is_active)
        query = query.order("display_order")
        result = query.execute()
        return [ReviewCategoryResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")


# =====================================================
# Reviews Endpoints
# =====================================================

@router.get("/", response_model=List[ReviewResponse])
async def get_reviews(
    status: Optional[str] = None,
    review_type: Optional[str] = None,
    room_id: Optional[str] = None,
    min_rating: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    supabase: Client = Depends(get_supabase_client)
):
    """Get reviews with filters"""
    try:
        query = supabase.table("reviews").select("*")

        if status:
            query = query.eq("status", status)
        else:
            query = query.eq("status", "approved")

        if review_type:
            query = query.eq("review_type", review_type)
        if room_id:
            query = query.eq("room_id", room_id)
        if min_rating:
            query = query.gte("overall_rating", min_rating)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        return [ReviewResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reviews: {str(e)}")


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get a specific review"""
    try:
        result = supabase.table("reviews").select("*").eq("id", review_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Review not found")
        return ReviewResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching review: {str(e)}")


@router.post("/", response_model=ReviewResponse)
async def create_review(
    review: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new review"""
    try:
        review_data = review.model_dump()
        review_data["review_number"] = generate_review_number()
        review_data["status"] = "pending"
        review_data["user_id"] = current_user["id"]

        result = supabase.table("reviews").insert(review_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create review")
        return ReviewResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating review: {str(e)}")


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    updates: ReviewUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update a review"""
    try:
        existing = supabase.table("reviews").select("*").eq("id", review_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Review not found")

        review_data = existing.data[0]
        if review_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        if review_data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Can only update pending reviews")

        update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        result = supabase.table("reviews").update(update_data).eq("id", review_id).execute()
        return ReviewResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating review: {str(e)}")


@router.patch("/{review_id}/moderate", response_model=ReviewResponse)
async def moderate_review(
    review_id: str,
    moderation: ReviewModerate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_client)
):
    """Moderate a review (approve/reject/flag)"""
    try:
        update_data = {
            "status": moderation.status,
            "moderation_notes": moderation.moderation_notes,
            "moderated_by": current_user["id"],
            "moderated_at": datetime.now().isoformat()
        }

        result = supabase.table("reviews").update(update_data).eq("id", review_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Review not found")
        return ReviewResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error moderating review: {str(e)}")


@router.delete("/{review_id}")
async def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a review"""
    try:
        existing = supabase.table("reviews").select("*").eq("id", review_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Review not found")

        review_data = existing.data[0]
        if review_data["user_id"] != current_user["id"]:
            user_role = current_user.get("user_metadata", {}).get("role", "customer")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Access denied")

        result = supabase.table("reviews").delete().eq("id", review_id).execute()
        return {"message": "Review deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting review: {str(e)}")


# =====================================================
# Review Responses Endpoints
# =====================================================

@router.post("/{review_id}/responses", response_model=ReviewResponseResponse)
async def create_review_response(
    review_id: str,
    response: ReviewResponseCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase_client)
):
    """Add a response to a review"""
    try:
        response_data = response.model_dump()
        response_data["review_id"] = review_id
        response_data["responder_id"] = current_user["id"]

        result = supabase.table("review_responses").insert(response_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create response")
        return ReviewResponseResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating response: {str(e)}")


@router.get("/{review_id}/responses", response_model=List[ReviewResponseResponse])
async def get_review_responses(
    review_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get all responses for a review"""
    try:
        result = supabase.table("review_responses").select("*").eq("review_id", review_id).order("created_at").execute()
        return [ReviewResponseResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching responses: {str(e)}")


# =====================================================
# Helpfulness Endpoints
# =====================================================

@router.post("/{review_id}/helpful", response_model=ReviewHelpfulnessResponse)
async def mark_review_helpful(
    review_id: str,
    is_helpful: bool,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Mark a review as helpful or not helpful"""
    try:
        helpfulness_data = {
            "review_id": review_id,
            "user_id": current_user["id"],
            "is_helpful": is_helpful
        }

        result = supabase.table("review_helpfulness").upsert(helpfulness_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to mark helpfulness")
        return ReviewHelpfulnessResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error marking helpfulness: {str(e)}")


# =====================================================
# Statistics Endpoints
# =====================================================

@router.get("/stats/overview", response_model=ReviewStats)
async def get_review_stats(
    room_id: Optional[str] = None,
    supabase: Client = Depends(get_supabase_client)
):
    """Get review statistics"""
    try:
        query = supabase.table("reviews").select("*")
        if room_id:
            query = query.eq("room_id", room_id)

        result = query.execute()
        reviews = result.data

        total = len(reviews)
        approved = len([r for r in reviews if r["status"] == "approved"])
        pending = len([r for r in reviews if r["status"] == "pending"])

        if total == 0:
            return ReviewStats()

        avg_rating = sum(r["overall_rating"] for r in reviews) / total if total > 0 else 0.0

        rating_dist = {str(i): 0 for i in range(1, 6)}
        for r in reviews:
            rating = str(r["overall_rating"])
            rating_dist[rating] = rating_dist.get(rating, 0) + 1

        return ReviewStats(
            total_reviews=total,
            approved_reviews=approved,
            pending_reviews=pending,
            average_rating=round(avg_rating, 2),
            rating_distribution=rating_dist
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating statistics: {str(e)}")


@router.get("/rooms/{room_id}/summary", response_model=RoomReviewSummary)
async def get_room_review_summary(
    room_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get review summary for a specific room"""
    try:
        result = supabase.table("reviews").select("*").eq("room_id", room_id).eq("status", "approved").execute()
        reviews = result.data

        total = len(reviews)
        avg_rating = sum(r["overall_rating"] for r in reviews) / total if total > 0 else 0.0

        rating_dist = {str(i): 0 for i in range(1, 6)}
        for r in reviews:
            rating = str(r["overall_rating"])
            rating_dist[rating] = rating_dist.get(rating, 0) + 1

        recent = sorted(reviews, key=lambda x: x["created_at"], reverse=True)[:5]

        return RoomReviewSummary(
            room_id=room_id,
            total_reviews=total,
            average_rating=round(avg_rating, 2),
            rating_distribution=rating_dist,
            recent_reviews=[ReviewResponse(**r) for r in recent]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching room summary: {str(e)}")
