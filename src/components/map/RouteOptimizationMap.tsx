'use client';

import { useState, useEffect } from 'react';
import DeliveryMap, { MapLocation, MapRoute } from './DeliveryMap';

// ===================================
// Types
// ===================================

interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
}

interface OptimizationResult {
  original_order: string[];
  optimized_order: string[];
  total_distance: number;
  total_duration: number;
  savings?: {
    distance_saved: number;
    time_saved: number;
  };
  route_details?: RouteSegment[];
}

interface Location {
  name: string;
  lat: number;
  lon: number;
  priority?: number;
}

interface RouteOptimizationMapProps {
  locations: Location[];
  optimizationResult?: OptimizationResult | null;
  showOptimizedRoute?: boolean;
  showOriginalRoute?: boolean;
  height?: string;
}

// ===================================
// Helper Functions
// ===================================

// Generate route coordinates (simplified line between points)
const generateRouteCoordinates = (
  locations: Location[],
  order: string[]
): [number, number][] => {
  const coords: [number, number][] = [];

  order.forEach((locationName) => {
    const location = locations.find(loc => loc.name === locationName);
    if (location) {
      coords.push([location.lat, location.lon]);
    }
  });

  return coords;
};

// Generate curved route (more realistic looking)
const generateCurvedRoute = (
  start: [number, number],
  end: [number, number],
  segments: number = 10
): [number, number][] => {
  const coords: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Add slight curve for more realistic appearance
    const lat = start[0] + (end[0] - start[0]) * t + Math.sin(t * Math.PI) * 0.002;
    const lon = start[1] + (end[1] - start[1]) * t + Math.cos(t * Math.PI) * 0.002;

    coords.push([lat, lon]);
  }

  return coords;
};

// Generate all route segments with curves
const generateDetailedRoute = (
  locations: Location[],
  order: string[]
): [number, number][] => {
  const allCoords: [number, number][] = [];

  for (let i = 0; i < order.length - 1; i++) {
    const currentLoc = locations.find(loc => loc.name === order[i]);
    const nextLoc = locations.find(loc => loc.name === order[i + 1]);

    if (currentLoc && nextLoc) {
      const segmentCoords = generateCurvedRoute(
        [currentLoc.lat, currentLoc.lon],
        [nextLoc.lat, nextLoc.lon],
        15
      );

      // Add all points except the last one (to avoid duplicates)
      allCoords.push(...segmentCoords.slice(0, -1));
    }
  }

  // Add the final point
  const lastLoc = locations.find(loc => loc.name === order[order.length - 1]);
  if (lastLoc) {
    allCoords.push([lastLoc.lat, lastLoc.lon]);
  }

  return allCoords;
};

// ===================================
// Main Component
// ===================================

export default function RouteOptimizationMap({
  locations,
  optimizationResult,
  showOptimizedRoute = true,
  showOriginalRoute = true,
  height = '500px',
}: RouteOptimizationMapProps) {
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [center, setCenter] = useState<[number, number]>([13.7563, 100.5018]);

  // Update map locations
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    const mapLocs: MapLocation[] = locations.map((loc, index) => ({
      id: `loc-${index}`,
      name: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      type: index === 0 ? 'store' : 'customer',
      priority: loc.priority,
      status: 'pending',
    }));

    setMapLocations(mapLocs);

    // Calculate center from locations
    const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const avgLon = locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;
    setCenter([avgLat, avgLon]);
  }, [locations]);

  // Update routes based on optimization result
  useEffect(() => {
    if (!optimizationResult || !locations || locations.length === 0) {
      setRoutes([]);
      return;
    }

    const newRoutes: MapRoute[] = [];

    // Original route (red, dashed)
    if (showOriginalRoute && optimizationResult.original_order.length > 0) {
      const originalCoords = generateDetailedRoute(
        locations,
        optimizationResult.original_order
      );

      if (originalCoords.length > 0) {
        newRoutes.push({
          id: 'original-route',
          coordinates: originalCoords,
          color: '#dc2626',
          weight: 3,
          opacity: 0.5,
          label: `Original Route: ${optimizationResult.total_distance.toFixed(2)} km`,
        });
      }
    }

    // Optimized route (green, solid)
    if (showOptimizedRoute && optimizationResult.optimized_order.length > 0) {
      const optimizedCoords = generateDetailedRoute(
        locations,
        optimizationResult.optimized_order
      );

      if (optimizedCoords.length > 0) {
        newRoutes.push({
          id: 'optimized-route',
          coordinates: optimizedCoords,
          color: '#15803d',
          weight: 4,
          opacity: 0.8,
          label: optimizationResult.savings
            ? `Optimized Route: ${optimizationResult.total_distance.toFixed(2)} km (Saved: ${optimizationResult.savings.distance_saved.toFixed(2)} km)`
            : `Optimized Route: ${optimizationResult.total_distance.toFixed(2)} km`,
        });
      }
    }

    setRoutes(newRoutes);
  }, [optimizationResult, locations, showOriginalRoute, showOptimizedRoute]);

  // Update location status based on optimization
  useEffect(() => {
    if (!optimizationResult || !mapLocations.length) return;

    // Mark locations in optimized order
    const updatedLocations = mapLocations.map(loc => {
      const orderIndex = optimizationResult.optimized_order.indexOf(loc.name);
      return {
        ...loc,
        priority: orderIndex >= 0 ? optimizationResult.optimized_order.length - orderIndex : loc.priority,
      };
    });

    setMapLocations(updatedLocations);
  }, [optimizationResult]);

  return (
    <div className="relative">
      <DeliveryMap
        center={center}
        zoom={13}
        locations={mapLocations}
        routes={routes}
        height={height}
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h3 className="font-bold text-sm mb-2">Legend</h3>
        <div className="space-y-2 text-xs">
          {showOriginalRoute && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-red-600 opacity-50"></div>
              <span>Original Route</span>
            </div>
          )}
          {showOptimizedRoute && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-green-700 opacity-80"></div>
              <span>Optimized Route</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            <span>Store</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-700 rounded-full"></div>
            <span>Customer</span>
          </div>
        </div>
      </div>

      {/* Route Statistics */}
      {optimizationResult && optimizationResult.savings && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
          <h3 className="font-bold text-sm mb-2 text-green-700">Optimization Savings</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Distance Saved:</span>
              <span className="font-bold text-green-600">
                {optimizationResult.savings.distance_saved.toFixed(2)} km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time Saved:</span>
              <span className="font-bold text-green-600">
                {Math.round(optimizationResult.savings.time_saved / 60)} min
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Efficiency:</span>
              <span className="font-bold text-green-600">
                {((optimizationResult.savings.distance_saved / (optimizationResult.total_distance + optimizationResult.savings.distance_saved)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
