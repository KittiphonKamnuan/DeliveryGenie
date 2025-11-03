// ===================================
// Cart Context - Global Shopping Cart State
// ===================================

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Store, CartItem, Cart } from '@/types/shopping';

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setStore: (store: Store) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.07; // 7% VAT
const SHIPPING_FEE = 30; // 30 THB flat rate

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({
    items: [],
    store: null,
    subtotal: 0,
    tax: 0,
    shipping_fee: 0,
    total: 0,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('deliverygenie-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Error loading cart:', err);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('deliverygenie-cart', JSON.stringify(cart));
  }, [cart]);

  // Calculate totals
  const calculateTotals = (items: CartItem[], store: Store | null) => {
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const shipping_fee = items.length > 0 ? SHIPPING_FEE : 0;
    const total = subtotal + tax + shipping_fee;

    return { subtotal, tax, shipping_fee, total };
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existingItem = prev.items.find((item) => item.product.product_id === product.product_id);

      let newItems: CartItem[];
      if (existingItem) {
        // Update quantity if product already in cart
        newItems = prev.items.map((item) =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        newItems = [...prev.items, { product, quantity }];
      }

      const totals = calculateTotals(newItems, prev.store);
      return { ...prev, items: newItems, ...totals };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((item) => item.product.product_id !== productId);
      const totals = calculateTotals(newItems, prev.store);
      return { ...prev, items: newItems, ...totals };
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) => {
      const newItems = prev.items.map((item) =>
        item.product.product_id === productId ? { ...item, quantity } : item
      );
      const totals = calculateTotals(newItems, prev.store);
      return { ...prev, items: newItems, ...totals };
    });
  };

  const clearCart = () => {
    setCart({
      items: [],
      store: null,
      subtotal: 0,
      tax: 0,
      shipping_fee: 0,
      total: 0,
    });
  };

  const setStore = (store: Store) => {
    setCart((prev) => ({ ...prev, store }));
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setStore,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
