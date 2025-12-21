import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import menuService from '@/lib/api/services/menuService';

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
      const values = lines[i].split(',').map(v => v.trim());
      const item: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';

        // Map CSV headers to database fields
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
        }
      });

      // Validate required fields
      if (item.name && item.base_price) {
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
          await menuService.createMenuItem(items[i]);
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
    const template = `name,name_sw,description,description_sw,category,base_price,image_url,preparation_time,available,dietary_info
Grilled Salmon,Samaki wa Kuchoma,Fresh Atlantic salmon with herbs and lemon butter,Samaki safi wa Atlantic na viungo,mains,1200,https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=400,25,true,gluten-free
Caesar Salad,Saladi ya Caesar,Crisp romaine lettuce with Caesar dressing,Saladi ya kawaida,starters,650,https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400,10,true,vegetarian
Margherita Pizza,Pizza ya Margherita,Classic pizza with fresh mozzarella and basil,Pizza ya kawaida na jibini safi,mains,950,https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400,20,true,vegetarian
Chocolate Lava Cake,Keki ya Chokoleti,Warm chocolate cake with molten center,Keki ya moto ya chokoleti,desserts,550,https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400,15,true,vegetarian
Mango Smoothie,Smoothie ya Embe,Fresh mango blended with yogurt and honey,Embe safi na yogati,beverages,450,https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400,5,true,vegetarian;gluten-free`;

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
            <li><strong>Required columns:</strong> name, base_price</li>
            <li><strong>Optional columns:</strong> name_sw, description, description_sw, category, image_url, preparation_time, available, dietary_info</li>
            <li><strong>Categories:</strong> starters, mains, desserts, beverages, appetizers</li>
            <li><strong>Available:</strong> Use true/false or 1/0</li>
            <li><strong>Dietary info:</strong> Separate multiple values with semicolon (e.g., "vegetarian;gluten-free")</li>
            <li><strong>Price:</strong> Enter numeric values without currency symbols</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
