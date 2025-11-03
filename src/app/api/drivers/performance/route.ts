// ===================================
// GET /api/drivers/performance - Driver Performance Dashboard
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma, HTTP_STATUS } from '@/lib';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Get all active drivers
    const drivers = await prisma.driver.findMany({
      where: {
        status: 'active',
      },
      include: {
        deliveries: {
          where: {
            created_at: {
              gte: oneWeekAgo,
            },
          },
          include: {
            vehicle: true,
          },
        },
      },
    });

    // 2. Calculate performance metrics for each driver
    const driverPerformance = await Promise.all(
      drivers.map(async (driver, index) => {
        const deliveries = driver.deliveries;
        const totalDeliveries = deliveries.length;

        // On-time deliveries
        const onTimeDeliveries = deliveries.filter(
          (d) => d.delivery_status === 'delivered' && (!d.delay_minutes || d.delay_minutes <= 0)
        ).length;
        const onTimeRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

        // Average delivery time
        const completedDeliveries = deliveries.filter(
          (d) => d.delivery_status === 'delivered' && d.actual_duration_min
        );
        const avgDeliveryTime = completedDeliveries.length > 0
          ? Math.round(completedDeliveries.reduce((sum, d) => sum + (d.actual_duration_min || 0), 0) / completedDeliveries.length)
          : 0;

        // Total distance
        const totalDistance = deliveries.reduce((sum, d) => sum + (d.actual_distance_km || 0), 0);

        // Fuel efficiency (km/liter) - get from vehicle or calculate average
        const vehicleFuelEfficiencies = deliveries
          .filter((d) => d.vehicle && d.vehicle.fuel_efficiency)
          .map((d) => d.vehicle!.fuel_efficiency!);
        const fuelEfficiency = vehicleFuelEfficiencies.length > 0
          ? vehicleFuelEfficiencies.reduce((sum, fe) => sum + fe, 0) / vehicleFuelEfficiencies.length
          : 30.0; // Default

        // Customer rating (use driver's rating or default)
        const customerRating = driver.rating || 4.5;

        // Calculate earnings (฿100 per delivery as base)
        const earnings = totalDeliveries * 100;

        // Determine badge based on performance
        let badge = '📦 Active';
        if (onTimeRate >= 95) badge = '🏆 Top Performer';
        else if (onTimeRate >= 93) badge = '⭐ Excellent';
        else if (onTimeRate >= 90) badge = '💚 Great';
        else if (onTimeRate >= 85) badge = '✅ Good';

        // Determine trend (compare first half vs second half of week)
        const midWeek = new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000);
        const firstHalfDeliveries = deliveries.filter((d) => d.created_at < midWeek).length;
        const secondHalfDeliveries = deliveries.filter((d) => d.created_at >= midWeek).length;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (secondHalfDeliveries > firstHalfDeliveries * 1.1) trend = 'up';
        else if (secondHalfDeliveries < firstHalfDeliveries * 0.9) trend = 'down';

        // Weekly deliveries (last 7 days)
        const weeklyDeliveries = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
          const dayDeliveries = deliveries.filter(
            (d) => d.created_at >= dayStart && d.created_at < dayEnd
          ).length;
          weeklyDeliveries.push(dayDeliveries);
        }

        return {
          driver_id: driver.employee_id,
          name: `${driver.first_name} ${driver.last_name}`,
          rank: 0, // Will be calculated after sorting
          total_deliveries: totalDeliveries,
          on_time_deliveries: onTimeDeliveries,
          on_time_rate: Math.round(onTimeRate * 10) / 10,
          avg_delivery_time: avgDeliveryTime,
          fuel_efficiency: Math.round(fuelEfficiency * 10) / 10,
          total_distance: Math.round(totalDistance),
          customer_rating: Math.round(customerRating * 10) / 10,
          earnings,
          badge,
          trend,
          weekly_deliveries: weeklyDeliveries,
        };
      })
    );

    // 3. Sort by on-time rate, then by total deliveries
    const sortedDrivers = driverPerformance.sort((a, b) => {
      if (b.on_time_rate !== a.on_time_rate) {
        return b.on_time_rate - a.on_time_rate;
      }
      return b.total_deliveries - a.total_deliveries;
    });

    // 4. Assign ranks
    sortedDrivers.forEach((driver, index) => {
      driver.rank = index + 1;
    });

    // 5. Calculate overall statistics
    const overallStats = {
      totalDrivers: sortedDrivers.length,
      avgOnTimeRate: sortedDrivers.length > 0
        ? (sortedDrivers.reduce((sum, d) => sum + d.on_time_rate, 0) / sortedDrivers.length).toFixed(1)
        : '0.0',
      avgFuelEfficiency: sortedDrivers.length > 0
        ? (sortedDrivers.reduce((sum, d) => sum + d.fuel_efficiency, 0) / sortedDrivers.length).toFixed(1)
        : '0.0',
      totalDeliveries: sortedDrivers.reduce((sum, d) => sum + d.total_deliveries, 0),
    };

    return NextResponse.json(
      {
        success: true,
        drivers: sortedDrivers,
        overallStats,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('Error fetching driver performance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch driver performance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
