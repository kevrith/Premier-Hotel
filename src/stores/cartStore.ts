// @ts-nocheck
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
  discountAmount?: number;   // per-item KES discount (applied to the whole item line)
  discountReason?: string;
}

interface CartStore {
  items: CartItem[];
  location: string | null;
  specialInstructions: string;
  orderDiscount: number;          // order-level KES discount
  orderDiscountReason: string;
  orderDiscountApprovedBy: string | null;  // manager user_id who approved
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateCustomizations: (id: string, customizations: CartItem['customizations']) => void;
  setItemDiscount: (id: string, discountAmount: number, reason?: string) => void;
  setOrderDiscount: (amount: number, reason?: string, approvedBy?: string | null) => void;
  clearCart: () => void;
  setLocation: (location: string | null) => void;
  setSpecialInstructions: (instructions: string) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getTotalDiscount: () => number;
}

const getItemEffectiveSubtotal = (item: CartItem): number => {
  const baseSubtotal =
    (item.basePrice + (item.customizations || []).reduce((s, c) => s + (c.priceModifier || 0), 0)) *
    item.quantity;
  return Math.max(0, baseSubtotal - (item.discountAmount || 0));
};

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      location: null,
      specialInstructions: '',
      orderDiscount: 0,
      orderDiscountReason: '',
      orderDiscountApprovedBy: null,

      // Actions
      addItem: (item) => {
        console.log('cartStore.addItem called with:', item);

        const { items } = get();
        const existingItemIndex = items.findIndex(
          (i) => i.itemId === item.itemId &&
          JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
        );

        const getCustomizationsPrice = (customizations) => {
          if (!customizations || !Array.isArray(customizations)) return 0;
          return customizations.reduce((sum, c) => sum + (c.priceModifier || 0), 0);
        };

        if (existingItemIndex >= 0) {
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += item.quantity;
          updatedItems[existingItemIndex].subtotal = getItemEffectiveSubtotal(updatedItems[existingItemIndex]);
          set({ items: updatedItems });
        } else {
          const newItem = {
            ...item,
            id: `${item.itemId}-${Date.now()}`,
            subtotal: (item.basePrice + getCustomizationsPrice(item.customizations)) * item.quantity
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
              ? { ...item, quantity, subtotal: getItemEffectiveSubtotal({ ...item, quantity }) }
              : item
          )
        }));
      },

      updateCustomizations: (id: string, customizations: CartItem['customizations']) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, customizations, subtotal: getItemEffectiveSubtotal({ ...item, customizations }) }
              : item
          )
        }));
      },

      setItemDiscount: (id, discountAmount, reason = '') => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, discountAmount: Math.max(0, discountAmount), discountReason: reason };
            return { ...updated, subtotal: getItemEffectiveSubtotal(updated) };
          })
        }));
      },

      setOrderDiscount: (amount, reason = '', approvedBy = null) => {
        set({ orderDiscount: Math.max(0, amount), orderDiscountReason: reason, orderDiscountApprovedBy: approvedBy });
      },

      clearCart: () => {
        set({ items: [], location: null, specialInstructions: '', orderDiscount: 0, orderDiscountReason: '', orderDiscountApprovedBy: null });
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
        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        return total / 1.16;
      },

      getTax: () => {
        const { items } = get();
        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        return total - (total / 1.16);
      },

      getTotal: () => {
        const { items, orderDiscount } = get();
        const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        return Math.max(0, itemsTotal - orderDiscount);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },

      getTotalDiscount: () => {
        const { items, orderDiscount } = get();
        const itemDiscounts = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
        return itemDiscounts + orderDiscount;
      },
    }),
    {
      name: 'cart-storage'
    }
  )
);

export { useCartStore };
export default useCartStore;
