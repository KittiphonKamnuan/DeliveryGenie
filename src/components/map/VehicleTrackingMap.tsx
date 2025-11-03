'use client';

import { useState, useEffect, useCallback } from 'react';
import DeliveryMap, { MapLocation, MapRoute, VehiclePosition } from './DeliveryMap';

// ===================================
// Types
// ===================================

export interface TrackingVehicle {
  id: string;
  driver: string;
  lat: number;
  lon: number;
  heading?: number;
  speed?: number;
  status: 'idle' | 'driving' | 'delivering';
  currentRoute?: string[];
  nextStop?: string;
  completedStops?: number;
  totalStops?: number;
}

export interface DeliveryStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: number;
  estimatedTime?: Date;
}

interface VehicleTrackingMapProps {
  vehicles: TrackingVehicle[];
  stops: DeliveryStop[];
  showRoutes?: boolean;
  showTraffic?: boolean;
  height?: string;
  autoUpdate?: boolean;
  updateInterval?: number;
  onVehicleSelect?: (vehicle: TrackingVehicle) => void;
  onStopSelect?: (stop: DeliveryStop) => void;
}

// ===================================
// Mock Data Generator (for demo)
// ===================================

const simulateVehicleMovement = (
  vehicle: TrackingVehicle,
  stops: DeliveryStop[]
): TrackingVehicle => {
  // Find next stop
  const nextStop = stops.find(s => s.status === 'pending' || s.status === 'in_progress');

  if (!nextStop) {
    return { ...vehicle, status: 'idle' };
  }

  // Move vehicle slightly towards next stop
  const dx = nextStop.lat - vehicle.lat;
  const dy = nextStop.lon - vehicle.lon;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.001) {
    // Arrived at stop
    return {
      ...vehicle,
      lat: nextStop.lat,
      lon: nextStop.lon,
      status: 'delivering',
      speed: 0,
    };
  }

  // Move towards stop (simulate 30-50 km/h)
  const speed = 30 + Math.random() * 20;
  const step = 0.0005; // Adjust movement speed

  return {
    ...vehicle,
    lat: vehicle.lat + (dx / distance) * step,
    lon: vehicle.lon + (dy / distance) * step,
    status: 'driving',
    speed: Math.round(speed),
    heading: Math.atan2(dy, dx) * (180 / Math.PI),
  };
};

// ===================================
// Main Component
// ===================================

