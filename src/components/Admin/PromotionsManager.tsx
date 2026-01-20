import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, Edit, Trash2, Calendar, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PromotionsManager() {
  const [promotions, setPromotions] = useState([
    {
      id: '1',
      name: 'Summer Special',
      code: 'SUMMER2025',
      description: 'Get 25% off on all bookings during summer',
      discount_type: 'percentage',
      discount_value: 25,
      start_date: '2025-06-01',
      end_date: '2025-08-31',
      is_active: true,
      usage_count: 45
    },
    {
      id: '2',
      name: 'Weekend Getaway',
      code: 'WEEKEND15',
      description: '15% off for weekend stays (Friday-Sunday)',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      is_active: true,
      usage_count: 128
    },
    {
      id: '3',
      name: 'New Year Celebration',
      code: 'NEWYEAR2025',
      description: 'Fixed KES 5000 discount on bookings over KES 20,000',
      discount_type: 'fixed',
      discount_value: 5000,
      start_date: '2024-12-20',
      end_date: '2025-01-10',
      is_active: false,
      usage_count: 67
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const { toast } = useToast();

  const handleSavePromotion = (promoData: any) => {
    if (editingPromo) {
      setPromotions(prev => prev.map(p => p.id === editingPromo.id ? { ...promoData, id: p.id } : p));
      toast({
        title: "Promotion updated",
        description: "The promotion has been updated successfully"
      });
    } else {
      setPromotions(prev => [...prev, { ...promoData, id: Date.now().toString(), usage_count: 0 }]);
      toast({
        title: "Promotion created",
        description: "New promotion has been created successfully"
      });
    }
    setIsDialogOpen(false);
    setEditingPromo(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Promotion deleted",
        description: "The promotion has been deleted successfully"
      });
    }
  };

  const toggleActive = (id: string) => {
    setPromotions(prev => prev.map(p =>
      p.id === id ? { ...p, is_active: !p.is_active } : p
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Promotions & Special Offers
              </CardTitle>
              <CardDescription>
                Create and manage promotional codes and special offers
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPromo(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromo ? 'Edit Promotion' : 'Create New Promotion'}
                  </DialogTitle>
                </DialogHeader>
                <PromotionForm
                  promotion={editingPromo}
                  onSave={handleSavePromotion}
                  onCancel={() => {
                    setIsDialogOpen(false);
                    setEditingPromo(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {promotions.map((promo) => (
              <Card key={promo.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{promo.name}</h4>
                        {promo.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Code:</span>
                          <span className="font-mono ml-2 font-semibold">{promo.code}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Discount:</span>
                          <span className="ml-2 font-semibold">
                            {promo.discount_type === 'percentage'
                              ? `${promo.discount_value}%`
                              : `KES ${promo.discount_value}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Period:</span>
                          <span className="ml-2">{promo.start_date} to {promo.end_date}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Usage:</span>
                          <span className="ml-2">{promo.usage_count} times</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={promo.is_active}
                        onCheckedChange={() => toggleActive(promo.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPromo(promo);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(promo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PromotionForm({ promotion, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(promotion || {
    name: '',
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    start_date: '',
    end_date: '',
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Promotion Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="code">Promo Code</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="SUMMER2025"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="discount_type">Discount Type</Label>
          <Select
            value={formData.discount_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value }))}
          >
            <SelectTrigger id="discount_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="discount_value">
            {formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount (KES)'}
          </Label>
          <Input
            id="discount_value"
            type="number"
            value={formData.discount_value}
            onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Promotion Active</Label>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {promotion ? 'Update Promotion' : 'Create Promotion'}
        </Button>
      </div>
    </form>
  );
}
