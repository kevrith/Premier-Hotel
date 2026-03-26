import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Building, Coffee, Waves, Bed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const locationIcons = {
  room: Bed,
  public_area: Building,
  restaurant: Coffee,
  outdoor: Waves
};

const locationLabels = {
  room: 'Hotel Room',
  public_area: 'Public Area',
  restaurant: 'Restaurant',
  outdoor: 'Outdoor Area'
};

export default function LocationSelector({
  selectedLocationId = '',
  locationNotes = '',
  onLocationChange,
  className
}) {
  const [locations, setLocations] = useState([]);
  const [notes, setNotes] = useState(locationNotes);
  const [selectedId, setSelectedId] = useState(selectedLocationId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('hotel_locations')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching locations:', error);
      } else {
        setLocations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = (locationId) => {
    setSelectedId(locationId);
    onLocationChange(locationId, notes);
  };

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);
    onLocationChange(selectedId, newNotes);
  };

  const groupedLocations = locations.reduce((groups, location) => {
    const type = location.location_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(location);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Location
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="location">Select your location *</Label>
          <Select value={selectedId} onValueChange={handleLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose where you'd like your order delivered" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedLocations).map(([type, locationList]) => {
                const Icon = locationIcons[type] || MapPin;
                return (
                  <div key={type}>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {locationLabels[type] || type}
                    </div>
                    {locationList.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_name}
                        {location.floor_number && ` (Floor ${location.floor_number})`}
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-notes">
            Additional Details (Optional)
          </Label>
          <Textarea
            id="location-notes"
            placeholder="E.g., Room number, table number, or any special delivery instructions"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Help us find you! Add your room number, table number, or any landmarks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}