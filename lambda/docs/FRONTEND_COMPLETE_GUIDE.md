# DeliveryGenie Frontend Complete Guide

**Date**: 2025-11-22
**Status**: ✅ Production Ready

---

## 📱 Frontend Overview

DeliveryGenie มี Frontend สำหรับ **3 มุมมอง**:

1. 👤 **Customer View** - สำหรับลูกค้าสั่งสินค้าและติดตามการจัดส่ง
2. 👨‍💼 **Admin View** - สำหรับผู้ดูแลระบบดูภาพรวมและจัดการ
3. 🚚 **Rider View** - สำหรับคนขับรับงานและอัปเดตสถานะ

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                     │
│                  (TypeScript + React)                   │
└─────────────────┬───────────────────────────────────────┘
                  │
     ├────────────┼────────────┐
     │            │            │
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Customer │  │  Admin  │  │  Rider  │
│  View   │  │  View   │  │  View   │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┼────────────┘
                  │
                  ▼
     ┌────────────────────────┐
     │   Next.js API Routes   │
     │   (Server-side proxy)  │
     └────────┬───────────────┘
              │
     ├────────┼────────┐
     │        │        │
     ▼        ▼        ▼
┌─────────┐ ┌──────────┐ ┌─────────┐
│PostgreSQL│ │  Lambda  │ │ External│
│(AWS RDS) │ │   APIs   │ │   APIs  │
└─────────┘ └──────────┘ └─────────┘
```

---

## 👤 1. Customer View

### หน้าที่มีอยู่

#### 📍 `/shop` - Shopping Page
**File**: `src/app/shop/page.tsx`

**Features**:
- 🔍 หาร้าน 7-Eleven ใกล้เคียง (ใช้ Geolocation API)
- 📦 แสดงสินค้าของร้านที่เลือก
- 🔎 ค้นหาและกรองตามหมวดหมู่
- 🛒 เพิ่มสินค้าเข้าตะกร้า

**API Integration**:
```typescript
// Find nearest store
POST /api/stores/nearest
{
  "latitude": 13.7563,
  "longitude": 100.5018
}

