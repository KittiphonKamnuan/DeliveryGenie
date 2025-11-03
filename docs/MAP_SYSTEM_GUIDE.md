# 🗺️ Interactive Map System Guide

> ระบบแผนที่แบบ Interactive สำหรับติดตามการส่งของ - DeliveryGenie

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Components](#components)
4. [Usage Examples](#usage-examples)
5. [Integration Guide](#integration-guide)

---

## 🎯 Overview

ระบบแผนที่ Interactive ของ DeliveryGenie สร้างขึ้นด้วย **Leaflet.js** และ **OpenStreetMap** เพื่อ:

- 🗺️ แสดงเส้นทางการส่งของแบบเรียลไทม์
- 🚚 ติดตามตำแหน่งรถส่งของ
- 📍 จัดการจุดส่งของ
- 🚦 แสดง Traffic Overlay
- 📊 วิเคราะห์และเปรียบเทียบเส้นทาง

---

## ✨ Features

### 1. Base Map Component (DeliveryMap)
- 🗺️ Interactive Leaflet Map
- 📍 Custom Markers (Stores, Customers, Vehicles)
- 🛣️ Route Polylines
- 🚚 Animated Vehicle Tracking
- 🚦 Traffic Layer Support

### 2. Route Optimization Map
- ✅ Before/After Route Comparison
- 📊 Savings Visualization
- 🎯 Priority-based Routing
- 📈 Distance & Time Statistics

### 3. Vehicle Tracking Map
- 🚚 Real-time Vehicle Positions
- 📍 Delivery Stop Management
- 🔄 Auto-update (Simulated)
- 📊 Live Statistics
- 🗺️ Vehicle Route Display

### 4. Traffic Overlay
- 🚦 Traffic Congestion Levels
- 🎨 Color-coded Roads
- 📊 Speed Information
- 🗺️ Real-time Updates

---

## 🧩 Components

### 1. DeliveryMap (Base Component)

**Location:** `src/components/map/DeliveryMap.tsx`

**Features:**
- Interactive Leaflet map
- Custom markers with icons
- Route polylines
- Vehicle animation
- Popup information

**Props:**
```typescript
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
```

**Usage:**
```tsx
import DeliveryMap from '@/components/map/DeliveryMap';

<DeliveryMap
  center={[13.7563, 100.5018]}
  zoom={12}
  locations={locations}
  routes={routes}
  vehicles={vehicles}
  height="500px"
/>
```

---

### 2. RouteOptimizationMap

**Location:** `src/components/map/RouteOptimizationMap.tsx`

**Features:**
- Compare original vs optimized routes
- Show savings statistics
- Route visualization with curves
- Legend and metrics

**Props:**
```typescript
interface RouteOptimizationMapProps {
  locations: Location[];
  optimizationResult?: OptimizationResult | null;
  showOptimizedRoute?: boolean;
  showOriginalRoute?: boolean;
  height?: string;
}
```

**Usage:**
```tsx
import RouteOptimizationMap from '@/components/map/RouteOptimizationMap';

<RouteOptimizationMap
  locations={locations}
  optimizationResult={result}
  showOptimizedRoute={true}
  showOriginalRoute={true}
  height="500px"
/>
```

---

### 3. VehicleTrackingMap

**Location:** `src/components/map/VehicleTrackingMap.tsx`

**Features:**
- Real-time vehicle tracking
- Delivery stop management
- Auto-update simulation
- Statistics panel
- Vehicle info cards

**Props:**
```typescript
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
```

**Usage:**
```tsx
import VehicleTrackingMap from '@/components/map/VehicleTrackingMap';

<VehicleTrackingMap
  vehicles={vehicles}
  stops={stops}
  showRoutes={true}
  autoUpdate={true}
  updateInterval={2000}
  height="600px"
/>
```

---

### 4. TrafficOverlay

**Location:** `src/components/map/TrafficOverlay.tsx`

**Features:**
- Traffic congestion visualization
- Color-coded by severity
- Speed information
- Mock data generator

**Usage:**
```tsx
import TrafficOverlay, { generateMockTrafficData } from '@/components/map/TrafficOverlay';

const trafficData = generateMockTrafficData([13.7563, 100.5018], 0.05);

<TrafficOverlay
  map={mapRef.current}
  trafficData={trafficData}
  enabled={showTraffic}
/>
```

---

## 💻 Usage Examples

### Example 1: Route Optimization Page

```tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const RouteOptimizationMap = dynamic(
  () => import('@/components/map/RouteOptimizationMap'),
  { ssr: false }
);

export default function RouteOptimizationPage() {
  const [locations, setLocations] = useState([...]);
  const [result, setResult] = useState(null);

  const optimizeRoute = async () => {
    const response = await fetch('/api/routes/optimize', {
      method: 'POST',
      body: JSON.stringify({ locations })
    });
    const data = await response.json();
    setResult(data);
  };

  return (
    <div>
      <RouteOptimizationMap
        locations={locations}
        optimizationResult={result}
      />
      <button onClick={optimizeRoute}>
        Optimize Route
      </button>
    </div>
  );
}
```

### Example 2: Vehicle Tracking Page

```tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const VehicleTrackingMap = dynamic(
  () => import('@/components/map/VehicleTrackingMap'),
  { ssr: false }
);

export default function VehicleTrackingPage() {
  const [vehicles, setVehicles] = useState([...]);
  const [stops, setStops] = useState([...]);

  return (
    <VehicleTrackingMap
      vehicles={vehicles}
      stops={stops}
      showRoutes={true}
      showTraffic={false}
      autoUpdate={true}
      updateInterval={2000}
    />
  );
}
```

---

## 🔧 Installation

### 1. Install Dependencies

```bash
npm install leaflet react-leaflet @types/leaflet
```

### 2. Import CSS

Add to `app/layout.tsx`:

```tsx
import 'leaflet/dist/leaflet.css';
```

### 3. Use Dynamic Imports

Always use dynamic imports for map components (Next.js requirement):

```tsx
import dynamic from 'next/dynamic';

const MyMap = dynamic(
  () => import('@/components/map/MyMap'),
  { ssr: false }
);
```

---

## 🎨 Customization

### Custom Markers

```tsx
const customIcon = L.divIcon({
  html: `<div style="...">Icon HTML</div>`,
  className: 'custom-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
```

### Custom Route Colors

```tsx
const route = {
  id: 'route-1',
  coordinates: [...],
  color: '#15803d', // Green
  weight: 4,
  opacity: 0.8,
};
```

### Custom Map Style

Replace OpenStreetMap with other tile providers:

```tsx
// Satellite view
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')

// Dark mode
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
```

---

## 📊 Map Features

### 1. Interactive Markers
- 🏪 Store markers (red)
- 📦 Customer markers (green)
- 🚚 Vehicle markers (animated)
- 💬 Popup information
- 🎯 Click events

### 2. Route Visualization
- 🛣️ Curved polylines
- 🎨 Color-coded routes
- 📊 Distance/time info
- 🔄 Before/after comparison

### 3. Vehicle Animation
- 🚚 Smooth transitions
- 📍 Real-time updates
- 🎬 Interpolated movement
- 🔄 Auto-refresh

### 4. Traffic Overlay
- 🚦 Congestion levels
- 🎨 Color coding:
  - 🟢 Green: Low (60+ km/h)
  - 🟡 Yellow: Medium (40-60 km/h)
  - 🟠 Orange: High (20-40 km/h)
  - 🔴 Red: Severe (<20 km/h)

---

## 📱 Responsive Design

The map components are fully responsive:

- **Mobile:** Touch-friendly controls
- **Tablet:** Optimized layout
- **Desktop:** Full-featured interface

---

## 🔌 API Integration

### Get Route Optimization

```typescript
POST /api/routes/optimize
{
  "locations": [
    { "name": "Store", "lat": 14.0729, "lon": 100.6058 },
    { "name": "Customer A", "lat": 14.0293, "lon": 100.6193 }
  ]
}
```

### Get Vehicle Positions

```typescript
GET /api/vehicles/tracking
Response: {
  "vehicles": [
    {
      "id": "V001",
      "lat": 14.0729,
      "lon": 100.6058,
      "status": "driving",
      "speed": 35
    }
  ]
}
```

---

## 🚀 Performance Tips

1. **Lazy Loading:**
   - Use dynamic imports
   - Load maps only when needed

2. **Debouncing:**
   - Debounce map updates
   - Batch marker updates

3. **Caching:**
   - Cache tile data
   - Reuse map instances

4. **Optimization:**
   - Limit visible markers
   - Use clustering for many points
   - Simplify polylines

---

## 🐛 Troubleshooting

### Map not displaying

```bash
# Ensure Leaflet CSS is imported
import 'leaflet/dist/leaflet.css';

# Use dynamic import
const Map = dynamic(() => import('./Map'), { ssr: false });
```

### Markers not showing

```tsx
// Fix default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});
```

---

## 📚 Resources

- [Leaflet Documentation](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)

---

**Last Updated:** November 3, 2025
**Version:** 1.0.0
