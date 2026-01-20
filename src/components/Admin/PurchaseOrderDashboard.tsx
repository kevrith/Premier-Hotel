import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  FileText,
  Send,
  Package,
  XCircle,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { purchaseOrdersService, PurchaseOrderStats } from '@/lib/api/purchase-orders';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const PurchaseOrderDashboard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersService.getStats();
      setStats(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Purchase Orders',
      value: stats.total_pos,
      icon: ShoppingCart,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Draft POs',
      value: stats.draft_pos,
      icon: FileText,
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
    },
    {
      title: 'Approved POs',
      value: stats.approved_pos,
      icon: FileText,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      title: 'Sent to Suppliers',
      value: stats.sent_pos,
      icon: Send,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Received',
      value: stats.received_pos,
      icon: Package,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Cancelled',
      value: stats.cancelled_pos,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
  ];

  const financialCards = [
    {
      title: 'Total PO Value',
      value: `KES ${stats.total_value.toLocaleString()}`,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Paid',
      value: `KES ${stats.total_paid.toLocaleString()}`,
      icon: DollarSign,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Outstanding Payments',
      value: `KES ${stats.outstanding_payments.toLocaleString()}`,
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Purchase Orders Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of your procurement operations</p>
      </div>

      {/* Status Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className={`${card.bgColor} border-none p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
                  <p className={`text-3xl font-bold ${card.textColor} mt-2`}>{card.value}</p>
                </div>
                <card.icon className={`w-8 h-8 ${card.textColor} opacity-70`} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Financial Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {financialCards.map((card) => (
            <Card key={card.title} className={`${card.bgColor} border-none p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
                  <p className={`text-2xl font-bold ${card.textColor} mt-2`}>{card.value}</p>
                </div>
                <card.icon className={`w-8 h-8 ${card.textColor} opacity-70`} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending Deliveries */}
      {stats.pending_deliveries && stats.pending_deliveries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Deliveries
            </h3>
            <Badge variant="outline">{stats.pending_deliveries.length} pending</Badge>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expected Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Days Left
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.pending_deliveries.map((po) => {
                    const expectedDate = po.expected_delivery_date
                      ? new Date(po.expected_delivery_date)
                      : null;
                    const daysLeft = expectedDate
                      ? Math.ceil((expectedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    const isOverdue = daysLeft !== null && daysLeft < 0;

                    return (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{po.po_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{po.suppliers?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {expectedDate ? format(expectedDate, 'MMM dd, yyyy') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            KES {po.total.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={po.status === 'sent' ? 'outline' : 'secondary'}>
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {daysLeft !== null && (
                            <Badge variant={isOverdue ? 'destructive' : daysLeft <= 3 ? 'secondary' : 'default'}>
                              {isOverdue
                                ? `${Math.abs(daysLeft)} days overdue`
                                : daysLeft === 0
                                ? 'Today'
                                : `${daysLeft} days`}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="bg-blue-600 hover:bg-blue-700 h-auto py-4">
            <div className="flex flex-col items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              <span>Create Purchase Order</span>
            </div>
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 h-auto py-4">
            <div className="flex flex-col items-center gap-2">
              <Package className="w-6 h-6" />
              <span>Receive Goods</span>
            </div>
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 h-auto py-4">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              <span>View Reports</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDashboard;
