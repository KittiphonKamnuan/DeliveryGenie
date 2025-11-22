# AWS Lambda Test Events

## วิธีใช้ Test Events ใน AWS Lambda Console

### 📁 ไฟล์ Test Events

แต่ละ Lambda มี 2 รูปแบบ:
1. **`X_name.json`** - สำหรับทดสอบผ่าน API Gateway (มี `body` wrapper)
2. **`X_name_direct.json`** - สำหรับทดสอบใน Lambda Console โดยตรง (ไม่มี wrapper)

---

## 🔧 วิธีใช้ใน AWS Lambda Console

### 1. เข้า AWS Lambda Console
```
AWS Console → Lambda → Functions → เลือก Function ที่ต้องการทดสอบ
```

### 2. สร้าง Test Event
1. คลิกปุ่ม **"Test"** ด้านบนขวา
2. เลือก **"Create new event"**
3. ตั้งชื่อ event เช่น `TestSuccess`, `TestError`
4. Copy JSON จากไฟล์ `*_direct.json` ไปวาง
5. คลิก **"Save"**

### 3. รัน Test
- คลิก **"Test"** อีกครั้ง
- ดูผลลัพธ์ใน **Execution results**

---

## 📋 รายละเอียด Test Events แต่ละตัว

### 1. 7-11_weather.py ⏰
**ไฟล์**: `1_7-11_weather.json`

**หมายเหตุ**: Lambda นี้ถูก trigger โดย EventBridge Schedule อัตโนมัติ

**การใช้**:
```json
{
  "source": "aws.events",
  "detail-type": "Scheduled Event"
}
```

**ไม่ต้องส่งข้อมูลอะไร** - Lambda จะดึงข้อมูล stores จาก Database เอง

---

### 2. coreRouteOptimize.py 🗺️
**ไฟล์**:
- `2_coreRouteOptimize.json` (API Gateway)
- `2_coreRouteOptimize_direct.json` (Direct)

**วัตถุประสงค์**: หาเส้นทางที่สั้นที่สุดจาก origin ไปยัง stores หลายแห่ง

**Input**:
```json
{
  "origin": {
    "lat": 13.7563,
    "lon": 100.5018
  },
  "stores": [
    {
      "id": "store_001",
      "name": "7-Eleven Asok",
      "lat": 13.7465,
      "lon": 100.5344
    }
  ]
}
```

**Expected Output**: รายการ stores เรียงตามระยะทางจากใกล้ไปไกล

---

### 3. MultistopDelivery.py 🚚
**ไฟล์**:
- `3_MultistopDelivery.json`
- `3_MultistopDelivery_direct.json`

**วัตถุประสงค์**: คำนวณเส้นทาง multi-stop ที่เหมาะสมที่สุด (TSP)

**Input**:
```json
{
  "origin": {
    "name": "Distribution Center",
    "lat": 13.7563,
    "lon": 100.5018
  },
  "stores": [
    {
      "name": "Customer A",
      "lat": 13.7465,
      "lon": 100.5344,
      "priority": 8,
      "is_urgent": true
    }
  ],
  "use_priority": true
}
```

**Algorithms**:
- ≤10 stops: Brute Force (Optimal)
- >10 stops: Nearest Neighbor + 2-opt

---

### 4. findNearby7.py 🏪
**ไฟล์**:
- `4_findNearby7.json`
- `4_findNearby7_direct.json`

**วัตถุประสงค์**: หา 7-Eleven ใกล้เคียงจาก OSM หรือ Database

**Input**:
```json
{
  "latitude": 13.7563,
  "longitude": 100.5018
}
```

**หรือ**:
```json
{
  "lat": 13.7563,
  "lon": 100.5018
}
```

**Output**: ร้าน 7-Eleven ที่ใกล้ที่สุด พร้อมระยะทางและเวลา

---

### 5. Realtime-Traffic.py 🚦
**ไฟล์**:
- `5_Realtime-Traffic.json`
- `5_Realtime-Traffic_direct.json`

**วัตถุประสงค์**: คำนวณเส้นทางโดยคำนึงถึง traffic

**Input**:
```json
{
  "stores": [
    {
      "name": "Store A",
      "lat": 13.7563,
      "lon": 100.5018
    },
    {
      "name": "Store B",
      "lat": 13.7465,
      "lon": 100.5344
    }
  ],
  "start_index": 0,
  "use_real_api": false
}
```

**Parameters**:
- `start_index`: จุดเริ่มต้น (default: 0)
- `use_real_api`: ใช้ OSM API จริง (default: false)

⚠️ **หมายเหตุ**: ตอนนี้ใช้ mock data อยู่ ต้องแก้ให้ใช้ real traffic API

---

### 6. priority.py ⭐
**ไฟล์**:
- `6_priority.json`
- `6_priority_direct.json`

**วัตถุประสงค์**: คำนวณคะแนน priority สำหรับ order (0-100)

