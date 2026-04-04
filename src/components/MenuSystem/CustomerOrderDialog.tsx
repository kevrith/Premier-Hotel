import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User, Phone, MapPin, Utensils, Sparkles } from 'lucide-react';
import { CustomerAutocomplete } from '@/components/FoodOrdering/CustomerAutocomplete';
import customersApi, { CustomerSearchResult } from '@/lib/api/customers';
import { tablesAPI, RestaurantTable } from '@/lib/api/tables';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useTaxSettings } from '@/hooks/useTaxSettings';

interface CustomerOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (customerInfo: CustomerInfo) => void;
  totalAmount: number;
  itemCount: number;
  initialData?: {
    customerName?: string;
    customerPhone?: string;
    location?: string;
    locationType?: 'table' | 'room';
  };
}

export interface CustomerInfo {
  customerName: string;
  customerPhone: string;
  orderType: 'room_service' | 'walk_in' | 'dine_in';
  roomNumber?: string;
  tableNumber?: string;
  // NOTE: paymentMethod removed - payment happens at bill settlement, not order creation
}

export default function CustomerOrderDialog({
  open,
  onOpenChange,
  onSubmit,
  totalAmount,
  itemCount,
  initialData
}: CustomerOrderDialogProps) {
  const { role } = useAuth();
  const { config, calculateTax } = useTaxSettings();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'room_service' | 'walk_in' | 'dine_in'>('dine_in');
  const [roomNumber, setRoomNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastTableNumber, setLastTableNumber] = useState('');
  const [availableTables, setAvailableTables] = useState<RestaurantTable[]>([]);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  const taxBreakdown = calculateTax(totalAmount);

  // Check if user is a waiter/staff
  const isStaff = role === 'waiter' || role === 'admin' || role === 'chef' || role === 'manager';

  // Load last used table number from localStorage
  useEffect(() => {
    const savedTableNumber = localStorage.getItem('lastTableNumber');
    if (savedTableNumber) {
      setLastTableNumber(savedTableNumber);
    }
  }, []);

  // Load restaurant tables when dialog opens
  useEffect(() => {
    if (open) {
      tablesAPI.getAll()
        .then(tables => setAvailableTables(tables))
        .catch(() => setAvailableTables([]));
    }
  }, [open]);

  // Pre-populate form with initial data from waiter dashboard
  useEffect(() => {
    if (open && initialData && !hasLoadedInitialData) {
      console.log('CustomerOrderDialog: Received initialData:', initialData);
      console.log('CustomerOrderDialog: Current state before update:', { customerName, customerPhone, orderType, tableNumber, roomNumber });
      
      // Set customer info
      if (initialData.customerName) {
        setCustomerName(initialData.customerName);
      }
      if (initialData.customerPhone) {
        setCustomerPhone(initialData.customerPhone);
      }
      
      // Set location info - set order type FIRST, then location
      if (initialData.location && initialData.locationType) {
        console.log('CustomerOrderDialog: Processing location:', initialData.location, 'type:', initialData.locationType);
        
        if (initialData.locationType === 'room') {
          setOrderType('room_service');
          // Extract room number from location (e.g., "Room 201" -> "201")
          const roomMatch = initialData.location.match(/\d+/);
          if (roomMatch) {
            console.log('Setting room number:', roomMatch[0]);
            setRoomNumber(roomMatch[0]);
          } else {
            // If no number found, use the whole location after "Room "
            const roomNum = initialData.location.replace(/^Room\s+/i, '');
            console.log('Setting room number (no regex match):', roomNum);
            setRoomNumber(roomNum);
          }
        } else if (initialData.locationType === 'table') {
          setOrderType('dine_in');
          // Extract table number/name from location (e.g., "Table 12" -> "12" or "Table dubai" -> "dubai")
          const tableMatch = initialData.location.match(/\d+/);
          if (tableMatch) {
            console.log('Setting table number (numeric):', tableMatch[0]);
            setTableNumber(tableMatch[0]);
          } else {
            // If no number found, use the whole location after "Table "
            const tableNum = initialData.location.replace(/^Table\s+/i, '');
            console.log('Setting table number (text):', tableNum);
            setTableNumber(tableNum);
          }
        }
      }
      
      setHasLoadedInitialData(true);
      // Clear the session storage after using it
      sessionStorage.removeItem('orderContext');
    }
    
    // Reset flag when dialog closes
    if (!open) {
      setHasLoadedInitialData(false);
    }
  }, [open, initialData, hasLoadedInitialData]);

  // Debug: Track table number changes
  useEffect(() => {
    console.log('CustomerOrderDialog: tableNumber changed to:', tableNumber);
  }, [tableNumber]);

  // Auto-populate customer data when phone number is entered
  useEffect(() => {
    const loadCustomerByPhone = async () => {
      // Only auto-load if phone number looks valid (at least 10 digits)
      const cleanPhone = customerPhone.replace(/\s/g, '');
      if (cleanPhone.length < 10) return;

      setIsLoadingCustomer(true);
      try {
        const customer = await customersApi.getCustomerByPhone(customerPhone);
        if (customer) {
          // Auto-populate name if not already filled
          if (!customerName || customerName.trim() === '') {
            setCustomerName(customer.customer_name);
          }

          // Show notification for returning customer
          if (customer.total_orders > 0) {
            toast.success(
              `Welcome back, ${customer.customer_name}! ${customer.total_orders} previous order${customer.total_orders !== 1 ? 's' : ''}`,
              { duration: 3000, icon: '👋' }
            );
          }

          // Auto-populate preferred table if available and field is empty (but don't override initialData)
          if (customer.preferred_table && !tableNumber && orderType === 'dine_in' && !initialData) {
            setTableNumber(customer.preferred_table);
          }
        }
      } catch (error) {
        console.error('Error loading customer:', error);
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    // Debounce the phone lookup
    const timeoutId = setTimeout(loadCustomerByPhone, 500);
    return () => clearTimeout(timeoutId);
  }, [customerPhone]);

  const handleCustomerSelect = async (customer: CustomerSearchResult) => {
    // Auto-populate all fields from customer history
    setCustomerName(customer.customer_name);
    setCustomerPhone(customer.customer_phone);

    // Load detailed customer info
    try {
      const details = await customersApi.getCustomerDetails(customer.id);

      // Auto-populate preferred table if available
      if (details.preferred_table && orderType === 'dine_in') {
        setTableNumber(details.preferred_table);
      }

      toast.success(
        `Loaded ${customer.customer_name}'s details (${customer.total_orders} previous orders)`,
        { icon: '✨' }
      );
    } catch (error) {
      console.error('Error loading customer details:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    // Phone validation - required only for customers, optional for staff
    if (!isStaff) {
      // Customer must provide phone
      if (!customerPhone.trim()) {
        newErrors.customerPhone = 'Phone number is required';
      } else if (!/^(\+254|0)[17]\d{8}$/.test(customerPhone.replace(/\s/g, ''))) {
        newErrors.customerPhone = 'Invalid phone number (e.g., 0700000000 or +254700000000)';
      }
    } else {
      // Staff: phone is optional, but if provided must be valid
      if (customerPhone.trim() && !/^(\+254|0)[17]\d{8}$/.test(customerPhone.replace(/\s/g, ''))) {
        newErrors.customerPhone = 'Invalid phone number format';
      }
    }

    if (orderType === 'room_service' && !roomNumber.trim()) {
      newErrors.roomNumber = 'Room number is required for room service';
    }

    if (orderType === 'dine_in' && !tableNumber.trim()) {
      newErrors.tableNumber = 'Table number is required for dine-in';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const customerInfo: CustomerInfo = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      orderType,
      ...(orderType === 'room_service' && { roomNumber: roomNumber.trim() }),
      ...(orderType === 'dine_in' && { tableNumber: tableNumber.trim() })
    };

    // Save table number for next time
    if (orderType === 'dine_in' && tableNumber.trim()) {
      localStorage.setItem('lastTableNumber', tableNumber.trim());
    }

    // Update customer history if phone is provided
    if (customerPhone.trim()) {
      try {
        await customersApi.upsertCustomer({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          order_amount: totalAmount
        });
      } catch (error) {
        console.error('Error updating customer history:', error);
        // Don't block order submission if history update fails
      }
    }

    onSubmit(customerInfo);

    // Reset form
    setCustomerName('');
    setCustomerPhone('');
    setRoomNumber('');
    setTableNumber('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            Customer Order Details
          </DialogTitle>
          <DialogDescription>
            Enter customer information to complete this order
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{itemCount} items (Subtotal)</span>
            <span className="font-medium">KES {Math.round(taxBreakdown.base).toLocaleString()}</span>
          </div>
          {config.vat_enabled && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({(config.vat_rate * 100).toFixed(0)}%)</span>
              <span className="font-medium">KES {Math.round(taxBreakdown.vat).toLocaleString()}</span>
            </div>
          )}
          {config.tourism_levy_enabled && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tourism Levy ({(config.tourism_levy_rate * 100).toFixed(0)}%)</span>
              <span className="font-medium">KES {Math.round(taxBreakdown.levy).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm sm:text-base font-bold border-t pt-2">
            <span>Total Amount{(config.vat_enabled || config.tourism_levy_enabled) && config.tax_inclusive ? ' (incl. tax)' : ''}</span>
            <span className="text-primary">KES {Math.round(taxBreakdown.total).toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          {/* Customer Name - with Autocomplete for staff */}
          {isStaff ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                <span>Customer Name *</span>
                <Sparkles className="h-3 w-3 text-yellow-500" />
              </div>
              <CustomerAutocomplete
                value={customerName}
                phoneValue={customerPhone}
                onValueChange={(name, phone) => {
                  setCustomerName(name);
                  if (phone) setCustomerPhone(phone);
                }}
                onCustomerSelect={handleCustomerSelect}
                label=""
                placeholder="Start typing name (auto-suggests frequent customers)..."
                error={errors.customerName}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="customerName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Name *
              </Label>
              <Input
                id="customerName"
                placeholder="John Doe"
                value={customerName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                className={errors.customerName ? 'border-red-500' : ''}
              />
              {errors.customerName && (
                <p className="text-sm text-red-500">{errors.customerName}</p>
              )}
            </div>
          )}

          {/* Customer Phone */}
          <div className="space-y-2">
            <Label htmlFor="customerPhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number {!isStaff && '*'}
              {isLoadingCustomer && (
                <span className="text-xs text-muted-foreground">(checking...)</span>
              )}
            </Label>
            <Input
              id="customerPhone"
              placeholder="+254700000000 or 0700000000"
              value={customerPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
              className={errors.customerPhone ? 'border-red-500' : ''}
            />
            {errors.customerPhone && (
              <p className="text-sm text-red-500">{errors.customerPhone}</p>
            )}
            {isStaff && (
              <p className="text-xs text-muted-foreground">
                Optional for staff orders - but recommended for returning customers
              </p>
            )}
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Order Type *
            </Label>
            <RadioGroup value={orderType} onValueChange={(value: any) => setOrderType(value)}>
              <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="dine_in" id="dine_in" />
                <Label htmlFor="dine_in" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm sm:text-base">Dine-In</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Customer dining in restaurant</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="room_service" id="room_service" />
                <Label htmlFor="room_service" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm sm:text-base">Room Service</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Deliver to hotel room</div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="walk_in" id="walk_in" />
                <Label htmlFor="walk_in" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm sm:text-base">Takeaway / Walk-in</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Customer will pick up order</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Room Number - Show only for room service */}
          {orderType === 'room_service' && (
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number *</Label>
              <Input
                id="roomNumber"
                placeholder="e.g., 201, 305"
                value={roomNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomNumber(e.target.value)}
                className={errors.roomNumber ? 'border-red-500' : ''}
              />
              {errors.roomNumber && (
                <p className="text-sm text-red-500">{errors.roomNumber}</p>
              )}
            </div>
          )}

          {/* Table Number - Show only for dine-in */}
          {orderType === 'dine_in' && (
            <div className="space-y-2">
              <Label htmlFor="tableNumber">
                Table *
                {lastTableNumber && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Last: {lastTableNumber})
                  </span>
                )}
              </Label>
              {availableTables.length > 0 ? (
                <Select value={tableNumber} onValueChange={setTableNumber}>
                  <SelectTrigger className={errors.tableNumber ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a table…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.map(t => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}{t.section ? ` — ${t.section}` : ''}{t.capacity ? ` (${t.capacity} seats)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="tableNumber"
                  placeholder="e.g., T-12, Table 5"
                  value={tableNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableNumber(e.target.value)}
                  className={errors.tableNumber ? 'border-red-500' : ''}
                />
              )}
              {errors.tableNumber && (
                <p className="text-sm text-red-500">{errors.tableNumber}</p>
              )}
            </div>
          )}

          {/* Payment happens later at bill settlement */}
          <div className="bg-muted/50 p-2 sm:p-3 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">
              💡 Payment will be processed when the customer requests the bill after dining
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="w-full sm:w-auto">
            Confirm Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
