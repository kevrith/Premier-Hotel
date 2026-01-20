import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, X, Home, Utensils } from 'lucide-react';

interface LocationSelectorProps {
  onSelect: (location: { type: string; number: string }) => void;
  onClose: () => void;
  currentLocation: { type: string; number: string } | null;
}

export function LocationSelector({ onSelect, onClose, currentLocation }: LocationSelectorProps) {
  const [locationType, setLocationType] = useState<'table' | 'room'>(
    (currentLocation?.type as 'table' | 'room') || 'table'
  );
  const [locationNumber, setLocationNumber] = useState(currentLocation?.number || '');

  // Predefined tables and rooms
  const tables = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
  const rooms = Array.from({ length: 50 }, (_, i) => (101 + i).toString());

  const handleConfirm = () => {
    if (!locationNumber) return;
    onSelect({ type: locationType, number: locationNumber });
  };

  const handleQuickSelect = (number: string) => {
    setLocationNumber(number);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <CardHeader className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <CardTitle className="flex items-center gap-2 pr-12">
            <MapPin className="h-6 w-6 text-primary" />
            Select Your Location
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Let us know where you are so we can deliver your order
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={locationType} onValueChange={(value) => setLocationType(value as 'table' | 'room')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table" className="gap-2">
                <Utensils className="h-4 w-4" />
                Restaurant Table
              </TabsTrigger>
              <TabsTrigger value="room" className="gap-2">
                <Home className="h-4 w-4" />
                Hotel Room
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="table-input">Table Number</Label>
                <Input
                  id="table-input"
                  type="text"
                  placeholder="Enter table number"
                  value={locationNumber}
                  onChange={(e) => setLocationNumber(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="mb-3 block">Quick Select Table</Label>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {tables.map((table) => (
                    <Button
                      key={table}
                      variant={locationNumber === table ? 'default' : 'outline'}
                      onClick={() => handleQuickSelect(table)}
                      className="h-12"
                    >
                      {table}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="room" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="room-input">Room Number</Label>
                <Input
                  id="room-input"
                  type="text"
                  placeholder="Enter room number"
                  value={locationNumber}
                  onChange={(e) => setLocationNumber(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="mb-3 block">Quick Select Room</Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                  {rooms.map((room) => (
                    <Button
                      key={room}
                      variant={locationNumber === room ? 'default' : 'outline'}
                      onClick={() => handleQuickSelect(room)}
                      className="h-12"
                    >
                      {room}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!locationNumber}
            className="flex-1 gap-2"
          >
            <MapPin className="h-4 w-4" />
            Confirm Location
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
