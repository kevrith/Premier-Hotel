"""
Loyalty Program API Endpoints
Handles loyalty accounts, points, rewards, and redemptions
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, date
from supabase import Client
from decimal import Decimal

from app.core.supabase import get_supabase
from app.middleware.auth import require_role, get_current_user
from app.schemas.loyalty import (
    # Tiers
    LoyaltyTierCreate, LoyaltyTierUpdate, LoyaltyTierResponse,
    # Accounts
    LoyaltyAccountCreate, LoyaltyAccountUpdate, LoyaltyAccountResponse,
    # Transactions
    LoyaltyTransactionCreate, LoyaltyTransactionResponse,
    # Rewards
    RewardCreate, RewardUpdate, RewardResponse,
    # Redemptions
    RewardRedemptionCreate, RewardRedemptionUpdate, RewardRedemptionResponse,
    # Referrals
    ReferralCreate, ReferralUpdate, ReferralResponse,
    # Special Offers
    SpecialOfferCreate, SpecialOfferUpdate, SpecialOfferResponse,
    # Points
    PointsEarnRequest, PointsRedeemRequest,
    # Statistics
    LoyaltyStatistics, MemberSummary
)

router = APIRouter()


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_redemption_code() -> str:
    """Generate unique redemption code"""
    return f"RDM-{datetime.now().strftime('%Y%m%d%H%M%S')}"


def generate_referral_code(user_id: str) -> str:
    """Generate unique referral code"""
    return f"REF-{user_id[:8].upper()}-{datetime.now().strftime('%m%d')}"


# =====================================================
# LOYALTY TIER ENDPOINTS
# =====================================================

@router.get("/tiers", response_model=List[LoyaltyTierResponse])
async def get_loyalty_tiers(
    is_active: Optional[bool] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """Get all loyalty tiers (public endpoint)"""
    query = supabase.table("loyalty_tiers").select("*")

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("tier_level")
    result = query.execute()

    return [LoyaltyTierResponse(**tier) for tier in result.data]


@router.post("/tiers", response_model=LoyaltyTierResponse)
async def create_tier(
    tier: LoyaltyTierCreate,
    current_user: dict = Depends(require_role(["admin"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new loyalty tier"""
    tier_data = tier.model_dump()

    result = supabase.table("loyalty_tiers").insert(tier_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create tier")

    return LoyaltyTierResponse(**result.data[0])


@router.patch("/tiers/{tier_id}", response_model=LoyaltyTierResponse)
async def update_tier(
    tier_id: str,
    tier: LoyaltyTierUpdate,
    current_user: dict = Depends(require_role(["admin"])),
    supabase: Client = Depends(get_supabase)
):
    """Update loyalty tier"""
    update_data = tier.model_dump(exclude_unset=True)

    result = supabase.table("loyalty_tiers").update(update_data).eq("id", tier_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Tier not found")

    return LoyaltyTierResponse(**result.data[0])


# =====================================================
# LOYALTY ACCOUNT ENDPOINTS
# =====================================================

@router.get("/account", response_model=LoyaltyAccountResponse)
async def get_my_account(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's loyalty account"""
    result = supabase.table("loyalty_accounts").select("*").eq("user_id", current_user["id"]).execute()

    if not result.data:
        # Auto-create account if it doesn't exist
        account_data = {
            "user_id": current_user["id"],
            "member_number": f"M{datetime.now().strftime('%Y%m%d')}{current_user['id'][:6].upper()}",
            "tier_name": "bronze",
            "joined_date": date.today().isoformat()
        }
        result = supabase.table("loyalty_accounts").insert(account_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create loyalty account")

    return LoyaltyAccountResponse(**result.data[0])


@router.get("/accounts", response_model=List[LoyaltyAccountResponse])
async def get_all_accounts(
    tier_name: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all loyalty accounts (admin only)"""
    query = supabase.table("loyalty_accounts").select("*")

    if tier_name:
        query = query.eq("tier_name", tier_name)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("lifetime_points", desc=True).limit(limit).offset(offset)
    result = query.execute()

    return [LoyaltyAccountResponse(**account) for account in result.data]


@router.get("/accounts/{user_id}", response_model=LoyaltyAccountResponse)
async def get_account_by_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get loyalty account by user ID (admin only)"""
    result = supabase.table("loyalty_accounts").select("*").eq("user_id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Loyalty account not found")

    return LoyaltyAccountResponse(**result.data[0])


# =====================================================
# POINTS TRANSACTION ENDPOINTS
# =====================================================

@router.get("/transactions", response_model=List[LoyaltyTransactionResponse])
async def get_my_transactions(
    transaction_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's points transactions"""
    query = supabase.table("loyalty_transactions").select("*").eq("user_id", current_user["id"])

    if transaction_type:
        query = query.eq("transaction_type", transaction_type)

    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    result = query.execute()

    return [LoyaltyTransactionResponse(**txn) for txn in result.data]


@router.post("/points/earn", response_model=LoyaltyTransactionResponse)
async def earn_points(
    request: PointsEarnRequest,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Award points to a user (staff only)"""
    # Call the award_loyalty_points function
    result = supabase.rpc(
        "award_loyalty_points",
        {
            "p_user_id": request.user_id,
            "p_points": request.points,
            "p_reference_type": request.reference_type,
            "p_reference_id": request.reference_id,
            "p_description": request.description
        }
    ).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to award points")

    # Get the transaction
    txn_result = supabase.table("loyalty_transactions").select("*").eq("id", result.data).execute()

    if not txn_result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return LoyaltyTransactionResponse(**txn_result.data[0])


@router.post("/points/redeem", response_model=LoyaltyTransactionResponse)
async def redeem_points(
    request: PointsRedeemRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Redeem points (deduct from account)"""
    # Get account
    account_result = supabase.table("loyalty_accounts").select("*").eq("user_id", current_user["id"]).execute()

    if not account_result.data:
        raise HTTPException(status_code=404, detail="Loyalty account not found")

    account = account_result.data[0]

    if account["current_points"] < request.points:
        raise HTTPException(status_code=400, detail="Insufficient points")

    # Create redemption transaction
    txn_data = {
        "account_id": account["id"],
        "user_id": current_user["id"],
        "transaction_type": "redeem",
        "points": request.points,
        "balance_after": 0,  # Will be set by trigger
        "description": request.reason,
        "multiplier_applied": 1.0
    }

    result = supabase.table("loyalty_transactions").insert(txn_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to redeem points")

    return LoyaltyTransactionResponse(**result.data[0])


# =====================================================
# REWARDS CATALOG ENDPOINTS
# =====================================================

@router.get("/rewards", response_model=List[RewardResponse])
async def get_rewards(
    reward_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    is_featured: Optional[bool] = Query(None),
    supabase: Client = Depends(get_supabase)
):
    """Get rewards catalog (public for authenticated users)"""
    query = supabase.table("rewards_catalog").select("*")

    if is_active is not None:
        query = query.eq("is_active", is_active)

    if is_featured is not None:
        query = query.eq("is_featured", is_featured)

    if reward_type:
        query = query.eq("reward_type", reward_type)

    query = query.order("display_order").order("points_cost")
    result = query.execute()

    return [RewardResponse(**reward) for reward in result.data]


@router.post("/rewards", response_model=RewardResponse)
async def create_reward(
    reward: RewardCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new reward"""
    reward_data = reward.model_dump()

    result = supabase.table("rewards_catalog").insert(reward_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create reward")

    return RewardResponse(**result.data[0])


@router.get("/rewards/{reward_id}", response_model=RewardResponse)
async def get_reward(
    reward_id: str,
    supabase: Client = Depends(get_supabase)
):
    """Get reward by ID"""
    result = supabase.table("rewards_catalog").select("*").eq("id", reward_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Reward not found")

    return RewardResponse(**result.data[0])


@router.patch("/rewards/{reward_id}", response_model=RewardResponse)
async def update_reward(
    reward_id: str,
    reward: RewardUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update reward"""
    update_data = reward.model_dump(exclude_unset=True)

    result = supabase.table("rewards_catalog").update(update_data).eq("id", reward_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Reward not found")

    return RewardResponse(**result.data[0])


# =====================================================
# REWARD REDEMPTION ENDPOINTS
# =====================================================

@router.get("/redemptions", response_model=List[RewardRedemptionResponse])
async def get_my_redemptions(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's reward redemptions"""
    query = supabase.table("reward_redemptions").select("*").eq("user_id", current_user["id"])

    if status:
        query = query.eq("status", status)

    query = query.order("redeemed_at", desc=True)
    result = query.execute()

    return [RewardRedemptionResponse(**redemption) for redemption in result.data]


@router.post("/redemptions", response_model=RewardRedemptionResponse)
async def redeem_reward(
    redemption: RewardRedemptionCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Redeem a reward with points"""
    # Get reward
    reward_result = supabase.table("rewards_catalog").select("*").eq("id", redemption.reward_id).execute()

    if not reward_result.data:
        raise HTTPException(status_code=404, detail="Reward not found")

    reward = reward_result.data[0]

    if not reward["is_active"]:
        raise HTTPException(status_code=400, detail="Reward is not active")

    # Check availability
    if reward.get("total_available") and reward["total_redeemed"] >= reward["total_available"]:
        raise HTTPException(status_code=400, detail="Reward is no longer available")

    # Get account
    account_result = supabase.table("loyalty_accounts").select("*").eq("user_id", current_user["id"]).execute()

    if not account_result.data:
        raise HTTPException(status_code=404, detail="Loyalty account not found")

    account = account_result.data[0]

    # Check points
    if account["current_points"] < reward["points_cost"]:
        raise HTTPException(status_code=400, detail="Insufficient points")

    # Check tier requirement
    if reward.get("min_tier_required") and account["tier_name"] != reward["min_tier_required"]:
        # Check if user's tier is high enough
        user_tier_result = supabase.table("loyalty_tiers").select("tier_level").eq("tier_name", account["tier_name"]).execute()
        required_tier_result = supabase.table("loyalty_tiers").select("tier_level").eq("tier_name", reward["min_tier_required"]).execute()

        if user_tier_result.data and required_tier_result.data:
            if user_tier_result.data[0]["tier_level"] < required_tier_result.data[0]["tier_level"]:
                raise HTTPException(status_code=400, detail=f"Requires {reward['min_tier_required']} tier or higher")

    # Create redemption
    redemption_data = {
        "redemption_code": generate_redemption_code(),
        "account_id": account["id"],
        "user_id": current_user["id"],
        "reward_id": redemption.reward_id,
        "points_redeemed": reward["points_cost"],
        "status": "pending",
        "expires_at": (date.today() + timedelta(days=90)).isoformat() if reward.get("valid_until") is None else reward["valid_until"]
    }

    redemption_result = supabase.table("reward_redemptions").insert(redemption_data).execute()

    if not redemption_result.data:
        raise HTTPException(status_code=400, detail="Failed to redeem reward")

    # Deduct points
    points_txn_data = {
        "account_id": account["id"],
        "user_id": current_user["id"],
        "transaction_type": "redeem",
        "points": reward["points_cost"],
        "balance_after": 0,  # Will be set by trigger
        "reference_type": "reward_redemption",
        "reference_id": redemption_result.data[0]["id"],
        "description": f"Redeemed: {reward['name']}",
        "multiplier_applied": 1.0
    }

    supabase.table("loyalty_transactions").insert(points_txn_data).execute()

    return RewardRedemptionResponse(**redemption_result.data[0])


@router.patch("/redemptions/{redemption_id}", response_model=RewardRedemptionResponse)
async def update_redemption(
    redemption_id: str,
    redemption: RewardRedemptionUpdate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Update redemption status (staff only)"""
    update_data = redemption.model_dump(exclude_unset=True)

    if redemption.status == "used":
        update_data["used_at"] = datetime.now().isoformat()
    elif redemption.status == "cancelled":
        update_data["cancelled_at"] = datetime.now().isoformat()

    result = supabase.table("reward_redemptions").update(update_data).eq("id", redemption_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Redemption not found")

    return RewardRedemptionResponse(**result.data[0])


# =====================================================
# REFERRAL ENDPOINTS
# =====================================================

@router.get("/referrals", response_model=List[ReferralResponse])
async def get_my_referrals(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's referrals"""
    result = supabase.table("referrals").select("*").eq("referrer_id", current_user["id"]).order("created_at", desc=True).execute()

    return [ReferralResponse(**referral) for referral in result.data]


@router.post("/referrals", response_model=ReferralResponse)
async def create_referral(
    referral: ReferralCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create a new referral"""
    referral_data = referral.model_dump()
    referral_data["referrer_id"] = current_user["id"]
    referral_data["referral_code"] = generate_referral_code(current_user["id"])
    referral_data["status"] = "pending"

    result = supabase.table("referrals").insert(referral_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create referral")

    return ReferralResponse(**result.data[0])


# =====================================================
# STATISTICS ENDPOINTS
# =====================================================

@router.get("/statistics", response_model=LoyaltyStatistics)
async def get_loyalty_statistics(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get loyalty program statistics (admin only)"""
    # Get counts
    accounts_result = supabase.table("loyalty_accounts").select("*").execute()
    accounts = accounts_result.data

    transactions_result = supabase.table("loyalty_transactions").select("*").execute()
    transactions = transactions_result.data

    redemptions_result = supabase.table("reward_redemptions").select("*").execute()

    # Calculate statistics
    total_members = len(accounts)
    active_members = sum(1 for a in accounts if a["is_active"])
    total_points_issued = sum(t["points"] for t in transactions if t["transaction_type"] in ["earn", "bonus"])
    total_points_redeemed = sum(t["points"] for t in transactions if t["transaction_type"] == "redeem")
    total_rewards_redeemed = len(redemptions_result.data)

    # By tier
    by_tier = {}
    for account in accounts:
        tier = account["tier_name"]
        by_tier[tier] = by_tier.get(tier, 0) + 1

    # Recent transactions
    recent_txns = sorted(transactions, key=lambda x: x["created_at"], reverse=True)[:10]

    return LoyaltyStatistics(
        total_members=total_members,
        active_members=active_members,
        total_points_issued=total_points_issued,
        total_points_redeemed=total_points_redeemed,
        total_rewards_redeemed=total_rewards_redeemed,
        by_tier=by_tier,
        recent_transactions=[LoyaltyTransactionResponse(**txn) for txn in recent_txns]
    )


@router.get("/summary", response_model=MemberSummary)
async def get_member_summary(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get complete member summary for current user"""
    # Get account
    account_result = supabase.table("loyalty_accounts").select("*").eq("user_id", current_user["id"]).execute()

    if not account_result.data:
        raise HTTPException(status_code=404, detail="Loyalty account not found")

    account = account_result.data[0]

    # Get tier details
    tier_result = supabase.table("loyalty_tiers").select("*").eq("id", account["tier_id"]).execute()
    tier = tier_result.data[0] if tier_result.data else None

    # Get next tier
    next_tier = None
    if tier:
        next_tier_result = supabase.table("loyalty_tiers").select("*").eq("tier_level", tier["tier_level"] + 1).execute()
        next_tier = next_tier_result.data[0] if next_tier_result.data else None

    # Get recent transactions
    txn_result = supabase.table("loyalty_transactions").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).limit(5).execute()

    # Get available rewards
    rewards_result = supabase.table("rewards_catalog").select("*").eq("is_active", True).lte("points_cost", account["current_points"]).limit(10).execute()

    return MemberSummary(
        account_id=account["id"],
        member_number=account["member_number"],
        user_id=account["user_id"],
        current_points=account["current_points"],
        lifetime_points=account["lifetime_points"],
        tier_name=account["tier_name"],
        tier_color=tier["tier_color"] if tier else None,
        points_multiplier=Decimal(str(tier["points_multiplier"])) if tier else Decimal("1.0"),
        discount_percent=Decimal(str(tier["discount_percent"])) if tier else Decimal("0"),
        points_to_next_tier=account.get("next_tier_points"),
        next_tier_name=next_tier["tier_name"] if next_tier else None,
        points_expiring_soon=account.get("points_expiring_soon", 0),
        recent_transactions=[LoyaltyTransactionResponse(**txn) for txn in txn_result.data],
        available_rewards=[RewardResponse(**reward) for reward in rewards_result.data]
    )


from datetime import timedelta
