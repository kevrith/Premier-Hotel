/**
 * PayPal Cancel Page
 * PayPal redirects here if the customer cancels or closes the PayPal window.
 */
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PayPalCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-4">
        <XCircle className="w-16 h-16 text-orange-400 mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">Payment Cancelled</h2>
        <p className="text-muted-foreground text-sm">
          You cancelled the PayPal payment. No charge was made. You can try again or choose a different payment method.
        </p>
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
