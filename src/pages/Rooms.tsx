// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Bed, Users, Wifi, Coffee, Tv, Wind, Bath, DollarSign, Star, Calendar, Search, SlidersHorizontal, X
} from 'lucide-react';
import { format } from 'date-fns';
import roomService from '@/lib/api/services/roomService';
import { formatNumber } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';

const mockRooms = [
  {
    id: '1', room_number: '101', type: 'Standard Room',
    description: 'Comfortable room with essential amenities and city view',
    base_price: 5000, max_occupancy: 2,
    amenities: ['wifi', 'tv', 'coffee', 'ac'],
    images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600'],
    status: 'available', rating: 4.2
  },
  {
    id: '2', room_number: '201', type: 'Deluxe Suite',
    description: 'Spacious suite with separate living area and premium amenities',
    base_price: 12000, max_occupancy: 4,
    amenities: ['wifi', 'tv', 'coffee', 'ac', 'bath', 'minibar'],
    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600'],
    status: 'available', rating: 4.8
  },
  {
    id: '3', room_number: '301', type: 'Executive Suite',
    description: 'Luxury suite with panoramic views and executive lounge access',
    base_price: 18000, max_occupancy: 4,
    amenities: ['wifi', 'tv', 'coffee', 'ac', 'bath', 'minibar', 'balcony'],
    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600'],
    status: 'available', rating: 4.9
  },
  {
    id: '4', room_number: '102', type: 'Standard Room',
    description: 'Comfortable room with essential amenities and garden view',
    base_price: 4500, max_occupancy: 2,
    amenities: ['wifi', 'tv', 'coffee', 'ac'],
    images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600'],
    status: 'available', rating: 4.0
  }
];

const amenityIcons = {
  wifi: { icon: Wifi, label: 'WiFi' },
  tv: { icon: Tv, label: 'TV' },
  coffee: { icon: Coffee, label: 'Coffee Maker' },
  ac: { icon: Wind, label: 'Air Conditioning' },
  bath: { icon: Bath, label: 'Bathtub' },
  minibar: { icon: DollarSign, label: 'Mini Bar' },
  balcony: { icon: Star, label: 'Balcony' }
};

const defaultFilters = {
  roomType: 'all', guests: 1, minPrice: 0, maxPrice: 20000, checkIn: '', checkOut: ''
};

