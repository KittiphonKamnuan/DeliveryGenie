// ===================================
// API: Get Rider Location for Delivery
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { delivery_id: string } }
) {
  try {
    const deliveryId = params.delivery_id;

    // Get delivery info
    const delivery = await prisma.deliveries.findUnique({
      where: { id: deliveryId },
      include: {
        orders: {
          include: {
            customers: true,
            stores: true
          }
        },
        drivers: true
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      );
    }

    // Get latest GPS tracking data for this driver
    const latestTracking = await prisma.gps_tracking.findFirst({
      where: {
        driver_id: delivery.driver_id || undefined
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Transform delivery data
    const deliveryInfo = {
      delivery_id: delivery.id,
      order_number: delivery.orders?.order_number || 'N/A',
      status: delivery.delivery_status,
      rider_name: delivery.drivers ? `${delivery.drivers.first_name} ${delivery.drivers.last_name}` : 'Unknown',
      rider_phone: delivery.drivers?.phone || '',
      pickup_location: delivery.pickup_location || delivery.orders?.stores?.address || '',
      delivery_location: delivery.delivery_location || '',
      delivery_lat: delivery.delivery_latitude ? parseFloat(delivery.delivery_latitude.toString()) : 0,
      delivery_lon: delivery.delivery_longitude ? parseFloat(delivery.delivery_longitude.toString()) : 0,
      estimated_arrival: delivery.estimated_arrival_time,
      rider_location: latestTracking ? {
        lat: latestTracking.latitude ? parseFloat(latestTracking.latitude.toString()) : 0,
        lon: latestTracking.longitude ? parseFloat(latestTracking.longitude.toString()) : 0,
        bearing: latestTracking.bearing ? parseFloat(latestTracking.bearing.toString()) : 0,
        speed_kmh: latestTracking.speed_kmh ? parseFloat(latestTracking.speed_kmh.toString()) : 0,
        timestamp: latestTracking.timestamp,
      } : null
    };

    return NextResponse.json({
      success: true,
      delivery: deliveryInfo
    });
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tracking data'
      },
      { status: 500 }
    );
  }
}
