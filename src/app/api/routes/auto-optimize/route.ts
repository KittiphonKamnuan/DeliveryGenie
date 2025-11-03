// ===================================
// POST /api/routes/auto-optimize - Auto-optimize routes for pending orders
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma, HTTP_STATUS } from '@/lib';

interface OptimizedRoute {
  driver_id: string;
  vehicle_id: string;
  store_id: string;
  order_ids: string[];
  route_order: number[];
  total_distance: number;
  total_duration: number;
  estimated_completion: Date;
}

export async function POST(request: NextRequest) {
  try {
    // Get all pending orders that need to be assigned
    const pendingOrders = await prisma.orders.findMany({
      where: {
        order_status: 'pending',
        priority_score: {
          not: null,
        },
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
        priority_score: 'desc', // Highest priority first
      },
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No pending orders to optimize',
          routes: [],
        },
        { status: HTTP_STATUS.OK }
      );
    }

    // Get available drivers
    const availableDrivers = await prisma.drivers.findMany({
      where: {
        status: 'active',
      },
      include: {
        deliveries: {
          where: {
            delivery_status: {
              in: ['pending', 'assigned', 'picked_up', 'in_transit'],
            },
          },
        },
      },
    });

    // Get available vehicles
    const availableVehicles = await prisma.vehicles.findMany({
      where: {
        current_status: 'available',
      },
    });

    if (availableDrivers.length === 0 || availableVehicles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No available drivers or vehicles',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get store locations (use first store as starting point for now)
    const stores = await prisma.stores.findMany({
      where: {
        is_active: true,
      },
      take: 1,
    });

    if (stores.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active stores found',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const originStore = stores[0];

    // Group orders by proximity and priority (simplified algorithm)
    const maxStopsPerRoute = parseInt(process.env.MAX_STOPS_PER_ROUTE || '20');
    const orderGroups: (typeof pendingOrders)[] = [];
    let currentGroup: typeof pendingOrders = [];

    for (const order of pendingOrders) {
      currentGroup.push(order);

      if (currentGroup.length >= maxStopsPerRoute) {
        orderGroups.push([...currentGroup]);
        currentGroup = [];
      }
    }

    if (currentGroup.length > 0) {
      orderGroups.push(currentGroup);
    }

    // Optimize each group
    const optimizedRoutes: OptimizedRoute[] = [];

    for (let i = 0; i < orderGroups.length && i < availableDrivers.length; i++) {
      const group = orderGroups[i];
      const driver = availableDrivers[i];
      const vehicle = availableVehicles[i % availableVehicles.length];

      // Prepare locations for optimization
      const locations = [
        {
          name: originStore.name,
          lat: originStore.latitude,
          lon: originStore.longitude,
          priority: 10,
        },
        ...group.map(order => ({
          name: order.customers.name,
          lat: order.delivery_latitude,
          lon: order.delivery_longitude,
          priority: order.priority_score || 0,
        })),
      ];

      // Call Lambda function for multi-stop optimization
      const lambdaUrl = process.env.LAMBDA_MULTI_STOP_URL;
      if (!lambdaUrl) {
        throw new Error('Lambda endpoint not configured');
      }

      const lambdaResponse = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stores: locations,
          start_index: 0,
          use_priority: true,
        }),
      });

      if (!lambdaResponse.ok) {
        console.error('Lambda optimization failed for group', i);
        continue;
      }

      const optimizationResult = await lambdaResponse.json();

      // Create route in database
      const now = new Date();
      const estimatedCompletion = new Date(
        now.getTime() + (optimizationResult.total_duration || 3600) * 1000
      );

      const route = await prisma.routes.create({
        data: {
          route_number: `ROUTE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
          origin_store_id: originStore.id,
          route_date: now,
          route_status: 'planned',
          total_distance_km: optimizationResult.total_distance || 0,
          total_duration_min: Math.round((optimizationResult.total_duration || 0) / 60),
          total_orders: group.length,
        },
      });

      // Create deliveries for each order in optimized order
      const routeOrder = optimizationResult.route_order || Array.from({ length: group.length }, (_, i) => i + 1);

      for (let stopIndex = 0; stopIndex < routeOrder.length; stopIndex++) {
        const orderIndex = routeOrder[stopIndex] - 1; // Route order is 1-indexed
        if (orderIndex < 0 || orderIndex >= group.length) continue;

        const order = group[orderIndex];

        // Generate delivery number
        const deliveryNumber = `DEL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`;

        // Calculate estimated arrival time
        const estimatedArrival = new Date(
          now.getTime() + stopIndex * 20 * 60 * 1000 // 20 min per stop estimate
        );

        await prisma.deliveries.create({
          data: {
            delivery_number: deliveryNumber,
            order_id: order.id,
            driver_id: driver.id,
            vehicle_id: vehicle.id,
            route_id: route.id,
            delivery_status: 'assigned',
            pickup_location: originStore.address,
            pickup_latitude: originStore.latitude,
            pickup_longitude: originStore.longitude,
            delivery_location: order.delivery_address,
            delivery_latitude: order.delivery_latitude,
            delivery_longitude: order.delivery_longitude,
            planned_arrival: estimatedArrival,
          },
        });

        // Update order status
        await prisma.orders.update({
          where: { id: order.id },
          data: {
            order_status: 'assigned',
          },
        });

        // Create route stop
        await prisma.routeStop.create({
          data: {
            route_id: route.id,
            stop_order: stopIndex + 1,
            order_id: order.id,
            stop_type: 'delivery',
            address: order.delivery_address,
            latitude: order.delivery_latitude,
            longitude: order.delivery_longitude,
            estimated_arrival: estimatedArrival,
            status: 'pending',
          },
        });
      }

      optimizedRoutes.push({
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        store_id: originStore.id,
        order_ids: group.map(o => o.id),
        route_order: routeOrder,
        total_distance: optimizationResult.total_distance || 0,
        total_duration: optimizationResult.total_duration || 0,
        estimated_completion: estimatedCompletion,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Created ${optimizedRoutes.length} optimized routes`,
        routes: optimizedRoutes,
        orders_assigned: optimizedRoutes.reduce((sum, r) => sum + r.order_ids.length, 0),
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('Error auto-optimizing routes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to auto-optimize routes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
