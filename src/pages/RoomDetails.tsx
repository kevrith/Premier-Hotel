import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

// Mock room data (expanded from Rooms.jsx)
const mockRoomsData = {
  '1': {
    id: '1',
    room_number: '101',
    type: 'Standard Room',
    type_sw: 'Chumba cha Kawaida',
    description: 'Comfortable room with essential amenities and city view',
    description_sw: 'Chumba cha raha na vifaa muhimu',
    long_description: 'Our Standard Room offers a perfect blend of comfort and affordability. Featuring a cozy queen-size bed, modern en-suite bathroom, and a workspace for business travelers. The room overlooks the bustling city, providing guests with an authentic urban experience. Ideal for solo travelers or couples seeking quality accommodation without breaking the bank.',
    base_price: 5000,
    max_occupancy: 2,
    size_sqm: 25,
    bed_type: '1 Queen Bed',
    view: 'City View',
    floor: 1,
    amenities: ['wifi', 'tv', 'coffee', 'ac'],
    images: [
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
    ],
    status: 'available',
    rating: 4.2,
    reviews: [
      {
        id: 'r1',
        user: 'John Mwangi',
        rating: 5,
        comment: 'Great value for money! Clean room and friendly staff.',
        date: '2025-11-15',
        verified: true
      },
      {
        id: 'r2',
        user: 'Sarah Kamau',
        rating: 4,
        comment: 'Comfortable stay. The bed was very comfortable.',
        date: '2025-11-10',
        verified: true
      },
      {
        id: 'r3',
        user: 'David Ochieng',
        rating: 4,
        comment: 'Nice room but the WiFi could be faster.',
        date: '2025-11-05',
        verified: true
      }
    ],
    availability: {
      '2025-12-10': true,
      '2025-12-11': true,
      '2025-12-12': false,
      '2025-12-13': false,
      '2025-12-14': true,
      '2025-12-15': true
    }
  },
  '2': {
    id: '2',
    room_number: '201',
    type: 'Deluxe Suite',
    type_sw: 'Suite Nzuri',
    description: 'Spacious suite with separate living area and premium amenities',
    description_sw: 'Suite kubwa na vifaa vya hali ya juu',
    long_description: 'Experience luxury in our Deluxe Suite, featuring a separate living area perfect for entertaining or relaxing. The suite includes a king-size bed with premium linens, a spacious bathroom with a bathtub, and a well-equipped kitchenette. Enjoy your favorite beverages from the complimentary minibar while taking in panoramic city views. Perfect for families or extended stays.',
    base_price: 12000,
    max_occupancy: 4,
    size_sqm: 45,
    bed_type: '1 King Bed + Sofa Bed',
    view: 'City Panorama',
    floor: 2,
    amenities: ['wifi', 'tv', 'coffee', 'ac', 'bath', 'minibar'],
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'
    ],
    status: 'available',
    rating: 4.8,
    reviews: [
      {
        id: 'r4',
        user: 'Grace Wanjiru',
        rating: 5,
        comment: 'Absolutely loved it! The separate living area was perfect for our family.',
        date: '2025-11-20',
        verified: true
      },
      {
        id: 'r5',
        user: 'Michael Otieno',
        rating: 5,
        comment: 'Luxurious and spacious. The minibar was a nice touch.',
        date: '2025-11-18',
        verified: true
      }
    ],
    availability: {
      '2025-12-10': true,
      '2025-12-11': true,
      '2025-12-12': true,
      '2025-12-13': false,
      '2025-12-14': true,
      '2025-12-15': true
    }
  },
  '3': {
    id: '3',
    room_number: '301',
    type: 'Executive Suite',
    type_sw: 'Suite ya Kifahari',
    description: 'Luxury suite with panoramic views and executive lounge access',
    description_sw: 'Suite ya kifahari na mandhari nzuri',
    long_description: 'Our top-tier Executive Suite offers the ultimate luxury experience. Featuring a master bedroom with a king-size bed, a separate living room, dining area, and a private balcony with breathtaking panoramic views. Guests enjoy complimentary access to our exclusive executive lounge with premium refreshments. The marble bathroom includes a jacuzzi tub and rain shower. Ideal for business executives and discerning travelers seeking the finest accommodations.',
    base_price: 18000,
    max_occupancy: 4,
    size_sqm: 65,
    bed_type: '1 King Bed',
    view: 'Panoramic City & Garden',
    floor: 3,
    amenities: ['wifi', 'tv', 'coffee', 'ac', 'bath', 'minibar', 'balcony'],
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'
    ],
    status: 'available',
    rating: 4.9,
    reviews: [
      {
        id: 'r6',
        user: 'Patricia Njeri',
        rating: 5,
        comment: 'Exceptional! The executive lounge access was wonderful. Worth every shilling.',
        date: '2025-11-22',
        verified: true
      },
      {
        id: 'r7',
        user: 'James Kipchoge',
        rating: 5,
        comment: 'Best room in the hotel. The balcony view is stunning.',
        date: '2025-11-20',
        verified: true
      },
      {
        id: 'r8',
        user: 'Anne Akinyi',
        rating: 4,
        comment: 'Beautiful suite with excellent service. Highly recommend!',
        date: '2025-11-15',
        verified: true
      }
    ],
    availability: {
      '2025-12-10': true,
      '2025-12-11': false,
      '2025-12-12': false,
      '2025-12-13': true,
      '2025-12-14': true,
      '2025-12-15': true
    }
  },
  '4': {
    id: '4',
    room_number: '102',
    type: 'Standard Room',
    type_sw: 'Chumba cha Kawaida',
    description: 'Comfortable room with essential amenities and garden view',
    description_sw: 'Chumba cha raha na mandhari ya bustani',
    long_description: 'Enjoy a peaceful stay in our Garden View Standard Room. This serene space features a comfortable queen-size bed, modern amenities, and a charming view of our landscaped gardens. Perfect for guests seeking tranquility and relaxation. The room includes a work desk, flat-screen TV, and complimentary WiFi. Ground floor location provides easy access to hotel facilities.',
    base_price: 4500,
    max_occupancy: 2,
    size_sqm: 25,
    bed_type: '1 Queen Bed',
    view: 'Garden View',
    floor: 1,
    amenities: ['wifi', 'tv', 'coffee', 'ac'],
    images: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'
    ],
    status: 'available',
    rating: 4.0,
    reviews: [
      {
        id: 'r9',
        user: 'Peter Mutua',
        rating: 4,
        comment: 'Peaceful and quiet. The garden view is lovely.',
        date: '2025-11-12',
        verified: true
      },
      {
        id: 'r10',
        user: 'Lucy Wambui',
        rating: 4,
        comment: 'Good value. Clean and comfortable.',
        date: '2025-11-08',
        verified: true
      }
    ],
    availability: {
      '2025-12-10': true,
      '2025-12-11': true,
      '2025-12-12': true,
      '2025-12-13': true,
      '2025-12-14': false,
      '2025-12-15': true
    }
  }
};

