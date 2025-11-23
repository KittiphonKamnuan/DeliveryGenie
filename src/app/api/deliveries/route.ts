// ===================================
// API: Get Deliveries
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driver_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {};

    if (driverId) {
      where.driver_id = driverId;
    }

    if (status) {
      const statuses = status.split(',');
      where.delivery_status = {
        in: statuses
      };
    }

    const deliveries = await prisma.deliveries.findMany({
      where,
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
      },
      take: limit
    });

    // Transform data for frontend
    const transformedDeliveries = deliveries.map(delivery => ({
      delivery_id: delivery.id,
      order_id: delivery.order_id,
      order_number: delivery.orders?.order_number || 'N/A',
      delivery_status: delivery.delivery_status,
      pickup_location: delivery.pickup_location || '',
      pickup_lat: delivery.pickup_latitude ? parseFloat(delivery.pickup_latitude.toString()) : 0,
      pickup_lon: delivery.pickup_longitude ? parseFloat(delivery.pickup_longitude.toString()) : 0,
      delivery_location: delivery.delivery_location || '',
      delivery_lat: delivery.delivery_latitude ? parseFloat(delivery.delivery_latitude.toString()) : 0,
      delivery_lon: delivery.delivery_longitude ? parseFloat(delivery.delivery_longitude.toString()) : 0,
      customer_name: delivery.orders?.customers?.name || 'Unknown',
      customer_phone: delivery.orders?.customers?.phone || '',
      estimated_distance_km: delivery.estimated_distance_km ? parseFloat(delivery.estimated_distance_km.toString()) : 0,
      priority_class: delivery.orders?.priority_class || 'medium',
      priority_score: delivery.orders?.priority_score || 0,
      created_at: delivery.created_at,
      driver_name: delivery.drivers ? `${delivery.drivers.first_name} ${delivery.drivers.last_name}` : null
    }));

    return NextResponse.json({
      success: true,
      deliveries: transformedDeliveries,
      count: transformedDeliveries.length
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deliveries'
      },
      { status: 500 }
    );
  }
}
