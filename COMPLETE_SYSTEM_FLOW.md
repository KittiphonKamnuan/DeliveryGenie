# 📋 DeliveryGenie - Complete System Flow Design

> **วิเคราะห์ Flow ของทุก User Role พร้อม Data Flow และ Lambda Integration**

---

## 🎯 System Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Customer  │────▶│   Next.js    │────▶│   Lambda    │
│   (Mobile)  │     │   Frontend   │     │  Functions  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                      │
                           ▼                      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    Rider    │────▶│  PostgreSQL  │◀────│  External   │
│   (Mobile)  │     │   Database   │     │    APIs     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
┌─────────────┐            │
│    Admin    │────────────┘
│ (Dashboard) │
└─────────────┘
```

---

## 👥 User Roles และ Capabilities

### 1️⃣ **Customer (ลูกค้า)**

#### **A. Authentication & Profile**
```
┌─ Customer Registration ─┐
│                          │
│  1. /customer/login      │──▶ POST /api/customers/register
│     - Input Form         │         │
│     - Phone              │         ├─▶ Validate Phone (unique)
│     - Password           │         ├─▶ Hash Password (bcrypt)
│     - Address            │         ├─▶ Create customers record
│     - Email (optional)   │         └─▶ Create users record (role: customer)
│                          │
│  2. Auto Login           │──▶ POST /api/auth/callback/credentials
│     - Phone + Password   │         │
│                          │         ├─▶ JWT with customer_id
│  3. Redirect to /shop    │         └─▶ Session with customer_phone
└──────────────────────────┘
```

**Database Flow:**
```sql
-- Registration
INSERT INTO customers (id, name, phone, address_line1, district, city, latitude, longitude)
INSERT INTO users (id, name, email=phone, password, role='customer')

-- Login
SELECT * FROM users WHERE email = phone AND role = 'customer'
  ├─ Join customers ON phone
  └─ Return customer_id in JWT
```

#### **B. Shopping Flow**

```
┌─ Shopping Journey ─────────────────────────────────────────┐
│                                                             │
│  Step 1: Browse Products                                   │
│  ────────────────────────                                  │
│  GET /shop                                                  │
│    │                                                        │
│    ├─▶ GET /api/products                                   │
│    │     └─▶ SELECT * FROM products                        │
│    │         WHERE is_active = TRUE                         │
│    │         AND stock > 0                                  │
│    │                                                        │
│    └─▶ Display:                                            │
│        - Product cards with images                         │
│        - Price, description                                │
│        - Add to cart button                                │
│        - Category filter                                   │
│                                                             │
│  Step 2: Add to Cart (Client-Side State)                  │
│  ─────────────────────────────────────                     │
│  useCart() Context                                          │
│    │                                                        │
│    ├─▶ addToCart(product, quantity)                        │
│    │     ├─ Update cart.items[]                            │
│    │     ├─ Calculate subtotal                             │
│    │     ├─ Calculate tax (7%)                             │
│    │     └─ Calculate shipping_fee                         │
│    │                                                        │
│    └─▶ Cart Badge Update (+1)                              │
│                                                             │
│  Step 3: View Cart                                         │
│  ──────────────────                                        │
│  GET /shop/cart                                            │
│    │                                                        │
│    └─▶ Display cart items                                  │
│        - Quantity controls (+/-)                           │
│        - Remove item button                                │
│        - Subtotal, Tax, Shipping                           │
│        - Total                                             │
│        - Checkout button                                   │
│                                                             │
│  Step 4: Checkout                                          │
│  ─────────────────                                         │
│  GET /shop/checkout                                        │
│    │                                                        │
│    ├─▶ Get Geolocation (Browser API)                       │
│    │     navigator.geolocation.getCurrentPosition()        │
│    │                                                        │
│    ├─▶ **Lambda: findNearby7**                             │
│    │   POST /api/stores/nearest                            │
│    │     {                                                  │
│    │       "latitude": 13.7563,                            │
│    │       "longitude": 100.5018                           │
│    │     }                                                  │
│    │     │                                                  │
│    │     └─▶ Lambda Process:                               │
│    │         1. Create bounding box (3km radius)           │
│    │         2. Query Overpass API (OpenStreetMap)         │
│    │         3. Find 7-Eleven stores in area               │
│    │         4. Calculate distance (Haversine)             │
│    │         5. Call Routing API (OSRM)                    │
│    │         6. Get route_distance_km, route_duration_min  │
│    │         7. Cache results in stores table              │
│    │         8. Return nearest store                       │
│    │                                                        │
│    │     Response:                                          │
│    │     {                                                  │
│    │       "success": true,                                │
│    │       "store": {                                      │
│    │         "store_id": "uuid",                           │
│    │         "name": "7-Eleven บางนา",                     │
│    │         "distance_km": 1.2,                           │
│    │         "route_duration_min": 5,                      │
│    │         "latitude": 13.7563,                          │
│    │         "longitude": 100.5018                         │
│    │       }                                               │
│    │     }                                                  │
│    │                                                        │
│    ├─▶ Pre-fill Customer Data (if logged in)               │
│    │   GET /api/customers/{customer_id}                    │
│    │     └─▶ SELECT * FROM customers WHERE id = ?          │
│    │                                                        │
│    └─▶ Display Form:                                       │
│        - Customer info (name, phone, email)                │
│        - Delivery address                                  │
│        - Delivery date/time picker                         │
│        - Delivery notes                                    │
│        - Order summary                                     │
│        - Nearest 7-11 store info                           │
│        - Submit button                                     │
│                                                             │
│  Step 5: Place Order                                       │
│  ────────────────────                                      │
│  POST /api/orders/create                                   │
│    │                                                        │
│    ├─▶ Validate Input                                      │
│    │   - Customer data                                     │
│    │   - Cart items                                        │
│    │   - Delivery info                                     │
│    │                                                        │
│    ├─▶ **Lambda: priority**                                │
│    │   Calculate Priority Score                            │
│    │   {                                                    │
│    │     "items": [...products],                           │
│    │     "delivery_lat": 13.7563,                          │
│    │     "delivery_lon": 100.5018,                         │
│    │     "delivery_time": "2025-01-20T14:00:00Z",          │
│    │     "customer_tier": "standard"                       │
│    │   }                                                    │
│    │     │                                                  │
│    │     └─▶ Lambda Calculation:                           │
│    │         Weights:                                       │
│    │         - temp (22%): ความสดใจ hot_food=100           │
│    │         - exp (18%): อายุสินค้า <3h=100               │
│    │         - cust (13%): VIP tier urgent=100             │
│    │         - window (13%): เวลาส่ง <15min=100            │
│    │         - distance (9%): ระยะทาง <5km=100             │
│    │         - value (9%): มูลค่า >500฿=100                │
│    │         - fragile (4%): ของแตกง่าย                    │
│    │         - weight (12%): น้ำหนัก <2kg=100              │
│    │                                                        │
│    │         Final Score: 0-100                            │
│    │         Classification:                                │
│    │         - 80-100: critical                            │
│    │         - 60-79: high                                 │
│    │         - 40-59: medium                               │
│    │         - 0-39: low                                   │
│    │                                                        │
│    ├─▶ Database Transaction:                               │
│    │   BEGIN;                                              │
│    │     INSERT INTO orders (                              │
│    │       customer_id, order_number,                      │
│    │       total_amount, priority_score,                   │
│    │       priority_class, delivery_window_start,          │
│    │       delivery_window_end                             │
│    │     )                                                  │
│    │     INSERT INTO order_items (                         │
│    │       order_id, product_id,                           │
│    │       quantity, unit_price                            │
│    │     )                                                  │
│    │     INSERT INTO deliveries (                          │
│    │       order_id, pickup_latitude,                      │
│    │       pickup_longitude, delivery_latitude,            │
│    │       delivery_longitude, delivery_status='pending'   │
│    │     )                                                  │
│    │   COMMIT;                                             │
│    │                                                        │
│    └─▶ Redirect to /shop/order-success                     │
│        with order_id                                       │
│                                                             │
│  Step 6: Order Confirmation                                │
│  ───────────────────────                                   │
│  GET /shop/order-success?order_id=xxx                      │
│    │                                                        │
│    └─▶ Display:                                            │
│        - Order number                                      │
│        - Estimated delivery time                           │
│        - Track order link                                  │
│        - Order summary                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### **C. Order Tracking**

