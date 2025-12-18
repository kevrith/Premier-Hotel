import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  TrendingUp,
  Gift,
  Star,
  CreditCard,
  Calendar,
  Trophy,
  Sparkles,
  ArrowUp,
  Clock,
  Check,
  X,
  Loader2,
  Share2,
  History,
  Ticket,
  Target,
  Zap,
  Crown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loyaltyService } from '@/lib/api/loyalty';

export default function LoyaltyProgram() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [summary, setSummary] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [referrals, setReferrals] = useState([]);

  // Filter states
  const [rewardFilter, setRewardFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to access loyalty program');
      navigate('/login');
      return;
    }

    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, tiersData, rewardsData, transactionsData, redemptionsData, referralsData] = await Promise.all([
        loyaltyService.getMemberSummary(),
        loyaltyService.getTiers(true),
        loyaltyService.getRewards({ is_active: true }),
        loyaltyService.getMyTransactions({ limit: 10 }),
        loyaltyService.getMyRedemptions(),
        loyaltyService.getMyReferrals()
      ]);

      setSummary(summaryData);
      setTiers(tiersData);
      setRewards(rewardsData);
      setTransactions(transactionsData);
      setRedemptions(redemptionsData);
      setReferrals(referralsData);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      toast.error('Failed to load loyalty program data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemReward = async (rewardId) => {
    try {
      await loyaltyService.redeemReward(rewardId);
      toast.success('Reward redeemed successfully!');
      loadData();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error(error.response?.data?.detail || 'Failed to redeem reward');
    }
  };

  const handleCreateReferral = async () => {
    const email = prompt('Enter referee email:');
    if (!email) return;

    try {
      await loyaltyService.createReferral({ referee_email: email });
      toast.success('Referral created successfully!');
      loadData();
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error('Failed to create referral');
    }
  };

  const getTierIcon = (tierName) => {
    const icons = {
      bronze: Award,
      silver: Star,
      gold: Trophy,
      platinum: Sparkles,
      diamond: Crown
    };
    return icons[tierName.toLowerCase()] || Award;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">Loyalty Account Not Found</h3>
              <p className="text-gray-500">Unable to load your loyalty account. Please contact support.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const TierIcon = getTierIcon(summary.tier_name);
  const tierProgress = summary.points_to_next_tier
    ? ((summary.current_points / (summary.current_points + summary.points_to_next_tier)) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header Section with Tier Card */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 shadow-2xl">
            <CardContent className="py-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-white/20 p-6 rounded-2xl backdrop-blur-sm">
                    <TierIcon className="h-16 w-16" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {summary.tier_name.charAt(0).toUpperCase() + summary.tier_name.slice(1)} Member
                    </h1>
                    <p className="text-white/80 mb-1">Member #{summary.member_number}</p>
                    <div className="flex items-center gap-2 text-white/90">
                      <Zap className="h-4 w-4" />
                      <span>{summary.points_multiplier}x Points Multiplier</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <div className="text-4xl font-bold mb-1">{summary.current_points.toLocaleString()}</div>
                    <div className="text-white/80 text-sm">Available Points</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold mb-1">{summary.lifetime_points.toLocaleString()}</div>
                    <div className="text-white/80 text-sm">Lifetime Points</div>
                  </div>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {summary.next_tier_name && (
                <div className="mt-6 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Progress to {summary.next_tier_name}</span>
                    <span className="text-sm font-medium">
                      {summary.points_to_next_tier} points to go
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-white h-3 rounded-full transition-all duration-500"
                      style={{ width: `${tierProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {summary.discount_percent > 0 && (
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      <div>
                        <div className="text-2xl font-bold">{summary.discount_percent}%</div>
                        <div className="text-xs text-white/80">Member Discount</div>
                      </div>
                    </div>
                  </div>
                )}
                {summary.points_expiring_soon > 0 && (
                  <div className="bg-yellow-500/20 rounded-lg p-3 backdrop-blur-sm border border-yellow-300/30">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-100" />
                      <div>
                        <div className="text-2xl font-bold">{summary.points_expiring_soon}</div>
                        <div className="text-xs text-white/80">Expiring Soon</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    <div>
                      <div className="text-2xl font-bold">{summary.available_rewards.length}</div>
                      <div className="text-xs text-white/80">Rewards Available</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Your Loyalty Dashboard</CardTitle>
            <CardDescription>Manage your points, rewards, and benefits</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rewards">Rewards</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="tiers">Tiers</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Quick Rewards */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Rewards You Can Redeem</h3>
                  {summary.available_rewards.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No rewards available with your current points</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {summary.available_rewards.slice(0, 6).map((reward) => (
                        <Card key={reward.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <Gift className="h-8 w-8 text-purple-600" />
                              {reward.is_featured && (
                                <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                              )}
                            </div>
                            <h4 className="font-semibold mb-2">{reward.name}</h4>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{reward.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-purple-600">{reward.points_cost} pts</span>
                              <Button
                                size="sm"
                                onClick={() => handleRedeemReward(reward.id)}
                                disabled={summary.current_points < reward.points_cost}
                              >
                                Redeem
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {summary.recent_transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {txn.transaction_type === 'earn' || txn.transaction_type === 'bonus' ? (
                            <div className="bg-green-100 p-2 rounded-full">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                          ) : (
                            <div className="bg-red-100 p-2 rounded-full">
                              <Gift className="h-4 w-4 text-red-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{txn.description || txn.transaction_type}</p>
                            <p className="text-sm text-gray-500">{formatDate(txn.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            txn.transaction_type === 'earn' || txn.transaction_type === 'bonus'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {txn.transaction_type === 'earn' || txn.transaction_type === 'bonus' ? '+' : '-'}
                            {txn.points} pts
                          </p>
                          <p className="text-sm text-gray-500">Balance: {txn.balance_after}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Rewards Tab */}
              <TabsContent value="rewards" className="space-y-6">
                {/* Filters */}
                <div className="flex gap-2">
                  <Button
                    variant={rewardFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setRewardFilter('all')}
                    size="sm"
                  >
                    All Rewards
                  </Button>
                  <Button
                    variant={rewardFilter === 'affordable' ? 'default' : 'outline'}
                    onClick={() => setRewardFilter('affordable')}
                    size="sm"
                  >
                    I Can Afford
                  </Button>
                  <Button
                    variant={rewardFilter === 'featured' ? 'default' : 'outline'}
                    onClick={() => setRewardFilter('featured')}
                    size="sm"
                  >
                    Featured
                  </Button>
                </div>

                {/* Rewards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards
                    .filter(reward => {
                      if (rewardFilter === 'affordable') return reward.points_cost <= summary.current_points;
                      if (rewardFilter === 'featured') return reward.is_featured;
                      return true;
                    })
                    .map((reward) => (
                      <Card key={reward.id} className={`hover:shadow-xl transition-all ${
                        reward.is_featured ? 'border-yellow-300 border-2' : ''
                      }`}>
                        <CardContent className="pt-6">
                          {reward.image_url && (
                            <img
                              src={reward.image_url}
                              alt={reward.name}
                              className="w-full h-40 object-cover rounded-lg mb-4"
                            />
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="outline">{reward.reward_type.replace('_', ' ')}</Badge>
                            {reward.is_featured && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-bold text-lg mb-2">{reward.name}</h4>
                          <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
                          {reward.monetary_value && (
                            <p className="text-sm text-gray-500 mb-2">
                              Value: ${reward.monetary_value.toFixed(2)}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <span className="text-2xl font-bold text-purple-600">
                              {reward.points_cost} <span className="text-sm">pts</span>
                            </span>
                            <Button
                              onClick={() => handleRedeemReward(reward.id)}
                              disabled={summary.current_points < reward.points_cost}
                            >
                              {summary.current_points < reward.points_cost ? 'Need More Points' : 'Redeem'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">All Transactions</h3>
                  <div className="space-y-2">
                    {transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          {txn.transaction_type === 'earn' || txn.transaction_type === 'bonus' ? (
                            <div className="bg-green-100 p-3 rounded-full">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="bg-red-100 p-3 rounded-full">
                              <Gift className="h-5 w-5 text-red-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{txn.description || txn.transaction_type}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{formatDate(txn.created_at)}</span>
                              {txn.reference_type && <Badge variant="outline" className="text-xs">{txn.reference_type}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            txn.transaction_type === 'earn' || txn.transaction_type === 'bonus'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {txn.transaction_type === 'earn' || txn.transaction_type === 'bonus' ? '+' : '-'}
                            {txn.points}
                          </p>
                          <p className="text-sm text-gray-500">Balance: {txn.balance_after}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">My Redemptions</h3>
                  <div className="space-y-2">
                    {redemptions.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No redemptions yet</p>
                    ) : (
                      redemptions.map((redemption) => (
                        <div key={redemption.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Redemption #{redemption.redemption_code}</p>
                            <p className="text-sm text-gray-500">{formatDate(redemption.redeemed_at)}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={
                              redemption.status === 'used' ? 'bg-green-100 text-green-800' :
                              redemption.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              redemption.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {redemption.status}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">{redemption.points_redeemed} points</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Tiers Tab */}
              <TabsContent value="tiers" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tiers.map((tier) => {
                    const TierIconComponent = getTierIcon(tier.tier_name);
                    const isCurrentTier = tier.tier_name === summary.tier_name;

                    return (
                      <Card key={tier.id} className={`${
                        isCurrentTier ? 'border-2 border-purple-500 shadow-lg' : ''
                      }`}>
                        <CardContent className="pt-6">
                          <div className="text-center mb-4">
                            <div
                              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-3"
                              style={{ backgroundColor: tier.tier_color || '#gray' }}
                            >
                              <TierIconComponent className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-xl font-bold">{tier.tier_name}</h3>
                            {isCurrentTier && <Badge className="mt-2">Current Tier</Badge>}
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Points Required:</span>
                              <span className="font-medium">{tier.min_points.toLocaleString()}+</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Points Multiplier:</span>
                              <span className="font-medium">{tier.points_multiplier}x</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Discount:</span>
                              <span className="font-medium">{tier.discount_percent}%</span>
                            </div>

                            {tier.benefits?.benefits && (
                              <div className="mt-4 pt-4 border-t">
                                <p className="text-xs font-medium text-gray-600 mb-2">Benefits:</p>
                                <ul className="space-y-1">
                                  {tier.benefits.benefits.map((benefit, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs">
                                      <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span>{benefit}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Referrals Tab */}
              <TabsContent value="referrals" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Refer Friends & Earn Points</CardTitle>
                    <CardDescription>Invite friends and earn bonus points when they join</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-6">
                      <Button onClick={handleCreateReferral}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Create New Referral
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {referrals.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No referrals yet</p>
                      ) : (
                        referrals.map((referral) => (
                          <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{referral.referee_email}</p>
                              <p className="text-sm text-gray-500">Code: {referral.referral_code}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={
                                referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                                referral.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {referral.status}
                              </Badge>
                              {referral.points_awarded > 0 && (
                                <p className="text-sm text-green-600 mt-1">+{referral.points_awarded} points</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
