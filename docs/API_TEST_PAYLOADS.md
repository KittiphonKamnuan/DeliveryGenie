# API Test Payloads

This document provides valid test payloads for all DeliveryGenie API endpoints.

## Getting Real Database IDs

Before testing, you need to get actual IDs from your database. Run these queries:

```sql
-- Get driver IDs and their vehicles
SELECT d.id as driver_id, d.first_name, d.last_name, d.current_vehicle_id, v.license_plate
FROM drivers d
LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
LIMIT 5;

-- Get customer IDs
SELECT id, name, latitude, longitude FROM customers LIMIT 5;

-- Get order IDs
SELECT id, order_number, customer_id, order_status FROM orders LIMIT 5;

-- Get delivery IDs
SELECT d.id, d.delivery_number, d.driver_id, d.order_id, d.delivery_status
FROM deliveries d
LIMIT 5;

-- Get store IDs
SELECT id, name, latitude, longitude FROM stores LIMIT 5;
```

## Test Payloads by Endpoint

### 1. `/tracking` - Realtime GPS Tracking

**Status**: ✅ Working (after fixes)

**Valid Payload (with delivery_id)**:
```json
{
  "driver_id": "<ACTUAL_DRIVER_ID>",
  "delivery_id": "<ACTUAL_DELIVERY_ID>",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 25.0,
  "bearing": 45.0,
  "accuracy_meters": 5.0,
  "altitude": 10.0,
  "battery_level": 85,
  "is_moving": true,
  "timestamp": "2025-11-22T10:30:00Z"
}
```

**Valid Payload (without delivery_id - general driver tracking)**:
```json
{
  "driver_id": "<ACTUAL_DRIVER_ID>",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 25.0,
  "bearing": 45.0,
  "accuracy_meters": 5.0
}
```

**Error if you use**: `driver-001` → This is not a real ID in the database

---

### 2. `/assign` - Rider Assignment

**Status**: ⚠️ 400 (Requires valid order_id)

**Valid Payload**:
```json
{
  "order_id": "<ACTUAL_ORDER_ID>"
}
```

**SQL to get pending orders**:
```sql
SELECT id, order_number, customer_id, total_amount, order_status
FROM orders
WHERE order_status = 'pending'
LIMIT 5;
```

---

### 3. `/complete` - Delivery Completion

**Status**: ⚠️ 400 (Requires valid delivery_id)

**Valid Payload**:
```json
{
  "delivery_id": "<ACTUAL_DELIVERY_ID>",
  "proof_of_delivery_url": "https://example.com/pod/12345.jpg",
  "notes": "Delivered successfully to customer"
}
```

**SQL to get in-transit deliveries**:
```sql
SELECT id, delivery_number, driver_id, order_id, delivery_status
FROM deliveries
WHERE delivery_status = 'in_transit'
LIMIT 5;
```

---

### 4. `/route` - Route Calculation

**Status**: ⚠️ 400 (Check payload format)

**Valid Payload**:
```json
{
  "origin": {
    "lat": 13.7563,
    "lon": 100.5018
  },
  "destination": {
    "lat": 13.7270,
    "lon": 100.5240
  },
  "vehicle_type": "motorcycle"
}
```

---

### 5. `/multistop` - Multi-Stop Route Optimization

**Status**: ⚠️ 400 (Check payload format)

**Valid Payload**:
```json
{
  "origin": {
    "lat": 13.7563,
    "lon": 100.5018
  },
  "stops": [
    {
      "lat": 13.7270,
      "lon": 100.5240,
      "stop_id": "STOP001",
      "priority": 1
    },
    {
      "lat": 13.7463,
      "lon": 100.5342,
      "stop_id": "STOP002",
      "priority": 2
    }
  ],
  "vehicle_type": "motorcycle"
}
```

---

### 6. `/priority` - Priority Calculation

**Status**: ⚠️ 400 (Requires valid order_id)

**Valid Payload**:
```json
{
  "order_id": "<ACTUAL_ORDER_ID>"
}
```

---

### 7. `/order` - Order Management

**Status**: ⚠️ 400 (Check payload format)

