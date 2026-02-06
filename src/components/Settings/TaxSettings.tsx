import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';
import { Percent, Save, Info } from 'lucide-react';
import api from '@/lib/api';

interface TaxConfig {
  vat_enabled: boolean;
  vat_rate: number;
  tourism_levy_enabled: boolean;
  tourism_levy_rate: number;
  tax_inclusive: boolean;
}

export default function TaxSettings() {
  const [config, setConfig] = useState<TaxConfig>({
    vat_enabled: true,
    vat_rate: 0.16,
    tourism_levy_enabled: true,
    tourism_levy_rate: 0.02,
    tax_inclusive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTaxConfig();
  }, []);

  const loadTaxConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/tax-config');
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load tax config:', error);
      toast.error('Failed to load tax settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/tax-config', config);
      toast.success('Tax settings updated successfully');
    } catch (error: any) {
      console.error('Failed to save tax config:', error);
      toast.error(error.response?.data?.detail || 'Failed to save tax settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading tax settings...</p>
        </CardContent>
      </Card>
    );
  }

  const totalTaxRate = (config.vat_enabled ? config.vat_rate : 0) + 
                       (config.tourism_levy_enabled ? config.tourism_levy_rate : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Tax & Levy Configuration
        </CardTitle>
        <CardDescription>
          Configure VAT and Tourism Levy settings for your hotel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tax Inclusive/Exclusive */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Tax Inclusive Pricing</Label>
              <p className="text-sm text-muted-foreground">
                {config.tax_inclusive 
                  ? 'Menu prices include tax (tax is extracted from total)'
                  : 'Tax is added on top of menu prices'}
              </p>
            </div>
            <Switch
              checked={config.tax_inclusive}
              onCheckedChange={(checked) => setConfig({ ...config, tax_inclusive: checked })}
            />
          </div>
          
          {/* Example */}
          <div className="mt-3 p-3 bg-background rounded border">
            <p className="text-xs font-medium mb-2">Example: Menu item at KES 1,000</p>
            {config.tax_inclusive ? (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base:</span>
                  <span>KES {(1000 / (1 + totalTaxRate)).toFixed(2)}</span>
                </div>
                {config.vat_enabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({(config.vat_rate * 100).toFixed(0)}%):</span>
                    <span>KES {((1000 / (1 + totalTaxRate)) * config.vat_rate).toFixed(2)}</span>
                  </div>
                )}
                {config.tourism_levy_enabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Levy ({(config.tourism_levy_rate * 100).toFixed(0)}%):</span>
                    <span>KES {((1000 / (1 + totalTaxRate)) * config.tourism_levy_rate).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>KES 1,000.00</span>
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base:</span>
                  <span>KES 1,000.00</span>
                </div>
                {config.vat_enabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({(config.vat_rate * 100).toFixed(0)}%):</span>
                    <span>KES {(1000 * config.vat_rate).toFixed(2)}</span>
                  </div>
                )}
                {config.tourism_levy_enabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Levy ({(config.tourism_levy_rate * 100).toFixed(0)}%):</span>
                    <span>KES {(1000 * config.tourism_levy_rate).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>KES {(1000 * (1 + totalTaxRate)).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* VAT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Enable VAT</Label>
              <p className="text-sm text-muted-foreground">Charge Value Added Tax</p>
            </div>
            <Switch
              checked={config.vat_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, vat_enabled: checked })}
            />
          </div>
          {config.vat_enabled && (
            <div className="pl-4">
              <Label>VAT Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={(config.vat_rate * 100).toFixed(2)}
                onChange={(e) => setConfig({ ...config, vat_rate: parseFloat(e.target.value) / 100 })}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Tourism Levy */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Enable Tourism Levy</Label>
              <p className="text-sm text-muted-foreground">Charge Tourism Levy</p>
            </div>
            <Switch
              checked={config.tourism_levy_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, tourism_levy_enabled: checked })}
            />
          </div>
          {config.tourism_levy_enabled && (
            <div className="pl-4">
              <Label>Levy Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={(config.tourism_levy_rate * 100).toFixed(2)}
                onChange={(e) => setConfig({ ...config, tourism_levy_rate: parseFloat(e.target.value) / 100 })}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex gap-3 p-4 bg-blue-50 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Note:</p>
            <p className="text-xs">Changes apply to new orders only. Kenya standard: VAT 16%, Tourism Levy 2%</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
