# Test IDs for API Testing

## Real Database IDs (from seeded data)

```bash
DRIVER_ID="11fef86d-2900-4152-a48a-0c0e55b532ba"
CUSTOMER_ID="cust_high_value_001"
ORDER_ID="8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"
DELIVERY_ID="d1941658-9514-4310-ba80-47ae9787809d"
```

## Ready-to-Use Test Payloads

### 1. `/tracking` - Realtime GPS Tracking

**With delivery_id** (driver on active delivery):
```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/tracking \
  -H "Content-Type: application/json" \
  -d '{
  "driver_id": "11fef86d-2900-4152-a48a-0c0e55b532ba",
  "delivery_id": "d1941658-9514-4310-ba80-47ae9787809d",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 25.0,
  "bearing": 45.0,
  "accuracy_meters": 5.0
}'
```

**Without delivery_id** (general driver tracking):
```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/tracking \
  -H "Content-Type: application/json" \
  -d '{
  "driver_id": "11fef86d-2900-4152-a48a-0c0e55b532ba",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 25.0
}'
```

### 2. `/assign` - Rider Assignment

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/assign \
  -H "Content-Type: application/json" \
  -d '{
  "order_id": "8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"
}'
```

### 3. `/complete` - Delivery Completion

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/complete \
  -H "Content-Type: application/json" \
  -d '{
  "delivery_id": "d1941658-9514-4310-ba80-47ae9787809d",
  "proof_of_delivery_url": "https://example.com/pod/12345.jpg",
  "notes": "Delivered successfully"
}'
```

### 4. `/priority` - Priority Calculation

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/priority \
  -H "Content-Type: application/json" \
  -d '{
  "order_id": "8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"
}'
```

### 5. `/route` - Route Calculation

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/route \
  -H "Content-Type: application/json" \
  -d '{
  "origin": {
    "lat": 13.7563,
    "lon": 100.5018
  },
  "destination": {
    "lat": 13.7270,
    "lon": 100.5240
  },
  "vehicle_type": "motorcycle"
}'
```

### 6. `/multistop` - Multi-Stop Routing

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/multistop \
  -H "Content-Type: application/json" \
  -d '{
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
}'
```

### 7. `/eta` - ETA Calculation ✅ (Already Working)

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/eta \
  -H "Content-Type: application/json" \
  -d '{
  "driver_lat": 13.7563,
  "driver_lon": 100.5018,
  "destination_lat": 13.7270,
  "destination_lon": 100.5240,
  "vehicle_type": "motorcycle"
}'
```

### 8. `/traffic` - Traffic Data ✅ (Already Working)

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/traffic \
  -H "Content-Type: application/json" \
  -d '{
  "origin_lat": 13.7563,
  "origin_lon": 100.5018,
  "dest_lat": 13.7270,
  "dest_lon": 100.5240
}'
```

### 9. `/nearby7` - Find Nearby 7-Eleven ✅ (Already Working)

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/nearby7 \
  -H "Content-Type: application/json" \
  -d '{
  "lat": 13.7563,
  "lon": 100.5018,
  "limit": 5
}'
```

### 10. `/navigation` - Turn-by-Turn Navigation ✅ (Already Working)

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/navigation \
  -H "Content-Type: application/json" \
  -d '{
  "origin_lat": 13.7563,
  "origin_lon": 100.5018,
  "dest_lat": 13.7270,
  "dest_lon": 100.5240,
  "vehicle_type": "motorcycle"
}'
```

---

## Quick Test Script

Create `test_all_endpoints.sh`:

```bash
#!/bin/bash

API_BASE="https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod"
DRIVER_ID="11fef86d-2900-4152-a48a-0c0e55b532ba"
DELIVERY_ID="d1941658-9514-4310-ba80-47ae9787809d"
ORDER_ID="8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"

echo "Testing /tracking..."
curl -X POST $API_BASE/tracking -H "Content-Type: application/json" -d "{\"driver_id\":\"$DRIVER_ID\",\"lat\":13.7563,\"lon\":100.5018,\"speed_kmh\":25.0}"

echo -e "\n\nTesting /assign..."
curl -X POST $API_BASE/assign -H "Content-Type: application/json" -d "{\"order_id\":\"$ORDER_ID\"}"

echo -e "\n\nTesting /priority..."
curl -X POST $API_BASE/priority -H "Content-Type: application/json" -d "{\"order_id\":\"$ORDER_ID\"}"

echo -e "\n\nTesting /eta..."
curl -X POST $API_BASE/eta -H "Content-Type: application/json" -d '{"driver_lat":13.7563,"driver_lon":100.5018,"destination_lat":13.7270,"destination_lon":100.5240,"vehicle_type":"motorcycle"}'

echo -e "\n\nDone!"
```

---

## Database Seed Summary

The database has been seeded with:
- ✅ 12 Products (hot food, frozen, beverages, etc.)
- ✅ 5 Stores (7-Eleven locations in Bangkok)
- ✅ 3 Drivers
- ✅ 3 Vehicles
- ✅ 3 Customers
- ✅ 5 Sample Orders (pending status)
- ✅ 5 Sample Deliveries (in-transit status)
- ✅ 2 Priority Configs

All data is ready for API testing!