```
┌─ Real-time Tracking ─────────────────────────────────────┐
│                                                           │
│  Component: <OrderStatusTracker customer_id={id} />      │
│    │                                                      │
│    ├─▶ GET /api/orders/tracking?customer_id=xxx          │
│    │   (Poll every 5 seconds)                            │
│    │     │                                                │
│    │     └─▶ SQL Query:                                  │
│    │         SELECT o.*, d.*, dr.*, v.*                  │
│    │         FROM orders o                                │
│    │         JOIN deliveries d ON o.id = d.order_id      │
│    │         LEFT JOIN drivers dr ON d.driver_id = dr.id │
│    │         LEFT JOIN vehicles v ON dr.current_vehicle_id = v.id │
│    │         WHERE o.customer_id = ?                     │
│    │         ORDER BY o.created_at DESC                  │
│    │                                                      │
│    │         Response includes:                           │
│    │         - Order status (pending/assigned/picked_up/in_transit/delivered) │
│    │         - Driver info (if assigned)                 │
│    │         - Vehicle info                               │
│    │         - Current location (if in transit)          │
│    │         - ETA                                        │
│    │                                                      │
│    └─▶ Display Map with:                                 │
│        - Delivery location pin                           │
│        - Rider location pin (real-time)                  │
│        - Route polyline                                  │
│        - ETA countdown                                   │
│        - Status timeline                                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Customer Data Flow Summary:**
```
Customer Registration
  └─▶ customers table + users table

Shopping
  └─▶ products table (read-only)
      └─▶ Cart (client-side state)

Checkout
  ├─▶ findNearby7 Lambda → stores table
  └─▶ priority Lambda → priority_score

Order Creation
  ├─▶ orders table
  ├─▶ order_items table
  └─▶ deliveries table (status: pending)

Tracking
  └─▶ Poll deliveries + gps_trackings
      └─▶ Real-time location updates
```

---

### 2️⃣ **Rider (ไรเดอร์)**

#### **A. Authentication**
```
┌─ Rider Login ────────────────────────────────────────┐
│                                                       │
│  POST /api/auth/signin/credentials                   │
│  {                                                    │
│    "phone": "0812345678",  // or email               │
│    "password": "******"                              │
│  }                                                    │
│    │                                                  │
│    └─▶ SQL Query:                                    │
│        SELECT * FROM users                           │
│        WHERE email = phone AND role = 'rider'        │
│          │                                            │
│          ├─▶ Find driver_id:                         │
│          │   SELECT id FROM drivers WHERE phone = ?  │
│          │                                            │
│          └─▶ JWT includes:                           │
│              - user_id                                │
│              - driver_id                              │
│              - role: 'rider'                          │
│                                                       │
│  Redirect to /rider                                   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

