# DeliveryGenie: Data Flow Architecture

## 📋 Table of Contents
- [Overview](#overview)
- [System Actors](#system-actors)
- [Complete Data Flow](#complete-data-flow)
- [Lambda Functions Mapping](#lambda-functions-mapping)
- [Database Schema Usage](#database-schema-usage)
- [API Endpoints](#api-endpoints)
- [Real-time Communication](#real-time-communication)

---

## 🎯 Overview

DeliveryGenie เป็นระบบ Last-Mile Delivery ที่ใช้ AI ในการ optimize เส้นทางการส่งของ โดยมีการคำนวณ Priority จากหลายปัจจัย เพื่อ Balance ระหว่าง:
- 🎯 **ความพึงพอใจของลูกค้า** (Customer Satisfaction)
- 💰 **ต้นทุนการส่ง** (Delivery Cost)
- ⚡ **ประสิทธิภาพ** (Efficiency)

---

## 👥 System Actors

### 1. **Customer** (ลูกค้า)
- สั่งสินค้าจากร้าน 7-Eleven
- ติดตาม Rider แบบ Real-time
- ให้ Rating หลังรับของเสร็จ

### 2. **Rider** (คนส่งของ)
- รับ Assignment จาก System
- นำทางด้วย Turn-by-turn Navigation
- ส่ง GPS Location Real-time
- อัปเดตสถานะการส่ง

### 3. **Admin** (ผู้ดูแลระบบ)
- ดู Dashboard Analytics
- Assign Orders ให้ Riders
- ตรวจสอบ Performance Metrics
- จัดการ Stores, Products, Drivers

---

## 🔄 Complete Data Flow

### **Phase 1: Store Discovery & Selection** 🏪

```
Customer (Web/Mobile)
    ↓ [1] ส่ง GPS Location
    │
    ├─→ Lambda: findNearby7.py
    │   │
    │   ├─→ Input: { lat, lon, radius: 2km }
    │   │
    │   ├─→ Process:
    │   │   1. Query OpenStreetMap Overpass API
    │   │   2. Filter stores within 2km radius
    │   │   3. Check database cache (stores table)
    │   │   4. Save new stores to database
    │   │
    │   └─→ Output: [ {store_id, name, distance_km, ...} ]
    │
    ↓ [2] ส่ง Stores ทั้งหมดไปหาเส้นทาง
    │
    ├─→ Lambda: coreRouteOptimize.py
    │   │
    │   ├─→ Input: {
    │   │       origin: {lat, lon},
    │   │       stores: [{id, lat, lon}, ...]
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Calculate Haversine distance (fallback)
    │   │   2. Get OSRM real road distance
    │   │   3. Sort stores by distance (nearest first)
    │   │   4. Log to system_logs table
    │   │
    │   └─→ Output: {
    │           nearest_store: {...},
    │           sorted_stores: [...]
    │       }
    │
    ↓ [3] แสดงร้านที่ใกล้ที่สุด + สินค้าในร้าน
    │
    └─→ Frontend: แสดงร้าน + รายการสินค้า
        (Query: store_inventories + products)
```

### **Phase 2: Order Creation** 🛒

```
Customer
    ↓ [4] สั่งสินค้า (เลือกสินค้า + กรอกที่อยู่)
    │
    ├─→ Lambda: orderManagement.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       customer_id,
    │   │       store_id,
    │   │       products: [{product_id, quantity}, ...],
    │   │       delivery_address: {lat, lon, ...},
    │   │       delivery_window_end: "2025-11-22T14:00:00Z"
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Validate customer & products
    │   │   2. Check store_inventories (stock availability)
    │   │   3. Calculate subtotal, tax, shipping_fee, total
    │   │   4. Create order (orders table)
    │   │   5. Create order_items (order_items table)
    │   │   6. Update store_inventories (decrease quantity)
    │   │   7. Call priority.py to calculate priority
    │   │   8. Call etaCalculation.py for estimated delivery
    │   │   9. Log to priority_calculation_logs
    │   │
    │   └─→ Output: {
    │           order_id,
    │           order_number: "ORD-001",
    │           priority_score: 85.5,
    │           priority_class: "critical",
    │           estimated_delivery_time: "13:30",
    │           nearest_rider_eta: "25 min"
    │       }
    │
    ↓ [5] อัปเดต Order Status
    │
    └─→ Database: orders table
        - order_status = "pending"
        - priority_score, priority_class, priority_breakdown
```

### **Phase 3: Priority Calculation** 🎯

```
orderManagement.py
    ↓ [6] คำนวณ Priority
    │
    ├─→ Lambda: priority.py
    │   │
    │   ├─→ Input: {
    │   │       order_id: "...",
    │   │       start_location: {lat, lon}  // Warehouse/Store
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Fetch order from database (orders table)
    │   │   2. Fetch all products in order (order_items + products)
    │   │   3. Calculate total order weight & volume:
    │   │      - total_weight_kg = SUM(product.weight_kg * quantity)
    │   │      - total_volume = SUM(product.dimensions * quantity)
    │   │   4. Call ROUTING_API_URL (coreRouteOptimize.py)
    │   │      → Get distance_km, duration_min
    │   │
    │   │   5. Calculate 7-Factor Score for EACH product:
    │   │      a) Temperature (22%): hot_food=100, frozen=90...
    │   │      b) Expiration (18%): <3h=100, <8h=90...
    │   │      c) Customer (13%): urgent=100, high=75...
    │   │      d) Window (13%): <15min=100, <30min=90...
    │   │      e) Distance (9%): <5km=100, <15km=80...
    │   │      f) Value (9%): >฿500=100, >฿200=80...
    │   │      g) Fragility (4%): fragile=100, normal=30
    │   │      h) Weight (12%): <2kg=100, <5kg=80, <10kg=60... (NEW)
    │   │         → น้ำหนักมาก = Priority ต่ำ (ส่งช้า, น้ำมันแพง)
    │   │
    │   │   5. Select product with HIGHEST priority score
    │   │   6. Set order priority = highest product priority
    │   │
    │   │   6. Calculate order-level metrics:
    │   │      - total_order_weight = SUM(product.weight_kg * quantity)
    │   │      - avg_weight_per_product = total_weight / total_products
    │   │
    │   │   7. Update orders table:
    │   │      - priority_score
    │   │      - priority_class (critical/high/medium/low)
    │   │      - priority_breakdown (JSON)
    │   │
    │   │   8. Log to priority_calculation_logs
    │   │
    │   └─→ Output: {
    │           order_id,
    │           priority_score: 87.50,
    │           priority_class: "critical",
    │           total_order_weight_kg: 3.2,
    │           highest_priority_product: {
    │               product_id: "P001",
    │               category: "hot_food",
    │               priority_score: 87.50,
    │               weight_kg: 0.8
    │           },
    │           all_products: [...],
    │           priority_breakdown: {
    │               temperature: 22.0,
    │               expiration: 18.0,
    │               customer: 13.0,
    │               window: 11.7,
    │               distance: 8.1,
    │               value: 5.4,
    │               fragility: 1.2,
    │               weight: 8.1  // NEW FACTOR
    │           }
    │       }
    │
    ↓ [7] บันทึก Priority
    │
    └─→ Database:
        - orders.priority_score = 91.00
        - orders.priority_class = "critical"
        - priority_calculation_logs (log entry)
```

### **Phase 4: ETA Calculation (with Weather)** ⏱️

```
orderManagement.py / Frontend
    ↓ [8] คำนวณเวลาส่งโดยประมาณ
    │
    ├─→ Lambda: etaCalculation.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       from_location: {lat, lon},
    │   │       to_location: {lat, lon},
    │   │       include_weather: true
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Call Realtime-Traffic.py
    │   │      → Get: travel_time_min, traffic_condition
    │   │
    │   │   2. Query weather_data table (latest forecast)
    │   │      → Get: condition, rainfall, temperature
    │   │
    │   │   3. Apply Weather Multiplier:
    │   │      - ฝนตกหนัก (heavy rain): +30%
    │   │      - ฝนปานกลาง (moderate rain): +20%
    │   │      - ฝนเล็กน้อย (light rain): +10%
    │   │      - อากาศดี (clear): +0%
    │   │
    │   │   4. Calculate Total ETA:
    │   │      total_eta = base_eta + traffic_delay + weather_delay
    │   │
    │   │   5. Generate estimated_arrival timestamp
    │   │
    │   └─→ Output: {
    │           base_eta_min: 25,
    │           traffic_delay_min: 8,
    │           weather_delay_min: 5,  // ฝนปานกลาง
    │           total_eta_min: 38,
    │           estimated_arrival: "2025-11-22T13:38:00Z",
    │           weather_condition: "ฝนปานกลาง",
    │           traffic_condition: "moderate"
    │       }
    │
    └─→ Update: orders.estimated_delivery
```

### **Phase 5: Batch Priority Processing** 📦

```
Admin Dashboard (Every 5-10 minutes)
    ↓ [9] รวบรวม Pending Orders
    │
    ├─→ Lambda: batchPriorityProcessing.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       store_id: "store1",
    │   │       start_location: {lat, lon}
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Query orders table:
    │   │      WHERE order_status = 'pending'
    │   │      AND store_id = 'store1'
    │   │      AND order_date >= TODAY
    │   │
    │   │   2. For each order (parallel processing):
    │   │      - If priority_score is NULL:
    │   │        Call priority.py to calculate
    │   │      - Else: use existing score
    │   │
    │   │   3. Sort orders by priority_score DESC
    │   │
    │   │   4. Update priority_rank:
    │   │      - Rank 1 = highest priority
    │   │      - Rank N = lowest priority
    │   │
    │   │   5. Group orders by priority_class:
    │   │      - critical: [], high: [], medium: [], low: []
    │   │
    │   └─→ Output: {
    │           total_orders: 15,
    │           sorted_orders: [
    │               {order_id, priority_score: 91, priority_class: "critical", rank: 1},
    │               {order_id, priority_score: 74, priority_class: "high", rank: 2},
    │               ...
    │           ],
    │           summary: {
    │               critical: 3,
    │               high: 5,
    │               medium: 4,
    │               low: 3
    │           }
    │       }
    │
    └─→ Database: Update orders.priority_rank
```

### **Phase 6: Rider Assignment** 🏍️

```
Admin Dashboard
    ↓ [10] Assign Orders to Riders
    │
    ├─→ Lambda: riderAvailability.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       store_id: "store1",
    │   │       pending_orders: ["order1", "order2", "order3"]  // Orders รอจัดส่ง
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Query drivers table:
    │   │      WHERE status = 'active' OR status = 'available'
    │   │
    │   │   2. Get latest GPS from gps_trackings:
    │   │      ORDER BY timestamp DESC LIMIT 1
    │   │
    │   │   3. For each driver, get their assigned vehicle (vehicles table)
    │   │
    │   │   4. Calculate current load (from assigned deliveries):
    │   │      - current_weight_kg = SUM(order_items.quantity * products.weight_kg)
    │   │        WHERE delivery_status IN ('assigned', 'picked_up', 'in_transit')
    │   │      - current_volume = SUM(order_items.quantity * products.dimensions)
    │   │      - current_order_count = COUNT(DISTINCT order_id)
    │   │
    │   │   5. Calculate pending orders' requirements:
    │   │      - pending_weight_kg = SUM(all pending orders' total_weight)
    │   │      - pending_volume = SUM(all pending orders' total_volume)
    │   │      - pending_count = COUNT(pending_orders)
    │   │
    │   │   6. Check Vehicle Capacity:
    │   │      available_weight = vehicle.capacity_weight_kg - current_weight_kg
    │   │      available_volume = vehicle.capacity_volume_m3 - current_volume
    │   │
    │   │   7. Filter Riders:
    │   │      - Can fit weight: available_weight >= pending_weight_kg
    │   │      - Can fit volume: available_volume >= pending_volume
    │   │      - Vehicle type matches (e.g., motorcycle, truck)
    │   │
    │   │   8. Calculate distance from store to each rider
    │   │
    │   │   9. Sort by:
    │   │      - available_weight DESC (ใครว่างมากไปก่อน)
    │   │      - distance ASC
    │   │      - rating DESC
    │   │
    │   └─→ Output: {
    │           available_riders: [
    │               {
    │                   rider_id: "rider1",
    │                   name: "สมชาย ใจดี",
    │                   vehicle_id: "bike1",
    │                   vehicle_type: "motorcycle",
    │                   current_location: {lat, lon},
    │                   distance_from_store_km: 2.5,
    │                   status: "available",
    │                   capacity: {
    │                       max_weight_kg: 30,
    │                       max_volume_m3: 0.15,
    │                       current_weight_kg: 0,
    │                       current_volume_m3: 0,
    │                       available_weight_kg: 30,
    │                       available_volume_m3: 0.15,
    │                       current_order_count: 0,
    │                       can_fit_pending: true
    │                   },
    │                   rating: 4.8,
    │                   fuel_efficiency: 35  // km/L
    │               }
    │           ],
    │           pending_orders_summary: {
    │               total_weight_kg: 12.5,
    │               total_volume_m3: 0.08,
    │               total_orders: 3
    │           }
    │       }
    │
    ↓ [11] เลือก Rider + Assign Orders
    │
    ├─→ Lambda: riderAssignment.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       store_id: "store1",
    │   │       rider_id: "rider1",
    │   │       order_ids: ["order1", "order2", "order3"]
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Validate rider availability
    │   │
    │   │   2. Get rider's vehicle capacity (vehicles table)
    │   │
    │   │   3. Calculate total weight & volume of orders:
    │   │      - For each order:
    │   │        total_weight = SUM(order_items.quantity * products.weight_kg)
    │   │        total_volume = SUM(order_items.quantity * products.dimensions)
    │   │
    │   │   4. Validate capacity constraints:
    │   │      - total_weight <= vehicle.capacity_weight_kg
    │   │      - total_volume <= vehicle.capacity_volume_m3
    │   │      - If exceeded → return error "Capacity exceeded"
    │   │
    │   │   5. Get rider's current location (gps_trackings)
    │   │
    │   │   6. Call MultistopDelivery.py:
    │   │      - Calculate optimal route (TSP)
    │   │      - Consider priority scores
    │   │      - Consider weight impact on fuel consumption
    │   │      - Balance: distance vs priority vs weight
    │   │
    │   │   4. Create route (routes table):
    │   │      - route_number: "R-001"
    │   │      - driver_id, vehicle_id
    │   │      - total_distance_km, total_duration_min
    │   │      - route_status: "planned"
    │   │
    │   │   5. Create route_stops (route_stops table):
    │   │      - stop_order: 1, 2, 3
    │   │      - estimated_arrival per stop
    │   │
    │   │   6. Create deliveries (deliveries table):
    │   │      - delivery_status: "assigned"
    │   │      - estimated_arrival
    │   │
    │   │   7. Update orders:
    │   │      - order_status: "assigned"
    │   │
    │   │   8. Update driver status: "busy"
    │   │
    │   │   9. Send notification to Rider (via WebSocket/Push)
    │   │
    │   └─→ Output: {
    │           assignment_id: "...",
    │           rider_id: "rider1",
    │           route_id: "route1",
    │           assigned_orders: [
    │               {
    │                   order_id: "order1",
    │                   stop_order: 1,
    │                   priority_score: 91,
    │                   estimated_arrival: "13:30"
    │               },
    │               {
    │                   order_id: "order2",
    │                   stop_order: 2,
    │                   priority_score: 74,
    │                   estimated_arrival: "13:50"
    │               }
    │           ],
    │           total_distance_km: 15.2,
    │           total_duration_min: 45,
    │           estimated_completion: "14:15"
    │       }
    │
    └─→ Database Updates:
        - routes (new route)
        - route_stops (stop sequence)
        - deliveries (assigned status)
        - orders.order_status = "assigned"
        - drivers.status = "busy"
```

### **Phase 7: Route Navigation** 🗺️

```
Rider Mobile App
    ↓ [12] เริ่มการจัดส่ง
    │
    ├─→ Lambda: routeNavigation.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       rider_id: "rider1",
    │   │       route_id: "route1"
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Query routes + route_stops:
    │   │      WHERE route_id = 'route1'
    │   │      ORDER BY stop_order ASC
    │   │
    │   │   2. Get rider's current GPS (gps_trackings)
    │   │
    │   │   3. Get next stop (where status = 'pending')
    │   │
    │   │   4. Call OSRM Directions API:
    │   │      - From: current_location
    │   │      - To: next_stop.{lat, lon}
    │   │      - Alternative: Google Maps Directions API
    │   │
    │   │   5. Parse Turn-by-turn Instructions:
    │   │      [
    │   │        {instruction: "Head north on Phaya Thai Rd", distance_m: 500},
    │   │        {instruction: "Turn right onto Ratchadamri Rd", distance_m: 1200},
    │   │        {instruction: "Arrive at destination", distance_m: 0}
    │   │      ]
    │   │
    │   │   6. Generate Polyline for Map Display
    │   │
    │   │   7. Calculate real-time ETA (with traffic + weather)
    │   │
    │   └─→ Output: {
    │           current_stop: {
    │               stop_order: 1,
    │               address: "123 ถ.พระราม 4",
    │               customer_name: "คุณสมชาย",
    │               order_id: "order1",
    │               lat: 13.75,
    │               lon: 100.52
    │           },
    │           remaining_stops: 2,
    │           navigation: {
    │               distance_km: 3.2,
    │               duration_min: 12,
    │               steps: [
    │                   {instruction: "...", distance_m: 500, duration_sec: 60},
    │                   ...
    │               ],
    │               polyline: "encoded_polyline_string",
    │               traffic_condition: "moderate",
    │               weather_condition: "ฝนเล็กน้อย"
    │           },
    │           estimated_arrival: "13:32:00"
    │       }
    │
    └─→ Rider App Display:
        - Map with route polyline
        - Turn-by-turn instructions
        - ETA countdown
        - Customer info
```

### **Phase 8: Real-time Tracking** 📍

```
Rider Mobile App (Every 10-15 seconds)
    ↓ [13] ส่ง GPS Location
    │
    ├─→ Lambda: realtimeTracking.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       rider_id: "rider1",
    │   │       route_id: "route1",
    │   │       current_location: {
    │   │           lat: 13.7523,
    │   │           lon: 100.5245,
    │   │           accuracy: 5.2,
    │   │           speed: 25.5,  // km/h
    │   │           heading: 45.0,  // degrees
    │   │           battery_level: 85
    │   │       },
    │   │       timestamp: "2025-11-22T13:25:30Z"
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Validate rider_id + route_id
    │   │
    │   │   2. Save GPS to gps_trackings table:
    │   │      - driver_id, vehicle_id
    │   │      - latitude, longitude, altitude
    │   │      - accuracy, speed, heading
    │   │      - battery_level, is_moving
    │   │      - timestamp
    │   │
    │   │   3. Get current delivery (deliveries table):
    │   │      WHERE delivery_status = 'in_transit'
    │   │
    │   │   4. Calculate distance to customer:
    │   │      - From: current GPS
    │   │      - To: delivery.delivery_latitude, delivery_longitude
    │   │
    │   │   5. Update real-time ETA (with traffic + weather):
    │   │      - Call etaCalculation.py
    │   │
    │   │   6. Detect Status Changes:
    │   │      - If distance < 100m → status: "near_destination"
    │   │      - If distance < 20m → status: "arrived"
    │   │
    │   │   7. Push Update to Customer:
    │   │      - Via WebSocket / Server-Sent Events
    │   │      - Or: Customer polls GET /api/tracking/{order_id}
    │   │
    │   │   8. Update route_stops.actual_arrival (if arrived)
    │   │
    │   └─→ Output (to Customer): {
    │           rider_name: "สมชาย ใจดี",
    │           rider_phone: "0812345678",
    │           current_location: {lat: 13.7523, lon: 100.5245},
    │           distance_to_you_km: 1.2,
    │           updated_eta_min: 12,
    │           status: "in_transit",  // picked_up, in_transit, near_destination, arrived
    │           last_updated: "13:25:30"
    │       }
    │
    └─→ Database:
        - gps_trackings (new GPS point)
        - deliveries.delivery_status (updated if needed)
        - route_stops.actual_arrival (if arrived)
```

### **Phase 9: Delivery Completion** ✅

```
Rider Mobile App
    ↓ [14] ส่งของสำเร็จ (เก็บ Signature/Photo)
    │
    ├─→ Lambda: deliveryCompletion.py (NEW)
    │   │
    │   ├─→ Input: {
    │   │       delivery_id: "delivery1",
    │   │       rider_id: "rider1",
    │   │       order_id: "order1",
    │   │       route_id: "route1",
    │   │       stop_order: 1,
    │   │       actual_delivery_time: "2025-11-22T13:32:00Z",
    │   │       signature_url: "s3://...",
    │   │       photo_url: "s3://...",
    │   │       notes: "ส่งเรียบร้อย"
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Validate delivery_id, rider_id
    │   │
    │   │   2. Get delivery info (deliveries table)
    │   │
    │   │   3. Calculate Actual Metrics:
    │   │      a) Actual Duration:
    │   │         - From: delivery.pickup_time
    │   │         - To: actual_delivery_time
    │   │
    │   │      b) Actual Distance:
    │   │         - Sum of GPS points (gps_trackings)
    │   │         - Between pickup_time and delivery_time
    │   │
    │   │      c) Delay:
    │   │         - delay_minutes = actual - estimated
    │   │
    │   │      d) On-time Status:
    │   │         - on_time = (delay_minutes <= 5)
    │   │
    │   │   4. Retrieve Actual Route:
    │   │      - Query gps_trackings:
    │   │        WHERE driver_id = 'rider1'
    │   │        AND timestamp BETWEEN pickup_time AND delivery_time
    │   │      - Create GeoJSON LineString
    │   │
    │   │   5. Update deliveries table:
    │   │      - delivery_status = "completed"
    │   │      - actual_arrival = "13:32:00"
    │   │      - actual_distance_km, actual_duration_min
    │   │      - delay_minutes, on_time
    │   │
    │   │   6. Update orders table:
    │   │      - order_status = "delivered"
    │   │      - actual_delivery = "13:32:00"
    │   │      - delay_minutes
    │   │
    │   │   7. Update route_stops:
    │   │      - status = "completed"
    │   │      - actual_arrival, actual_duration
    │   │
    │   │   8. Save Training Data to S3/DynamoDB:
    │   │      {
    │   │        delivery_id,
    │   │        origin: {lat, lon},
    │   │        destination: {lat, lon},
    │   │        distance_km: actual_distance_km,
    │   │        duration_min: actual_duration_min,
    │   │        traffic_condition: "moderate",
    │   │        weather_condition: "ฝนเล็กน้อย",
    │   │        time_of_day: "lunch",
    │   │        priority_score: 91,
    │   │        on_time: true,
    │   │        actual_route: GeoJSON,
    │   │        timestamp: "2025-11-22T13:32:00Z"
    │   │      }
    │   │      → เพื่อนำไป Train AI Model
    │   │
    │   │   9. Check if route completed:
    │   │      - If all route_stops.status = "completed":
    │   │        - routes.route_status = "completed"
    │   │        - routes.completed_at = NOW()
    │   │        - drivers.status = "available"
    │   │
    │   │   10. Create delivery_histories entry:
    │   │       - For analytics & ML training
    │   │
    │   │   11. Update performance_metrics (daily/monthly)
    │   │
    │   │   12. Send notification to customer:
    │   │       - "สินค้าถึงแล้ว! กรุณาให้คะแนน"
    │   │
    │   └─→ Output: {
    │           success: true,
    │           delivery_id: "delivery1",
    │           order_id: "order1",
    │           delivered_at: "13:32:00",
    │           delay_minutes: 2,  // เร็วกว่ากำหนด
    │           on_time: true,
    │           actual_distance_km: 3.1,
    │           actual_duration_min: 10,
    │           training_data_saved: "s3://deliverygenie/training/2025-11-22/delivery_001.json",
    │           rider_status: "available"  // ถ้าเสร็จทุก stop
    │       }
    │
    └─→ Database Updates:
        - deliveries.delivery_status = "completed"
        - orders.order_status = "delivered"
        - route_stops.status = "completed"
        - routes.route_status = "completed" (if all done)
        - drivers.status = "available" (if all done)
        - delivery_histories (new entry)
        - S3/DynamoDB (training data)
```

### **Phase 10: Customer Feedback** ⭐

```
Customer Mobile/Web
    ↓ [15] ให้คะแนนและ Feedback
    │
    ├─→ API: POST /api/feedback
    │   │
    │   ├─→ Input: {
    │   │       order_id: "order1",
    │   │       delivery_id: "delivery1",
    │   │       rider_id: "rider1",
    │   │       rating: 5,  // 1-5
    │   │       feedback: "ส่งเร็วมาก! สินค้าสดใหม่",
    │   │       tags: ["fast", "friendly", "fresh"]
    │   │   }
    │   │
    │   ├─→ Process:
    │   │   1. Update deliveries table:
    │   │      - customer_rating = 5
    │   │      - customer_feedback = "..."
    │   │
    │   │   2. Update delivery_histories:
    │   │      - customer_satisfaction = 5
    │   │
    │   │   3. Update driver's average rating:
    │   │      - drivers.rating = AVG(all ratings)
    │   │      - drivers.total_deliveries += 1
    │   │
    │   │   4. Save feedback for AI analysis:
    │   │      - Sentiment Analysis
    │   │      - Identify improvement areas
    │   │
    │   │   5. Trigger rewards/incentives (if rating = 5):
    │   │      - Driver bonus points
    │   │      - Customer loyalty points
    │   │
    │   └─→ Output: {
    │           success: true,
    │           thank_you_message: "ขอบคุณสำหรับความคิดเห็น!",
    │           loyalty_points_earned: 10
    │       }
    │
    └─→ Database:
        - deliveries (rating + feedback)
        - delivery_histories (satisfaction score)
        - drivers.rating (updated average)
```

---

---

## 🏋️ Vehicle Capacity & Weight Management

### **Vehicle Types & Capacities**

| Vehicle Type | Max Weight (kg) | Max Volume (m³) | Typical Use Case | Fuel Consumption |
|-------------|----------------|----------------|------------------|------------------|
| **Motorcycle** | 30 kg | 0.15 m³ | 1-3 orders, light items | 35 km/L |
| **Scooter (Box)** | 50 kg | 0.25 m³ | 3-5 orders, medium items | 30 km/L |
| **Small Truck** | 500 kg | 3.0 m³ | 10-20 orders, bulk delivery | 8 km/L |

### **Weight Impact on Priority**

```python
# Weight Scoring (12% of total priority)
# Lower weight = Higher priority (faster delivery, less fuel)

Weight Thresholds:
- < 2 kg   = 100 points  (Very Light - ส่งเร็ว)
- < 5 kg   = 80 points   (Light)
- < 10 kg  = 60 points   (Medium)
- < 20 kg  = 40 points   (Heavy - ส่งช้า, น้ำมันแพง)
- >= 20 kg = 20 points   (Very Heavy)

Example Calculation:
Order A: 1.5 kg → Weight Score = 100 × 0.12 = 12.0
Order B: 15 kg  → Weight Score = 40 × 0.12 = 4.8

Impact:
- Order A มี priority สูงกว่า (น้ำหนักเบา → ส่งเร็ว)
- Order B มี priority ต่ำกว่า (น้ำหนักหนัก → ส่งช้า + เผาน้ำมันมาก)
```

### **Capacity Validation Logic**

```python
# Before assigning orders to rider:

1. Calculate current load:
   current_weight = SUM(active_deliveries.total_weight)
   current_volume = SUM(active_deliveries.total_volume)

2. Calculate pending orders' total:
   pending_weight = SUM(pending_orders.total_weight)
   pending_volume = SUM(pending_orders.total_volume)

3. Check capacity:
   if (current_weight + pending_weight) > vehicle.capacity_weight_kg:
       → Cannot assign (Overweight)

   if (current_volume + pending_volume) > vehicle.capacity_volume_m3:
       → Cannot assign (No space)

4. Fuel efficiency adjustment:
   base_fuel_consumption = distance_km / vehicle.fuel_efficiency
   weight_multiplier = 1 + (total_weight / vehicle.max_weight) * 0.3
   actual_fuel = base_fuel_consumption * weight_multiplier

   # น้ำหนักเต็มจุด (100%) → ใช้น้ำมันเพิ่ม 30%
```

### **Smart Assignment Algorithm**

```python
# When assigning multiple orders to one rider:

1. Sort orders by priority_score DESC
2. Group orders by:
   - Zone (ใกล้กัน → จัดรวม batch)
   - Weight class (light, medium, heavy)
   - Temperature requirement (ต้องการตู้แช่เดียวกัน)

3. Pack orders (Bin Packing Problem):
   packed_orders = []
   remaining_weight = vehicle.capacity_weight_kg
   remaining_volume = vehicle.capacity_volume_m3

   for order in sorted_orders:
       if (order.weight <= remaining_weight AND
           order.volume <= remaining_volume):
           packed_orders.append(order)
           remaining_weight -= order.weight
           remaining_volume -= order.volume

   return packed_orders

4. Calculate delivery sequence:
   - High priority first (critical > high > medium > low)
   - But optimize for distance (ไม่ข้ามซ้อน)
   - Heavier items deliver first (ลดน้ำหนักเร็วๆ → ประหยัดน้ำมัน)
```

---

## 🗂️ Lambda Functions Mapping

### **Existing Lambda Functions** ✅

| Lambda Function | Purpose | Input Tables | Output Tables | External APIs |
|----------------|---------|--------------|---------------|---------------|
| **findNearby7.py** | หาร้าน 7-11 ใกล้เคียง | `stores` (cache) | `stores` (upsert) | OpenStreetMap Overpass API |
| **coreRouteOptimize.py** | หาเส้นทางสั้นสุด | - | `system_logs` | OSRM API |
| **MultistopDelivery.py** | TSP Multi-stop Route | - | `system_logs` | - |
| **priority.py** | คำนวณ Priority Score | `orders`, `order_items`, `products`, `customers` | `orders`, `priority_calculation_logs` | OSRM API (via ROUTING_API_URL) |
| **7-11_weather.py** | ดึงข้อมูลสภาพอากาศ | `stores` | `weather_data` | TMD API |
| **Realtime-Traffic.py** | Traffic Data (Mock) | - | `traffic_data` | OpenStreetMap (optional) |

### **New Lambda Functions** 🆕

| Lambda Function | Purpose | Input Tables | Output Tables | Calls Other Lambdas |
|----------------|---------|--------------|---------------|---------------------|
| **orderManagement.py** | สร้าง Order | `customers`, `stores`, `store_inventories`, `products` | `orders`, `order_items`, `store_inventories` | `priority.py`, `etaCalculation.py` |
| **etaCalculation.py** | คำนวณ ETA (with weather) | `weather_data`, `traffic_data` | - | `Realtime-Traffic.py` |
| **batchPriorityProcessing.py** | Batch Priority Calc | `orders` | `orders` | `priority.py` (multiple) |
| **riderAvailability.py** | ตรวจสอบ Riders ว่าง | `drivers`, `gps_trackings`, `deliveries` | - | - |
| **riderAssignment.py** | Assign Orders to Rider | `drivers`, `orders`, `vehicles` | `routes`, `route_stops`, `deliveries`, `orders`, `drivers` | `MultistopDelivery.py` |
| **routeNavigation.py** | Turn-by-turn Navigation | `routes`, `route_stops`, `gps_trackings` | - | OSRM Directions API |
| **realtimeTracking.py** | GPS Tracking | `deliveries`, `routes` | `gps_trackings`, `deliveries`, `route_stops` | `etaCalculation.py` |
| **deliveryCompletion.py** | บันทึกการส่งเสร็จ | `deliveries`, `gps_trackings`, `orders`, `routes` | `deliveries`, `orders`, `routes`, `route_stops`, `drivers`, `delivery_histories` | - |

---

## 🗄️ Database Schema Usage

### **Core Tables**

#### **customers** (ลูกค้า)
```prisma
- id, name, phone, email
- address_line1, address_line2, district, city, postal_code
- latitude, longitude
- priority_level: "urgent" | "high" | "standard" | "economy"
```
**Used by:** orderManagement.py, priority.py

---

#### **stores** (ร้าน 7-Eleven)
```prisma
- id, store_code, name, branch_name
- address, district, city, province, postal_code
- latitude, longitude
- opening_hours (JSON), is_24_hours, is_active
```
**Used by:** findNearby7.py, 7-11_weather.py, orderManagement.py

---

#### **products** (สินค้า)
```prisma
- id, sku, name, description, category
- base_price
- temperature_requirement: "frozen" | "chilled" | "ambient" | "hot"
- typical_expiration_hours
- is_fragile, weight_kg
```
**Used by:** orderManagement.py, priority.py

---

#### **orders** (คำสั่งซื้อ)
```prisma
- id, order_number, customer_id
- order_date, delivery_date
- delivery_window_start, delivery_window_end
- customer_priority, order_status
- delivery_address, delivery_latitude, delivery_longitude
- subtotal, tax, shipping_fee, total_amount
- priority_score, priority_class, priority_rank
- priority_breakdown (JSON)
- estimated_delivery, actual_delivery, delay_minutes
```
**Used by:** orderManagement.py, priority.py, batchPriorityProcessing.py, riderAssignment.py, deliveryCompletion.py

---

#### **order_items** (รายการสินค้าในออเดอร์)
```prisma
- id, order_id, product_id
- quantity, unit_price, subtotal
- expiration_datetime
- temperature_zone
```
**Used by:** orderManagement.py, priority.py

---

#### **drivers** (คนขับ/Riders)
```prisma
- id, employee_id, first_name, last_name
- phone, email, license_number, license_type
- status: "active" | "busy" | "offline" | "inactive"
- rating, total_deliveries, on_time_rate
- current_vehicle_id
```
**Used by:** riderAvailability.py, riderAssignment.py, realtimeTracking.py, deliveryCompletion.py

---

#### **vehicles** (รถ)
```prisma
- id, vehicle_number, vehicle_type, license_plate
- temperature_zones (JSON)
- capacity_weight_kg, capacity_volume_m3
- fuel_type, fuel_efficiency
- current_status: "available" | "in_use" | "maintenance"
```
**Used by:** riderAssignment.py, realtimeTracking.py

---

#### **routes** (เส้นทางการจัดส่ง)
```prisma
- id, route_number, origin_store_id
- driver_id, vehicle_id
- route_date, route_status
- total_distance_km, total_duration_min, total_orders
- optimization_score
- route_polyline, route_geometry (JSON)
- traffic_condition
- started_at, completed_at
```
**Used by:** riderAssignment.py, routeNavigation.py, realtimeTracking.py, deliveryCompletion.py

---

#### **route_stops** (จุดหยุดในเส้นทาง)
```prisma
- id, route_id, stop_order
- order_id, stop_type
- address, latitude, longitude
- estimated_arrival, actual_arrival
- estimated_duration, actual_duration
- distance_from_prev
- status: "pending" | "in_progress" | "completed" | "skipped"
```
**Used by:** riderAssignment.py, routeNavigation.py, realtimeTracking.py, deliveryCompletion.py

---

#### **deliveries** (การจัดส่ง)
```prisma
- id, delivery_number, order_id, driver_id, vehicle_id, route_id
- delivery_status: "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed"
- pickup_location, pickup_latitude, pickup_longitude, pickup_time
- delivery_location, delivery_latitude, delivery_longitude, delivery_time
- estimated_distance_km, actual_distance_km
- estimated_duration_min, actual_duration_min
- planned_arrival, actual_arrival, delay_minutes
- failure_reason, notes
```
**Used by:** riderAssignment.py, realtimeTracking.py, deliveryCompletion.py

---

#### **gps_trackings** (GPS Tracking)
```prisma
- id, driver_id, vehicle_id
- latitude, longitude, altitude
- accuracy, speed, heading
- battery_level, is_moving
- timestamp, recorded_date
```
**Used by:** riderAvailability.py, routeNavigation.py, realtimeTracking.py (INSERT), deliveryCompletion.py

---

#### **weather_data** (ข้อมูลสภาพอากาศ)
```prisma
- id, station_id, district, city
- latitude, longitude
- temperature, humidity, rainfall, wind_speed
- condition: "ท้องฟ้าแจ่มใส" | "ฝนตก..." | ...
- visibility, timestamp, forecast_date
```
**Used by:** 7-11_weather.py (INSERT), etaCalculation.py (SELECT)

---

#### **traffic_data** (ข้อมูลการจราจร)
```prisma
- id
- start_latitude, start_longitude
- end_latitude, end_longitude
- route_polyline
- traffic_condition: "light" | "moderate" | "heavy" | "severe"
- travel_time_sec, static_time_sec, delay_sec
- traffic_speed_kmh
- data_source, confidence_score
- timestamp, expires_at
```
**Used by:** Realtime-Traffic.py (INSERT), etaCalculation.py (SELECT)

---

#### **delivery_histories** (ประวัติการส่ง - สำหรับ AI Training)
```prisma
- id
- delivery_date, day_of_week, hour_of_day
- origin_latitude, origin_longitude
- dest_latitude, dest_longitude
- district, city
- distance_km, duration_min
- order_count, total_value
- priority_avg
- traffic_condition, weather_condition, temperature
- on_time, delay_minutes, success_rate
- vehicle_type, driver_rating
```
**Used by:** deliveryCompletion.py (INSERT), AI Training Pipeline

---

#### **performance_metrics** (Performance Metrics)
```prisma
- id, metric_type, metric_date
- entity_id, entity_type (driver, vehicle, route, store)
- total_deliveries, successful, failed
- on_time, delayed, avg_delay_min
- avg_distance_km, avg_duration_min
- avg_priority_score
- total_distance_km, total_revenue, total_fuel_used
```
**Used by:** deliveryCompletion.py (UPDATE), Admin Dashboard

---

#### **priority_calculation_logs** (Priority Calculation Logs)
```prisma
- id, order_id
- input_data (JSON), priority_score, priority_class
- breakdown (JSON)
- temperature_score, expiration_score, customer_score
- value_score, time_window_score, fragility_score
- config_used, calculated_at
```
**Used by:** priority.py (INSERT), Analytics

---

## 🌐 API Endpoints

### **Customer APIs**

```
POST   /api/stores/nearby           → findNearby7.py
POST   /api/stores/route            → coreRouteOptimize.py
POST   /api/orders                  → orderManagement.py
GET    /api/orders/{order_id}       → Database Query
GET    /api/orders/{order_id}/eta   → etaCalculation.py
GET    /api/orders/{order_id}/track → realtimeTracking.py
POST   /api/feedback                → Database Update
```

### **Admin APIs**

```
GET    /api/admin/orders/pending           → Database Query
POST   /api/admin/orders/batch-priority    → batchPriorityProcessing.py
GET    /api/admin/riders/available         → riderAvailability.py
POST   /api/admin/assignments               → riderAssignment.py
GET    /api/admin/analytics                → Database Query (performance_metrics)
GET    /api/admin/routes/{route_id}        → Database Query
```

### **Rider APIs**

```
GET    /api/rider/route/{route_id}/navigation  → routeNavigation.py
POST   /api/rider/gps                          → realtimeTracking.py
POST   /api/rider/delivery/pickup              → Database Update
POST   /api/rider/delivery/complete            → deliveryCompletion.py
GET    /api/rider/deliveries/active            → Database Query
```

---

## 📡 Real-time Communication

### **WebSocket / Server-Sent Events**

#### **Customer Channels**
```
ws://api.deliverygenie.com/customer/{customer_id}
```
**Events:**
- `order.created` - Order ถูกสร้าง
- `order.assigned` - Rider ถูก Assign
- `rider.location` - GPS Location อัปเดต (ทุก 15 วินาที)
- `rider.near` - Rider ใกล้ถึง (<500m)
- `delivery.completed` - ส่งสำเร็จ

#### **Rider Channels**
```
ws://api.deliverygenie.com/rider/{rider_id}
```
**Events:**
- `assignment.new` - ได้รับ Assignment ใหม่
- `route.updated` - เส้นทางมีการเปลี่ยนแปลง
- `navigation.update` - คำสั่งนำทางอัปเดต
- `delivery.urgent` - Order ด่วนถูกเพิ่ม

#### **Admin Channels**
```
ws://api.deliverygenie.com/admin
```
**Events:**
- `order.new` - Order ใหม่เข้ามา
- `rider.available` - Rider ว่าง
- `delivery.delayed` - การส่งล่าช้า
- `alert.critical` - แจ้งเตือนสำคัญ

---

## 📊 Data Flow Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER JOURNEY                              │
└─────────────────────────────────────────────────────────────────────┘

1. Store Discovery
   Customer → findNearby7.py → coreRouteOptimize.py → Display Stores

2. Order Creation
   Customer → orderManagement.py → priority.py → etaCalculation.py
   ↓
   Database: orders, order_items, store_inventories
   ↓
   Notification: Admin Dashboard

3. Order Processing
   Admin → batchPriorityProcessing.py → Sorted Orders
   ↓
   Admin → riderAvailability.py → Available Riders
   ↓
   Admin → riderAssignment.py → MultistopDelivery.py
   ↓
   Database: routes, route_stops, deliveries
   ↓
   Notification: Rider App

4. Delivery Execution
   Rider → routeNavigation.py → Turn-by-turn
   ↓
   Rider → realtimeTracking.py (every 15s) → GPS Updates
   ↓
   Database: gps_trackings
   ↓
   WebSocket: Customer sees live location

5. Delivery Completion
   Rider → deliveryCompletion.py
   ↓
   Database: deliveries, orders, routes, delivery_histories
   ↓
   S3/DynamoDB: Training Data
   ↓
   Notification: Customer (request feedback)

6. Customer Feedback
   Customer → POST /api/feedback
   ↓
   Database: deliveries, drivers (update rating)

┌─────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND PROCESSES                              │
└─────────────────────────────────────────────────────────────────────┘

Every 10-15 minutes:
   7-11_weather.py → weather_data (forecast)

Every 2-5 minutes:
   Realtime-Traffic.py → traffic_data (cache)

Daily:
   AI Training Pipeline → delivery_histories → Optimized Route Models
```

---

## 🎯 Key Data Flow Principles

### 1. **Priority-First Design**
- Priority คำนวณตอนสร้าง Order
- ใช้สินค้าที่มี Priority สูงสุดเป็นตัวแทน Order
- Rider Assignment คำนึงถึง Priority + Distance

### 2. **Real-time Updates**
- GPS Tracking ทุก 10-15 วินาที
- ETA อัปเดตตาม Traffic + Weather
- WebSocket สำหรับ Live Communication

### 3. **Data for AI**
- บันทึก delivery_histories ทุก Delivery
- เก็บ Actual Route (GeoJSON) ไป S3
- Training Data รวม: route, traffic, weather, priority, on_time

### 4. **Scalability**
- Lambda Functions แบบ Serverless
- Database Indexing (lat/lon, timestamp, status)
- Caching (traffic_data, weather_data)

### 5. **Resilience**
- Fallback: Haversine → OSRM
- Validation ทุก Input
- Error Logging (system_logs)

---

## 📝 Notes

- **DATABASE_URL** ต้องตั้งค่าใน Environment Variables
- **ROUTING_API_URL** คือ coreRouteOptimize.py Lambda URL
- **TMD_ACCESS_TOKEN** สำหรับ Weather API
- **OSRM_API_URL** หรือ Google Maps API สำหรับ Navigation

---

**Last Updated:** 2025-11-22
**Version:** 1.0
**Author:** DeliveryGenie Team
