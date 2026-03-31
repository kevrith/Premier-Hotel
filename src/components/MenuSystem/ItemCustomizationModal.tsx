// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus } from 'lucide-react';

export default function ItemCustomizationModal({
  item,
  quantity,
  onQuantityChange,
  onAddToCart,
  customizations = []
}) {
  const [selectedCustomizations, setSelectedCustomizations] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Mock customization data for demo
  const mockCustomizations = [
    {
      id: 'spice-level',
      option_name: 'Spice Level',
      option_type: 'single_select',
      is_required: false,
      values: [
        { id: 'mild', value_name: 'Mild', additional_price_kes: 0 },
        { id: 'medium', value_name: 'Medium', additional_price_kes: 0 },
        { id: 'hot', value_name: 'Hot', additional_price_kes: 0 },
        { id: 'extra-hot', value_name: 'Extra Hot', additional_price_kes: 50 }
      ]
    },
    {
      id: 'extras',
      option_name: 'Extra Toppings',
      option_type: 'multi_select',
      is_required: false,
      values: [
        { id: 'cheese', value_name: 'Extra Cheese', additional_price_kes: 100 },
        { id: 'avocado', value_name: 'Avocado', additional_price_kes: 150 },
        { id: 'bacon', value_name: 'Bacon', additional_price_kes: 200 }
      ]
    }
  ];

  const activeCustomizations = customizations.length > 0 ? customizations : mockCustomizations;

  const handleCustomizationChange = (optionId, value, optionType) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [optionId]: optionType === 'multi_select' 
        ? { ...(prev[optionId] || {}), ...value }
        : value
    }));
  };

  const calculateTotalPrice = () => {
    let additionalPrice = 0;
    const basePrice = item.base_price || item.price_kes || 0;

    Object.entries(selectedCustomizations).forEach(([optionId, values]) => {
      const option = activeCustomizations.find(opt => opt.id === optionId);
      if (!option) return;

      if (option.option_type === 'multi_select' && typeof values === 'object') {
        Object.entries(values).forEach(([valueId, isSelected]) => {
          if (isSelected) {
            const optionValue = option.values.find(v => v.id === valueId);
            if (optionValue) additionalPrice += optionValue.additional_price_kes;
          }
        });
      } else if (option.option_type === 'single_select') {
        const optionValue = option.values.find(v => v.id === values);
        if (optionValue) additionalPrice += optionValue.additional_price_kes;
      }
    });

    return (basePrice + additionalPrice) * quantity;
  };

  const handleAddToCart = () => {
    const finalCustomizations = {
      ...selectedCustomizations,
      ...(specialInstructions && { special_instructions: specialInstructions })
    };
    
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

      {/* Customization Options */}
      {activeCustomizations.map((option) => (
        <div key={option.id} className="space-y-3">
          <div>
            <Label className="text-base font-semibold">
              {option.option_name}
              {option.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>

          {option.option_type === 'single_select' && (
            <RadioGroup
              value={selectedCustomizations[option.id] || ''}
              onValueChange={(value) => handleCustomizationChange(option.id, value, 'single_select')}
            >
              {option.values.map((value) => (
                <div key={value.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={value.id} id={`${option.id}-${value.id}`} />
                    <Label htmlFor={`${option.id}-${value.id}`} className="cursor-pointer">
                      {value.value_name}
                    </Label>
                  </div>
                  {value.additional_price_kes > 0 && (
                    <span className="text-sm text-muted-foreground">
                      +KES {value.additional_price_kes}
                    </span>
                  )}
                </div>
              ))}
            </RadioGroup>
          )}

          {option.option_type === 'multi_select' && (
            <div className="space-y-2">
              {option.values.map((value) => (
                <div key={value.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${option.id}-${value.id}`}
                      checked={selectedCustomizations[option.id]?.[value.id] || false}
                      onCheckedChange={(checked) => 
                        handleCustomizationChange(
                          option.id, 
                          { [value.id]: checked },
                          'multi_select'
                        )
                      }
                    />
                    <Label htmlFor={`${option.id}-${value.id}`} className="cursor-pointer">
                      {value.value_name}
                    </Label>
                  </div>
                  {value.additional_price_kes > 0 && (
                    <span className="text-sm text-muted-foreground">
                      +KES {value.additional_price_kes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Separator />
        </div>
      ))}

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