function RoomImagePlaceholder({ type }: { type: string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-900 flex flex-col items-center justify-center gap-2">
      <Bed className="h-10 w-10 text-indigo-300 dark:text-indigo-600" />
      <span className="text-xs text-indigo-400 dark:text-indigo-500 font-medium px-2 text-center">{type}</span>
    </div>
  );
}

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const raw = await roomService.getAllRooms();
        const response: any[] = (raw as any) || [];
        if (cancelled) return;
        setRooms(response.length > 0 ? response : mockRooms);
      } catch {
        if (cancelled) return;
        toast.error('Failed to load rooms, showing sample data');
        setRooms(mockRooms);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRooms();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let filtered = [...rooms];
    if (filters.roomType !== 'all') {
      filtered = filtered.filter(r => r.type.toLowerCase().includes(filters.roomType.toLowerCase()));
    }
    filtered = filtered.filter(r => r.max_occupancy >= filters.guests);
    filtered = filtered.filter(r => r.base_price >= filters.minPrice && r.base_price <= filters.maxPrice);
    setFilteredRooms(filtered);
  }, [filters, rooms]);

  const handleFilterChange = (key: string, value: any) => setFilters(prev => ({ ...prev, [key]: value }));

  const formatPrice = formatNumber;

  const FiltersContent = () => (
    <CardContent className="space-y-5 pt-0">
      <div className="space-y-1.5">
        <Label htmlFor="checkIn" className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" /> Check-in
        </Label>
        <Input id="checkIn" type="date" value={filters.checkIn}
          onChange={e => handleFilterChange('checkIn', e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="checkOut" className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" /> Check-out
        </Label>
        <Input id="checkOut" type="date" value={filters.checkOut}
          onChange={e => handleFilterChange('checkOut', e.target.value)}
          min={filters.checkIn || format(new Date(), 'yyyy-MM-dd')} />
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-sm">Room Type</Label>
        <Select value={filters.roomType} onValueChange={v => handleFilterChange('roomType', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            <SelectItem value="standard">Standard Room</SelectItem>
            <SelectItem value="deluxe">Deluxe Suite</SelectItem>
            <SelectItem value="executive">Executive Suite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" /> Guests
        </Label>
        <Select value={filters.guests.toString()} onValueChange={v => handleFilterChange('guests', parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Guest</SelectItem>
            <SelectItem value="2">2 Guests</SelectItem>
            <SelectItem value="3">3 Guests</SelectItem>
            <SelectItem value="4">4+ Guests</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Price Range</span>
          <span className="font-normal text-muted-foreground text-xs">KES {formatPrice(filters.minPrice)} – {formatPrice(filters.maxPrice)}</span>
        </Label>
        <input type="range" min="0" max="20000" step="1000" value={filters.maxPrice}
          onChange={e => handleFilterChange('maxPrice', parseInt(e.target.value))}
          className="w-full accent-indigo-600" />
      </div>
      <Button className="w-full" variant="outline" size="sm" onClick={() => setFilters(defaultFilters)}>
        Clear Filters
      </Button>
    </CardContent>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-900 to-violet-800 text-white pt-24 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">Our Rooms</h1>
          <p className="text-base sm:text-lg opacity-80 max-w-2xl">
            Choose from our selection of comfortable and well-appointed rooms
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} available`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            {showFilters ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            {showFilters ? 'Close' : 'Filters'}
          </Button>
        </div>

        {/* Mobile filters panel (collapsible) */}
        {showFilters && (
          <Card className="mb-4 lg:hidden">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" /> Search Filters
              </CardTitle>
            </CardHeader>
            <FiltersContent />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" /> Search Filters
                </CardTitle>
                <CardDescription>Find your perfect room</CardDescription>
              </CardHeader>
              <FiltersContent />
            </Card>
          </div>

          {/* Rooms Grid */}
          <div className="lg:col-span-3">
            <p className="hidden lg:block text-sm text-muted-foreground mb-4">
              {loading ? 'Loading rooms...' : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} available`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border bg-card overflow-hidden">
                    <Skeleton className="h-44 w-full rounded-none" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-2"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="h-5 w-5 rounded-full" /></div>
                      <div className="flex justify-between pt-1">
                        <Skeleton className="h-7 w-24" /><Skeleton className="h-9 w-24" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredRooms.map((room) => (
                <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  {/* Image */}
                  <div className="relative h-44 sm:h-48 overflow-hidden flex-shrink-0">
                    {imgErrors[room.id] || !room.images?.[0] ? (
                      <RoomImagePlaceholder type={room.type} />
                    ) : (
                      <img
                        src={room.images[0]}
                        alt={room.type}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={() => setImgErrors(prev => ({ ...prev, [room.id]: true }))}
                      />
                    )}
                    <Badge className={`absolute top-2 right-2 text-xs ${room.status === 'available' ? 'bg-green-500' : 'bg-red-500'}`}>
                      {room.status}
                    </Badge>
                  </div>

                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="flex items-start justify-between text-base gap-2">
                      <span className="leading-tight">{room.room_number}</span>
                      <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-sm font-normal text-foreground">{room.rating ?? '—'}</span>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{room.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="px-4 pb-2 flex-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {room.amenities?.slice(0, 5).map((amenity: string) => {
                        const Icon = amenityIcons[amenity]?.icon;
                        return Icon ? (
                          <div key={amenity} title={amenityIcons[amenity].label}
                            className="flex items-center text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>Up to {room.max_occupancy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" />
                        <span className="capitalize">{room.type}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between pt-3 pb-4 px-4 border-t mt-auto">
                    <div>
                      <p className="text-lg sm:text-xl font-bold">KES {formatPrice(room.base_price)}</p>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                    <Button asChild size="sm">
                      <Link to={`/rooms/${room.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {!loading && filteredRooms.length === 0 && (
              <div className="text-center py-16">
                <Bed className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No rooms match your filters. Try adjusting them.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilters(defaultFilters)}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
