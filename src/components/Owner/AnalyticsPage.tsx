import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${Math.round(n)}`;
};
const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
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

// ─── Seasonal Trend ──────────────────────────────────────────────────────────
const SeasonalChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/analytics/seasonal').then(r => { setData(r.data.months || []); setLoading(false); })
      .catch(() => { toast.error('Failed to load seasonal data'); setLoading(false); });
  }, []);
  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  const peak = data.reduce((a, b) => b.total > a.total ? b : a, data[0] || {});
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">12-Month Revenue Trend</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Spot peak seasons at a glance</p>
          </div>
          {peak.label && (
            <div className="text-right text-xs">
              <p className="text-muted-foreground">Peak month</p>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">{peak.label}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
            <YAxis tickFormatter={v => fmtShort(v).replace('KES ', '')} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="fb" name="F&B" stroke="#6366f1" fill="url(#fbGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="rooms" name="Rooms" stroke="#10b981" fill="url(#roomGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// ─── YoY Comparison ──────────────────────────────────────────────────────────
const YoYCard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/analytics/yoy').then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('YoY load failed'); setLoading(false); });
  }, []);
  if (loading) return <Card className="border-0 shadow-sm animate-pulse"><CardContent className="h-40" /></Card>;
  if (!data) return null;
  const up = data.change_pct >= 0;
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Year-over-Year</CardTitle>
        <p className="text-xs text-muted-foreground">{data.current_month} vs {data.prior_month}</p>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${up ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
          {up ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-rose-500" />}
          <div>
            <p className={`text-2xl font-bold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {up ? '+' : ''}{data.change_pct}%
            </p>
            <p className="text-xs text-muted-foreground">vs same month last year</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'This Month', d: data.current, bold: true },
            { label: 'Last Year', d: data.prior, bold: false },
          ].map(({ label, d, bold }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {[['F&B', d.fb], ['Rooms', d.rooms], ['Total', d.total]].map(([k, v]) => (
                  <div key={k} className="text-center p-2 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className={`font-bold ${bold ? 'text-foreground' : 'text-muted-foreground'}`}>{fmtShort(v as number)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Revenue Forecast ────────────────────────────────────────────────────────
const ForecastChart = () => {
  const [data, setData] = useState<any>(null);
  const [horizon, setHorizon] = useState('30');
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get('/owner/analytics/forecast', { params: { horizon } })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Forecast failed'); setLoading(false); });
  }, [horizon]);
  useEffect(() => { load(); }, [load]);

  const chartData = data ? [
    ...data.history.filter((_: any, i: number) => i >= data.history.length - 30),
    ...data.forecast
  ] : [];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold">Revenue Forecast</CardTitle>
            <p className="text-xs text-muted-foreground">Linear regression projection</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {data && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-2.5 bg-indigo-500/5 rounded-lg border border-indigo-500/20">
              <p className="text-xs text-muted-foreground">Projected Total</p>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">{fmtShort(data.projected_total)}</p>
            </div>
            <div className="p-2.5 bg-muted/40 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg Daily</p>
              <p className="font-bold">{fmtShort(data.avg_daily_historical)}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Calculating...</div> : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={d => d?.slice(5) || ''} interval={Math.floor(chartData.length / 6)} />
              <YAxis tickFormatter={v => fmtShort(v).replace('KES ', '')} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#histGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// ─── CLV Table ───────────────────────────────────────────────────────────────
const CLVTable = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/analytics/clv').then(r => { setCustomers(r.data.customers || []); setLoading(false); })
      .catch(() => { toast.error('CLV load failed'); setLoading(false); });
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />Customer Lifetime Value — Top Spenders
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 mt-3">
        {loading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div> : customers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No customer data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/40">
                  {['#', 'Customer', 'Total Spend', 'Visits', 'Avg/Visit', 'Last Visit'].map(h => (
                    <th key={h} className={`p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Customer' ? 'text-left pl-5' : 'text-right'} ${h === 'Last Visit' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 pl-5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="p-3">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.total_spend)}</td>
                    <td className="p-3 text-right">{c.total_visits}</td>
                    <td className="p-3 text-right text-muted-foreground">{fmt(c.avg_spend)}</td>
                    <td className="p-3 pr-5 text-right text-muted-foreground hidden md:table-cell">{c.last_visit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AnalyticsPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Analytics & Intelligence</h2>
      <p className="text-sm text-muted-foreground">Revenue forecasting, trends, and customer insights</p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2"><SeasonalChart /></div>
      <YoYCard />
    </div>
    <ForecastChart />
    <CLVTable />
  </div>
);
