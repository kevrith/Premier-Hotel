/**
 * UserStatistics Component
 * Dashboard cards displaying user management statistics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Trash2,
  TrendingUp,
  Shield,
  Briefcase,
  ChefHat,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { adminAPI, type UserStatistics as UserStatsType } from '@/lib/api/admin-enhanced';
import { toast } from 'react-hot-toast';

export function UserStatistics() {
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getUserStatistics();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      toast.error('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No statistics available</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users,
      description: 'All registered users',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Users',
      value: stats.active_users,
      description: `${stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0}% of total`,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Inactive Users',
      value: stats.inactive_users,
      description: 'Not currently active',
      icon: UserMinus,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Terminated',
      value: stats.terminated_users,
      description: 'Deactivated accounts',
      icon: UserX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Deleted',
      value: stats.deleted_users,
      description: 'Permanently removed',
      icon: Trash2,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'New This Month',
      value: stats.users_created_this_month,
      description: 'Recent additions',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Admins',
      value: stats.users_by_role.admin || 0,
      description: 'System administrators',
      icon: Shield,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Owners',
      value: stats.users_by_role.owner || 0,
      description: 'Business owners',
      icon: Briefcase,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ];

  const roleCards = [
    {
      title: 'Managers',
      value: stats.users_by_role.manager || 0,
      icon: Briefcase,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
    {
      title: 'Chefs',
      value: stats.users_by_role.chef || 0,
      icon: ChefHat,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Waiters',
      value: stats.users_by_role.waiter || 0,
      icon: UtensilsCrossed,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Cleaners',
      value: stats.users_by_role.cleaner || 0,
      icon: Sparkles,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Staff by Role</CardTitle>
          <CardDescription>Breakdown of staff members by their assigned roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roleCards.map((role, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600">{role.title}</p>
                  <p className="text-2xl font-bold mt-1">{role.value}</p>
                </div>
                <div className={`p-3 rounded-full ${role.bgColor}`}>
                  <role.icon className={`h-5 w-5 ${role.color}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Staff</span>
              <span className="text-lg font-bold text-black">
                {(stats.users_by_role.manager || 0) +
                  (stats.users_by_role.chef || 0) +
                  (stats.users_by_role.waiter || 0) +
                  (stats.users_by_role.cleaner || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Customer Accounts</span>
              <span className="text-lg font-bold text-black">{stats.users_by_role.customer || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Active Rate</span>
              <span className="text-lg font-bold text-green-600">
                {stats.total_users > 0
                  ? `${Math.round((stats.active_users / stats.total_users) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Turnover This Month</span>
              <span className="text-lg font-bold text-orange-600">{stats.terminated_users}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
