// @ts-nocheck
/**
 * Payment Modal Component
 * Handles M-Pesa, Cash, Paystack (card/bank), and PayPal payments
 */
import { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, DollarSign, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { paymentService, type PaymentInitiate, type Payment } from '@/lib/api/payments';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';
import { useAcceptedPaymentMethods } from '@/hooks/useAcceptedPaymentMethods';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceType: 'booking' | 'order';
  referenceId: string;
  amount: number;
  description?: string;
  onSuccess?: (payment: Payment) => void;
  onError?: (error: string) => void;
}

type PaymentMethod = 'mpesa' | 'cash' | 'paystack' | 'paypal';
type PaymentStep = 'method' | 'details' | 'processing' | 'success' | 'failed';

export default function PaymentModal({
  isOpen,
  onClose,
  referenceType,
  referenceId,
  amount,
  description,
  onSuccess,
  onError
}: PaymentModalProps) {
  const { isEnabled } = useAcceptedPaymentMethods();
  const [step, setStep] = useState<PaymentStep>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStep('method');
      setPhoneNumber('');
      setEmail('');
      setError('');
      setCurrentPayment(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (step !== 'processing') onClose();
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setError('');
    setStep('details');
  };

  const handleInitiatePayment = async () => {
    setError('');

    if (paymentMethod === 'mpesa') {
      if (!phoneNumber) { setError('Please enter your phone number'); return; }
      if (!paymentService.isValidPhoneNumber(phoneNumber)) {
        setError('Please enter a valid Kenyan phone number (e.g. 0712345678)');
        return;
      }
    }

    if (paymentMethod === 'paystack') {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    setStep('processing');

    try {
      const paymentData: PaymentInitiate = {
        payment_method: paymentMethod,
        amount,
        reference_type: referenceType,
        reference_id: referenceId,
        description: description || `Payment for ${referenceType}`,
      };

      if (paymentMethod === 'mpesa') {
        paymentData.phone_number = paymentService.formatPhoneNumber(phoneNumber);
      }

      if (paymentMethod === 'paystack') {
        paymentData.email = email;
      }

      if (paymentMethod === 'paypal') {
        paymentData.return_url = `${window.location.origin}/payment/paypal/return`;
        paymentData.cancel_url = `${window.location.origin}/payment/paypal/cancel`;
      }

      const payment = await paymentService.initiatePayment(paymentData);
      setCurrentPayment(payment);

      if (paymentMethod === 'mpesa') {
        toast.success('Please check your phone and enter your M-Pesa PIN');
        await paymentService.pollPaymentStatus(payment.id, {
          interval: 3000,
          maxAttempts: 40,
          onStatusUpdate: (p) => setCurrentPayment(p),
        });
        setStep('success');
        toast.success('Payment completed successfully!');
        onSuccess?.(payment);

      } else if (paymentMethod === 'cash') {
        setStep('success');
        toast.success('Cash payment recorded. Please pay at the front desk.');
        onSuccess?.(payment);

      } else if (paymentMethod === 'paystack' && payment.paystack_authorization_url) {
        // Redirect to Paystack hosted page
        toast.success('Redirecting to Paystack…');
        window.location.href = payment.paystack_authorization_url;

      } else if (paymentMethod === 'paypal' && payment.paypal_approval_url) {
        // Redirect to PayPal approval page
        toast.success('Redirecting to PayPal…');
        window.location.href = payment.paypal_approval_url;

      } else {
        setStep('success');
        onSuccess?.(payment);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Payment failed';
      setError(errorMessage);
      setStep('failed');
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Payment Method</h3>
      <p className="text-sm text-gray-600">
        Amount: <span className="font-bold">KES {amount.toLocaleString()}</span>
      </p>

      <div className="space-y-3">
        {isEnabled('mpesa') && (
          <button
            onClick={() => handleMethodSelect('mpesa')}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              paymentMethod === 'mpesa' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">M-Pesa</p>
                <p className="text-sm text-gray-600">Pay with your mobile money</p>
              </div>
            </div>
          </button>
        )}

        {isEnabled('paystack') && (
          <button
            onClick={() => handleMethodSelect('paystack')}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              paymentMethod === 'paystack' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">Card / Bank Transfer</p>
                <p className="text-sm text-gray-600">Visa, Mastercard, bank transfer via Paystack</p>
              </div>
            </div>
          </button>
        )}

        {isEnabled('paypal') && (
          <button
            onClick={() => handleMethodSelect('paypal')}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              paymentMethod === 'paypal' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="font-semibold text-gray-900">PayPal</p>
                <p className="text-sm text-gray-600">Pay with your PayPal account</p>
              </div>
            </div>
          </button>
        )}

        {isEnabled('cash') && (
          <button
            onClick={() => handleMethodSelect('cash')}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              paymentMethod === 'cash' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-gray-900">Cash</p>
                <p className="text-sm text-gray-600">Pay at the front desk</p>
              </div>
            </div>
          </button>
        )}
      </div>

      <button onClick={handleClose} className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
        Cancel
      </button>
    </div>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-4">
      <button onClick={() => setStep('method')} className="text-sm text-blue-600 hover:underline">
        ← Change payment method
      </button>

      <h3 className="text-lg font-semibold text-gray-900">
        {paymentMethod === 'mpesa' && 'M-Pesa Payment'}
        {paymentMethod === 'paystack' && 'Card / Bank Transfer (Paystack)'}
        {paymentMethod === 'paypal' && 'PayPal Payment'}
        {paymentMethod === 'cash' && 'Cash Payment'}
      </h3>

      <p className="text-sm text-gray-600">
        Amount: <span className="font-bold">KES {amount.toLocaleString()}</span>
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* M-Pesa */}
      {paymentMethod === 'mpesa' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            placeholder="0712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
          <p className="mt-1 text-xs text-gray-500">You'll receive an M-Pesa prompt to complete payment</p>
        </div>
      )}

      {/* Paystack */}
      {paymentMethod === 'paystack' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            You'll be redirected to Paystack's secure payment page to complete your payment
          </p>
        </div>
      )}

      {/* PayPal */}
      {paymentMethod === 'paypal' && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
          <p className="text-sm text-gray-700">
            You'll be redirected to PayPal to complete the payment. After approval, you'll be
            returned here automatically.
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ PayPal does not support KES. Your amount will be converted to USD at the hotel's
            configured exchange rate before charging.
          </p>
        </div>
      )}

      {/* Cash */}
      {paymentMethod === 'cash' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Please proceed to the front desk to complete your cash payment. Your {referenceType} will
            be confirmed once payment is received.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleClose} disabled={loading} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        <button
          onClick={handleInitiatePayment}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-8">
      <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
      {paymentMethod === 'mpesa' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Please check your phone for an M-Pesa prompt</p>
          <p className="text-sm text-gray-600">Enter your PIN to complete the payment</p>
          <p className="text-xs text-gray-500 mt-4">This may take up to 2 minutes</p>
        </div>
      )}
      {(paymentMethod === 'paystack' || paymentMethod === 'paypal') && (
        <p className="text-sm text-gray-600">Redirecting to payment page…</p>
      )}
      {currentPayment && (
        <div className="mt-4 text-xs text-gray-500">Status: {currentPayment.status}</div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
      {paymentMethod === 'mpesa' && currentPayment?.mpesa_transaction_id && (
        <p className="text-sm text-gray-600 mb-4">Transaction ID: {currentPayment.mpesa_transaction_id}</p>
      )}
      {paymentMethod === 'cash' && (
        <p className="text-sm text-gray-600 mb-4">Please proceed to the front desk to complete your payment</p>
      )}
      <button onClick={handleClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Close
      </button>
    </div>
  );

  const renderFailed = () => (
    <div className="text-center py-8">
      <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h3>
      <p className="text-sm text-gray-600 mb-6">{error || 'Something went wrong'}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => setStep('method')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Try Again
        </button>
        <button onClick={handleClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {step !== 'processing' && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Payment</h2>
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}
          {step === 'method' && renderMethodSelection()}
          {step === 'details' && renderPaymentDetails()}
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
          {step === 'failed' && renderFailed()}
        </div>
      </div>
    </div>
  );
}