#### **B. Rider Dashboard Flow**

```
┌─ Rider Dashboard (/rider) ────────────────────────────────────────┐
│                                                                    │
│  On Load:                                                          │
│  ────────                                                          │
│  1. Get Driver Profile                                             │
│     GET /api/drivers/{driver_id}                                   │
│       └─▶ SELECT d.*, v.* FROM drivers d                          │
│           JOIN vehicles v ON d.current_vehicle_id = v.id           │
│                                                                    │
│  2. Get Active Deliveries                                          │
│     GET /api/deliveries?driver_id={id}&status=assigned,picked_up   │
│       └─▶ SELECT d.*, o.*, c.* FROM deliveries d                  │
│           JOIN orders o ON d.order_id = o.id                       │
│           JOIN customers c ON o.customer_id = c.id                 │
│           WHERE d.driver_id = ? AND status IN (...)                │
│                                                                    │
│  3. Get Available Jobs (Not Assigned)                              │
│     GET /api/deliveries?status=pending&limit=20                    │
│       └─▶ SELECT d.*, o.* FROM deliveries d                       │
│           JOIN orders o ON d.order_id = o.id                       │
│           WHERE d.driver_id IS NULL                                │
│           AND d.delivery_status = 'pending'                        │
│           ORDER BY o.priority_score DESC                           │
│                                                                    │
│  ┌─────────────────────────────────────────────┐                  │
│  │  View Mode Toggle                           │                  │
│  │  ┌──────────┐  ┌──────────┐                │                  │
│  │  │   List   │  │   Map    │                │                  │
│  │  └──────────┘  └──────────┘                │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                    │
│  ┌─────────────────────────────────────────────┐                  │
│  │  Auto Mode Toggle                           │                  │
│  │  ┌──────────────────────────────────────┐   │                  │
│  │  │  [ ] Auto (Sort by Priority AI)     │   │                  │
│  │  └──────────────────────────────────────┘   │                  │
│  │                                              │                  │
│  │  When ON:                                    │                  │
│  │  - Automatically sorts deliveries by         │                  │
│  │    priority_score (DESC)                     │                  │
│  │  - Disables manual reordering                │                  │
│  │                                              │                  │
│  │  When OFF:                                   │                  │
│  │  - Manual sorting with ▲▼ buttons            │                  │
│  │  - Click to add to queue                     │                  │
│  │  - Drag & drop (future)                      │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                    │
│  ┌──────────── LIST VIEW ───────────────┐                         │
│  │                                       │                         │
│  │  🚚 Active Deliveries (2)             │                         │
│  │  ┌─────────────────────────────────┐ │                         │
│  │  │ #ORD-001 | Priority: CRITICAL  │ │                         │
│  │  │ 🔴 Status: picked_up            │ │                         │
│  │  │ 📍 123 ถนนสุขุมวิท             │ │                         │
│  │  │ ⏱️ ETA: 15 min                  │ │                         │
│  │  │ [Complete Delivery] [Navigate] │ │                         │
│  │  └─────────────────────────────────┘ │                         │
│  │                                       │                         │
│  │  📦 Available Jobs (15)               │                         │
│  │  ┌─────────────────────────────────┐ │                         │
│  │  │ #ORD-045 | Priority: HIGH      │ │                         │
│  │  │ 🟠 Score: 85.3                  │ │                         │
│  │  │ 📍 456 ถนนพระราม 4             │ │                         │
│  │  │ 💰 ฿350 | 📦 2.5kg              │ │                         │
│  │  │ [Accept Job] [View Details]    │ │                         │
│  │  └─────────────────────────────────┘ │                         │
│  │                                       │                         │
│  └───────────────────────────────────────┘                         │
│                                                                    │
│  ┌──────────── MAP VIEW ────────────────┐                         │
│  │                                       │                         │
│  │  OpenStreetMap + Leaflet              │                         │
│  │  ┌─────────────────────────────────┐ │                         │
│  │  │                                 │ │                         │
│  │  │  🔵 Rider Current Location      │ │                         │
│  │  │  🔴 Critical Priority (1)       │ │                         │
│  │  │  🟠 High Priority (2)            │ │                         │
│  │  │  🔵 Medium Priority (3)          │ │                         │
│  │  │  🟢 Low Priority (4)             │ │                         │
│  │  │                                 │ │                         │
│  │  │  ─ ─ ─ Route Polyline           │ │                         │
│  │  │                                 │ │                         │
│  │  │  Legend:                         │ │                         │
│  │  │  🔴 Critical  🟠 High            │ │                         │
│  │  │  🔵 Medium    🟢 Low             │ │                         │
│  │  └─────────────────────────────────┘ │                         │
│  │                                       │                         │
│  │  Delivery List Overlay (Bottom Left): │                         │
│  │  ┌────────────────────┐              │                         │
│  │  │ 1. #ORD-001 | 🔴   │              │                         │
│  │  │ 2. #ORD-002 | 🟠   │              │                         │
│  │  │ 3. #ORD-003 | 🔵   │              │                         │
│  │  └────────────────────┘              │                         │
│  │                                       │                         │
│  └───────────────────────────────────────┘                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### **C. Accept Job Flow**

```
┌─ Accept Job ───────────────────────────────────────────┐
│                                                         │
│  Button: "Accept Job" on delivery card                 │
│    │                                                    │
│    ├─▶ **Lambda: riderAssignment**                     │
│    │   POST /api/deliveries/{delivery_id}/assign       │
│    │   {                                                │
│    │     "driver_id": "uuid",                          │
│    │     "delivery_id": "uuid"                         │
│    │   }                                                │
│    │     │                                              │
│    │     └─▶ Lambda Process:                           │
│    │         1. Validate driver exists & active         │
│    │         2. Validate delivery is unassigned         │
│    │         3. Check vehicle capacity                  │
│    │         4. Assign delivery to driver               │
│    │         5. Update delivery status: 'assigned'      │
│    │         6. Create assignment log                   │
│    │                                                    │
│    │         SQL:                                       │
│    │         UPDATE deliveries                          │
│    │         SET driver_id = ?,                         │
│    │             delivery_status = 'assigned',          │
│    │             updated_at = NOW()                     │
│    │         WHERE id = ? AND driver_id IS NULL         │
│    │                                                    │
│    └─▶ Success:                                         │
│        - Move to "Active Deliveries"                    │
│        - Show "Mark as Picked Up" button               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### **D. Delivery Lifecycle**

