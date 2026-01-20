import React from 'react';
import { X, Calendar, DollarSign, Package, Truck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseOrder } from '@/lib/api/purchase-orders';
import { format } from 'date-fns';

interface PurchaseOrderViewDialogProps {
  open: boolean;
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
}

const PurchaseOrderViewDialog: React.FC<PurchaseOrderViewDialogProps> = ({
  open,
  purchaseOrder,
  onClose,
}) => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Purchase Order - {purchaseOrder.po_number}</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(purchaseOrder.status)}
              {getPaymentStatusBadge(purchaseOrder.payment_status)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Supplier Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Supplier Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{purchaseOrder.suppliers?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Contact:</span>
                <span className="ml-2 font-medium">{purchaseOrder.suppliers?.contact_person || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{purchaseOrder.suppliers?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{purchaseOrder.suppliers?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Order Details
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 block">Order Date:</span>
                <span className="font-medium">
                  {format(new Date(purchaseOrder.order_date), 'MMM dd, yyyy')}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Expected Delivery:</span>
                <span className="font-medium">
                  {purchaseOrder.expected_delivery_date
                    ? format(new Date(purchaseOrder.expected_delivery_date), 'MMM dd, yyyy')
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Actual Delivery:</span>
                <span className="font-medium">
                  {purchaseOrder.actual_delivery_date
                    ? format(new Date(purchaseOrder.actual_delivery_date), 'MMM dd, yyyy')
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Payment Due:</span>
                <span className="font-medium">
                  {purchaseOrder.payment_due_date
                    ? format(new Date(purchaseOrder.payment_due_date), 'MMM dd, yyyy')
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">Payment Terms:</span>
                <span className="font-medium">{purchaseOrder.suppliers?.payment_terms || '-'}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Ordered</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Received</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseOrder.purchase_order_items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.inventory_items?.name}</div>
                        <div className="text-xs text-gray-500">{item.inventory_items?.unit_of_measure}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity_ordered}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={item.quantity_received > 0 ? 'text-green-600 font-medium' : ''}>
                          {item.quantity_received}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">KES {item.unit_cost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {item.discount_amount ? `KES ${item.discount_amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        KES {item.line_total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">KES {purchaseOrder.subtotal.toLocaleString()}</span>
              </div>
              {purchaseOrder.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">KES {purchaseOrder.tax_amount.toLocaleString()}</span>
                </div>
              )}
              {purchaseOrder.shipping_cost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">KES {purchaseOrder.shipping_cost.toLocaleString()}</span>
                </div>
              )}
              {purchaseOrder.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-KES {purchaseOrder.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount:</span>
                <span className="font-bold text-lg text-green-600">
                  KES {purchaseOrder.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-green-600">
                  KES {purchaseOrder.amount_paid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Outstanding:</span>
                <span className="font-medium text-orange-600">
                  KES {(purchaseOrder.total - purchaseOrder.amount_paid).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(purchaseOrder.terms || purchaseOrder.notes) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes & Terms
              </h3>
              {purchaseOrder.terms && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700 block mb-1">Terms & Conditions:</span>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{purchaseOrder.terms}</p>
                </div>
              )}
              {purchaseOrder.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-1">Internal Notes:</span>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{purchaseOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderViewDialog;
