/**
 * Batch Operations Component
 * Allows bulk stock adjustments, transfers, and updates
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, Plus, Minus, ArrowRightLeft, Trash2, Upload, Download, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { inventoryService, type InventoryItem } from '@/lib/api/inventory';

interface BatchOperationsProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onComplete: () => void;
}

type OperationType = 'add' | 'remove' | 'adjust' | 'transfer' | 'delete';

interface BatchItem {
  item: InventoryItem;
  selected: boolean;
  quantity?: number;
  targetLocation?: string;
  notes?: string;
}

export function BatchOperations({ isOpen, onClose, items, onComplete }: BatchOperationsProps) {
  const [operationType, setOperationType] = useState<OperationType>('add');
  const [batchItems, setBatchItems] = useState<BatchItem[]>(
    items.map(item => ({ item, selected: false }))
  );
  const [globalQuantity, setGlobalQuantity] = useState('');
  const [globalLocation, setGlobalLocation] = useState('');
  const [globalNotes, setGlobalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedItems = batchItems.filter(bi => bi.selected);
  const selectedCount = selectedItems.length;

  const toggleItemSelection = (itemId: string) => {
    setBatchItems(prev =>
      prev.map(bi =>
        bi.item.id === itemId ? { ...bi, selected: !bi.selected } : bi
      )
    );
  };

  const toggleSelectAll = () => {
    const allSelected = selectedCount === batchItems.length;
    setBatchItems(prev =>
      prev.map(bi => ({ ...bi, selected: !allSelected }))
    );
  };

  const updateItemQuantity = (itemId: string, quantity: string) => {
    setBatchItems(prev =>
      prev.map(bi =>
        bi.item.id === itemId ? { ...bi, quantity: parseFloat(quantity) || 0 } : bi
      )
    );
  };

  const updateItemLocation = (itemId: string, location: string) => {
    setBatchItems(prev =>
      prev.map(bi =>
        bi.item.id === itemId ? { ...bi, targetLocation: location } : bi
      )
    );
  };

  const applyGlobalQuantity = () => {
    const qty = parseFloat(globalQuantity);
    if (isNaN(qty)) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setBatchItems(prev =>
      prev.map(bi =>
        bi.selected ? { ...bi, quantity: qty } : bi
      )
    );
    toast.success(`Applied ${qty} to ${selectedCount} items`);
  };

  const applyGlobalLocation = () => {
    if (!globalLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }

    setBatchItems(prev =>
      prev.map(bi =>
        bi.selected ? { ...bi, targetLocation: globalLocation } : bi
      )
    );
    toast.success(`Applied location to ${selectedCount} items`);
  };

  const handleProcess = async () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one item');
      return;
    }

    // Validate quantities for add/remove/adjust operations
    if (['add', 'remove', 'adjust'].includes(operationType)) {
      const invalidItems = selectedItems.filter(bi => !bi.quantity || bi.quantity <= 0);
      if (invalidItems.length > 0) {
        toast.error('Please set quantities for all selected items');
        return;
      }
    }

    // Validate locations for transfer operations
    if (operationType === 'transfer') {
      const invalidItems = selectedItems.filter(bi => !bi.targetLocation?.trim());
      if (invalidItems.length > 0) {
        toast.error('Please set target locations for all selected items');
        return;
      }
    }

    setIsProcessing(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const batchItem of selectedItems) {
        try {
          switch (operationType) {
            case 'add':
              await inventoryService.createMovement({
                item_id: batchItem.item.id,
                movement_type: 'in',
                quantity: batchItem.quantity!,
                notes: batchItem.notes || globalNotes
              });
              successCount++;
              break;

            case 'remove':
              await inventoryService.createMovement({
                item_id: batchItem.item.id,
                movement_type: 'out',
                quantity: batchItem.quantity!,
                notes: batchItem.notes || globalNotes
              });
              successCount++;
              break;

            case 'adjust':
              await inventoryService.createMovement({
                item_id: batchItem.item.id,
                movement_type: 'adjustment',
                quantity: batchItem.quantity!,
                notes: batchItem.notes || globalNotes
              });
              successCount++;
              break;

            case 'transfer':
              await inventoryService.createMovement({
                item_id: batchItem.item.id,
                movement_type: 'transfer',
                quantity: batchItem.quantity || batchItem.item.quantity,
                notes: `Transfer to ${batchItem.targetLocation}. ${batchItem.notes || globalNotes}`
              });
              successCount++;
              break;

            case 'delete':
              await inventoryService.deleteItem(batchItem.item.id);
              successCount++;
              break;
          }
        } catch (error) {
          console.error(`Failed to process ${batchItem.item.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} item${successCount > 1 ? 's' : ''}`);
        onComplete();
        handleClose();
      }

      if (failCount > 0) {
        toast.error(`Failed to process ${failCount} item${failCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Batch operation error:', error);
      toast.error('Failed to complete batch operation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setBatchItems(items.map(item => ({ item, selected: false })));
    setGlobalQuantity('');
    setGlobalLocation('');
    setGlobalNotes('');
    setOperationType('add');
    onClose();
  };

  const getOperationIcon = () => {
    switch (operationType) {
      case 'add': return <Plus className="h-4 w-4" />;
      case 'remove': return <Minus className="h-4 w-4" />;
      case 'adjust': return <Layers className="h-4 w-4" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
    }
  };

  const getOperationColor = () => {
    switch (operationType) {
      case 'add': return 'bg-green-100 text-green-800';
      case 'remove': return 'bg-red-100 text-red-800';
      case 'adjust': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'delete': return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Batch Operations
          </DialogTitle>
          <DialogDescription>
            Perform bulk operations on multiple inventory items simultaneously
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Operation Type Selector */}
          <div className="space-y-2">
            <Label>Operation Type</Label>
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant={operationType === 'add' ? 'default' : 'outline'}
                onClick={() => setOperationType('add')}
                className="flex-col h-auto py-3"
              >
                <Plus className="h-5 w-5 mb-1" />
                <span className="text-xs">Add Stock</span>
              </Button>
              <Button
                variant={operationType === 'remove' ? 'default' : 'outline'}
                onClick={() => setOperationType('remove')}
                className="flex-col h-auto py-3"
              >
                <Minus className="h-5 w-5 mb-1" />
                <span className="text-xs">Remove Stock</span>
              </Button>
              <Button
                variant={operationType === 'adjust' ? 'default' : 'outline'}
                onClick={() => setOperationType('adjust')}
                className="flex-col h-auto py-3"
              >
                <Layers className="h-5 w-5 mb-1" />
                <span className="text-xs">Adjust Stock</span>
              </Button>
              <Button
                variant={operationType === 'transfer' ? 'default' : 'outline'}
                onClick={() => setOperationType('transfer')}
                className="flex-col h-auto py-3"
              >
                <ArrowRightLeft className="h-5 w-5 mb-1" />
                <span className="text-xs">Transfer</span>
              </Button>
              <Button
                variant={operationType === 'delete' ? 'default' : 'outline'}
                onClick={() => setOperationType('delete')}
                className="flex-col h-auto py-3"
              >
                <Trash2 className="h-5 w-5 mb-1" />
                <span className="text-xs">Delete Items</span>
              </Button>
            </div>
          </div>

          {/* Global Controls */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Apply to All Selected</h4>
            <div className="grid grid-cols-3 gap-3">
              {['add', 'remove', 'adjust'].includes(operationType) && (
                <div className="space-y-2">
                  <Label className="text-xs">Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={globalQuantity}
                      onChange={(e) => setGlobalQuantity(e.target.value)}
                      placeholder="0"
                      step="0.1"
                    />
                    <Button size="sm" onClick={applyGlobalQuantity} variant="outline">
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              {operationType === 'transfer' && (
                <div className="space-y-2">
                  <Label className="text-xs">Target Location</Label>
                  <div className="flex gap-2">
                    <Input
                      value={globalLocation}
                      onChange={(e) => setGlobalLocation(e.target.value)}
                      placeholder="Location"
                    />
                    <Button size="sm" onClick={applyGlobalLocation} variant="outline">
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Notes (Optional)</Label>
                <Input
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  placeholder="Add notes..."
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCount === batchItems.length && batchItems.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Current Stock</TableHead>
                  {['add', 'remove', 'adjust'].includes(operationType) && (
                    <TableHead>Quantity</TableHead>
                  )}
                  {operationType === 'transfer' && (
                    <TableHead>Target Location</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchItems.map((batchItem) => (
                  <TableRow key={batchItem.item.id}>
                    <TableCell>
                      <Checkbox
                        checked={batchItem.selected}
                        onCheckedChange={() => toggleItemSelection(batchItem.item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batchItem.item.name}</div>
                        <div className="text-sm text-muted-foreground">{batchItem.item.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {batchItem.item.quantity} {batchItem.item.unit}
                      </Badge>
                    </TableCell>
                    {['add', 'remove', 'adjust'].includes(operationType) && (
                      <TableCell>
                        <Input
                          type="number"
                          value={batchItem.quantity || ''}
                          onChange={(e) => updateItemQuantity(batchItem.item.id, e.target.value)}
                          placeholder="0"
                          step="0.1"
                          className="w-24"
                          disabled={!batchItem.selected}
                        />
                      </TableCell>
                    )}
                    {operationType === 'transfer' && (
                      <TableCell>
                        <Input
                          value={batchItem.targetLocation || ''}
                          onChange={(e) => updateItemLocation(batchItem.item.id, e.target.value)}
                          placeholder="Location"
                          className="w-32"
                          disabled={!batchItem.selected}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {batchItem.selected ? (
                        <Badge className={getOperationColor()}>
                          {getOperationIcon()}
                          <span className="ml-1">{operationType}</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not selected</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <span className="text-sm text-blue-800">
                Ready to {operationType} {selectedCount} item{selectedCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleProcess} disabled={isProcessing || selectedCount === 0}>
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Process {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
