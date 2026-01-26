import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart, X, Plus, Minus, Trash2, MapPin, CreditCard, Banknote
} from 'lucide-react';
import { CartItem, MenuItemType } from '@/pages/FoodOrderingPage';
import { toast } from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FloatingCartProps {
  items: CartItem[];
  menuItems: MenuItemType[];
  totalPrice: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  selectedLocation: { type: string; number: string } | null;
  onSelectLocation: () => void;
  isOffline: boolean;
}

export function FloatingCart({
  items,
  menuItems,
  totalPrice,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  selectedLocation,
  onSelectLocation,
  isOffline
}: FloatingCartProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const getItemPrice = (item: CartItem) => {
    let price = item.price;

    if (item.customizations?.addons) {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
      item.customizations.addons.forEach(addonName => {
        const addon = menuItem?.customization_options?.addons?.find(a => a.name === addonName);
        if (addon) price += addon.price;
      });
    }

    return price;
  };

  const handleCheckout = async (paymentMethod: 'online' | 'cash') => {
    if (!selectedLocation) {
      toast.error('Please select your location first');
      onSelectLocation();
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (isOffline && paymentMethod === 'online') {
      toast.error('You are offline. Please use cash payment.');
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare order data
      const orderData = {
        customer_id: user.id,
        location: selectedLocation.number,
        location_type: selectedLocation.type,
        items: items.map(item => ({
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: item.quantity,
          price: getItemPrice(item),
          customizations: item.customizations
        })),
        subtotal: totalPrice,
        tax: totalPrice * 0.16, // 16% VAT
        total_amount: totalPrice * 1.16,
        payment_method: paymentMethod,
        special_instructions: items
          .map(item => item.customizations?.specialInstructions)
          .filter(Boolean)
          .join('; '),
        status: 'pending'
      };

      if (isOffline) {
        // Save to localStorage for offline ordering
        const offlineOrders = JSON.parse(localStorage.getItem('offlineOrders') || '[]');
        offlineOrders.push({
          ...orderData,
          id: `offline_${Date.now()}`,
          created_at: new Date().toISOString(),
          offline: true
        });
        localStorage.setItem('offlineOrders', JSON.stringify(offlineOrders));

        toast.success('Order saved! Will be sent when you\'re back online.');
        onClearCart();
        setIsExpanded(false);
      } else {
        // Create order in database
        const { data, error } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;

        if (paymentMethod === 'online') {
          // Redirect to payment page
          navigate(`/payment/${data.id}`);
        } else {
          // For cash payment, just confirm the order
          toast.success('Order placed successfully! Pay on delivery.');
          onClearCart();
          setIsExpanded(false);
          navigate('/orders');
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Collapsed Cart (Semi-transparent Tray) */}
      {!isExpanded && (
        <div
          className="fixed bottom-16 xs:bottom-20 sm:bottom-6 right-2 xs:right-4 sm:right-6 z-40 cursor-pointer animate-in slide-in-from-bottom-4 duration-300"
          onClick={() => setIsExpanded(true)}
        >
          <Card className="bg-primary/80 backdrop-blur-md border-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg">
            <CardContent className="p-2 xs:p-3 sm:p-4 pr-3 xs:pr-4 sm:pr-6">
              <div className="flex items-center gap-1 xs:gap-2 sm:gap-4 text-primary-foreground">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8" />
                  <Badge className="absolute -top-1 -right-1 xs:-top-2 xs:-right-2 h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {itemCount}
                  </Badge>
                </div>
                <div>
                  <p className="font-semibold text-xs xs:text-sm sm:text-lg">View Cart</p>
                  <p className="text-xs xs:text-xs sm:text-sm opacity-90">
                    KES {totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expanded Cart (Full View) */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md h-[100vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 rounded-none">
            <CardHeader className="border-b p-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="truncate">Cart ({itemCount})</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  {items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearCart}
                      className="text-destructive hover:text-destructive touch-button text-xs px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      <span className="hidden xs:inline">Clear</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                    className="touch-button h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Location Display */}
              {selectedLocation && (
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">Delivering to</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedLocation.type} {selectedLocation.number}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onSelectLocation} className="touch-button flex-shrink-0 text-xs px-2">
                      Change
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Cart Items */}
              <div className="space-y-2">
                {items.map((item) => {
                  const itemPrice = getItemPrice(item);
                  const totalItemPrice = itemPrice * item.quantity;

                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-2">
                        <div className="flex gap-2">
                          {/* Item Image */}
                          {item.image_url && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate text-xs">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              KES {itemPrice.toLocaleString()} each
                            </p>

                            {/* Customizations */}
                            {(item.customizations?.addons && item.customizations.addons.length > 0) && (
                              <div className="mt-1">
                                <p className="text-xs text-muted-foreground truncate">
                                  Add: {item.customizations.addons.join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 touch-button"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="font-semibold w-6 text-center text-xs">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 touch-button"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="text-right">
                                <p className="font-bold text-primary text-xs">
                                  KES {totalItemPrice.toLocaleString()}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveItem(item.id)}
                                  className="h-5 text-xs text-destructive hover:text-destructive touch-button px-1"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>

            <CardFooter className="border-t p-3 bg-muted/30 flex-col gap-2 flex-shrink-0 pb-safe">
              {/* Price Summary */}
              <div className="w-full space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Subtotal</span>
                  <span>KES {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>VAT (16%)</span>
                  <span>KES {(totalPrice * 0.16).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold border-t pt-1">
                  <span>Total</span>
                  <span className="text-primary">
                    KES {(totalPrice * 1.16).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 touch-button text-xs h-10"
                  onClick={() => handleCheckout('cash')}
                  disabled={isProcessing || !selectedLocation}
                >
                  <Banknote className="h-3 w-3" />
                  Pay Cash
                </Button>
                <Button
                  className="w-full gap-2 touch-button text-xs h-10"
                  onClick={() => handleCheckout('online')}
                  disabled={isProcessing || !selectedLocation || isOffline}
                >
                  <CreditCard className="h-3 w-3" />
                  {isOffline ? 'Offline' : 'Pay Now'}
                </Button>
              </div>

              {!selectedLocation && (
                <p className="text-xs text-center text-destructive">
                  Please select your location to checkout
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
