import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Star, Users, Repeat2, Crown } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;
const fmtS = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'];

// ─── Reviews ──────────────────────────────────────────────────────────────────
const ReviewsWidget = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api.get('/owner/customers/reviews').then(r => setData(r.data)).catch(() => toast.error('Reviews load failed'));
  }, []);

  const Stars = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
      ))}
    </div>
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />Guest Reviews & Ratings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.total === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No approved reviews yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                <p className="text-4xl font-bold text-amber-500">{data.avg_rating}</p>
                <Stars rating={data.avg_rating} />
                <p className="text-xs text-muted-foreground mt-1">{data.total} reviews</p>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = data.distribution?.[String(star)] || 0;
                  const pct = data.total > 0 ? Math.round(count / data.total * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-right text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Cleanliness', val: data.avg_cleanliness },
                { label: 'Staff', val: data.avg_staff },
                { label: 'Value', val: data.avg_value },
              ].map(s => (
                <div key={s.label} className="p-2 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-bold">{s.val} <span className="text-amber-500">★</span></p>
                </div>
              ))}
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Reviews</p>
              {(data.recent || []).map((r: any, i: number) => (
                <div key={i} className="p-3 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <Stars rating={r.overall_rating} />
                    <span className="text-xs text-muted-foreground">{(r.created_at || '').slice(0, 10)}</span>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground line-clamp-2">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Repeat Rate ─────────────────────────────────────────────────────────────
const RepeatRateWidget = () => {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState('90');
  useEffect(() => {
    api.get('/owner/customers/repeat-rate', { params: { days } }).then(r => setData(r.data)).catch(() => toast.error('Repeat rate failed'));
  }, [days]);

  const pieData = data ? [
    { name: 'New', value: data.total_customers - data.repeat_customers },
    { name: 'Repeat', value: data.repeat_customers },
  ] : [];

  const freqData = data ? [
    { label: '1 visit', value: data.frequency_distribution?.['1'] || 0 },
    { label: '2-3 visits', value: data.frequency_distribution?.['2-3'] || 0 },
    { label: '4-6 visits', value: data.frequency_distribution?.['4-6'] || 0 },
    { label: '7+ visits', value: data.frequency_distribution?.['7+'] || 0 },
  ] : [];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-blue-500" />Repeat Customer Rate
          </CardTitle>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30D</SelectItem>
              <SelectItem value="90">90D</SelectItem>
              <SelectItem value="180">180D</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div> : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Repeat Rate', val: `${data.repeat_rate_pct}%`, cls: 'text-blue-600 dark:text-blue-400' },
                { label: 'Repeat Customers', val: data.repeat_customers, cls: '' },
                { label: 'Loyal (5+ visits)', val: data.loyal_customers, cls: 'text-emerald-600 dark:text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="p-2.5 bg-muted/40 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`font-bold ${s.cls}`}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                    <Cell fill="#6366f1" /><Cell fill="#10b981" />
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {freqData.map((f, i) => (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-medium">{f.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${data.total_customers > 0 ? (f.value / data.total_customers) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Top Customers ────────────────────────────────────────────────────────────
const TopCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/owner/analytics/clv', { params: { limit: 20 } }).then(r => { setCustomers(r.data.customers || []); setLoading(false); })
      .catch(() => { toast.error('Top customers failed'); setLoading(false); });
  }, []);

  const barData = customers.slice(0, 8).map(c => ({
    name: (c.name || 'Guest').split(' ')[0],
    Spend: c.total_spend,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />Top Customers by Lifetime Value
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div> : customers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No customer data yet.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtS} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip formatter={(v: any) => [fmt(v), 'Total Spend']} />
                <Bar dataKey="Spend" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {['#', 'Customer', 'Total Spend', 'Visits', 'Avg/Visit'].map(h => (
                      <th key={h} className={`p-2 font-semibold text-muted-foreground uppercase tracking-wide ${h === 'Customer' ? 'text-left pl-2' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 pl-2">
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.total_spend)}</td>
                      <td className="p-2 text-right">{c.total_visits}</td>
                      <td className="p-2 text-right text-muted-foreground">{fmt(c.avg_spend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const CustomersPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold">Customer Intelligence</h2>
      <p className="text-sm text-muted-foreground">Reviews, loyalty, and your highest-value customers</p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReviewsWidget />
      <RepeatRateWidget />
    </div>
    <TopCustomers />
  </div>
);
