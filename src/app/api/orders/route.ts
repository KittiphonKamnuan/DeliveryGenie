// ===================================
// GET /api/orders - Fetch Orders with Priorities
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import {
  prisma,
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
    const orders = await prisma.order.findMany({
      where: {
        order_status: status,
      },
      include: {
        customer: true,
        order_items: {
          include: {
            product: true,
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
      const categories = order.order_items.map((item) => item.product.category);
      const highestTempCategory = getHighestTemperatureRequirement(categories);

      // Calculate earliest expiration
      const expirationHours = order.order_items.map((item) => {
        if (item.product.expiration_date) {
          return calculateHoursUntilExpiry(item.product.expiration_date);
        }
        return 8760; // Default 1 year
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
          item.product.category === 'medicine' || item.product.is_fragile
      );

      // Calculate priority
      const priorityResult = calculatePriorityScore({
        temperatureCategory: highestTempCategory,
        expirationHours: minExpiration,
        customerPriority: order.customer.priority_level || 'standard',
        orderValue: totalValue,
        minutesUntilDeadline,
        isFragile,
      });

      return {
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer.name,
        customer_address: `${order.customer.address_line1}${
          order.customer.address_line2 ? ', ' + order.customer.address_line2 : ''
        }`,
        customer_priority: order.customer.priority_level || 'standard',
        order_status: order.order_status,
        order_time: order.created_at,
        delivery_window_start: order.delivery_window_start,
        delivery_window_end: order.delivery_window_end,
        delivery_latitude: order.customer.latitude,
        delivery_longitude: order.customer.longitude,
        priority_score: priorityResult.score,
        priority_class: priorityResult.class,
        breakdown: priorityResult.breakdown,
        total_value: totalValue,
        earliest_expiration: minExpiration,
        minutes_until_deadline: minutesUntilDeadline,
        highest_temp_requirement: highestTempCategory,
        products: order.order_items.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          category: item.product.category,
          price: item.unit_price,
          quantity: item.quantity,
          expiration_hours: item.product.expiration_date
            ? calculateHoursUntilExpiry(item.product.expiration_date)
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
      (order as any).suggested_delivery_order = index + 1;
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