// Get products
GET /api/products?store_id={store_id}
```

#### 🛒 `/shop/cart` - Shopping Cart
**File**: `src/app/shop/cart/page.tsx`

**Features**:
- แสดงรายการสินค้าในตะกร้า
- แก้ไขจำนวนสินค้า
- คำนวณราคารวม
- ไปหน้า Checkout

**State Management**:
```typescript
// Context: src/contexts/CartContext.tsx
const { cart, addToCart, removeFromCart, updateQuantity } = useCart();
```

#### 💳 `/shop/checkout` - Checkout Page
**File**: `src/app/shop/checkout/page.tsx`

**Features**:
- กรอกข้อมูลการจัดส่ง
- เลือกช่วงเวลาจัดส่ง
- ยืนยันการสั่งซื้อ

**API Integration**:
```typescript
POST /api/orders/create
{
  "customer_id": "...",
  "store_id": "...",
  "items": [...],
  "delivery_address": "...",
  "delivery_time_window": "..."
}
```

#### ✅ `/shop/order-success` - Order Success
**File**: `src/app/shop/order-success/page.tsx`

**Features**:
- แสดงหมายเลขออเดอร์
- ข้อมูลการจัดส่ง
- ลิงก์ติดตามสถานะ

---

## 👨‍💼 2. Admin View

### หน้าที่มีอยู่

#### 🏠 `/` - Priority Dashboard (Admin Home)
**File**: `src/app/page.tsx`

**Features**:
- 📊 แสดงสถิติออเดอร์แบบ real-time
- 🎯 ตารางออเดอร์เรียงตามลำดับความสำคัญ
- ⏱️ แสดงเวลาที่เหลือก่อนหมดเวลาส่ง
- 📋 รายละเอียดออเดอร์แบบ Modal

**Key Metrics**:
- ออเดอร์ทั้งหมด
- ออเดอร์สำคัญมาก (Critical)
- ออเดอร์สำคัญสูง (High)
- คะแนนเฉลี่ย

**API Integration**:
```typescript
GET /api/orders?status=pending&limit=50
```

#### 📊 `/analytics` - Analytics Dashboard
**File**: `src/app/analytics/page.tsx`

**Features**:
- กราฟแสดงประสิทธิภาพการจัดส่ง
- อัตราการส่งตรงเวลา
- Revenue analytics
- ประสิทธิภาพตามช่วงเวลา

#### 🚚 `/driver-performance` - Driver Performance
**File**: `src/app/driver-performance/page.tsx`

**Features**:
- ⭐ Leaderboard คนขับ
- 📈 กราฟประสิทธิภาพ
- ⛽ การใช้น้ำมัน
- 🎯 Delivery efficiency metrics

**Components**:
- `src/components/driver/PerformanceMetrics.tsx`
- `src/components/driver/DriverLeaderboard.tsx`
- `src/components/driver/FuelConsumptionTracker.tsx`
- `src/components/driver/PerformanceTrends.tsx`
- `src/components/driver/DeliveryEfficiency.tsx`

#### 🗺️ `/route-optimization` - Route Optimization
**File**: `src/app/route-optimization/page.tsx`

**Features**:
- แสดงแผนที่
- เพิ่มจุดหมายหลายจุด
- คำนวณเส้นทางที่เหมาะสม (TSP)
- แสดงระยะทางและเวลารวม

**API Integration**:
```typescript
POST /api/routes/multi-stop
{
  "origin": {"lat": 13.7563, "lon": 100.5018},
  "stores": [
    {"store_id": "S1", "lat": 13.7270, "lon": 100.5240, "priority": 1},
    {"store_id": "S2", "lat": 13.7463, "lon": 100.5342, "priority": 2}
  ],
  "use_priority": true
}
```

#### 🚗 `/vehicle-tracking` - Vehicle Tracking
**File**: `src/app/vehicle-tracking/page.tsx`

**Features**:
- แผนที่แสดงตำแหน่งรถทั้งหมด
- Real-time GPS tracking
- สถานะการจัดส่งแต่ละคัน
- กรองตามสถานะ

**Components**:
- `src/components/map/VehicleTrackingMap.tsx`
- `src/components/map/TrafficOverlay.tsx`

#### 👥 `/admin/users` - User Management
**File**: `src/app/admin/users/page.tsx`

**Features**:
- รายชื่อผู้ใช้ทั้งหมด
- เพิ่ม/แก้ไข/ลบผู้ใช้
- จัดการสิทธิ์ (User/Admin/Rider)
- รีเซ็ตรหัสผ่าน

#### ⚙️ `/admin/settings` - System Settings
**File**: `src/app/admin/settings/page.tsx`

**Features**:
- ตั้งค่าระบบทั่วไป
- การตั้งค่า Priority weights
- การตั้งค่า GPS tracking
- Integration settings

---

## 🚚 3. Rider View

### หน้าที่สร้างใหม่

#### 🏠 `/rider` - Rider Dashboard
**File**: `src/app/rider/page.tsx` ✨ **NEW**

**Features**:
- 📦 **งานที่กำลังทำ** (Active Deliveries)
  - แสดงงานที่ assigned, picked_up, in_transit
  - ปุ่มอัปเดตสถานะ (รับสินค้า → เริ่มเดินทาง → จัดส่งสำเร็จ)
  - ปุ่มนำทางไป Google Maps

- 🆕 **งานใหม่ที่พร้อมรับ** (Available Jobs)
  - แสดงงานที่ยังไม่มีคนรับ
  - ดูรายละเอียดงาน
  - รับงานได้ทันที

- 📍 **GPS Tracking**
  - ขอสิทธิ์ตำแหน่งอัตโนมัติ
  - ส่งตำแหน่งทุก 15 วินาที
  - แสดงสถานะ GPS บน header

- 👤 **ข้อมูลคนขับ**
  - ชื่อคนขับ
  - คะแนนเฉลี่ย
  - จำนวนการจัดส่งสำเร็จ

**Workflow**:
```
1. เปิดหน้า Rider Dashboard
2. ระบบขอสิทธิ์ตำแหน่ง → เริ่ม GPS tracking
3. ดูงานใหม่ที่พร้อมรับ
4. กดดูรายละเอียด → รับงาน
5. งานย้ายมาที่ "งานที่กำลังทำ"
6. กด "รับสินค้าแล้ว" → status: picked_up
7. กด "เริ่มเดินทาง" → status: in_transit
8. กด "นำทาง" → เปิด Google Maps
9. ถึงปลายทาง → กด "จัดส่งสำเร็จ"
10. ระบบบันทึกข้อมูลผ่าน Lambda /complete
```

**API Integration**:
```typescript
// Get driver info
GET /api/drivers/{driver_id}

