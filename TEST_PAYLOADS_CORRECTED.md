# Corrected API Test Payloads

**Updated**: 2025-11-22
**Status**: Ready for testing after Lambda re-upload

---

## Real Database IDs

```bash
DRIVER_ID="11fef86d-2900-4152-a48a-0c0e55b532ba"
VEHICLE_ID="VEH_MOTO_001"
CUSTOMER_ID="cust_high_value_001"
ORDER_ID="8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"
DELIVERY_ID="d1941658-9514-4310-ba80-47ae9787809d"
```

---

## ✅ Working Endpoints (No Changes Needed)

### 1. `/nearby7` - Find Nearby 7-Eleven
```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/nearby7 \
  -H "Content-Type: application/json" \
  -d '{
  "lat": 13.7563,
  "lon": 100.5018,
  "limit": 5
}'
```

### 2. `/navigation` - Turn-by-Turn Navigation
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

## 🔧 Fixed Endpoints (After Re-Upload)

### 3. `/tracking` - Realtime GPS Tracking
**Status**: ✅ Code fixed - needs re-upload

**With delivery_id**:
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

**Without delivery_id** (general tracking):
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

### 4. `/assign` - Rider Assignment
**Status**: ✅ Code fixed - needs re-upload

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/assign \
  -H "Content-Type: application/json" \
  -d '{
  "order_id": "8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"
}'
```

### 5. `/complete` - Delivery Completion
**Status**: ✅ Code fixed - needs re-upload

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/complete \
  -H "Content-Type: application/json" \
  -d '{
  "delivery_id": "d1941658-9514-4310-ba80-47ae9787809d",
  "notes": "Delivered successfully to customer"
}'
```

---

## ⚠️ Corrected Payload Format

### 6. `/priority` - Priority Calculation
**Status**: ⚠️ Needs `start_location` parameter

**OLD (400 Error)**:
```json
{
  "order_id": "8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"
}
```

**NEW (Corrected)**:
```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/priority \
  -H "Content-Type: application/json" \
  -d '{
  "order_id": "8432b4b4-d7e7-4f6b-94c6-e7e0b2403612",
  "start_location": {
    "lat": 13.7563,
    "lon": 100.5018
  }
}'
```

### 7. `/eta` - ETA Calculation
**Status**: ⚠️ Needs `origin`/`destination` objects

**OLD (400 Error)**:
```json
{
  "driver_lat": 13.7563,
  "driver_lon": 100.5018,
  "destination_lat": 13.7270,
  "destination_lon": 100.5240
}
```

**NEW (Corrected)**:
```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/eta \
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

### 8. `/route` - Route Calculation
**Status**: ⚠️ Needs `stores` list

**OLD (400 Error)**:
```json
{
  "origin": {"lat": 13.7563, "lon": 100.5018},
  "destination": {"lat": 13.7270, "lon": 100.5240}
}
```

**NEW (Corrected)** - Get store IDs first:
```bash
# First, get store IDs from database
cat > get_stores.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getStores() {
  const stores = await prisma.stores.findMany({ take: 3 });
  console.log(JSON.stringify(stores.map(s => ({
    store_id: s.id,
    lat: s.latitude,
    lon: s.longitude,
    name: s.name
  })), null, 2));
  await prisma.$disconnect();
}
getStores();
EOF

npx tsx get_stores.ts
```

Then use:
```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/route \
  -H "Content-Type: application/json" \
  -d '{
  "stores": [
    {
      "store_id": "STORE_7_11_001",
      "lat": 13.7563,
      "lon": 100.5018
    },
    {
      "store_id": "STORE_7_11_002",
      "lat": 13.7270,
      "lon": 100.5240
    }
  ],
  "vehicle_type": "motorcycle"
}'
```

### 9. `/multistop` - Multi-Stop Route Optimization
**Status**: ⚠️ Needs `stores` list

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/multistop \
  -H "Content-Type: application/json" \
  -d '{
  "stores": [
    {
      "store_id": "STORE_7_11_001",
      "lat": 13.7563,
      "lon": 100.5018,
      "priority": 1
    },
    {
      "store_id": "STORE_7_11_002",
      "lat": 13.7270,
      "lon": 100.5240,
      "priority": 2
    },
    {
      "store_id": "STORE_7_11_003",
      "lat": 13.7463,
      "lon": 100.5342,
      "priority": 3
    }
  ],
  "vehicle_type": "motorcycle"
}'
```

### 10. `/traffic` - Traffic Data
**Status**: ⚠️ Needs `stores` list

```bash
curl -X POST https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/traffic \
  -H "Content-Type: application/json" \
  -d '{
  "stores": [
    {
      "store_id": "STORE_7_11_001",
      "lat": 13.7563,
      "lon": 100.5018
    },
    {
      "store_id": "STORE_7_11_002",
      "lat": 13.7270,
      "lon": 100.5240
    }
  ]
}'
```

---

## 🔄 Quick Test Script (All Endpoints)

Create `test_all_corrected.sh`:

