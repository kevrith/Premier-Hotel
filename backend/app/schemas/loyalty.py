"""
Loyalty Program Pydantic Schemas
Validation schemas for loyalty accounts, points, rewards, and redemptions
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal


# =====================================================
# LOYALTY TIER SCHEMAS
# =====================================================

class LoyaltyTierBase(BaseModel):
    tier_name: str = Field(..., max_length=50)
    tier_level: int = Field(..., ge=1)
    min_points: int = Field(default=0, ge=0)
    max_points: Optional[int] = None
    points_multiplier: Decimal = Field(default=Decimal("1.00"), ge=1.00)
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    benefits: Optional[Dict[str, Any]] = None
    tier_color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)
    is_active: bool = True
    display_order: int = 0


class LoyaltyTierCreate(LoyaltyTierBase):
    pass


class LoyaltyTierUpdate(BaseModel):
    tier_name: Optional[str] = Field(None, max_length=50)
    tier_level: Optional[int] = Field(None, ge=1)
    min_points: Optional[int] = Field(None, ge=0)
    max_points: Optional[int] = None
    points_multiplier: Optional[Decimal] = Field(None, ge=1.00)
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    benefits: Optional[Dict[str, Any]] = None
    tier_color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class LoyaltyTierResponse(LoyaltyTierBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# LOYALTY ACCOUNT SCHEMAS
# =====================================================

class LoyaltyAccountBase(BaseModel):
    user_id: str
    member_number: str = Field(..., max_length=50)
    current_points: int = Field(default=0, ge=0)
    lifetime_points: int = Field(default=0, ge=0)
    tier_id: Optional[str] = None
    tier_name: str = Field(default='bronze', max_length=50)
    joined_date: date
    is_active: bool = True


class LoyaltyAccountCreate(BaseModel):
    user_id: str


class LoyaltyAccountUpdate(BaseModel):
    current_points: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class LoyaltyAccountResponse(LoyaltyAccountBase):
    id: str
    last_activity_date: Optional[date] = None
    points_expiring_soon: int = 0
    next_tier_points: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# LOYALTY TRANSACTION SCHEMAS
# =====================================================

class LoyaltyTransactionBase(BaseModel):
    account_id: str
    user_id: str
    transaction_type: str = Field(..., pattern="^(earn|redeem|expire|bonus|refund|adjustment)$")
    points: int
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_id: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    notes: Optional[str] = None


class LoyaltyTransactionCreate(LoyaltyTransactionBase):
    multiplier_applied: Decimal = Field(default=Decimal("1.00"))
    expires_at: Optional[date] = None


class LoyaltyTransactionResponse(LoyaltyTransactionBase):
    id: str
    balance_after: int
    multiplier_applied: Decimal
    expires_at: Optional[date] = None
    is_expired: bool
    created_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# REWARDS CATALOG SCHEMAS
# =====================================================

class RewardBase(BaseModel):
    reward_code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    reward_type: str = Field(..., pattern="^(discount|free_night|room_upgrade|free_meal|spa_voucher|gift_card|experience|other)$")
    points_cost: int = Field(..., gt=0)
    monetary_value: Optional[Decimal] = None
    min_tier_required: Optional[str] = Field(None, max_length=50)
    max_redemptions_per_user: Optional[int] = None
    total_available: Optional[int] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    terms_conditions: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_featured: bool = False
    is_active: bool = True
    display_order: int = 0


class RewardCreate(RewardBase):
    pass


class RewardUpdate(BaseModel):
    reward_code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    reward_type: Optional[str] = Field(None, pattern="^(discount|free_night|room_upgrade|free_meal|spa_voucher|gift_card|experience|other)$")
    points_cost: Optional[int] = Field(None, gt=0)
    monetary_value: Optional[Decimal] = None
    min_tier_required: Optional[str] = Field(None, max_length=50)
    max_redemptions_per_user: Optional[int] = None
    total_available: Optional[int] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    terms_conditions: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class RewardResponse(RewardBase):
    id: str
    total_redeemed: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# REWARD REDEMPTION SCHEMAS
# =====================================================

class RewardRedemptionBase(BaseModel):
    account_id: str
    user_id: str
    reward_id: str
    points_redeemed: int


class RewardRedemptionCreate(BaseModel):
    reward_id: str


class RewardRedemptionUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|used|expired|cancelled)$")
    used_reference_type: Optional[str] = Field(None, max_length=50)
    used_reference_id: Optional[str] = None
    cancellation_reason: Optional[str] = None
    notes: Optional[str] = None


class RewardRedemptionResponse(RewardRedemptionBase):
    id: str
    redemption_code: str
    status: str
    redeemed_at: datetime
    expires_at: Optional[date] = None
    used_at: Optional[datetime] = None
    used_reference_type: Optional[str] = None
    used_reference_id: Optional[str] = None
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# REFERRAL SCHEMAS
# =====================================================

class ReferralBase(BaseModel):
    referrer_id: str
    referral_code: str = Field(..., max_length=50)
    referee_email: Optional[str] = Field(None, max_length=100)
    referee_name: Optional[str] = Field(None, max_length=200)


class ReferralCreate(BaseModel):
    referee_email: str = Field(..., max_length=100)
    referee_name: Optional[str] = Field(None, max_length=200)


class ReferralUpdate(BaseModel):
    referee_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|completed|cancelled)$")
    points_awarded: Optional[int] = None


class ReferralResponse(ReferralBase):
    id: str
    referee_id: Optional[str] = None
    status: str
    points_awarded: int
    awarded_at: Optional[datetime] = None
    signup_completed_at: Optional[datetime] = None
    first_booking_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# SPECIAL OFFER SCHEMAS
# =====================================================

class SpecialOfferBase(BaseModel):
    offer_code: str = Field(..., max_length=50)
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    offer_type: str = Field(..., pattern="^(points_multiplier|bonus_points|tier_bonus|birthday_bonus|seasonal)$")
    points_value: Optional[int] = None
    multiplier: Optional[Decimal] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    min_tier_required: Optional[str] = Field(None, max_length=50)
    max_uses_per_user: Optional[int] = None
    is_active: bool = True


class SpecialOfferCreate(SpecialOfferBase):
    pass


class SpecialOfferUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    points_value: Optional[int] = None
    multiplier: Optional[Decimal] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class SpecialOfferResponse(SpecialOfferBase):
    id: str
    total_uses: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# POINTS EARNING SCHEMAS
# =====================================================

class PointsEarnRequest(BaseModel):
    user_id: str
    points: int = Field(..., gt=0)
    reference_type: str = Field(..., max_length=50)
    reference_id: str
    description: str


class PointsRedeemRequest(BaseModel):
    points: int = Field(..., gt=0)
    reason: str


# =====================================================
# STATISTICS SCHEMAS
# =====================================================

class LoyaltyStatistics(BaseModel):
    total_members: int
    active_members: int
    total_points_issued: int
    total_points_redeemed: int
    total_rewards_redeemed: int
    by_tier: Dict[str, int]
    recent_transactions: List[LoyaltyTransactionResponse]


class MemberSummary(BaseModel):
    account_id: str
    member_number: str
    user_id: str
    current_points: int
    lifetime_points: int
    tier_name: str
    tier_color: Optional[str]
    points_multiplier: Decimal
    discount_percent: Decimal
    points_to_next_tier: Optional[int]
    next_tier_name: Optional[str]
    points_expiring_soon: int
    recent_transactions: List[LoyaltyTransactionResponse]
    available_rewards: List[RewardResponse]
