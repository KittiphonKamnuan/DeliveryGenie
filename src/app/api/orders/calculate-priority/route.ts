// ===================================
// File: app/api/orders/calculate-priority/route.ts
// API Route สำหรับคำนวณ Priority
// ===================================

import { NextRequest, NextResponse } from 'next/server';

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

class OrderPriorityCalculator {
  private tempRequirements: any = {
    hot_food: { score: 100, label: 'ร้อน 60-70°C' },
    frozen: { score: 90, label: 'แช่แข็ง -18°C' },
    chilled: { score: 75, label: 'เย็น 0-4°C' },
    beverage: { score: 40, label: 'เย็น 15-20°C' },
    snack: { score: 20, label: 'ปกติ' },
    daily_goods: { score: 20, label: 'ปกติ' },
    medicine: { score: 60, label: 'ปกติ (ยา)' }
  };

  private customerPriorityScores: any = {
    urgent: 100,
    high: 75,
    standard: 50,
    economy: 25
  };

  calculateOrderPriority(order: Order) {
    const now = new Date(order.order_time);

    // 1. Temperature Score (30%)
    const tempScores = order.products.map(p =>
      this.tempRequirements[p.category]?.score || 20
    );
    const maxTempScore = Math.max(...tempScores);
    const highestTempProduct = order.products.find(p =>
      this.tempRequirements[p.category]?.score === maxTempScore
    );
    const tempRequirement = this.tempRequirements[highestTempProduct?.category || 'snack'];

    // 2. Expiration Score (25%)
    const expirations = order.products.map(p => p.expiration_hours);
    const minExpiration = Math.min(...expirations);
    const expirationScore = this.scoreExpiration(minExpiration);

    // 3. Customer Priority (15%)
    const customerScore = this.customerPriorityScores[order.customer_priority] || 50;

    // 4. Total Value (10%)
    const totalValue = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const valueScore = this.scoreValue(totalValue);

    // 5. Delivery Window (15%)
    const deliveryEnd = new Date(order.delivery_window_end);
    const minutesRemaining = (deliveryEnd.getTime() - now.getTime()) / (1000 * 60);
    const windowScore = this.scoreDeliveryWindow(minutesRemaining);

    // 6. Fragility (5%)
    const hasMedicine = order.products.some(p => p.category === 'medicine');
    const fragilityScore = hasMedicine ? 100 : 30;

    // Weighted calculation
    const weights = {
      temperature: 0.30,
      expiration: 0.25,
      customer_priority: 0.15,
      value: 0.10,
      delivery_window: 0.15,
      fragility: 0.05
    };

    const breakdown = {
      temperature: maxTempScore * weights.temperature,
      expiration: expirationScore * weights.expiration,
      customer_priority: customerScore * weights.customer_priority,
      value: valueScore * weights.value,
      delivery_window: windowScore * weights.delivery_window,
      fragility: fragilityScore * weights.fragility
    };

    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const priorityClass = this.classifyPriority(totalScore);

    return {
      order_id: order.order_id,
      priority_score: Math.round(totalScore * 100) / 100,
      priority_class: priorityClass,
      breakdown,
      highest_temp_requirement: tempRequirement.label,
      total_value: totalValue,
      earliest_expiration: minExpiration,
      minutes_until_deadline: Math.round(minutesRemaining)
    };
  }

  private scoreExpiration(hours: number): number {
    if (hours <= 3) return 100;
    if (hours <= 8) return 90;
    if (hours <= 24) return 70;
    if (hours <= 168) return 50;
    return 30;
  }

  private scoreValue(value: number): number {
    if (value >= 500) return 100;
    if (value >= 200) return 80;
    if (value >= 100) return 60;
    if (value >= 50) return 40;
    return 20;
  }

  private scoreDeliveryWindow(minutes: number): number {
    if (minutes <= 15) return 100;
    if (minutes <= 30) return 90;
    if (minutes <= 60) return 70;
    if (minutes <= 120) return 50;
    return 30;
  }

  private classifyPriority(score: number): string {
    if (score >= 75) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
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

    const calculator = new OrderPriorityCalculator();
    const results = orders.map((order: Order) => calculator.calculateOrderPriority(order));

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
