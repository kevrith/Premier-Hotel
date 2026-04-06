// @ts-nocheck
/**
 * PettyCash — daily cash-at-hand & expenses ledger per branch.
 * Input: cash at hand + expenses → auto-calculates daily balance + cumulative running total.
 * Edit: admin/owner only. View: admin/manager/owner.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api/client';
import { Pencil, Trash2, Plus, RefreshCw, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';

interface Branch { id: string; name: string; }

interface PettyCashEntry {
  id: string;
  branch_id: string;
  entry_date: string;
  cash_at_hand: number;
  expenses: number;
  daily_balance: number;
  cumulative_balance: number;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
}

function fmt(n: number) {
  return `KES ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

export function PettyCash() {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'owner';
  const canView = role === 'admin' || role === 'manager' || role === 'owner';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [entries, setEntries] = useState<PettyCashEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(todayISO());
  const [formCash, setFormCash] = useState('');
  const [formExpenses, setFormExpenses] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editEntry, setEditEntry] = useState<PettyCashEntry | null>(null);
  const [editCash, setEditCash] = useState('');
  const [editExpenses, setEditExpenses] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Load branches
  useEffect(() => {
    api.get('/owner/branches').then(res => {
      const b: Branch[] = (res.data || []).map((br: any) => ({ id: br.id, name: br.name }));
      setBranches(b);
      if (b.length > 0) setSelectedBranch(b[0].id);
    }).catch(() => {
      // fallback: try /settings/branches
      api.get('/settings/hotel').then(r => {
        const br = r.data?.branch || r.data;
        if (br?.id) { setBranches([{ id: br.id, name: br.name }]); setSelectedBranch(br.id); }
      }).catch(() => {});
    });
  }, []);

  const loadEntries = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const res = await api.get('/petty-cash', { params: { branch_id: selectedBranch, limit: 60 } });
      setEntries(res.data || []);
    } catch {
      toast.error('Failed to load petty cash entries');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleCreate = async () => {
    if (!formCash || isNaN(parseFloat(formCash))) { toast.error('Enter cash at hand'); return; }
    if (!formExpenses || isNaN(parseFloat(formExpenses))) { toast.error('Enter expenses (0 if none)'); return; }
    setSaving(true);
    try {
      await api.post('/petty-cash', {
        branch_id: selectedBranch,
        entry_date: formDate,
        cash_at_hand: parseFloat(formCash),
        expenses: parseFloat(formExpenses),
        notes: formNotes || null,
      });
      toast.success('Entry recorded');
      setShowForm(false);
      setFormCash(''); setFormExpenses(''); setFormNotes('');
      loadEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (entry: PettyCashEntry) => {
    setEditEntry(entry);
    setEditCash(String(entry.cash_at_hand));
    setEditExpenses(String(entry.expenses));
    setEditNotes(entry.notes || '');
  };

  const handleEdit = async () => {
    if (!editEntry) return;
    setEditSaving(true);
    try {
      await api.patch(`/petty-cash/${editEntry.id}`, {
        cash_at_hand: parseFloat(editCash),
        expenses: parseFloat(editExpenses),
        notes: editNotes || null,
      });
      toast.success('Entry updated');
      setEditEntry(null);
      loadEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (entry: PettyCashEntry) => {
    if (!window.confirm(`Delete entry for ${entry.entry_date}? This will recalculate all subsequent balances.`)) return;
    try {
      await api.delete(`/petty-cash/${entry.id}`);
      toast.success('Entry deleted');
      loadEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete');
    }
  };

  const latest = entries[0]; // newest first
  const liveDailyBalance = formCash && formExpenses
    ? (parseFloat(formCash) || 0) - (parseFloat(formExpenses) || 0)
    : null;

  if (!canView) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-600" />
            Petty Cash Ledger
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Daily cash-at-hand minus expenses = balance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {branches.length > 1 && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Entry
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Running Balance</p>
              <p className={`text-xl font-bold mt-0.5 ${latest.cumulative_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(latest.cumulative_balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">as of {latest.entry_date}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Last Day Balance</p>
              <p className={`text-xl font-bold mt-0.5 ${latest.daily_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(latest.daily_balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{latest.entry_date}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Last Cash at Hand</p>
              <p className="text-xl font-bold mt-0.5">{fmt(latest.cash_at_hand)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Expenses: {fmt(latest.expenses)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Entry Form */}
      {showForm && (
        <Card className="border border-indigo-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={formDate} max={todayISO()} onChange={e => setFormDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cash at Hand (KES)</Label>
                <Input type="number" min="0" step="0.01" placeholder="e.g. 27000" value={formCash}
                  onChange={e => setFormCash(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expenses (KES)</Label>
                <Input type="number" min="0" step="0.01" placeholder="e.g. 5000" value={formExpenses}
                  onChange={e => setFormExpenses(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Daily Balance (auto)</Label>
                <div className={`h-8 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-semibold ${liveDailyBalance !== null ? (liveDailyBalance >= 0 ? 'text-green-700' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {liveDailyBalance !== null ? fmt(liveDailyBalance) : '—'}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input placeholder="e.g. Collected from waiters + morning float" value={formNotes}
                onChange={e => setFormNotes(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? 'Saving…' : 'Save Entry'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No entries yet. Click "New Entry" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-right font-medium">Cash at Hand</th>
                    <th className="px-4 py-2 text-right font-medium">Expenses</th>
                    <th className="px-4 py-2 text-right font-medium">Daily Balance</th>
                    <th className="px-4 py-2 text-right font-medium">Running Total</th>
                    <th className="px-4 py-2 text-left font-medium">Notes</th>
                    {canEdit && <th className="px-4 py-2 w-16" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium tabular-nums">{entry.entry_date}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmt(entry.cash_at_hand)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-600">{fmt(entry.expenses)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={entry.daily_balance >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {entry.daily_balance >= 0 ? '+' : ''}{fmt(entry.daily_balance)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                        <span className={entry.cumulative_balance >= 0 ? 'text-indigo-700' : 'text-red-600'}>
                          {fmt(entry.cumulative_balance)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[180px] truncate">{entry.notes || '—'}</td>
                      {canEdit && (
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => openEdit(entry)} className="p-1 rounded hover:bg-muted transition-colors">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(entry)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog — admin/owner only */}
      <Dialog open={!!editEntry} onOpenChange={open => { if (!open) setEditEntry(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Entry — {editEntry?.entry_date}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Cash at Hand (KES)</Label>
              <Input type="number" min="0" step="0.01" value={editCash} onChange={e => setEditCash(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expenses (KES)</Label>
              <Input type="number" min="0" step="0.01" value={editExpenses} onChange={e => setEditExpenses(e.target.value)} className="h-8 text-sm" />
            </div>
            {editCash && editExpenses && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                Daily balance: <span className={`font-semibold ${(parseFloat(editCash)-parseFloat(editExpenses))>=0?'text-green-700':'text-red-600'}`}>
                  {fmt((parseFloat(editCash)||0)-(parseFloat(editExpenses)||0))}
                </span>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEdit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
