import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';

interface TaxConfig {
  vat_enabled: boolean;
  vat_rate: number;
  tourism_levy_enabled: boolean;
  tourism_levy_rate: number;
  tax_inclusive: boolean;
}

export function useTaxSettings() {
  const [config, setConfig] = useState<TaxConfig>({
    vat_enabled: false,
    vat_rate: 0.16,
    tourism_levy_enabled: false,
    tourism_levy_rate: 0.02,
    tax_inclusive: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxConfig();
  }, []);

  const fetchTaxConfig = async () => {
    try {
      const response = await apiClient.get('/settings/tax-config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching tax config:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTax = (amount: number) => {
    if (!config.vat_enabled && !config.tourism_levy_enabled) {
      return { base: amount, vat: 0, levy: 0, total: amount };
    }

    const vatRate = config.vat_enabled ? config.vat_rate : 0;
    const levyRate = config.tourism_levy_enabled ? config.tourism_levy_rate : 0;
    const totalTaxRate = vatRate + levyRate;

    if (config.tax_inclusive) {
      const base = amount / (1 + totalTaxRate);
      const vat = base * vatRate;
      const levy = base * levyRate;
      return { base, vat, levy, total: amount };
    } else {
      const vat = amount * vatRate;
      const levy = amount * levyRate;
      return { base: amount, vat, levy, total: amount + vat + levy };
    }
  };

  return { config, loading, calculateTax };
}
