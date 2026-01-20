import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function RoomForm({ room, onSave, onCancel }) {
  const [formData, setFormData] = useState(room || {
    room_number: '',
    type: 'standard',
    base_price: 0,
    description: '',
    max_occupancy: 2,
    amenities: [],
    images: [],
    status: 'available',
    floor: 1,
    size_sqm: 0,
  });

  const [newAmenity, setNewAmenity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addAmenity = () => {
    if (newAmenity && !formData.amenities.includes(newAmenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="room_number">Room Number</Label>
          <Input
            id="room_number"
            value={formData.room_number}
            onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
            placeholder="301"
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Room Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="deluxe">Deluxe</SelectItem>
              <SelectItem value="suite">Suite</SelectItem>
              <SelectItem value="presidential">Presidential</SelectItem>
              <SelectItem value="family">Family</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="base_price">Price per Night (KES)</Label>
          <Input
            id="base_price"
            type="number"
            value={formData.base_price}
            onChange={(e) => setFormData(prev => ({ ...prev, base_price: Number(e.target.value) }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="max_occupancy">Capacity (Guests)</Label>
          <Input
            id="max_occupancy"
            type="number"
            min="1"
            value={formData.max_occupancy}
            onChange={(e) => setFormData(prev => ({ ...prev, max_occupancy: Number(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="Describe the room features and amenities..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="floor">Floor</Label>
          <Input
            id="floor"
            type="number"
            min="1"
            value={formData.floor}
            onChange={(e) => setFormData(prev => ({ ...prev, floor: Number(e.target.value) }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="size">Size (sqm)</Label>
          <Input
            id="size"
            type="number"
            min="0"
            value={formData.size_sqm}
            onChange={(e) => setFormData(prev => ({ ...prev, size_sqm: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="amenities">Amenities</Label>
        <div className="flex gap-2 mb-2">
          <Input
            id="amenities"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            placeholder="Add amenity (e.g., Wi-Fi, TV, Mini Bar)"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
          />
          <Button type="button" onClick={addAmenity} size="sm">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.amenities.map((amenity, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {amenity}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeAmenity(amenity)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="status">Room Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {room ? 'Update Room' : 'Create Room'}
        </Button>
      </div>
    </form>
  );
}