const amenityDetails = {
  wifi: { icon: Wifi, label: 'High-Speed WiFi', description: 'Complimentary wireless internet throughout the room' },
  tv: { icon: Tv, label: 'Flat-Screen TV', description: 'HD television with premium channels' },
  coffee: { icon: Coffee, label: 'Coffee/Tea Maker', description: 'In-room coffee and tea facilities' },
  ac: { icon: Wind, label: 'Air Conditioning', description: 'Climate control with adjustable temperature' },
  bath: { icon: Bath, label: 'Bathtub', description: 'Luxury bathtub with premium toiletries' },
  minibar: { icon: DollarSign, label: 'Mini Bar', description: 'Stocked with beverages and snacks' },
  balcony: { icon: Star, label: 'Private Balcony', description: 'Outdoor seating area with scenic views' }
};

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    // Fetch room details (mock)
    const roomData = mockRoomsData[id];
    if (roomData) {
      setRoom(roomData);
    } else {
      // Room not found, redirect to rooms page
      navigate('/rooms');
    }
  }, [id, navigate]);

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading room details...</p>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % room.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + room.images.length) % room.images.length);
  };

  const averageRating = room.rating;
  const totalReviews = room.reviews.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link to="/rooms" className="hover:text-primary">Rooms</Link>
          <span>/</span>
          <span className="text-foreground">{room.type}</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{room.type}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Room {room.room_number} - Floor {room.floor}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  {averageRating} ({totalReviews} reviews)
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">KES {room.base_price.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">per night</p>
            </div>
          </div>

          <Badge className={room.status === 'available' ? 'bg-green-500' : 'bg-red-500'}>
            {room.status === 'available' ? 'Available' : 'Occupied'}
          </Badge>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden bg-muted">
            <img
              src={room.images[currentImageIndex]}
              alt={`${room.type} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setIsImageModalOpen(true)}
            />

            {/* Navigation arrows */}
            {room.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image counter */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {room.images.length}
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {room.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                  index === currentImageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Info Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About This Room</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{room.long_description}</p>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Room Size</p>
                        <p className="font-semibold">{room.size_sqm} m²</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bed Type</p>
                        <p className="font-semibold">{room.bed_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">View</p>
                        <p className="font-semibold">{room.view}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Max Guests</p>
                        <p className="font-semibold flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {room.max_occupancy} guests
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="amenities" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Room Amenities</CardTitle>
                    <CardDescription>Everything you need for a comfortable stay</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {room.amenities.map((amenity) => {
                        const detail = amenityDetails[amenity];
                        if (!detail) return null;
                        const Icon = detail.icon;
                        return (
                          <div key={amenity} className="flex items-start gap-3 p-3 rounded-lg border">
                            <Icon className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-semibold">{detail.label}</p>
                              <p className="text-sm text-muted-foreground">{detail.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Guest Reviews</CardTitle>
                        <CardDescription>
                          {totalReviews} verified {totalReviews === 1 ? 'review' : 'reviews'}
                        </CardDescription>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-2xl font-bold">
                          <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                          {averageRating}
                        </div>
                        <p className="text-xs text-muted-foreground">Average rating</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {room.reviews.map((review) => (
                      <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {review.user}
                              {review.verified && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified Stay
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(review.date), 'MMMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-500 text-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book This Room</CardTitle>
                <CardDescription>Reserve your stay with us</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-primary">
                      KES {room.base_price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/ night</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Taxes and fees included</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Quick Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Room Number</span>
                      <span className="font-medium">{room.room_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Floor</span>
                      <span className="font-medium">{room.floor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max Guests</span>
                      <span className="font-medium">{room.max_occupancy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={room.status === 'available' ? 'bg-green-500' : 'bg-red-500'}>
                        {room.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button asChild className="w-full" size="lg" disabled={room.status !== 'available'}>
                  <Link to={`/booking?roomId=${room.id}`}>
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Now
                  </Link>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Free cancellation up to 24 hours before check-in
                </p>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Need Help?</h4>
                  <div className="space-y-2 text-sm">
                    <a href="tel:+254712345678" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                      <Phone className="h-4 w-4" />
                      +254 712 345 678
                    </a>
                    <a href="mailto:info@premierhotel.co.ke" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                      <Mail className="h-4 w-4" />
                      info@premierhotel.co.ke
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Rooms */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Similar Rooms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(mockRoomsData)
              .filter((r) => r.id !== room.id && r.type === room.type)
              .slice(0, 3)
              .map((similarRoom) => (
                <Card key={similarRoom.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={similarRoom.images[0]}
                      alt={similarRoom.type}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 right-2 bg-green-500">
                      {similarRoom.status}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{similarRoom.type}</CardTitle>
                    <CardDescription>Room {similarRoom.room_number}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">KES {similarRoom.base_price.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">per night</p>
                      </div>
                      <Button asChild variant="outline">
                        <Link to={`/rooms/${similarRoom.id}`}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
