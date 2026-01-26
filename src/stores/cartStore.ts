import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '@/types';

interface CartItem {
  id: string;
  itemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  customizations: Array<{
    id: string;
    name: string;
    value: any;
    priceModifier: number;
  }>;
  specialInstructions: string;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  location: string | null;
  specialInstructions: string;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateCustomizations: (id: string, customizations: CartItem['customizations']) => void;
  clearCart: () => void;
  setLocation: (location: string | null) => void;
  setSpecialInstructions: (instructions: string) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      location: null,
      specialInstructions: '',

      // Actions
      addItem: (item) => {
        console.log('cartStore.addItem called with:', item);

        const { items } = get();
        const existingItemIndex = items.findIndex(
          (i) => i.itemId === item.itemId &&
          JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
        );

        // Safely calculate customizations price
        const getCustomizationsPrice = (customizations) => {
          if (!customizations || !Array.isArray(customizations)) return 0;
          return customizations.reduce((sum, c) => sum + (c.priceModifier || 0), 0);
        };

        if (existingItemIndex >= 0) {
          // Item with same customizations exists, increment quantity
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += item.quantity;
          updatedItems[existingItemIndex].subtotal =
            (updatedItems[existingItemIndex].basePrice +
             getCustomizationsPrice(updatedItems[existingItemIndex].customizations)) *
            updatedItems[existingItemIndex].quantity;

          console.log('Updated existing item:', updatedItems[existingItemIndex]);
          set({ items: updatedItems });
        } else {
          // New item, add to cart
          const newItem = {
            ...item,
            id: `${item.itemId}-${Date.now()}`,
            subtotal: (item.basePrice + getCustomizationsPrice(item.customizations)) * item.quantity
          };
          console.log('Adding new item to cart:', newItem);
          set({ items: [...items, newItem] });
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity,
                  subtotal: (item.basePrice + item.customizations.reduce((sum, c) => sum + c.priceModifier, 0)) * quantity
                }
              : item
          )
        }));
      },

      updateCustomizations: (id: string, customizations: CartItem['customizations']) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  customizations,
                  subtotal: (item.basePrice + customizations.reduce((sum, c) => sum + c.priceModifier, 0)) * item.quantity
                }
              : item
          )
        }));
      },

      clearCart: () => {
        set({ items: [], location: null, specialInstructions: '' });
      },

      setLocation: (location) => {
        set({ location });
      },

      setSpecialInstructions: (instructions) => {
        set({ specialInstructions: instructions });
      },

      // Computed values
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.subtotal, 0);
      },

      getTax: () => {
        const subtotal = get().getSubtotal();
        return subtotal * 0.16; // 16% VAT
      },

      getTotal: () => {
        return get().getSubtotal() + get().getTax();
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      }
    }),
    {
      name: 'cart-storage'
    }
  )
);

export { useCartStore };
export default useCartStore;
