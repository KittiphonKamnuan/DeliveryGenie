// ===================================
// GET /api/analytics - Real-time Analytics Data
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma, HTTP_STATUS } from '@/lib';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Get all deliveries for overall stats
    const allDeliveries = await prisma.delivery.findMany({
      where: {
        created_at: {
          gte: oneDayAgo,
        },
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        driver: true,
        vehicle: true,
      },
    });

    // 2. Calculate key metrics
    const totalDeliveries = allDeliveries.length;

    const onTimeDeliveries = allDeliveries.filter(
      (d) => d.delivery_status === 'delivered' && (!d.delay_minutes || d.delay_minutes <= 0)
    ).length;

    const onTimeRate = totalDeliveries > 0
      ? (onTimeDeliveries / totalDeliveries) * 100
      : 0;

    // Active drivers (those with in_transit deliveries)
    const activeDriverIds = new Set(
      allDeliveries
        .filter((d) => d.delivery_status === 'in_transit' || d.delivery_status === 'picked_up')
        .map((d) => d.driver_id)
    );
    const activeDrivers = activeDriverIds.size;

    // Average delivery time (for completed deliveries)
    const completedDeliveries = allDeliveries.filter(
      (d) => d.delivery_status === 'delivered' && d.actual_duration_min
    );
    const avgDeliveryTime = completedDeliveries.length > 0
      ? completedDeliveries.reduce((sum, d) => sum + (d.actual_duration_min || 0), 0) / completedDeliveries.length
      : 0;

    // Previous hour metrics for comparison
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const previousHourDeliveries = await prisma.delivery.findMany({
      where: {
        created_at: {
          gte: twoHoursAgo,
          lt: oneHourAgo,
        },
      },
      include: {
        driver: true,
      },
    });

    const previousHourCount = previousHourDeliveries.length;
    const deliveryChange = previousHourCount > 0
      ? ((totalDeliveries - previousHourCount) / previousHourCount) * 100
      : 0;

    // Calculate previous hour on-time rate
    const previousOnTimeDeliveries = previousHourDeliveries.filter(
      (d) => d.delivery_status === 'delivered' && (!d.delay_minutes || d.delay_minutes <= 0)
    ).length;
    const previousOnTimeRate = previousHourCount > 0
      ? (previousOnTimeDeliveries / previousHourCount) * 100
      : 0;
    const onTimeRateChange = previousOnTimeRate > 0
      ? onTimeRate - previousOnTimeRate
      : 0;

    // Calculate previous hour active drivers
    const previousActiveDriverIds = new Set(
      previousHourDeliveries
        .filter((d) => d.delivery_status === 'in_transit' || d.delivery_status === 'picked_up')
        .map((d) => d.driver_id)
    );
    const previousActiveDrivers = previousActiveDriverIds.size;
    const activeDriversChange = previousActiveDrivers > 0
      ? ((activeDrivers - previousActiveDrivers) / previousActiveDrivers) * 100
      : 0;

    // Calculate previous hour avg delivery time
    const previousCompletedDeliveries = previousHourDeliveries.filter(
      (d) => d.delivery_status === 'delivered' && d.actual_duration_min
    );
    const previousAvgDeliveryTime = previousCompletedDeliveries.length > 0
      ? previousCompletedDeliveries.reduce((sum, d) => sum + (d.actual_duration_min || 0), 0) / previousCompletedDeliveries.length
      : 0;
    const avgDeliveryTimeChange = previousAvgDeliveryTime > 0
      ? ((avgDeliveryTime - previousAvgDeliveryTime) / previousAvgDeliveryTime) * 100
      : 0;

    // 3. Delivery Status Distribution
    const statusCounts = {
      delivered: allDeliveries.filter((d) => d.delivery_status === 'delivered').length,
      in_transit: allDeliveries.filter((d) => d.delivery_status === 'in_transit' || d.delivery_status === 'picked_up').length,
      pending: allDeliveries.filter((d) => d.delivery_status === 'pending' || d.delivery_status === 'assigned').length,
      failed: allDeliveries.filter((d) => d.delivery_status === 'failed' || d.delivery_status === 'cancelled').length,
    };

    const deliveryStatus = [
      {
        status: 'Delivered',
        count: statusCounts.delivered,
        percentage: totalDeliveries > 0 ? (statusCounts.delivered / totalDeliveries) * 100 : 0,
        color: '#00A550',
      },
      {
        status: 'In Transit',
        count: statusCounts.in_transit,
        percentage: totalDeliveries > 0 ? (statusCounts.in_transit / totalDeliveries) * 100 : 0,
        color: '#3B82F6',
      },
      {
        status: 'Pending',
        count: statusCounts.pending,
        percentage: totalDeliveries > 0 ? (statusCounts.pending / totalDeliveries) * 100 : 0,
        color: '#F59E0B',
      },
      {
        status: 'Failed',
        count: statusCounts.failed,
        percentage: totalDeliveries > 0 ? (statusCounts.failed / totalDeliveries) * 100 : 0,
        color: '#EF4444',
      },
    ];

    // 4. Active Deliveries (current in-transit deliveries)
    const activeDeliveries = allDeliveries
      .filter((d) => d.delivery_status === 'in_transit' || d.delivery_status === 'picked_up')
      .slice(0, 10)
      .map((delivery) => {
        const minutesRemaining = delivery.planned_arrival
          ? Math.max(0, Math.floor((delivery.planned_arrival.getTime() - now.getTime()) / 60000))
          : 0;

        const isDelayed = delivery.delay_minutes && delivery.delay_minutes > 0;
        const isUrgent = minutesRemaining < 15;

        return {
          id: delivery.delivery_number,
          driver: `${delivery.driver.first_name} ${delivery.driver.last_name}`,
          location: delivery.delivery_location || 'Unknown',
          eta: `${minutesRemaining} นาที`,
          status: isDelayed ? 'delayed' : isUrgent ? 'urgent' : 'on_track',
        };
      });

    // 5. Real-time delivery flow (last 10 time points, 30 seconds apart)
    const realtimeData = [];
    for (let i = 9; i >= 0; i--) {
      const timePoint = new Date(now.getTime() - i * 30 * 1000);
      const timeStr = timePoint.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Count deliveries at this time point (simulate real-time by getting recent deliveries)
      const deliveriesAtTime = allDeliveries.filter(
        (d) => d.created_at <= timePoint
      ).length;

      const onTimeAtTime = allDeliveries.filter(
        (d) => d.created_at <= timePoint && d.delivery_status === 'delivered' && (!d.delay_minutes || d.delay_minutes <= 0)
      ).length;

      const delayedAtTime = allDeliveries.filter(
        (d) => d.created_at <= timePoint && d.delivery_status === 'delivered' && d.delay_minutes && d.delay_minutes > 0
      ).length;

      realtimeData.push({
        time: timeStr,
        deliveries: Math.min(deliveriesAtTime, 60), // Cap at 60 for chart
        onTime: Math.min(onTimeAtTime, 60),
        delayed: Math.min(delayedAtTime, 60),
      });
    }

    // 6. Construct response
    return NextResponse.json(
      {
        success: true,
        metrics: [
          {
            label: 'Total Deliveries',
            value: totalDeliveries,
            change: deliveryChange,
            trend: deliveryChange >= 0 ? 'up' : 'down',
          },
          {
            label: 'On-Time Rate',
            value: onTimeRate,
            change: onTimeRateChange,
            trend: onTimeRateChange >= 0 ? 'up' : 'down',
          },
          {
            label: 'Active Drivers',
            value: activeDrivers,
            change: activeDriversChange,
            trend: activeDriversChange >= 0 ? 'up' : 'down',
          },
          {
            label: 'Avg Delivery Time',
            value: avgDeliveryTime,
            change: avgDeliveryTimeChange,
            trend: avgDeliveryTimeChange >= 0 ? 'up' : 'down',
          },
        ],
        deliveryStatus,
        activeDeliveries,
        realtimeData,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
