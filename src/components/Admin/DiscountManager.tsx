// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Tag, Lock, Percent, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import discountsApi, { DiscountConfig, DiscountConfigCreate } from '@/lib/api/discounts';

const EMPTY_FORM: DiscountConfigCreate & { id?: string } = {
  name: '',
  discount_type: 'percentage',
  discount_value: 0,
  requires_pin: false,
};

export function DiscountManager() {
  const [configs, setConfigs] = useState<DiscountConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await discountsApi.listConfigs(false); // include inactive
      setConfigs(data);
    } catch {
      toast.error('Failed to load discount configurations');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowDialog(true);
  };

  const openEdit = (cfg: DiscountConfig) => {
    setForm({
      name: cfg.name,
      discount_type: cfg.discount_type,
      discount_value: cfg.discount_value,
      requires_pin: cfg.requires_pin,
    });
    setEditingId(cfg.id);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.discount_value || form.discount_value <= 0) { toast.error('Discount value must be greater than 0'); return; }
    if (form.discount_type === 'percentage' && form.discount_value > 100) { toast.error('Percentage cannot exceed 100%'); return; }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await discountsApi.updateConfig(editingId, form);
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c));
        toast.success('Discount updated');
      } else {
        const created = await discountsApi.createConfig(form);
        setConfigs(prev => [...prev, created]);
        toast.success('Discount created');
      }
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cfg: DiscountConfig) => {
    try {
      const updated = await discountsApi.updateConfig(cfg.id, { is_active: !cfg.is_active });
      setConfigs(prev => prev.map(c => c.id === cfg.id ? updated : c));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (cfg: DiscountConfig) => {
    if (!confirm(`Deactivate "${cfg.name}"? It will no longer appear for staff.`)) return;
    try {
      await discountsApi.deleteConfig(cfg.id);
      setConfigs(prev => prev.map(c => c.id === cfg.id ? { ...c, is_active: false } : c));
      toast.success('Discount deactivated');
    } catch {
      toast.error('Failed to deactivate discount');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-primary" />
                Discount Presets
              </CardTitle>
              <CardDescription className="mt-1">
                Create named discounts that waiters can apply from the cart. Require manager PIN for sensitive ones.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1">
              <Plus className="h-3 w-3" />
              New Discount
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No discount presets yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>PIN Required</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map(cfg => (
                  <TableRow key={cfg.id} className={!cfg.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{cfg.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-xs">
                        {cfg.discount_type === 'percentage'
                          ? <><Percent className="h-3 w-3" />Percentage</>
                          : <><DollarSign className="h-3 w-3" />Fixed KES</>
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {cfg.discount_type === 'percentage'
                        ? `${cfg.discount_value}%`
                        : `KES ${cfg.discount_value.toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      {cfg.requires_pin ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="h-3 w-3" />Yes
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cfg.is_active}
                        onCheckedChange={() => handleToggleActive(cfg)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cfg)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cfg)}
                          disabled={!cfg.is_active}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Discount' : 'New Discount Preset'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="disc-name">Name</Label>
              <Input
                id="disc-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Staff Meal, Complimentary, Happy Hour"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Discount Type</Label>
              <Select
                value={form.discount_type}
                onValueChange={(v: 'percentage' | 'fixed') => setForm(f => ({ ...f, discount_type: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (KES)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="disc-val">
                {form.discount_type === 'percentage' ? 'Percentage (1–100)' : 'Amount (KES)'}
              </Label>
              <Input
                id="disc-val"
                type="number"
                min="0"
                max={form.discount_type === 'percentage' ? 100 : undefined}
                value={form.discount_value || ''}
                onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                placeholder={form.discount_type === 'percentage' ? '10' : '500'}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Require Manager PIN
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If on, waiters must get a manager to enter their PIN before applying this discount.
                </p>
              </div>
              <Switch
                checked={form.requires_pin}
                onCheckedChange={v => setForm(f => ({ ...f, requires_pin: v }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