```
┌─ Delivery Status Flow ──────────────────────────────────────────┐
│                                                                  │
│  Status: pending → assigned → picked_up → in_transit → delivered │
│                                                                  │
│  1. Mark as Picked Up                                            │
│     PUT /api/deliveries/{id}/pickup                             │
│       UPDATE deliveries                                          │
│       SET delivery_status = 'picked_up',                        │
│           pickup_time = NOW()                                    │
│                                                                  │
│  2. Start Navigation                                             │
│     Button: "Navigate" (Opens Google Maps)                       │
│     https://www.google.com/maps/dir/?api=1                       │
│       &origin={rider_lat},{rider_lon}                           │
│       &destination={delivery_lat},{delivery_lon}                │
│       &travelmode=driving                                        │
│                                                                  │
│  3. Real-time GPS Tracking (Auto-send every 10 seconds)          │
│     **Lambda: realtimeTracking**                                │
│     POST /api/tracking/update                                    │
│     {                                                            │
│       "driver_id": "uuid",                                      │
│       "delivery_id": "uuid",                                    │
│       "lat": 13.7563,                                           │
│       "lon": 100.5018,                                          │
│       "speed_kmh": 45,                                          │
│       "heading": 90                                             │
│     }                                                            │
│       │                                                          │
│       └─▶ Lambda Process:                                       │
│           1. Validate GPS data                                   │
│           2. INSERT INTO gps_trackings (...)                    │
│           3. Send to Kinesis Stream (for ML)                    │
│           4. UPDATE deliveries.delivery_status = 'in_transit'   │
│           5. Broadcast to WebSocket (for customer)              │
│                                                                  │
│           SQL:                                                   │
│           INSERT INTO gps_trackings (                           │
│             id, driver_id, delivery_id, vehicle_id,             │
│             latitude, longitude, speed_kmh, heading,            │
│             recorded_at                                          │
│           )                                                      │
│                                                                  │
│  4. ETA Calculation (Auto-update every 30 seconds)               │
│     **Lambda: etaCalculation**                                  │
│     GET /api/deliveries/{id}/eta                                │
│       │                                                          │
│       └─▶ Lambda Process:                                       │
│           1. Get current rider location (gps_trackings)         │
│           2. Get delivery destination                            │
│           3. Call OSRM API for route                            │
│           4. Get weather conditions (OpenWeatherMap)            │
│           5. Get traffic conditions (Realtime-Traffic Lambda)   │
│           6. Calculate ETA with factors:                        │
│              - Base route time (OSRM)                           │
│              - Weather delay (rain: 1.3x, storm: 1.5x)          │
│              - Traffic delay (rush hour: 1.8-2.0x)              │
│              - Historical data adjustment                        │
│           7. Return ETA in minutes                              │
│                                                                  │
│           Response:                                              │
│           {                                                      │
│             "eta_minutes": 12,                                  │
│             "distance_remaining_km": 3.5,                       │
│             "traffic_condition": "moderate",                    │
│             "weather_condition": "clear",                       │
│             "estimated_arrival": "2025-01-20T14:15:00Z"         │
│           }                                                      │
│                                                                  │
│  5. Complete Delivery                                            │
│     **Lambda: deliveryCompletion**                              │
│     POST /api/deliveries/{id}/complete                          │
│     {                                                            │
│       "delivery_id": "uuid",                                    │
│       "proof_of_delivery": "base64_image",                      │
│       "customer_signature": "signature_data",                   │
│       "notes": "Handed to security guard"                       │
│     }                                                            │
│       │                                                          │
│       └─▶ Lambda Process:                                       │
│           1. Validate delivery exists & in_transit              │
│           2. Upload proof to S3                                 │
│           3. Calculate actual_distance from GPS logs            │
│           4. Calculate delivery_time (delivered_at - assigned_at) │
│           5. UPDATE deliveries:                                 │
│              - status = 'delivered'                             │
│              - delivery_time = NOW()                            │
│              - proof_of_delivery_url = s3_url                   │
│              - actual_distance_km = calculated                  │
│           6. UPDATE orders:                                     │
│              - order_status = 'delivered'                       │
│           7. Export training data to S3                         │
│              (for ML model improvement)                          │
│           8. UPDATE driver stats:                               │
│              - total_deliveries += 1                            │
│              - status = 'available'                             │
│           9. Trigger notification to customer                   │
│                                                                  │
│           ML Training Data Exported:                             │
│           {                                                      │
│             "delivery_id": "...",                               │
│             "priority_score": 85.3,                             │
│             "estimated_distance": 5.2,                          │
│             "actual_distance": 5.8,                             │
│             "estimated_time": 15,                               │
│             "actual_time": 18,                                  │
│             "weather_conditions": {...},                        │
│             "traffic_conditions": {...},                        │
│             "gps_trail": [...]                                  │
│           }                                                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Rider Data Flow Summary:**
```
Login
  └─▶ users table (role: rider)
      └─▶ drivers table (get driver_id)