export default function VehicleTrackingMap({
  vehicles: initialVehicles,
  stops: initialStops,
  showRoutes = true,
  showTraffic = false,
  height = '600px',
  autoUpdate = true,
  updateInterval = 2000,
  onVehicleSelect,
  onStopSelect,
}: VehicleTrackingMapProps) {
  const [vehicles, setVehicles] = useState<TrackingVehicle[]>(initialVehicles);
  const [stops, setStops] = useState<DeliveryStop[]>(initialStops);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  // Update vehicles from props
  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  // Update stops from props
  useEffect(() => {
    setStops(initialStops);
  }, [initialStops]);

  // Auto-update vehicle positions (simulation)
  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(() => {
      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle => simulateVehicleMovement(vehicle, stops))
      );
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval, stops]);

  // Convert to map format
  const mapLocations: MapLocation[] = stops.map(stop => ({
    id: stop.id,
    name: stop.name,
    lat: stop.lat,
    lon: stop.lon,
    type: 'customer',
    priority: stop.priority,
    status: stop.status,
  }));

  const vehiclePositions: VehiclePosition[] = vehicles.map(vehicle => ({
    id: vehicle.id,
    lat: vehicle.lat,
    lon: vehicle.lon,
    heading: vehicle.heading,
    speed: vehicle.speed,
    driver: vehicle.driver,
    status: vehicle.status,
  }));

  // Generate routes for vehicles
  const routes: MapRoute[] = [];
  if (showRoutes) {
    vehicles.forEach((vehicle, index) => {
      if (vehicle.currentRoute && vehicle.currentRoute.length > 0) {
        const routeStops = vehicle.currentRoute
          .map(stopName => stops.find(s => s.name === stopName))
          .filter(s => s !== undefined) as DeliveryStop[];

        if (routeStops.length > 0) {
          const coords: [number, number][] = [
            [vehicle.lat, vehicle.lon],
            ...routeStops.map(s => [s.lat, s.lon] as [number, number]),
          ];

          routes.push({
            id: `vehicle-route-${vehicle.id}`,
            coordinates: coords,
            color: ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6'][index % 4],
            weight: 3,
            opacity: 0.6,
            label: `${vehicle.driver}'s Route`,
          });
        }
      }
    });
  }

  // Calculate center from all locations
  const allLats = [...stops.map(s => s.lat), ...vehicles.map(v => v.lat)];
  const allLons = [...stops.map(s => s.lon), ...vehicles.map(v => v.lon)];
  const center: [number, number] = [
    allLats.reduce((a, b) => a + b, 0) / allLats.length || 13.7563,
    allLons.reduce((a, b) => a + b, 0) / allLons.length || 100.5018,
  ];

  const handleVehicleClick = useCallback(
    (vehicle: VehiclePosition) => {
      setSelectedVehicle(vehicle.id);
      const fullVehicle = vehicles.find(v => v.id === vehicle.id);
      if (fullVehicle && onVehicleSelect) {
        onVehicleSelect(fullVehicle);
      }
    },
    [vehicles, onVehicleSelect]
  );

  const handleLocationClick = useCallback(
    (location: MapLocation) => {
      const stop = stops.find(s => s.id === location.id);
      if (stop && onStopSelect) {
        onStopSelect(stop);
      }
    },
    [stops, onStopSelect]
  );

  return (
    <div className="relative">
      <DeliveryMap
        center={center}
        zoom={12}
        locations={mapLocations}
        routes={routes}
        vehicles={vehiclePositions}
        showTraffic={showTraffic}
        height={height}
        animateVehicles={true}
        onVehicleClick={handleVehicleClick}
        onLocationClick={handleLocationClick}
      />

      {/* Vehicle Info Panel */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-sm">
        <h3 className="font-bold text-sm mb-3">Active Vehicles ({vehicles.length})</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vehicles.map(vehicle => (
            <div
              key={vehicle.id}
              onClick={() => handleVehicleClick(vehicle)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                selectedVehicle === vehicle.id
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">🚚 {vehicle.driver}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    vehicle.status === 'driving'
                      ? 'bg-blue-100 text-blue-700'
                      : vehicle.status === 'delivering'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                {vehicle.speed !== undefined && (
                  <div>Speed: {vehicle.speed} km/h</div>
                )}
                {vehicle.nextStop && (
                  <div>Next: {vehicle.nextStop}</div>
                )}
                {vehicle.completedStops !== undefined && vehicle.totalStops !== undefined && (
                  <div>
                    Progress: {vehicle.completedStops}/{vehicle.totalStops} stops
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h3 className="font-bold text-sm mb-2">Legend</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚚</span>
            <span>Active Vehicle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <span>Delivery Stop</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-blue-600"></div>
            <span>Vehicle Route</span>
          </div>
          {showTraffic && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-red-600"></div>
              <span>Traffic (Heavy)</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h3 className="font-bold text-sm mb-2">Statistics</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Pending:</span>
            <span className="font-bold text-orange-600">
              {stops.filter(s => s.status === 'pending').length}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">In Progress:</span>
            <span className="font-bold text-blue-600">
              {stops.filter(s => s.status === 'in_progress').length}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Completed:</span>
            <span className="font-bold text-green-600">
              {stops.filter(s => s.status === 'completed').length}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-2 border-t">
            <span className="text-gray-600">Total:</span>
            <span className="font-bold">{stops.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
