// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Tag, Lock, Percent, DollarSign, Search, X, UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-hot-toast';
import discountsApi, { DiscountConfig, DiscountConfigCreate } from '@/lib/api/discounts';
import menuApi, { MenuItem } from '@/lib/api/menu';

const EMPTY_FORM: DiscountConfigCreate & { id?: string } = {
  name: '',
  discount_type: 'percentage',
  discount_value: 0,
  requires_pin: false,
  applicable_item_ids: null,
};

export function DiscountManager() {
  const [configs, setConfigs] = useState<DiscountConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Item search state
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetchConfigs();
    menuApi.listMenuItems().then(items => setAllMenuItems(items)).catch(() => {});
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await discountsApi.listConfigs(false);
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
    setSelectedItems([]);
    setItemSearch('');
    setShowDialog(true);
  };

  const openEdit = (cfg: DiscountConfig) => {
    setForm({
      name: cfg.name,
      discount_type: cfg.discount_type,
      discount_value: cfg.discount_value,
      requires_pin: cfg.requires_pin,
      applicable_item_ids: cfg.applicable_item_ids ?? null,
    });
    setEditingId(cfg.id);
    // Restore selected items from IDs
    const linked = (cfg.applicable_item_ids || [])
      .map(id => allMenuItems.find(m => m.id === id))
      .filter(Boolean) as MenuItem[];
    setSelectedItems(linked);
    setItemSearch('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.discount_value || form.discount_value <= 0) { toast.error('Discount value must be greater than 0'); return; }
    if (form.discount_type === 'percentage' && form.discount_value > 100) { toast.error('Percentage cannot exceed 100%'); return; }

    const payload: DiscountConfigCreate = {
      ...form,
      applicable_item_ids: selectedItems.length > 0 ? selectedItems.map(i => i.id) : null,
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await discountsApi.updateConfig(editingId, payload);
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c));
        toast.success('Discount updated');
      } else {
        const created = await discountsApi.createConfig(payload);
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

  const toggleItem = (item: MenuItem) => {
    setSelectedItems(prev =>
      prev.find(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  const filteredMenuItems = allMenuItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(itemSearch.toLowerCase())
  );

  const getItemNames = (cfg: DiscountConfig) => {
    if (!cfg.applicable_item_ids?.length) return null;
    const names = cfg.applicable_item_ids
      .map(id => allMenuItems.find(m => m.id === id)?.name)
      .filter(Boolean);
    return names.length ? names : null;
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
                Create named discounts for specific items or the whole order. Require manager PIN for sensitive ones.
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
                  <TableHead>Applies To</TableHead>
                  <TableHead>PIN Required</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map(cfg => {
                  const itemNames = getItemNames(cfg);
                  return (
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
                        {itemNames ? (
                          <div className="flex flex-wrap gap-1 max-w-48">
                            {itemNames.slice(0, 3).map(n => (
                              <Badge key={n} variant="secondary" className="text-xs px-1.5 py-0">{n}</Badge>
                            ))}
                            {itemNames.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">+{itemNames.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">All items</span>
                        )}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                placeholder="e.g. Staff Meal, Happy Hour Tea, Complimentary"
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

            {/* Item linking */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Applicable Items
                </Label>
                <span className="text-xs text-muted-foreground">
                  {selectedItems.length === 0 ? 'All items (general)' : `${selectedItems.length} selected`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to any item or order. Select specific items to restrict this discount.
              </p>

              {/* Selected items */}
              {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border">
                  {selectedItems.map(item => (
                    <Badge key={item.id} variant="secondary" className="gap-1 text-xs pr-1">
                      {item.name}
                      <button onClick={() => toggleItem(item)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="Search menu items (e.g. Tea, Toast, Beef...)"
                  className="pl-8 text-sm"
                />
              </div>

              {/* Results list */}
              {itemSearch && (
                <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredMenuItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No items found</p>
                  ) : (
                    filteredMenuItems.slice(0, 20).map(item => {
                      const isSelected = selectedItems.some(i => i.id === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(item)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-0 ${
                            isSelected ? 'bg-primary/5 font-medium' : ''
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
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
