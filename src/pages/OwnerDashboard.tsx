// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Building2, TrendingUp, TrendingDown, Users, DollarSign, BedDouble,
  ShoppingCart, Plus, Pencil, Trash2, RefreshCw, Star, AlertTriangle,
  BarChart3, MapPin, Phone, Mail, Calendar, Award, Target, Activity,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Settings,
  Search, Menu, X, LayoutDashboard, GitBranch,
  PieChart as PieChartIcon, FileText, CheckCircle2, Clock, Wifi,
  LineChart, Cog, ClipboardList, UserSquare2, HeartHandshake, Bell, Download, Package, LogOut, Home
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatKES } from '@/lib/utils/format';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BalanceSheet } from '@/components/Manager/Reports/BalanceSheet';
import { format } from 'date-fns';
import { AnalyticsPage } from '@/components/Owner/AnalyticsPage';
import { OperationsPage } from '@/components/Owner/OperationsPage';
import { ReportsPage } from '@/components/Owner/ReportsPage';
import { PeoplePage } from '@/components/Owner/PeoplePage';
import { CustomersPage } from '@/components/Owner/CustomersPage';
import { AlertsPage } from '@/components/Owner/AlertsPage';
import { ExportPage } from '@/components/Owner/ExportPage';
import { StockPage } from '@/components/Owner/StockPage';
import { SystemHealth } from '@/components/Manager/SystemHealth';
import { ThemeToggle } from '@/components/ThemeToggle';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BranchStats {
  total_revenue: number; fb_revenue: number; room_revenue: number;
  total_orders: number; completed_orders: number; total_bookings: number;
  unique_customers: number; occupancy_rate: number; total_rooms: number;
  occupied_rooms: number; total_staff: number; active_staff: number;
}
interface BranchSummary {
  id: string; name: string; location?: string; status: string; stats: BranchStats;
}
interface Branch {
  id: string; name: string; location?: string; address?: string; phone?: string;
  email?: string; manager_id?: string; manager?: { id: string; full_name: string; email: string } | null;
  status: 'active' | 'inactive' | 'under_renovation'; opened_at?: string; notes?: string;
}
interface OverviewData {
  period_days: number; period_start: string; period_end: string;
  branches: BranchSummary[];
  consolidated: {
    total_revenue: number; fb_revenue: number; room_revenue: number;
    total_orders: number; completed_orders: number; total_bookings: number;
    unique_customers: number; total_staff: number; active_staff: number;
    avg_occupancy_rate: number;
  };
  top_branch?: string; needs_attention?: string;
}
interface Financials {
  period: { start: string; end: string };
  revenue: { fb: number; rooms: number; total: number };
  expenses: number; gross_profit: number; profit_margin: number;
}

const EMPTY_BRANCH = { name: '', location: '', address: '', phone: '', email: '', notes: '', opened_at: '', status: 'active' };
const fmt = formatKES;
const fmtShort = formatKES;
const fmtAxis = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
};
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'branches',     label: 'Branches',     icon: GitBranch },
  { id: 'performance',  label: 'Performance',  icon: BarChart3 },
  { id: 'financials',   label: 'Financials',   icon: FileText },
  { id: 'analytics',   label: 'Analytics',    icon: LineChart },
  { id: 'operations',  label: 'Operations',   icon: Cog },
  { id: 'reports',     label: 'Reports',      icon: ClipboardList },
  { id: 'people',      label: 'People',       icon: UserSquare2 },
  { id: 'customers',   label: 'Customers',    icon: HeartHandshake },
  { id: 'alerts',      label: 'Alerts',       icon: Bell },
  { id: 'stock',       label: 'Stock',        icon: Package },
  { id: 'health',      label: 'System Health', icon: Activity },
  { id: 'export',      label: 'Export',       icon: Download },
];

