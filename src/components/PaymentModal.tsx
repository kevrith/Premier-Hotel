/**
 * Payment Modal Component
 * Handles payment initiation for bookings and orders
 */
import { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, DollarSign, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { paymentService, type PaymentInitiate, type Payment } from '@/lib/api/payments';
import toast from 'react-hot-toast';

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

type PaymentMethod = 'mpesa' | 'cash' | 'card';
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
  const [step, setStep] = useState<PaymentStep>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string>('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('method');
      setPhoneNumber('');
      setCardNumber('');
      setCardExpiry('');
      setCardCVV('');
      setError('');
      setCurrentPayment(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setError('');

    if (method === 'cash') {
      // Cash payments don't need additional details
      setStep('details');
    } else {
      setStep('details');
    }
  };

  const handleInitiatePayment = async () => {
    setError('');

    // Validate inputs based on payment method
    if (paymentMethod === 'mpesa') {
      if (!phoneNumber) {
        setError('Please enter your phone number');
        return;
      }

      if (!paymentService.isValidPhoneNumber(phoneNumber)) {
        setError('Please enter a valid phone number (e.g., 0712345678)');
        return;
      }
    } else if (paymentMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCVV) {
        setError('Please fill in all card details');
        return;
      }

      // Basic card validation
      if (cardNumber.replace(/\s/g, '').length < 13) {
        setError('Please enter a valid card number');
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
        description: description || `Payment for ${referenceType}`
      };

      if (paymentMethod === 'mpesa') {
        paymentData.phone_number = paymentService.formatPhoneNumber(phoneNumber);
      }

      // Initiate payment
      const payment = await paymentService.initiatePayment(paymentData);
      setCurrentPayment(payment);

      if (paymentMethod === 'mpesa') {
        // For M-Pesa, poll for payment status
        toast.success('Please check your phone and enter your M-Pesa PIN');

        await paymentService.pollPaymentStatus(payment.id, {
          interval: 3000,
          maxAttempts: 40,
          onStatusUpdate: (updatedPayment) => {
            setCurrentPayment(updatedPayment);
          }
        });

        // Payment completed successfully
        setStep('success');
        toast.success('Payment completed successfully!');

        if (onSuccess) {
          onSuccess(payment);
        }
      } else if (paymentMethod === 'cash') {
        // Cash payments remain pending
        setStep('success');
        toast.success('Cash payment recorded. Please pay at the front desk.');

        if (onSuccess) {
          onSuccess(payment);
        }
      } else if (paymentMethod === 'card') {
        // Card payments would go through a payment gateway
        // For now, mark as pending
        setStep('success');
        toast.success('Card payment initiated. Awaiting confirmation.');

        if (onSuccess) {
          onSuccess(payment);
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Payment failed';
      setError(errorMessage);
      setStep('failed');
      toast.error(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Payment Method</h3>
      <p className="text-sm text-gray-600">
        Amount to pay: <span className="font-bold">KES {amount.toLocaleString()}</span>
      </p>

      <div className="space-y-3">
        {/* M-Pesa */}
        <button
          onClick={() => handleMethodSelect('mpesa')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
            paymentMethod === 'mpesa'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">M-Pesa</p>
              <p className="text-sm text-gray-600">Pay with your mobile money</p>
            </div>
          </div>
        </button>

        {/* Card */}
        <button
          onClick={() => handleMethodSelect('card')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
            paymentMethod === 'card'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Credit/Debit Card</p>
              <p className="text-sm text-gray-600">Pay with Visa or Mastercard</p>
            </div>
          </div>
        </button>

        {/* Cash */}
        <button
          onClick={() => handleMethodSelect('cash')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
            paymentMethod === 'cash'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-200 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Cash</p>
              <p className="text-sm text-gray-600">Pay at the front desk</p>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={handleClose}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-4">
      <button
        onClick={() => setStep('method')}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Change payment method
      </button>

      <h3 className="text-lg font-semibold text-gray-900">
        {paymentMethod === 'mpesa' && 'M-Pesa Payment'}
        {paymentMethod === 'card' && 'Card Payment'}
        {paymentMethod === 'cash' && 'Cash Payment'}
      </h3>

      <p className="text-sm text-gray-600">
        Amount: <span className="font-bold">KES {amount.toLocaleString()}</span>
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* M-Pesa Details */}
      {paymentMethod === 'mpesa' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              You'll receive a prompt on your phone to complete the payment
            </p>
          </div>
        </div>
      )}

      {/* Card Details */}
      {paymentMethod === 'card' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                maxLength={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                placeholder="123"
                value={cardCVV}
                onChange={(e) => setCardCVV(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cash Details */}
      {paymentMethod === 'cash' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Please proceed to the front desk to complete your cash payment. Your {referenceType} will
            be confirmed once payment is received.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleInitiatePayment}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm Payment'
          )}
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

      {currentPayment && (
        <div className="mt-4 text-xs text-gray-500">
          Status: {currentPayment.status}
        </div>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>

      {paymentMethod === 'mpesa' && currentPayment?.mpesa_transaction_id && (
        <p className="text-sm text-gray-600 mb-4">
          Transaction ID: {currentPayment.mpesa_transaction_id}
        </p>
      )}

      {paymentMethod === 'cash' && (
        <p className="text-sm text-gray-600 mb-4">
          Please proceed to the front desk to complete your payment
        </p>
      )}

      <button
        onClick={handleClose}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
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
        <button
          onClick={() => setStep('method')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Try Again
        </button>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          {step !== 'processing' && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Payment</h2>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}

          {/* Content */}
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
