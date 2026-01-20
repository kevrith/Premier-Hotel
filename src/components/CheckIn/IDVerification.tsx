import { useState } from 'react';
import { CheckCircle, XCircle, Upload, Eye, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface IDVerificationProps {
  registrationId: string;
  registrationData: {
    first_name: string;
    last_name: string;
    id_type: string;
    id_number: string;
    id_expiry_date: string;
    id_verified: boolean;
    id_document_url?: string;
  };
  onVerificationComplete?: (verified: boolean) => void;
}

export function IDVerification({
  registrationId,
  registrationData,
  onVerificationComplete
}: IDVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected'>(
    registrationData.id_verified ? 'approved' : 'pending'
  );
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // TODO: Call API to approve ID verification
      // await checkinCheckoutService.verifyID(registrationId, { verified: true, notes: verificationNotes });

      setVerificationStatus('approved');
      toast.success('ID verification approved');
      onVerificationComplete?.(true);
    } catch (error) {
      toast.error('Failed to approve verification');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call API to reject ID verification
      // await checkinCheckoutService.verifyID(registrationId, { verified: false, notes: rejectionReason });

      setVerificationStatus('rejected');
      toast.success('ID verification rejected');
      onVerificationComplete?.(false);
    } catch (error) {
      toast.error('Failed to reject verification');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'approved':
        return <Badge className="bg-green-600">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending Verification</Badge>;
    }
  };

  const getIDTypeLabel = (type: string) => {
    switch (type) {
      case 'passport':
        return 'Passport';
      case 'drivers_license':
        return "Driver's License";
      case 'national_id':
        return 'National ID';
      default:
        return 'Other';
    }
  };

  const isExpired = () => {
    if (!registrationData.id_expiry_date) return false;
    return new Date(registrationData.id_expiry_date) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>ID Verification</CardTitle>
            <CardDescription>
              Verify guest identification document
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ID Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Guest Name</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border">
              {registrationData.first_name} {registrationData.last_name}
            </div>
          </div>
          <div>
            <Label>ID Type</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border">
              {getIDTypeLabel(registrationData.id_type)}
            </div>
          </div>
          <div>
            <Label>ID Number</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border font-mono">
              {registrationData.id_number}
            </div>
          </div>
          <div>
            <Label>Expiry Date</Label>
            <div className={`mt-1 p-2 rounded border ${
              isExpired() ? 'bg-red-50 border-red-300' : 'bg-gray-50'
            }`}>
              {new Date(registrationData.id_expiry_date).toLocaleDateString()}
              {isExpired() && (
                <span className="ml-2 text-xs text-red-600 font-medium">EXPIRED</span>
              )}
            </div>
          </div>
        </div>

        {/* Expiry Warning */}
        {isExpired() && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">ID Document Expired</p>
              <p className="text-sm text-red-700">
                This identification document has expired. Guest should provide a valid ID.
              </p>
            </div>
          </div>
        )}

        {/* Document Preview/Upload */}
        <div>
          <Label>ID Document</Label>
          {registrationData.id_document_url ? (
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDocumentPreviewOpen(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Document
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(registrationData.id_document_url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ) : (
            <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center bg-gray-50">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No document uploaded. Guest should provide physical ID for verification.
              </p>
            </div>
          )}
        </div>

        {/* Verification Actions */}
        {verificationStatus === 'pending' && (
          <div className="space-y-4 border-t pt-6">
            <div>
              <Label htmlFor="verification_notes">Verification Notes (Optional)</Label>
              <Textarea
                id="verification_notes"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Any notes about the verification process..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={loading || isExpired()}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Verification
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (!rejectionReason) {
                    toast.error('Please provide rejection reason below');
                    return;
                  }
                  handleReject();
                }}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Verification
              </Button>
            </div>

            <div>
              <Label htmlFor="rejection_reason">Rejection Reason (Required if rejecting)</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejecting the ID verification..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Verification Result */}
        {verificationStatus === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">ID Verified</p>
              <p className="text-sm text-green-700">
                This guest's identification has been verified and approved.
              </p>
              {verificationNotes && (
                <p className="text-sm text-green-700 mt-2">
                  <strong>Notes:</strong> {verificationNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {verificationStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">ID Verification Rejected</p>
              <p className="text-sm text-red-700">
                <strong>Reason:</strong> {rejectionReason}
              </p>
            </div>
          </div>
        )}

        {/* Verification Checklist */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">Verification Checklist</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300" />
              <span>Photo on ID matches guest appearance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300" />
              <span>Name on ID matches booking name</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300" />
              <span>ID is not expired</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300" />
              <span>ID appears authentic (no signs of tampering)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300" />
              <span>All required information is clearly visible</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Document Preview Dialog */}
      {registrationData.id_document_url && (
        <Dialog open={documentPreviewOpen} onOpenChange={setDocumentPreviewOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>ID Document Preview</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <img
                src={registrationData.id_document_url}
                alt="ID Document"
                className="w-full rounded-lg border"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
