// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus } from 'lucide-react';

export default function ItemCustomizationModal({
  item,
  quantity,
  onQuantityChange,
  onAddToCart,
}) {
  const [specialInstructions, setSpecialInstructions] = useState('');

  const calculateTotalPrice = () => {
    const basePrice = item.base_price || item.price_kes || 0;
    return basePrice * quantity;
  };

  const handleAddToCart = () => {
    const finalCustomizations = specialInstructions
      ? { special_instructions: specialInstructions }
      : {};
    onAddToCart(finalCustomizations);
  };

  return (
    <div className="space-y-6">
      {/* Item Header */}
      <div className="flex items-start space-x-4">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-24 h-24 object-cover rounded-lg"
          />
        )}
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{item.name}</h3>
          <p className="text-muted-foreground text-sm">{item.description}</p>
          <p className="text-lg font-bold text-primary mt-2">
            KES {(item.base_price || item.price_kes || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <Separator />

      {/* Special Instructions */}
      <div className="space-y-2">
        <Label htmlFor="special-instructions">Special Instructions (Optional)</Label>
        <Textarea
          id="special-instructions"
          placeholder="Any specific requests? (e.g., no onions, extra sauce)"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
        />
      </div>

      <Separator />

      {/* Quantity and Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Label>Quantity:</Label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-primary">
            KES {calculateTotalPrice().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add to Cart Button */}
      <Button 
        className="w-full" 
        size="lg"
        onClick={handleAddToCart}
      >
        Add to Cart
      </Button>
    </div>
  );
}