// ===================================
// API: Update Delivery Status
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, driver_id } = await request.json();
    const deliveryId = params.id;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update delivery status
    const updatedDelivery = await prisma.deliveries.update({
      where: { id: deliveryId },
      data: {
        delivery_status: status,
        updated_at: new Date()
      }
    });

    // Also update GPS tracking if location data is provided
    if (driver_id) {
      try {
        await fetch(process.env.LAMBDA_TRACKING_URL || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id,
            delivery_id: deliveryId,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('GPS tracking update failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delivery status'
      },
      { status: 500 }
    );
  }
}
