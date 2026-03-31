// @ts-nocheck
/**
 * Import Center — bulk CSV/Excel import for Rooms, Staff, Customers,
 * Inventory Items, and Menu Items (for migration from other systems).
 */
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle,
  X, BedDouble, Users, ShoppingCart, Package, Coffee
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('File must have a header row and at least one data row');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    // Basic CSV parser that handles quoted fields
    const values: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

function csvBlob(content: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Generic import widget ────────────────────────────────────────────────────
interface ImportConfig {
  title: string;
  description: string;
  icon: React.ElementType;
  templateHeaders: string;
  templateRows: string;
  templateFile: string;
  requiredFields: string[];
  instructions: string[];
  parseRow: (row: Record<string, string>) => Record<string, unknown> | null;
  apiCall: (data: Record<string, unknown>) => Promise<unknown>;
  rowLabel: (row: Record<string, string>) => string;
}

function ImportWidget({ cfg }: { cfg: ImportConfig }) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const Icon = cfg.icon;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
      setFile(f); setResult(null);
    } else {
      toast.error('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
    }
  };

  const handleImport = async () => {
    if (!file) return toast.error('Select a file first');
    setImporting(true); setProgress(0);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) throw new Error('No data rows found');

      const res: ImportResult = { success: 0, failed: 0, errors: [] };
      for (let i = 0; i < rows.length; i++) {
        const label = cfg.rowLabel(rows[i]) || `Row ${i + 2}`;
        try {
          const data = cfg.parseRow(rows[i]);
          if (!data) { res.failed++; res.errors.push({ row: i + 2, name: label, error: 'Missing required fields' }); }
          else { await cfg.apiCall(data); res.success++; }
        } catch (err: any) {
          res.failed++;
          res.errors.push({ row: i + 2, name: label, error: err?.response?.data?.detail || err?.message || 'Unknown error' });
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }
      setResult(res);
      if (res.success > 0) toast.success(`Imported ${res.success} ${cfg.title.toLowerCase()} successfully`);
      if (res.failed > 0) toast.error(`${res.failed} rows failed — see details below`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false); setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />{cfg.title}
        </CardTitle>
        <CardDescription className="text-xs">{cfg.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
          <div>
            <p className="text-sm font-medium">Download CSV Template</p>
            <p className="text-xs text-muted-foreground">Fill in this template then upload it below</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { csvBlob(cfg.templateHeaders + '\n' + cfg.templateRows); toast.success('Template downloaded'); }}>
            <Download className="h-3.5 w-3.5 mr-1" />Template
          </Button>
        </div>

        {/* Upload zone */}
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" id={`file-${cfg.templateFile}`} />
          <label htmlFor={`file-${cfg.templateFile}`}
            className="flex-1 flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">{file ? file.name : 'Click to select CSV or Excel file'}</p>
              <p className="text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(1)} KB` : '.csv, .xlsx, .xls'}</p>
            </div>
          </label>
          {file && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}><X className="h-4 w-4" /></Button>}
        </div>

        <Button onClick={handleImport} disabled={!file || importing} className="w-full">
          {importing ? `Importing... ${progress}%` : <><Upload className="h-4 w-4 mr-2" />Import {cfg.title}</>}
        </Button>

        {importing && <Progress value={progress} />}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Alert className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 py-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                  <strong>{result.success}</strong> imported successfully
                </AlertDescription>
              </Alert>
              {result.failed > 0 && (
                <Alert className="border-rose-400 bg-rose-50 dark:bg-rose-950/20 py-2">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <AlertDescription className="text-rose-800 dark:text-rose-300">
                    <strong>{result.failed}</strong> rows failed
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <Alert key={i} variant="destructive" className="py-1.5">
                    <AlertDescription className="text-xs">
                      <strong>Row {e.row} ({e.name}):</strong> {e.error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Column guide</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ml-4">
            <li><strong>Required:</strong> {cfg.requiredFields.join(', ')}</li>
            {cfg.instructions.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Config per import type ───────────────────────────────────────────────────

const roomsConfig: ImportConfig = {
  title: 'Rooms',
  description: 'Bulk import hotel rooms from your previous system',
  icon: BedDouble,
  templateFile: 'rooms',
  templateHeaders: 'room_number,type,floor,base_price,capacity,status,description',
  templateRows: [
    '101,standard,1,5000,2,available,Standard room with garden view',
    '201,deluxe,2,8000,2,available,Deluxe room with pool view',
    '301,suite,3,15000,4,available,Executive suite with balcony',
  ].join('\n'),
  requiredFields: ['room_number', 'type', 'base_price'],
  instructions: [
    'type: standard, deluxe, suite, single, double, twin, family, penthouse',
    'status: available, occupied, dirty, under_maintenance (default: available)',
    'base_price: numeric, no currency symbol (KES)',
    'floor & capacity: whole numbers',
  ],
  rowLabel: r => r.room_number || '',
  parseRow: r => {
    if (!r.room_number || !r.type || !r.base_price) return null;
    return {
      room_number: r.room_number,
      type: r.type.toLowerCase(),
      floor: r.floor ? parseInt(r.floor) : 1,
      base_price: parseFloat(r.base_price),
      capacity: r.capacity ? parseInt(r.capacity) : 2,
      status: r.status || 'available',
      description: r.description || '',
    };
  },
  apiCall: data => api.post('/rooms/', data),
};

const staffConfig: ImportConfig = {
  title: 'Staff / Users',
  description: 'Import staff members — waiters, chefs, cleaners, managers',
  icon: Users,
  templateFile: 'staff',
  templateHeaders: 'full_name,email,phone,role,department,hire_date,salary',
  templateRows: [
    'John Kamau,john.kamau@hotel.com,+254700000001,waiter,F&B,2024-01-15,25000',
    'Mary Wanjiku,mary.w@hotel.com,+254700000002,chef,Kitchen,2024-02-01,35000',
    'Peter Otieno,p.otieno@hotel.com,+254700000003,cleaner,Housekeeping,2024-03-10,20000',
  ].join('\n'),
  requiredFields: ['full_name', 'email', 'role'],
  instructions: [
    'role: waiter, chef, cleaner, manager, receptionist, security',
    'email must be unique — duplicates will fail',
    'phone: include country code e.g. +254...',
    'hire_date: YYYY-MM-DD format',
    'salary: numeric (KES per month)',
  ],
  rowLabel: r => r.full_name || r.email || '',
  parseRow: r => {
    if (!r.full_name || !r.email || !r.role) return null;
    return {
      full_name: r.full_name,
      email: r.email.toLowerCase(),
      phone: r.phone || '',
      role: r.role.toLowerCase(),
      department: r.department || '',
      hire_date: r.hire_date || null,
      salary: r.salary ? parseFloat(r.salary) : null,
      status: 'active',
    };
  },
  apiCall: data => api.post('/staff', data),
};

const customersConfig: ImportConfig = {
  title: 'Customers / Guests',
  description: 'Import your existing guest database — loyalty members, frequent visitors',
  icon: ShoppingCart,
  templateFile: 'customers',
  templateHeaders: 'full_name,email,phone,nationality,notes',
  templateRows: [
    'Alice Mwangi,alice.m@email.com,+254711000001,Kenyan,VIP regular guest',
    'Bob Smith,bob.smith@email.com,+254722000002,British,Corporate account',
    'Grace Achieng,grace.a@email.com,+254733000003,Kenyan,',
  ].join('\n'),
  requiredFields: ['full_name', 'email'],
  instructions: [
    'email must be unique per customer',
    'phone: any format accepted',
    'nationality: country name or code',
    'If customer already exists (by email), their record will be updated',
  ],
  rowLabel: r => r.full_name || r.email || '',
  parseRow: r => {
    if (!r.full_name || !r.email) return null;
    return {
      full_name: r.full_name,
      email: r.email.toLowerCase(),
      phone: r.phone || '',
      nationality: r.nationality || '',
      notes: r.notes || '',
    };
  },
  apiCall: data => api.post('/customers/upsert', data),
};

const inventoryConfig: ImportConfig = {
  title: 'Inventory Items',
  description: 'Import raw materials and supplies — kitchen ingredients, cleaning products, etc.',
  icon: Package,
  templateFile: 'inventory',
  templateHeaders: 'name,sku,category,unit,quantity,min_quantity,unit_cost,supplier,location',
  templateRows: [
    'Cooking Oil,OIL001,Kitchen,litres,20,5,250,Bidco,Dry Store',
    'Tissue Paper,TIS001,Housekeeping,rolls,100,20,15,Softcare,Store Room',
    'Flour,FLR001,Kitchen,kg,50,10,80,Unga Ltd,Dry Store',
  ].join('\n'),
  requiredFields: ['name', 'unit'],
  instructions: [
    'sku: unique product code — auto-generated if left blank',
    'unit: pieces, kg, litres, boxes, rolls, bottles, cartons',
    'quantity & min_quantity: numeric (current stock & reorder level)',
    'unit_cost: cost per unit in KES',
    'category: Kitchen, Housekeeping, Bar, Maintenance, etc.',
  ],
  rowLabel: r => r.name || r.sku || '',
  parseRow: r => {
    if (!r.name || !r.unit) return null;
    return {
      name: r.name,
      sku: r.sku || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      unit: r.unit,
      quantity: r.quantity ? parseFloat(r.quantity) : 0,
      min_quantity: r.min_quantity ? parseFloat(r.min_quantity) : 0,
      unit_cost: r.unit_cost ? parseFloat(r.unit_cost) : 0,
      location: r.location || '',
      is_active: true,
    };
  },
  apiCall: data => api.post('/inventory/items', data),
};

const menuConfig: ImportConfig = {
  title: 'Menu Items',
  description: 'Import F&B menu — food, drinks, beverages from your previous POS or menu card',
  icon: Coffee,
  templateFile: 'menu',
  templateHeaders: 'name,category,base_price,description,preparation_time,available,unit,stock_quantity',
  templateRows: [
    'Water 500ml,drinks,50,Chilled mineral water,,true,bottle,0',
    'Soda (Coke),drinks,80,Chilled Coca-Cola,,true,bottle,0',
    'Grilled Chicken,mains,850,Whole grilled chicken with chips,30,true,,',
    'Tusker Beer,drinks,200,Cold Tusker lager,,true,bottle,0',
  ].join('\n'),
  requiredFields: ['name', 'base_price'],
  instructions: [
    'category: drinks, mains, starters, desserts, breakfast, appetizers',
    'base_price: numeric, KES (no symbol)',
    'available: true or false (default: true)',
    'unit: bottle, piece, glass, plate — for items you want to track stock',
    'stock_quantity: starting stock count — items with qty > 0 are auto-tracked',
  ],
  rowLabel: r => r.name || '',
  parseRow: r => {
    if (!r.name || !r.base_price) return null;
    const qty = r.stock_quantity ? parseFloat(r.stock_quantity) : 0;
    return {
      name: r.name,
      category: (r.category || 'mains').toLowerCase(),
      base_price: parseFloat(r.base_price),
      description: r.description || '',
      preparation_time: r.preparation_time ? parseInt(r.preparation_time) : 0,
      is_available: r.available?.toLowerCase() !== 'false',
      unit: r.unit || 'piece',
      stock_quantity: qty,
      track_inventory: qty > 0,
    };
  },
  apiCall: data => api.post('/menu/items', data),
};

// ─── Main component ───────────────────────────────────────────────────────────
export function ImportCenter() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Data Import Center</h3>
        <p className="text-sm text-muted-foreground">
          Migrate from another system — download the CSV template, fill it in, then upload to import in bulk.
          All imports are non-destructive (existing records are not deleted).
        </p>
      </div>

      <Tabs defaultValue="menu">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="menu" className="text-xs gap-1"><Coffee className="h-3.5 w-3.5" />Menu</TabsTrigger>
          <TabsTrigger value="rooms" className="text-xs gap-1"><BedDouble className="h-3.5 w-3.5" />Rooms</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs gap-1"><Users className="h-3.5 w-3.5" />Staff</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs gap-1"><ShoppingCart className="h-3.5 w-3.5" />Customers</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs gap-1"><Package className="h-3.5 w-3.5" />Inventory</TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="mt-4"><ImportWidget cfg={menuConfig} /></TabsContent>
        <TabsContent value="rooms" className="mt-4"><ImportWidget cfg={roomsConfig} /></TabsContent>
        <TabsContent value="staff" className="mt-4"><ImportWidget cfg={staffConfig} /></TabsContent>
        <TabsContent value="customers" className="mt-4"><ImportWidget cfg={customersConfig} /></TabsContent>
        <TabsContent value="inventory" className="mt-4"><ImportWidget cfg={inventoryConfig} /></TabsContent>
      </Tabs>
    </div>
  );
}
