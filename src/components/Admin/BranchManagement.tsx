import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, MapPin, Phone, Mail, Pencil, Search, GitBranch } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';

interface Branch {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  opened_at?: string;
  notes?: string;
  payment_instructions?: string;
  manager?: { id: string; full_name: string; email: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:           { label: 'Active',           className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inactive:         { label: 'Inactive',         className: 'bg-slate-100 text-slate-600 border-slate-200' },
  under_renovation: { label: 'Under Renovation', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  closed:           { label: 'Closed',           className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
  return <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
};

const EMPTY_FORM = { name: '', location: '', address: '', phone: '', email: '', notes: '', opened_at: '', status: 'active', payment_instructions: '' };

export function BranchManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/owner/branches');
      setBranches(res.data.branches || []);
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (b: Branch) => {
    setEditBranch(b);
    setForm({
      name: b.name ?? '',
      location: b.location ?? '',
      address: b.address ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      notes: b.notes ?? '',
      opened_at: b.opened_at ? b.opened_at.split('T')[0] : '',
      status: b.status ?? 'active',
      payment_instructions: b.payment_instructions ?? '',
    });
  };

  const handleSave = async () => {
    if (!editBranch) return;
    if (!form.name.trim()) { toast.error('Branch name is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, string | undefined> = {
        name: form.name.trim(),
        location: form.location || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
        opened_at: form.opened_at || undefined,
        status: form.status,
        payment_instructions: form.payment_instructions || undefined,
      };
      await api.patch(`/owner/branches/${editBranch.id}`, payload);
      toast.success('Branch updated');
      setEditBranch(null);
      fetchBranches();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update branch');
    } finally {
      setSaving(false);
    }
  };

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.location ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: branches.length,
    active: branches.filter(b => b.status === 'active').length,
    inactive: branches.filter(b => b.status !== 'active').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Branch Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and edit branch details. Contact the owner to create, close, or delete branches.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            {counts.active} active
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
            {counts.total} total
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Branch cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? 'No branches match your search' : 'No branches found'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => (
            <Card key={b.id} className="relative group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{b.name}</CardTitle>
                    <StatusBadge status={b.status} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openEdit(b)}
                    title="Edit branch"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                {b.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{b.location}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{b.email}</span>
                  </div>
                )}
                {b.manager && (
                  <div className="pt-1 border-t border-dashed mt-2">
                    <span className="text-xs font-medium text-foreground">Manager: </span>
                    <span className="text-xs">{b.manager.full_name}</span>
                  </div>
                )}
                {b.payment_instructions && (
                  <div className="pt-1 border-t border-dashed mt-1">
                    <span className="text-xs font-medium text-foreground">Payment: </span>
                    <span className="text-xs text-muted-foreground">{b.payment_instructions.split('\n')[0]}{b.payment_instructions.includes('\n') ? '…' : ''}</span>
                  </div>
                )}
                {!b.location && !b.phone && !b.email && !b.manager && (
                  <p className="text-xs italic">No contact details on file</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editBranch} onOpenChange={open => !open && setEditBranch(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Branch Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premier Hotel – CBD Branch" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City / Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Nairobi, Kenya" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="under_renovation">Under Renovation</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Street Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254700000000" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="branch@hotel.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Opened On</Label>
              <Input type="date" value={form.opened_at} onChange={e => setForm(f => ({ ...f, opened_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Instructions (printed on bills)</Label>
              <Textarea
                value={form.payment_instructions}
                onChange={e => setForm(f => ({ ...f, payment_instructions: e.target.value }))}
                placeholder={`e.g.\nPaybill: 522522, Account: NkubuBranch\n— or —\nTill No: 123456\n— or —\nBank: Equity, Acc: 1234567890`}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Type exactly what you want on the bill. Overrides the global setting for this branch.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this branch..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranch(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
