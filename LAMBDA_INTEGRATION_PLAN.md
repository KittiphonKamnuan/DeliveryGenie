# 🚀 Lambda Integration & Advanced Features Implementation Plan

> **Complete integration guide for remaining Lambda functions and advanced features**

---

## 📋 Overview

This document outlines the implementation plan for:
1. ✅ orderManagement Lambda Integration
2. ✅ routeNavigation Lambda Integration
3. ✅ WebSocket Real-time Tracking
4. ✅ SageMaker ML Pipeline

---

## 1️⃣ Order Management Lambda Integration

### **Current Status**
- ❌ Lambda exists but not integrated
- ✅ Current `/api/orders/create` is custom Next.js route
- 🎯 Goal: Replace with Lambda for better scalability

### **Lambda Capabilities**
```python
# lambda/lambda/orderManagement.py

Functions:
- validate_customer()
- validate_store()
- validate_products()
- check_inventory()
- update_inventory()
- calculate_priority() → Calls priority Lambda
- calculate_eta() → Calls ETA Lambda
- create_order() → Main orchestration
```

### **Integration Steps**

#### A. Create Lambda Proxy Endpoint

```typescript
// src/app/api/lambda/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';

const LAMBDA_ORDER_MANAGEMENT_URL = process.env.LAMBDA_ORDER_MANAGEMENT_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Call orderManagement Lambda
    const response = await fetch(LAMBDA_ORDER_MANAGEMENT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_order',
        data: {
          customer_id: body.customer_id,
          store_id: body.store_id,
          items: body.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price
          })),
          delivery_latitude: body.delivery_latitude,
          delivery_longitude: body.delivery_longitude,
          delivery_address: body.delivery_address,
          delivery_notes: body.delivery_notes,
          delivery_window_start: body.delivery_window_start,
          delivery_window_end: body.delivery_window_end
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.order
    });

  } catch (error) {
    console.error('Order management lambda error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
```

#### B. Update Checkout to Use Lambda

```typescript
// src/app/shop/checkout/page.tsx

const handleSubmit = async (e: React.FormEvent) => {
  // ... existing validation ...

  // NEW: Call Lambda-based endpoint
  const response = await fetch('/api/lambda/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: customerId,
      store_id: nearestStore.store_id,
      items: cart.items.map((item) => ({
        product_id: item.product.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
      })),
      delivery_latitude: userCoordinates.latitude,
      delivery_longitude: userCoordinates.longitude,
      delivery_address: formData.delivery_address,
      delivery_notes: formData.delivery_notes,
      delivery_window_start: deliveryWindowStart.toISOString(),
      delivery_window_end: deliveryWindowEnd.toISOString(),
    }),
  });
};
```

#### C. Environment Variables

```bash
# .env
LAMBDA_ORDER_MANAGEMENT_URL=https://xxx.lambda-url.ap-southeast-1.on.aws/
LAMBDA_PRIORITY_URL=https://xxx.lambda-url.ap-southeast-1.on.aws/
LAMBDA_ETA_URL=https://xxx.lambda-url.ap-southeast-1.on.aws/
```

#### D. Benefits
- ✅ Automatic inventory management
- ✅ Cascading Lambda calls (Priority + ETA)
- ✅ Better error handling
- ✅ Centralized business logic
- ✅ Easier to scale

---

## 2️⃣ Route Navigation Lambda Integration

### **Current Status**
- ❌ Lambda exists but not used
- ✅ Currently using Google Maps external link
- 🎯 Goal: In-app turn-by-turn navigation

### **Lambda Capabilities**

```python
# lambda/lambda/routeNavigation.py

Features:
- get_route() → OSRM routing
- generate_turn_by_turn_instructions()
- calculate_maneuvers()
- format_navigation_steps()
```

### **Integration Steps**

#### A. Create Navigation API

