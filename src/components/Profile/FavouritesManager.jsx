import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, UtensilsCrossed, BedDouble, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FavouritesManager() {
  const favFoods = [
    { id: '1', name: 'Grilled Salmon', price: 1500, category: 'Mains', image: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=200' },
    { id: '2', name: 'Chocolate Lava Cake', price: 800, category: 'Desserts', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200' }
  ];

  const favRooms = [
    { id: '2', type: 'Deluxe Suite', price: 12000, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200' }
  ];

  const removeFavorite = (id) => {
    toast.success('Removed from favorites');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          My Favorites
        </CardTitle>
        <CardDescription>Items and rooms you've saved for later</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="food">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="food">Food Items ({favFoods.length})</TabsTrigger>
            <TabsTrigger value="rooms">Rooms ({favRooms.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="food" className="space-y-4 mt-6">
            {favFoods.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{item.category}</Badge>
                    <span className="text-sm font-semibold text-primary">KES {item.price}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm"><Link to="/menu">Order Now</Link></Button>
                  <Button variant="destructive" size="sm" onClick={() => removeFavorite(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {favFoods.length === 0 && <p className="text-center py-8 text-muted-foreground">No favorite food items yet</p>}
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4 mt-6">
            {favRooms.map((room) => (
              <div key={room.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <img src={room.image} alt={room.type} className="w-20 h-20 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{room.type}</p>
                  <span className="text-sm font-semibold text-primary">KES {room.price.toLocaleString()}/night</span>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm"><Link to={`/rooms/${room.id}`}>View Details</Link></Button>
                  <Button variant="destructive" size="sm" onClick={() => removeFavorite(room.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {favRooms.length === 0 && <p className="text-center py-8 text-muted-foreground">No favorite rooms yet</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
