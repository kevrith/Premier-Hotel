// @ts-nocheck
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, DollarSign, Lock, CheckCircle, Tag, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import discountsApi, { DiscountConfig, ManagerOption } from '@/lib/api/discounts';
import { useAuth } from '@/contexts/AuthContext';

interface DiscountModalProps {
  open: boolean;
  onClose: () => void;
  /** The subtotal (price × qty) the discount applies to */
  baseAmount: number;
  itemName?: string;
  itemId?: string;   // cart item's menu item ID — used to filter applicable presets
  scope: 'order' | 'item';
  onApply: (discountAmount: number, reason: string, approvedBy?: string) => void;
}

const MANAGER_ROLES = ['manager', 'admin', 'owner'];

export default function DiscountModal({
  open,
  onClose,
  baseAmount,
  itemName,
  itemId,
  scope,
  onApply,
}: DiscountModalProps) {
  const { role } = useAuth();
  const isManager = MANAGER_ROLES.includes(role || '');

  const [configs, setConfigs] = useState<DiscountConfig[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');

  // Preset selection
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  // Custom discount
  const [customType, setCustomType] = useState<'percentage' | 'fixed'>('fixed');
  const [customValue, setCustomValue] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Manager PIN
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [approvedByName, setApprovedByName] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      discountsApi.listConfigs(),
      discountsApi.listManagers(),
    ]).then(([cfgs, mgrs]) => {
      setConfigs(cfgs);
      setManagers(mgrs);
    }).catch(() => {
      toast.error('Failed to load discount options');
    }).finally(() => setLoading(false));

    // Reset state on open
    setSelectedConfigId('');
    setCustomValue('');
    setCustomReason('');
    setPin('');
    setPinVerified(false);
    setApprovedByName('');
    setSelectedManagerId('');
    setActiveTab('preset');
  }, [open]);

  // Filter presets: show general (no item links) + ones that include this specific item
  const visibleConfigs = configs.filter(cfg => {
    if (!cfg.applicable_item_ids?.length) return true; // general discount
    if (scope === 'order') return !cfg.applicable_item_ids?.length; // order-level: only generals
    return itemId ? cfg.applicable_item_ids.includes(itemId) : !cfg.applicable_item_ids?.length;
  });

  const previewAmount = (): number => {
    if (activeTab === 'preset') {
      const cfg = visibleConfigs.find(c => c.id === selectedConfigId);
      if (!cfg) return 0;
      return discountsApi.calculateDiscount(cfg, baseAmount);
    }
    const v = parseFloat(customValue) || 0;
    if (customType === 'percentage') return Math.round((baseAmount * v) / 100 * 100) / 100;
    return Math.min(v, baseAmount);
  };

  const needsPin = (): boolean => {
    if (isManager) return false;
    if (activeTab === 'preset') {
      const cfg = visibleConfigs.find(c => c.id === selectedConfigId);
      return cfg ? cfg.requires_pin : false;
    }
    // Custom discounts always need manager PIN for non-managers
    return true;
  };

  const handleVerifyPin = async () => {
    if (!selectedManagerId || !pin) {
      toast.error('Select a manager and enter their PIN');
      return;
    }
    setVerifying(true);
    try {
      const result = await discountsApi.verifyPin(selectedManagerId, pin);
      setPinVerified(true);
      setApprovedByName(result.manager_name);
      toast.success(`Approved by ${result.manager_name}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Incorrect PIN');
    } finally {
      setVerifying(false);
    }
  };

  const handleApply = () => {
    const amount = previewAmount();
    if (amount <= 0) {
      toast.error('Discount amount must be greater than 0');
      return;
    }
    if (needsPin() && !pinVerified) {
      toast.error('Manager PIN required for this discount');
      return;
    }

    let reason = '';
    if (activeTab === 'preset') {
      const cfg = visibleConfigs.find(c => c.id === selectedConfigId);
      reason = cfg ? cfg.name : 'Preset discount';
    } else {
      reason = customReason || 'Custom discount';
    }

    onApply(amount, reason, pinVerified ? selectedManagerId : undefined);
    onClose();
  };

  const preview = previewAmount();
  const finalAmount = Math.max(0, baseAmount - preview);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Apply Discount
            {itemName && <span className="text-sm font-normal text-muted-foreground">— {itemName}</span>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="w-full">
                <TabsTrigger value="preset" className="flex-1">Preset</TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
              </TabsList>

              {/* Preset Discounts */}
              <TabsContent value="preset" className="mt-3 space-y-2">
                {visibleConfigs.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    No preset discounts available for this {scope === 'item' ? 'item' : 'order'}.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {visibleConfigs.map(cfg => {
                      const amt = discountsApi.calculateDiscount(cfg, baseAmount);
                      const isItemSpecific = cfg.applicable_item_ids?.length > 0;
                      return (
                        <button
                          key={cfg.id}
                          onClick={() => setSelectedConfigId(cfg.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                            selectedConfigId === cfg.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium">{cfg.name}</p>
                              {isItemSpecific && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">item</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cfg.discount_type === 'percentage'
                                ? `${cfg.discount_value}% off`
                                : `KES ${cfg.discount_value} off`}
                              {cfg.requires_pin && !isManager && (
                                <span className="ml-1 text-amber-600">• PIN required</span>
                              )}
                            </p>
                          </div>
                          <Badge variant="secondary">−KES {amt.toLocaleString()}</Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Custom Discount */}
              <TabsContent value="custom" className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={customType === 'fixed' ? 'default' : 'outline'}
                    onClick={() => setCustomType('fixed')}
                    className="flex-1 gap-1"
                  >
                    <DollarSign className="h-3 w-3" />
                    KES Amount
                  </Button>
                  <Button
                    size="sm"
                    variant={customType === 'percentage' ? 'default' : 'outline'}
                    onClick={() => setCustomType('percentage')}
                    className="flex-1 gap-1"
                  >
                    <Percent className="h-3 w-3" />
                    Percentage
                  </Button>
                </div>

                <div>
                  <Label htmlFor="custom-val" className="text-xs">
                    {customType === 'percentage' ? 'Percentage (%)' : 'Amount (KES)'}
                  </Label>
                  <Input
                    id="custom-val"
                    type="number"
                    min="0"
                    max={customType === 'percentage' ? 100 : baseAmount}
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    placeholder={customType === 'percentage' ? '0-100' : `Max ${baseAmount}`}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="custom-reason" className="text-xs">Reason</Label>
                  <Input
                    id="custom-reason"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="e.g. Customer complaint, loyalty..."
                    className="mt-1"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Price Preview */}
            {preview > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Original</span>
                  <span>KES {baseAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>−KES {preview.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>After discount</span>
                  <span className="text-primary">KES {finalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Manager PIN section */}
            {needsPin() && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <Lock className="h-3 w-3" />
                  Manager authorization required
                </div>

                {pinVerified ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Approved by {approvedByName}
                  </div>
                ) : (
                  <>
                    <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select manager..." />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name} ({m.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Input
                        type="password"
                        maxLength={6}
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        placeholder="PIN"
                        className="h-8 text-xs flex-1"
                        onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                      />
                      <Button size="sm" variant="outline" onClick={handleVerifyPin} disabled={verifying} className="h-8">
                        {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button
                onClick={handleApply}
                disabled={preview <= 0 || (needsPin() && !pinVerified)}
                className="flex-1"
              >
                Apply −KES {preview > 0 ? preview.toLocaleString() : '0'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
