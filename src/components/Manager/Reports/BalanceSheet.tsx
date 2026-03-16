import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Printer, Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const SECTIONS = [
  { value: 'fixed_assets',      label: 'Fixed Assets',        group: 'asset' },
  { value: 'other_assets',      label: 'Other Assets',        group: 'asset' },
  { value: 'loans',             label: 'Loans & Borrowings',  group: 'liability' },
  { value: 'other_liabilities', label: 'Other Liabilities',   group: 'liability' },
  { value: 'owner_capital',     label: "Owner's Capital",     group: 'equity' },
  { value: 'owner_drawings',    label: "Owner's Drawings",    group: 'equity' },
];

interface Adjustment { id: string; section: string; name: string; amount: number; notes?: string; }
interface BSData { as_of_date: string; assets: any; liabilities: any; equity: any; }

const emptyForm = { section: 'fixed_assets', name: '', amount: '', notes: '' };

export const BalanceSheet: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<BSData | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [showManage, setShowManage] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [asOfDate]);
  useEffect(() => { loadAdjustments(); }, []);
  useEffect(() => { if (showManage) loadAdjustments(); }, [showManage]);

  const loadData = async () => {
    try {
      const res = await api.get('/financial/balance-sheet', { params: { as_of_date: asOfDate } });
      setData(res.data);
    } catch { toast.error('Failed to load balance sheet'); }
  };

  const [callerRole, setCallerRole] = useState<string>('manager');
  const canEdit = callerRole === 'owner' || callerRole === 'admin';
  const canDelete = callerRole === 'owner';

  const loadAdjustments = async () => {
    try {
      const res = await api.get('/financial/adjustments');
      setAdjustments(res.data.adjustments);
      setCallerRole(res.data.caller_role || 'manager');
    } catch { toast.error('Failed to load adjustments'); }
  };

  const saveAdjustment = async () => {
    if (!form.name.trim() || !form.amount) return toast.error('Name and amount are required');
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/financial/adjustments/${editId}`, { name: form.name, amount: parseFloat(form.amount), notes: form.notes });
        toast.success('Updated');
      } else {
        await api.post('/financial/adjustments', { section: form.section, name: form.name, amount: parseFloat(form.amount), notes: form.notes });
        toast.success('Added');
      }
      setForm(emptyForm);
      setEditId(null);
      await Promise.all([loadAdjustments(), loadData()]);
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const deleteAdjustment = async (id: string) => {
    try {
      await api.delete(`/financial/adjustments/${id}`);
      toast.success('Deleted');
      await Promise.all([loadAdjustments(), loadData()]);
    } catch { toast.error('Delete failed'); }
  };

  const startEdit = (a: Adjustment) => {
    setEditId(a.id);
    setForm({ section: a.section, name: a.name, amount: String(a.amount), notes: a.notes || '' });
  };

  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const { assets, liabilities, equity } = data;

  const Row = ({ label, value, indent = false, bold = false, sub = false }: any) => (
    <TableRow className={bold ? 'font-bold bg-muted' : sub ? 'text-muted-foreground text-sm' : ''}>
      <TableCell className={indent ? 'pl-8' : 'pl-4'}>{label}</TableCell>
      <TableCell className="text-right">KES {Number(value).toLocaleString()}</TableCell>
    </TableRow>
  );

  const SectionItems = ({ items }: { items: any[] }) =>
    items?.map((item: any) => (
      <Row key={item.id} label={item.name} value={item.amount} indent sub />
    ));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <CardTitle>Balance Sheet</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">As of {format(new Date(asOfDate), 'MMM dd, yyyy')}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setShowManage(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Items
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">

            {/* ── ASSETS ── */}
            <div>
              <h3 className="font-semibold text-lg mb-3 uppercase tracking-wide">Assets</h3>
              <Table>
                <TableBody>
                  <TableRow><TableCell className="pl-4 font-medium text-muted-foreground" colSpan={2}>Current Assets</TableCell></TableRow>
                  <Row label="Cash & Bank" value={assets.current_assets.cash} indent />
                  <Row label="Inventory" value={assets.current_assets.inventory} indent />
                  <Row label="Accounts Receivable" value={assets.current_assets.accounts_receivable} indent />

                  {assets.fixed_assets?.total > 0 && (
                    <>
                      <TableRow><TableCell className="pl-4 font-medium text-muted-foreground pt-3" colSpan={2}>Fixed Assets</TableCell></TableRow>
                      <SectionItems items={assets.fixed_assets.items} />
                      <Row label="Total Fixed Assets" value={assets.fixed_assets.total} indent bold />
                    </>
                  )}

                  {assets.other_assets?.total > 0 && (
                    <>
                      <TableRow><TableCell className="pl-4 font-medium text-muted-foreground pt-3" colSpan={2}>Other Assets</TableCell></TableRow>
                      <SectionItems items={assets.other_assets.items} />
                      <Row label="Total Other Assets" value={assets.other_assets.total} indent bold />
                    </>
                  )}

                  <Row label="Total Assets" value={assets.total_assets} bold />
                </TableBody>
              </Table>
            </div>

            {/* ── LIABILITIES ── */}
            <div>
              <h3 className="font-semibold text-lg mb-3 uppercase tracking-wide">Liabilities</h3>
              <Table>
                <TableBody>
                  <Row label="Accounts Payable" value={liabilities.current_liabilities.accounts_payable} indent />

                  {liabilities.loans?.total > 0 && (
                    <>
                      <TableRow><TableCell className="pl-4 font-medium text-muted-foreground pt-3" colSpan={2}>Loans & Borrowings</TableCell></TableRow>
                      <SectionItems items={liabilities.loans.items} />
                      <Row label="Total Loans" value={liabilities.loans.total} indent bold />
                    </>
                  )}

                  {liabilities.other_liabilities?.total > 0 && (
                    <>
                      <TableRow><TableCell className="pl-4 font-medium text-muted-foreground pt-3" colSpan={2}>Other Liabilities</TableCell></TableRow>
                      <SectionItems items={liabilities.other_liabilities.items} />
                      <Row label="Total Other Liabilities" value={liabilities.other_liabilities.total} indent bold />
                    </>
                  )}

                  <Row label="Total Liabilities" value={liabilities.total_liabilities} bold />
                </TableBody>
              </Table>
            </div>

            {/* ── EQUITY ── */}
            <div className="border-t-2 pt-4">
              <h3 className="font-semibold text-lg mb-3 uppercase tracking-wide">Equity</h3>
              <Table>
                <TableBody>
                  {equity.owner_capital > 0 && <Row label="Owner's Capital" value={equity.owner_capital} indent />}
                  {equity.owner_drawings > 0 && <Row label="Owner's Drawings" value={-equity.owner_drawings} indent />}
                  <Row label="Retained Earnings" value={equity.retained_earnings} indent />
                  <Row label="Total Equity" value={equity.total_equity} bold />
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-muted-foreground text-center pt-4 border-t">
              Assets ({assets.total_assets.toLocaleString()}) = Liabilities ({liabilities.total_liabilities.toLocaleString()}) + Equity ({equity.total_equity.toLocaleString()})
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Manage Adjustments Dialog ── */}
      <Dialog open={showManage} onOpenChange={setShowManage}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Balance Sheet Items</DialogTitle>
            <p className="text-sm text-muted-foreground">Add fixed assets, loans, owner capital, drawings, and other manual entries.</p>
          </DialogHeader>

          {/* Add / Edit Form — only for owner and admin */}
          {canEdit && <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium text-sm">{editId ? 'Edit Entry' : 'Add New Entry'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Select value={form.section} onValueChange={(v) => setForm(f => ({ ...f, section: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="capitalize">{s.label}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{s.group}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Name (e.g. Office Equipment)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Amount (KES)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <Input placeholder="Notes (optional)" className="col-span-2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveAdjustment} disabled={saving} size="sm">
                <Plus className="h-4 w-4 mr-1" />{editId ? 'Update' : 'Add'}
              </Button>
              {editId && <Button variant="outline" size="sm" onClick={() => { setEditId(null); setForm(emptyForm); }}>Cancel</Button>}
            </div>
          </div>}

          {/* Existing Entries */}
          {adjustments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No manual entries yet.</p>
          ) : (
            <div className="space-y-1">
              {SECTIONS.map(sec => {
                const items = adjustments.filter(a => a.section === sec.value);
                if (!items.length) return null;
                return (
                  <div key={sec.value}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 pb-1">{sec.label}</p>
                    {items.map(a => (
                      <div key={a.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{a.name}</span>
                          {a.notes && <span className="text-muted-foreground ml-2 text-xs">— {a.notes}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">KES {Number(a.amount).toLocaleString()}</span>
                          {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>}
                          {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAdjustment(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManage(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