```typescript
// src/app/api/lambda/navigation/route/route.ts
import { NextRequest, NextResponse } from 'next/server';

const LAMBDA_NAVIGATION_URL = process.env.LAMBDA_NAVIGATION_URL;

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();

    const response = await fetch(LAMBDA_NAVIGATION_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: {
          lat: origin.lat,
          lon: origin.lon
        },
        destination: {
          lat: destination.lat,
          lon: destination.lon
        }
      })
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      route: {
        distance_km: result.distance_km,
        duration_min: result.duration_min,
        polyline: result.polyline,
        steps: result.turn_by_turn_instructions
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Navigation failed' },
      { status: 500 }
    );
  }
}
```

#### B. Create Navigation Component

```typescript
// src/components/NavigationPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowRight, ArrowLeft, Navigation } from 'lucide-react';

interface NavigationStep {
  instruction: string;
  distance_m: number;
  duration_sec: number;
  maneuver: string;
}

interface NavigationPanelProps {
  deliveryId: string;
  destination: { lat: number; lon: number };
}

export default function NavigationPanel({ deliveryId, destination }: NavigationPanelProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Get current location
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch route when location available
  useEffect(() => {
    if (!currentLocation) return;

    const fetchRoute = async () => {
      const response = await fetch('/api/lambda/navigation/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: currentLocation,
          destination
        })
      });

      const data = await response.json();
      if (data.success) {
        setRoute(data.route);
      }
    };

    fetchRoute();
  }, [currentLocation, destination]);

  if (!route) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p>กำลังโหลดเส้นทาง...</p>
      </div>
    );
  }

  const currentStep = route.steps[currentStepIndex];

  const getManeuverIcon = (maneuver: string) => {
    if (maneuver.includes('left')) return <ArrowLeft className="w-12 h-12" />;
    if (maneuver.includes('right')) return <ArrowRight className="w-12 h-12" />;
    return <ArrowUp className="w-12 h-12" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Current Instruction */}
      <div className="bg-blue-600 text-white p-6">
        <div className="flex items-center gap-4 mb-4">
          {getManeuverIcon(currentStep.maneuver)}
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{currentStep.instruction}</h2>
            <p className="text-blue-100">ใน {currentStep.distance_m} เมตร</p>
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span>ระยะทางรวม: {route.distance_km.toFixed(1)} กม.</span>
          <span>เวลาโดยประมาณ: {Math.round(route.duration_min)} นาที</span>
        </div>
      </div>

      {/* Upcoming Steps */}
      <div className="p-4">
        <h3 className="font-bold mb-2">ขั้นตอนถัดไป</h3>
        <div className="space-y-2">
          {route.steps.slice(currentStepIndex + 1, currentStepIndex + 4).map((step: NavigationStep, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-gray-400">{index + 2}.</span>
              <span>{step.instruction}</span>
              <span className="ml-auto">{step.distance_m}m</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-4">
        <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all"
            style={{ width: `${(currentStepIndex / route.steps.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          ขั้นตอน {currentStepIndex + 1} จาก {route.steps.length}
        </p>
      </div>
    </div>
  );
}
```

#### C. Add to Rider Dashboard

```typescript
// src/app/rider/page.tsx

// In Active Delivery Card:
{activeDeliveries.map(delivery => (
  <div key={delivery.delivery_id}>
    {/* ... existing card ... */}

    {delivery.delivery_status === 'in_transit' && (
      <NavigationPanel
        deliveryId={delivery.delivery_id}
        destination={{
          lat: delivery.delivery_lat,
          lon: delivery.delivery_lon
        }}
      />
    )}
  </div>
))}
```

#### D. Environment Variables

```bash
# .env
LAMBDA_NAVIGATION_URL=https://xxx.lambda-url.ap-southeast-1.on.aws/
```

---

## 3️⃣ WebSocket Real-time Customer Tracking

### **Architecture**

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Rider     │  GPS    │   Next.js    │ WS Push │  Customer   │
│   App       │────────▶│   API        │────────▶│   Browser   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │   Redis      │
                        │   PubSub     │
                        └──────────────┘
```

### **Implementation Steps**

