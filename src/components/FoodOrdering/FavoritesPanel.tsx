import { MenuItemType, CartItem } from '@/pages/FoodOrderingPage';
import { MenuItem } from './MenuItem';
import { Heart } from 'lucide-react';

interface FavoritesPanelProps {
  favorites: string[];
  menuItems: MenuItemType[];
  onAddToCart: (item: MenuItemType, customizations?: CartItem['customizations']) => void;
  onToggleFavorite: (itemId: string) => void;
}

export function FavoritesPanel({
  favorites,
  menuItems,
  onAddToCart,
  onToggleFavorite
}: FavoritesPanelProps) {
  const favoriteItems = menuItems.filter(item => favorites.includes(item.id));

  if (favoriteItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
        <p className="text-muted-foreground">
          Click the heart icon on any dish to add it to your favorites
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500 fill-current" />
          Your Favorites
        </h2>
        <p className="text-muted-foreground">
          {favoriteItems.length} {favoriteItems.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteItems.map(item => (
          <MenuItem
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            onToggleFavorite={onToggleFavorite}
            isFavorite={true}
          />
        ))}
      </div>
    </div>
  );
}
