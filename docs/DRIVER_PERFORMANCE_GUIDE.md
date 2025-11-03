# 🚚 Driver Performance System Guide

> ระบบติดตามและประเมินประสิทธิภาพคนขับรถ - DeliveryGenie

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Components](#components)
4. [Usage Examples](#usage-examples)
5. [API Integration](#api-integration)
6. [Metrics Explained](#metrics-explained)

---

## 🎯 Overview

ระบบ Driver Performance เป็นส่วนสำคัญของ DeliveryGenie ที่ช่วยในการ:

- 📊 ติดตามประสิทธิภาพการทำงานของคนขับรถแบบเรียลไทม์
- 🏆 จัดอันดับและสร้างแรงจูงใจให้กับทีมส่งของ
- ⛽ วิเคราะห์การใช้น้ำมันและประสิทธิภาพรถ
- 📈 แสดงแนวโน้มและให้ข้อมูลเชิงลึก
- 🎯 ปรับปรุงคุณภาพการบริการ

---

## ✨ Features

### 1. Driver Performance Metrics
- อัตราการส่งตรงเวลา (On-time Delivery Rate)
- เวลาเฉลี่ยต่อการส่ง (Average Delivery Time)
- คะแนนความพึงพอใจลูกค้า (Customer Rating)
- จำนวนการส่งทั้งหมด (Total Deliveries)
- ประสิทธิภาพน้ำมัน (Fuel Efficiency)

### 2. Driver Ranking System
- 🥇 Top 3 Podium Display
- 🏆 Leaderboard with Live Rankings
- 📊 Trend Tracking (Up/Down/Stable)
- 🎖️ Badge System
- 📈 Score Calculation

### 3. Fuel Consumption Tracking
- ⛽ Real-time Fuel Efficiency Monitoring
- 💰 Cost Analysis
- 🌱 Environmental Impact (CO₂ Savings)
- 📉 Weekly Trends
- 💡 Fuel-saving Tips

### 4. Performance Trends
- 📊 Visual Charts (7/30/365 days)
- 📈 Trend Analysis
- 🎯 Goal Tracking
- 💡 AI-powered Insights
- ⚠️ Alerts & Warnings

### 5. Delivery Efficiency
- ✅ Completion Rate
- ⏰ On-time Performance
- 🗺️ Distance Metrics
- ⏱️ Time Breakdown
- 📊 Status Breakdown

---

## 🧩 Components

### 1. PerformanceMetrics

แสดงเมตริกประสิทธิภาพในรูปแบบ Grid หรือ List

**Location:** `src/components/driver/PerformanceMetrics.tsx`

**Props:**
```typescript
interface PerformanceMetricsProps {
  metrics: MetricData[];
  title?: string;
  layout?: 'grid' | 'list';
}

interface MetricData {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
  icon?: React.ReactNode;
  target?: number;
  status?: 'excellent' | 'good' | 'average' | 'poor';
}
```

**Usage:**
```tsx
import { PerformanceMetrics } from '@/components/driver';

<PerformanceMetrics
  metrics={[
    {
      label: 'อัตราตรงเวลา',
      value: 95,
      unit: '%',
      trend: 'up',
      trendValue: '+5%',
      color: 'bg-green-50',
      icon: <Clock className="w-6 h-6 text-green-600" />,
      target: 90,
      status: 'excellent'
    }
  ]}
  layout="grid"
/>
```

---

### 2. FuelConsumptionTracker

ติดตามและวิเคราะห์การใช้น้ำมัน

**Location:** `src/components/driver/FuelConsumptionTracker.tsx`

**Props:**
```typescript
interface FuelConsumptionTrackerProps {
  driverName: string;
  fuelStats: FuelStats;
  showDetails?: boolean;
}

interface FuelStats {
  totalConsumption: number; // liters
  totalDistance: number; // km
  avgEfficiency: number; // km/L
  totalCost: number; // THB
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  weeklyData: FuelData[];
  monthlyAverage: number;
  bestEfficiency: number;
  worstEfficiency: number;
}
```

**Features:**
- 📊 Weekly efficiency chart
- 💰 Cost breakdown
- 🌱 CO₂ savings calculation
- 💡 Fuel-saving tips

---

### 3. PerformanceTrends

แสดงกราฟและแนวโน้มประสิทธิภาพ

**Location:** `src/components/driver/PerformanceTrends.tsx`

**Props:**
```typescript
interface PerformanceTrendsProps {
  driverName: string;
  trends: TrendData[];
  insights: PerformanceInsight[];
  period?: 'week' | 'month' | 'year';
}

interface TrendData {
  period: string;
  onTimeRate: number;
  deliveries: number;
  avgTime: number;
  rating: number;
  efficiency: number;
}
```

**Features:**
- 📈 Dual-axis chart (deliveries + on-time rate)
- 🎯 Trend summary cards
- 💡 Performance insights
- ⚠️ Alerts and recommendations

---

### 4. DriverLeaderboard

จัดอันดับและแสดงผลคนขับรถ

**Location:** `src/components/driver/DriverLeaderboard.tsx`

**Props:**
```typescript
interface DriverLeaderboardProps {
  drivers: LeaderboardDriver[];
  title?: string;
  showTop?: number;
  highlightId?: string;
}

interface LeaderboardDriver {
  rank: number;
  driverId: string;
  name: string;
  score: number;
  badge: string;
  metrics: {
    deliveries: number;
    onTimeRate: number;
    avgTime: number;
    fuelEfficiency: number;
    rating: number;
  };
  trend: 'up' | 'down' | 'stable';
  rankChange?: number;
}
```

**Features:**
- 🏆 Top 3 Podium Display
- 📊 Complete leaderboard
- 📈 Rank change indicators
- 🎖️ Badge system

---

### 5. DeliveryEfficiency

วิเคราะห์ประสิทธิภาพการส่งของ

**Location:** `src/components/driver/DeliveryEfficiency.tsx`

**Props:**
```typescript
interface DeliveryEfficiencyProps {
  driverName: string;
  stats: DeliveryStats;
  timeBreakdown?: TimeBreakdown[];
  showDetails?: boolean;
}

interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  failedDeliveries: number;
  avgDeliveryTime: number; // minutes
  fastestDelivery: number;
  slowestDelivery: number;
  totalDistance: number; // km
  avgDistancePerDelivery: number;
}
```

**Features:**
- ✅ Success rate visualization
- ⏰ Time statistics
- 🗺️ Distance metrics
- 📊 Status breakdown

---

## 💻 Usage Examples

### Example 1: Complete Driver Performance Page

```tsx
'use client';

import {
  PerformanceMetrics,
  FuelConsumptionTracker,
  PerformanceTrends,
  DriverLeaderboard,
  DeliveryEfficiency
} from '@/components/driver';

export default function DriverPerformancePage() {
  // Fetch data from API
  const { drivers, selectedDriver, fuelStats, trends, insights } = useDriverData();

  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <DriverLeaderboard
        drivers={drivers}
        title="🏆 อันดับคนขับรถ"
        showTop={10}
      />

      {/* Selected Driver Details */}
      {selectedDriver && (
        <>
          <PerformanceMetrics
            metrics={getDriverMetrics(selectedDriver)}
            layout="grid"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FuelConsumptionTracker
              driverName={selectedDriver.name}
              fuelStats={fuelStats}
            />

            <DeliveryEfficiency
              driverName={selectedDriver.name}
              stats={selectedDriver.deliveryStats}
            />
          </div>

          <PerformanceTrends
            driverName={selectedDriver.name}
            trends={trends}
            insights={insights}
            period="week"
          />
        </>
      )}
    </div>
  );
}
```

---

## 🔌 API Integration

### API Endpoint: `/api/drivers/performance`

**Request:**
```typescript
GET /api/drivers/performance
```

**Response:**
```json
{
  "success": true,
  "drivers": [
    {
      "driver_id": "D001",
      "name": "สมชาย ใจดี",
      "rank": 1,
      "total_deliveries": 156,
      "on_time_deliveries": 148,
      "on_time_rate": 94.87,
      "avg_delivery_time": 18,
      "fuel_efficiency": 14.5,
      "total_distance": 1240,
      "customer_rating": 4.8,
      "earnings": 23500,
      "badge": "🥇",
      "trend": "up",
      "weekly_deliveries": [22, 18, 25, 21, 23, 24, 23]
    }
  ],
  "overallStats": {
    "totalDrivers": 15,
    "avgOnTimeRate": "92.5",
    "avgFuelEfficiency": "13.2",
    "totalDeliveries": 1850
  }
}
```

---

## 📊 Metrics Explained

### 1. On-Time Rate (อัตราตรงเวลา)
**Formula:** `(On-time Deliveries / Total Deliveries) × 100`

**Benchmarks:**
- 🟢 Excellent: ≥ 95%
- 🔵 Good: 90-95%
- 🟡 Average: 80-90%
- 🔴 Poor: < 80%

### 2. Fuel Efficiency (ประสิทธิภาพน้ำมัน)
**Unit:** km/L

**Benchmarks:**
- 🟢 Excellent: ≥ 15 km/L
- 🔵 Good: 12-15 km/L
- 🟡 Average: 10-12 km/L
- 🔴 Poor: < 10 km/L

### 3. Customer Rating (คะแนนลูกค้า)
**Scale:** 1-5 stars

**Benchmarks:**
- 🟢 Excellent: ≥ 4.8
- 🔵 Good: 4.5-4.8
- 🟡 Average: 4.0-4.5
- 🔴 Poor: < 4.0

### 4. Average Delivery Time (เวลาเฉลี่ยต่อการส่ง)
**Unit:** Minutes

**Benchmarks:**
- 🟢 Excellent: ≤ 15 min
- 🔵 Good: 15-20 min
- 🟡 Average: 20-30 min
- 🔴 Poor: > 30 min

### 5. Score Calculation (คะแนนรวม)
**Formula:**
```
Score = (On-time Rate × 0.3) +
        (Customer Rating × 20 × 0.25) +
        (Fuel Efficiency × 3 × 0.2) +
        (Total Deliveries × 0.15) +
        (Speed Factor × 0.1)

Speed Factor = 100 - (Avg Delivery Time - 15)
```

---

## 🎨 Customization

### Theme Colors

คุณสามารถปรับแต่งสีของ components ได้ที่ `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'seven-green': '#008C4F',
        'seven-green-dark': '#006838',
        'seven-orange': '#FF6900',
      }
    }
  }
}
```

---

## 📱 Responsive Design

ทุก components รองรับการแสดงผลบนหลายขนาดหน้าจอ:

- 📱 Mobile: < 768px
- 💻 Tablet: 768px - 1024px
- 🖥️ Desktop: > 1024px

---

## 🔧 Best Practices

1. **Data Fetching:**
   - ใช้ SWR หรือ React Query สำหรับ caching
   - Refresh data ทุก 30 วินาที สำหรับ real-time updates

2. **Performance:**
   - ใช้ `React.memo` สำหรับ heavy components
   - Lazy load charts และ visualizations

3. **Error Handling:**
   - แสดง fallback UI เมื่อโหลดข้อมูลไม่สำเร็จ
   - ให้ retry mechanism

4. **Accessibility:**
   - ใช้ semantic HTML
   - เพิ่ม ARIA labels
   - รองรับ keyboard navigation

---

## 📚 Additional Resources

- [Driver Performance API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](../prisma/DATABASE_SCHEMA.md)
- [Analytics Guide](./ANALYTICS_GUIDE.md)

---

## 🆘 Support

หากมีปัญหาหรือข้อสงสัย:
- 📧 Email: support@deliverygenie.com
- 📞 Tel: 02-XXX-XXXX
- 💬 Line: @deliverygenie

---

**Last Updated:** November 3, 2025
**Version:** 1.0.0
