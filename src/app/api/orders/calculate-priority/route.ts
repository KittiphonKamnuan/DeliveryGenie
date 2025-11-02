// ===================================
// File: app/api/orders/calculate-priority/route.ts
// API Route สำหรับคำนวณ Priority
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import {
  calculatePriorityScore,
  getHighestTemperatureRequirement,
  TEMPERATURE_CATEGORIES,
} from '@/lib';

interface Product {
  product_id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiration_hours: number;
}

interface Order {
  order_id: string;
  customer_name: string;
  customer_address: string;
  customer_priority: string;
  order_time: string;
  delivery_window_end: string;
  products: Product[];
}

/**
 * Calculate priority for a single order using the centralized utility
 */
function calculateOrderPriority(order: Order) {
  const now = new Date(order.order_time);

  // Get highest temperature requirement
  const categories = order.products.map(p => p.category);
  const highestTempCategory = getHighestTemperatureRequirement(categories);

  // Get earliest expiration
  const minExpiration = Math.min(...order.products.map(p => p.expiration_hours));

  // Calculate total value
  const totalValue = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  // Calculate minutes until deadline
  const deliveryEnd = new Date(order.delivery_window_end);
  const minutesRemaining = Math.max(0, (deliveryEnd.getTime() - now.getTime()) / (1000 * 60));

  // Check if order contains fragile items (medicine)
  const isFragile = order.products.some(p => p.category === 'medicine');

  // Calculate priority using centralized utility
  const priorityResult = calculatePriorityScore({
    temperatureCategory: highestTempCategory,
    expirationHours: minExpiration,
    customerPriority: order.customer_priority,
    orderValue: totalValue,
    minutesUntilDeadline: minutesRemaining,
    isFragile,
  });

  // Get temperature label
  const tempCategory = TEMPERATURE_CATEGORIES[highestTempCategory.toLowerCase() as keyof typeof TEMPERATURE_CATEGORIES];
  const tempLabel = tempCategory
    ? `${tempCategory.label} ${tempCategory.temp}`
    : 'ปกติ';

  return {
    order_id: order.order_id,
    priority_score: priorityResult.score,
    priority_class: priorityResult.class,
    breakdown: priorityResult.breakdown,
    highest_temp_requirement: tempLabel,
    total_value: totalValue,
    earliest_expiration: minExpiration,
    minutes_until_deadline: Math.round(minutesRemaining),
  };
}

// API Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Invalid request: orders array required' },
        { status: 400 }
      );
    }

    // Calculate priority for all orders using the refactored function
    const results = orders.map((order: Order) => calculateOrderPriority(order));

    // Sort by priority score
    const sorted = results.sort((a, b) => b.priority_score - a.priority_score);

    // Add suggested delivery order
    sorted.forEach((result, index) => {
      (result as any).suggested_delivery_order = index + 1;
    });

    return NextResponse.json({
      success: true,
      total_orders: sorted.length,
      orders: sorted,
      summary: {
        critical: sorted.filter(o => o.priority_class === 'critical').length,
        high: sorted.filter(o => o.priority_class === 'high').length,
        medium: sorted.filter(o => o.priority_class === 'medium').length,
        low: sorted.filter(o => o.priority_class === 'low').length,
        avg_score: sorted.reduce((sum, o) => sum + o.priority_score, 0) / sorted.length
      }
    });
  } catch (error) {
    console.error('Error calculating priorities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
