import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Plus, Minus, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
  category: string;
}

const initialInventory: InventoryItem[] = [
  { id: '1', name: 'Chicken Breast', quantity: 45, unit: 'kg', minStock: 20, category: 'Protein' },
  { id: '2', name: 'Tomatoes', quantity: 15, unit: 'kg', minStock: 25, category: 'Vegetables' },
  { id: '3', name: 'Lettuce', quantity: 8, unit: 'kg', minStock: 10, category: 'Vegetables' },
  { id: '4', name: 'Olive Oil', quantity: 12, unit: 'L', minStock: 5, category: 'Oils' },
  { id: '5', name: 'Rice', quantity: 80, unit: 'kg', minStock: 30, category: 'Grains' },
  { id: '6', name: 'Pasta', quantity: 35, unit: 'kg', minStock: 20, category: 'Grains' },
  { id: '7', name: 'Beef', quantity: 25, unit: 'kg', minStock: 15, category: 'Protein' },
  { id: '8', name: 'Onions', quantity: 6, unit: 'kg', minStock: 12, category: 'Vegetables' }
];

export function InventoryManager() {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('0');

  const lowStockItems = inventory.filter(item => item.quantity < item.minStock);

  const openAdjustDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustmentQty('0');
    setShowDialog(true);
  };

  const handleAdjustment = () => {
    if (!selectedItem) return;

    const adjustment = parseFloat(adjustmentQty);
    const newQuantity = selectedItem.quantity + adjustment;

    if (newQuantity < 0) {
      toast.error('Cannot reduce below zero');
      return;
    }

    setInventory(inventory.map(item =>
      item.id === selectedItem.id
        ? { ...item, quantity: newQuantity }
        : item
    ));

    toast.success(`Updated ${selectedItem.name} to ${newQuantity} ${selectedItem.unit}`);
    setShowDialog(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-red-500 border-2 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Warning
              </CardTitle>
              <CardDescription className="text-red-600">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below minimum stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="destructive">
                      {item.quantity} {item.unit} (min: {item.minStock})
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inventory.map(item => (
            <Card key={item.id} className={item.quantity < item.minStock ? 'border-orange-300' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{item.category}</CardDescription>
                  </div>
                  <Package className={`h-5 w-5 ${item.quantity < item.minStock ? 'text-orange-500' : 'text-muted-foreground'}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{item.quantity}</span>
                    <span className="text-muted-foreground">{item.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min stock: {item.minStock} {item.unit}
                  </p>
                </div>

                <Button
                  onClick={() => openAdjustDialog(item)}
                  className="w-full h-12 text-base font-semibold"
                  variant={item.quantity < item.minStock ? 'default' : 'outline'}
                >
                  <Package className="h-5 w-5 mr-2" />
                  Adjust Stock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory: {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {selectedItem?.quantity} {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment Amount ({selectedItem?.unit})</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setAdjustmentQty((parseFloat(adjustmentQty) - 1).toString())}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="text-center text-xl h-12 font-semibold"
                  step="0.1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setAdjustmentQty((parseFloat(adjustmentQty) + 1).toString())}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Positive values add stock, negative values reduce stock
              </p>
            </div>

            {selectedItem && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">New quantity will be:</p>
                <p className="text-2xl font-bold mt-1">
                  {(selectedItem.quantity + parseFloat(adjustmentQty || '0')).toFixed(1)} {selectedItem.unit}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="h-12 text-base">
              Cancel
            </Button>
            <Button onClick={handleAdjustment} className="h-12 text-base font-semibold">
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