#### A. Install Dependencies

```bash
npm install socket.io socket.io-client ioredis
npm install -D @types/socket.io @types/ioredis
```

#### B. Create WebSocket Server

```typescript
// src/lib/socket-server.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Redis from 'ioredis';

let io: SocketIOServer | null = null;
let redisClient: Redis | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    },
    path: '/api/socket'
  });

  // Initialize Redis for pub/sub
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);

    redisClient.subscribe('gps-updates', (err) => {
      if (err) console.error('Redis subscribe error:', err);
      else console.log('✅ Subscribed to gps-updates channel');
    });

    redisClient.on('message', (channel, message) => {
      if (channel === 'gps-updates') {
        const data = JSON.parse(message);
        io?.to(`delivery-${data.delivery_id}`).emit('location-update', data);
      }
    });
  }

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join delivery room
    socket.on('track-delivery', (deliveryId: string) => {
      socket.join(`delivery-${deliveryId}`);
      console.log(`📍 Client ${socket.id} tracking delivery ${deliveryId}`);
    });

    // Leave delivery room
    socket.on('untrack-delivery', (deliveryId: string) => {
      socket.leave(`delivery-${deliveryId}`);
      console.log(`❌ Client ${socket.id} stopped tracking delivery ${deliveryId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket server not initialized');
  return io;
}

