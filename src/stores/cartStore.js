import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      location: null,
      specialInstructions: '',

      // Actions
      addItem: (item) => {
        const { items } = get();
        const existingItemIndex = items.findIndex(
          (i) => i.itemId === item.itemId &&
          JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
        );

        if (existingItemIndex >= 0) {
          // Item with same customizations exists, increment quantity
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += item.quantity;
          updatedItems[existingItemIndex].subtotal =
            (updatedItems[existingItemIndex].basePrice +
             updatedItems[existingItemIndex].customizations.reduce((sum, c) => sum + c.priceModifier, 0)) *
            updatedItems[existingItemIndex].quantity;

          set({ items: updatedItems });
        } else {
          // New item, add to cart
          const newItem = {
            ...item,
            id: `${item.itemId}-${Date.now()}`,
            subtotal: (item.basePrice + item.customizations.reduce((sum, c) => sum + c.priceModifier, 0)) * item.quantity
          };
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

      updateCustomizations: (id, customizations) => {
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
