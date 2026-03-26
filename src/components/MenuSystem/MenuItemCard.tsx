import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Clock, Flame, Leaf, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import ItemCustomizationModal from './ItemCustomizationModal';
import type { MenuItem } from '@/types';

const dietaryIcons = {
  vegetarian: { icon: Leaf, color: 'text-green-500', label: 'Vegetarian' },
  vegan: { icon: Leaf, color: 'text-green-600', label: 'Vegan' },
  'gluten-free': { icon: Flame, color: 'text-orange-500', label: 'Gluten Free' },
  'dairy-free': { icon: Leaf, color: 'text-blue-500', label: 'Dairy Free' },
  spicy: { icon: Flame, color: 'text-red-500', label: 'Spicy' }
};

export default function MenuItemCard({
  item,
  quantity = 0,
  onAddToCart,
  onAddToFavorites,
  isFavorite = false,
  className
}: {
  item: MenuItem;
  quantity?: number;
  onAddToCart: (item: MenuItem, quantity: number, customizations: any) => void;
  onAddToFavorites?: (itemId: string) => void;
  isFavorite?: boolean;
  className?: string;
}) {
  const [showCustomization, setShowCustomization] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);

  const handleAddToCart = (customizations: any) => {
    onAddToCart(item, itemQuantity, customizations);
    setItemQuantity(1);
    setShowCustomization(false);
  };

  return (
    <Card className={cn(
      "group hover:shadow-elegant transition-all duration-300 overflow-hidden",
      !item.is_available && "opacity-60",
      className
    )}>
      {/* Item Image */}
      <div className="relative overflow-hidden">
        <img
          src={item.image_url || '/placeholder-food.jpg'}
          alt={item.name}
          className="w-full h-48 sm:h-56 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex gap-1">
          {item.popular && (
            <Badge className="bg-gradient-gold text-primary text-xs px-2 py-1">
              Popular
            </Badge>
          )}
          {!item.available && (
            <Badge variant="destructive" className="text-xs px-2 py-1">
              Unavailable
            </Badge>
          )}
        </div>
        
        {/* Favorite Button */}
        {onAddToFavorites && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-2 right-2 bg-background/80 backdrop-blur-sm",
              isFavorite ? "text-red-500" : "text-muted-foreground"
            )}
            onClick={() => onAddToFavorites(item.id)}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight font-semibold">
              {item.name}
            </CardTitle>
            <CardDescription className="text-sm line-clamp-2 mt-1">
              {item.description}
            </CardDescription>
          </div>
          <div className="flex items-center justify-end sm:justify-start">
            <span className="text-xl font-bold text-primary">
              KES {(item.price || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Item Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {item.preparation_time && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{item.preparation_time} min</span>
            </div>
          )}
          {quantity > 0 && (
            <div className="flex items-center gap-1 text-primary font-medium">
              <span className="text-sm">In Cart:</span>
              <span className="bg-primary/10 px-2 py-1 rounded-full text-sm">
                {quantity}
              </span>
            </div>
          )}
        </div>

        {/* Dietary Info - Simplified for now */}
        {item.ingredients && item.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Ingredients:</span>
            {item.ingredients.slice(0, 3).map((ingredient: string, index: number) => (
              <Badge key={`${ingredient}-${index}`} variant="outline" className="text-xs">
                {ingredient}
              </Badge>
            ))}
            {item.ingredients.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.ingredients.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Add to Cart Button */}
        {item.available ? (
          <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
            <DialogTrigger asChild>
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customize Your Order</DialogTitle>
                <DialogDescription>
                  Make it your way! Add customizations to your order.
                </DialogDescription>
              </DialogHeader>
              <ItemCustomizationModal
                item={item}
                quantity={itemQuantity}
                onQuantityChange={setItemQuantity}
                onAddToCart={handleAddToCart}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Button className="w-full" size="sm" disabled>
            Currently Unavailable
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
