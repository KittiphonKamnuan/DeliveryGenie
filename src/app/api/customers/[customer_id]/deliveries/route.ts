// ===================================
// API: Get Customer's Active Deliveries
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { customer_id: string } }
) {
  try {
    const customerId = params.customer_id;

    // Get customer's active orders (including pending orders without deliveries yet)
    const orders = await prisma.orders.findMany({
      where: {
        customer_id: customerId,
        order_status: {
          in: ['pending', 'confirmed', 'preparing']
        }
      },
      include: {
        customers: true,
        deliveries: {
          include: {
            drivers: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Also get deliveries in progress
    const deliveries = await prisma.deliveries.findMany({
      where: {
        orders: {
          customer_id: customerId
        },
        delivery_status: {
          in: ['assigned', 'picked_up', 'in_transit']
        }
      },
      include: {
        orders: {
          include: {
            customers: true
          }
        },
        drivers: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Process pending orders (orders without deliveries)
    const pendingOrders = orders.filter(order => order.deliveries.length === 0).map(order => ({
      delivery_id: order.id,
      order_number: order.order_number,
      delivery_status: order.order_status,
      rider_name: undefined,
      estimated_arrival: order.delivery_window_end,
      current_location: undefined
    }));

    // Process active deliveries with tracking
    const activeDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        let riderLocation = null;

        if (delivery.driver_id) {
          const tracking = await prisma.gps_trackings.findFirst({
            where: {
              driver_id: delivery.driver_id
            },
            orderBy: {
              timestamp: 'desc'
            }
          });

          if (tracking) {
            riderLocation = {
              latitude: tracking.latitude ? parseFloat(tracking.latitude.toString()) : 0,
              longitude: tracking.longitude ? parseFloat(tracking.longitude.toString()) : 0,
            };
          }
        }

        return {
          delivery_id: delivery.id,
          order_number: delivery.orders?.order_number || 'N/A',
          delivery_status: delivery.delivery_status,
          rider_name: delivery.drivers ? `${delivery.drivers.first_name} ${delivery.drivers.last_name}` : undefined,
          estimated_arrival: delivery.estimated_delivery_time || delivery.orders?.delivery_window_end,
          current_location: riderLocation
        };
      })
    );

    // Combine both pending orders and active deliveries
    const allDeliveries = [...pendingOrders, ...activeDeliveries];

    return NextResponse.json({
      success: true,
      deliveries: allDeliveries
    });
  } catch (error) {
    console.error('Error fetching customer deliveries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deliveries'
      },
      { status: 500 }
    );
  }
}
