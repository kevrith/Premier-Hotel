import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus, Clock, Flame, Leaf, Info } from 'lucide-react';
import { MenuItemType, CartItem } from '@/pages/FoodOrderingPage';
import { OrderCustomization } from './OrderCustomization';

interface MenuItemProps {
  item: MenuItemType;
  onAddToCart: (item: MenuItemType, customizations?: CartItem['customizations']) => void;
  onToggleFavorite: (itemId: string) => void;
  isFavorite: boolean;
  disabled?: boolean;
}

export function MenuItem({
  item,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  disabled = false
}: MenuItemProps) {
  const [showCustomization, setShowCustomization] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasCustomizations =
    item.customization_options?.addons ||
    item.customization_options?.removable_ingredients;

  const handleQuickAdd = () => {
    if (hasCustomizations) {
      setShowCustomization(true);
    } else {
      onAddToCart(item);
    }
  };

  const handleCustomizationConfirm = (customizations: CartItem['customizations']) => {
    onAddToCart(item, customizations);
    setShowCustomization(false);
  };

  return (
    <>
      <Card
        className={`group overflow-hidden transition-all duration-300 hover:shadow-lg ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${isHovered ? 'scale-[1.02]' : ''}`}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden bg-muted">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              🍽️
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className={`absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
              isFavorite ? 'text-red-500' : 'text-gray-400'
            }`}
            disabled={disabled}
          >
            <Heart
              className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`}
            />
          </button>

          {/* Dietary Badges */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
            {item.is_vegetarian && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <Leaf className="h-3 w-3 mr-1" />
                Veg
              </Badge>
            )}
            {item.is_vegan && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <Leaf className="h-3 w-3 mr-1" />
                Vegan
              </Badge>
            )}
            {item.is_gluten_free && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                GF
              </Badge>
            )}
            {item.is_spicy && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                <Flame className="h-3 w-3 mr-1" />
                Spicy
              </Badge>
            )}
          </div>

          {/* Preparation Time */}
          {item.preparation_time && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs">
              <Clock className="h-3 w-3" />
              {item.preparation_time} min
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
              {item.description}
            </p>
          </div>

          {/* Calories & Allergens */}
          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
            {item.calories && (
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {item.calories} cal
              </span>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <span className="truncate">
                Allergens: {item.allergens.join(', ')}
              </span>
            )}
          </div>

          {/* Price and Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-primary">
                KES {item.price.toLocaleString()}
              </p>
              {hasCustomizations && (
                <p className="text-xs text-muted-foreground">Customizable</p>
              )}
            </div>

            <Button
              onClick={handleQuickAdd}
              disabled={disabled || !item.available}
              className="gap-2 transition-all duration-200 hover:scale-105"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {!item.available && (
            <Badge variant="destructive" className="w-full mt-2 justify-center">
              Currently Unavailable
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Customization Modal */}
      {showCustomization && (
        <OrderCustomization
          item={item}
          onConfirm={handleCustomizationConfirm}
          onCancel={() => setShowCustomization(false)}
        />
      )}
    </>
  );
}
