// ===================================
// API: Get Driver Info
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;

    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      include: {
        vehicles: true
      }
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const driverData = {
      driver_id: driver.id,
      name: `${driver.first_name} ${driver.last_name}`,
      phone: driver.phone,
      status: driver.status,
      current_vehicle_id: driver.current_vehicle_id,
      total_deliveries: driver.total_deliveries || 0,
      rating: driver.rating ? parseFloat(driver.rating.toString()) : 0,
      vehicle: driver.vehicles ? {
        vehicle_id: driver.vehicles.id,
        vehicle_type: driver.vehicles.vehicle_type,
        license_plate: driver.vehicles.license_plate,
        capacity_weight_kg: driver.vehicles.capacity_weight_kg,
        capacity_volume_m3: driver.vehicles.capacity_volume_m3
      } : null
    };

    return NextResponse.json({
      success: true,
      driver: driverData
    });
  } catch (error) {
    console.error('Error fetching driver info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch driver info'
      },
      { status: 500 }
    );
  }
}