const Sidebar = ({ active, onChange, collapsed, onToggle }: {
  active: string; onChange: (s: string) => void; collapsed: boolean; onToggle: () => void;
}) => (
  <aside className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen flex-shrink-0`}>
    {/* Logo */}
    <div className="flex items-center h-16 px-4 border-b border-slate-700/60 gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <Building2 className="h-4 w-4 text-white" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight truncate">Premier Hotel</p>
          <p className="text-xs text-slate-400 truncate">Enterprise Portal</p>
        </div>
      )}
      <button
        onClick={onToggle}
        className="ml-auto text-slate-400 hover:text-white transition-colors flex-shrink-0"
      >
        {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </button>
    </div>

    {/* Nav */}
    <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
      {!collapsed && (
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 pb-2">Main</p>
      )}
      {NAV_ITEMS.slice(0, 4).map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              isActive ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
            <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
          </button>
        );
      })}
      {!collapsed && (
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 pb-2 pt-4">Intelligence</p>
      )}
      {collapsed && <div className="border-t border-slate-700/40 my-2" />}
      {NAV_ITEMS.slice(4).map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              isActive ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
            <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
          </button>
        );
      })}
    </nav>

    {/* Bottom status */}
    {!collapsed && (
      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Wifi className="h-3 w-3 text-emerald-400" />
          <span>Live data</span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    )}
  </aside>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, change, icon: Icon, accent = 'indigo', loading = false }: {
  label: string; value: string; sub?: string; change?: number;
  icon: React.ElementType; accent?: string; loading?: boolean;
}) => {
  const accents: Record<string, { bg: string; text: string; ring: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', ring: 'ring-indigo-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', ring: 'ring-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', ring: 'ring-purple-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', ring: 'ring-rose-500/20' },
  };
  const a = accents[accent] || accents.indigo;
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-24" />
            <div className="h-7 bg-muted rounded w-32" />
            <div className="h-2.5 bg-muted rounded w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${a.bg} ring-1 ${a.ring}`}>
                <Icon className={`h-4 w-4 ${a.text}`} />
              </div>
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  change > 0 ? 'bg-emerald-500/10 text-emerald-600' :
                  change < 0 ? 'bg-rose-500/10 text-rose-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {change > 0 ? <ArrowUpRight className="h-3 w-3" /> :
                   change < 0 ? <ArrowDownRight className="h-3 w-3" /> :
                   <Minus className="h-3 w-3" />}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    inactive: { label: 'Inactive', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
    under_renovation: { label: 'Renovation', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    closed: { label: 'Closed', cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  };
  const s = cfg[status] || { label: status, cls: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' ? fmtShort(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Overview Page ────────────────────────────────────────────────────────────

const OverviewPage = ({ overview, loading, period, onPeriodChange, customStart, customEnd, onCustomRange }: {
  overview: OverviewData | null; loading: boolean;
  period: number; onPeriodChange: (d: number) => void;
  customStart: string; customEnd: string;
  onCustomRange: (start: string, end: string) => void;
}) => {
  const [localStart, setLocalStart] = useState(customStart);
  const [localEnd, setLocalEnd] = useState(customEnd);
  const isCustom = !!(customStart && customEnd);

  const applyCustom = () => {
    if (localStart && localEnd && localStart <= localEnd) {
      onCustomRange(localStart, localEnd);
    } else {
      toast.error('Select a valid date range');
    }
  };

  const clearCustom = () => {
    setLocalStart(''); setLocalEnd('');
    onCustomRange('', '');
  };

  const c = overview?.consolidated;
  const branches = overview?.branches || [];

  // Revenue mix data for pie chart
  const revMix = c ? [
    { name: 'F&B', value: c.fb_revenue },
    { name: 'Rooms', value: c.room_revenue },
  ] : [];

  // Branch revenue data for bar chart
  const branchRevData = branches.map(b => ({
    name: b.name.length > 14 ? b.name.slice(0, 14) + '…' : b.name,
    Revenue: b.stats.total_revenue,
    'F&B': b.stats.fb_revenue,
    Rooms: b.stats.room_revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Period controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Business Overview</h2>
          <p className="text-sm text-muted-foreground">
            {overview
              ? `${format(new Date(overview.period_start), 'MMM d, yyyy')} – ${format(new Date(overview.period_end), 'MMM d, yyyy')}`
              : 'Loading...'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset pills */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {[7, 30, 90, 365].map(d => (
              <button
                key={d}
                onClick={() => { clearCustom(); onPeriodChange(d); }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  !isCustom && period === d ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{d === 365 ? '1Y' : d === 90 ? '90D' : d === 30 ? '30D' : '7D'}</button>
            ))}
          </div>

          {/* Custom date range */}
          <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-lg border transition-colors ${isCustom ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-border bg-muted'}`}>
            <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 flex-shrink-0" />
            <input
              type="date"
              value={localStart}
              onChange={e => setLocalStart(e.target.value)}
              className="text-xs bg-transparent border-0 outline-none text-foreground w-28 cursor-pointer"
            />
            <span className="text-muted-foreground text-xs">→</span>
            <input
              type="date"
              value={localEnd}
              onChange={e => setLocalEnd(e.target.value)}
              className="text-xs bg-transparent border-0 outline-none text-foreground w-28 cursor-pointer"
            />
            <button
              onClick={applyCustom}
              className="text-xs font-medium px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >Apply</button>
            {isCustom && (
              <button onClick={clearCustom} className="text-muted-foreground hover:text-foreground mr-1">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {!loading && overview && (overview.top_branch || overview.needs_attention) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {overview.top_branch && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Award className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Top Performer</p>
                <p className="font-bold text-sm">{overview.top_branch}</p>
              </div>
            </div>
          )}
          {overview.needs_attention && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Needs Attention</p>
                <p className="font-bold text-sm">{overview.needs_attention}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon={DollarSign} label="Total Revenue" value={fmtShort(c?.total_revenue || 0)} sub={`Rooms: ${fmtShort(c?.room_revenue || 0)}`} accent="emerald" loading={loading} />
        <KpiCard icon={ShoppingCart} label="F&B Revenue" value={fmtShort(c?.fb_revenue || 0)} sub={`${c?.completed_orders || 0} completed orders`} accent="indigo" loading={loading} />
        <KpiCard icon={BedDouble} label="Avg Occupancy" value={pct(c?.avg_occupancy_rate || 0)} sub={`${c?.total_bookings || 0} bookings`} accent="blue" loading={loading} />
        <KpiCard icon={Users} label="Active Staff" value={String(c?.active_staff || 0)} sub={`${c?.total_staff || 0} total across ${branches.length} branch${branches.length !== 1 ? 'es' : ''}`} accent="purple" loading={loading} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard icon={Target} label="Total Orders" value={String(c?.total_orders || 0)} sub={`${c?.completed_orders || 0} fulfilled`} accent="amber" loading={loading} />
        <KpiCard icon={Activity} label="Customers" value={String(c?.unique_customers || 0)} sub="Unique this period" accent="rose" loading={loading} />
        <KpiCard icon={Building2} label="Branches" value={String(branches.filter(b => b.status === 'active').length)} sub={`${branches.length} total registered`} accent="blue" loading={loading} />
        <KpiCard icon={TrendingUp} label="Total Bookings" value={String(c?.total_bookings || 0)} sub="Room bookings" accent="indigo" loading={loading} />
      </div>

      {/* Charts row */}
      {!loading && branches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Branch revenue bar */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue by Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={branchRevData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="F&B" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Rooms" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue mix pie */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Mix</CardTitle>
            </CardHeader>
            <CardContent>
              {(c?.total_revenue || 0) > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={revMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {revMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {revMix.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-semibold">{fmtShort(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue data</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch summary table */}
      {!loading && branches.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Branch Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40">
                    <th className="text-left p-3 pl-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branch</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Orders</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Occupancy</th>
                    <th className="text-right p-3 pr-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...branches].sort((a, b) => b.stats.total_revenue - a.stats.total_revenue).map((b, i) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-5">
                        <div className="flex items-center gap-2.5">
                          {i === 0 && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                          {i !== 0 && <span className="text-muted-foreground text-xs w-3.5 text-center">{i + 1}</span>}
                          <div>
                            <p className="font-semibold">{b.name}</p>
                            {b.location && <p className="text-xs text-muted-foreground">{b.location}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtShort(b.stats.total_revenue)}</span>
                      </td>
                      <td className="p-3 text-right hidden md:table-cell text-muted-foreground">{b.stats.total_orders}</td>
                      <td className="p-3 text-right hidden md:table-cell text-muted-foreground">{pct(b.stats.occupancy_rate)}</td>
                      <td className="p-3 pr-5 text-right"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Branches Page ────────────────────────────────────────────────────────────

const BranchesPage = ({ isOwner }: { isOwner: boolean }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_BRANCH);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/owner/branches'); setBranches(res.data.branches || []); }
    catch { toast.error('Failed to load branches'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditBranch(null); setForm(EMPTY_BRANCH); setShowDialog(true); };
  const openEdit = (b: Branch) => {
    setEditBranch(b);
    setForm({ name: b.name, location: b.location || '', address: b.address || '', phone: b.phone || '', email: b.email || '', notes: b.notes || '', opened_at: b.opened_at || '', status: b.status });
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Branch name is required');
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      Object.entries(form).forEach(([k, v]) => { if (v) payload[k] = v; });
      if (editBranch) { await api.patch(`/owner/branches/${editBranch.id}`, payload); toast.success('Branch updated'); }
      else { await api.post('/owner/branches', payload); toast.success('Branch created'); }
      setShowDialog(false); load();
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const closeBranch = async (id: string, name: string) => {
    if (!confirm(`Close "${name}"?\n\nThe branch will be marked as closed and all staff will be unassigned. All historical data (orders, bookings, rooms) is preserved for reporting.`)) return;
    try {
      await api.delete(`/owner/branches/${id}`);
      toast.success(`"${name}" closed. Historical data preserved.`);
      load();
    } catch {
      toast.error('Failed to close branch');
    }
  };

  const purgeBranch = async (id: string, name: string) => {
    const input = window.prompt(
      `⚠️ PERMANENT DATA PURGE\n\n` +
      `This will PERMANENTLY DELETE everything for "${name}":\n` +
      `rooms, orders, bookings, staff accounts, budgets.\n\n` +
      `This is irreversible and may violate accounting compliance rules.\n\n` +
      `Type the branch name exactly to confirm:`
    );
    if (input === null) return; // cancelled
    if (input.trim() !== name.trim()) {
      toast.error('Branch name did not match. Purge cancelled.');
      return;
    }
    try {
      await api.post(`/owner/branches/${id}/purge?confirm_name=${encodeURIComponent(name)}`);
      toast.success(`Branch "${name}" and all its data permanently deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Purge failed');
    }
  };

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    active: branches.filter(b => b.status === 'active').length,
    inactive: branches.filter(b => b.status === 'inactive').length,
    renovation: branches.filter(b => b.status === 'under_renovation').length,
    closed: branches.filter(b => b.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Branch Management</h2>
          <p className="text-sm text-muted-foreground">Manage all your hotel locations and properties</p>
        </div>
        {isOwner && (
          <Button onClick={openCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />Add Branch
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: stats.active, icon: CheckCircle2, cls: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Inactive', count: stats.inactive, icon: Clock, cls: 'text-slate-500 bg-slate-500/10' },
          { label: 'Renovation', count: stats.renovation, icon: Settings, cls: 'text-amber-500 bg-amber-500/10' },
          { label: 'Closed', count: stats.closed, icon: X, cls: 'text-rose-500 bg-rose-500/10' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.cls}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search branches..." className="pl-9" />
      </div>

      {/* Branch cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardContent className="p-5 h-24" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{search ? 'No branches match your search.' : 'No branches yet. Add your first branch.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <Card key={b.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20 flex-shrink-0 mt-0.5">
                      <Building2 className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <h3 className="font-bold text-base">{b.name}</h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {b.location && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 flex-shrink-0" />{b.location}</span>}
                        {b.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 flex-shrink-0" />{b.phone}</span>}
                        {b.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 flex-shrink-0" />{b.email}</span>}
                        {b.opened_at && <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 flex-shrink-0" />Opened {b.opened_at}</span>}
                        {b.manager && <span className="flex items-center gap-1.5 col-span-2"><Users className="h-3 w-3 flex-shrink-0" />Manager: {b.manager.full_name}</span>}
                      </div>
                      {b.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{b.notes}"</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isOwner && b.status !== 'closed' && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600"
                        title="Close branch (preserves data)"
                        onClick={() => closeBranch(b.id, b.name)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Permanently purge all branch data"
                        onClick={() => purgeBranch(b.id, b.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              {editBranch ? 'Edit Branch' : 'New Branch'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="col-span-2">
              <Label className="text-xs font-medium mb-1.5 block">Branch Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premier Hotel – CBD Branch" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">City / Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Nairobi, Kenya" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Status</Label>
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
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Full Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254700000000" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="branch@hotel.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Opening Date</Label>
              <Input type="date" value={form.opened_at} onChange={e => setForm(f => ({ ...f, opened_at: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this branch..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {editBranch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Performance Page ─────────────────────────────────────────────────────────

const PerformancePage = ({ overview }: { overview: OverviewData | null }) => {
  if (!overview || overview.branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
        <p className="font-medium">No performance data available</p>
        <p className="text-sm">Add active branches to see comparisons</p>
      </div>
    );
  }

  const branches = [...overview.branches].sort((a, b) => b.stats.total_revenue - a.stats.total_revenue);
  const maxRevenue = branches[0]?.stats.total_revenue || 1;

  const comparisonData = branches.map(b => ({
    name: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
    Revenue: b.stats.total_revenue,
    Orders: b.stats.total_orders,
    Staff: b.stats.active_staff,
    Occupancy: b.stats.occupancy_rate,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Performance Analysis</h2>
        <p className="text-sm text-muted-foreground">Last {overview.period_days} days — cross-branch comparison</p>
      </div>

      {/* Revenue ranking */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />Revenue Ranking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branches.map((b, i) => {
            const pctOfTop = maxRevenue > 0 ? (b.stats.total_revenue / maxRevenue) * 100 : 0;
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-amber-500/20 text-amber-600' :
                      i === branches.length - 1 && branches.length > 1 ? 'bg-rose-500/10 text-rose-500' :
                      'bg-muted text-muted-foreground'
                    }`}>{i + 1}</span>
                    <span className="font-semibold">{b.name}</span>
                    {b.location && <span className="text-xs text-muted-foreground hidden sm:inline">({b.location})</span>}
                    {i === 0 && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.stats.total_revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      i === 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                      i === branches.length - 1 && branches.length > 1 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                      'bg-gradient-to-r from-indigo-500 to-indigo-400'
                    }`}
                    style={{ width: `${pctOfTop}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Multi-metric chart */}
      {branches.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Orders & Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Staff" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed comparison table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Full Comparison Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/40">
                  {['Branch', 'Total Revenue', 'F&B', 'Rooms', 'Occupancy', 'Orders', 'Customers', 'Staff'].map(h => (
                    <th key={h} className={`p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Branch' ? 'text-left pl-5' : 'text-right'} ${['F&B','Rooms','Customers','Staff'].includes(h) ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((b, i) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 pl-5">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        <div>
                          <p className="font-semibold">{b.name}</p>
                          {b.location && <p className="text-xs text-muted-foreground">{b.location}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.stats.total_revenue)}</td>
                    <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{fmt(b.stats.fb_revenue)}</td>
                    <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{fmt(b.stats.room_revenue)}</td>
                    <td className="p-3 text-right">{pct(b.stats.occupancy_rate)}</td>
                    <td className="p-3 text-right">{b.stats.total_orders}</td>
                    <td className="p-3 text-right hidden lg:table-cell">{b.stats.unique_customers}</td>
                    <td className="p-3 pr-4 text-right hidden lg:table-cell">{b.stats.active_staff}/{b.stats.total_staff}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-500/5 border-t-2 border-indigo-500/20 font-bold">
                  <td className="p-3 pl-5 text-indigo-600 dark:text-indigo-400">Consolidated Total</td>
                  <td className="p-3 text-right text-indigo-600 dark:text-indigo-400">{fmt(overview.consolidated.total_revenue)}</td>
                  <td className="p-3 text-right hidden lg:table-cell">{fmt(overview.consolidated.fb_revenue)}</td>
                  <td className="p-3 text-right hidden lg:table-cell">{fmt(overview.consolidated.room_revenue)}</td>
                  <td className="p-3 text-right">{pct(overview.consolidated.avg_occupancy_rate)}</td>
                  <td className="p-3 text-right">{overview.consolidated.total_orders}</td>
                  <td className="p-3 text-right hidden lg:table-cell">{overview.consolidated.unique_customers}</td>
                  <td className="p-3 pr-4 text-right hidden lg:table-cell">{overview.consolidated.active_staff}/{overview.consolidated.total_staff}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Financials Page ──────────────────────────────────────────────────────────

const FinancialsPage = () => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/consolidated-financials', { params: { start_date: startDate, end_date: endDate } });
      setFinancials(res.data);
    } catch { toast.error('Failed to load financials'); }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const plRows = financials ? [
    { label: 'F&B Revenue', value: financials.revenue.fb, type: 'income' },
    { label: 'Room Revenue', value: financials.revenue.rooms, type: 'income' },
    { label: 'Total Revenue', value: financials.revenue.total, type: 'total' },
    { label: 'Total Expenses', value: -financials.expenses, type: 'expense' },
    { label: 'Gross Profit', value: financials.gross_profit, type: 'profit' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Consolidated Financials</h2>
          <p className="text-sm text-muted-foreground">Aggregated P&L and Balance Sheet across all branches</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-38 text-sm" />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-38 text-sm" />
          <Button onClick={load} size="sm" variant="outline" disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {/* P&L + Margin cards */}
      {financials && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Total Revenue" value={fmtShort(financials.revenue.total)} accent="emerald" />
          <KpiCard icon={TrendingDown} label="Total Expenses" value={fmtShort(financials.expenses)} accent="rose" />
          <KpiCard icon={TrendingUp} label="Gross Profit" value={fmtShort(financials.gross_profit)} accent={financials.gross_profit >= 0 ? 'emerald' : 'rose'} />
          <KpiCard icon={PieChartIcon} label="Profit Margin" value={pct(financials.profit_margin)} accent={financials.profit_margin >= 30 ? 'emerald' : financials.profit_margin >= 10 ? 'amber' : 'rose'} />
        </div>
      )}

      {/* P&L Statement */}
      {financials && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />Profit & Loss Statement
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {financials.period.start} – {financials.period.end}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {plRows.map((row, i) => (
                    <tr key={i} className={`border-b last:border-0 ${
                      row.type === 'total' ? 'bg-muted/40 font-semibold' :
                      row.type === 'profit' ? 'bg-indigo-500/5 font-bold text-base border-t-2' : ''
                    }`}>
                      <td className="px-5 py-3">{row.label}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${
                        row.type === 'income' || row.type === 'total' ? 'text-emerald-600 dark:text-emerald-400' :
                        row.type === 'expense' ? 'text-rose-500' :
                        row.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        {row.value < 0 ? `(${fmt(Math.abs(row.value))})` : fmt(row.value)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20">
                    <td className="px-5 py-3 text-muted-foreground text-xs">Profit Margin</td>
                    <td className={`px-5 py-3 text-right text-sm font-bold ${financials.profit_margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {pct(financials.profit_margin)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Revenue mix */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {financials.revenue.total > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={[{ name: 'F&B', value: financials.revenue.fb }, { name: 'Rooms', value: financials.revenue.rooms }]}
                        cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        <Cell fill="#6366f1" /><Cell fill="#10b981" />
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 mt-3">
                    {[
                      { label: 'F&B Revenue', value: financials.revenue.fb, pct: (financials.revenue.fb / financials.revenue.total) * 100, color: '#6366f1' },
                      { label: 'Room Revenue', value: financials.revenue.rooms, pct: (financials.revenue.rooms / financials.revenue.total) * 100, color: '#10b981' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.label}
                          </span>
                          <span className="font-semibold">{fmtShort(item.value)} <span className="text-muted-foreground font-normal">({pct(item.pct)})</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No revenue for this period</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Balance Sheet */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-indigo-500/10">
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="font-bold">Balance Sheet</h3>
            <p className="text-xs text-muted-foreground">Use "Edit Items" to add fixed assets, loans, owner capital &amp; drawings</p>
          </div>
        </div>
        <BalanceSheet />
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  // Custom date range — null means use preset `period`
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const isOwner = user?.role === 'owner';

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const params: Record<string, string | number> = customStart && customEnd
        ? { start_date: customStart, end_date: customEnd }
        : { days: period };
      const res = await api.get('/owner/overview', { params });
      setOverview(res.data);
    } catch { toast.error('Failed to load overview'); }
    setOverviewLoading(false);
  }, [period, customStart, customEnd]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const currentNav = NAV_ITEMS.find(n => n.id === page);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar active={page} onChange={setPage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar active={page} onChange={p => { setPage(p); setMobileSidebarOpen(false); }} collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-background border-b flex items-center gap-3 px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30">
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {currentNav && <currentNav.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <h1 className="font-semibold text-sm truncate">{currentNav?.label}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Go to Home"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={loadOverview} disabled={overviewLoading}>
              <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* User chip + logout */}
            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-indigo-600">{(user?.full_name || user?.email || 'O')[0].toUpperCase()}</span>
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-semibold leading-none truncate max-w-28">{user?.full_name || 'Owner'}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Logout"
                onClick={logout}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {page === 'overview' && (
            <OverviewPage
              overview={overview}
              loading={overviewLoading}
              period={period}
              onPeriodChange={(d) => { setPeriod(d); }}
              customStart={customStart}
              customEnd={customEnd}
              onCustomRange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
            />
          )}
          {page === 'branches' && <BranchesPage isOwner={isOwner} />}
          {page === 'performance' && <PerformancePage overview={overview} />}
          {page === 'financials' && <FinancialsPage />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'operations' && <OperationsPage />}
          {page === 'reports' && <ReportsPage />}
          {page === 'people' && <PeoplePage />}
          {page === 'customers' && <CustomersPage />}
          {page === 'alerts' && <AlertsPage isOwner={isOwner} />}
          {page === 'stock' && <StockPage />}
          {page === 'health' && <SystemHealth />}
          {page === 'export' && <ExportPage />}
        </main>
      </div>
    </div>
  );
}
