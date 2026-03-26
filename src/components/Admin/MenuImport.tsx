import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import menuService from '@/lib/api/services/menuService';
import { api } from '@/lib/api/client';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export default function MenuImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast.error('Please select a CSV or Excel file');
      }
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const items: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields that may contain commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of lines[i]) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += char; }
      }
      values.push(current.trim());

      const item: any = {};

      headers.forEach((header, index) => {
        const value = (values[index] || '').replace(/^"|"$/g, '');

        switch (header) {
          case 'name':
            item.name = value;
            break;
          case 'name_sw':
          case 'swahili name':
          case 'swahili_name':
            item.name_sw = value;
            break;
          case 'description':
            item.description = value;
            break;
          case 'description_sw':
          case 'swahili description':
          case 'swahili_description':
            item.description_sw = value;
            break;
          case 'category':
            item.category = value.toLowerCase();
            break;
          case 'price':
          case 'base_price':
          case 'price_kes':
            item.base_price = parseFloat(value) || 0;
            break;
          case 'image_url':
          case 'image':
            item.image_url = value;
            break;
          case 'preparation_time':
          case 'prep_time':
            item.preparation_time = parseInt(value) || 0;
            break;
          case 'available':
          case 'is_available':
            item.available = value.toLowerCase() === 'true' || value === '1';
            break;
          case 'dietary_info':
          case 'dietary':
            item.dietary_info = value ? value.split(';').map(d => d.trim()) : [];
            break;
          // ── Stock fields ────────────────────────────────────────────────
          case 'quantity':
          case 'stock_quantity':
          case 'initial_quantity':
          case 'opening_stock':
            item._stock_quantity = parseFloat(value) || 0;
            break;
          case 'track_inventory':
          case 'tracked':
          case 'track':
            item._track_inventory = value.toLowerCase() === 'true' || value === '1' || value === 'yes';
            break;
          case 'unit':
            item._unit = value || 'piece';
            break;
          case 'reorder_level':
          case 'reorder':
          case 'min_stock':
            item._reorder_level = parseFloat(value) || 0;
            break;
          case 'cost_price':
          case 'cost':
            item._cost_price = parseFloat(value) || 0;
            break;
          case 'stock_department':
          case 'department':
            item._stock_department = value.toLowerCase() || 'kitchen';
            break;
        }
      });

      // Auto-enable tracking if a quantity or unit was specified
      if (item._stock_quantity > 0 || item._unit) {
        item._track_inventory = item._track_inventory ?? true;
      }

      // Validate required fields — base_price can be 0 for pure stock/ingredient items
      if (item.name && item.base_price !== undefined && item.base_price !== null) {
        items.push(item);
      }
    }

    return items;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const text = await file.text();
      const items = parseCSV(text);

      if (items.length === 0) {
        throw new Error('No valid items found in file');
      }

      toast.success(`Parsed ${items.length} items. Starting import...`);

      const importResult: ImportResult = {
        success: 0,
        failed: 0,
        errors: []
      };

      // Import items one by one with progress tracking
      for (let i = 0; i < items.length; i++) {
        try {
          // Strip private stock fields before sending to menu create endpoint
          const { _track_inventory, _stock_quantity, _unit, _reorder_level, _cost_price, _stock_department, ...menuPayload } = items[i];

          let createdId: string | undefined;

          if (!menuPayload.base_price || menuPayload.base_price <= 0) {
            // Pure stock/ingredient item — use the dedicated stock items endpoint
            const stockRes: any = await api.post('/stock/items', {
              name: menuPayload.name,
              category: menuPayload.category || 'ingredients',
              unit: _unit || 'piece',
              reorder_level: _reorder_level || 0,
              cost_price: _cost_price || 0,
              stock_department: _stock_department || 'kitchen',
              initial_quantity: _stock_quantity || 0,
            });
            createdId = stockRes?.data?.item?.id;
          } else {
            const created: any = await menuService.createMenuItem(menuPayload);
            createdId = created?.id || created?.data?.id;

            // Apply stock settings if tracking was requested
            if (createdId && (_track_inventory || _stock_quantity > 0)) {
              try {
                await api.patch(`/stock/settings/${createdId}`, {
                  track_inventory: true,
                  unit: _unit || 'piece',
                  reorder_level: _reorder_level || 0,
                  cost_price: _cost_price || 0,
                  stock_department: _stock_department || 'kitchen',
                });

                // Set initial stock quantity
                if (_stock_quantity > 0) {
                  await api.post('/stock/adjust', {
                    menu_item_id: createdId,
                    new_quantity: _stock_quantity,
                    reason: 'Opening stock from CSV import',
                  });
                }
              } catch {
                // Non-fatal: item was created, only stock settings failed
              }
            }
          }

          importResult.success++;
        } catch (error: any) {
          importResult.failed++;
          importResult.errors.push({
            row: i + 2, // +2 because row 1 is headers and arrays are 0-indexed
            error: error.response?.data?.detail || error.message || 'Unknown error'
          });
        }

        setProgress(Math.round(((i + 1) / items.length) * 100));
      }

      setResult(importResult);

      if (importResult.success > 0) {
        toast.success(`Successfully imported ${importResult.success} menu items!`);
      }

      if (importResult.failed > 0) {
        toast.error(`Failed to import ${importResult.failed} items. Check details below.`);
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import menu items');
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = `name,name_sw,description,category,base_price,preparation_time,available,dietary_info,track_inventory,quantity,unit,reorder_level,cost_price,stock_department
Grilled Salmon,Samaki wa Kuchoma,Fresh Atlantic salmon,mains,1200,25,true,gluten-free,false,0,piece,0,0,kitchen
Caesar Salad,Saladi ya Caesar,Crisp romaine lettuce,starters,650,10,true,vegetarian,false,0,piece,0,0,kitchen
Soda (Coke 300ml),,,beverages,150,0,true,,true,100,piece,10,80,bar
Water (500ml),,,beverages,50,0,true,,true,200,piece,20,30,bar
Chicken Breast (raw),,Ingredient - not on menu,mains,0,0,false,,true,5,kg,1,800,kitchen`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Template downloaded successfully');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Menu Items
        </CardTitle>
        <CardDescription>
          Bulk import menu items from CSV or Excel files. Similar to QuickBooks inventory import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download Template */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <h4 className="font-medium">Download CSV Template</h4>
            <p className="text-sm text-muted-foreground">
              Get a sample file with the correct format
            </p>
          </div>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex-1 flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">
                  {file ? file.name : 'Click to select CSV or Excel file'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Supports .csv, .xlsx, .xls'}
                </p>
              </div>
            </label>
            {file && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full"
            size="lg"
          >
            {importing ? (
              <>Importing...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Menu Items
              </>
            )}
          </Button>
        </div>

        {/* Progress */}
        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Importing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>{result.success}</strong> items imported successfully
                </AlertDescription>
              </Alert>

              {result.failed > 0 && (
                <Alert className="border-red-500 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>{result.failed}</strong> items failed
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Error Details */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Error Details:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {result.errors.map((error, index) => (
                    <Alert key={index} variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        <strong>Row {error.row}:</strong> {error.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            CSV Format Instructions
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground ml-6 list-disc">
            <li><strong>Required columns:</strong> name, base_price (use 0 for pure stock items not on the menu)</li>
            <li><strong>Optional columns:</strong> name_sw, description, category, image_url, preparation_time, available, dietary_info</li>
            <li><strong>Stock columns:</strong> track_inventory (true/false), quantity (opening stock), unit (piece/kg/L/bottle…), reorder_level, cost_price, stock_department (kitchen/bar/both)</li>
            <li><strong>Categories:</strong> starters, mains, desserts, beverages, drinks, appetizers, breakfast, snacks</li>
            <li><strong>Available:</strong> Use true/false or 1/0</li>
            <li><strong>Dietary info:</strong> Separate multiple values with semicolon (e.g., "vegetarian;gluten-free")</li>
            <li><strong>Tip:</strong> If you set a quantity or unit, track_inventory will be enabled automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
