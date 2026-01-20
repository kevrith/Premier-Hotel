import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function MenuItemForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState(item || {
    name: '',
    name_sw: '',
    description: '',
    description_sw: '',
    category: 'mains',
    base_price: 0,
    image_url: '',
    dietary_info: [],
    customizations: [],
    preparation_time: 0,
    available: true,
    popular: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addDietaryInfo = (info) => {
    if (info && !formData.dietary_info.includes(info)) {
      setFormData(prev => ({
        ...prev,
        dietary_info: [...prev.dietary_info, info]
      }));
    }
  };

  const removeDietaryInfo = (info) => {
    setFormData(prev => ({
      ...prev,
      dietary_info: prev.dietary_info.filter(i => i !== info)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Price (KES)</label>
          <Input
            type="number"
            value={formData.base_price}
            onChange={(e) => setFormData(prev => ({ ...prev, base_price: Number(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Category</label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appetizers">Appetizers</SelectItem>
              <SelectItem value="starters">Starters</SelectItem>
              <SelectItem value="mains">Main Course</SelectItem>
              <SelectItem value="desserts">Desserts</SelectItem>
              <SelectItem value="drinks">Drinks</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="snacks">Snacks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Prep Time (min)</label>
          <Input
            type="number"
            value={formData.preparation_time}
            onChange={(e) => setFormData(prev => ({ ...prev, preparation_time: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Image URL</label>
        <Input
          value={formData.image_url || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Dietary Information</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.dietary_info.map((info, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {info}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeDietaryInfo(info)}
              />
            </Badge>
          ))}
        </div>
        <Select onValueChange={addDietaryInfo}>
          <SelectTrigger>
            <SelectValue placeholder="Add dietary info" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Vegetarian">Vegetarian</SelectItem>
            <SelectItem value="Vegan">Vegan</SelectItem>
            <SelectItem value="Gluten-Free">Gluten-Free</SelectItem>
            <SelectItem value="Dairy-Free">Dairy-Free</SelectItem>
            <SelectItem value="Halal">Halal</SelectItem>
            <SelectItem value="Keto">Keto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 border rounded">
        <label className="text-sm font-medium">Available for Order</label>
        <Switch
          checked={formData.available}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: checked }))}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded">
        <label className="text-sm font-medium">Mark as Popular</label>
        <Switch
          checked={formData.popular}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, popular: checked }))}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">Save Item</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
