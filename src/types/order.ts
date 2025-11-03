// ===================================
// Order Types
// ===================================

export interface Product {
  product_id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiration_hours: number | null;
}

export interface Order {
  order_id: string;
  order_number?: string;
  customer_name: string;
  customer_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  customer_priority: string;
  order_status: string;
  order_time: string;
  delivery_window_start?: string;
  delivery_window_end: string;
  products: Product[];
  // Calculated fields
  priority_score: number;
  priority_class: string;
  suggested_delivery_order?: number;
  highest_temp_requirement?: string;
  total_value: number;
  earliest_expiration?: number;
  minutes_until_deadline?: number;
  breakdown?: {
    temperature: number;
    expiration: number;
    customer: number;
    value: number;
    timeWindow: number;
    fragility: number;
  };
}

export interface OrderSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}
