import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Bed, 
  Maximize, 
  Star, 
  ArrowRight,
  Wifi,
  Car,
  Coffee,
  Tv
} from "lucide-react";
import { Link } from "react-router-dom";

const getAmenityIcon = (amenity) => {
  const iconMap = {
    "Free WiFi": <Wifi className="w-4 h-4" />,
    "Parking": <Car className="w-4 h-4" />,
    "Coffee Machine": <Coffee className="w-4 h-4" />,
    "Cable TV": <Tv className="w-4 h-4" />,
    "Smart TV": <Tv className="w-4 h-4" />
  };
  
  return iconMap[amenity] || null;
};

export const RoomCard = ({ room, checkInDate, checkOutDate, nights = 1 }) => {
  const totalPrice = room.base_price_kes * nights;
  const bookingUrl = checkInDate && checkOutDate 
    ? `/rooms/${room.id}/book?checkin=${checkInDate.toISOString().split('T')[0]}&checkout=${checkOutDate.toISOString().split('T')[0]}&guests=2`
    : `/rooms/${room.id}`;

  return (
    <Card className="group overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-card">
      <div className="relative">
        <img
          src={room.images[0] || '/api/placeholder/400/250'}
          alt={room.name}
          className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-2 py-1 rounded-full text-sm font-semibold">
          KES {room.base_price_kes.toLocaleString()}/night
        </div>
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/90 text-foreground">
            {room.room_type}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-foreground line-clamp-1">
            {room.name}
          </h3>
          <div className="flex items-center gap-1 ml-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">4.8</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {room.description}
        </p>

        {/* Room Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{room.max_guests} guests</span>
          </div>
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{room.bed_count} {room.bed_type}</span>
          </div>
          {room.size_sqm && (
            <div className="flex items-center gap-1">
              <Maximize className="w-4 h-4" />
              <span>{room.size_sqm}m²</span>
            </div>
          )}
        </div>

        {/* Key Amenities */}
        <div className="flex flex-wrap gap-2 mb-4">
          {room.amenities.slice(0, 4).map((amenity, index) => (
            <div key={index} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
              {getAmenityIcon(amenity)}
              <span>{amenity}</span>
            </div>
          ))}
          {room.amenities.length > 4 && (
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
              +{room.amenities.length - 4} more
            </span>
          )}
        </div>

        {/* Pricing and Booking */}
        <div className="space-y-3">
          {nights > 1 && (
            <div className="text-sm text-muted-foreground">
              Total for {nights} nights: 
              <span className="font-semibold text-foreground ml-1">
                KES {totalPrice.toLocaleString()}
              </span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/rooms/${room.id}`}>
                View Details
              </Link>
            </Button>
            <Button asChild className="flex-1 group">
              <Link to={bookingUrl}>
                Book Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};