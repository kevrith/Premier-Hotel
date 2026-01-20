import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
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
import { purchaseOrdersService, Supplier, CreatePurchaseOrderRequest } from '@/lib/api/purchase-orders';
import { inventoryService } from '@/lib/api/inventory';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrderDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

interface POItem {
  inventory_item_id: string;
  inventory_item_name: string;
  quantity_ordered: number;
  unit_cost: number;
  discount_percentage: number;
  discount_amount: number;
  notes: string;
}

const PurchaseOrderDialog: React.FC<PurchaseOrderDialogProps> = ({ open, onClose }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_delivery_date: '',
    payment_due_date: '',
    tax_amount: 0,
    discount_amount: 0,
    shipping_cost: 0,
    notes: '',
    terms: '',
  });
  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    if (open) {
      loadSuppliers();
      loadInventoryItems();
      resetForm();
    }
  }, [open]);

  const loadSuppliers = async () => {
    try {
      const data = await purchaseOrdersService.getSuppliers({ status: 'active' });
      setSuppliers(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load suppliers',
        variant: 'destructive',
      });
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryService.getInventoryItems();
      setInventoryItems(response.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load inventory items',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      expected_delivery_date: '',
      payment_due_date: '',
      tax_amount: 0,
      discount_amount: 0,
      shipping_cost: 0,
      notes: '',
      terms: '',
    });
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        inventory_item_id: '',
        inventory_item_name: '',
        quantity_ordered: 1,
        unit_cost: 0,
        discount_percentage: 0,
        discount_amount: 0,
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];

    if (field === 'inventory_item_id') {
      const item = inventoryItems.find((i) => i.id === value);
      newItems[index] = {
        ...newItems[index],
        inventory_item_id: value,
        inventory_item_name: item?.name || '',
        unit_cost: item?.cost_per_unit || 0,
      };
    } else if (field === 'discount_percentage') {
      const percentage = parseFloat(value) || 0;
      const subtotal = newItems[index].quantity_ordered * newItems[index].unit_cost;
      newItems[index] = {
        ...newItems[index],
        discount_percentage: percentage,
        discount_amount: (subtotal * percentage) / 100,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const lineSubtotal = item.quantity_ordered * item.unit_cost;
      return sum + (lineSubtotal - item.discount_amount);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + formData.tax_amount + formData.shipping_cost - formData.discount_amount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a supplier',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one item',
        variant: 'destructive',
      });
      return;
    }

    if (items.some((item) => !item.inventory_item_id || item.quantity_ordered <= 0)) {
      toast({
        title: 'Validation Error',
        description: 'All items must have a product and valid quantity',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const requestData: CreatePurchaseOrderRequest = {
        supplier_id: formData.supplier_id,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        payment_due_date: formData.payment_due_date || undefined,
        tax_amount: formData.tax_amount || undefined,
        discount_amount: formData.discount_amount || undefined,
        shipping_cost: formData.shipping_cost || undefined,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        items: items.map((item) => ({
          inventory_item_id: item.inventory_item_id,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
          discount_percentage: item.discount_percentage || undefined,
          discount_amount: item.discount_amount || undefined,
          notes: item.notes || undefined,
        })),
      };

      await purchaseOrdersService.createPurchaseOrder(requestData);

      toast({
        title: 'Success',
        description: 'Purchase order created successfully',
      });

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create purchase order',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Purchase Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">
                Supplier <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="payment_due_date">Payment Due Date</Label>
              <Input
                id="payment_due_date"
                type="date"
                value={formData.payment_due_date}
                onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Items <span className="text-red-500">*</span></Label>
              <Button type="button" onClick={handleAddItem} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <Label className="text-xs">Product</Label>
                      <Select
                        value={item.inventory_item_id}
                        onValueChange={(value) => handleItemChange(index, 'inventory_item_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((invItem) => (
                            <SelectItem key={invItem.id} value={invItem.id}>
                              {invItem.name} - {invItem.unit_of_measure}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantity_ordered}
                        onChange={(e) => handleItemChange(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Unit Cost (KES)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_percentage}
                        onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                      />
                    </div>

                    <div className="col-span-1 flex items-end">
                      <Label className="text-xs font-semibold">
                        KES {((item.quantity_ordered * item.unit_cost) - item.discount_amount).toFixed(2)}
                      </Label>
                    </div>

                    <div className="col-span-1 flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500">No items added yet. Click "Add Item" to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="tax_amount">Tax Amount (KES)</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="shipping_cost">Shipping Cost (KES)</Label>
                <Input
                  id="shipping_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shipping_cost}
                  onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="discount_amount">Overall Discount (KES)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="flex flex-col justify-end">
                <Label className="text-sm font-medium">Total Amount</Label>
                <div className="text-2xl font-bold text-green-600">
                  KES {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Payment terms, delivery conditions, etc."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this order..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderDialog;
