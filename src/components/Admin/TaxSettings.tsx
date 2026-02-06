import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api/client';

interface TaxConfig {
  vat_enabled: boolean;
  vat_rate: number;
  tourism_levy_enabled: boolean;
  tourism_levy_rate: number;
  tax_inclusive: boolean;
}

export default function TaxSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TaxConfig>({
    vat_enabled: true,
    vat_rate: 0.16,
    tourism_levy_enabled: false,
    tourism_levy_rate: 0.02,
    tax_inclusive: true,
  });

  useEffect(() => {
    fetchTaxConfig();
  }, []);

  const fetchTaxConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/settings/tax-config');
      setConfig(response.data);
    } catch (error: any) {
      console.error('Error fetching tax config:', error);
      toast.error('Failed to load tax settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/tax-config', config);
      toast.success('Tax settings saved successfully');
    } catch (error: any) {
      console.error('Error saving tax config:', error);
      toast.error(error.response?.data?.detail || 'Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      vat_enabled: true,
      vat_rate: 0.16,
      tourism_levy_enabled: false,
      tourism_levy_rate: 0.02,
      tax_inclusive: true,
    });
    toast.success('Reset to default values');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Tax Configuration
            </CardTitle>
            <CardDescription>
              Manage VAT, tourism levy, and tax calculation settings
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* VAT Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vat-enabled" className="text-base font-semibold">
                Value Added Tax (VAT)
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable VAT on all orders
              </p>
            </div>
            <Switch
              id="vat-enabled"
              checked={config.vat_enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, vat_enabled: checked })
              }
            />
          </div>

          {config.vat_enabled && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="vat-rate">VAT Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="vat-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={(config.vat_rate * 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      vat_rate: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  (Currently: {(config.vat_rate * 100).toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard VAT rate in Kenya is 16%
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Tourism Levy Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="levy-enabled" className="text-base font-semibold">
                Tourism Levy
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable tourism levy on orders
              </p>
            </div>
            <Switch
              id="levy-enabled"
              checked={config.tourism_levy_enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, tourism_levy_enabled: checked })
              }
            />
          </div>

          {config.tourism_levy_enabled && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="levy-rate">Tourism Levy Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="levy-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={(config.tourism_levy_rate * 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tourism_levy_rate: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  (Currently: {(config.tourism_levy_rate * 100).toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tourism levy rate in Kenya is typically 2%
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Tax Calculation Method */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tax-inclusive" className="text-base font-semibold">
                Tax-Inclusive Pricing
              </Label>
              <p className="text-sm text-muted-foreground">
                Prices already include tax (recommended)
              </p>
            </div>
            <Switch
              id="tax-inclusive"
              checked={config.tax_inclusive}
              onCheckedChange={(checked) =>
                setConfig({ ...config, tax_inclusive: checked })
              }
            />
          </div>

          <div className="ml-6 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              {config.tax_inclusive ? (
                <>
                  <strong>Tax-Inclusive:</strong> Menu prices already include tax.
                  Tax is extracted from the total.
                  <br />
                  <span className="text-muted-foreground">
                    Example: KES 1,000 = KES 862 (base) + KES 138 (16% VAT)
                  </span>
                </>
              ) : (
                <>
                  <strong>Tax-Exclusive:</strong> Tax is added on top of menu
                  prices.
                  <br />
                  <span className="text-muted-foreground">
                    Example: KES 1,000 + KES 160 (16% VAT) = KES 1,160 total
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="p-4 bg-primary/5 rounded-lg space-y-2">
          <h4 className="font-semibold">Current Configuration Summary</h4>
          <ul className="text-sm space-y-1">
            <li>
              • VAT: {config.vat_enabled ? `${(config.vat_rate * 100).toFixed(2)}%` : 'Disabled'}
            </li>
            <li>
              • Tourism Levy:{' '}
              {config.tourism_levy_enabled
                ? `${(config.tourism_levy_rate * 100).toFixed(2)}%`
                : 'Disabled'}
            </li>
            <li>
              • Total Tax Rate:{' '}
              {(
                (config.vat_enabled ? config.vat_rate : 0) +
                (config.tourism_levy_enabled ? config.tourism_levy_rate : 0)
              ) * 100}
              %
            </li>
            <li>
              • Pricing Method: {config.tax_inclusive ? 'Tax-Inclusive' : 'Tax-Exclusive'}
            </li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={fetchTaxConfig}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
