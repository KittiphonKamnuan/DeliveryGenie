// ===================================
// Route Optimization Utilities
// ===================================

interface Location {
  name: string;
  lat: number;
  lon: number;
  priority?: number;
}

interface OptimizationResult {
  route_order: number[];
  total_distance: number;
  total_duration: number;
  optimized_order: string[];
  original_order: string[];
  savings?: {
    distance_saved: number;
    time_saved: number;
  };
}

/**
 * Call Lambda function for core route optimization
 */
export async function optimizeCoreRoute(
  locations: Location[],
  startIndex: number = 0,
  endIndex?: number
): Promise<OptimizationResult> {
  const response = await fetch('/api/routes/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stores: locations,
      start_index: startIndex,
      end_index: endIndex ?? locations.length - 1,
    }),
  });

  if (!response.ok) {
    throw new Error('Core route optimization failed');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Call Lambda function for multi-stop TSP optimization
 */
export async function optimizeMultiStop(
  locations: Location[],
  startIndex: number = 0,
  usePriority: boolean = true
): Promise<OptimizationResult> {
  const response = await fetch('/api/routes/multi-stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stores: locations,
      start_index: startIndex,
      use_priority: usePriority,
    }),
  });

  if (!response.ok) {
    throw new Error('Multi-stop optimization failed');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Call Lambda function for traffic-optimized routing
 */
export async function optimizeTrafficRoute(
  locations: Location[],
  startIndex: number = 0,
  useRealApi: boolean = false
): Promise<OptimizationResult> {
  const response = await fetch('/api/routes/traffic-optimized', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stores: locations,
      start_index: startIndex,
      use_real_api: useRealApi,
    }),
  });

  if (!response.ok) {
    throw new Error('Traffic-optimized routing failed');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Auto-optimize routes for all pending orders
 */
export async function autoOptimizeRoutes(): Promise<{
  success: boolean;
  routes: unknown[];
  orders_assigned: number;
}> {
  const response = await fetch('/api/routes/auto-optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Auto-optimization failed');
  }

  const result = await response.json();
  return result;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Group orders by proximity
 */
export function groupOrdersByProximity(
  orders: Array<{ id: string; lat: number; lon: number }>,
  maxGroupSize: number = 20,
  proximityThreshold: number = 5 // km
): Array<Array<typeof orders[0]>> {
  const groups: Array<Array<typeof orders[0]>> = [];
  const processed = new Set<string>();

  for (const order of orders) {
    if (processed.has(order.id)) continue;

    const group = [order];
    processed.add(order.id);

    // Find nearby orders
    for (const other of orders) {
      if (processed.has(other.id)) continue;
      if (group.length >= maxGroupSize) break;

      const distance = calculateDistance(order.lat, order.lon, other.lat, other.lon);
      if (distance <= proximityThreshold) {
        group.push(other);
        processed.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups;
}
