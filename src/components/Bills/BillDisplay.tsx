/**
 * BillDisplay Component
 * Displays bill details with orders grouped by waiter
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { BillResponse } from '@/types/bills';
import { Receipt, User, Calendar, DollarSign, QrCode } from 'lucide-react';
import { BillQRCode } from './BillQRCode';

interface BillDisplayProps {
  bill: BillResponse;
}

export function BillDisplay({ bill }: BillDisplayProps) {
  const [showQRCode, setShowQRCode] = useState(false);

  // Group orders by waiter
  const ordersByWaiter = bill.orders.reduce((acc, order) => {
    if (!acc[order.waiter_id]) {
      acc[order.waiter_id] = {
        waiter_name: order.waiter_name,
        orders: [],
        total: 0,
      };
    }
    acc[order.waiter_id].orders.push(order);
    acc[order.waiter_id].total += order.amount;
    return acc;
  }, {} as Record<string, { waiter_name: string; orders: typeof bill.orders; total: number }>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Bill {bill.bill_number}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {bill.payment_status !== 'paid' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQRCode(true)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Show QR
                </Button>
              )}
              <Badge className={getStatusColor(bill.payment_status)}>
                {bill.payment_status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>

      <CardContent className="space-y-4">
        {/* Bill Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">{formatDate(bill.created_at)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Location:</span>{' '}
            <span className="font-medium">
              {bill.location_type === 'table' ? `Table ${bill.table_number}` : `Room ${bill.room_number}`}
            </span>
          </div>
          {bill.customer_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{bill.customer_name}</span>
            </div>
          )}
          {bill.customer_phone && (
            <div>
              <span className="text-muted-foreground">Phone:</span>{' '}
              <span className="font-medium">{bill.customer_phone}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Orders grouped by waiter */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Order Details</h4>
          {Object.entries(ordersByWaiter).map(([waiterId, { waiter_name, orders, total }]) => (
            <div key={waiterId} className="space-y-2 border-l-2 border-primary/20 pl-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{waiter_name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatCurrency(total)}</span>
              </div>

              {orders.map((order) => (
                <div key={order.order_id} className="ml-5 space-y-1">
                  <div className="text-xs text-muted-foreground">Order #{order.order_number}</div>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (16%):</span>
            <span>{formatCurrency(bill.tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Total:
            </span>
            <span>{formatCurrency(bill.total_amount)}</span>
          </div>
        </div>

        {/* Payments */}
        {bill.payments && bill.payments.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Payments</h4>
              {bill.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{payment.payment_method.toUpperCase()}</Badge>
                    <span className="text-muted-foreground">{payment.payment_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    <Badge
                      className={
                        payment.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {payment.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
              {bill.payment_status === 'partial' && (
                <div className="flex justify-between text-sm font-medium text-orange-600 mt-2">
                  <span>Remaining Balance:</span>
                  <span>
                    {formatCurrency(
                      bill.total_amount - bill.payments.reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* QR Code Dialog */}
    <BillQRCode bill={bill} open={showQRCode} onOpenChange={setShowQRCode} />
    </>
  );
}
