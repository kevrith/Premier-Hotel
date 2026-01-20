/**
 * BillsManagement Component
 * Main component for managing bills - view, create, and process payments
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { billsApi } from '@/lib/api/bills';
import type { BillResponse } from '@/types/bills';
import { Plus, Receipt, Loader2, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { CreateBillDialog } from './CreateBillDialog';
import { BillDisplay } from './BillDisplay';
import { PaymentDialog } from './PaymentDialog';

export function BillsManagement() {
  const [bills, setBills] = useState<BillResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<BillResponse | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid' | 'all'>('unpaid');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(value);
  };

  const fetchBills = async (status?: 'unpaid' | 'paid') => {
    setLoading(true);
    try {
      const data = await billsApi.listBills({
        payment_status: status,
        limit: 100,
      });
      setBills(data);
    } catch (error: any) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchBills();
    } else {
      fetchBills(activeTab);
    }
  }, [activeTab]);

  const handleBillCreated = (bill: BillResponse) => {
    setBills((prev) => [bill, ...prev]);
    setSelectedBill(bill);
  };

  const handlePaymentSuccess = async () => {
    // Refresh the selected bill
    if (selectedBill) {
      try {
        const updated = await billsApi.getBillById(selectedBill.id);
        setSelectedBill(updated);
        // Update in list
        setBills((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b))
        );
      } catch (error) {
        console.error('Error refreshing bill:', error);
      }
    }
    fetchBills(activeTab === 'all' ? undefined : activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    unpaid: bills.filter((b) => b.payment_status === 'unpaid').length,
    partial: bills.filter((b) => b.payment_status === 'partial').length,
    paid: bills.filter((b) => b.payment_status === 'paid').length,
    total: bills.reduce((sum, b) => sum + b.total_amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bills & Payments</h2>
          <p className="text-muted-foreground">Manage customer bills and process payments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bill
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Unpaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Partial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partial}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bills List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bills List */}
        <Card>
          <CardHeader>
            <CardTitle>Bills List</CardTitle>
            <CardDescription>Click on a bill to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : bills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No bills found
                  </div>
                ) : (
                  bills.map((bill) => (
                    <div
                      key={bill.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                        selectedBill?.id === bill.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedBill(bill)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          <span className="font-medium">{bill.bill_number}</span>
                        </div>
                        {getStatusBadge(bill.payment_status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          {bill.location_type === 'table'
                            ? `Table ${bill.table_number}`
                            : `Room ${bill.room_number}`}
                        </div>
                        <div className="font-medium text-foreground">
                          {formatCurrency(bill.total_amount)}
                        </div>
                        <div className="text-xs">
                          {new Date(bill.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Bill Details */}
        <div className="space-y-4">
          {selectedBill ? (
            <>
              <BillDisplay bill={selectedBill} />
              {selectedBill.payment_status !== 'paid' && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Process Payment
                </Button>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a bill to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateBillDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onBillCreated={handleBillCreated}
      />

      {selectedBill && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          bill={selectedBill}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
