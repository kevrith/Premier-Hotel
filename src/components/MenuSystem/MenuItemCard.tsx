// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Clock, Flame, Leaf, UtensilsCrossed } from 'lucide-react';
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

  const [imgError, setImgError] = useState(false);

  return (
    <Dialog open={showCustomization} onOpenChange={setShowCustomization}>
    <Card
      className={cn(
        "group hover:shadow-elegant transition-all duration-300 overflow-hidden",
        item.available ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : "opacity-60",
        className
      )}
      onClick={() => item.available && setShowCustomization(true)}
    >
      {/* Item Image */}
      <div className="relative overflow-hidden h-44 sm:h-48 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
        {imgError || !item.image_url ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-orange-200 dark:text-orange-800">
            <UtensilsCrossed className="h-10 w-10" />
            <span className="text-xs font-medium text-orange-300 dark:text-orange-700 px-2 text-center line-clamp-1">{item.name}</span>
          </div>
        ) : (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
        
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
            onClick={(e) => { e.stopPropagation(); onAddToFavorites(item.id); }}
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

        {!item.available && (
          <p className="text-xs text-center text-muted-foreground py-1">Currently Unavailable</p>
        )}
      </CardContent>
    </Card>

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
  );
}
