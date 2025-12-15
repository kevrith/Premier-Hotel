/**
 * Loyalty Program API Client
 */

import api from './axios';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface LoyaltyTier {
  id: string;
  tier_name: string;
  tier_level: number;
  min_points: number;
  max_points?: number;
  points_multiplier: number;
  discount_percent: number;
  benefits?: Record<string, any>;
  tier_color?: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyAccount {
  id: string;
  user_id: string;
  member_number: string;
  current_points: number;
  lifetime_points: number;
  tier_id?: string;
  tier_name: string;
  joined_date: string;
  last_activity_date?: string;
  points_expiring_soon: number;
  next_tier_points?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  account_id: string;
  user_id: string;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'refund' | 'adjustment';
  points: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  description?: string;
  multiplier_applied: number;
  expires_at?: string;
  is_expired: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Reward {
  id: string;
  reward_code: string;
  name: string;
  description?: string;
  reward_type: 'discount' | 'free_night' | 'room_upgrade' | 'free_meal' | 'spa_voucher' | 'gift_card' | 'experience' | 'other';
  points_cost: number;
  monetary_value?: number;
  min_tier_required?: string;
  max_redemptions_per_user?: number;
  total_available?: number;
  total_redeemed: number;
  valid_from?: string;
  valid_until?: string;
  terms_conditions?: string;
  image_url?: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RewardRedemption {
  id: string;
  redemption_code: string;
  account_id: string;
  user_id: string;
  reward_id: string;
  points_redeemed: number;
  status: 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled';
  redeemed_at: string;
  expires_at?: string;
  used_at?: string;
  used_reference_type?: string;
  used_reference_id?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id?: string;
  referral_code: string;
  referee_email?: string;
  referee_name?: string;
  status: 'pending' | 'completed' | 'cancelled';
  points_awarded: number;
  awarded_at?: string;
  signup_completed_at?: string;
  first_booking_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyStatistics {
  total_members: number;
  active_members: number;
  total_points_issued: number;
  total_points_redeemed: number;
  total_rewards_redeemed: number;
  by_tier: Record<string, number>;
  recent_transactions: LoyaltyTransaction[];
}

export interface MemberSummary {
  account_id: string;
  member_number: string;
  user_id: string;
  current_points: number;
  lifetime_points: number;
  tier_name: string;
  tier_color?: string;
  points_multiplier: number;
  discount_percent: number;
  points_to_next_tier?: number;
  next_tier_name?: string;
  points_expiring_soon: number;
  recent_transactions: LoyaltyTransaction[];
  available_rewards: Reward[];
}

// =====================================================
// LOYALTY SERVICE CLASS
// =====================================================

class LoyaltyService {
  // ----- TIERS -----

  async getTiers(isActive?: boolean): Promise<LoyaltyTier[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('is_active', isActive.toString());

    const response = await api.get<LoyaltyTier[]>(`/loyalty/tiers?${params.toString()}`);
    return response.data;
  }

  // ----- ACCOUNT -----

  async getMyAccount(): Promise<LoyaltyAccount> {
    const response = await api.get<LoyaltyAccount>('/loyalty/account');
    return response.data;
  }

  async getAllAccounts(params?: {
    tier_name?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<LoyaltyAccount[]> {
    const queryParams = new URLSearchParams();
    if (params?.tier_name) queryParams.append('tier_name', params.tier_name);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<LoyaltyAccount[]>(`/loyalty/accounts?${queryParams.toString()}`);
    return response.data;
  }

  async getAccountByUser(userId: string): Promise<LoyaltyAccount> {
    const response = await api.get<LoyaltyAccount>(`/loyalty/accounts/${userId}`);
    return response.data;
  }

  // ----- TRANSACTIONS -----

  async getMyTransactions(params?: {
    transaction_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<LoyaltyTransaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.transaction_type) queryParams.append('transaction_type', params.transaction_type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<LoyaltyTransaction[]>(`/loyalty/transactions?${queryParams.toString()}`);
    return response.data;
  }

  async earnPoints(data: {
    user_id: string;
    points: number;
    reference_type: string;
    reference_id: string;
    description: string;
  }): Promise<LoyaltyTransaction> {
    const response = await api.post<LoyaltyTransaction>('/loyalty/points/earn', data);
    return response.data;
  }

  async redeemPoints(data: {
    points: number;
    reason: string;
  }): Promise<LoyaltyTransaction> {
    const response = await api.post<LoyaltyTransaction>('/loyalty/points/redeem', data);
    return response.data;
  }

  // ----- REWARDS -----

  async getRewards(params?: {
    reward_type?: string;
    is_active?: boolean;
    is_featured?: boolean;
  }): Promise<Reward[]> {
    const queryParams = new URLSearchParams();
    if (params?.reward_type) queryParams.append('reward_type', params.reward_type);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.is_featured !== undefined) queryParams.append('is_featured', params.is_featured.toString());

    const response = await api.get<Reward[]>(`/loyalty/rewards?${queryParams.toString()}`);
    return response.data;
  }

  async getReward(rewardId: string): Promise<Reward> {
    const response = await api.get<Reward>(`/loyalty/rewards/${rewardId}`);
    return response.data;
  }

  async createReward(data: Partial<Reward>): Promise<Reward> {
    const response = await api.post<Reward>('/loyalty/rewards', data);
    return response.data;
  }

  async updateReward(rewardId: string, data: Partial<Reward>): Promise<Reward> {
    const response = await api.patch<Reward>(`/loyalty/rewards/${rewardId}`, data);
    return response.data;
  }

  // ----- REDEMPTIONS -----

  async getMyRedemptions(status?: string): Promise<RewardRedemption[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await api.get<RewardRedemption[]>(`/loyalty/redemptions?${params.toString()}`);
    return response.data;
  }

  async redeemReward(rewardId: string): Promise<RewardRedemption> {
    const response = await api.post<RewardRedemption>('/loyalty/redemptions', {
      reward_id: rewardId
    });
    return response.data;
  }

  async updateRedemption(redemptionId: string, data: {
    status: string;
    used_reference_type?: string;
    used_reference_id?: string;
    cancellation_reason?: string;
    notes?: string;
  }): Promise<RewardRedemption> {
    const response = await api.patch<RewardRedemption>(
      `/loyalty/redemptions/${redemptionId}`,
      data
    );
    return response.data;
  }

  // ----- REFERRALS -----

  async getMyReferrals(): Promise<Referral[]> {
    const response = await api.get<Referral[]>('/loyalty/referrals');
    return response.data;
  }

  async createReferral(data: {
    referee_email: string;
    referee_name?: string;
  }): Promise<Referral> {
    const response = await api.post<Referral>('/loyalty/referrals', data);
    return response.data;
  }

  // ----- STATISTICS -----

  async getStatistics(): Promise<LoyaltyStatistics> {
    const response = await api.get<LoyaltyStatistics>('/loyalty/statistics');
    return response.data;
  }

  async getMemberSummary(): Promise<MemberSummary> {
    const response = await api.get<MemberSummary>('/loyalty/summary');
    return response.data;
  }
}

export const loyaltyService = new LoyaltyService();
