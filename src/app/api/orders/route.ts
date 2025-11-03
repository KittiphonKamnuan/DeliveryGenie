// ===================================
// GET /api/orders - Fetch Orders with Priorities
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  calculatePriorityScore,
  calculateMinutesUntilDeadline,
  calculateHoursUntilExpiry,
  getHighestTemperatureRequirement,
  HTTP_STATUS,
} from '@/lib';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch orders from database with related data
    const orders = await prisma.orders.findMany({
      where: {
        order_status: status,
      },
      include: {
        customers: true,
        order_items: {
          include: {
            products: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    // Calculate priority for each order
    const ordersWithPriority = orders.map((order) => {
      // Get all product categories
      const categories = order.order_items.map((item) => item.products.category);
      const highestTempCategory = getHighestTemperatureRequirement(categories);

      // Calculate earliest expiration
      const expirationHours = order.order_items.map((item) => {
        if (item.expiration_datetime) {
          return calculateHoursUntilExpiry(item.expiration_datetime);
        }
        return item.products.typical_expiration_hours || 8760; // Use product's typical expiration or default 1 year
      });
      const minExpiration = Math.min(...expirationHours);

      // Calculate total value
      const totalValue = order.order_items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );

      // Calculate minutes until deadline
      const minutesUntilDeadline = calculateMinutesUntilDeadline(
        order.delivery_window_end
      );

      // Check if order contains fragile items
      const isFragile = order.order_items.some(
        (item) =>
          item.products.category === 'medicine' || item.products.is_fragile
      );

      // Calculate priority
      const priorityResult = calculatePriorityScore({
        temperatureCategory: highestTempCategory,
        expirationHours: minExpiration,
        customerPriority: order.customers.priority_level || 'standard',
        orderValue: totalValue,
        minutesUntilDeadline,
        isFragile,
      });

      return {
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customers.name,
        customer_address: `${order.customers.address_line1}${
          order.customers.address_line2 ? ', ' + order.customers.address_line2 : ''
        }`,
        customer_priority: order.customers.priority_level || 'standard',
        order_status: order.order_status,
        order_time: order.created_at,
        delivery_window_start: order.delivery_window_start,
        delivery_window_end: order.delivery_window_end,
        delivery_latitude: order.customers.latitude,
        delivery_longitude: order.customers.longitude,
        priority_score: priorityResult.score,
        priority_class: priorityResult.class,
        breakdown: priorityResult.breakdown,
        total_value: totalValue,
        earliest_expiration: minExpiration,
        minutes_until_deadline: minutesUntilDeadline,
        highest_temp_requirement: highestTempCategory,
        products: order.order_items.map((item) => ({
          product_id: item.products.id,
          name: item.products.name,
          category: item.products.category,
          price: item.unit_price,
          quantity: item.quantity,
          expiration_hours: item.expiration_datetime
            ? calculateHoursUntilExpiry(item.expiration_datetime)
            : null,
        })),
      };
    });

    // Sort by priority score
    const sorted = ordersWithPriority.sort(
      (a, b) => b.priority_score - a.priority_score
    );

    // Add suggested delivery order
    sorted.forEach((order, index) => {
      (order as typeof order & { suggested_delivery_order: number }).suggested_delivery_order = index + 1;
    });

    // Calculate summary
    const summary = {
      total: sorted.length,
      critical: sorted.filter((o) => o.priority_class === 'critical').length,
      high: sorted.filter((o) => o.priority_class === 'high').length,
      medium: sorted.filter((o) => o.priority_class === 'medium').length,
      low: sorted.filter((o) => o.priority_class === 'low').length,
      total_value: sorted.reduce((sum, o) => sum + o.total_value, 0),
      avg_score:
        sorted.length > 0
          ? sorted.reduce((sum, o) => sum + o.priority_score, 0) /
            sorted.length
          : 0,
    };

    return NextResponse.json(
      {
        success: true,
        data: sorted,
        summary,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
