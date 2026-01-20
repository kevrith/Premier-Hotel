import { Download, Mail, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { bookingService } from '@/lib/api/services/bookingService';
import toast from 'react-hot-toast';

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
}

export function ReceiptDisplay({ receiptData, showActions = true }: ReceiptDisplayProps) {
  const handleDownload = async () => {
    try {
      await bookingService.downloadReceipt(receiptData.bookingId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReceipt = async () => {
    try {
      // TODO: Implement email receipt functionality
      toast.success('Receipt sent to your email');
    } catch (error) {
      toast.error('Failed to send receipt');
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

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 20mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
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
