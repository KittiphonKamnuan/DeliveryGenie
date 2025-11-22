# DeliveryGenie: AI-based Route Optimization for Last-Mile Delivery

## 📋 ข้อมูลโครงการ

**ชื่อโครงการ:** DeliveryGenie - AI-based Route Optimization for Last-Mile Delivery  
**รายวิชา:** CS341 Big Data Engineering  
**ปีการศึกษา:** 2568  
**Repository:** [https://github.com/KittiphonKamnuan/DeliveryGenie](https://github.com/KittiphonKamnuan/DeliveryGenie)

### 👥 สมาชิกในทีม (4 คน)

| ชื่อ | รหัสนักศึกษา | GitHub | บทบาท |
|------|--------------|--------|--------|
| กิตติธัช เด่นสกุลประเสริฐ | 6609650079 | [@Kittithatdensakulprasert] | Backend Developer |
| กิตติภณ คำนวล | 6609650186 | [@KittiphonKamnuan] | Project Manager |
| พชร พรพงศ์ | 6609650509 | [@Phachara6609650509] | Frontend Developer |
| จุติณัฏฐ์ รัตนะมงคลกุล | 6609650228 | [@Jutinut-BBBOMB] | Data Engineer |

---

## 🎯 Problem Statement

### วิกฤต Last-Mile Delivery ในปัจจุบัน

Last-mile delivery ในกรุงเทพมหานครและปริมณฑลประสบปัญหาด้านประสิทธิภาพอย่างรุนแรง โดยเฉพาะในพื้นที่ที่มีการจราจรหนาแน่น ส่งผลกระทบต่อเศรษฐกิจและความพึงพอใจของลูกค้าอย่างมีนัยสำคัญ

### 📊 สถิติที่น่าสนใจ

#### ต้นทุน Last-Mile Delivery ระดับโลก
- **53%** ของต้นทุนการจัดส่งทั้งหมด (เพิ่มขึ้นจาก 41% ในปี 2018)
- **30%** ของต้นทุน e-commerce orders ทั้งหมด

#### ช่องว่างประสิทธิภาพโลจิสติกส์ของไทย
- ต้นทุนโลจิสติกส์ของไทย: **13.7% ของ GDP**
- ค่าเฉลี่ยโลก: **10.8% ของ GDP**
- แสดงโอกาสในการประหยัดต้นทุนอย่างมีนัยสำคัญ

#### วิกฤตการจราจรในกรุงเทพฯ
- **อันดับ 4** ของเมืองที่มีการจราจรติดขัดมากที่สุดในโลก
- Traffic Congestion Index: **40.63**
- สูญเสียน้ำมัน: **97 ล้านบาทต่อวัน**
- ต้นทุนการจราจรติดขัดต่อรถยนต์: **77,021-76,155 บาทต่อปี**

#### ข้อจำกัดด้านโครงสร้างพื้นฐาน
- รถจดทะเบียนสะสมในกรุงเทพฯ: **11,910,000+ คัน** (ณ 30 ก.ย. 2566)
- พื้นที่ผิวถนน: เพียง **8%** (เทียบกับ 20-30% ในเมืองตะวันตก)

---

## 🎯 วัตถุประสงค์โครงการ

### วัตถุประสงค์ทางธุรกิจ (เชิงปริมาณ)

1. **ลดเวลาจัดส่งเฉลี่ย** - ผ่านการเลือกเส้นทางที่เหมาะสมต่อออเดอร์
2. **ลดค่าใช้จ่ายน้ำมัน** - ผ่านการเลือกเส้นทางที่เหมาะสมและการลดระยะทางรวม
3. **เพิ่มความพึงพอใจลูกค้า** - ผ่านการจัดส่งที่ตรงเวลา

### ผลกระทบทางธุรกิจ

- ✅ **เสริมสร้างภาพลักษณ์** - ในการให้บริการที่รวดเร็วและเชื่อถือได้
- ✅ **เพิ่มรายได้** - จากการจัดส่งที่รวดเร็วทำให้ลูกค้าสั่งมากขึ้น
- ✅ **ลดต้นทุนสูง** - ค่าน้ำมัน และบุคลากร
- ✅ **ลดการปล่อยมลพิษ** - จากการใช้น้ำมันที่มีประสิทธิภาพ
- ✅ **ลดปัญหาการดำเนินงาน** - นับจำนวนสินค้าแม่นยำ

---

## 📊 Data Sources & 5Vs Analysis

### แหล่งข้อมูลหลัก

#### 1. ระบบจัดการคำสั่งซื้อ (Structured Data)
- **ฐานข้อมูล:** PostgreSQL (AWS RDS)
- **ข้อมูล:** order_id, customer_address, delivery_time_window, package_details, priority_level
- **ความถี่:** Real-time

#### 2. ข้อมูล GPS Tracking (Semi-structured Data)
- **รูปแบบ:** JSON streams จากแอปพลิเคชันมือถือ
- **ข้อมูล:** vehicle_id, latitude, longitude, timestamp, speed, direction
- **ความถี่:** ทุก 10-15 วินาที

#### 3. ข้อมูลการจราจรและเส้นทาง (Semi-structured Data)
- **แหล่งข้อมูล:** Google Maps API
- **ข้อมูล:** real-time traffic conditions, estimated travel time, route alternatives
- **ความถี่:** ทุก 2-5 นาที

#### 4. ข้อมูลสภาพอากาศ (Semi-structured Data)
- **แหล่งข้อมูล:** กรมอุตุนิยมวิทยา
- **ข้อมูล:** temp, humidity, rain, condition
- **ความถี่:** ทุก 10-15 นาที

#### 5. ประวัติผลงานการจัดส่ง (Structured Data)
- **ฐานข้อมูล:** PostgreSQL historical tables
- **ข้อมูล:** 3 ปีที่ผ่านมาของรูปแบบการจัดส่ง

### 5Vs Snapshot Analysis

| Dimension | Details |
|-----------|---------|
| **Volume (ปริมาณ)** | • Orders: 120,000–300,000/day<br>• GPS: ~22M datapoints/day<br>• Total: ~10–25 GB/day |
| **Velocity (ความเร็ว)** | • GPS updates: ทุก 10-15 วินาที<br>• Route calculation: <30 วินาที<br>• Traffic updates: ทุก 2-5 นาที |
| **Variety (ความหลากหลาย)** | • Structured: PostgreSQL tables<br>• Semi-structured: JSON (GPS, API)<br>• Unstructured: Images, feedback, logs |
| **Veracity (ความน่าเชื่อถือ)** | • Traffic API delay: 2-5 นาที<br>• GPS outliers: ตรวจสอบและกรอง<br>• Weather accuracy |
| **Value (คุณค่า)** | • ลดต้นทุน<br>• เพิ่มประสิทธิภาพ<br>• เพิ่มความพึงพอใจลูกค้า<br>• ลดผลกระทบสิ่งแวดล้อม |

---

## 🏗️ System Architecture

### Checkpoint #1: Data Ingestion & Storage

#### Data Ingestion Strategy

| Data Source | Pattern | Method | Frequency | Volume | Rationale |
|------------|---------|--------|-----------|---------|-----------|
| GPS Tracking | Streaming + Unbounded | Redis Bull Queue | 10-15 sec | ~22M/day | Real-time processing |
| Order Management | Differential + Pull | CDC | Near real-time | 120K-300K/day | Incremental changes |
| Traffic Data | Micro-batch + Pull | Google Maps API | 2-5 min | 2,500 req/day | API limitations |
| Weather Data | Snapshot + Pull | API | 10-15 min | ~MB/day | Not critical |
| Historical Data | Snapshot + Pull | Direct DB | One-time/Daily | 3 years | ML training |

#### Data Flow Architecture

```
┌─────────────────┐
│   Data Sources  │
└────────┬────────┘
         │
    ┌────▼─────┬──────────┬──────────┬──────────┐
    │          │          │          │          │
┌───▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼───┐
│  GPS  │  │Orders│  │Traffic│  │Weather│  │History│
└───┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
    │         │         │         │         │
    └─────────┴─────────┴─────────┴─────────┘
                      │
              ┌───────▼────────┐
              │ AWS Lambda     │
              │ + DynamoDB     │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  Transformation│
              │  & Processing  │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   Analytics &  │
              │   ML Models    │
              └────────────────┘
```

### Challenges & Solutions

#### 1. Data Volume Challenge
- **ปัญหา:** GPS tracking 22M points/day
- **วิธีแก้:**
  - Amazon SQS สำหรับ message queuing
  - Batch processing (1000 records/batch)
  - Auto-scaling Lambda functions

#### 2. API Rate Limiting
- **ปัญหา:** Google Maps API จำกัด 2,500 requests/day
- **วิธีแก้:**
  - Redis caching (5-minute TTL)
  - Batch coordinate requests
  - Fallback ใช้ historical traffic patterns

#### 3. Data Quality Issues
- **ปัญหา:** GPS coordinates มี outliers นอกประเทศไทย
- **วิธีแก้:**
  - Validation rules (lat: 13-19, lng: 97-106)
  - Quarantine invalid data to S3
  - Speed validation (<120 km/h)

---

## 🔄 Checkpoint #2: Transformation & Serving

### Priority Calculation System

#### Algorithm Design: 6-Factor Priority Score

```
Priority Score = 
  (Temperature × 0.30) +
  (Expiration × 0.25) +
  (Customer Priority × 0.15) +
  (Order Value × 0.10) +
  (Delivery Window × 0.15) +
  (Fragility × 0.05)
```

#### Factor Breakdown

##### 1. Temperature Requirement (30% - น้ำหนักสูงสุด)

| Category | Temperature | Score | Rationale |
|----------|------------|-------|-----------|
| Hot Food | 60-70°C | 100 | เย็นเร็ว ต้องส่งทันที |
| Frozen | -18°C | 90 | ละลายได้ง่าย |
| Chilled | 0-4°C | 75 | เน่าเสียง่าย |
| Beverage | 15-20°C | 40 | ทนได้นาน |
| Snack | Ambient | 20 | ไม่เน่าง่าย |
| Medicine | Ambient | 60 | ต้องระวังพิเศษ |

##### 2. Expiration Time (25%)

| Hours Until Expiry | Score | Use Case |
|-------------------|-------|----------|
| ≤ 3 hours | 100 | อาหารร้อน |
| ≤ 8 hours | 90 | แซนด์วิช |
| ≤ 24 hours | 70 | อาหารสด |
| ≤ 168 hours | 50 | 1 สัปดาห์ |
| > 168 hours | 30 | สินค้าทนทาน |

##### 3. Customer Priority (15%)

| Level | Score | Description |
|-------|-------|-------------|
| Urgent | 100 | VIP / โรงพยาบาล |
| High | 75 | สมาชิกพิเศษ |
| Standard | 50 | ลูกค้าทั่วไป |
| Economy | 25 | ไม่เร่งด่วน |

##### 4. Order Value (10%)

| Value Range | Score |
|-------------|-------|
| ≥ ฿500 | 100 |
| ≥ ฿200 | 80 |
| ≥ ฿100 | 60 |
| ≥ ฿50 | 40 |
| < ฿50 | 20 |

##### 5. Delivery Window (15%)

| Time Remaining | Score |
|---------------|-------|
| ≤ 15 min | 100 |
| ≤ 30 min | 90 |
| ≤ 60 min | 70 |
| ≤ 120 min | 50 |
| > 120 min | 30 |

##### 6. Fragility (5%)

| Type | Score | Examples |
|------|-------|----------|
| Fragile | 100 | ยา, แก้ว |
| Normal | 30 | สินค้าทั่วไป |

### Priority Classification

| Score Range | Priority Class | Action | Color |
|-------------|----------------|--------|-------|
| 75-100 | 🔴 CRITICAL | ส่งทันที ≤30 นาที | Red |
| 60-74 | 🟠 HIGH | ส่งเร็ว ≤60 นาที | Orange |
| 40-59 | 🔵 MEDIUM | ส่งปกติ ≤90 นาที | Blue |
| 0-39 | 🟢 LOW | รอได้ ≤120 นาที | Green |

### Calculation Examples

#### Example 1: Hot Food (Critical - 91.00 points)
```
Input:
- ข้าวกล่องหมูกระเพรา (hot_food, 3h exp)
- Customer: Urgent
- Value: ฿65
- Time left: 25 min

Calculation:
Temperature:        100 × 0.30 = 30.00
Expiration:         100 × 0.25 = 25.00
Customer Priority:  100 × 0.15 = 15.00
Order Value:         60 × 0.10 =  6.00
Delivery Window:     90 × 0.15 = 13.50
Fragility:           30 × 0.05 =  1.50
                              --------
Total:                          91.00 🔴 CRITICAL
Delivery Order: #1
```

#### Example 2: Ice Cream (Critical - 77.50 points)
```
Input:
- ไอศกรีมวานิลลา (frozen, 30 days exp)
- Customer: Urgent
- Value: ฿178
- Time left: 30 min

Total: 77.50 🔴 CRITICAL
Delivery Order: #2
```

#### Example 3: Sandwich (High - 74.25 points)
```
Input:
- แซนด์วิชไข่ทูน่า (chilled, 8h exp)
- Customer: High
- Value: ฿90
- Time left: 45 min

Total: 74.25 🟠 HIGH
Delivery Order: #3
```

---

## 🤖 Machine Learning Models

### Traffic Pattern Prediction Models

ทดสอบ 3 โมเดลเพื่อหาโมเดลที่ดีที่สุดในการทำนายรูปแบบการจราจร:

#### 1. Prophet (Facebook)
- **MAE:** 1.9574
- **ข้อดี:** จัดการ seasonality ได้ดี
- **ข้อเสีย:** ทำนายต่ำกว่าค่าจริงเกือบตลอดเวลา
- **สาเหตุ:** ไม่สามารถจับความแปรปรวนรายวันได้ดี

#### 2. SARIMAX
- **MAE:** 1.0212
- **ข้อดี:** จับจังหวะเวลาได้แม่นยำ
- **ข้อเสีย:** ทำนายความสูงเท่ากันทุกวัน (ใช้ค่าเฉลี่ย)
- **สาเหตุ:** Repeat รูปแบบค่าเฉลี่ยไปเรื่อยๆ

#### 3. LSTM (Long Short-Term Memory) ⭐ **Winner**
- **MAE:** 0.5497 (ต่ำที่สุด = แม่นยำที่สุด)
- **ข้อดี:** 
  - จับจังหวะเวลาได้ถูกต้อง
  - คาดเดาความรุนแรง (magnitude) ที่แปรปรวนในแต่ละวันได้แม่นยำ
  - เรียนรู้ความสัมพันธ์ที่ซับซ้อน
- **เหตุผลที่ชนะ:** เหมาะกับ Sequential Data และมีความจำระยะยาว

### Model Features

**Input Features:**
- `ds`: เวลา (รายชั่วโมง)
- `is_raining`: สภาพอากาศ

**Target:**
- `y`: ดัชนีรถติด (Traffic Congestion Index)

---

## 🗺️ Map & Location Services

### AWS Infrastructure

```
User Request
    ↓
API Gateway
    ↓
Lambda Functions ← DynamoDB
    ↓
Response (JSON)
```

### Lambda Functions

#### 1. create_order
- **Endpoint:** POST /orders
- **Function:** สร้างออเดอร์ใหม่พร้อมตำแหน่ง

#### 2. mock_location_update
- **Endpoint:** POST /location/mock
- **Function:** อัปเดตตำแหน่งแบบจำลอง

#### 3. get_location
- **Endpoint:** GET /location
- **Function:** ดึงตำแหน่งปัจจุบัน

### 7-Eleven Store Locator

#### Features
- ✅ แสดงแผนที่แบบ interactive (Leaflet)
- ✅ ศูนย์กลาง: มหาวิทยาลัยธรรมศาสตร์ (13.9650, 100.5950)
- ✅ ดึงข้อมูลร้านจาก OpenStreetMap Overpass API
- ✅ กรองร้านสะดวกซื้อภายในรัศมี 5 กม.
- ✅ แสดง markers พร้อม popup (ชื่อ, ที่อยู่, เวลาเปิด-ปิด)
- ✅ คำนวณเส้นทางด้วย leaflet-routing-machine
- ✅ API หาร้านใกล้เคียงที่สุด (5 ร้านแรก)

---

## 💻 Checkpoint #3: Frontend Development

### Navigation System

#### User Roles & Permissions

**ผู้ใช้ทั่วไป (User):**
- 🛒 ช้อปสินค้า
- 🛍️ ตะกร้าสินค้า

**ผู้ดูแลระบบ (Admin):**
- **Dashboard:**
  - 🌟 Priority System
  - 🚚 Driver Performance
  - 📊 Real-time Analytics
  - 🗺️ Route Optimization
- **Shopping:**
  - 🛒 ช้อปสินค้า
  - 🛍️ ตะกร้าสินค้า
- **Admin:**
  - 👥 จัดการผู้ใช้
  - ⚙️ ตั้งค่าระบบ

### Security (Middleware)

#### Access Control Rules
- **Public Pages:** ดูสินค้าได้โดยไม่ต้องล็อกอิน
- **Authenticated Pages:** Checkout, Success page
- **Role-based Access:**
  - User → ช็อปสินค้าเท่านั้น (ถ้าพยายามเข้า Dashboard จะถูก redirect)
  - Admin → เข้าได้ทุกหน้า

#### Auto-redirect
- User login → ไปหน้าช็อป
- Admin login → ไปหน้า Dashboard

### Shopping System

#### Main Features

##### 🔍 Smart Store Finder
1. ขอตำแหน่งปัจจุบันของผู้ใช้
2. หาร้าน 7-11 ภายในรัศมี 5 กม.
3. แสดงข้อมูลร้าน:
   - ชื่อร้าน
   - ที่อยู่
   - ระยะทาง (กม.)
   - เวลาโดยประมาณ (นาที)

##### 📦 Product Display
- แสดงสินค้าเฉพาะของร้านที่เลือก
- แสดงราคาและจำนวนคงเหลือ
- สินค้าหมดจะไม่สามารถเพิ่มได้

##### 🔎 Search & Filter
- ค้นหาด้วยชื่อสินค้า
- กรองตามหมวดหมู่:
  - 🍱 อาหารร้อน
  - ❄️ อาหารแช่แข็ง
  - 🧊 อาหารแช่เย็น
  - 🥤 เครื่องดื่ม
  - 🍿 ขนม
  - 💊 ยา

##### 🛒 Shopping Cart
- แสดงจำนวนสินค้าในตะกร้า
- เพิ่ม/ลบ/แก้ไขจำนวน
- เก็บข้อมูลใน Local Storage

### Components

#### Reusable Components
- **Button:** หลายรูปแบบ (primary, secondary, outline) + 3 ขนาด
- **Card:** กล่องแสดงข้อมูลพร้อม shadow
- **Header:** โลโก้ 7-ELEVEN + ชื่อหน้า + เมนู
- **LoadingSpinner:** แสดงตอนโหลด
- **StatsCard:** แสดงตัวเลขสำคัญพร้อมไอคอน
- **Navigation:** เมนูแบ่งตามสิทธิ์

---

## 🚀 API Endpoints

### Lambda APIs

#### 1. Lambda Stores API
**Purpose:** ค้นหาร้าน 7-Eleven ใกล้เคียง

**Input:**
```json
{
  "latitude": 13.7563,
  "longitude": 100.5018,
  "radius": 5
}
```

**Output:**
```json
{
  "stores": [
    {
      "id": "store1",
      "name": "7-Eleven ...",
      "distance": 0.5,
      "latitude": 13.7569,
      "longitude": 100.5022
    }
  ]
}
```

#### 2. Lambda Core Route API
**Endpoint:** `/api/routes/optimize`  
**Purpose:** คำนวณเส้นทางสั้นที่สุด (Dijkstra's Algorithm)

**Output:**
- ระยะทาง (กม.)
- เวลาที่ใช้ (นาที)

#### 3. Lambda Multi-Stop Delivery API
**Endpoint:** `/api/routes/multi-stop`  
**Purpose:** คำนวณเส้นทางหลายจุด (TSP)

**Algorithm:**
- Nearest Neighbor Algorithm (เริ่มต้น)
- 2-opt Improvement (ปรับปรุง)

**Output:**
- ลำดับการแวะร้าน
- ระยะทางรวม
- เวลารวม

#### 4. Lambda Real-time Traffic API
**Purpose:** ดึงข้อมูลการจราจรแบบ real-time

**Output:**
- ความเร็วเฉลี่ย
- ระดับความหนาแน่น
- เวลาที่ใช้แบบอัปเดตล่าสุด

### Priority Calculation API

**Endpoint:** `POST /api/orders/calculate-priority`

**Request:**
```json
{
  "orders": [
    {
      "order_id": "ORD001",
      "customer_priority": "urgent",
      "order_time": "2025-10-12T09:00:00Z",
      "delivery_window_end": "2025-10-12T09:25:00Z",
      "products": [
        {
          "product_id": "P001",
          "name": "ข้าวกล่องหมูกระเพรา",
          "category": "hot_food",
          "price": 65,
          "quantity": 1,
          "expiration_hours": 3
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total_orders": 1,
  "orders": [
    {
      "order_id": "ORD001",
      "priority_score": 91.00,
      "priority_class": "critical",
      "suggested_delivery_order": 1,
      "breakdown": {
        "temperature": 30.00,
        "expiration": 25.00,
        "customer_priority": 15.00,
        "value": 6.00,
        "delivery_window": 13.50,
        "fragility": 1.50
      }
    }
  ],
  "summary": {
    "critical": 1,
    "high": 0,
    "medium": 0,
    "low": 0
  }
}
```

---

## 📱 User Flow

### For Regular Users

1. เปิดเว็บ → หน้า Login
2. กรอก Email/Password
3. ล็อกอินสำเร็จ → ไปหน้าช็อปอัตโนมัติ
4. อนุญาตเข้าถึงตำแหน่ง
5. ระบบหาร้านใกล้เคียง
6. แสดงข้อมูลร้าน
7. เลือกดูสินค้า
8. เพิ่มสินค้าเข้าตะกร้า
9. ไปที่ตะกร้าสินค้า
10. ตรวจสอบรายการ
11. Checkout
12. ยืนยันการสั่งซื้อ

### For Admins

1. ล็อกอินสำเร็จ → ไปหน้า Dashboard
2. เปิดเมนูแฮมเบอร์เกอร์
3. เห็นเมนูทั้งหมด (Dashboard, Shopping, Admin)
4. เลือกหน้าที่ต้องการ
5. สามารถช็อปสินค้าได้เหมือนผู้ใช้ทั่วไป

---

## 🎨 Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| สีเขียว 7-ELEVEN | #00843D | Primary color |
| สีขาว | #FFFFFF | Background |
| สีเทา | #6B7280 | Text, borders |
| สีแดง | #EF4444 | Alerts, badges |

### Design Principles

- ✅ มุมโค้งมน (Rounded corners)
- ✅ เงาอ่อน (Soft shadows)
- ✅ ระยะห่างสม่ำเสมอ (Consistent spacing)
- ✅ แอนิเมชั่นเรียบง่าย (Smooth transitions)
- ✅ Mobile-first responsive design

---

## 📂 Project Structure

```
DeliveryGenie/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── stores/
│   │   │       ├── nearest/route.ts          # API หาร้านใกล้เคียง
│   │   │       └── [storeId]/products/       # API ดึงสินค้า
│   │   ├── shop/
│   │   │   ├── page.tsx                      # หน้าช็อปหลัก
│   │   │   ├── cart/page.tsx                 # หน้าตะกร้า
│   │   │   └── checkout/page.tsx             # หน้า Checkout
│   │   └── middleware.ts                     # Security
│   ├── components/                           # Reusable components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── StatsCard.tsx
│   │   ├── Navigation.tsx
│   │   └── index.ts
│   ├── contexts/
│   │   └── CartContext.tsx                   # Cart management
│   └── types/                                # TypeScript types
│       ├── shopping.ts
│       └── next-auth.d.ts
├── public/                                   # Static assets
├── README.md
└── package.json
```

---

## ⚙️ Technology Stack

### Frontend
- **Framework:** Next.js 14 (React)
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **Maps:** Leaflet + leaflet-routing-machine
- **Authentication:** NextAuth.js

### Backend
- **Cloud:** AWS
  - Lambda Functions
  - DynamoDB
  - API Gateway
  - S3
  - SQS (Message Queue)
- **Database:** PostgreSQL (AWS RDS)
- **Caching:** Redis
- **API:** Google Maps API

### Data Processing
- **Streaming:** Bull Queue
- **CDC:** Change Data Capture
- **ETL:** Lambda Functions

### Machine Learning
- **Models:** Prophet, SARIMAX, LSTM (TensorFlow/Keras)
- **Training:** AWS SageMaker
- **Data:** 3 years historical data

### Route Optimization
- **Algorithms:**
  - Dijkstra's Algorithm (shortest path)
  - Nearest Neighbor + 2-opt (TSP)
  - Traffic-aware routing

---

## ✅ Completed Features

### ✅ Checkpoint #1: Data Ingestion
- [x] Data pipeline design (5 sources)
- [x] EDA และ Data Quality Analysis
- [x] AWS Lambda + DynamoDB setup
- [x] Google Maps API integration
- [x] Data validation และ error handling

### ✅ Checkpoint #2: Transformation
- [x] Priority Calculation System (6 factors)
- [x] Priority classification (4 levels)
- [x] Priority API endpoint
- [x] ML Models (Prophet, SARIMAX, LSTM)
- [x] Traffic pattern prediction
- [x] 7-Eleven Store Locator
- [x] Route calculation (Core Route API)
- [x] Multi-stop optimization (TSP)

### ✅ Checkpoint #3: Frontend
- [x] Navigation system (role-based)
- [x] Security middleware
- [x] Smart store finder
- [x] Shopping system
- [x] Search & filter
- [x] Shopping cart
- [x] Responsive design
- [x] Loading states & error handling
- [x] Driver Performance dashboard
- [x] Real-time Analytics dashboard
- [x] Interactive route display

---

## 🔜 Future Work

### Near-term (ระยะใกล้)
- [ ] ทดสอบหาร้านกับตำแหน่งจริง
- [ ] ทดสอบเพิ่มสินค้าลงตะกร้า
- [ ] ทำหน้า Checkout ให้สมบูรณ์
- [ ] หน้ายืนยันคำสั่งซื้อ
- [ ] ระบบแจ้งเตือนสำเร็จ

### Long-term (ระยะไกล)
- [ ] เพิ่มรูปภาพสินค้า
- [ ] แสดงเวลาเปิด-ปิดร้าน
- [ ] ประมาณเวลาส่งสินค้า
- [ ] บันทึกหลายที่อยู่
- [ ] ติดตามสถานะคำสั่งซื้อ
- [ ] ระบบรายการโปรด
- [ ] รีวิวสินค้า
- [ ] Push notifications
- [ ] Payment gateway integration

---

## 🐛 Known Issues & Solutions

### Issue #1: Lambda API ส่งข้อมูลเป็น String
**Problem:** Lambda ส่ง JSON ในรูปแบบ string ใน field body

**Solution:**
```javascript
if (typeof lambdaResponse.body === 'string') {
  storesData = JSON.parse(lambdaResponse.body);
}
```

### Issue #2: แสดงสินค้าก่อนหาร้าน
**Problem:** โหลดสินค้าพร้อมกับหาร้าน

**Solution:** 
- หาร้านก่อน → เสร็จแล้วค่อยโหลดสินค้า
- แสดง loading message "กำลังหา 7-11 ใกล้ฉัน..."

---

## 🔐 Environment Variables

```bash
# API สำหรับคำนวณเส้นทาง
LAMBDA_CORE_ROUTE_URL=<url-คำนวณเส้นทาง>
LAMBDA_STORES_URL=<url-หาร้าน>
LAMBDA_MULTI_STOP_URL=<url-multi-stop>
LAMBDA_TRAFFIC_URL=<url-traffic>

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<รหัสลับ>

# Database
DATABASE_URL=<postgresql-url>

# Google Maps
GOOGLE_MAPS_API_KEY=<api-key>

# Redis
REDIS_URL=<redis-url>
```

---

## 🚀 Getting Started

### Prerequisites
```bash
Node.js >= 18
npm or yarn
PostgreSQL
Redis
```

### Installation

```bash
# Clone repository
git clone https://github.com/KittiphonKamnuan/DeliveryGenie.git
cd DeliveryGenie

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# แก้ไขค่าใน .env

# Run database migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### Development

```bash
# Start development server
npm run dev

# Access at http://localhost:3000
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 📊 Performance Metrics

### Expected Improvements

| Metric | Current | Target | Expected Improvement |
|--------|---------|--------|---------------------|
| Average Delivery Time | - | -30% | ลดเวลาจัดส่งเฉลี่ย |
| Fuel Costs | - | -25% | ลดค่าน้ำมัน |
| On-Time Delivery Rate | - | +40% | เพิ่มการส่งตรงเวลา |
| Customer Satisfaction | - | +35% | เพิ่มความพึงพอใจ |
| Route Efficiency | - | +45% | เพิ่มประสิทธิภาพเส้นทาง |

### ML Model Performance

| Model | MAE | Accuracy | Status |
|-------|-----|----------|--------|
| Prophet | 1.9574 | Low | ❌ Not used |
| SARIMAX | 1.0212 | Medium | ⚠️ Backup |
| **LSTM** | **0.5497** | **High** | ✅ **In use** |

---

## 👥 Team Contributions

| Member | Role | Contributions |
|--------|------|--------------|
| กิตติธัช เด่นสกุลประเสริฐ | Backend Developer | Lambda APIs, Database design, ML models |
| กิตติภณ คำนวล | Project Manager | Project planning, Documentation, Coordination |
| พชร พรพงศ์ | Frontend Developer | UI/UX design, React components, Shopping system |
| จุติณัฏฐ์ รัตนะมงคลกุล | Data Engineer | Data pipeline, ETL, Data quality |

---

## 📚 References

1. World Economic Forum (2024) - "Sustainable and Efficient Last-Mile Delivery in Cities"
2. McKinsey & Company (2023) - E-commerce Logistics Report
3. Thailand's Logistics Report (2021)
4. MDPI (2024) - Logistics Cost Analysis
5. Traffic Index (2025) - Bangkok Traffic Congestion
6. Fun Events Asia (2024) - Traffic Cost Analysis
7. Beerkaew et al. (2024) - Bangkok Traffic Economics
8. BMA Data Center - Vehicle Registration Statistics
9. Charter Cities Institute - Urban Infrastructure

---

## 📧 Contact

**Project Repository:** [https://github.com/KittiphonKamnuan/DeliveryGenie](https://github.com/KittiphonKamnuan/DeliveryGenie)

**Course:** CS341 Big Data Engineering  
**Academic Year:** 2568

---

## 📄 License

This project is developed for educational purposes as part of CS341 Big Data Engineering course.

---

## 🙏 Acknowledgments

- มหาวิทยาลัยธรรมศาสตร์
- CS341 Big Data Engineering Course Team
- 7-Eleven Thailand (Case Study)
- Google Maps API
- AWS Services
- OpenStreetMap Community

---

**Last Updated:** November 22, 2025  
**Version:** 3.0 (Checkpoint #3 Complete)