**Input**:
```json
{
  "customer_id": "cust_001",
  "customer_tier": "premium",
  "store_lat": 13.7563,
  "store_lon": 100.5018,
  "customer_lat": 13.7465,
  "customer_lon": 100.5344,
  "products": [
    {
      "product_id": "prod_001",
      "name": "Fresh Milk",
      "quantity": 2,
      "price": 45.0,
      "weight_kg": 1.2,
      "requires_cold_chain": true,
      "shelf_life_hours": 24
    }
  ]
}
```

**Priority Factors** (8 ตัว):
1. Temperature (22%) - ต้องการความเย็น
2. Expiration (18%) - อายุสินค้า
3. Customer Tier (13%) - ระดับลูกค้า
4. Delivery Window (13%) - ช่วงเวลาส่ง
5. Distance (9%) - ระยะทาง
6. Order Value (9%) - มูลค่า
7. **Weight (12%)** - น้ำหนัก (เบากว่า = priority สูง)
8. Fragility (4%) - ความเปราะบาง

---

### 7. orderManagement.py 📦
**ไฟล์**:
- `7_orderManagement.json`
- `7_orderManagement_direct.json`

**วัตถุประสงค์**: สร้าง order ใหม่

**Input**:
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440001",
  "store_id": "550e8400-e29b-41d4-a716-446655440002",
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440010",
      "quantity": 2
    }
  ],
  "delivery_window_start": "2025-11-22T14:00:00",
  "delivery_window_end": "2025-11-22T16:00:00"
}
```

⚠️ **สำคัญ**: ต้องแทน UUIDs ด้วย IDs จริงจาก Database

**Lambda นี้จะเรียก**:
- `priority.py` - คำนวณ priority score
- `etaCalculation.py` - คำนวณ ETA

---

### 8. etaCalculation.py ⏱️
**ไฟล์**:
- `8_etaCalculation.json`
- `8_etaCalculation_direct.json`

**วัตถุประสงค์**: คำนวณ ETA โดยคำนึงถึง weather, traffic, time-of-day

**Input**:
```json
{
  "origin": {
    "lat": 13.7563,
    "lon": 100.5018
  },
  "destination": {
    "lat": 13.7465,
    "lon": 100.5344
  },
  "vehicle_weight_kg": 15.5
}
```

**Factors**:
- ☁️ Weather (rain, wind, temperature)
- 🚦 Traffic conditions
- ⏰ Time of day (rush hour, night)
- 🏋️ Vehicle weight

**APIs ที่ใช้**:
- OSRM (routing)
- OpenWeatherMap (weather)
- Realtime-Traffic Lambda (traffic)

---

### 9. riderAssignment.py 🏍️
**ไฟล์**:
- `9_riderAssignment.json`
- `9_riderAssignment_direct.json`

**วัตถุประสงค์**: มอบหมาย rider ที่เหมาะสมที่สุดให้กับ order

**Input**:
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440100"
}
```

⚠️ **สำคัญ**: order_id ต้องมี status = `pending` ใน Database

**Scoring Algorithm**:
- Distance to store (40%)
- Driver rating (30%)
- Current load (20%)
- Experience (10%)

**Capacity Validation**:
- Weight: `order_weight ≤ (vehicle_capacity - current_load)`
- Volume: `order_volume ≤ (vehicle_capacity - current_load)`
- Max 5 active deliveries per rider

---

### 10. realtimeTracking.py 📍
**ไฟล์**:
- `10_realtimeTracking_single.json` - GPS เดี่ยว
- `10_realtimeTracking_batch.json` - GPS แบบ batch
- `*_direct.json` - รุ่น direct

**วัตถุประสงค์**: บันทึก GPS และส่งไปยัง AWS Kinesis

