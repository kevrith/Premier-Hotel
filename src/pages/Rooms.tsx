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
  Bed,
  Users,
  Wifi,
  Coffee,
  Tv,
  Wind,
  Bath,
  DollarSign,
  Star,
  Calendar,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import roomService from '@/lib/api/services/roomService';
import { toast } from 'react-hot-toast';

// Mock room data
const mockRooms = [
  {
    id: '1',
    room_number: '101',
    type: 'Standard Room',
    type_sw: 'Chumba cha Kawaida',
    description: 'Comfortable room with essential amenities and city view',
    description_sw: 'Chumba cha raha na vifaa muhimu',
    base_price: 5000,
    max_occupancy: 2,
    amenities: ['wifi', 'tv', 'coffee', 'ac'],
    images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600'],
    status: 'available',
    rating: 4.2
  },
  {
    id: '2',
    room_number: '201',
    type: 'Deluxe Suite',
    type_sw: 'Suite Nzuri',
    description: 'Spacious suite with separate living area and premium amenities',
    description_sw: 'Suite kubwa na vifaa vya hali ya juu',
    base_price: 12000,
    max_occupancy: 4,
    amenities: ['wifi', 'tv', 'coffee', 'ac', 'bath', 'minibar'],
    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600'],
    status: 'available',
    rating: 4.8
  },
  {
    id: '3',
    room_number: '301',
    type: 'Executive Suite',
    type_sw: 'Suite ya Kifahari',
    description: 'Luxury suite with panoramic views and executive lounge access',
    description_sw: 'Suite ya kifahari na mandhari nzuri',
    base_price: 18000,
    max_occupancy: 4,
    amenities: ['wifi', 'tv', 'coffee', 'ac', 'bath', 'minibar', 'balcony'],
    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600'],
    status: 'available',
    rating: 4.9
  },
  {
    id: '4',
    room_number: '102',
    type: 'Standard Room',
    type_sw: 'Chumba cha Kawaida',
    description: 'Comfortable room with essential amenities and garden view',
    description_sw: 'Chumba cha raha na mandhari ya bustani',
    base_price: 4500,
    max_occupancy: 2,
    amenities: ['wifi', 'tv', 'coffee', 'ac'],
    images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600'],
    status: 'available',
    rating: 4.0
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

export default function Rooms() {
  const [rooms, setRooms] = useState(mockRooms);
  const [filteredRooms, setFilteredRooms] = useState(mockRooms);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    roomType: 'all',
    guests: 1,
    minPrice: 0,
    maxPrice: 20000,
    checkIn: '',
    checkOut: ''
  });

  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await roomService.getAllRooms();
        if (response && response.length > 0) {
          setRooms(response);
        } else {
          // Fallback to mock data if no rooms in database
          setRooms(mockRooms);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        toast.error('Failed to load rooms, showing sample data');
        setRooms(mockRooms);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    let filtered = [...rooms];

    // Room type filter
    if (filters.roomType !== 'all') {
      filtered = filtered.filter(room =>
        room.type.toLowerCase().includes(filters.roomType.toLowerCase())
      );
    }

    // Guest capacity filter
    filtered = filtered.filter(room => room.max_occupancy >= filters.guests);

    // Price range filter
    filtered = filtered.filter(room =>
      room.base_price >= filters.minPrice && room.base_price <= filters.maxPrice
    );

    setFilteredRooms(filtered);
  }, [filters, rooms]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-16 mt-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Rooms</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Choose from our selection of comfortable and well-appointed rooms
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Filters
                </CardTitle>
                <CardDescription>Find your perfect room</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div className="space-y-2">
                  <Label htmlFor="checkIn" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Check-in Date
                  </Label>
                  <Input
                    id="checkIn"
                    type="date"
                    value={filters.checkIn}
                    onChange={(e) => handleFilterChange('checkIn', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkOut" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Check-out Date
                  </Label>
                  <Input
                    id="checkOut"
                    type="date"
                    value={filters.checkOut}
                    onChange={(e) => handleFilterChange('checkOut', e.target.value)}
                    min={filters.checkIn || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <Separator />

                {/* Room Type */}
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select
                    value={filters.roomType}
                    onValueChange={(value) => handleFilterChange('roomType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      <SelectItem value="standard">Standard Room</SelectItem>
                      <SelectItem value="deluxe">Deluxe Suite</SelectItem>
                      <SelectItem value="executive">Executive Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Guests */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Number of Guests
                  </Label>
                  <Select
                    value={filters.guests.toString()}
                    onValueChange={(value) => handleFilterChange('guests', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Guest</SelectItem>
                      <SelectItem value="2">2 Guests</SelectItem>
                      <SelectItem value="3">3 Guests</SelectItem>
                      <SelectItem value="4">4+ Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Price Range
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      KES {filters.minPrice} - {filters.maxPrice}
                    </span>
                  </Label>
                  <div className="pt-2">
                    <input
                      type="range"
                      min="0"
                      max="20000"
                      step="1000"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button className="w-full" variant="outline" onClick={() => setFilters({
                  roomType: 'all',
                  guests: 1,
                  minPrice: 0,
                  maxPrice: 20000,
                  checkIn: '',
                  checkOut: ''
                })}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Rooms Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRooms.map((room) => (
                <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Room Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={room.images[0]}
                      alt={room.type}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 right-2 bg-green-500">
                      {room.status}
                    </Badge>
                  </div>

                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span>{room.type}</span>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-sm font-normal text-foreground">
                          {room.rating}
                        </span>
                      </div>
                    </CardTitle>
                    <CardDescription>{room.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Amenities */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {room.amenities.slice(0, 5).map((amenity) => {
                        const Icon = amenityIcons[amenity]?.icon;
                        return Icon ? (
                          <div
                            key={amenity}
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                            title={amenityIcons[amenity].label}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                        ) : null;
                      })}
                      {room.amenities.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{room.amenities.length - 5} more
                        </span>
                      )}
                    </div>

                    {/* Capacity */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Up to {room.max_occupancy} guests</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        <span>Room {room.room_number}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-2xl font-bold">KES {room.base_price.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">per night</p>
                    </div>
                    <Button asChild>
                      <Link to={`/rooms/${room.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredRooms.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No rooms found matching your criteria. Try adjusting the filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