// Get active deliveries
GET /api/deliveries?driver_id={driver_id}&status=assigned,picked_up,in_transit

// Get available jobs
GET /api/deliveries?status=pending&limit=10

// Update delivery status
PATCH /api/deliveries/{delivery_id}/status
{
  "status": "picked_up",
  "driver_id": "..."
}

// Send GPS tracking
POST /api/tracking
{
  "driver_id": "...",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 45,
  "timestamp": "2025-11-22T..."
}

// Complete delivery
POST /api/deliveries/complete
{
  "delivery_id": "...",
  "notes": "จัดส่งสำเร็จ"
}
```

---

## 🔌 API Routes Created

### New Backend API Routes

#### 1. `/api/deliveries` - GET
**File**: `src/app/api/deliveries/route.ts`

**Purpose**: ดึงรายการ deliveries ตามเงื่อนไข

**Query Parameters**:
- `driver_id` - กรองตามคนขับ
- `status` - กรองตามสถานะ (รองรับ comma-separated)
- `limit` - จำกัดจำนวน (default: 50)

**Example**:
```typescript
GET /api/deliveries?driver_id=xxx&status=assigned,picked_up&limit=20
```

#### 2. `/api/deliveries/[id]/status` - PATCH
**File**: `src/app/api/deliveries/[id]/status/route.ts`

**Purpose**: อัปเดตสถานะ delivery

**Body**:
```json
{
  "status": "picked_up",
  "driver_id": "..."
}
```

#### 3. `/api/drivers/[id]` - GET
**File**: `src/app/api/drivers/[id]/route.ts`

**Purpose**: ดึงข้อมูลคนขับ

**Response**:
```json
{
  "success": true,
  "driver": {
    "driver_id": "...",
    "name": "John Doe",
    "phone": "...",
    "status": "active",
    "total_deliveries": 150,
    "rating": 4.8,
    "vehicle": {...}
  }
}
```

#### 4. `/api/tracking` - POST
**File**: `src/app/api/tracking/route.ts`

**Purpose**: Proxy สำหรับส่งข้อมูล GPS ไป Lambda

**Body**:
```json
{
  "driver_id": "...",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 45,
  "bearing": 90,
  "accuracy_meters": 10,
  "timestamp": "2025-11-22T..."
}
```

#### 5. `/api/deliveries/complete` - POST
**File**: `src/app/api/deliveries/complete/route.ts`

**Purpose**: Proxy สำหรับบันทึกการจัดส่งเสร็จผ่าน Lambda

**Body**:
```json
{
  "delivery_id": "...",
  "notes": "จัดส่งสำเร็จ"
}
```

---

## 🎨 UI Components

### Reusable Components

#### Core Components
- `src/components/Button.tsx` - ปุ่มแบบต่างๆ (primary, secondary, success, danger)
- `src/components/Card.tsx` - กล่องแสดงข้อมูลพร้อม shadow
- `src/components/Header.tsx` - Header พร้อมโลโก้และเมนู
- `src/components/LoadingSpinner.tsx` - Spinner แสดงตอนโหลด
- `src/components/StatsCard.tsx` - การ์ดแสดงตัวเลขสำคัญ
- `src/components/Navigation.tsx` - เมนูแบ่งตามสิทธิ์

#### Map Components
- `src/components/map/DeliveryMap.tsx` - แผนที่แสดงจุดจัดส่ง
- `src/components/map/RouteOptimizationMap.tsx` - แผนที่ optimize เส้นทาง
- `src/components/map/VehicleTrackingMap.tsx` - แผนที่ติดตามรถ
- `src/components/map/TrafficOverlay.tsx` - overlay การจราจร

#### Driver Components
- `src/components/driver/PerformanceMetrics.tsx` - Metrics คนขับ
- `src/components/driver/DriverLeaderboard.tsx` - Leaderboard
- `src/components/driver/FuelConsumptionTracker.tsx` - ติดตามน้ำมัน
- `src/components/driver/PerformanceTrends.tsx` - กราฟแนวโน้ม
- `src/components/driver/DeliveryEfficiency.tsx` - ประสิทธิภาพการส่ง

#### UI Components
- `src/components/ui/PriorityBadge.tsx` - Badge แสดงความสำคัญ

---

## 🔐 Authentication & Authorization

### Middleware
**File**: `src/middleware.ts`

**Access Control Rules**:
- **Public Pages**: `/auth/login`, `/` (landing)
- **User Pages**: `/shop/*`
- **Admin Pages**: `/admin/*`, `/analytics`, `/driver-performance`, `/route-optimization`, `/vehicle-tracking`
- **Rider Pages**: `/rider`

### Auto-redirect Logic
```typescript
// User login → redirect to /shop
// Admin login → redirect to /
// Rider login → redirect to /rider
```

---

## 🚀 Running the Frontend

### Development Mode
```bash
npm run dev
```
Server: http://localhost:3000

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

---

## 🧪 Testing Guide

### Test Customer View
1. เปิด http://localhost:3000/shop
2. Allow location access
3. เลือกร้าน 7-Eleven
4. เพิ่มสินค้าเข้าตะกร้า
5. ไปที่ Cart → Checkout
6. ทดสอบการสั่งซื้อ

### Test Admin View
1. Login as admin
2. ดู Priority Dashboard at `/`
3. ทดสอบ `/analytics`
4. ทดสอบ `/driver-performance`
5. ทดสอบ `/route-optimization`
6. ทดสอบ `/vehicle-tracking`

### Test Rider View
1. Login as rider
2. เปิด `/rider`
3. Allow location (GPS tracking)
4. ดูงานใหม่
5. รับงาน
6. อัปเดตสถานะ (รับสินค้า → เดินทาง → จัดส่งสำเร็จ)
7. ทดสอบปุ่มนำทาง

---

## 📦 Environment Variables

### Required for Frontend

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Lambda Endpoints (Server-side)
LAMBDA_NEARBY_7_URL="https://...amazonaws.com/prod/nearby7"
LAMBDA_TRACKING_URL="https://...amazonaws.com/prod/tracking"
LAMBDA_COMPLETE_URL="https://...amazonaws.com/prod/complete"
LAMBDA_PRIORITY_URL="https://...amazonaws.com/prod/priority"
LAMBDA_ETA_URL="https://...amazonaws.com/prod/eta"

# Client-side accessible (NEXT_PUBLIC_)
NEXT_PUBLIC_LAMBDA_TRACKING_URL="https://...amazonaws.com/prod/tracking"
NEXT_PUBLIC_LAMBDA_COMPLETE_URL="https://...amazonaws.com/prod/complete"
```

---

## 📝 Summary

### Frontend Status

| View | Pages | Components | API Routes | Status |
|------|-------|------------|------------|--------|
| Customer | 4 | 5+ | 3 | ✅ Complete |
| Admin | 6 | 15+ | 8 | ✅ Complete |
| Rider | 1 | - | 5 | ✅ Complete |

### Total Files Created/Updated

- **Pages**: 12 pages
- **Components**: 20+ components
- **API Routes**: 11 routes
- **Contexts**: 1 (CartContext)

### Features Implemented

- ✅ Shopping system with cart
- ✅ Store finder (Geolocation + Lambda API)
- ✅ Order management
- ✅ Priority dashboard
- ✅ Analytics & reporting
- ✅ Driver performance tracking
- ✅ Route optimization with maps
- ✅ Vehicle tracking
- ✅ Rider job management
- ✅ GPS tracking (real-time)
- ✅ Delivery status updates
- ✅ Google Maps navigation

---

## 🎯 Next Steps (Optional)

1. เพิ่ม Real-time notifications (WebSocket)
2. เพิ่มระบบ Chat ระหว่างคนขับกับลูกค้า
3. เพิ่ม Push notifications
4. เพิ่มหน้า Order history สำหรับ Customer
5. เพิ่มหน้า Earnings สำหรับ Rider
6. Deploy to Vercel/AWS Amplify

---

**DeliveryGenie Frontend is 100% Complete!** 🎉