Dashboard
  ├─▶ GET active deliveries (assigned to rider)
  └─▶ GET available jobs (pending, sorted by priority)

Accept Job
  └─▶ riderAssignment Lambda
      └─▶ UPDATE deliveries (driver_id, status: assigned)

Navigation
  ├─▶ realtimeTracking Lambda (GPS updates)
  │   └─▶ gps_trackings table + Kinesis Stream
  └─▶ etaCalculation Lambda
      └─▶ OSRM + Weather + Traffic APIs

Complete Delivery
  └─▶ deliveryCompletion Lambda
      ├─▶ S3 (proof of delivery)
      ├─▶ UPDATE deliveries (status: delivered)
      ├─▶ UPDATE orders (status: delivered)
      ├─▶ UPDATE drivers (stats, status: available)
      └─▶ S3 Training Data Export
```

---

### 3️⃣ **Admin (ผู้ดูแลระบบ)**

#### **A. Dashboard Overview**

```
┌─ Admin Dashboard (/) ──────────────────────────────────────┐
│                                                             │
│  📊 Real-time Statistics                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Active Orders     Pending Deliveries   Active Riders │  │
│  │      25                  15                  8        │  │
│  │  ────────────────────────────────────────────────────│  │
│  │  Today Revenue    Completed Today    Avg Delivery Time │ │
│  │    ฿12,500             32                 18 min     │  │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🌟 Priority System Monitor                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Priority Distribution (Today)                      │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐     │   │
│  │  │ Critical │   High   │  Medium  │   Low    │     │   │
│  │  │    5     │    12    │    8     │    7     │     │   │
│  │  │  (15%)   │  (38%)   │  (25%)   │  (22%)   │     │   │
│  │  └──────────┴──────────┴──────────┴──────────┘     │   │
│  │                                                      │   │
│  │  Latest Priority Calculations:                      │   │
│  │  #ORD-156 | Score: 92.5 | CRITICAL | Hot Food      │   │
│  │  #ORD-157 | Score: 78.3 | HIGH     | Medicine      │   │
│  │  #ORD-158 | Score: 55.1 | MEDIUM   | Beverages     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📦 Recent Orders                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  #ORD-156 | Customer: John | ฿250 | CRITICAL       │   │
│  │  Status: assigned | Driver: Somchai | ETA: 15 min  │   │
│  │  [View Details] [Track]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**API Calls:**
```
GET /api/analytics/dashboard
  ├─▶ Active orders count
  ├─▶ Pending deliveries count
  ├─▶ Active riders count
  ├─▶ Today revenue (SUM)
  ├─▶ Completed today count
  ├─▶ Average delivery time
  └─▶ Priority distribution

SQL Queries:
SELECT COUNT(*) FROM orders WHERE order_status IN ('pending', 'assigned', 'in_transit')
SELECT COUNT(*) FROM deliveries WHERE delivery_status = 'pending'
SELECT COUNT(*) FROM drivers WHERE status = 'active'
SELECT SUM(total_amount) FROM orders WHERE DATE(created_at) = CURRENT_DATE
SELECT COUNT(*) FROM orders WHERE order_status = 'delivered' AND DATE(delivered_at) = CURRENT_DATE
SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at))/60) FROM deliveries WHERE delivered_at IS NOT NULL
```

#### **B. Driver Performance**

```
┌─ Driver Performance (/driver-performance) ────────────────┐
│                                                            │
│  🚚 Driver Leaderboard                                    │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Rank | Name       | Deliveries | Rating | On-time │  │
│  │  ───────────────────────────────────────────────── │  │
│  │   1   | Somchai    |    156     | 4.9⭐  |  98%   │  │
│  │   2   | Nong       |    142     | 4.8⭐  |  95%   │  │
│  │   3   | Chai       |    138     | 4.7⭐  |  93%   │  │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  📈 Performance Metrics                                    │
│  ┌────────────────────────────────────────────────────┐   │
│  │  - Average delivery time: 18.5 min                 │  │
│  │  - Customer satisfaction: 4.7⭐                    │  │
│  │  - Failed deliveries: 0.5%                         │  │
│  │  - Late deliveries: 2.3%                           │  │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**API:**
```
GET /api/analytics/driver-performance
  └─▶ SELECT
        d.id, d.first_name, d.last_name,
        d.total_deliveries, d.rating,
        COUNT(CASE WHEN del.delivery_time <= o.delivery_window_end THEN 1 END) * 100.0 / COUNT(*) as on_time_rate
      FROM drivers d
      LEFT JOIN deliveries del ON d.id = del.driver_id
      LEFT JOIN orders o ON del.order_id = o.id
      GROUP BY d.id
      ORDER BY d.total_deliveries DESC, d.rating DESC
