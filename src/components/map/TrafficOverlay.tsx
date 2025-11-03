'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

// ===================================
// Types
// ===================================

export interface TrafficSegment {
  id: string;
  coordinates: [number, number][];
  congestionLevel: 'low' | 'medium' | 'high' | 'severe';
  speed?: number; // km/h
  description?: string;
}

interface TrafficOverlayProps {
  map: L.Map | null;
  trafficData: TrafficSegment[];
  enabled: boolean;
}

// ===================================
// Helper Functions
// ===================================

const getCongestionColor = (level: string): string => {
  switch (level) {
    case 'low':
      return '#22c55e'; // green
    case 'medium':
      return '#eab308'; // yellow
    case 'high':
      return '#f97316'; // orange
    case 'severe':
      return '#dc2626'; // red
    default:
      return '#6b7280'; // gray
  }
};

const getCongestionOpacity = (level: string): number => {
  switch (level) {
    case 'low':
      return 0.4;
    case 'medium':
      return 0.6;
    case 'high':
      return 0.7;
    case 'severe':
      return 0.8;
    default:
      return 0.5;
  }
};

// ===================================
// Generate Mock Traffic Data
// ===================================

export const generateMockTrafficData = (
  center: [number, number],
  radius: number = 0.05
): TrafficSegment[] => {
  const segments: TrafficSegment[] = [];
  const numSegments = 15 + Math.floor(Math.random() * 10);

  for (let i = 0; i < numSegments; i++) {
    const startLat = center[0] + (Math.random() - 0.5) * radius;
    const startLon = center[1] + (Math.random() - 0.5) * radius;
    const endLat = startLat + (Math.random() - 0.5) * (radius / 3);
    const endLon = startLon + (Math.random() - 0.5) * (radius / 3);

    // Generate curved segment
    const coords: [number, number][] = [];
    const steps = 5 + Math.floor(Math.random() * 5);
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const lat = startLat + (endLat - startLat) * t + Math.sin(t * Math.PI) * 0.002;
      const lon = startLon + (endLon - startLon) * t + Math.cos(t * Math.PI) * 0.002;
      coords.push([lat, lon]);
    }

    const levels = ['low', 'low', 'medium', 'high', 'severe'] as const;
    const level = levels[Math.floor(Math.random() * levels.length)];

    const speeds = {
      low: 60 + Math.random() * 20,
      medium: 40 + Math.random() * 20,
      high: 20 + Math.random() * 20,
      severe: 5 + Math.random() * 15,
    };

    segments.push({
      id: `traffic-${i}`,
      coordinates: coords,
      congestionLevel: level,
      speed: Math.round(speeds[level]),
      description: `Traffic Level: ${level}`,
    });
  }

  return segments;
};

// ===================================
// Main Component
// ===================================

export default function TrafficOverlay({
  map,
  trafficData,
  enabled,
}: TrafficOverlayProps) {
  const layersRef = useRef<Map<string, L.Polyline>>(new Map());

  useEffect(() => {
    if (!map || !enabled) {
      // Remove all layers if disabled
      layersRef.current.forEach(layer => layer.remove());
      layersRef.current.clear();
      return;
    }

    const currentLayers = layersRef.current;

    // Remove layers that are no longer in data
    const currentIds = new Set(trafficData.map(t => t.id));
    for (const [id, layer] of currentLayers.entries()) {
      if (!currentIds.has(id)) {
        layer.remove();
        currentLayers.delete(id);
      }
    }

    // Add or update traffic segments
    trafficData.forEach(segment => {
      const color = getCongestionColor(segment.congestionLevel);
      const opacity = getCongestionOpacity(segment.congestionLevel);

      if (currentLayers.has(segment.id)) {
        // Update existing layer
        const layer = currentLayers.get(segment.id)!;
        layer.setLatLngs(segment.coordinates);
        layer.setStyle({ color, opacity, weight: 6 });
      } else {
        // Create new layer
        const layer = L.polyline(segment.coordinates, {
          color,
          weight: 6,
          opacity,
        });

        // Add popup with traffic info
        const popupContent = `
          <div style="min-width: 120px;">
            <h4 style="margin: 0 0 8px 0; font-weight: bold; color: ${color};">
              Traffic: ${segment.congestionLevel.toUpperCase()}
            </h4>
            ${segment.speed ? `<p style="margin: 4px 0; font-size: 12px;">Average Speed: ${segment.speed} km/h</p>` : ''}
            ${segment.description ? `<p style="margin: 4px 0; font-size: 11px; color: #666;">${segment.description}</p>` : ''}
          </div>
        `;
        layer.bindPopup(popupContent);

        layer.addTo(map);
        currentLayers.set(segment.id, layer);
      }
    });

    return () => {
      // Cleanup on unmount
      currentLayers.forEach(layer => layer.remove());
      currentLayers.clear();
    };
  }, [map, trafficData, enabled]);

  return null; // This is a utility component, renders nothing
}

// ===================================
// Traffic Legend Component
// ===================================

interface TrafficLegendProps {
  show: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function TrafficLegend({
  show,
  position = 'bottom-left',
}: TrafficLegendProps) {
  if (!show) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} bg-white rounded-lg shadow-lg p-4 z-[1000]`}
    >
      <h3 className="font-bold text-sm mb-3">Traffic Conditions</h3>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-2 bg-green-500 rounded"></div>
          <span>Low (60+ km/h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-2 bg-yellow-500 rounded"></div>
          <span>Medium (40-60 km/h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-2 bg-orange-500 rounded"></div>
          <span>High (20-40 km/h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-2 bg-red-600 rounded"></div>
          <span>Severe (&lt;20 km/h)</span>
        </div>
      </div>
    </div>
  );
}
