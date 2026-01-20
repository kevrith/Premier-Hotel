import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Check, Send, X, Package, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseOrdersService, PurchaseOrder } from '@/lib/api/purchase-orders';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import PurchaseOrderDialog from './PurchaseOrderDialog';
import PurchaseOrderViewDialog from './PurchaseOrderViewDialog';
import ReceiveGoodsDialog from './ReceiveGoodsDialog';

const PurchaseOrderList: React.FC = () => {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    loadPurchaseOrders();
  }, [statusFilter]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersService.getPurchaseOrders({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setPurchaseOrders(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load purchase orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = () => {
    setSelectedPO(null);
    setCreateDialogOpen(true);
  };

  const handleViewPO = async (po: PurchaseOrder) => {
    try {
      // Fetch full PO details with items
      const fullPO = await purchaseOrdersService.getPurchaseOrder(po.id);
      setSelectedPO(fullPO);
      setViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load purchase order details',
        variant: 'destructive',
      });
    }
  };

  const handleApprovePO = async (po: PurchaseOrder) => {
    if (!confirm(`Approve Purchase Order ${po.po_number}?`)) return;

    try {
      await purchaseOrdersService.approvePurchaseOrder(po.id);
      toast({
        title: 'Success',
        description: 'Purchase order approved successfully',
      });
      loadPurchaseOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve purchase order',
        variant: 'destructive',
      });
    }
  };

  const handleSendPO = async (po: PurchaseOrder) => {
    if (!confirm(`Send Purchase Order ${po.po_number} to supplier?`)) return;

    try {
      await purchaseOrdersService.sendPurchaseOrder(po.id);
      toast({
        title: 'Success',
        description: 'Purchase order sent to supplier',
      });
      loadPurchaseOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send purchase order',
        variant: 'destructive',
      });
    }
  };

  const handleReceiveGoods = async (po: PurchaseOrder) => {
    try {
      const fullPO = await purchaseOrdersService.getPurchaseOrder(po.id);
      setSelectedPO(fullPO);
      setReceiveDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load purchase order details',
        variant: 'destructive',
      });
    }
  };

  const handleCancelPO = async (po: PurchaseOrder) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      await purchaseOrdersService.cancelPurchaseOrder(po.id, reason);
      toast({
        title: 'Success',
        description: 'Purchase order cancelled',
      });
      loadPurchaseOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel purchase order',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'default', label: 'Draft' },
      approved: { variant: 'secondary', label: 'Approved' },
      sent: { variant: 'outline', label: 'Sent' },
      received: { variant: 'success', label: 'Received' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'success'; label: string }> = {
      pending: { variant: 'default', label: 'Pending' },
      partial: { variant: 'secondary', label: 'Partial' },
      paid: { variant: 'success', label: 'Paid' },
    };
    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPOs = purchaseOrders.filter((po) =>
    po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600 mt-1">Manage your procurement and orders</p>
        </div>
        <Button onClick={handleCreatePO} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Purchase Orders Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading purchase orders...</p>
        </div>
      ) : filteredPOs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">
            {searchTerm ? 'No purchase orders found matching your search.' : 'No purchase orders yet. Create your first PO to get started.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{po.po_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{po.suppliers?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {format(new Date(po.order_date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {po.expected_delivery_date
                          ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        KES {po.total.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(po.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(po.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPO(po)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {po.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprovePO(po)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}

                        {po.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendPO(po)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}

                        {po.status === 'sent' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReceiveGoods(po)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Package className="w-4 h-4" />
                          </Button>
                        )}

                        {(po.status === 'draft' || po.status === 'approved') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelPO(po)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <PurchaseOrderDialog
        open={createDialogOpen}
        onClose={(refresh) => {
          setCreateDialogOpen(false);
          if (refresh) loadPurchaseOrders();
        }}
      />

      {selectedPO && (
        <>
          <PurchaseOrderViewDialog
            open={viewDialogOpen}
            purchaseOrder={selectedPO}
            onClose={() => {
              setViewDialogOpen(false);
              setSelectedPO(null);
            }}
          />

          <ReceiveGoodsDialog
            open={receiveDialogOpen}
            purchaseOrder={selectedPO}
            onClose={(refresh) => {
              setReceiveDialogOpen(false);
              setSelectedPO(null);
              if (refresh) loadPurchaseOrders();
            }}
          />
        </>
      )}
    </div>
  );
};

export default PurchaseOrderList;
