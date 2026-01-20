import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, ShoppingCart, Heart, MapPin, Clock, Flame,
  Leaf, Filter, Star, TrendingUp, ChevronRight
} from 'lucide-react';
import { MenuItem } from '@/components/FoodOrdering/MenuItem';
import { FloatingCart } from '@/components/FoodOrdering/FloatingCart';
import { LocationSelector } from '@/components/FoodOrdering/LocationSelector';
import { OrderTracking } from '@/components/FoodOrdering/OrderTracking';
import { FavoritesPanel } from '@/components/FoodOrdering/FavoritesPanel';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import menuAPI from '@/lib/api/menu';
import ordersAPI from '@/lib/api/orders';

export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  customizations?: {
    addons: string[];
    removals: string[];
    specialInstructions?: string;
  };
}

export interface MenuItemType {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  available: boolean;
  preparation_time?: number;
  calories?: number;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  is_spicy?: boolean;
  allergens?: string[];
  ingredients?: string[];
  customization_options?: {
    addons?: { name: string; price: number }[];
    removable_ingredients?: string[];
  };
}

export default function FoodOrderingPage() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ type: string; number: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFavorites, setShowFavorites] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Back online!');
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('You are offline. Cash payment only.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load menu items
  useEffect(() => {
    fetchMenuItems();
    fetchFavorites();
    fetchActiveOrders();
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('foodCart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }

    const savedLocation = localStorage.getItem('customerLocation');
    if (savedLocation) {
      setSelectedLocation(JSON.parse(savedLocation));
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('foodCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);

      // Fetch menu items from backend API
      const items = await menuAPI.listMenuItems();

      // Transform backend data to match frontend MenuItemType
      const transformedItems: MenuItemType[] = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category,
        image_url: item.image_url,
        available: item.available || item.is_available,
        preparation_time: item.preparation_time,
        calories: item.calories,
        is_vegetarian: item.dietary_info?.is_vegetarian || false,
        is_vegan: item.dietary_info?.is_vegan || false,
        is_gluten_free: item.dietary_info?.is_gluten_free || false,
        is_spicy: item.is_spicy || false,
        allergens: item.allergens || [],
        ingredients: item.ingredients || [],
        customization_options: item.customization_options
      }));

      setMenuItems(transformedItems);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items. Using sample data.');

      // Fallback to sample data if API fails
      const sampleItems: MenuItemType[] = [
        {
          id: '1',
          name: 'Grilled Chicken Breast',
          description: 'Tender grilled chicken breast served with roasted vegetables and herb butter',
          price: 1200,
          category: 'mains',
          image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 25,
          calories: 450,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: true,
          is_spicy: false,
          allergens: [],
          ingredients: ['Chicken breast', 'Olive oil', 'Garlic', 'Rosemary', 'Mixed vegetables'],
          customization_options: {
            addons: [
              { name: 'Extra Vegetables', price: 150 },
              { name: 'Garlic Sauce', price: 50 },
              { name: 'Cheese', price: 100 }
            ],
            removable_ingredients: ['Garlic', 'Rosemary']
          }
        },
        {
          id: '2',
          name: 'Margherita Pizza',
          description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil',
          price: 950,
          category: 'mains',
          image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 20,
          calories: 680,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          is_spicy: false,
          allergens: ['Gluten', 'Dairy'],
          ingredients: ['Pizza dough', 'Tomato sauce', 'Mozzarella', 'Basil', 'Olive oil'],
          customization_options: {
            addons: [
              { name: 'Extra Cheese', price: 150 },
              { name: 'Mushrooms', price: 100 },
              { name: 'Olives', price: 80 },
              { name: 'Pepperoni', price: 200 }
            ],
            removable_ingredients: ['Basil']
          }
        },
        {
          id: '3',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with parmesan, croutons, and Caesar dressing',
          price: 650,
          category: 'starters',
          image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 10,
          calories: 320,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          is_spicy: false,
          allergens: ['Gluten', 'Dairy', 'Eggs'],
          ingredients: ['Romaine lettuce', 'Parmesan', 'Croutons', 'Caesar dressing'],
          customization_options: {
            addons: [
              { name: 'Grilled Chicken', price: 250 },
              { name: 'Bacon', price: 150 },
              { name: 'Extra Parmesan', price: 80 }
            ],
            removable_ingredients: ['Croutons', 'Parmesan']
          }
        },
        {
          id: '4',
          name: 'Spicy Beef Burger',
          description: 'Juicy beef patty with jalapeños, pepper jack cheese, and spicy mayo',
          price: 850,
          category: 'mains',
          image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 18,
          calories: 780,
          is_vegetarian: false,
          is_vegan: false,
          is_gluten_free: false,
          is_spicy: true,
          allergens: ['Gluten', 'Dairy'],
          ingredients: ['Beef patty', 'Burger bun', 'Jalapeños', 'Pepper jack cheese', 'Spicy mayo', 'Lettuce', 'Tomato'],
          customization_options: {
            addons: [
              { name: 'Bacon', price: 150 },
              { name: 'Fried Egg', price: 100 },
              { name: 'Extra Patty', price: 300 },
              { name: 'Onion Rings', price: 120 }
            ],
            removable_ingredients: ['Jalapeños', 'Spicy mayo', 'Lettuce', 'Tomato']
          }
        },
        {
          id: '5',
          name: 'Vegan Buddha Bowl',
          description: 'Quinoa, roasted chickpeas, avocado, mixed greens, and tahini dressing',
          price: 750,
          category: 'mains',
          image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 15,
          calories: 520,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          is_spicy: false,
          allergens: ['Sesame'],
          ingredients: ['Quinoa', 'Chickpeas', 'Avocado', 'Mixed greens', 'Cherry tomatoes', 'Tahini dressing'],
          customization_options: {
            addons: [
              { name: 'Extra Avocado', price: 150 },
              { name: 'Hummus', price: 100 },
              { name: 'Falafel', price: 180 }
            ],
            removable_ingredients: ['Chickpeas', 'Avocado', 'Cherry tomatoes']
          }
        },
        {
          id: '6',
          name: 'Chocolate Lava Cake',
          description: 'Warm chocolate cake with a molten center, served with vanilla ice cream',
          price: 550,
          category: 'desserts',
          image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 12,
          calories: 620,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: false,
          is_spicy: false,
          allergens: ['Gluten', 'Dairy', 'Eggs'],
          ingredients: ['Dark chocolate', 'Butter', 'Eggs', 'Sugar', 'Flour', 'Vanilla ice cream'],
          customization_options: {
            addons: [
              { name: 'Extra Ice Cream', price: 100 },
              { name: 'Whipped Cream', price: 50 },
              { name: 'Chocolate Sauce', price: 50 }
            ]
          }
        },
        {
          id: '7',
          name: 'Fresh Orange Juice',
          description: 'Freshly squeezed orange juice, no added sugar',
          price: 250,
          category: 'beverages',
          image_url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 5,
          calories: 110,
          is_vegetarian: true,
          is_vegan: true,
          is_gluten_free: true,
          is_spicy: false,
          allergens: [],
          ingredients: ['Fresh oranges']
        },
        {
          id: '8',
          name: 'Iced Coffee',
          description: 'Cold brew coffee served over ice with milk',
          price: 300,
          category: 'beverages',
          image_url: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=500&h=300&fit=crop',
          available: true,
          preparation_time: 5,
          calories: 80,
          is_vegetarian: true,
          is_vegan: false,
          is_gluten_free: true,
          is_spicy: false,
          allergens: ['Dairy'],
          ingredients: ['Coffee', 'Ice', 'Milk', 'Sugar (optional)'],
          customization_options: {
            addons: [
              { name: 'Extra Shot', price: 80 },
              { name: 'Vanilla Syrup', price: 50 },
              { name: 'Caramel Syrup', price: 50 },
              { name: 'Oat Milk Instead', price: 60 }
            ]
          }
        }
      ];

      setMenuItems(sampleItems);
      setIsLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      // In production, fetch from database
      const savedFavorites = localStorage.getItem(`favorites_${user.id}`);
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchActiveOrders = async () => {
    if (!user) return;

    try {
      // Fetch active orders from backend API
      const orders = await ordersAPI.getMyOrders();

      // Filter for active orders (not completed or cancelled)
      const activeOrdersList = orders.filter((order: any) =>
        ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
      );

      setActiveOrders(activeOrdersList);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Silently fail - user can still browse menu
    }
  };

  const addToCart = (item: MenuItemType, customizations?: CartItem['customizations']) => {
    const existingItemIndex = cartItems.findIndex(
      cartItem =>
        cartItem.menu_item_id === item.id &&
        JSON.stringify(cartItem.customizations) === JSON.stringify(customizations)
    );

    if (existingItemIndex > -1) {
      // Increase quantity
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex].quantity += 1;
      setCartItems(updatedCart);
    } else {
      // Add new item
      const newCartItem: CartItem = {
        id: `${item.id}_${Date.now()}`,
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url,
        customizations
      };
      setCartItems([...cartItems, newCartItem]);
    }

    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedCart = cartItems.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );
    setCartItems(updatedCart);
  };

  const toggleFavorite = (itemId: string) => {
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter(id => id !== itemId)
      : [...favorites, itemId];

    setFavorites(newFavorites);
    localStorage.setItem(`favorites_${user?.id || 'guest'}`, JSON.stringify(newFavorites));

    toast.success(
      favorites.includes(itemId)
        ? 'Removed from favorites'
        : 'Added to favorites'
    );
  };

  const handleLocationSelect = (location: { type: string; number: string }) => {
    setSelectedLocation(location);
    localStorage.setItem('customerLocation', JSON.stringify(location));
    setShowLocationSelector(false);
    toast.success(`Location set: ${location.type} ${location.number}`);
  };

  const clearCart = () => {
    setCartItems([]);
    toast.success('Cart cleared');
  };

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchesDietary = true;
    if (dietaryFilter.length > 0) {
      matchesDietary = dietaryFilter.every(filter => {
        switch (filter) {
          case 'vegetarian': return item.is_vegetarian;
          case 'vegan': return item.is_vegan;
          case 'gluten_free': return item.is_gluten_free;
          case 'spicy': return item.is_spicy;
          default: return true;
        }
      });
    }

    return matchesSearch && matchesCategory && matchesDietary;
  });

  const categories = [
    { id: 'all', name: 'All Items', icon: '🍽️' },
    { id: 'starters', name: 'Starters', icon: '🥗' },
    { id: 'mains', name: 'Main Course', icon: '🍖' },
    { id: 'desserts', name: 'Desserts', icon: '🍰' },
    { id: 'beverages', name: 'Beverages', icon: '☕' },
  ];

  const totalCartPrice = cartItems.reduce((sum, item) => {
    let itemPrice = item.price;
    if (item.customizations?.addons) {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
      item.customizations.addons.forEach(addonName => {
        const addon = menuItem?.customization_options?.addons?.find(a => a.name === addonName);
        if (addon) itemPrice += addon.price;
      });
    }
    return sum + (itemPrice * item.quantity);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 pb-32">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Order Food</h1>
              <p className="text-muted-foreground">Delicious meals delivered to your location</p>
            </div>

            {isOffline && (
              <Badge variant="destructive" className="text-sm">
                Offline - Cash Only
              </Badge>
            )}
          </div>

          {/* Location Banner */}
          {selectedLocation ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Delivering to</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLocation.type} {selectedLocation.number}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowLocationSelector(true)}>
                  Change
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <p className="font-medium text-orange-900 dark:text-orange-100">
                    Select your location to start ordering
                  </p>
                </div>
                <Button onClick={() => setShowLocationSelector(true)} variant="default">
                  Set Location
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Orders
            </h2>
            <OrderTracking orders={activeOrders} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFavorites ? 'default' : 'outline'}
              onClick={() => setShowFavorites(!showFavorites)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
              Favorites
            </Button>
          </div>

          {/* Dietary Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'vegetarian', label: 'Vegetarian', icon: <Leaf className="h-3 w-3" /> },
              { id: 'vegan', label: 'Vegan', icon: <Leaf className="h-3 w-3" /> },
              { id: 'gluten_free', label: 'Gluten Free', icon: <Filter className="h-3 w-3" /> },
              { id: 'spicy', label: 'Spicy', icon: <Flame className="h-3 w-3" /> },
            ].map(filter => (
              <Badge
                key={filter.id}
                variant={dietaryFilter.includes(filter.id) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => {
                  setDietaryFilter(
                    dietaryFilter.includes(filter.id)
                      ? dietaryFilter.filter(f => f !== filter.id)
                      : [...dietaryFilter, filter.id]
                  );
                }}
              >
                {filter.icon}
                <span className="ml-1">{filter.label}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="flex-col gap-1 py-3">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs">{cat.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Menu Items Grid */}
        {showFavorites ? (
          <FavoritesPanel
            favorites={favorites}
            menuItems={menuItems}
            onAddToCart={addToCart}
            onToggleFavorite={toggleFavorite}
          />
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading delicious options...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No items found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <MenuItem
                key={item.id}
                item={item}
                onAddToCart={addToCart}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.includes(item.id)}
                disabled={!selectedLocation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart */}
      <FloatingCart
        items={cartItems}
        menuItems={menuItems}
        totalPrice={totalCartPrice}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        selectedLocation={selectedLocation}
        onSelectLocation={() => setShowLocationSelector(true)}
        isOffline={isOffline}
      />

      {/* Location Selector Modal */}
      {showLocationSelector && (
        <LocationSelector
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationSelector(false)}
          currentLocation={selectedLocation}
        />
      )}
    </div>
  );
}
