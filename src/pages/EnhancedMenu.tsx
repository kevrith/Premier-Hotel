import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MenuItemCard from '@/components/MenuSystem/MenuItemCard';
import ShoppingCartTray from '@/components/MenuSystem/ShoppingCartTray';
import FavouritesPanel from '@/components/MenuSystem/FavouritesPanel';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import useCartStore from '@/stores/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import menuService from '@/lib/api/services/menuService';

// Mock menu data - will be replaced with API call
const mockMenuData = [
  {
    id: '1',
    name: 'Grilled Salmon',
    name_sw: 'Samaki wa Kuchoma',
    description: 'Fresh Atlantic salmon with herbs and lemon butter',
    description_sw: 'Samaki safi wa Atlantic na viungo',
    category: 'mains',
    base_price: 1200,
    image_url: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=400',
    is_available: true,
    preparation_time: 25,
    dietary_info: ['gluten-free'],
    customizations: [
      { id: '1', name: 'Extra Lemon', price_modifier: 50 },
      { id: '2', name: 'No Butter', price_modifier: 0 }
    ]
  },
  {
    id: '2',
    name: 'Margherita Pizza',
    name_sw: 'Pizza ya Margherita',
    description: 'Classic pizza with fresh mozzarella and basil',
    description_sw: 'Pizza ya kawaida na jibini safi',
    category: 'mains',
    base_price: 950,
    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
    is_available: true,
    preparation_time: 20,
    dietary_info: ['vegetarian'],
    customizations: [
      { id: '3', name: 'Extra Cheese', price_modifier: 150 },
      { id: '4', name: 'Add Pepperoni', price_modifier: 200 }
    ]
  },
  {
    id: '3',
    name: 'Caesar Salad',
    name_sw: 'Saladi ya Caesar',
    description: 'Crisp romaine lettuce with Caesar dressing and croutons',
    description_sw: 'Saladi baridi na dressing',
    category: 'starters',
    base_price: 650,
    image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
    is_available: true,
    preparation_time: 10,
    dietary_info: ['vegetarian'],
    customizations: []
  },
  {
    id: '4',
    name: 'Chocolate Lava Cake',
    name_sw: 'Keki ya Chokoleti',
    description: 'Warm chocolate cake with molten center',
    description_sw: 'Keki ya moto ya chokoleti',
    category: 'desserts',
    base_price: 550,
    image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400',
    is_available: true,
    preparation_time: 15,
    dietary_info: ['vegetarian'],
    customizations: [
      { id: '5', name: 'Add Ice Cream', price_modifier: 100 }
    ]
  },
  {
    id: '5',
    name: 'Mango Smoothie',
    name_sw: 'Smoothie ya Embe',
    description: 'Fresh mango blended with yogurt and honey',
    description_sw: 'Embe safi na yogati',
    category: 'beverages',
    base_price: 450,
    image_url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400',
    is_available: true,
    preparation_time: 5,
    dietary_info: ['vegetarian', 'gluten-free'],
    customizations: []
  }
];

const categories = [
  { id: 'all', name: 'All Items', name_sw: 'Vyote' },
  { id: 'starters', name: 'Starters', name_sw: 'Viamsha Kinywa' },
  { id: 'mains', name: 'Main Courses', name_sw: 'Vyakula Vikuu' },
  { id: 'desserts', name: 'Desserts', name_sw: 'Vitamu' },
  { id: 'beverages', name: 'Beverages', name_sw: 'Vinywaji' }
];

export default function EnhancedMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, items: cartItems } = useCartStore();

  const [menuItems, setMenuItems] = useState(mockMenuData);
  const [filteredItems, setFilteredItems] = useState(mockMenuData);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const response = await menuService.getAllMenuItems();
        if (response && response.length > 0) {
          setMenuItems(response);
        } else {
          // Fallback to mock data if no items in database
          setMenuItems(mockMenuData);
        }
      } catch (error) {
        console.error('Error fetching menu items:', error);
        toast.error('Failed to load menu, showing sample data');
        setMenuItems(mockMenuData);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Filter items based on category and search
  useEffect(() => {
    let filtered = [...menuItems];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.base_price - b.base_price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.base_price - a.base_price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'prep-time':
        filtered.sort((a, b) => a.preparation_time - b.preparation_time);
        break;
      default:
        break;
    }

    setFilteredItems(filtered);
  }, [selectedCategory, searchQuery, sortBy, menuItems]);

  const handleAddToCart = (item, quantity, customizations) => {
    addItem({
      itemId: item.id,
      name: item.name,
      basePrice: item.base_price,
      quantity,
      customizations: customizations || [],
      specialInstructions: ''
    });

    toast.success(`${item.name} added to cart!`);
  };

  const handleAddToFavorites = (itemId) => {
    if (favorites.includes(itemId)) {
      setFavorites(favorites.filter(id => id !== itemId));
      toast('Removed from favorites');
    } else {
      setFavorites([...favorites, itemId]);
      toast.success('Added to favorites!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-16 mt-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Menu</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Discover our selection of expertly crafted dishes made with the finest ingredients
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <div className="bg-card rounded-lg border p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="price-low">Price (Low to High)</SelectItem>
                    <SelectItem value="price-high">Price (High to Low)</SelectItem>
                    <SelectItem value="prep-time">Preparation Time</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filters Toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Additional Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Dietary Preferences</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">Vegetarian</Button>
                    <Button variant="outline" size="sm">Vegan</Button>
                    <Button variant="outline" size="sm">Gluten-Free</Button>
                    <Button variant="outline" size="sm">Dairy-Free</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
              <TabsList className="w-full justify-start overflow-x-auto">
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id}>
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddToCart}
                    onAddToFavorites={handleAddToFavorites}
                    isFavorite={favorites.includes(item.id)}
                    quantity={cartItems.filter(ci => ci.itemId === item.id).reduce((sum, ci) => sum + ci.quantity, 0)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No items found matching your criteria</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Favorites Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {user && (
                <FavouritesPanel
                  favorites={favorites.map(id => menuItems.find(item => item.id === id)).filter(Boolean)}
                  onRemoveFavorite={handleAddToFavorites}
                  onAddToCart={handleAddToCart}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Cart Tray */}
      <ShoppingCartTray />
    </div>
  );
}
