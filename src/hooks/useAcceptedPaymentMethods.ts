/**
 * Hook to fetch which payment methods this hotel has enabled in Settings.
 * Falls back to all methods if the setting hasn't been configured yet.
 */
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';

const ALL_METHODS = ['cash', 'mpesa', 'card', 'paystack', 'paypal'];

export function useAcceptedPaymentMethods() {
  const [methods, setMethods] = useState<string[]>(ALL_METHODS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // /settings/payment-methods is accessible to all authenticated users (no credentials returned)
    apiClient.get('/settings/payment-methods')
      .then(res => {
        const data = res.data as any;
        if (Array.isArray(data?.accepted_payment_methods) && data.accepted_payment_methods.length > 0) {
          setMethods(data.accepted_payment_methods);
        }
      })
      .catch(() => {
        // Network error or not configured — show all methods
      })
      .finally(() => setLoading(false));
  }, []);

  const isEnabled = (method: string) => methods.includes(method);

  return { methods, loading, isEnabled };
}
