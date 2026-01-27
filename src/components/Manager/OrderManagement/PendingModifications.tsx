import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  DollarSign, 
  User, 
  CheckCircle, 
  XCircle,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { orderManagementService, type OrderModification } from '@/lib/api/order-management';

export function PendingModifications() {
  const [modifications, setModifications] = useState<OrderModification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadModifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadModifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadModifications = async () => {
    setIsLoading(true);
    try {
      const data = await orderManagementService.getPendingModifications();
      setModifications(data);
    } catch (error: any) {
      toast.error('Failed to load pending modifications');
    } finally {
      setIsLoading(false);
    }
  };

  const approveModification = async (modificationId: string, managerPin: string) => {
    try {
      await orderManagementService.approveVoid(modificationId, managerPin);
      toast.success('Modification approved successfully');
      loadModifications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve modification');
    }
  };

  const rejectModification = async (modificationId: string, reason: string) => {
    try {
      await orderManagementService.rejectVoid(modificationId, reason);
      toast.success('Modification rejected');
      loadModifications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject modification');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getModificationTypeLabel = (type: string) => {
    switch (type) {
      case 'void': return 'Void Request';
      case 'reverse': return 'Order Reversal';
      case 'discount': return 'Discount Request';
      case 'price_adjustment': return 'Price Adjustment';
      default: return type;
    }
  };

  const getModificationTypeColor = (type: string) => {
    switch (type) {
      case 'void': return 'bg-red-100 text-red-800';
      case 'reverse': return 'bg-orange-100 text-orange-800';
      case 'discount': return 'bg-green-100 text-green-800';
      case 'price_adjustment': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Order Modifications</CardTitle>
        <CardDescription>
          Manager approval required for order changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading pending modifications...</p>
          </div>
        ) : modifications.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">No pending modifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modifications.map((modification) => (
              <div key={modification.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={getModificationTypeColor(modification.modification_type)}>
                      {getModificationTypeLabel(modification.modification_type)}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Order: {modification.order_id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(modification.created_at)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Amount</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(modification.amount)}</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Requested By</span>
                    </div>
                    <p className="text-sm">{modification.approved_by}</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {modification.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Reason</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                    {modification.reason}
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <ApproveDialog 
                    modificationId={modification.id}
                    amount={modification.amount}
                    onApprove={approveModification}
                  />
                  <RejectDialog 
                    modificationId={modification.id}
                    onReject={rejectModification}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Approve Dialog Component
function ApproveDialog({ 
  modificationId, 
  amount, 
  onApprove 
}: { 
  modificationId: string; 
  amount: number; 
  onApprove: (id: string, pin: string) => void; 
}) {
  const [open, setOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    if (!managerPin) {
      toast.error('Manager PIN is required');
      return;
    }

    setIsLoading(true);
    try {
      await onApprove(modificationId, managerPin);
      setOpen(false);
      setManagerPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <CheckCircle className="h-4 w-4" />
        Approve
      </Button>
      
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Approve Modification</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to approve a modification for {new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES'
              }).format(amount)}
            </p>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Manager PIN</label>
              <input
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter manager PIN"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isLoading || !managerPin}
              >
                {isLoading ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reject Dialog Component
function RejectDialog({ 
  modificationId, 
  onReject 
}: { 
  modificationId: string; 
  onReject: (id: string, reason: string) => void; 
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsLoading(true);
    try {
      await onReject(modificationId, reason.trim());
      setOpen(false);
      setReason('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
      
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject Modification</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting this modification
            </p>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Rejection Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={3}
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReject}
                disabled={isLoading || !reason.trim()}
                variant="destructive"
              >
                {isLoading ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}