import React, { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, XCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { purchaseOrdersService, PurchaseOrder, ReceiveGoodsRequest } from '@/lib/api/purchase-orders';
import { useToast } from '@/hooks/use-toast';

interface ReceiveGoodsDialogProps {
  open: boolean;
  purchaseOrder: PurchaseOrder;
  onClose: (refresh?: boolean) => void;
}

interface ReceiveItem {
  po_item_id: string;
  inventory_item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  quality_status: 'good' | 'damaged' | 'rejected';
  notes: string;
}

const ReceiveGoodsDialog: React.FC<ReceiveGoodsDialogProps> = ({
  open,
  purchaseOrder,
  onClose,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [inspection_status, setInspectionStatus] = useState<'passed' | 'failed' | 'partial'>('passed');
  const [quality_notes, setQualityNotes] = useState('');
  const [general_notes, setGeneralNotes] = useState('');

  const [items, setItems] = useState<ReceiveItem[]>(
    (purchaseOrder.purchase_order_items || []).map((item) => ({
      po_item_id: item.id,
      inventory_item_name: item.inventory_items?.name || 'Unknown',
      quantity_ordered: item.quantity_ordered,
      quantity_received: item.quantity_ordered, // Default to full quantity
      quality_status: 'good' as const,
      notes: '',
    }))
  );

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);

    // Auto-update inspection status based on quality
    const hasRejected = newItems.some((item) => item.quality_status === 'rejected');
    const hasDamaged = newItems.some((item) => item.quality_status === 'damaged');
    const allGood = newItems.every((item) => item.quality_status === 'good');

    if (allGood) {
      setInspectionStatus('passed');
    } else if (hasRejected || hasDamaged) {
      setInspectionStatus('partial');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.some((item) => item.quantity_received < 0)) {
      toast({
        title: 'Validation Error',
        description: 'Received quantity cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const requestData: ReceiveGoodsRequest = {
        items: items.map((item) => ({
          po_item_id: item.po_item_id,
          quantity_received: item.quantity_received,
          quality_status: item.quality_status,
          notes: item.notes || undefined,
        })),
        inspection_status,
        quality_notes: quality_notes || undefined,
        notes: general_notes || undefined,
      };

      await purchaseOrdersService.receiveGoods(purchaseOrder.id, requestData);

      toast({
        title: 'Success',
        description: 'Goods received successfully. Inventory has been updated automatically.',
      });

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to receive goods',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getQualityIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'damaged':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getTotalReceived = () => {
    return items.filter((item) => item.quality_status === 'good').reduce((sum, item) => sum + item.quantity_received, 0);
  };

  const getTotalDamaged = () => {
    return items.filter((item) => item.quality_status === 'damaged').reduce((sum, item) => sum + item.quantity_received, 0);
  };

  const getTotalRejected = () => {
    return items.filter((item) => item.quality_status === 'rejected').reduce((sum, item) => sum + item.quantity_received, 0);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Receive Goods - {purchaseOrder.po_number}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Supplier: <span className="font-medium">{purchaseOrder.suppliers?.name}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Ordered</div>
              <div className="text-2xl font-bold text-gray-900">
                {items.reduce((sum, item) => sum + item.quantity_ordered, 0)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600">Good Items</div>
              <div className="text-2xl font-bold text-green-900">{getTotalReceived()}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-yellow-600">Damaged</div>
              <div className="text-2xl font-bold text-yellow-900">{getTotalDamaged()}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-600">Rejected</div>
              <div className="text-2xl font-bold text-red-900">{getTotalRejected()}</div>
            </div>
          </div>

          {/* Items */}
          <div>
            <Label className="text-lg font-semibold mb-4 block">Receive Items</Label>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.po_item_id} className="border rounded-lg p-4 bg-white">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900">{item.inventory_item_name}</div>
                      <div className="text-sm text-gray-500">Ordered: {item.quantity_ordered}</div>
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Quantity Received</Label>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity_ordered}
                        step="0.01"
                        value={item.quantity_received}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity_received', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Quality Status</Label>
                      <Select
                        value={item.quality_status}
                        onValueChange={(value) => handleItemChange(index, 'quality_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>Good</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="damaged">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span>Damaged</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span>Rejected</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">Notes (if damaged/rejected)</Label>
                      <Input
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        placeholder="Reason for damage/rejection..."
                      />
                    </div>

                    <div className="col-span-1 flex justify-center">
                      {getQualityIcon(item.quality_status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inspection Status */}
          <div>
            <Label htmlFor="inspection_status">Overall Inspection Status</Label>
            <Select value={inspection_status} onValueChange={(value: any) => setInspectionStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Passed - All items good</span>
                  </div>
                </SelectItem>
                <SelectItem value="partial">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span>Partial - Some issues found</span>
                  </div>
                </SelectItem>
                <SelectItem value="failed">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Failed - Major problems</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quality_notes">Quality Inspection Notes</Label>
              <Textarea
                id="quality_notes"
                value={quality_notes}
                onChange={(e) => setQualityNotes(e.target.value)}
                placeholder="Overall quality assessment, issues found, etc."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="general_notes">General Notes</Label>
              <Textarea
                id="general_notes"
                value={general_notes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Delivery condition, packaging, driver notes, etc."
                rows={3}
              />
            </div>
          </div>

          {/* Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Auto-Update Inventory</h4>
                <p className="text-sm text-blue-700 mt-1">
                  When you complete this receipt, the system will automatically:
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
                  <li>Increase inventory stock for all "Good" items</li>
                  <li>Create inventory transactions with full audit trail</li>
                  <li>Resolve any low stock alerts for these items</li>
                  <li>Update inventory valuation</li>
                  <li>Generate GRN (Goods Received Note)</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Complete Receipt & Update Inventory
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveGoodsDialog;