```

#### **C. Route Optimization**

```
┌─ Route Optimization (/route-optimization) ───────────────┐
│                                                           │
│  🗺️ Optimize Multi-Stop Deliveries                       │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Select Deliveries to Optimize:                 │     │
│  │  ☑ #ORD-101 | ถนนสุขุมวิท | 2.5 km             │     │
│  │  ☑ #ORD-102 | ถนนพระราม 4 | 3.1 km             │     │
│  │  ☑ #ORD-103 | ถนนเพชรบุรี | 1.8 km             │     │
│  │  ☑ #ORD-104 | ถนนรัชดา | 4.2 km                │     │
│  │                                                  │     │
│  │  [Optimize Route]                               │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  **Lambda: MultistopDelivery**                            │
│  POST /api/routes/optimize                                │
│  {                                                         │
│    "origin": {"lat": 13.7563, "lon": 100.5018},          │
│    "deliveries": [                                        │
│      {"delivery_id": "...", "lat": ..., "lon": ...},     │
│      ...                                                  │
│    ]                                                       │
│  }                                                         │
│    │                                                       │
│    └─▶ Lambda Process:                                    │
│        1. Create distance matrix (all points)             │
│        2. Apply TSP algorithms:                           │
│           - Nearest Neighbor (initial route)              │
│           - 2-opt improvement (optimize)                  │
│        3. Calculate total distance                        │
│        4. Generate turn-by-turn directions                │
│        5. Save to route_optimizations table               │
│                                                            │
│        Response:                                           │
│        {                                                   │
│          "optimized_route": [                             │
│            {"stop": 1, "delivery_id": "ORD-103", ...},   │
│            {"stop": 2, "delivery_id": "ORD-101", ...},   │
│            {"stop": 3, "delivery_id": "ORD-102", ...},   │
│            {"stop": 4, "delivery_id": "ORD-104", ...}    │
│          ],                                               │
│          "total_distance_km": 11.6,                       │
│          "estimated_time_min": 35,                        │
│          "fuel_cost_estimate": 45.50                      │
│        }                                                   │
│                                                            │
│  Display:                                                  │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Optimized Route:                                │     │
│  │  📍 Origin (7-Eleven Store)                      │     │
│  │   └─▶ 1.8 km → Stop 1: #ORD-103 (เพชรบุรี)     │     │
│  │        └─▶ 2.5 km → Stop 2: #ORD-101 (สุขุมวิท) │     │
│  │             └─▶ 3.1 km → Stop 3: #ORD-102 (พระราม4) │ │
│  │                  └─▶ 4.2 km → Stop 4: #ORD-104 (รัชดา) │ │
│  │                                                  │     │
│  │  Total Distance: 11.6 km                        │     │
│  │  Estimated Time: 35 min                         │     │
│  │  Fuel Cost: ฿45.50                              │     │
│  │                                                  │     │
│  │  [Assign to Driver] [View on Map]               │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### **D. Real-time Analytics**

```
┌─ Real-time Analytics (/analytics) ───────────────────────┐
│                                                           │
│  📊 Live Metrics Dashboard                                │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Orders per Hour (Today)                        │     │
│  │  ┌──────────────────────────────────────────┐   │     │
│  │  │     ▆                                     │   │     │
│  │  │   ▄ █     ▆                               │   │     │
│  │  │ ▂ █ █ ▄ ▄ █ ▆   ▂                         │   │     │
│  │  │ █ █ █ █ █ █ █ ▄ █ ▂                       │   │     │
│  │  └──────────────────────────────────────────┘   │     │
│  │  06 08 10 12 14 16 18 20 22                  │   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  Priority Score Distribution                              │
│  ┌─────────────────────────────────────────────────┐     │
│  │  100 │ ●                                        │     │
│  │   80 │   ● ● ●                                  │     │
│  │   60 │       ● ● ● ●                            │     │
│  │   40 │             ● ● ● ●                      │     │
│  │   20 │                   ● ● ●                  │     │
│  │    0 └───────────────────────────────────────   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  Real-time Traffic Impact                                 │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Current Delay Factor: 1.5x (Moderate Traffic) │     │
│  │  Active Routes Affected: 8                     │     │
│  │  Average ETA Increase: +5 min                  │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Data Sources:**
```
PostgreSQL (Real-time):
- orders table
- deliveries table
- gps_trackings table

Kinesis Analytics:
- GPS stream analysis
- Real-time aggregations

External APIs:
- Traffic API (via Realtime-Traffic Lambda)
- Weather API (via 7-11_weather Lambda)
```

#### **E. Vehicle Tracking**

```
┌─ Vehicle Tracking (/vehicle-tracking) ───────────────────┐
│                                                           │
│  🚗 Live Vehicle Map                                      │
│  ┌─────────────────────────────────────────────────┐     │
│  │  [OpenStreetMap]                                │     │
│  │                                                  │     │
│  │  🚙 Vehicle-001 (Somchai)                       │     │
│  │     Status: in_transit                          │     │
│  │     Speed: 45 km/h                              │     │
│  │     Heading: NE                                 │     │
│  │     Last Update: 5 sec ago                      │     │
│  │                                                  │     │
│  │  🚙 Vehicle-002 (Nong)                          │     │
│  │     Status: available                           │     │
│  │     Location: 7-Eleven สุขุมวิท                │     │
│  │                                                  │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  Vehicle List                                             │
│  ┌─────────────────────────────────────────────────┐     │
│  │  ID   | Plate    | Driver  | Status | Battery  │     │
│  │  ─────────────────────────────────────────────  │     │
│  │  V-01 | กท-1234  | Somchai | Active | 85%     │     │
│  │  V-02 | กท-5678  | Nong    | Active | 92%     │     │
│  │  V-03 | กท-9012  | Chai    | Idle   | 100%    │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**API:**
```
GET /api/tracking/vehicles
  └─▶ SELECT
        v.id, v.license_plate, v.vehicle_type,
        d.first_name, d.last_name, d.status,
        gt.latitude, gt.longitude, gt.speed_kmh, gt.heading
      FROM vehicles v
      JOIN drivers d ON v.id = d.current_vehicle_id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, speed_kmh, heading, recorded_at
        FROM gps_trackings
        WHERE driver_id = d.id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) gt ON true
      WHERE d.status IN ('active', 'available')
```

