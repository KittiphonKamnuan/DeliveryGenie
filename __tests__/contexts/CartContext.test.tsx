/**
 * Unit Tests for CartContext
 *
 * Tests the shopping cart functionality including:
 * - Adding items
 * - Updating quantities
 * - Removing items
 * - Calculating totals
 * - LocalStorage persistence
 */

import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { Product } from '@/types/shopping';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock product data
const mockProduct1: Product = {
  product_id: '1',
  sku: 'TEST-001',
  name: 'Test Product 1',
  description: 'Test description',
  category: 'snack',
  price: 25.00,
  temperature_requirement: 'ambient',
  is_fragile: false,
  stock_quantity: 10,
};

const mockProduct2: Product = {
  product_id: '2',
  sku: 'TEST-002',
  name: 'Test Product 2',
  category: 'beverage',
  price: 15.00,
  temperature_requirement: 'chilled',
  is_fragile: false,
  stock_quantity: 20,
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Initial State', () => {
    it('should initialize with empty cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(result.current.cart.items).toEqual([]);
      expect(result.current.cart.store).toBeNull();
      expect(result.current.cart.subtotal).toBe(0);
      expect(result.current.cart.tax).toBe(0);
      expect(result.current.cart.shipping_fee).toBe(0);
      expect(result.current.cart.total).toBe(0);
    });
  });

  describe('Adding Items', () => {
    it('should add new item to cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].product).toEqual(mockProduct1);
      expect(result.current.cart.items[0].quantity).toBe(2);
    });

    it('should increase quantity when adding existing item', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.addToCart(mockProduct1, 1);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].quantity).toBe(3);
    });

    it('should add multiple different products', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 1);
        result.current.addToCart(mockProduct2, 2);
      });

      expect(result.current.cart.items).toHaveLength(2);
      expect(result.current.cart.items[0].product.product_id).toBe('1');
      expect(result.current.cart.items[1].product.product_id).toBe('2');
    });
  });

  describe('Updating Quantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.updateQuantity('1', 5);
      });

      expect(result.current.cart.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity set to 0', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.updateQuantity('1', 0);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });

    it('should remove item when quantity set to negative', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.updateQuantity('1', -1);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });
  });

  describe('Removing Items', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.addToCart(mockProduct2, 1);
        result.current.removeFromCart('1');
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].product.product_id).toBe('2');
    });

    it('should handle removing non-existent item', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.removeFromCart('non-existent-id');
      });

      expect(result.current.cart.items).toHaveLength(1);
    });
  });

  describe('Clearing Cart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
        result.current.addToCart(mockProduct2, 1);
        result.current.clearCart();
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.store).toBeNull();
      expect(result.current.cart.total).toBe(0);
    });
  });

  describe('Total Calculations', () => {
    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        // Product 1: 25 * 2 = 50
        // Product 2: 15 * 3 = 45
        // Subtotal: 95
        result.current.addToCart(mockProduct1, 2);
        result.current.addToCart(mockProduct2, 3);
      });

      expect(result.current.cart.subtotal).toBe(95);
    });

    it('should calculate tax (7%) correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        // Subtotal: 100
        // Tax: 100 * 0.07 = 7
        result.current.addToCart({ ...mockProduct1, price: 100 }, 1);
      });

      expect(result.current.cart.tax).toBe(7);
    });

    it('should add shipping fee when cart has items', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 1);
      });

      expect(result.current.cart.shipping_fee).toBe(30);
    });

    it('should have zero shipping fee when cart is empty', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      expect(result.current.cart.shipping_fee).toBe(0);
    });

    it('should calculate total correctly', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        // Subtotal: 100
        // Tax: 7
        // Shipping: 30
        // Total: 137
        result.current.addToCart({ ...mockProduct1, price: 100 }, 1);
      });

      expect(result.current.cart.total).toBe(137);
    });

    it('should recalculate totals when quantity changes', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 1);
      });

      const initialTotal = result.current.cart.total;

      act(() => {
        result.current.updateQuantity('1', 3);
      });

      expect(result.current.cart.total).toBeGreaterThan(initialTotal);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save cart to localStorage when items added', () => {
      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.addToCart(mockProduct1, 2);
      });

      const savedCart = JSON.parse(
        localStorageMock.getItem('deliverygenie-cart') || '{}'
      );

      expect(savedCart.items).toHaveLength(1);
      expect(savedCart.items[0].quantity).toBe(2);
    });

    it('should load cart from localStorage on mount', () => {
      // Pre-populate localStorage
      const existingCart = {
        items: [
          { product: mockProduct1, quantity: 3 },
        ],
        store: null,
        subtotal: 75,
        tax: 5.25,
        shipping_fee: 30,
        total: 110.25,
      };

      localStorageMock.setItem(
        'deliverygenie-cart',
        JSON.stringify(existingCart)
      );

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      // Wait for useEffect to run
      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].quantity).toBe(3);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('deliverygenie-cart', 'invalid json');

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      // Should fall back to empty cart
      expect(result.current.cart.items).toEqual([]);
    });
  });

  describe('Store Management', () => {
    it('should set store in cart', () => {
      const mockStore = {
        store_id: 'store-1',
        store_code: '7ELV-001',
        name: 'Test Store',
        address: 'Test Address',
        latitude: 13.7,
        longitude: 100.5,
        distance_km: 2.5,
      };

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      });

      act(() => {
        result.current.setStore(mockStore);
      });

      expect(result.current.cart.store).toEqual(mockStore);
    });
  });
});
