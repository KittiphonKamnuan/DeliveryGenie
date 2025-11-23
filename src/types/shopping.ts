// ===================================
// Shopping Types
// ===================================

export interface Product {
  product_id: string;
  store_id?: string;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  temperature_requirement: string;
  expiration_hours?: number;
  is_fragile: boolean;
  stock_quantity: number;
  is_active?: boolean;
  created_at?: string;
  expiration_date?: Date;
}

export interface Store {
  store_id: string;
  store_code?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  route_distance_km?: number;
  route_duration_min?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  store: Store | null;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
}