**Admin Data Flow Summary:**
```
Dashboard
  └─▶ Aggregate queries on orders, deliveries, drivers

Driver Performance
  └─▶ JOIN drivers + deliveries + orders
      └─▶ Calculate KPIs (on-time rate, avg time, rating)

Route Optimization
  └─▶ MultistopDelivery Lambda
      └─▶ TSP algorithm (Nearest Neighbor + 2-opt)
      └─▶ route_optimizations table

Analytics
  ├─▶ PostgreSQL (real-time data)
  ├─▶ Kinesis Stream (GPS analytics)
  └─▶ External APIs (Traffic, Weather)

Vehicle Tracking
  └─▶ gps_trackings table (latest records)
      └─▶ Real-time map display
```

---

## 🔄 Complete Data Flow Architecture

### **End-to-End Order Flow**

```
┌──────────────────────────────────────────────────────────────────┐
│                     COMPLETE ORDER LIFECYCLE                      │
└──────────────────────────────────────────────────────────────────┘

1️⃣ CUSTOMER PLACES ORDER
   Customer (/shop/checkout)
     │
     ├─▶ findNearby7 Lambda
     │   ├─ Query OpenStreetMap (7-Eleven stores)
     │   ├─ Calculate distance (Haversine)
     │   ├─ Get route (OSRM API)
     │   └─ Return nearest store
     │
     ├─▶ priority Lambda
     │   ├─ Analyze products (temp, expiry, weight, fragile)
     │   ├─ Analyze customer (tier, delivery window)
     │   ├─ Calculate weighted score (0-100)
     │   └─ Return priority_score + priority_class
     │
     └─▶ POST /api/orders/create
         ├─ INSERT INTO orders
         ├─ INSERT INTO order_items
         └─ INSERT INTO deliveries (status: pending)

2️⃣ ADMIN MONITORS
   Admin Dashboard (/)
     │
     └─▶ GET /api/analytics/dashboard
         ├─ Show pending deliveries
         ├─ Priority distribution
         └─ System statistics

3️⃣ RIDER SEES AVAILABLE JOB
   Rider Dashboard (/rider)
     │
     ├─▶ GET /api/deliveries?status=pending
     │   └─ ORDER BY priority_score DESC
     │
     └─▶ Display jobs sorted by priority
         - Auto Mode: Use AI priority
         - Manual Mode: Rider chooses

4️⃣ RIDER ACCEPTS JOB
   Click "Accept Job"
     │
     └─▶ riderAssignment Lambda
         ├─ Validate driver & delivery
         ├─ UPDATE deliveries (driver_id, status: assigned)
         └─ Return success

5️⃣ RIDER PICKS UP ORDER
   Click "Mark as Picked Up"
     │
     └─▶ PUT /api/deliveries/{id}/pickup
         └─ UPDATE deliveries (status: picked_up, pickup_time: NOW())

6️⃣ RIDER NAVIGATES TO CUSTOMER
   Click "Navigate"
     │
     ├─▶ Opens Google Maps (External)
     │
     ├─▶ Auto GPS Tracking (Every 10 sec)
     │   └─▶ realtimeTracking Lambda
     │       ├─ INSERT INTO gps_trackings
     │       ├─ Send to Kinesis Stream
     │       ├─ UPDATE deliveries (status: in_transit)
     │       └─ Broadcast to WebSocket (Customer tracking)
     │
     └─▶ Auto ETA Calculation (Every 30 sec)
         └─▶ etaCalculation Lambda
             ├─ Get current location (gps_trackings)
             ├─ Get destination (deliveries)
             ├─ Call OSRM API (route)
             ├─ Call Weather API (delay factor)
             ├─ Call Traffic API (Realtime-Traffic Lambda)
             ├─ Calculate adjusted ETA
             └─ Return ETA to customer

7️⃣ CUSTOMER TRACKS ORDER
   Component: <OrderStatusTracker />
     │
     └─▶ GET /api/orders/tracking (Poll every 5 sec)
         ├─ Get order status
         ├─ Get driver location (latest GPS)
         ├─ Get ETA
         └─ Display on map with polyline

8️⃣ RIDER COMPLETES DELIVERY
   Click "Complete Delivery"
     │
     └─▶ deliveryCompletion Lambda
         ├─ Validate delivery
         ├─ Upload proof to S3
         ├─ Calculate actual_distance (from GPS logs)
         ├─ UPDATE deliveries (status: delivered, delivery_time: NOW())
         ├─ UPDATE orders (order_status: delivered)
         ├─ UPDATE drivers (total_deliveries++, status: available)
         ├─ Export ML training data to S3
         └─ Notify customer (SMS/Email)

9️⃣ ADMIN ANALYZES PERFORMANCE
   Admin (/analytics)
     │
     ├─▶ GET /api/analytics/performance
     │   └─ Aggregate delivery data
     │       - Compare estimated vs actual time
     │       - Compare estimated vs actual distance
     │       - Driver performance metrics
     │
     └─▶ Display charts & insights

🔟 ML MODEL IMPROVEMENT (Background)
   S3 Training Data
     │
     └─▶ SageMaker (Future)
         ├─ Train new priority model
         ├─ Train new ETA model
         └─ Deploy improved models
```

