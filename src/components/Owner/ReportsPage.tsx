// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Target, TrendingDown, DollarSign, Clock, FileText, Plus, RefreshCw } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;
const fmtS = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
};
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">KES {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Budget vs Actual ─────────────────────────────────────────────────────────
const BudgetVsActual = () => {
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showDialog, setShowDialog] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ branch_id: '', month: '', revenue_target: '', expense_budget: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get('/owner/reports/budget', { params: { year } }).then(r => {
      setData(r.data); setBranches(r.data.branches || []);
      if (r.data.branches?.[0] && !form.branch_id) setForm(f => ({ ...f, branch_id: r.data.branches[0].id }));
    }).catch(() => toast.error('Failed to load budgets'));
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.branch_id || !form.month) return toast.error('Select branch and month');
    setSaving(true);
    try {
      await api.post('/owner/reports/budget', {
        branch_id: form.branch_id, month: form.month + '-01',
        revenue_target: parseFloat(form.revenue_target) || 0,
        expense_budget: parseFloat(form.expense_budget) || 0,
        notes: form.notes,
      });
      toast.success('Budget saved'); setShowDialog(false); load();
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const chartData = data?.monthly || [];

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />Budget vs Actual
              </CardTitle>
              <p className="text-xs text-muted-foreground">Set targets and track performance</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setShowDialog(true)} className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" />Set Budget
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickFormatter={m => m?.slice(5)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtS(v)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue_target" name="Target" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.4} />
              <Bar dataKey="actual_revenue" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  {['Month', 'Target', 'Actual', 'Variance', 'Attainment'].map(h => (
                    <th key={h} className={`p-2 font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Month' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.filter((m: any) => m.revenue_target > 0 || m.actual_revenue > 0).map((m: any) => (
                  <tr key={m.month} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-medium">{m.month}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmt(m.revenue_target)}</td>
                    <td className="p-2 text-right font-semibold">{fmt(m.actual_revenue)}</td>
                    <td className={`p-2 text-right font-semibold ${m.revenue_variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {m.revenue_variance >= 0 ? '+' : ''}{fmt(m.revenue_variance)}
                    </td>
                    <td className={`p-2 text-right font-semibold ${m.revenue_attainment >= 100 ? 'text-emerald-600 dark:text-emerald-400' : m.revenue_attainment >= 75 ? 'text-amber-600' : 'text-rose-500'}`}>
                      {m.revenue_attainment}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader><DialogTitle>Set Monthly Budget</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Branch</Label>
              <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Month</Label>
              <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Revenue Target (KES)</Label>
              <Input type="number" value={form.revenue_target} onChange={e => setForm(f => ({ ...f, revenue_target: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Expense Budget (KES)</Label>
              <Input type="number" value={form.expense_budget} onChange={e => setForm(f => ({ ...f, expense_budget: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Budget'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Expense Breakdown ────────────────────────────────────────────────────────
const ExpenseBreakdown = () => {
  const [data, setData] = useState<any>(null);
  const [start, setStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get('/owner/reports/expenses', { params: { start_date: start, end_date: end } })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load expenses'); setLoading(false); });
  }, [start, end]);
  useEffect(() => { load(); }, [load]);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-rose-500" />Expense Breakdown
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="h-7 text-xs w-32" />
            <span className="text-muted-foreground text-xs">→</span>
            <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="h-7 text-xs w-32" />
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!data || data.categories.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No expense data for this period.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.categories} dataKey="total" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {data.categories.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {data.categories.map((c: any, i: number) => (
                <div key={c.type}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {c.label}
                    </span>
                    <span className="font-semibold">{fmt(c.total)} <span className="text-muted-foreground font-normal">({c.pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Cash Flow ────────────────────────────────────────────────────────────────
const CashFlow = () => {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState('30');
  const load = useCallback(() => {
    api.get('/owner/reports/cashflow', { params: { days } }).then(r => setData(r.data)).catch(() => toast.error('Cash flow failed'));
  }, [days]);
  useEffect(() => { load(); }, [load]);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />Cash Flow Statement
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {data && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Inflow', val: data.total_inflow, cls: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Outflow', val: data.total_outflow, cls: 'text-rose-500' },
              { label: 'Net', val: data.net_cash_flow, cls: data.net_cash_flow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500' },
            ].map(s => (
              <div key={s.label} className="p-2 bg-muted/40 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-sm font-bold ${s.cls}`}>{fmtS(s.val)}</p>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data?.timeline || []}>
            <defs>
              <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
              tickFormatter={d => d?.slice(5) || ''} interval={Math.floor((data?.timeline?.length || 1) / 5)} />
            <YAxis tickFormatter={v => fmtS(v)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" fill="url(#inGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// ─── AR Aging ─────────────────────────────────────────────────────────────────
const ARAgingWidget = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api.get('/owner/reports/ar-aging').then(r => setData(r.data)).catch(() => toast.error('AR aging failed'));
  }, []);
  const BUCKET_CFG = [
    { key: '0_30', label: '0–30 days', cls: 'text-emerald-600 bg-emerald-500/10' },
    { key: '31_60', label: '31–60 days', cls: 'text-amber-600 bg-amber-500/10' },
    { key: '61_90', label: '61–90 days', cls: 'text-orange-600 bg-orange-500/10' },
    { key: 'over_90', label: '90+ days', cls: 'text-rose-600 bg-rose-500/10' },
  ];
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />AR Aging
        </CardTitle>
        {data && <p className="text-xs text-muted-foreground">Total outstanding: <span className="font-bold text-rose-500">{fmt(data.total_outstanding)}</span></p>}
      </CardHeader>
      <CardContent>
        {!data ? <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div> : (
          <div className="space-y-2.5">
            {BUCKET_CFG.map(b => {
              const s = data.summary[b.key] || { count: 0, total: 0 };
              const pct = data.total_outstanding > 0 ? Math.round(s.total / data.total_outstanding * 100) : 0;
              return (
                <div key={b.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className={`font-bold ${b.cls.split(' ')[0]}`}>{fmt(s.total)} <span className="text-muted-foreground font-normal">({s.count} bills)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${b.cls.split(' ')[1]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── VAT Summary ─────────────────────────────────────────────────────────────
const VATSummary = () => {
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => {
    api.get('/owner/reports/vat', { params: { year } }).then(r => setData(r.data)).catch(() => toast.error('VAT failed'));
  }, [year]);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />VAT Summary
            </CardTitle>
            {data && <p className="text-xs text-muted-foreground">Annual total: <span className="font-bold text-purple-600 dark:text-purple-400">{fmt(data.total_vat_collected)}</span></p>}
          </div>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!data ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y bg-muted/40">
                  <th className="p-2.5 pl-5 text-left font-semibold text-muted-foreground uppercase tracking-wide">Month</th>
                  <th className="p-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wide">Gross Revenue</th>
                  <th className="p-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wide">VAT ({data.vat_rate}%)</th>
                  <th className="p-2.5 pr-5 text-right font-semibold text-muted-foreground uppercase tracking-wide">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.months.filter((m: any) => m.gross_revenue > 0).map((m: any) => (
                  <tr key={m.month} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2.5 pl-5 font-medium">{m.month}</td>
                    <td className="p-2.5 text-right">{fmt(m.gross_revenue)}</td>
                    <td className="p-2.5 text-right font-semibold text-purple-600 dark:text-purple-400">{fmt(m.vat_collected)}</td>
                    <td className="p-2.5 pr-5 text-right">{fmt(m.net_revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-purple-500/5 border-t-2 border-purple-500/20 font-bold text-sm">
                  <td className="p-2.5 pl-5 text-purple-600 dark:text-purple-400">Annual Total</td>
                  <td className="p-2.5 text-right">{fmt(data.total_gross)}</td>
                  <td className="p-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(data.total_vat_collected)}</td>
                  <td className="p-2.5 pr-5 text-right">{fmt(data.total_gross - data.total_vat_collected)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ReportsPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Financial Reports</h2>
      <p className="text-sm text-muted-foreground">Budget tracking, expenses, cash flow, and tax reports</p>
    </div>
    <BudgetVsActual />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ExpenseBreakdown />
      <CashFlow />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ARAgingWidget />
      <VATSummary />
    </div>
  </div>
);