**Input (Single)**:
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440003",
  "delivery_id": "550e8400-e29b-41d4-a716-446655440200",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 45.5,
  "bearing": 270,
  "accuracy_meters": 10,
  "timestamp": "2025-11-22T10:15:30Z"
}
```

**Input (Batch)**:
```json
{
  "gps_updates": [
    { "driver_id": "...", "lat": 13.7563, "lon": 100.5018 },
    { "driver_id": "...", "lat": 13.7465, "lon": 100.5344 }
  ]
}
```

**AWS Services**:
- Kinesis Data Streams
- Database (gps_trackings table)

---

### 11. routeNavigation.py 🧭
**ไฟล์**:
- `11_routeNavigation.json`
- `11_routeNavigation_direct.json`

**วัตถุประสงค์**: ให้ turn-by-turn navigation

**Input**:
```json
{
  "delivery_id": "550e8400-e29b-41d4-a716-446655440200"
}
```

⚠️ **สำคัญ**: delivery_id ต้องมีอยู่ใน Database

**Output**:
- Turn-by-turn steps
- Distance per step
- Duration per step
- Full route geometry (GeoJSON)

**API ที่ใช้**: OSRM Directions API

---

### 12. deliveryCompletion.py ✅
**ไฟล์**:
- `12_deliveryCompletion.json`
- `12_deliveryCompletion_direct.json`

**วัตถุประสงค์**: บันทึกการส่งสำเร็จและส่งข้อมูลไปยัง S3 สำหรับ ML

**Input**:
```json
{
  "delivery_id": "550e8400-e29b-41d4-a716-446655440200",
  "proof_of_delivery_url": "s3://deliverygenie-proof/2025/11/22/proof_001.jpg",
  "customer_signature": "base64_encoded_signature",
  "customer_rating": 5.0,
  "actual_distance_km": 5.1,
  "was_on_time": true,
  "notes": "Customer was very satisfied"
}
```

⚠️ **สำคัญ**: delivery_id ต้องมี status != `delivered`

**Lambda นี้จะ**:
1. อัปเดต delivery status → `delivered`
2. อัปเดต order status → `delivered`
3. บันทึก delivery_histories
4. ส่ง training data ไป S3
5. อัปเดต driver statistics

**AWS Services**:
- Database
- S3 (ML training data)

---

## 🔍 วิธีหา UUIDs จริงจาก Database

สำหรับ Lambda ที่ต้องใช้ UUIDs (7-12):

```sql
-- หา customer_id
SELECT id, name, email FROM customers WHERE is_active = true LIMIT 5;

-- หา store_id
SELECT id, name, address FROM stores WHERE is_active = true LIMIT 5;

-- หา product_id
SELECT id, name, price FROM products WHERE is_active = true LIMIT 5;

-- หา order_id ที่ pending
SELECT id, customer_id, store_id, status
FROM orders
WHERE status = 'pending'
LIMIT 5;

-- หา delivery_id
SELECT id, order_id, driver_id, status
FROM deliveries
WHERE status IN ('assigned', 'picked_up', 'in_transit')
LIMIT 5;

-- หา driver_id
SELECT id, name, vehicle_id, status
FROM drivers
WHERE is_active = true
LIMIT 5;
```

---

## ⚠️ หมายเหตุสำคัญ

### Lambda ที่ใช้งานได้ทันที (ไม่ต้องมี Database):
- ✅ coreRouteOptimize.py
- ✅ MultistopDelivery.py
- ✅ findNearby7.py (ใช้ OSM)
- ✅ Realtime-Traffic.py (มี fallback)
- ✅ priority.py (คำนวณเอง)
- ✅ etaCalculation.py (มี fallback)

### Lambda ที่ต้องมี Database:
- ⚠️ 7-11_weather.py (ต้องมี stores)
- ⚠️ orderManagement.py (ต้องมี customers, stores, products)
- ⚠️ riderAssignment.py (ต้องมี orders, drivers, vehicles)
- ⚠️ realtimeTracking.py (ต้องมี drivers, deliveries)
- ⚠️ routeNavigation.py (ต้องมี deliveries)
- ⚠️ deliveryCompletion.py (ต้องมี deliveries)

---

## 📊 Performance Expectations

| Lambda | Expected Time | Max Timeout |
|--------|--------------|-------------|
| coreRouteOptimize | 200-500ms | 30s |
| MultistopDelivery | 300-1000ms | 60s |
| priority | 100-200ms | 15s |
| etaCalculation | 300-600ms | 20s |
| riderAssignment | 300-600ms | 30s |
| realtimeTracking | 50-100ms | 15s |
| routeNavigation | 500-1000ms | 30s |
| deliveryCompletion | 200-400ms | 30s |

---

## 🐛 Common Errors

### Error: "Database connection not available"
**สาเหตุ**: `DATABASE_URL` environment variable ไม่ได้ตั้งค่า

**แก้ไข**:
```bash
AWS Lambda → Configuration → Environment variables
DATABASE_URL=postgresql+psycopg2://...
```

### Error: "Customer not found or inactive"
**สาเหตุ**: UUID ไม่มีใน Database

**แก้ไข**: Query database หา UUID ที่มีอยู่จริง

### Error: "Invalid coordinates range"
**สาเหตุ**: lat/lon อยู่นอกช่วง

**แก้ไข**: ตรวจสอบว่า -90 ≤ lat ≤ 90, -180 ≤ lon ≤ 180

---

## 📚 อ้างอิง

- **ตารางสรุป**: `ENV_VARS_BY_LAMBDA.md`
- **Production Checklist**: `PRODUCTION_READINESS_CHECKLIST.md`
- **Lambda Functions Summary**: `LAMBDA_FUNCTIONS_SUMMARY.md`
- **Test Cases**: `TEST_CASES.json`

---

**Created**: 2025-11-22
**Version**: 1.0
**Total Test Events**: 24 files (12 Lambdas × 2 formats)
