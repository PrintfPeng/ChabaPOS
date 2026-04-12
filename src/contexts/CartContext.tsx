import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string; // Unique ID for the cart item (menuItemId + options hash)
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  options: {
    optionId: number;
    name: string;
    price: number;
  }[];
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    const id = `${item.menuItemId}-${item.options.map(o => o.optionId).sort().join(',')}`;
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, { ...item, id }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((sum, item) => {
    const itemTotal = (item.price + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
