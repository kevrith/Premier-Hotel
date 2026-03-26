import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function FavoritesPanel({ onAddToCart, className }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_favorites')
        .select(`
          id,
          menu_item_id,
          customizations,
          added_at,
          menu_item:menu_items (
            name,
            description,
            price_kes,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your favorites',
          variant: 'destructive'
        });
      } else {
        setFavorites(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from('customer_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to remove favorite',
          variant: 'destructive'
        });
      } else {
        setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
        toast({
          title: 'Removed',
          description: 'Item removed from favorites'
        });
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const addFavoriteToCart = (favorite) => {
    const menuItem = {
      id: favorite.menu_item_id,
      ...favorite.menu_item
    };
    
    onAddToCart(menuItem, 1, favorite.customizations);
    toast({
      title: 'Added to Cart',
      description: `${favorite.menu_item.name} added to your order`
    });
  };

  if (!user) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Heart className="h-4 w-4 mr-2" />
            Favorites
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Your Favorites</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-center">
              Please sign in to view your favorites
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("relative", className)}>
          <Heart className="h-4 w-4 mr-2" />
          Favorites
          {favorites.length > 0 && (
            <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0">
              {favorites.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your Favorites</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Heart className="h-16 w-16 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No favorites yet</p>
              <p className="text-sm text-muted-foreground">
                Start adding items to your favorites!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center space-x-3 p-3">
                    {favorite.menu_item?.image_url && (
                      <img
                        src={favorite.menu_item.image_url}
                        alt={favorite.menu_item.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {favorite.menu_item?.name}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {favorite.menu_item?.description}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        KES {favorite.menu_item?.price_kes?.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Button
                        size="sm"
                        onClick={() => addFavoriteToCart(favorite)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFavorite(favorite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {favorite.customizations && Object.keys(favorite.customizations).length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(favorite.customizations).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}