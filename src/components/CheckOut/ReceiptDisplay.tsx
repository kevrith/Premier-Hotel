// @ts-nocheck
import { Download, Mail, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { bookingService } from '@/lib/api/services/bookingService';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  date?: string;
}

interface ReceiptData {
  bookingId: string;
  receiptNumber: string;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  deposit?: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
}

interface ReceiptDisplayProps {
  receiptData: ReceiptData;
  showActions?: boolean;
  guestEmail?: string;
}

export function ReceiptDisplay({ receiptData, showActions = true, guestEmail }: ReceiptDisplayProps) {
  const handleDownload = async () => {
    try {
      await bookingService.downloadReceipt(receiptData.bookingId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  const handlePrint = () => {
    const fmt = (n: number) =>
      `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    const now = new Date().toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const itemRows = receiptData.items.map(item => `
      <div class="row">
        <span style="flex:1;padding-right:6px">${item.description}${item.quantity ? ` x${item.quantity}` : ''}</span>
        <span style="white-space:nowrap">${fmt(item.amount)}</span>
      </div>
    `).join('');

    const statusLine =
      receiptData.paymentStatus === 'paid' ? '*** PAID IN FULL ***' :
      receiptData.paymentStatus === 'partial' ? '--- PARTIALLY PAID ---' :
      '--- PAYMENT PENDING ---';

    const html = `<!DOCTYPE html>
      <html>
      <head><title>Receipt ${receiptData.receiptNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 8px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .divider-solid { border-top: 2px solid #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-size: 14px; font-weight: bold; }
        .small { font-size: 10px; }
        @media print { @page { size: 80mm auto; margin: 0; } body { padding: 4px; } }
      </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size:15px;">Premier Hotel</div>
          <div class="small">Nairobi, Kenya | +254 700 000000</div>
          <div class="bold" style="font-size:13px;margin-top:4px;">ROOM CHECKOUT RECEIPT</div>
        </div>
        <div class="divider-solid"></div>

        <div class="row"><span class="bold">Receipt #</span><span>${receiptData.receiptNumber}</span></div>
        <div class="row"><span class="bold">Guest</span><span>${receiptData.guestName}</span></div>
        <div class="row"><span class="bold">Room</span><span>${receiptData.roomNumber}</span></div>
        <div class="row"><span class="bold">Check-In</span><span>${fmtDate(receiptData.checkInDate)}</span></div>
        <div class="row"><span class="bold">Check-Out</span><span>${fmtDate(receiptData.checkOutDate)}</span></div>
        ${receiptData.paymentMethod ? `<div class="row"><span class="bold">Payment</span><span>${receiptData.paymentMethod}</span></div>` : ''}
        <div class="row"><span class="bold">Issued</span><span>${now}</span></div>

        <div class="divider"></div>
        <div class="bold" style="margin-bottom:3px;">CHARGES</div>
        ${itemRows}
        <div class="divider"></div>

        <div class="row"><span>Subtotal</span><span>${fmt(receiptData.subtotal)}</span></div>
        ${receiptData.tax && receiptData.tax > 0 ? `<div class="row"><span>Tax (16% VAT)</span><span>${fmt(receiptData.tax)}</span></div>` : ''}
        ${receiptData.deposit && receiptData.deposit > 0 ? `<div class="row"><span>Deposit Paid</span><span>-${fmt(receiptData.deposit)}</span></div>` : ''}
        <div class="divider-solid"></div>
        <div class="row total"><span>TOTAL</span><span>${fmt(receiptData.total)}</span></div>

        <div class="center bold" style="margin-top:8px;">${statusLine}</div>
        <div class="divider"></div>
        <div class="center small">Thank you for staying with us!</div>
        <div class="center small">This is a computer-generated receipt</div>
      </body>
      </html>`;

    const w = window.open('', '_blank', 'width=340,height=600,menubar=no,toolbar=no');
    if (!w) { alert('Please allow pop-ups to enable printing.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.addEventListener('afterprint', () => w.close());
    }, 300);
  };

  const handleEmailReceipt = async () => {
    const email = guestEmail || await confirmDialog.prompt({
      title: 'Email Receipt',
      label: 'Email address',
      placeholder: 'guest@example.com',
      confirmLabel: 'Send',
    });
    if (!email) return;
    try {
      await apiClient.post('/emails/queue', {
        to_email: email,
        email_type: 'payment_receipt',
        data: {
          booking_id: receiptData.bookingId,
          receipt_number: receiptData.receiptNumber,
          guest_name: receiptData.guestName,
          room_number: receiptData.roomNumber,
          check_in_date: receiptData.checkInDate,
          check_out_date: receiptData.checkOutDate,
          total_amount: receiptData.total,
          payment_method: receiptData.paymentMethod || 'N/A',
          items: receiptData.items,
        },
      });
      toast.success(`Receipt sent to ${email}`);
    } catch (error) {
      toast.error('Failed to send receipt email');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleEmailReceipt}>
            <Mail className="h-4 w-4 mr-2" />
            Email Receipt
          </Button>
        </div>
      )}

      {/* Receipt Card */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="text-center border-b pb-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-primary">Premier Hotel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              123 Hotel Street, Nairobi, Kenya
            </p>
            <p className="text-sm text-muted-foreground">
              Tel: +254 700 000000 | Email: info@premierhotel.com
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xl font-semibold">
            <FileText className="h-6 w-6" />
            RECEIPT
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Receipt Header Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Guest Information</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {receiptData.guestName}</p>
                <p><strong>Room Number:</strong> {receiptData.roomNumber}</p>
                <p><strong>Check-In:</strong> {formatDate(receiptData.checkInDate)}</p>
                <p><strong>Check-Out:</strong> {formatDate(receiptData.checkOutDate)}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Receipt Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Receipt #:</strong> {receiptData.receiptNumber}</p>
                <p><strong>Booking ID:</strong> {receiptData.bookingId}</p>
                <p><strong>Date Issued:</strong> {formatDate(new Date().toISOString())}</p>
                {receiptData.paymentMethod && (
                  <p><strong>Payment Method:</strong> {receiptData.paymentMethod}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Itemized Charges */}
          <div>
            <h3 className="font-semibold mb-4">Itemized Charges</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Description</th>
                    <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Date</th>
                    <th className="text-right p-3 text-sm font-medium hidden md:table-cell">Qty</th>
                    <th className="text-right p-3 text-sm font-medium hidden md:table-cell">Unit Price</th>
                    <th className="text-right p-3 text-sm font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {receiptData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-3 text-sm">{item.description}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-sm text-right hidden md:table-cell">
                        {item.quantity || '-'}
                      </td>
                      <td className="p-3 text-sm text-right hidden md:table-cell">
                        {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(receiptData.subtotal)}</span>
            </div>

            {receiptData.tax && receiptData.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax (16% VAT):</span>
                <span className="font-medium">{formatCurrency(receiptData.tax)}</span>
              </div>
            )}

            {receiptData.deposit && receiptData.deposit > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Deposit/Advance Payment:</span>
                <span className="font-medium">-{formatCurrency(receiptData.deposit)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-primary">{formatCurrency(receiptData.total)}</span>
            </div>

            {/* Payment Status Badge */}
            <div className="flex justify-end">
              {receiptData.paymentStatus === 'paid' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="w-3 h-3 bg-green-600 rounded-full" />
                  <span className="font-semibold text-green-900">PAID IN FULL</span>
                </div>
              )}
              {receiptData.paymentStatus === 'pending' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-lg">
                  <div className="w-3 h-3 bg-amber-600 rounded-full" />
                  <span className="font-semibold text-amber-900">PAYMENT PENDING</span>
                </div>
              )}
              {receiptData.paymentStatus === 'partial' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="w-3 h-3 bg-blue-600 rounded-full" />
                  <span className="font-semibold text-blue-900">PARTIALLY PAID</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Footer Notes */}
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Terms & Conditions</h4>
              <ul className="space-y-1 text-xs">
                <li>• All charges are in Kenyan Shillings (KES)</li>
                <li>• Prices include applicable taxes unless otherwise stated</li>
                <li>• Refunds are subject to hotel cancellation policy</li>
                <li>• This is a computer-generated receipt and does not require a signature</li>
              </ul>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="font-medium text-foreground">Thank you for staying with us!</p>
              <p className="text-xs mt-1">
                We hope you enjoyed your stay at Premier Hotel. We look forward to welcoming you again.
              </p>
            </div>

            <div className="text-center text-xs">
              <p>For any queries regarding this receipt, please contact us at:</p>
              <p className="font-medium">accounts@premierhotel.com | +254 700 000000</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// Example usage component
export function ReceiptPage({ bookingId }: { bookingId: string }) {
  // This would fetch receipt data from the API
  const exampleReceiptData: ReceiptData = {
    bookingId: bookingId,
    receiptNumber: `REC-${Date.now()}`,
    guestName: 'John Doe',
    roomNumber: '305',
    checkInDate: '2025-01-01',
    checkOutDate: '2025-01-03',
    items: [
      {
        description: 'Deluxe Room - 2 Nights',
        quantity: 2,
        unitPrice: 15000,
        amount: 30000,
        date: '2025-01-01',
      },
      {
        description: 'Room Service',
        amount: 2500,
        date: '2025-01-02',
      },
      {
        description: 'Minibar',
        amount: 1200,
        date: '2025-01-02',
      },
    ],
    subtotal: 33700,
    tax: 5392, // 16% VAT
    deposit: 10000,
    total: 29092,
    paymentMethod: 'M-Pesa',
    paymentStatus: 'paid',
  };

  return <ReceiptDisplay receiptData={exampleReceiptData} />;
}
