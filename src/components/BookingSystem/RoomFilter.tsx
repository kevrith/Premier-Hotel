import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

const roomTypes = ["Standard", "Deluxe", "Executive Suite", "Presidential Suite", "Family Suite", "Business Suite"];

const amenities = [
  "Free WiFi", "Air Conditioning", "Cable TV", "Mini Bar", "Room Service", 
  "Ocean View", "City View", "Garden View", "Pool View", "Balcony", 
  "Jacuzzi", "Kitchen Area", "Work Desk", "Spa Access", "Butler Service"
];

export const RoomFilters = ({ onFiltersChange, onClearFilters }) => {
  const [filters, setFilters] = useState({
    roomType: [],
    minPrice: 0,
    maxPrice: 50000,
    maxGuests: 1,
    amenities: []
  });

  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const toggleRoomType = (type) => {
    const updatedTypes = filters.roomType.includes(type)
      ? filters.roomType.filter(t => t !== type)
      : [...filters.roomType, type];
    updateFilters({ roomType: updatedTypes });
  };

  const toggleAmenity = (amenity) => {
    const updatedAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: updatedAmenities });
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      roomType: [],
      minPrice: 0,
      maxPrice: 50000,
      maxGuests: 1,
      amenities: []
    };
    setFilters(clearedFilters);
    onClearFilters();
  };

  const hasActiveFilters = filters.roomType.length > 0 || filters.minPrice > 0 || 
    filters.maxPrice < 50000 || filters.maxGuests > 1 || filters.amenities.length > 0;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Rooms
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden"
          >
            {isOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className={`space-y-6 ${!isOpen && 'hidden md:block'}`}>
        {/* Room Type Filter */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Room Type</Label>
          <div className="space-y-2">
            {roomTypes.map(type => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={filters.roomType.includes(type)}
                  onCheckedChange={() => toggleRoomType(type)}
                />
                <Label htmlFor={type} className="text-sm cursor-pointer">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range Filter */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Price Range (KES/night)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minPrice" className="text-xs text-muted-foreground">
                Min Price
              </Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="0"
                value={filters.minPrice || ""}
                onChange={(e) => updateFilters({ minPrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">
                Max Price
              </Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="50000"
                value={filters.maxPrice || ""}
                onChange={(e) => updateFilters({ maxPrice: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Guests Filter */}
        <div>
          <Label htmlFor="guests" className="text-sm font-medium mb-3 block">
            Maximum Guests
          </Label>
          <Select 
            value={filters.maxGuests.toString()} 
            onValueChange={(value) => updateFilters({ maxGuests: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amenities Filter */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Amenities</Label>
          <div className="flex flex-wrap gap-2">
            {amenities.map(amenity => (
              <Badge
                key={amenity}
                variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleAmenity(amenity)}
              >
                {amenity}
              </Badge>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="w-full"
            size="sm"
          >
            Clear All Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
};