**Valid Payload for Creating Order**:
```json
{
  "customer_id": "<ACTUAL_CUSTOMER_ID>",
  "items": [
    {
      "product_id": "<ACTUAL_PRODUCT_ID>",
      "quantity": 2
    }
  ],
  "delivery_address": {
    "latitude": 13.7563,
    "longitude": 100.5018,
    "address": "123 Sukhumvit Rd, Bangkok"
  }
}
```

---

### 8. `/eta` - ETA Calculation

**Status**: ✅ 200 OK

**Valid Payload**:
```json
{
  "driver_lat": 13.7563,
  "driver_lon": 100.5018,
  "destination_lat": 13.7270,
  "destination_lon": 100.5240,
  "vehicle_type": "motorcycle"
}
```

---

### 9. `/traffic` - Traffic Data

**Status**: ✅ 200 OK

**Valid Payload**:
```json
{
  "origin_lat": 13.7563,
  "origin_lon": 100.5018,
  "dest_lat": 13.7270,
  "dest_lon": 100.5240
}
```

---

### 10. `/nearby7` - Find Nearby 7-Eleven Stores

**Status**: ✅ 200 OK

**Valid Payload**:
```json
{
  "lat": 13.7563,
  "lon": 100.5018,
  "limit": 5
}
```

---

### 11. `/navigation` - Turn-by-Turn Navigation

**Status**: ✅ 200 OK

**Valid Payload**:
```json
{
  "origin_lat": 13.7563,
  "origin_lon": 100.5018,
  "dest_lat": 13.7270,
  "dest_lon": 100.5240,
  "vehicle_type": "motorcycle"
}
```

---

### 12. `/weather` - Weather Data Collection

**Status**: ❓ 504 Timeout

**Issue**: TMD API connection timeout and Lambda timeout (30s)

**Payload**: This is an internal scheduled function, not meant for external testing

**Fixes Needed**:
1. Increase Lambda timeout to 300s (5 min)
2. Increase memory to 256 MB
3. Consider alternative weather API if TMD continues to timeout

```bash
aws lambda update-function-configuration \
    --function-name 7-11_weather \
    --timeout 300 \
    --memory-size 256 \
    --region ap-southeast-1
```

---

## Summary of Fixes Applied

### ✅ Fixed Lambdas:
1. **realtimeTracking.py** - Fixed GPS table column mappings, made delivery_id optional
2. **riderAssignment.py** - Fixed SQL queries to calculate missing fields
3. **deliveryCompletion.py** - Fixed column name mappings

### ⏳ Pending Fixes:
1. **7-11_weather.py** - Increase timeout and investigate TMD API issues
2. **Test with real database IDs** - Need to populate database first or get existing IDs

---

## How to Test

### Step 1: Get Real Database IDs

Run this SQL to create a quick reference:

```sql
-- Create a test reference table
SELECT
  'DRIVER_ID: ' || (SELECT id FROM drivers LIMIT 1) as driver,
  'VEHICLE_ID: ' || (SELECT id FROM vehicles LIMIT 1) as vehicle,
  'CUSTOMER_ID: ' || (SELECT id FROM customers LIMIT 1) as customer,
  'ORDER_ID: ' || (SELECT id FROM orders WHERE order_status = 'pending' LIMIT 1) as "order",
  'DELIVERY_ID: ' || (SELECT id FROM deliveries WHERE delivery_status = 'in_transit' LIMIT 1) as delivery;
```

### Step 2: Replace Placeholders

Replace all `<ACTUAL_*_ID>` placeholders in the payloads above with real IDs from Step 1.

### Step 3: Test Endpoints

```bash
# Example: Test tracking endpoint
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "YOUR_REAL_DRIVER_ID",
    "lat": 13.7563,
    "lon": 100.5018,
    "speed_kmh": 25.0
  }'
```

---

## Database Seeding Issue

The `prisma/seed.ts` file has model name mismatches:
- Schema uses: `users`, `drivers`, `vehicles`, `stores` (plural lowercase)
- Seed uses: `user`, `driver`, `vehicle`, `store` (singular lowercase)

This needs to be fixed for seeding to work.
