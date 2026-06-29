/**
 * CartContext — Enhanced with Member & Promotion support
 *
 * State:
 *   cart              — line items
 *   customer          — member linked to this session
 *   appliedPromotion  — promo currently active
 *   discountAmount    — baht discount from /promotions/validate
 *
 * Derived:
 *   subtotal   = raw sum of line items
 *   finalTotal = subtotal - discountAmount (>= 0)
 *   totalAmount = alias for subtotal (backward-compat for old consumers)
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

// ─────────────────────────────────────────────
// Exported types — shared with Payment, CustomerOrder, etc.
// ─────────────────────────────────────────────
export interface CartItem {
  id: string;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  options: { optionId: number; name: string; price: number }[];
  notes?: string;
}

export interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  points: number;
}

export interface PromoInfo {
  id: number;
  name: string;
  type: 'PERCENT' | 'FIXED' | 'POINTS_REDEMPTION';
  value: number;
  minSpend: number;
  pointsNeeded: number;
  memberOnly: boolean;
}

// ─────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────
interface CartContextType {
  /* ── Cart ──────────────────────────────── */
  cart: CartItem[];
  addToCart:      (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart:      () => void;

  /* ── Totals ────────────────────────────── */
  subtotal:       number;  // raw sum before discount
  discountAmount: number;  // baht deducted by promo
  finalTotal:     number;  // subtotal - discountAmount (min 0)
  totalAmount:    number;  // backward-compat alias = subtotal

  /* ── Member ────────────────────────────── */
  customer:    CustomerInfo | null;
  setCustomer: (c: CustomerInfo | null) => void;

  /* ── Promotion ─────────────────────────── */
  appliedPromotion: PromoInfo | null;
  /**
   * Calls POST /promotions/validate to confirm eligibility and get discount.
   * Passing the same promo that is already applied will toggle it off.
   * Returns discount amount on success, null on error / toggle-off.
   */
  applyPromotion:     (branchId: number, promo: PromoInfo) => Promise<number | null>;
  clearPromotion:     () => void;
  resetMemberAndPromo: () => void;
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart,             setCart]             = useState<CartItem[]>([]);
  const [customer,         setCustomerState]    = useState<CustomerInfo | null>(null);
  const [appliedPromotion, setAppliedPromotion] = useState<PromoInfo | null>(null);
  const [discountAmount,   setDiscountAmount]   = useState(0);

  /* ── Derived totals ─────────────────────────── */
  const subtotal = cart.reduce(
    (sum, item) =>
      sum + (item.price + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity,
    0,
  );
  const finalTotal = Math.max(0, subtotal - discountAmount);

  /* ── Cart mutations ─────────────────────────── */
  const addToCart = (item: Omit<CartItem, 'id'>) => {
    const id = `${item.menuItemId}-${item.options.map(o => o.optionId).sort().join(',')}-${item.notes || ''}`;
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, { ...item, id }];
    });
  };

  const removeFromCart = (id: string) =>
    setCart(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, delta: number) =>
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i),
    );

  /** Clears cart AND resets member / promo state */
  const clearCart = () => {
    setCart([]);
    setCustomerState(null);
    setAppliedPromotion(null);
    setDiscountAmount(0);
  };

  /* ── Member ─────────────────────────────────── */
  const setCustomer = (c: CustomerInfo | null) => {
    setCustomerState(c);
    // Auto-clear member-only promo when customer is removed
    if (!c && appliedPromotion?.memberOnly) {
      setAppliedPromotion(null);
      setDiscountAmount(0);
    }
  };

  /* ── Promotion ──────────────────────────────── */
  const applyPromotion = useCallback(
    async (branchId: number, promo: PromoInfo): Promise<number | null> => {
      // Toggle off when same promo is clicked again
      if (appliedPromotion?.id === promo.id) {
        setAppliedPromotion(null);
        setDiscountAmount(0);
        return null;
      }
      try {
        const res = await api.post('/promotions/validate', {
          promotionId: promo.id,
          branchId,
          totalAmount: subtotal,
          customerId:  customer?.id,
        });
        setAppliedPromotion(promo);
        setDiscountAmount(res.data.discountAmount);
        return res.data.discountAmount as number;
      } catch {
        return null;
      }
    },
    [appliedPromotion?.id, subtotal, customer?.id],
  );

  const clearPromotion = () => {
    setAppliedPromotion(null);
    setDiscountAmount(0);
  };

  const resetMemberAndPromo = () => {
    setCustomerState(null);
    setAppliedPromotion(null);
    setDiscountAmount(0);
  };

  /* ── Context value ──────────────────────────── */
  return (
    <CartContext.Provider
      value={{
        cart, addToCart, removeFromCart, updateQuantity, clearCart,
        subtotal, discountAmount, finalTotal,
        totalAmount: subtotal,
        customer, setCustomer,
        appliedPromotion, applyPromotion, clearPromotion, resetMemberAndPromo,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