---

## 🗄️ Database Tables และ Relationships

```
customers ──< orders ──< order_items >── products
    │            │
    │            └──< deliveries ──< gps_trackings
    │                    │
    │                    ├──> drivers ──> vehicles
    │                    │
    │                    └──> route_optimizations

stores ──< (used by findNearby7 Lambda)

users (authentication for all roles)
  ├─ role: 'customer' → customers.phone
  ├─ role: 'rider' → drivers.phone
  └─ role: 'admin' → no FK
```

---

## 🚀 Lambda Functions Mapping

| Lambda Function | Purpose | Triggered By | Input | Output |
|----------------|---------|--------------|-------|--------|
| **priority** | คำนวณ Priority Score | Order creation | Products, customer, delivery info | priority_score (0-100), priority_class |
| **findNearby7** | หาร้าน 7-11 ใกล้ที่สุด | Checkout page | Customer lat/lon | Nearest store with distance/route |
| **riderAssignment** | มอบหมายงานให้ Rider | Rider accepts job | driver_id, delivery_id | Assignment confirmation |
| **coreRouteOptimize** | หาเส้นทางที่สั้นที่สุด | Single delivery | Origin, destination | Optimized route |
| **MultistopDelivery** | เส้นทางหลายจุดส่ง (TSP) | Admin optimization | Multiple deliveries | Optimized stop sequence |
| **realtimeTracking** | บันทึก GPS แบบ Real-time | Rider navigation (auto) | GPS coordinates | Tracking record + Kinesis |
| **etaCalculation** | คำนวณ ETA แบบ Dynamic | During transit (auto) | Current location, destination | ETA in minutes |
| **deliveryCompletion** | บันทึกการส่งเสร็จสิ้น | Rider completes | delivery_id, proof | Updated records + ML export |
| **Realtime-Traffic** | ดูสภาพจราจรแบบ Real-time | ETA calculation | Route coordinates | Traffic delay factor |
| **7-11_weather** | ดูสภาพอากาศ (unused) | - | Location | Weather conditions |
| **orderManagement** | สร้าง/จัดการ Order | Order creation | Order data | Order record |
| **routeNavigation** | Navigation instructions | Rider navigation | Route | Turn-by-turn directions |

---

## 🔌 External API Integration

```
┌─ External APIs ────────────────────────────────────────┐
│                                                         │
│  1. OpenStreetMap Overpass API                          │
│     Purpose: Find 7-Eleven stores                       │
│     Used by: findNearby7 Lambda                         │
│     Free: Yes                                           │
│                                                         │
│  2. OSRM (Open Source Routing Machine)                  │
│     Purpose: Calculate road routes & distances          │
│     Used by: All routing Lambdas                        │
│     Free: Yes                                           │
│                                                         │
│  3. OpenWeatherMap                                       │
│     Purpose: Weather conditions for ETA adjustment      │
│     Used by: etaCalculation Lambda                      │
│     Free: 1000 calls/day                                │
│                                                         │
│  4. SerpAPI (Google Maps Traffic)                       │
│     Purpose: Real-time traffic data                     │
│     Used by: Realtime-Traffic Lambda                    │
│     Free: 250 searches/month                            │
│                                                         │
│  5. AWS Kinesis                                          │
│     Purpose: Stream GPS data for ML                     │
│     Used by: realtimeTracking Lambda                    │
│     Cost: Pay per stream                                │
│                                                         │
│  6. AWS S3                                               │
│     Purpose: Store proof of delivery + ML training data │
│     Used by: deliveryCompletion Lambda                  │
│     Cost: Pay per storage                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile vs Desktop Features

### Customer
- ✅ Desktop: Full shopping experience
- ✅ Mobile: Responsive shopping + tracking

### Rider
- ⚠️ Current: Desktop dashboard
- 🎯 Recommended: Mobile-first PWA for GPS tracking

### Admin
- ✅ Desktop: Full analytics dashboard
- ⚠️ Mobile: View-only (limited features)

---

## 🎯 Missing Integrations (To Implement)

```
[ ] Connect orderManagement Lambda to /api/orders/create
[ ] Connect routeNavigation Lambda to /rider dashboard
[ ] Implement WebSocket for real-time customer tracking
[ ] Add SMS/Email notifications on delivery completion
[ ] Implement SageMaker ML pipeline for model training
[ ] Add payment gateway integration
[ ] Implement inventory management
```

---

## 📊 Performance Metrics & KPIs

### Customer Satisfaction
- Order fulfillment rate: > 99%
- On-time delivery rate: > 95%
- Customer rating: > 4.5⭐

### Rider Efficiency
- Average deliveries per hour: 3-4
- Fuel efficiency: < ฿50 per delivery
- Idle time: < 20%

### System Performance
- API response time: < 200ms
- Lambda cold start: < 3s
- GPS update frequency: 10s
- ETA accuracy: ±5 min

---

**สรุป:** ระบบนี้ครอบคลุมทุก Flow ตั้งแต่ลูกค้าสั่งซื้อ → Rider รับงาน → Navigation → Completion → Analytics พร้อม Lambda integration ที่สมบูรณ์!