export function publishGPSUpdate(data: {
  delivery_id: string;
  driver_id: string;
  lat: number;
  lon: number;
  speed_kmh: number;
  heading: number;
  timestamp: string;
}) {
  if (redisClient) {
    redisClient.publish('gps-updates', JSON.stringify(data));
  } else if (io) {
    // Fallback: direct emit if Redis not available
    io.to(`delivery-${data.delivery_id}`).emit('location-update', data);
  }
}
```

#### C. Update server.js for WebSocket

```javascript
// server.js (create this file in root)
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocketServer } = require('./dist/lib/socket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket
  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

#### D. Update package.json

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build && tsc --project tsconfig.server.json",
    "start": "NODE_ENV=production node server.js"
  }
}
```

#### E. GPS Tracking API with WebSocket

```typescript
// src/app/api/tracking/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishGPSUpdate } from '@/lib/socket-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driver_id, delivery_id, lat, lon, speed_kmh, heading } = body;

    // Save to database
    await prisma.gps_trackings.create({
      data: {
        id: crypto.randomUUID(),
        driver_id,
        delivery_id,
        vehicle_id: 'VEHICLE_ID', // Get from driver
        latitude: lat,
        longitude: lon,
        speed_kmh,
        heading,
        recorded_at: new Date()
      }
    });

    // Update delivery status
    await prisma.deliveries.update({
      where: { id: delivery_id },
      data: { delivery_status: 'in_transit' }
    });

    // Broadcast to WebSocket clients
    publishGPSUpdate({
      delivery_id,
      driver_id,
      lat,
      lon,
      speed_kmh,
      heading,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('GPS tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
```

#### F. Customer Tracking Component with WebSocket

```typescript
// src/components/OrderStatusTracker.tsx
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

interface RiderLocation {
  lat: number;
  lon: number;
  speed_kmh: number;
  heading: number;
  timestamp: string;
}

export default function OrderStatusTracker({ customerId }: { customerId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to WebSocket');
    });

    socketInstance.on('location-update', (data: RiderLocation) => {
      console.log('📍 Rider location updated:', data);
      setRiderLocation(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Fetch orders and subscribe to tracking
  useEffect(() => {
    const fetchOrders = async () => {
      const response = await fetch(`/api/orders/tracking?customer_id=${customerId}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);

        // Subscribe to active deliveries
        data.orders.forEach((order: any) => {
          if (order.delivery_status === 'in_transit' && socket) {
            socket.emit('track-delivery', order.delivery_id);
          }
        });
      }
    };

    if (socket && customerId) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000); // Fallback polling
      return () => clearInterval(interval);
    }
  }, [socket, customerId]);

  // Active delivery
  const activeDelivery = orders.find(o => o.delivery_status === 'in_transit');

  if (!activeDelivery) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl w-96 z-50">
      <div className="bg-green-600 text-white p-4 rounded-t-lg">
        <h3 className="font-bold text-lg">🚚 Tracking Your Order</h3>
        <p className="text-sm text-green-100">Order #{activeDelivery.order_number}</p>
      </div>

      <div className="p-4">
        {/* Mini Map */}
        <div className="h-48 rounded-lg overflow-hidden mb-4">
          <MapContainer
            center={[activeDelivery.delivery_lat, activeDelivery.delivery_lon]}
            zoom={14}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Delivery Destination */}
            <Marker position={[activeDelivery.delivery_lat, activeDelivery.delivery_lon]}>
              <Popup>Your Location</Popup>
            </Marker>

            {/* Rider Location (Real-time) */}
            {riderLocation && (
              <Marker position={[riderLocation.lat, riderLocation.lon]}>
                <Popup>Rider - {riderLocation.speed_kmh} km/h</Popup>
              </Marker>
            )}

            {/* Route Line */}
            {riderLocation && (
              <Polyline
                positions={[
                  [riderLocation.lat, riderLocation.lon],
                  [activeDelivery.delivery_lat, activeDelivery.delivery_lon]
                ]}
                color="blue"
                weight={3}
              />
            )}
          </MapContainer>
        </div>

        {/* Status Info */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Driver:</span>
            <span className="font-semibold">{activeDelivery.driver_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">ETA:</span>
            <span className="font-semibold text-green-600">
              {activeDelivery.eta_minutes} minutes
            </span>
          </div>
          {riderLocation && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Speed:</span>
              <span className="font-semibold">{riderLocation.speed_kmh} km/h</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Last Update:</span>
            <span className="text-xs text-gray-500">
              {riderLocation
                ? new Date(riderLocation.timestamp).toLocaleTimeString()
                : 'Waiting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### G. Environment Variables

```bash
# .env
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4️⃣ SageMaker ML Pipeline

### **Architecture**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Delivery    │     │   Lambda     │     │     S3       │
│  Completion  │────▶│  Export ML   │────▶│  Training    │
└──────────────┘     │    Data      │     │    Data      │
                     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  SageMaker   │◀────│  EventBridge │
                     │  Training    │     │   Schedule   │
                     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Lambda      │
                     │  Endpoint    │
                     └──────────────┘
```

### **Implementation Steps**

#### A. ML Training Data Schema

```json
// Training data format (exported to S3)
{
  "delivery_id": "uuid",
  "timestamp": "2025-01-20T10:00:00Z",

  "features": {
    "order": {
      "total_amount": 350.50,
      "item_count": 5,
      "total_weight_kg": 2.5,
      "total_volume_m3": 0.05,
      "has_cold_chain": true,
      "has_fragile": false,
      "customer_tier": "high"
    },
    "delivery": {
      "pickup_lat": 13.7563,
      "pickup_lon": 100.5018,
      "delivery_lat": 13.7650,
      "delivery_lon": 100.5120,
      "straight_distance_km": 1.2,
      "route_distance_km": 1.8,
      "delivery_time_hour": 14,
      "delivery_day_of_week": 1
    },
    "context": {
      "weather_condition": "clear",
      "temperature_c": 32,
      "rain_mm": 0,
      "traffic_factor": 1.2,
      "rush_hour": false
    }
  },

  "labels": {
    "priority_score": 85.3,
    "priority_class": "high",
    "estimated_time_min": 15,
    "actual_time_min": 18,
    "estimated_distance_km": 1.8,
    "actual_distance_km": 2.1,
    "on_time": true,
    "customer_rating": 5
  }
}
```

#### B. Create SageMaker Training Script

```python
# ml/training/train_priority_model.py
import os
import json
import boto3
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# Load training data from S3
s3 = boto3.client('s3')
bucket = os.environ['TRAINING_DATA_BUCKET']
prefix = 'training-data/delivery-histories/'

def load_training_data():
    """Load all training data from S3"""
    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)

    data = []
    for obj in response.get('Contents', []):
        key = obj['Key']
        if key.endswith('.json'):
            file_obj = s3.get_object(Bucket=bucket, Key=key)
            record = json.loads(file_obj['Body'].read())
            data.append(record)

    return pd.DataFrame(data)

def extract_features(df):
    """Extract features from raw data"""
    features = pd.DataFrame()

    # Order features
    features['total_amount'] = df['features'].apply(lambda x: x['order']['total_amount'])
    features['item_count'] = df['features'].apply(lambda x: x['order']['item_count'])
    features['total_weight_kg'] = df['features'].apply(lambda x: x['order']['total_weight_kg'])
    features['has_cold_chain'] = df['features'].apply(lambda x: int(x['order']['has_cold_chain']))
    features['has_fragile'] = df['features'].apply(lambda x: int(x['order']['has_fragile']))
    features['customer_tier_encoded'] = df['features'].apply(
        lambda x: {'economy': 0, 'standard': 1, 'high': 2, 'urgent': 3}[x['order']['customer_tier']]
    )

    # Delivery features
    features['straight_distance_km'] = df['features'].apply(lambda x: x['delivery']['straight_distance_km'])
    features['route_distance_km'] = df['features'].apply(lambda x: x['delivery']['route_distance_km'])
    features['delivery_hour'] = df['features'].apply(lambda x: x['delivery']['delivery_time_hour'])
    features['delivery_weekday'] = df['features'].apply(lambda x: x['delivery']['delivery_day_of_week'])

    # Context features
    features['temperature_c'] = df['features'].apply(lambda x: x['context']['temperature_c'])
    features['rain_mm'] = df['features'].apply(lambda x: x['context']['rain_mm'])
    features['traffic_factor'] = df['features'].apply(lambda x: x['context']['traffic_factor'])
    features['rush_hour'] = df['features'].apply(lambda x: int(x['context']['rush_hour']))

    return features

def train_model():
    """Train priority prediction model"""
    print("📊 Loading training data...")
    df = load_training_data()
    print(f"✅ Loaded {len(df)} training records")

    print("🔧 Extracting features...")
    X = extract_features(df)
    y = df['labels'].apply(lambda x: x['priority_score'])

    print("📈 Training model...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)

    print(f"✅ Training R²: {r2_score(y_train, train_pred):.4f}")
    print(f"✅ Test R²: {r2_score(y_test, test_pred):.4f}")
    print(f"✅ Test RMSE: {np.sqrt(mean_squared_error(y_test, test_pred)):.4f}")

    # Save model
    model_path = '/opt/ml/model/priority_model.joblib'
    joblib.dump(model, model_path)
    print(f"💾 Model saved to {model_path}")

    # Feature importance
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print("\n📊 Feature Importance:")
    print(importance)

if __name__ == '__main__':
    train_model()
```

#### C. Create SageMaker Deployment Script

```python
# ml/deploy/deploy_model.py
import boto3
import sagemaker
from sagemaker.sklearn import SKLearnModel

def deploy_model():
    """Deploy trained model to SageMaker endpoint"""

    role = os.environ['SAGEMAKER_ROLE']
    bucket = os.environ['MODEL_BUCKET']

    sklearn_model = SKLearnModel(
        model_data=f's3://{bucket}/models/priority_model.tar.gz',
        role=role,
        entry_point='inference.py',
        framework_version='1.0-1',
        py_version='py3'
    )

    predictor = sklearn_model.deploy(
        instance_type='ml.t2.medium',
        initial_instance_count=1,
        endpoint_name='deliverygenie-priority-model'
    )

    print(f"✅ Model deployed to endpoint: {predictor.endpoint_name}")
    return predictor

if __name__ == '__main__':
    deploy_model()
```

#### D. Lambda Function for Model Inference

```typescript
// src/app/api/ml/predict-priority/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';

const sagemaker = new AWS.SageMakerRuntime({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

export async function POST(request: NextRequest) {
  try {
    const features = await request.json();

    const params = {
      EndpointName: 'deliverygenie-priority-model',
      Body: JSON.stringify(features),
      ContentType: 'application/json'
    };

    const response = await sagemaker.invokeEndpoint(params).promise();
    const prediction = JSON.parse(response.Body.toString());

    return NextResponse.json({
      success: true,
      priority_score: prediction.priority_score,
      priority_class: getPriorityClass(prediction.priority_score),
      confidence: prediction.confidence
    });

  } catch (error) {
    console.error('ML prediction error:', error);
    return NextResponse.json(
      { success: false, error: 'Prediction failed' },
      { status: 500 }
    );
  }
}

function getPriorityClass(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
```

#### E. EventBridge Scheduled Training

```yaml
# infrastructure/eventbridge-ml-training.yml
Resources:
  MLTrainingSchedule:
    Type: AWS::Events::Rule
    Properties:
      Description: "Trigger ML model retraining weekly"
      ScheduleExpression: "cron(0 2 ? * SUN *)"  # Every Sunday at 2 AM
      State: ENABLED
      Targets:
        - Arn: !GetAtt MLTrainingStateMachine.Arn
          RoleArn: !GetAtt EventBridgeRole.Arn

  MLTrainingStateMachine:
    Type: AWS::StepFunctions::StateMachine
    Properties:
      StateMachineName: DeliveryGenie-ML-Training
      RoleArn: !GetAtt StepFunctionsRole.Arn
      DefinitionString: |
        {
          "Comment": "ML Model Training Pipeline",
          "StartAt": "PrepareData",
          "States": {
            "PrepareData": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:ap-southeast-1:xxx:function:ml-data-prep",
              "Next": "TrainModel"
            },
            "TrainModel": {
              "Type": "Task",
              "Resource": "arn:aws:sagemaker:ap-southeast-1:xxx:training-job",
              "Next": "EvaluateModel"
            },
            "EvaluateModel": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:ap-southeast-1:xxx:function:ml-evaluate",
              "Next": "DeployModel"
            },
            "DeployModel": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:ap-southeast-1:xxx:function:ml-deploy",
              "End": true
            }
          }
        }
```

#### F. Environment Variables

```bash
# .env
AWS_REGION=ap-southeast-1
SAGEMAKER_ROLE=arn:aws:iam::xxx:role/SageMakerRole
MODEL_BUCKET=deliverygenie-ml-models
TRAINING_DATA_BUCKET=deliverygenie-ml-training-data
SAGEMAKER_ENDPOINT=deliverygenie-priority-model
```

---

## 📊 Implementation Timeline

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| **Phase 1** | orderManagement Lambda Integration | 2 days | 🟡 Ready |
| **Phase 2** | routeNavigation Lambda Integration | 2 days | 🟡 Ready |
| **Phase 3** | WebSocket Real-time Tracking | 3 days | 🟡 Ready |
| **Phase 4** | SageMaker ML Pipeline | 5 days | 🟡 Ready |

---

## 🎯 Success Metrics

### Order Management
- ✅ Inventory validation < 100ms
- ✅ Order creation < 500ms
- ✅ Priority calculation accuracy > 90%

### Navigation
- ✅ Route calculation < 2s
- ✅ Turn-by-turn accuracy > 95%
- ✅ Real-time updates every 5s

### WebSocket Tracking
- ✅ Location update latency < 1s
- ✅ Concurrent connections > 1000
- ✅ Message delivery rate > 99%

### ML Pipeline
- ✅ Model R² score > 0.85
- ✅ Prediction latency < 200ms
- ✅ Weekly automatic retraining

---

**Next Steps:**
1. Deploy Lambda functions to AWS
2. Configure environment variables
3. Set up Redis for WebSocket
4. Configure SageMaker training jobs
5. Test end-to-end integration

