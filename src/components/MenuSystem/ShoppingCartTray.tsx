// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, X, CreditCard, Tag, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import useCartStore from '@/stores/cartStore';
import DiscountModal from './DiscountModal';

export default function ShoppingCartTray({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  className
}: {
  items: any[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { config, calculateTax } = useTaxSettings();
  const { setItemDiscount, setOrderDiscount, orderDiscount, orderDiscountReason, getTotalDiscount } = useCartStore();

  // Discount modal state
  const [discountModal, setDiscountModal] = useState<{
    open: boolean;
    scope: 'order' | 'item';
    itemId?: string;
    itemName?: string;
    baseAmount: number;
  }>({ open: false, scope: 'order', baseAmount: 0 });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsRawTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalAfterOrderDiscount = Math.max(0, itemsRawTotal - orderDiscount);
  const taxBreakdown = calculateTax(totalAfterOrderDiscount);
  const totalDiscount = getTotalDiscount();

  const openItemDiscount = (item: any) => {
    const baseLineTotal =
      (item.basePrice + (item.customizations || []).reduce((s: number, c: any) => s + (c.priceModifier || 0), 0)) *
      item.quantity;
    setDiscountModal({ open: true, scope: 'item', itemId: item.id, itemName: item.name, baseAmount: baseLineTotal });
  };

  const openOrderDiscount = () => {
    setDiscountModal({ open: true, scope: 'order', baseAmount: itemsRawTotal });
  };

  const handleDiscountApply = (amount: number, reason: string, approvedBy?: string) => {
    if (discountModal.scope === 'item' && discountModal.itemId) {
      setItemDiscount(discountModal.itemId, amount, reason);
    } else {
      setOrderDiscount(amount, reason, approvedBy || null);
    }
  };

  if (totalItems === 0) return null;

  if (!isExpanded) {
    return (
      <div className={cn("fixed bottom-20 left-1/2 -translate-x-1/2 w-11/12 sm:w-1/2 z-50", className)}>
        <Button
          size="lg"
          variant="outline"
          className="w-full h-16 shadow-elegant rounded-xl flex items-center justify-between px-4 bg-card/95 backdrop-blur-sm"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">Your Order</span>
          </div>
          <div className="flex flex-col items-end">
            <Badge className="mb-1">{totalItems} items</Badge>
            {totalDiscount > 0 && (
              <span className="text-xs text-green-600 font-medium">−KES {totalDiscount.toLocaleString()}</span>
            )}
            <span className="text-xs font-bold">KES {Math.round(taxBreakdown.total).toLocaleString()}</span>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={cn("fixed bottom-20 right-0 left-0 h-1/2 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 md:w-[28rem] sm:h-auto z-50", className)}>
        <Card className="shadow-elegant bg-card border-2 w-full h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden rounded-t-xl sm:rounded-xl">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Your Order
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3 py-2">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-start space-y-2 sm:space-y-0 sm:space-x-3 py-2 border-b border-border/50 last:border-b-0">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 sm:w-12 sm:h-12 object-cover rounded-md flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base truncate">{item.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      KES {(item.basePrice || 0).toLocaleString()} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                    </p>
                    {item.discountAmount > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        −KES {item.discountAmount.toLocaleString()} {item.discountReason ? `(${item.discountReason})` : ''}
                      </p>
                    )}
                    {item.customizations && Object.keys(item.customizations).length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">Custom options applied</p>
                    )}

                    {/* Item actions row */}
                    <div className="flex items-center gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary gap-1"
                        onClick={() => openItemDiscount(item)}
                      >
                        <Tag className="h-3 w-3" />
                        {item.discountAmount > 0 ? 'Edit discount' : 'Discount'}
                      </Button>
                      {item.discountAmount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive"
                          onClick={() => setItemDiscount(item.id, 0)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-1">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 sm:w-10 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">KES {Math.round(item.subtotal).toLocaleString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-2 flex-shrink-0" />

            {/* Summary */}
            <div className="px-4 pb-4 pt-2 space-y-2 flex-shrink-0 bg-card">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span className="font-medium">KES {Math.round(itemsRawTotal).toLocaleString()}</span>
              </div>

              {/* Item-level discounts summary */}
              {items.some(i => i.discountAmount > 0) && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Item discounts</span>
                  <span>−KES {Math.round(items.reduce((s, i) => s + (i.discountAmount || 0), 0)).toLocaleString()}</span>
                </div>
              )}

              {/* Order-level discount */}
              {orderDiscount > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <span>Order discount</span>
                    {orderDiscountReason && (
                      <span className="text-xs text-muted-foreground">({orderDiscountReason})</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-xs text-destructive ml-1"
                      onClick={() => setOrderDiscount(0)}
                    >
                      ×
                    </Button>
                  </div>
                  <span className="text-green-600 font-medium">−KES {Math.round(orderDiscount).toLocaleString()}</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-primary gap-1 border border-dashed border-primary/30 hover:bg-primary/5"
                  onClick={openOrderDiscount}
                >
                  <Tag className="h-3 w-3" />
                  Add order discount
                </Button>
              )}

              {config.vat_enabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({(config.vat_rate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">KES {Math.round(taxBreakdown.vat).toLocaleString()}</span>
                </div>
              )}
              {config.tourism_levy_enabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tourism Levy ({(config.tourism_levy_rate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">KES {Math.round(taxBreakdown.levy).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1">
                <span className="font-semibold">Total</span>
                <div className="text-right">
                  {totalDiscount > 0 && (
                    <p className="text-xs text-green-600">Saved KES {Math.round(totalDiscount).toLocaleString()}</p>
                  )}
                  <span className="font-bold text-lg text-primary">KES {Math.round(taxBreakdown.total).toLocaleString()}</span>
                </div>
              </div>
              {(config.vat_enabled || config.tourism_levy_enabled) && config.tax_inclusive && (
                <p className="text-xs text-muted-foreground text-center">Tax included in total</p>
              )}
              <Button
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                size="lg"
                onClick={onCheckout}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DiscountModal
        open={discountModal.open}
        onClose={() => setDiscountModal(d => ({ ...d, open: false }))}
        baseAmount={discountModal.baseAmount}
        itemName={discountModal.itemName}
        itemId={discountModal.itemId}
        scope={discountModal.scope}
        onApply={handleDiscountApply}
      />
    </>
  );
}
