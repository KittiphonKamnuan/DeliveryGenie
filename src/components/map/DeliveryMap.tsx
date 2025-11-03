'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ===================================
// Types
// ===================================

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'store' | 'customer' | 'vehicle';
  priority?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
  label?: string;
}

export interface VehiclePosition {
  id: string;
  lat: number;
  lon: number;
  heading?: number;
  speed?: number;
  driver?: string;
  status?: 'idle' | 'driving' | 'delivering';
}

interface DeliveryMapProps {
  center?: [number, number];
  zoom?: number;
  locations?: MapLocation[];
  routes?: MapRoute[];
  vehicles?: VehiclePosition[];
  showTraffic?: boolean;
  onLocationClick?: (location: MapLocation) => void;
  onVehicleClick?: (vehicle: VehiclePosition) => void;
  height?: string;
  animateVehicles?: boolean;
}

// ===================================
// Custom Icons
// ===================================

const createCustomIcon = (type: string, color: string = '#15803d') => {
  const iconHtml = {
    store: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <span style="color: white; font-size: 18px;">🏪</span>
    </div>`,
    customer: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <span style="color: white; font-size: 14px;">📦</span>
    </div>`,
    vehicle: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); animation: pulse 2s infinite;">
      <span style="color: white; font-size: 20px;">🚚</span>
    </div>`,
  };

  return L.divIcon({
    html: iconHtml[type as keyof typeof iconHtml] || iconHtml.customer,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// ===================================
// Main Component
// ===================================

export default function DeliveryMap({
  center = [13.7563, 100.5018], // Bangkok center
  zoom = 12,
  locations = [],
  routes = [],
  vehicles = [],
  showTraffic = false,
  onLocationClick,
  onVehicleClick,
  height = '500px',
  animateVehicles = true,
}: DeliveryMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routesRef = useRef<Map<string, L.Polyline>>(new Map());
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [isClient, setIsClient] = useState(false);

  // Initialize map
  useEffect(() => {
    setIsClient(true);

    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (mapRef.current) return; // Map already initialized

    // Create map
    const map = L.map(mapContainerRef.current).setView(center, zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Add custom CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      .custom-marker-icon {
        background: none !important;
        border: none !important;
      }
      .vehicle-marker {
        transition: all 0.5s ease-out;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map center and zoom
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  // Update locations markers
  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Remove markers that are no longer in locations
    const currentIds = new Set(locations.map(loc => loc.id));
    for (const [id, marker] of currentMarkers.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    locations.forEach((location) => {
      const { id, name, lat, lon, type, priority, status } = location;

      let color = '#15803d'; // green
      if (type === 'store') color = '#dc2626'; // red
      else if (priority && priority > 7) color = '#ea580c'; // orange
      else if (status === 'completed') color = '#6b7280'; // gray

      if (currentMarkers.has(id)) {
        // Update existing marker
        const marker = currentMarkers.get(id)!;
        marker.setLatLng([lat, lon]);
        marker.setIcon(createCustomIcon(type, color));
      } else {
        // Create new marker
        const marker = L.marker([lat, lon], {
          icon: createCustomIcon(type, color),
        });

        // Add popup
        const popupContent = `
          <div style="min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${color};">${name}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              <strong>Type:</strong> ${type}<br/>
              <strong>Location:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}
              ${priority ? `<br/><strong>Priority:</strong> ${priority}` : ''}
              ${status ? `<br/><strong>Status:</strong> ${status}` : ''}
            </p>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Add click handler
        if (onLocationClick) {
          marker.on('click', () => onLocationClick(location));
        }

        marker.addTo(map);
        currentMarkers.set(id, marker);
      }
    });

    // Fit bounds if there are locations
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, isClient, onLocationClick]);

  // Update routes
  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    const map = mapRef.current;
    const currentRoutes = routesRef.current;

    // Remove old routes
    const currentRouteIds = new Set(routes.map(r => r.id));
    for (const [id, polyline] of currentRoutes.entries()) {
      if (!currentRouteIds.has(id)) {
        polyline.remove();
        currentRoutes.delete(id);
      }
    }

    // Add or update routes
    routes.forEach((route) => {
      const { id, coordinates, color = '#2563eb', weight = 4, opacity = 0.7, label } = route;

      if (currentRoutes.has(id)) {
        // Update existing route
        const polyline = currentRoutes.get(id)!;
        polyline.setLatLngs(coordinates);
        polyline.setStyle({ color, weight, opacity });
      } else {
        // Create new route
        const polyline = L.polyline(coordinates, {
          color,
          weight,
          opacity,
        });

        if (label) {
          polyline.bindPopup(label);
        }

        polyline.addTo(map);
        currentRoutes.set(id, polyline);
      }
    });
  }, [routes, isClient]);

  // Update vehicles with animation
  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    const map = mapRef.current;
    const currentVehicles = vehicleMarkersRef.current;

    // Remove vehicles that are no longer in the list
    const currentVehicleIds = new Set(vehicles.map(v => v.id));
    for (const [id, marker] of currentVehicles.entries()) {
      if (!currentVehicleIds.has(id)) {
        marker.remove();
        currentVehicles.delete(id);
      }
    }

    // Add or update vehicles
    vehicles.forEach((vehicle) => {
      const { id, lat, lon, heading, speed, driver, status } = vehicle;

      let color = '#15803d'; // green - idle
      if (status === 'driving') color = '#2563eb'; // blue
      else if (status === 'delivering') color = '#ea580c'; // orange

      if (currentVehicles.has(id)) {
        // Animate existing vehicle to new position
        const marker = currentVehicles.get(id)!;
        if (animateVehicles) {
          const oldLatLng = marker.getLatLng();
          const newLatLng = L.latLng(lat, lon);

          // Smooth animation
          let progress = 0;
          const duration = 1000; // 1 second
          const steps = 60;
          const stepDuration = duration / steps;

          const animate = () => {
            progress += 1 / steps;
            if (progress >= 1) {
              marker.setLatLng(newLatLng);
              marker.setIcon(createCustomIcon('vehicle', color));
              return;
            }

            const interpolatedLat = oldLatLng.lat + (newLatLng.lat - oldLatLng.lat) * progress;
            const interpolatedLon = oldLatLng.lng + (newLatLng.lng - oldLatLng.lng) * progress;
            marker.setLatLng([interpolatedLat, interpolatedLon]);

            setTimeout(animate, stepDuration);
          };

          animate();
        } else {
          marker.setLatLng([lat, lon]);
          marker.setIcon(createCustomIcon('vehicle', color));
        }
      } else {
        // Create new vehicle marker
        const marker = L.marker([lat, lon], {
          icon: createCustomIcon('vehicle', color),
        });

        // Add popup
        const popupContent = `
          <div style="min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${color};">🚚 Vehicle ${id}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              ${driver ? `<strong>Driver:</strong> ${driver}<br/>` : ''}
              <strong>Status:</strong> ${status || 'unknown'}<br/>
              ${speed !== undefined ? `<strong>Speed:</strong> ${speed} km/h<br/>` : ''}
              <strong>Location:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}
            </p>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Add click handler
        if (onVehicleClick) {
          marker.on('click', () => onVehicleClick(vehicle));
        }

        marker.addTo(map);
        currentVehicles.set(id, marker);
      }
    });
  }, [vehicles, isClient, animateVehicles, onVehicleClick]);

  // Traffic layer (placeholder - would need real API integration)
  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    if (showTraffic) {
      // In a real implementation, you would integrate with:
      // - Google Maps Traffic Layer
      // - HERE Maps Traffic API
      // - TomTom Traffic API
      // For now, we'll show a placeholder message
      console.log('Traffic layer would be shown here with real API integration');
    }
  }, [showTraffic, isClient]);

  if (!isClient) {
    return (
      <div
        style={{ height, width: '100%' }}
        className="bg-gray-100 rounded-lg flex items-center justify-center"
      >
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg shadow-lg"
    />
  );
}
