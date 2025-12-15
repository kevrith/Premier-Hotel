"""
Customer Reviews & Ratings Schemas
Pydantic models for review management
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date


# =====================================================
# Review Categories Schemas
# =====================================================

class ReviewCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    display_order: int = 0
    is_active: bool = True


class ReviewCategoryCreate(ReviewCategoryBase):
    pass


class ReviewCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class ReviewCategoryResponse(ReviewCategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Reviews Schemas
# =====================================================

class ReviewBase(BaseModel):
    review_type: str = Field(..., pattern="^(room|service|food|overall|staff|amenities)$")
    overall_rating: int = Field(..., ge=1, le=5)

    # Optional category ratings
    cleanliness_rating: Optional[int] = Field(None, ge=1, le=5)
    comfort_rating: Optional[int] = Field(None, ge=1, le=5)
    location_rating: Optional[int] = Field(None, ge=1, le=5)
    facilities_rating: Optional[int] = Field(None, ge=1, le=5)
    staff_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)

    # Review content
    title: Optional[str] = Field(None, max_length=200)
    comment: str
    pros: Optional[str] = None
    cons: Optional[str] = None

    # Guest information
    guest_name: Optional[str] = Field(None, max_length=200)
    guest_type: Optional[str] = Field(None, pattern="^(solo|couple|family|business|group)$")

    # Stay information
    stay_date: Optional[date] = None


class ReviewCreate(ReviewBase):
    user_id: str
    booking_id: Optional[str] = None
    room_id: Optional[str] = None


class ReviewUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    overall_rating: Optional[int] = Field(None, ge=1, le=5)
    cleanliness_rating: Optional[int] = Field(None, ge=1, le=5)
    comfort_rating: Optional[int] = Field(None, ge=1, le=5)
    location_rating: Optional[int] = Field(None, ge=1, le=5)
    facilities_rating: Optional[int] = Field(None, ge=1, le=5)
    staff_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)


class ReviewModerate(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected|flagged|hidden)$")
    moderation_notes: Optional[str] = None


class ReviewResponse(ReviewBase):
    id: str
    review_number: str
    user_id: str
    booking_id: Optional[str] = None
    room_id: Optional[str] = None
    status: str
    is_verified: bool
    verified_stay: bool
    helpful_count: int
    not_helpful_count: int
    response_count: int
    view_count: int
    has_response: bool
    moderation_notes: Optional[str] = None
    moderated_by: Optional[str] = None
    moderated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Review Responses Schemas
# =====================================================

class ReviewResponseBase(BaseModel):
    response: str
    responder_name: Optional[str] = Field(None, max_length=200)
    responder_position: Optional[str] = Field(None, max_length=100)
    is_official: bool = True


class ReviewResponseCreate(ReviewResponseBase):
    review_id: str
    responder_id: str


class ReviewResponseUpdate(BaseModel):
    response: Optional[str] = None
    responder_name: Optional[str] = Field(None, max_length=200)
    responder_position: Optional[str] = Field(None, max_length=100)


class ReviewResponseResponse(ReviewResponseBase):
    id: str
    review_id: str
    responder_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Review Helpfulness Schemas
# =====================================================

class ReviewHelpfulnessCreate(BaseModel):
    review_id: str
    user_id: str
    is_helpful: bool


class ReviewHelpfulnessResponse(BaseModel):
    id: str
    review_id: str
    user_id: str
    is_helpful: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Review Images Schemas
# =====================================================

class ReviewImageBase(BaseModel):
    image_url: str
    caption: Optional[str] = None
    display_order: int = 0


class ReviewImageCreate(ReviewImageBase):
    review_id: str


class ReviewImageResponse(ReviewImageBase):
    id: str
    review_id: str
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Review Reports Schemas
# =====================================================

class ReviewReportBase(BaseModel):
    reason: str = Field(..., pattern="^(spam|offensive|fake|inappropriate|other)$")
    description: Optional[str] = None


class ReviewReportCreate(ReviewReportBase):
    review_id: str
    reported_by: str


class ReviewReportUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(pending|reviewing|resolved|dismissed)$")
    resolution_notes: Optional[str] = None


class ReviewReportResponse(ReviewReportBase):
    id: str
    review_id: str
    reported_by: str
    status: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Extended Response Models
# =====================================================

class ReviewWithDetails(ReviewResponse):
    """Review with additional details"""
    user_name: Optional[str] = None
    room_number: Optional[str] = None
    responses: List[ReviewResponseResponse] = []
    images: List[ReviewImageResponse] = []


class ReviewStats(BaseModel):
    """Statistics for reviews"""
    total_reviews: int = 0
    approved_reviews: int = 0
    pending_reviews: int = 0
    average_rating: float = 0.0
    average_cleanliness: Optional[float] = None
    average_comfort: Optional[float] = None
    average_location: Optional[float] = None
    average_facilities: Optional[float] = None
    average_staff: Optional[float] = None
    average_value: Optional[float] = None
    rating_distribution: dict = Field(default_factory=dict)  # {1: count, 2: count, ...}
    reviews_by_type: dict = Field(default_factory=dict)
    verification_rate: float = 0.0


class RoomReviewSummary(BaseModel):
    """Summary of reviews for a specific room"""
    room_id: str
    total_reviews: int
    average_rating: float
    rating_distribution: dict
    recent_reviews: List[ReviewResponse] = []


# =====================================================
# Query Parameters
# =====================================================

class ReviewFilters(BaseModel):
    """Query parameters for filtering reviews"""
    status: Optional[str] = None
    review_type: Optional[str] = None
    user_id: Optional[str] = None
    room_id: Optional[str] = None
    booking_id: Optional[str] = None
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    max_rating: Optional[int] = Field(None, ge=1, le=5)
    is_verified: Optional[bool] = None
    verified_stay: Optional[bool] = None
    has_response: Optional[bool] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    search: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    sort_by: str = Field(default="created_at", pattern="^(created_at|overall_rating|helpful_count)$")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
