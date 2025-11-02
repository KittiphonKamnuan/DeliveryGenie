// ===================================
// Types & Interfaces
// ===================================

import type { Prisma } from '@prisma/client';

// ============================================
// Priority Calculation Types
// ============================================

export interface PriorityWeights {
  temperature: number;
  expiration: number;
  customer: number;
  value: number;
  timeWindow: number;
  fragility: number;
}

export interface PriorityBreakdown {
  temperature: number;
  expiration: number;
  customer: number;
  value: number;
  timeWindow: number;
  fragility: number;
}

export interface PriorityResult {
  score: number;
  class: 'critical' | 'high' | 'medium' | 'low';
  breakdown: PriorityBreakdown;
}

export interface OrderWithPriority {
  order_id: string;
  priority_score: number;
  priority_class: string;
  suggested_delivery_order: number;
  breakdown: PriorityBreakdown;
  highest_temp_requirement?: string;
  earliest_expiration?: number;
  minutes_until_deadline?: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CalculatePriorityRequest {
  orders: Array<{
    order_id: string;
    customer_priority: 'urgent' | 'high' | 'standard' | 'economy';
    order_time: string;
    delivery_window_start?: string;
    delivery_window_end: string;
    products: Array<{
      product_id: string;
      name: string;
      category: string;
      price: number;
      quantity: number;
      expiration_hours?: number;
      is_fragile?: boolean;
    }>;
  }>;
}

export interface CalculatePriorityResponse {
  success: boolean;
  total_orders: number;
  orders: OrderWithPriority[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  error?: string;
}

// ============================================
// Database Extended Types
// ============================================

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    order_items: {
      include: {
        product: true;
      };
    };
    customer: true;
  };
}>;

export type DeliveryWithDetails = Prisma.DeliveryGetPayload<{
  include: {
    order: {
      include: {
        order_items: {
          include: {
            product: true;
          };
        };
        customer: true;
      };
    };
    driver: true;
    vehicle: true;
    route: {
      include: {
        route_stops: true;
      };
    };
  };
}>;

export type RouteWithStops = Prisma.RouteGetPayload<{
  include: {
    route_stops: {
      orderBy: {
        stop_order: 'asc';
      };
    };
    origin_store: true;
    deliveries: {
      include: {
        order: true;
      };
    };
  };
}>;

// ============================================
// Temperature Categories
// ============================================

export const TEMPERATURE_CATEGORIES = {
  hot_food: { temp: '60-70°C', score: 100, label: 'ร้อน' },
  frozen: { temp: '-18°C', score: 90, label: 'แช่แข็ง' },
  chilled: { temp: '0-4°C', score: 75, label: 'เย็น' },
  beverage: { temp: '15-20°C', score: 40, label: 'เย็น' },
  snack: { temp: 'Ambient', score: 20, label: 'ปกติ' },
  medicine: { temp: 'Ambient', score: 60, label: 'ปกติ (ยา)' },
  daily_goods: { temp: 'Ambient', score: 20, label: 'ปกติ' },
} as const;

export type TemperatureCategory = keyof typeof TEMPERATURE_CATEGORIES;

// ============================================
// Priority Classes
// ============================================

export const PRIORITY_CLASSES = {
  critical: { min: 75, max: 100, label: 'CRITICAL', color: 'red' },
  high: { min: 60, max: 74, label: 'HIGH', color: 'orange' },
  medium: { min: 40, max: 59, label: 'MEDIUM', color: 'blue' },
  low: { min: 0, max: 39, label: 'LOW', color: 'green' },
} as const;

export type PriorityClass = keyof typeof PRIORITY_CLASSES;

// ============================================
// Customer Priority Levels
// ============================================

export const CUSTOMER_PRIORITIES = {
  urgent: 100,
  high: 75,
  standard: 50,
  economy: 25,
} as const;

export type CustomerPriorityLevel = keyof typeof CUSTOMER_PRIORITIES;

// ============================================
// Order Status Types
// ============================================

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type RouteStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ============================================
// GPS & Location Types
// ============================================

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface GPSTracking extends GPSCoordinates {
  driver_id: string;
  vehicle_id: string;
  speed?: number;
  heading?: number;
  battery_level?: number;
  is_moving: boolean;
  timestamp: Date;
}

// ============================================
// Route Optimization Types
// ============================================

export interface RouteOptimizationRequest {
  origin: GPSCoordinates;
  waypoints: Array<{
    order_id: string;
    location: GPSCoordinates;
    priority_score: number;
    time_window?: {
      start: Date;
      end: Date;
    };
  }>;
  vehicle_id: string;
  max_stops?: number;
  max_duration_hours?: number;
}

export interface RouteOptimizationResponse {
  route_id: string;
  optimized_sequence: string[];
  total_distance_km: number;
  total_duration_min: number;
  estimated_arrival_times: Date[];
  polyline: string;
  optimization_score: number;
}

// ============================================
// Error Types
// ============================================

export class PriorityCalculationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PriorityCalculationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ============================================
// Utility Types
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