```bash
#!/bin/bash

API_BASE="https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod"
DRIVER_ID="11fef86d-2900-4152-a48a-0c0e55b532ba"
DELIVERY_ID="d1941658-9514-4310-ba80-47ae9787809d"
ORDER_ID="8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"

echo "========================================="
echo "Testing DeliveryGenie API - Corrected"
echo "========================================="

echo -e "\n1. Testing /nearby7 (Working)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/nearby7 \
  -H "Content-Type: application/json" \
  -d '{"lat":13.7563,"lon":100.5018,"limit":5}' | head -c 100
echo ""

echo -e "\n2. Testing /navigation (Working)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/navigation \
  -H "Content-Type: application/json" \
  -d '{"origin_lat":13.7563,"origin_lon":100.5018,"dest_lat":13.7270,"dest_lon":100.5240,"vehicle_type":"motorcycle"}' | head -c 100
echo ""

echo -e "\n3. Testing /tracking (Fixed - needs upload)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/tracking \
  -H "Content-Type: application/json" \
  -d "{\"driver_id\":\"$DRIVER_ID\",\"lat\":13.7563,\"lon\":100.5018,\"speed_kmh\":25.0}" | head -c 100
echo ""

echo -e "\n4. Testing /assign (Fixed - needs upload)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/assign \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$ORDER_ID\"}" | head -c 100
echo ""

echo -e "\n5. Testing /complete (Fixed - needs upload)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/complete \
  -H "Content-Type: application/json" \
  -d "{\"delivery_id\":\"$DELIVERY_ID\",\"notes\":\"Test\"}" | head -c 100
echo ""

echo -e "\n6. Testing /priority (Corrected payload)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/priority \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$ORDER_ID\",\"start_location\":{\"lat\":13.7563,\"lon\":100.5018}}" | head -c 100
echo ""

echo -e "\n7. Testing /eta (Corrected payload)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/eta \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":13.7563,"lon":100.5018},"destination":{"lat":13.7270,"lon":100.5240},"vehicle_type":"motorcycle"}' | head -c 100
echo ""

echo -e "\n8. Testing /route (Corrected payload)..."
curl -s -w " [%{http_code}]" -X POST $API_BASE/route \
  -H "Content-Type: application/json" \
  -d '{"stores":[{"store_id":"STORE_7_11_001","lat":13.7563,"lon":100.5018}],"vehicle_type":"motorcycle"}' | head -c 100
echo ""

echo -e "\n========================================="
echo "✅ Testing Complete!"
echo "========================================="
```

Make it executable:
```bash
chmod +x test_all_corrected.sh
./test_all_corrected.sh
```

---

## 📋 Files Ready for Upload

### Lambda Functions (3 files fixed):
1. ✅ `realtimeTracking.py` - Fixed column names and foreign key issues
2. ✅ `riderAssignment.py` - Added None checks for float conversions
3. ✅ `deliveryCompletion.py` - Fixed delivery_status and delivery_histories schema

### Upload Commands:
```bash
# Zip each file
cd lambda/

# 1. Tracking
zip realtimeTracking.zip realtimeTracking.py
aws lambda update-function-code \
  --function-name realtimeTracking \
  --zip-file fileb://realtimeTracking.zip \
  --region ap-southeast-1

# 2. Assignment
zip riderAssignment.zip riderAssignment.py
aws lambda update-function-code \
  --function-name riderAssignment \
  --zip-file fileb://riderAssignment.zip \
  --region ap-southeast-1

# 3. Completion
zip deliveryCompletion.zip deliveryCompletion.py
aws lambda update-function-code \
  --function-name deliveryCompletion \
  --zip-file fileb://deliveryCompletion.zip \
  --region ap-southeast-1
```

---

## ⏰ After Upload - Test Order

1. **Test fixed endpoints first**:
   - `/tracking`
   - `/assign`
   - `/complete`

2. **Test corrected payloads**:
   - `/priority`
   - `/eta`
   - `/route`
   - `/multistop`
   - `/traffic`

3. **Verify working endpoints still work**:
   - `/nearby7`
   - `/navigation`

---

## 📊 Expected Results After Fixes

| Endpoint | Before | After Upload | Notes |
|----------|--------|--------------|-------|
| `/nearby7` | ✅ 200 | ✅ 200 | No changes |
| `/navigation` | ✅ 200 | ✅ 200 | No changes |
| `/tracking` | ❌ 500 | ✅ 200 | Fixed columns |
| `/assign` | ❌ 500 | ✅ 200 | Fixed None handling |
| `/complete` | ❌ 500 | ✅ 200 | Fixed schema |
| `/priority` | ❌ 400 | ✅ 200 | Corrected payload |
| `/eta` | ❌ 400 | ✅ 200 | Corrected payload |
| `/route` | ❌ 400 | ✅ 200 | Corrected payload |
| `/multistop` | ❌ 400 | ✅ 200 | Corrected payload |
| `/traffic` | ❌ 500 | ✅ 200 | Corrected payload |

**Target**: 10/10 endpoints working (100%)
