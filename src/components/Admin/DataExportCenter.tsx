/**
 * Data Export Center — export any system data to CSV or Excel
 * for migration to another system or offline analysis.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import {
  Download, FileSpreadsheet, FileText, BedDouble, Users,
  ShoppingCart, Package, Coffee, CalendarDays, ClipboardList,
  Loader2, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
}

function downloadCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const blob = new Blob([toCSV(headers, rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadXLSX(filename: string, sheets: { name: string; rows: (string | number | boolean | null | undefined)[][] }[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

const today = () => new Date().toISOString().split('T')[0];

// ─── Export card ──────────────────────────────────────────────────────────────
interface ExportCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  onExportCSV: () => Promise<void>;
  onExportXLSX: () => Promise<void>;
  extra?: React.ReactNode;
}

function ExportCard({ icon: Icon, title, description, color, onExportCSV, onExportXLSX, extra }: ExportCardProps) {
  const [csvLoading, setCSV] = useState(false);
  const [xlsxLoading, setXLSX] = useState(false);
  const [done, setDone] = useState(false);

  const run = async (fn: () => Promise<void>, setL: (v: boolean) => void) => {
    setL(true); setDone(false);
    try { await fn(); setDone(true); setTimeout(() => setDone(false), 3000); }
    catch (e: any) { toast.error(e?.response?.data?.detail || e?.message || 'Export failed'); }
    finally { setL(false); }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          {done && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-1" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {extra}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1"
            disabled={csvLoading || xlsxLoading}
            onClick={() => run(onExportCSV, setCSV)}>
            {csvLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            CSV
          </Button>
          <Button size="sm" className="flex-1 h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={csvLoading || xlsxLoading}
            onClick={() => run(onExportXLSX, setXLSX)}>
            {xlsxLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
            Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Individual exporters ─────────────────────────────────────────────────────

function MenuExport() {
  const headers = ['Name', 'Category', 'Price (KES)', 'Available', 'Track Inventory', 'Stock Qty', 'Reorder Level', 'Unit', 'Cost Price', 'Description'];

  const fetch = async () => {
    const res = await api.get('/menu/items');
    const items: any[] = res.data || [];
    return items.map(i => [
      i.name, i.category, i.base_price,
      i.is_available ? 'Yes' : 'No',
      i.track_inventory ? 'Yes' : 'No',
      i.stock_quantity ?? 0,
      i.reorder_level ?? 0,
      i.unit || 'piece',
      i.cost_price ?? 0,
      i.description || '',
    ]);
  };

  return (
    <ExportCard
      icon={Coffee} title="Menu Items" color="bg-indigo-500"
      description="All menu items — food, drinks, beverages with pricing and stock"
      onExportCSV={async () => { downloadCSV(`Menu_${today()}.csv`, headers, await fetch()); toast.success('Menu exported to CSV'); }}
      onExportXLSX={async () => { downloadXLSX(`Menu_${today()}.xlsx`, [{ name: 'Menu Items', rows: [headers, ...await fetch()] }]); toast.success('Menu exported to Excel'); }}
    />
  );
}

function RoomsExport() {
  const headers = ['Room Number', 'Type', 'Floor', 'Status', 'Capacity', 'Base Price (KES)', 'Description'];

  const fetch = async () => {
    const res = await api.get('/rooms/');
    const rooms: any[] = res.data || [];
    return rooms.map(r => [r.room_number, r.type, r.floor ?? '', r.status, r.capacity ?? '', r.base_price, r.description || '']);
  };

  return (
    <ExportCard
      icon={BedDouble} title="Rooms" color="bg-blue-500"
      description="All hotel rooms with type, pricing, and current status"
      onExportCSV={async () => { downloadCSV(`Rooms_${today()}.csv`, headers, await fetch()); toast.success('Rooms exported to CSV'); }}
      onExportXLSX={async () => { downloadXLSX(`Rooms_${today()}.xlsx`, [{ name: 'Rooms', rows: [headers, ...await fetch()] }]); toast.success('Rooms exported to Excel'); }}
    />
  );
}

function StaffExport() {
  const headers = ['Full Name', 'Email', 'Phone', 'Role', 'Department', 'Status', 'Hire Date', 'Salary (KES)'];

  const fetch = async () => {
    const res = await api.get('/staff');
    const staff: any[] = res.data?.staff || res.data || [];
    return staff.map(s => [s.full_name, s.email, s.phone || '', s.role, s.department || '', s.status, s.hire_date || '', s.salary ?? '']);
  };

  return (
    <ExportCard
      icon={Users} title="Staff / Employees" color="bg-purple-500"
      description="All staff members with roles, contact info and employment details"
      onExportCSV={async () => { downloadCSV(`Staff_${today()}.csv`, headers, await fetch()); toast.success('Staff exported to CSV'); }}
      onExportXLSX={async () => { downloadXLSX(`Staff_${today()}.xlsx`, [{ name: 'Staff', rows: [headers, ...await fetch()] }]); toast.success('Staff exported to Excel'); }}
    />
  );
}

function CustomersExport() {
  const headers = ['Full Name', 'Email', 'Phone', 'Nationality', 'Total Visits', 'Total Spent (KES)', 'Last Visit', 'Notes'];

  const fetch = async () => {
    const res = await api.get('/customers/search', { params: { q: '', limit: 5000 } });
    const customers: any[] = res.data?.customers || res.data || [];
    return customers.map(c => [c.full_name, c.email, c.phone || '', c.nationality || '', c.total_visits ?? '', c.total_spent ?? '', c.last_visit || '', c.notes || '']);
  };

  return (
    <ExportCard
      icon={ShoppingCart} title="Customers / Guests" color="bg-amber-500"
      description="Full guest database — contact details, visit history, spend"
      onExportCSV={async () => { downloadCSV(`Customers_${today()}.csv`, headers, await fetch()); toast.success('Customers exported to CSV'); }}
      onExportXLSX={async () => { downloadXLSX(`Customers_${today()}.xlsx`, [{ name: 'Customers', rows: [headers, ...await fetch()] }]); toast.success('Customers exported to Excel'); }}
    />
  );
}

function InventoryExport() {
  const headers = ['Name', 'SKU', 'Category', 'Unit', 'Qty in Stock', 'Min Qty', 'Max Qty', 'Unit Cost (KES)', 'Location', 'Active'];

  const fetch = async () => {
    const res = await api.get('/inventory/items');
    const items: any[] = res.data || [];
    return items.map(i => [i.name, i.sku || '', i.category_id || '', i.unit, i.quantity ?? 0, i.min_quantity ?? 0, i.max_quantity ?? '', i.unit_cost ?? 0, i.location || '', i.is_active ? 'Yes' : 'No']);
  };

  return (
    <ExportCard
      icon={Package} title="Inventory Items" color="bg-teal-500"
      description="Raw materials and supplies — kitchen, housekeeping, bar stock"
      onExportCSV={async () => { downloadCSV(`Inventory_${today()}.csv`, headers, await fetch()); toast.success('Inventory exported to CSV'); }}
      onExportXLSX={async () => { downloadXLSX(`Inventory_${today()}.xlsx`, [{ name: 'Inventory', rows: [headers, ...await fetch()] }]); toast.success('Inventory exported to Excel'); }}
    />
  );
}

function StockReceiptsExport() {
  const [start, setStart] = useState(new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  const [end, setEnd] = useState(today());

  const headers = ['Receipt #', 'Item', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Supplier', 'Invoice #', 'Received By', 'Date', 'Notes'];

  const fetch = async () => {
    const res = await api.get('/stock/receipts', { params: { start_date: start, end_date: end } });
    const rows: any[] = (res.data as any)?.data ?? res.data ?? [];
    return rows.map(r => [r.receipt_number, r.item_name, r.quantity, r.unit, r.unit_cost, r.total_cost, r.supplier || '', r.invoice_number || '', r.received_by || '', (r.received_at || '').slice(0, 10), r.notes || '']);
  };

  return (
    <ExportCard
      icon={ClipboardList} title="Stock Receipts" color="bg-rose-500"
      description="History of all stock received — supplier deliveries, quantities, costs"
      extra={
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[10px]">From</Label><Input type="date" className="h-7 text-xs" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><Label className="text-[10px]">To</Label><Input type="date" className="h-7 text-xs" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </div>
      }
      onExportCSV={async () => { downloadCSV(`StockReceipts_${start}_${end}.csv`, headers, await fetch()); toast.success('Stock receipts exported'); }}
      onExportXLSX={async () => { downloadXLSX(`StockReceipts_${start}_${end}.xlsx`, [{ name: 'Receipts', rows: [headers, ...await fetch()] }]); toast.success('Stock receipts exported'); }}
    />
  );
}

function BookingsExport() {
  const [start, setStart] = useState(new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  const [end, setEnd] = useState(today());

  const headers = ['Booking #', 'Guest Name', 'Phone', 'Room', 'Check In', 'Check Out', 'Guests', 'Status', 'Total (KES)', 'Paid (KES)', 'Created'];

  const fetch = async () => {
    const res = await api.get('/bookings', { params: { start_date: start, end_date: end, limit: 5000 } });
    const rows: any[] = res.data?.bookings || res.data || [];
    return rows.map(b => [b.booking_number || b.id?.slice(0, 8), b.guest_name, b.phone || '', b.room_number || b.room_id || '', b.check_in_date, b.check_out_date, b.number_of_guests ?? '', b.status, b.total_amount ?? '', b.paid_amount ?? '', (b.created_at || '').slice(0, 10)]);
  };

  return (
    <ExportCard
      icon={CalendarDays} title="Bookings / Reservations" color="bg-cyan-500"
      description="Room booking records — guests, dates, amounts, status"
      extra={
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[10px]">From</Label><Input type="date" className="h-7 text-xs" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><Label className="text-[10px]">To</Label><Input type="date" className="h-7 text-xs" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </div>
      }
      onExportCSV={async () => { downloadCSV(`Bookings_${start}_${end}.csv`, headers, await fetch()); toast.success('Bookings exported'); }}
      onExportXLSX={async () => { downloadXLSX(`Bookings_${start}_${end}.xlsx`, [{ name: 'Bookings', rows: [headers, ...await fetch()] }]); toast.success('Bookings exported'); }}
    />
  );
}

function OrdersExport() {
  const [start, setStart] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [end, setEnd] = useState(today());

  const headers = ['Order #', 'Table', 'Status', 'Total (KES)', 'Payment', 'Waiter', 'Created'];

  const fetch = async () => {
    const res = await api.get('/orders', { params: { start_date: start, end_date: end, limit: 5000 } });
    const rows: any[] = res.data?.orders || res.data || [];
    return rows.map(o => [o.order_number || o.id?.slice(0, 8), o.table_number || o.table_id || '', o.status, o.total_amount ?? '', o.payment_method || '', o.waiter_name || o.assigned_waiter_id || '', (o.created_at || '').slice(0, 10)]);
  };

  return (
    <ExportCard
      icon={ClipboardList} title="F&B Orders" color="bg-orange-500"
      description="Food & beverage order history — table orders, totals, payment"
      extra={
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[10px]">From</Label><Input type="date" className="h-7 text-xs" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><Label className="text-[10px]">To</Label><Input type="date" className="h-7 text-xs" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </div>
      }
      onExportCSV={async () => { downloadCSV(`Orders_${start}_${end}.csv`, headers, await fetch()); toast.success('Orders exported'); }}
      onExportXLSX={async () => { downloadXLSX(`Orders_${start}_${end}.xlsx`, [{ name: 'Orders', rows: [headers, ...await fetch()] }]); toast.success('Orders exported'); }}
    />
  );
}

function ExportAll() {
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState(new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  const [end, setEnd] = useState(today());

  const exportAll = async () => {
    setLoading(true);
    try {
      const [menuRes, roomsRes, staffRes, custRes, invRes] = await Promise.allSettled([
        api.get('/menu/items'),
        api.get('/rooms/'),
        api.get('/staff'),
        api.get('/customers/search', { params: { q: '', limit: 5000 } }),
        api.get('/inventory/items'),
      ]);

      const menu = menuRes.status === 'fulfilled' ? menuRes.value.data || [] : [];
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value.data || [] : [];
      const staff = staffRes.status === 'fulfilled' ? (staffRes.value.data?.staff || staffRes.value.data || []) : [];
      const customers = custRes.status === 'fulfilled' ? (custRes.value.data?.customers || custRes.value.data || []) : [];
      const inventory = invRes.status === 'fulfilled' ? invRes.value.data || [] : [];

      downloadXLSX(`PremierHotel_FullExport_${today()}.xlsx`, [
        {
          name: 'Menu Items',
          rows: [
            ['Name', 'Category', 'Price (KES)', 'Available', 'Track Stock', 'Stock Qty', 'Unit', 'Cost Price', 'Description'],
            ...menu.map((i: any) => [i.name, i.category, i.base_price, i.is_available ? 'Yes' : 'No', i.track_inventory ? 'Yes' : 'No', i.stock_quantity ?? 0, i.unit || 'piece', i.cost_price ?? 0, i.description || '']),
          ],
        },
        {
          name: 'Rooms',
          rows: [
            ['Room Number', 'Type', 'Floor', 'Status', 'Capacity', 'Base Price (KES)', 'Description'],
            ...rooms.map((r: any) => [r.room_number, r.type, r.floor ?? '', r.status, r.capacity ?? '', r.base_price, r.description || '']),
          ],
        },
        {
          name: 'Staff',
          rows: [
            ['Full Name', 'Email', 'Phone', 'Role', 'Department', 'Status', 'Hire Date'],
            ...staff.map((s: any) => [s.full_name, s.email, s.phone || '', s.role, s.department || '', s.status, s.hire_date || '']),
          ],
        },
        {
          name: 'Customers',
          rows: [
            ['Full Name', 'Email', 'Phone', 'Nationality', 'Total Visits', 'Total Spent (KES)'],
            ...customers.map((c: any) => [c.full_name, c.email, c.phone || '', c.nationality || '', c.total_visits ?? '', c.total_spent ?? '']),
          ],
        },
        {
          name: 'Inventory',
          rows: [
            ['Name', 'SKU', 'Unit', 'Qty in Stock', 'Min Qty', 'Unit Cost (KES)', 'Location'],
            ...inventory.map((i: any) => [i.name, i.sku || '', i.unit, i.quantity ?? 0, i.min_quantity ?? 0, i.unit_cost ?? 0, i.location || '']),
          ],
        },
      ]);
      toast.success('Full system export downloaded — check your downloads folder');
    } catch (e: any) {
      toast.error('Export failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Download className="h-4 w-4 text-indigo-600" />Full System Export
        </CardTitle>
        <CardDescription className="text-xs">
          Export everything in one Excel file with separate sheets — ready to import into any system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[10px]">Date From (for orders/bookings)</Label><Input type="date" className="h-7 text-xs" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><Label className="text-[10px]">Date To</Label><Input type="date" className="h-7 text-xs" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </div>
        <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={exportAll} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          {loading ? 'Preparing export...' : 'Export All Data (Excel)'}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Includes: Menu · Rooms · Staff · Customers · Inventory — all in one file
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main export page ─────────────────────────────────────────────────────────
export function DataExportCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Data Export Center</h3>
        <p className="text-sm text-muted-foreground">
          Export any data to CSV or Excel — use it to migrate to another system, share with
          accountants, or keep an offline backup. Both formats import directly into Excel, Google Sheets, or any POS system.
        </p>
      </div>

      {/* Full export at the top */}
      <ExportAll />

      {/* Individual exports */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Export by Category</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MenuExport />
          <RoomsExport />
          <StaffExport />
          <CustomersExport />
          <InventoryExport />
          <StockReceiptsExport />
          <BookingsExport />
          <OrdersExport />
        </div>
      </div>
    </div>
  );
}
