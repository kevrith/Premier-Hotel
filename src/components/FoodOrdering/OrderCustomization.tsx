import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { MenuItemType, CartItem } from '@/pages/FoodOrderingPage';

interface OrderCustomizationProps {
  item: MenuItemType;
  onConfirm: (customizations: CartItem['customizations']) => void;
  onCancel: () => void;
}

export function OrderCustomization({ item, onConfirm, onCancel }: OrderCustomizationProps) {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  const toggleAddon = (addonName: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonName)
        ? prev.filter(a => a !== addonName)
        : [...prev, addonName]
    );
  };

  const toggleRemoval = (ingredient: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const calculatePrice = () => {
    let price = item.price;

    if (item.customization_options?.addons) {
      selectedAddons.forEach(addonName => {
        const addon = item.customization_options.addons?.find(a => a.name === addonName);
        if (addon) price += addon.price;
      });
    }

    return price * quantity;
  };

  const handleConfirm = () => {
    const customizations: CartItem['customizations'] = {
      addons: selectedAddons,
      removals: removedIngredients,
      specialInstructions: specialInstructions || undefined
    };

    // Add to cart multiple times based on quantity
    for (let i = 0; i < quantity; i++) {
      onConfirm(customizations);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <CardHeader className="relative">
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="pr-12">
            <CardTitle className="text-2xl">{item.name}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </div>

          {/* Item Image */}
          {item.image_url && (
            <div className="mt-4 h-48 rounded-lg overflow-hidden">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Base Price */}
          <div className="flex items-center justify-between mt-4 p-3 bg-muted rounded-lg">
            <span className="font-medium">Base Price</span>
            <span className="text-xl font-bold text-primary">
              KES {item.price.toLocaleString()}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Addons Section */}
          {item.customization_options?.addons && item.customization_options.addons.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Add Extras
              </h3>
              <div className="space-y-2">
                {item.customization_options.addons.map((addon) => (
                  <div
                    key={addon.name}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 ${
                      selectedAddons.includes(addon.name)
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => toggleAddon(addon.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedAddons.includes(addon.name)}
                        onCheckedChange={() => toggleAddon(addon.name)}
                      />
                      <Label className="cursor-pointer font-medium">
                        {addon.name}
                      </Label>
                    </div>
                    <Badge variant="secondary">
                      +KES {addon.price.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removable Ingredients Section */}
          {item.customization_options?.removable_ingredients &&
            item.customization_options.removable_ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Minus className="h-5 w-5 text-orange-600" />
                Remove Ingredients
              </h3>
              <div className="space-y-2">
                {item.customization_options.removable_ingredients.map((ingredient) => (
                  <div
                    key={ingredient}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 ${
                      removedIngredients.includes(ingredient)
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => toggleRemoval(ingredient)}
                  >
                    <Checkbox
                      checked={removedIngredients.includes(ingredient)}
                      onCheckedChange={() => toggleRemoval(ingredient)}
                    />
                    <Label className="cursor-pointer font-medium">
                      No {ingredient}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients List */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {item.ingredients.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    variant="outline"
                    className={removedIngredients.includes(ingredient) ? 'line-through opacity-50' : ''}
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Special Instructions</h3>
            <Textarea
              placeholder="Any special requests? (e.g., extra spicy, no salt, well done)"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Quantity Selector */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price Summary */}
          <div className="p-4 bg-primary/5 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Item Price</span>
              <span>KES {item.price.toLocaleString()}</span>
            </div>

            {selectedAddons.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>Extras</span>
                <span>
                  +KES{' '}
                  {selectedAddons
                    .reduce((sum, addonName) => {
                      const addon = item.customization_options?.addons?.find(a => a.name === addonName);
                      return sum + (addon?.price || 0);
                    }, 0)
                    .toLocaleString()}
                </span>
              </div>
            )}

            {quantity > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span>Quantity</span>
                <span>× {quantity}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                KES {calculatePrice().toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1 gap-2">
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
