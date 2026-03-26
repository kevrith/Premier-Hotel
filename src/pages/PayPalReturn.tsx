/**
 * PayPal Return Page
 * PayPal redirects here after the customer approves payment.
 * URL params: ?token=PAYPAL_ORDER_ID&PayerID=PAYER_ID
 * We capture the order here to complete the payment.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { paymentService } from '@/lib/api/payments';

export default function PayPalReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const orderId = searchParams.get('token'); // PayPal passes the order ID as 'token'

    if (!orderId) {
      setStatus('failed');
      setMessage('Missing PayPal order ID. Please contact support.');
      return;
    }

    paymentService.capturePayPalOrder(orderId)
      .then(() => {
        setStatus('success');
        setMessage('Payment completed successfully! Your booking/order has been confirmed.');
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.detail || err?.message || 'Payment capture failed.';
        setStatus('failed');
        setMessage(msg);
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold">Completing Payment…</h2>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your payment with PayPal.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Payment Successful!</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Back to Home
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-700">Payment Failed</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
              >
                Go Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
