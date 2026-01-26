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
import CustomerOrderDialog, { CustomerInfo } from '@/components/MenuSystem/CustomerOrderDialog';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import useCartStore from '@/stores/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import menuService from '@/lib/api/services/menuService';
import { ordersApi } from '@/lib/api/orders';
import type { MenuItem } from '@/types';

// Mock menu data - will be replaced with API call
const mockMenuData = [
  {
    id: '1',
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon with herbs and lemon butter',
    price: 1200,
    category: 'mains',
    available: true,
    preparation_time: 25,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=400',
    ingredients: ['Salmon', 'Herbs', 'Lemon', 'Butter'],
    customization_options: [
      { name: 'Lemon', options: ['Extra', 'Normal', 'None'], required: false, additional_cost: 50 },
      { name: 'Butter', options: ['With', 'Without'], required: false }
    ]
  },
  {
    id: '2',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella and basil',
    price: 950,
    category: 'mains',
    available: true,
    preparation_time: 20,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
    ingredients: ['Dough', 'Tomato Sauce', 'Mozzarella', 'Basil'],
    customization_options: [
      { name: 'Cheese', options: ['Extra', 'Normal'], required: false, additional_cost: 150 },
      { name: 'Toppings', options: ['Pepperoni', 'Mushrooms', 'None'], required: false, additional_cost: 200 }
    ]
  },
  {
    id: '3',
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with Caesar dressing and croutons',
    price: 650,
    category: 'starters',
    available: true,
    preparation_time: 10,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
    ingredients: ['Romaine Lettuce', 'Caesar Dressing', 'Croutons', 'Parmesan'],
    customization_options: []
  },
  {
    id: '4',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten center',
    price: 550,
    category: 'desserts',
    available: true,
    preparation_time: 15,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400',
    ingredients: ['Chocolate', 'Flour', 'Sugar', 'Eggs'],
    customization_options: [
      { name: 'Ice Cream', options: ['Vanilla', 'Chocolate', 'None'], required: false, additional_cost: 100 }
    ]
  },
  {
    id: '5',
    name: 'Mango Smoothie',
    description: 'Fresh mango blended with yogurt and honey',
    price: 450,
    category: 'beverages',
    available: true,
    preparation_time: 5,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400',
    ingredients: ['Mango', 'Yogurt', 'Honey'],
    customization_options: []
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
  const { user, isAuthenticated, role } = useAuth();
  const { addItem, items: cartItems, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();

  // Check if user is staff (should stay on menu after order)
  const isStaff = role && ['waiter', 'chef', 'manager', 'admin'].includes(role);

  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuData);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>(mockMenuData);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const response = await menuService.getAllMenuItems();
        if (response && response.length > 0) {
          // Transform API response to match frontend types
          const transformedItems = response.map(item => ({
            ...item,
            // Map backend field names to frontend expectations
            price: parseFloat(item.base_price) || 0, // backend uses base_price, frontend expects price
            available: item.is_available ?? item.available ?? true, // handle both field names
            // Ensure other fields exist
            preparation_time: item.preparation_time || 20,
            ingredients: item.ingredients || [],
            customization_options: item.customization_options || []
          }));
          setMenuItems(transformedItems);
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

  // Clear invalid cart items when menu loads
  useEffect(() => {
    if (menuItems.length > 0 && cartItems.length > 0) {
      const invalidItems = cartItems.filter(cartItem => {
        // Real UUIDs are 36 characters, mock IDs are short like '1', '2'
        const isValidUUID = cartItem.itemId && cartItem.itemId.length >= 32;
        const existsInMenu = menuItems.some(menuItem => menuItem.id === cartItem.itemId);
        return !isValidUUID || !existsInMenu;
      });

      if (invalidItems.length > 0) {
        console.warn('Found invalid cart items, clearing them:', invalidItems);
        // Remove invalid items from cart
        invalidItems.forEach(item => removeItem(item.id));
        if (invalidItems.length === cartItems.length) {
          toast.error('Your cart was cleared because it contained outdated items. Please add items again.');
        } else {
          toast(`${invalidItems.length} outdated item(s) removed from cart`);
        }
      }
    }
  }, [menuItems]); // Only run when menu items change

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
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'prep-time':
        filtered.sort((a, b) => (a.preparation_time || 0) - (b.preparation_time || 0));
        break;
      default:
        break;
    }

    setFilteredItems(filtered);
  }, [selectedCategory, searchQuery, sortBy, menuItems]);

  const handleAddToCart = (item: MenuItem, quantity: number, customizations: any) => {
    console.log('handleAddToCart called with:', { item, quantity, customizations });

    // Transform customizations object to array format expected by cart
    const customizationsArray = customizations && typeof customizations === 'object'
      ? Object.entries(customizations).map(([key, value]) => ({
          id: key,
          name: key,
          value: value,
          priceModifier: 0 // TODO: Calculate from customization options
        }))
      : [];

    const cartItem = {
      id: `${item.id}-${Date.now()}`,
      itemId: item.id,
      name: item.name,
      basePrice: item.price || 0,
      quantity,
      customizations: customizationsArray,
      specialInstructions: customizations?.special_instructions || '',
      subtotal: (item.price || 0) * quantity
    };

    console.log('Adding to cart:', cartItem);
    addItem(cartItem);

    toast.success(`${item.name} added to cart!`);
  };

  const handleAddToFavorites = (itemId: string) => {
    if (favorites.includes(itemId)) {
      setFavorites(favorites.filter(id => id !== itemId));
      toast('Removed from favorites');
    } else {
      setFavorites([...favorites, itemId]);
      toast.success('Added to favorites!');
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Check if user is authenticated
    if (!user || !isAuthenticated) {
      toast.error('Please login to complete your order');
      navigate('/login', { state: { from: '/menu' } });
      return;
    }

    // Show customer info dialog
    setShowCustomerDialog(true);
  };

  const handleCustomerOrderSubmit = async (customerInfo: CustomerInfo) => {
    setIsCreatingOrder(true);
    try {
      // Validate cart items against current menu
      // Check if items have valid UUIDs (real database IDs are 36-char UUIDs)
      const validCartItems = cartItems.filter(item => {
        // Real UUIDs are 36 characters, mock IDs are short like '1', '2'
        const isValidUUID = item.itemId && item.itemId.length >= 32;
        // Also check if item exists in current menu
        const existsInMenu = menuItems.some(menuItem => menuItem.id === item.itemId);

        if (!isValidUUID || !existsInMenu) {
          console.warn(`Skipping invalid cart item: ${item.name} (ID: ${item.itemId})`);
          return false;
        }
        return true;
      });

      if (validCartItems.length === 0) {
        toast.error('Your cart contains invalid items. Please clear your cart and add items again from the menu.');
        clearCart();
        setShowCustomerDialog(false);
        setIsCreatingOrder(false);
        return;
      }

      if (validCartItems.length < cartItems.length) {
        toast.error(`${cartItems.length - validCartItems.length} item(s) were removed from your order because they no longer exist in the menu.`);
      }

      // Prepare order items - match backend OrderItem schema exactly
      const orderItems = validCartItems.map(item => ({
        menu_item_id: item.itemId,
        name: item.name,
        quantity: Math.max(1, item.quantity), // Ensure quantity is at least 1
        price: item.basePrice, // Backend expects Decimal, will be converted by API
        customizations: item.customizations ?
          item.customizations.reduce((acc, cust) => {
            acc[cust.name] = cust.value;
            return acc;
          }, {} as Record<string, any>) : {},
        special_instructions: item.specialInstructions || ''
      }));

      // Determine location and location_type based on order type
      let location = '';
      let locationType: 'table' | 'room' = 'table';

      if (customerInfo.orderType === 'room_service') {
        location = customerInfo.roomNumber || '';
        locationType = 'room';
      } else if (customerInfo.orderType === 'dine_in') {
        location = customerInfo.tableNumber || '';
        locationType = 'table';
      } else {
        location = 'Takeaway';
        locationType = 'table';
      }

      // Create order via API
      // NOTE: payment_method removed - payment happens at bill settlement, not order creation
      const orderData = {
        location,
        location_type: locationType,
        items: orderItems,
        special_instructions: `Customer: ${customerInfo.customerName}, Phone: ${customerInfo.customerPhone}`,
        // Only include customer fields if they have values
        ...(customerInfo.customerName && { customer_name: customerInfo.customerName }),
        ...(customerInfo.customerPhone && { customer_phone: customerInfo.customerPhone }),
        order_type: customerInfo.orderType
      };

      console.log('Creating order:', orderData);

      const createdOrder = await ordersApi.create(orderData as any);

      // Clear cart
      clearCart();

      // Close dialog
      setShowCustomerDialog(false);

      // Different flow for staff vs customers
      if (isStaff) {
        // Staff: stay on menu for creating more orders
        toast.success(
          `Order ${createdOrder.order_number} created successfully! Ready to take another order.`,
          { duration: 5000, icon: '✅' }
        );
      } else {
        // Customers: navigate to My Orders to track their order
        toast.success(
          `Order ${createdOrder.order_number} placed successfully!`,
          { duration: 4000, icon: '✅' }
        );
        navigate('/my-orders');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.detail || error.message || 'Failed to create order. Please try again.');
    } finally {
      setIsCreatingOrder(false);
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
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-base"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Sort Dropdown */}
                  <div className="flex-1 min-w-0">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full">
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
                  </div>

                  {/* Filters Toggle */}
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full sm:w-auto"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {/* Additional Filters */}
                {showFilters && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm font-medium mb-3">Dietary Preferences</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="text-xs">Vegetarian</Button>
                      <Button variant="outline" size="sm" className="text-xs">Vegan</Button>
                      <Button variant="outline" size="sm" className="text-xs">Gluten-Free</Button>
                      <Button variant="outline" size="sm" className="text-xs">Dairy-Free</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
              <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b border-border">
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-primary transition-colors"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddToCart}
                    onAddToFavorites={handleAddToFavorites}
                    isFavorite={favorites.includes(item.id)}
                    quantity={cartItems.filter(ci => ci.itemId === item.id).reduce((sum, ci) => sum + ci.quantity, 0)}
                    className="h-full"
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="text-muted-foreground mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-foreground">No items found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Favorites Panel */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="sticky top-24 space-y-6">
              {/* Mobile Favorites Toggle */}
              <div className="lg:hidden">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full justify-between"
                >
                  <span>Favorites</span>
                  <span className="text-sm text-muted-foreground">
                    {favorites.length} items
                  </span>
                </Button>
              </div>

              {/* Favorites Panel */}
              <div className={`${showFilters && !favorites.length ? 'hidden' : ''}`}>
                {user && (
                  <FavouritesPanel
                    onAddToCart={handleAddToCart}
                    className="bg-card rounded-lg border p-4"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Cart Tray */}
      <ShoppingCartTray
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={handleCheckout}
        className=""
      />

      {/* Customer Order Dialog */}
      <CustomerOrderDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onSubmit={handleCustomerOrderSubmit}
        totalAmount={getTotal()}
        itemCount={cartItems.length}
      />
    </div>
  );
}
