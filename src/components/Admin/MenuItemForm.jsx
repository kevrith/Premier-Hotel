import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function MenuItemForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState(item);

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

  const addAllergen = (allergen) => {
    if (allergen && !formData.allergens.includes(allergen)) {
      setFormData(prev => ({
        ...prev,
        allergens: [...prev.allergens, allergen]
      }));
    }
  };

  const removeAllergen = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
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
            value={formData.price_kes}
            onChange={(e) => setFormData(prev => ({ ...prev, price_kes: Number(e.target.value) }))}
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
              <SelectItem value="Appetizers">Appetizers</SelectItem>
              <SelectItem value="Main Course">Main Course</SelectItem>
              <SelectItem value="Desserts">Desserts</SelectItem>
              <SelectItem value="Beverages">Beverages</SelectItem>
              <SelectItem value="Snacks">Snacks</SelectItem>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Calories</label>
          <Input
            type="number"
            value={formData.calories || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, calories: Number(e.target.value) || undefined }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Image URL</label>
          <Input
            value={formData.image_url || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
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

      <div>
        <label className="text-sm font-medium mb-2 block">Allergens</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.allergens.map((allergen, index) => (
            <Badge key={index} variant="destructive" className="gap-1">
              {allergen}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeAllergen(allergen)}
              />
            </Badge>
          ))}
        </div>
        <Select onValueChange={addAllergen}>
          <SelectTrigger>
            <SelectValue placeholder="Add allergen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Nuts">Nuts</SelectItem>
            <SelectItem value="Dairy">Dairy</SelectItem>
            <SelectItem value="Eggs">Eggs</SelectItem>
            <SelectItem value="Soy">Soy</SelectItem>
            <SelectItem value="Wheat">Wheat</SelectItem>
            <SelectItem value="Seafood">Seafood</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-4 border rounded">
        <label className="text-sm font-medium">Available for Order</label>
        <Switch
          checked={formData.is_available}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded">
        <label className="text-sm font-medium">Mark as Popular</label>
        <Switch
          checked={formData.is_popular}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">Save Item</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}