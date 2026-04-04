/**
 * LocationManagement — Admin / Manager UI for multi-location stock.
 * Tabs:
 *   1. Locations   — CRUD for bars, kitchen, store
 *   2. Stock Allocation — per-location stock overview + Transfer Stock dialog
 *   3. Staff Assignment — assign staff to a location
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Plus,
  Pencil,
  RefreshCw,
  ArrowRightLeft,
  Users,
  Package,
  Store,
  Utensils,
  GlassWater,
  Save,
  X,
  ChevronDown,
  History,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api/client';

// ── Types ────────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  type: 'bar' | 'kitchen' | 'store';
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface LocationStockItem {
  id: string;
  location_id: string;
  menu_item_id: string;
  item_name: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  reorder_level: number;
  cost_price: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
}

interface StockTransfer {
  id: string;
  transfer_number: string;
  from_location_id: string | null;
  to_location_id: string;
  from_location_name: string;
  to_location_name: string;
  item_name: string | null;
  quantity: number;
  unit: string;
  notes: string | null;
  transfer_date: string;
  created_at: string;
}

interface StaffUser {
  id: string;
  full_name: string;
  role: string;
  email: string;
  assigned_location_id: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function typeBadge(type: Location['type']) {
  switch (type) {
    case 'bar':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1">
          <GlassWater className="h-3 w-3" /> Bar
        </Badge>
      );
    case 'kitchen':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs gap-1">
          <Utensils className="h-3 w-3" /> Kitchen
        </Badge>
      );
    case 'store':
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs gap-1">
          <Store className="h-3 w-3" /> Store
        </Badge>
      );
  }
}

function stockStatusBadge(status: LocationStockItem['stock_status']) {
  switch (status) {
    case 'out_of_stock':
      return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Out</Badge>;
    case 'low_stock':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Low</Badge>;
    default:
      return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">OK</Badge>;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LocationFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Location> | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<Location['type']>(initial?.type ?? 'bar');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Location name is required');
      return;
    }
    setSaving(true);
    try {
      if (initial?.id) {
        await apiClient.patch(`/locations/${initial.id}`, { name, type, description: description || null });
        toast.success('Location updated');
      } else {
        await apiClient.post('/locations', { name, type, description: description || null });
        toast.success('Location created');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{initial?.id ? 'Edit Location' : 'Add Location'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bar C" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Type *</label>
            <div className="flex gap-2">
              {(['bar', 'kitchen', 'store'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium capitalize transition-colors ${
                    type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function TransferModal({
  locations,
  onClose,
  onSuccess,
}: {
  locations: Location[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  useEffect(() => {
    apiClient.get('/menu/items?limit=500').then(res => {
      setMenuItems((res.data as any)?.items || (res.data as any) || []);
    }).catch(() => {});
  }, []);

  const filteredItems = menuItems.filter(i =>
    !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const selectedItemObj = menuItems.find(i => i.id === selectedItem);

  const handleSubmit = async () => {
    if (!toLocation) { toast.error('Please select a destination location'); return; }
    if (!selectedItem) { toast.error('Please select an item'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { toast.error('Please enter a valid quantity'); return; }

    setSubmitting(true);
    try {
      const payload: any = {
        to_location_id: toLocation,
        menu_item_id: selectedItem,
        quantity: parseFloat(quantity),
        notes: notes || null,
      };
      if (fromLocation) payload.from_location_id = fromLocation;

      const res = await apiClient.post('/location-stock/transfer', payload);
      toast.success(`Transfer ${(res.data as any).transfer_number} created`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transfer Stock
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <CardDescription>Move stock from one location to another.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">From Location</label>
              <select
                value={fromLocation}
                onChange={e => setFromLocation(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">External / None</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">To Location *</label>
              <select
                value={toLocation}
                onChange={e => setToLocation(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select destination</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Item selector */}
          <div className="relative">
            <label className="text-sm font-medium block mb-1">Item *</label>
            <div className="relative">
              <Input
                placeholder="Search items..."
                value={selectedItemObj ? selectedItemObj.name : itemSearch}
                onFocus={() => { setItemSearch(''); setItemDropdownOpen(true); }}
                onChange={e => { setItemSearch(e.target.value); setSelectedItem(''); setItemDropdownOpen(true); }}
                className="pr-8"
              />
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {itemDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>
                ) : filteredItems.slice(0, 50).map(item => (
                  <button
                    key={item.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onMouseDown={() => {
                      setSelectedItem(item.id);
                      setItemSearch(item.name);
                      setItemDropdownOpen(false);
                    }}
                  >
                    <span className="font-medium">{item.name}</span>
                    {item.category && <span className="text-muted-foreground text-xs ml-2">{item.category}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Quantity *</label>
            <Input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <ArrowRightLeft className="h-4 w-4 mr-1.5" />
              {submitting ? 'Transferring…' : 'Transfer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LocationManagement() {
  const [activeTab, setActiveTab] = useState('locations');

  // Locations tab
  const [locations, setLocations] = useState<Location[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);

  // Stock Allocation tab
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationStock, setLocationStock] = useState<LocationStockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Staff Assignment tab
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffAssignments, setStaffAssignments] = useState<Record<string, string>>({});
  const [savingStaff, setSavingStaff] = useState<Record<string, boolean>>({});

  // ── Fetch locations ──────────────────────────────────────────────────────

  const fetchLocations = useCallback(async () => {
    setLocLoading(true);
    try {
      const res = await apiClient.get('/locations?include_inactive=true');
      setLocations((res.data as any) || []);
    } catch {
      toast.error('Failed to load locations');
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // ── Location Stock ───────────────────────────────────────────────────────

  const fetchLocationStock = useCallback(async (locId: string) => {
    if (!locId) return;
    setStockLoading(true);
    try {
      const res = await apiClient.get(`/location-stock/${locId}`);
      setLocationStock((res.data as any)?.items || []);
    } catch {
      toast.error('Failed to load location stock');
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLocation) fetchLocationStock(selectedLocation);
  }, [selectedLocation, fetchLocationStock]);

  const fetchTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const url = selectedLocation
        ? `/location-stock/transfers?location_id=${selectedLocation}&limit=50`
        : '/location-stock/transfers?limit=50';
      const res = await apiClient.get(url);
      setTransfers((res.data as any) || []);
    } catch {
      toast.error('Failed to load transfer history');
    } finally {
      setTransfersLoading(false);
    }
  }, [selectedLocation]);

  // ── Staff ────────────────────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await apiClient.get('/admin/users?roles=waiter,chef,manager,admin&user_status=active&limit=200');
      const list: StaffUser[] = (res.data as any) || [];
      setStaff(list);
      const assignments: Record<string, string> = {};
      list.forEach(u => {
        assignments[u.id] = u.assigned_location_id || '';
      });
      setStaffAssignments(assignments);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') fetchStaff();
  }, [activeTab, fetchStaff]);

  const saveStaffAssignment = async (userId: string) => {
    setSavingStaff(prev => ({ ...prev, [userId]: true }));
    try {
      await apiClient.post('/location-stock/assign-staff', {
        user_id: userId,
        location_id: staffAssignments[userId] || null,
      });
      toast.success('Assignment saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save assignment');
    } finally {
      setSavingStaff(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeactivate = async (loc: Location) => {
    try {
      await apiClient.patch(`/locations/${loc.id}`, { is_active: !loc.is_active });
      toast.success(loc.is_active ? 'Location deactivated' : 'Location activated');
      fetchLocations();
    } catch {
      toast.error('Failed to update location');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Location Management
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage bars, kitchen, central store — per-location stock and staff assignments.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="stock">Stock Allocation</TabsTrigger>
          <TabsTrigger value="staff">Staff Assignment</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Locations ── */}
        <TabsContent value="locations" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{locations.length} location(s) configured</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLocations} disabled={locLoading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${locLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => { setEditingLocation(null); setShowLocationForm(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Location
              </Button>
            </div>
          </div>

          {locLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
          ) : locations.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No locations found.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map(loc => (
                <Card key={loc.id} className={`${!loc.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base truncate">{loc.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {loc.description || 'No description'}
                        </p>
                      </div>
                      <div className="shrink-0">{typeBadge(loc.type)}</div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant={loc.is_active ? 'default' : 'secondary'} className="text-xs">
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingLocation(loc); setShowLocationForm(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleDeactivate(loc)}
                        >
                          {loc.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Stock Allocation ── */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Location:</label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a location</option>
                {locations.filter(l => l.is_active).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                ))}
              </select>
            </div>
            {selectedLocation && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLocationStock(selectedLocation)}
                  disabled={stockLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${stockLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button size="sm" onClick={() => setShowTransferModal(true)}>
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  Transfer Stock
                </Button>
              </>
            )}
          </div>

          {selectedLocation && (
            <>
              {/* Stock table */}
              {stockLoading ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Loading stock…</CardContent></Card>
              ) : locationStock.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-muted-foreground">No stock recorded for this location yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Use "Transfer Stock" to allocate items here.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {locations.find(l => l.id === selectedLocation)?.name} — Stock ({locationStock.length} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/20 text-muted-foreground text-xs">
                            <th className="text-left px-3 py-2 font-medium">Item</th>
                            <th className="text-left px-3 py-2 font-medium">Category</th>
                            <th className="text-right px-3 py-2 font-medium">Qty</th>
                            <th className="text-right px-3 py-2 font-medium">Reorder</th>
                            <th className="text-right px-3 py-2 font-medium">Cost/Unit</th>
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationStock.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={`border-b last:border-0 hover:bg-muted/30 ${idx % 2 ? 'bg-muted/10' : ''}`}
                            >
                              <td className="px-3 py-2 font-medium">{item.item_name || '—'}</td>
                              <td className="px-3 py-2 text-muted-foreground text-xs capitalize">{item.category || '—'}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {Number(item.quantity).toFixed(2)} <span className="text-muted-foreground text-xs">{item.unit}</span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {item.reorder_level > 0 ? Number(item.reorder_level).toFixed(2) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {item.cost_price > 0 ? `KES ${Number(item.cost_price).toFixed(2)}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-center">{stockStatusBadge(item.stock_status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transfer history */}
              <Card>
                <CardHeader
                  className="py-3 cursor-pointer select-none"
                  onClick={() => {
                    if (!showHistory) fetchTransfers();
                    setShowHistory(p => !p);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Transfer History
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
                {showHistory && (
                  <CardContent className="pt-0">
                    {transfersLoading ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
                    ) : transfers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No transfers found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-3">Transfer #</th>
                              <th className="text-left py-2 px-3">Date</th>
                              <th className="text-left py-2 px-3">From</th>
                              <th className="text-left py-2 px-3">To</th>
                              <th className="text-left py-2 px-3">Item</th>
                              <th className="text-right py-2 px-3">Qty</th>
                              <th className="text-left py-2 px-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transfers.map(t => (
                              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2 px-3 font-mono text-xs">{t.transfer_number}</td>
                                <td className="py-2 px-3 text-xs">{t.transfer_date}</td>
                                <td className="py-2 px-3 text-xs">{t.from_location_name || '—'}</td>
                                <td className="py-2 px-3 text-xs">{t.to_location_name}</td>
                                <td className="py-2 px-3">{t.item_name || '—'}</td>
                                <td className="py-2 px-3 text-right tabular-nums">{t.quantity} {t.unit}</td>
                                <td className="py-2 px-3 text-xs text-muted-foreground max-w-[150px] truncate">{t.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </>
          )}

          {!selectedLocation && (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">Select a location above to view its stock.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 3: Staff Assignment ── */}
        <TabsContent value="staff" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Assign staff members to their work location.</p>
            <Button variant="outline" size="sm" onClick={fetchStaff} disabled={staffLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${staffLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {staffLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading staff…</CardContent></Card>
          ) : staff.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">No staff found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-muted-foreground text-xs">
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Role</th>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-left px-3 py-2 font-medium min-w-[180px]">Assigned Location</th>
                        <th className="text-center px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member, idx) => (
                        <tr key={member.id} className={`border-b last:border-0 ${idx % 2 ? 'bg-muted/10' : ''}`}>
                          <td className="px-3 py-2 font-medium">{member.full_name || '—'}</td>
                          <td className="px-3 py-2 capitalize">
                            <Badge variant="outline" className="text-xs">{member.role}</Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{member.email || '—'}</td>
                          <td className="px-3 py-2">
                            <select
                              value={staffAssignments[member.id] ?? ''}
                              onChange={e => setStaffAssignments(prev => ({ ...prev, [member.id]: e.target.value }))}
                              className="w-full border rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Unassigned</option>
                              {locations.filter(l => l.is_active).map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => saveStaffAssignment(member.id)}
                              disabled={savingStaff[member.id]}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {savingStaff[member.id] ? 'Saving…' : 'Save'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showLocationForm && (
        <LocationFormModal
          initial={editingLocation}
          onSave={fetchLocations}
          onClose={() => { setShowLocationForm(false); setEditingLocation(null); }}
        />
      )}

      {showTransferModal && (
        <TransferModal
          locations={locations.filter(l => l.is_active)}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            if (selectedLocation) fetchLocationStock(selectedLocation);
            if (showHistory) fetchTransfers();
          }}
        />
      )}
    </div>
  );
}

export default LocationManagement;
