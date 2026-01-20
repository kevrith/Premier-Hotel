/**
 * Lost and Found Management Component
 * Track and manage lost items found in hotel rooms
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Package,
  Search,
  Plus,
  Camera,
  MapPin,
  User,
  Calendar,
  Phone,
  Mail,
  Check,
  X,
  Archive,
  Gift,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { housekeepingService } from '@/lib/api/housekeeping';

interface LostItem {
  id: string;
  item_type: string;
  description: string;
  found_location: string;
  found_date: string;
  found_by: string;
  storage_location: string;
  status: 'unclaimed' | 'claimed' | 'disposed' | 'donated';
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  room_number?: string;
  photos?: string[];
  value_estimate?: string;
  claimed_date?: string;
  claimed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function LostAndFound() {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<LostItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LostItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [viewMode, setViewMode] = useState<'new' | 'view' | 'edit'>('new');

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, statusFilter]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await housekeepingService.getLostItems();
      setItems(data);
    } catch (error) {
      console.error('Failed to load lost items:', error);
      toast.error('Failed to load lost items');
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_type.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.found_location.toLowerCase().includes(query) ||
        item.guest_name?.toLowerCase().includes(query) ||
        item.room_number?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddNew = () => {
    setViewMode('new');
    setSelectedItem(null);
    setShowDialog(true);
  };

  const handleView = (item: LostItem) => {
    setViewMode('view');
    setSelectedItem(item);
    setShowDialog(true);
  };

  const handleEdit = (item: LostItem) => {
    setViewMode('edit');
    setSelectedItem(item);
    setShowDialog(true);
  };

  const handleStatusChange = async (itemId: string, newStatus: LostItem['status']) => {
    try {
      await housekeepingService.updateLostItem(itemId, { status: newStatus });
      toast.success('Item status updated');
      loadItems();
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await housekeepingService.deleteLostItem(itemId);
      toast.success('Item deleted');
      loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unclaimed':
        return 'bg-blue-100 text-blue-800';
      case 'claimed':
        return 'bg-green-100 text-green-800';
      case 'disposed':
        return 'bg-gray-100 text-gray-800';
      case 'donated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unclaimed':
        return <Package className="h-4 w-4" />;
      case 'claimed':
        return <Check className="h-4 w-4" />;
      case 'disposed':
        return <Trash2 className="h-4 w-4" />;
      case 'donated':
        return <Gift className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const stats = {
    total: items.length,
    unclaimed: items.filter(i => i.status === 'unclaimed').length,
    claimed: items.filter(i => i.status === 'claimed').length,
    thisWeek: items.filter(i => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(i.found_date) >= weekAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lost & Found</h2>
          <p className="text-muted-foreground">Manage items found throughout the hotel</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Register Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unclaimed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unclaimed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Claimed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.claimed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>This Week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.thisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, locations, guests..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unclaimed">Unclaimed</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
            <SelectItem value="donated">Donated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== 'all' ? 'No items match your filters' : 'No lost items registered'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Found Location</TableHead>
                  <TableHead>Date Found</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guest Info</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.item_type}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{item.found_location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(item.found_date).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{item.storage_location}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.guest_name ? (
                        <div className="text-sm">
                          <div className="font-medium">{item.guest_name}</div>
                          {item.room_number && (
                            <div className="text-muted-foreground">Room {item.room_number}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleView(item)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.status === 'unclaimed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusChange(item.id, 'claimed')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Item Dialog */}
      <LostItemDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setSelectedItem(null);
        }}
        mode={viewMode}
        item={selectedItem}
        onSave={() => {
          setShowDialog(false);
          loadItems();
        }}
      />
    </div>
  );
}

// Lost Item Dialog Component
interface LostItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'new' | 'view' | 'edit';
  item: LostItem | null;
  onSave: () => void;
}

function LostItemDialog({ isOpen, onClose, mode, item, onSave }: LostItemDialogProps) {
  const [formData, setFormData] = useState<Partial<LostItem>>({
    item_type: '',
    description: '',
    found_location: '',
    found_date: new Date().toISOString().split('T')[0],
    storage_location: '',
    status: 'unclaimed',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    room_number: '',
    value_estimate: '',
    notes: ''
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        item_type: '',
        description: '',
        found_location: '',
        found_date: new Date().toISOString().split('T')[0],
        storage_location: '',
        status: 'unclaimed',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        room_number: '',
        value_estimate: '',
        notes: ''
      });
      setPhotos([]);
    }
  }, [item, isOpen]);

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;

    const newPhotos = Array.from(files).filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 5MB)`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: Not an image file`);
        return false;
      }
      return true;
    });

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleSubmit = async () => {
    if (!formData.item_type || !formData.description || !formData.found_location || !formData.storage_location) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSaving(true);

    try {
      if (mode === 'new') {
        const newItem = await housekeepingService.createLostItem(formData);

        // Upload photos if any
        if (photos.length > 0) {
          const photoFormData = new FormData();
          photos.forEach((photo, index) => {
            photoFormData.append(`photo_${index}`, photo);
          });
          await housekeepingService.uploadLostItemPhotos(newItem.id, photoFormData);
        }

        toast.success('Item registered successfully');
      } else if (mode === 'edit' && item) {
        await housekeepingService.updateLostItem(item.id, formData);

        // Upload new photos if any
        if (photos.length > 0) {
          const photoFormData = new FormData();
          photos.forEach((photo, index) => {
            photoFormData.append(`photo_${index}`, photo);
          });
          await housekeepingService.uploadLostItemPhotos(item.id, photoFormData);
        }

        toast.success('Item updated successfully');
      }

      onSave();
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'new' ? 'Register Lost Item' : mode === 'edit' ? 'Edit Item' : 'Item Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'new'
              ? 'Register a new item found in the hotel'
              : mode === 'edit'
              ? 'Update item information'
              : 'View item details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Type *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value) => setFormData({ ...formData, item_type: value })}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Jewelry">Jewelry</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Documents">Documents/ID</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Keys">Keys/Cards</SelectItem>
                  <SelectItem value="Books">Books/Reading Material</SelectItem>
                  <SelectItem value="Personal Care">Personal Care Items</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Found *</Label>
              <Input
                type="date"
                value={formData.found_date}
                onChange={(e) => setFormData({ ...formData, found_date: e.target.value })}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the item (color, brand, distinguishing features)..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Found Location *</Label>
              <Input
                value={formData.found_location}
                onChange={(e) => setFormData({ ...formData, found_location: e.target.value })}
                placeholder="e.g., Room 305, Lobby, Pool area"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Storage Location *</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="e.g., Lost & Found Cabinet A"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Guest Information (if known)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={formData.guest_name || ''}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Guest name"
                disabled={isReadOnly}
              />
              <Input
                value={formData.room_number || ''}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="Room number"
                disabled={isReadOnly}
              />
              <Input
                type="email"
                value={formData.guest_email || ''}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="Email"
                disabled={isReadOnly}
              />
              <Input
                type="tel"
                value={formData.guest_phone || ''}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="Phone"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estimated Value (Optional)</Label>
              <Input
                value={formData.value_estimate || ''}
                onChange={(e) => setFormData({ ...formData, value_estimate: e.target.value })}
                placeholder="e.g., $50, High value"
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclaimed">Unclaimed</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                  <SelectItem value="donated">Donated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          {!isReadOnly && (
            <div className="space-y-2">
              <Label>Photos</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e.target.files)}
              />
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isReadOnly && item?.photos && item.photos.length > 0 && (
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="grid grid-cols-4 gap-2">
                {item.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Item'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
