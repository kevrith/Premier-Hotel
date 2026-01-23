/**
 * Historical Stock Viewer Component
 * Allows viewing inventory stock levels as of any historical date
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  inventoryService,
  HistoricalStockResponse,
  HistoricalStockItem,
  InventoryCategory,
} from '@/lib/api/inventory';
import {
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const HistoricalStockViewer: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [data, setData] = useState<HistoricalStockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await inventoryService.getCategories(true);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch historical stock data
  const fetchHistoricalStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryService.getHistoricalStock({
        as_of_date: selectedDate,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setData(response);
    } catch (err: any) {
      console.error('Failed to fetch historical stock:', err);
      setError(err.response?.data?.detail || 'Failed to load historical stock data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on date/category change
  useEffect(() => {
    fetchHistoricalStock();
  }, [selectedDate, selectedCategory]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;

    const query = searchQuery.toLowerCase();
    return data.items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category_name.toLowerCase().includes(query)
    );
  }, [data?.items, searchQuery]);

  // Get trend icon based on quantity change
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!data?.items) return;

    const headers = [
      'SKU',
      'Name',
      'Category',
      'Unit',
      'Historical Qty',
      'Current Qty',
      'Change',
      'Unit Cost',
      'Historical Value',
    ];

    const rows = data.items.map((item) => [
      item.sku,
      item.name,
      item.category_name,
      item.unit,
      item.historical_quantity,
      item.current_quantity,
      item.quantity_change,
      item.unit_cost,
      item.historical_value,
    ]);

    const csvContent = [
      `Historical Stock Report - As of ${selectedDate}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `Total Historical Value: ${formatCurrency(data.summary.total_historical_value)}`,
      `Total Current Value: ${formatCurrency(data.summary.total_current_value)}`,
      `Value Change: ${formatCurrency(data.summary.value_change)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historical-stock-${selectedDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historical Stock Viewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">As of Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-48"
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchHistoricalStock}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportToCSV} disabled={!data}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{data.summary.total_items}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Historical Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.summary.total_historical_value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.summary.total_current_value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {data.summary.value_change >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Value Change</p>
                  <p
                    className={`text-2xl font-bold ${
                      data.summary.value_change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {data.summary.value_change >= 0 ? '+' : ''}
                    {formatCurrency(data.summary.value_change)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Stock Levels as of {new Date(selectedDate).toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No inventory items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Historical Qty</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-center">Change</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Historical Value</TableHead>
                    <TableHead className="text-center">Movements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: HistoricalStockItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category_name}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.historical_quantity.toFixed(2)} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.current_quantity.toFixed(2)} {item.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getTrendIcon(item.quantity_change)}
                          <span
                            className={
                              item.quantity_change > 0
                                ? 'text-green-600'
                                : item.quantity_change < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }
                          >
                            {item.quantity_change > 0 ? '+' : ''}
                            {item.quantity_change.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.historical_value)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.movements_since > 0 ? (
                          <Badge variant="secondary">{item.movements_since}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalStockViewer;
