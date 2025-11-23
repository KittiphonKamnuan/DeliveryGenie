// ===================================
// API: Admin Dashboard Stats
// ===================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total orders
    const totalOrders = await prisma.orders.count();

    // Active deliveries (assigned, picked_up, in_transit)
    const activeDeliveries = await prisma.deliveries.count({
      where: {
        delivery_status: {
          in: ['assigned', 'picked_up', 'in_transit']
        }
      }
    });

    // Pending orders
    const pendingOrders = await prisma.orders.count({
      where: {
        order_status: 'pending'
      }
    });

    // Total riders (active)
    const totalRiders = await prisma.drivers.count({
      where: {
        status: 'active'
      }
    });

    // Completed deliveries today
    const completedToday = await prisma.deliveries.count({
      where: {
        delivery_status: 'delivered',
        completed_at: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Calculate revenue from completed orders today
    const completedOrdersToday = await prisma.orders.findMany({
      where: {
        order_status: 'completed',
        created_at: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        order_items: true
      }
    });

    const revenue = completedOrdersToday.reduce((sum, order) => {
      const orderTotal = order.order_items.reduce(
        (itemSum, item) => itemSum + (item.unit_price * item.quantity),
        0
      );
      return sum + orderTotal;
    }, 0);

    // Calculate average delivery time
    const deliveredToday = await prisma.deliveries.findMany({
      where: {
        delivery_status: 'delivered',
        completed_at: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        created_at: true,
        completed_at: true
      }
    });

    let avgDeliveryTime = 0;
    if (deliveredToday.length > 0) {
      const totalMinutes = deliveredToday.reduce((sum, delivery) => {
        if (delivery.completed_at) {
          const diff = delivery.completed_at.getTime() - delivery.created_at.getTime();
          return sum + (diff / 60000); // Convert to minutes
        }
        return sum;
      }, 0);
      avgDeliveryTime = Math.round(totalMinutes / deliveredToday.length);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        activeDeliveries,
        totalRiders,
        revenue,
        completedToday,
        avgDeliveryTime,
        pendingOrders,
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      },
      { status: 500 }
    );
  }
}
