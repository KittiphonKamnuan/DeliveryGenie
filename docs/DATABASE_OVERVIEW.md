# 🗄️ DeliveryGenie Database Overview

> **AI-based Route Optimization for Last-Mile Delivery**
>
> Complete database architecture designed to handle 120K-300K orders/day with real-time GPS tracking, priority-based delivery sequencing, and route optimization.

---

## 📊 Quick Stats

```
Tables:           20+ tables across 10 domains
Daily Volume:     10-25 GB/day
Orders:           120K-300K/day
GPS Points:       22M points/day
Stores:           6,000+ 7-Eleven branches
Update Frequency: Real-time (10-15 sec GPS)
Retention:        3 years historical data
```

---

## 🏗️ Architecture Overview

### Schema Organization

```
┌─────────────────────────────────────────────────────────────┐
│                    DeliveryGenie Schema                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 1. Customer & Store Management (3 tables)               │
│     ├─ customers                                            │
│     ├─ stores (6,000+ branches)                             │
│     └─ store_inventories                                    │
│                                                             │
│  🛍️  2. Product Management (1 table)                        │
│     └─ products (with temperature categories)               │
│                                                             │
│  📋 3. Order Management (2 tables)                          │
│     ├─ orders (with priority scores)                        │
│     └─ order_items                                          │
│                                                             │
│  🚗 4. Driver & Vehicle Management (2 tables)               │
│     ├─ drivers                                              │
│     └─ vehicles (with temperature zones)                    │
│                                                             │
│  🗺️  5. Delivery & Route Management (3 tables)              │
│     ├─ deliveries                                           │
│     ├─ routes (optimized sequences)                         │
│     └─ route_stops                                          │
│                                                             │
│  📍 6. Real-time GPS Tracking (1 table)                     │
│     └─ gps_trackings (22M points/day, partitioned)          │
│                                                             │
│  🌤️  7. Traffic & Weather Data (2 tables)                   │
│     ├─ traffic_data (Google Maps API)                       │
│     └─ weather_data (กรมอุตุนิยมวิทยา)                      │
│                                                             │
│  ⭐ 8. Priority Calculation & Analytics (2 tables)          │
│     ├─ priority_calculation_logs                            │
│     └─ priority_configs (6-factor algorithm)                │
│                                                             │
│  📈 9. Historical Data & ML Training (2 tables)             │
│     ├─ delivery_histories (3 years, partitioned)            │
│     └─ performance_metrics                                  │
│                                                             │
│  ⚙️  10. System Configuration & Logs (2 tables)             │
│     ├─ system_logs                                          │
│     └─ api_usages                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Entity Relationship Diagram

### Core Entities Flow

```
┌─────────────┐
│  Customer   │
│  (100K-500K)│
└──────┬──────┘
       │ 1
       │ places
       │ ∞
┌──────▼──────┐       ┌──────────────┐
│    Order    │──────▶│  OrderItem   │
│  (36M-90M/y)│ 1   ∞ │              │
└──────┬──────┘       └──────┬───────┘
       │                     │ ∞
       │ 1                   │ links to
       │                     │ 1
┌──────▼──────┐       ┌──────▼───────┐
│  Delivery   │       │   Product    │
│             │       │  (10K-50K)   │
└──────┬──────┘       └──────────────┘
       │
       ├──────────────┬─────────────┬──────────────┐
       │ assigned     │ uses        │ follows      │
       │ to           │             │              │
┌──────▼──────┐┌──────▼──────┐┌────▼─────┐  ┌─────────────┐
│   Driver    ││   Vehicle   ││  Route   │  │    Store    │
│ (1K-5K)     ││ (1K-5K)     ││          │◀─│  (6,000+)   │
└──────┬──────┘└──────┬──────┘└────┬─────┘  └─────────────┘
       │              │             │
       └──────────────┴─────────────┘
                │ tracks
                │ ∞
         ┌──────▼──────────┐
         │  GPSTracking    │
         │  (22M/day)      │
         │  [Partitioned]  │
         └─────────────────┘
```

### Priority Calculation Flow

```
┌─────────────┐
│    Order    │
└──────┬──────┘
       │
       │ analyzed by
       │
       ▼
┌─────────────────────────────┐
│  Priority Calculation       │
│  (6 Factors)                │
│                             │
│  1. Temperature      30%    │
│  2. Expiration       25%    │
│  3. Customer Priority 15%   │
│  4. Order Value      10%    │
│  5. Time Window      15%    │
│  6. Fragility         5%    │
│                             │
│  Total Score: 0-100         │
└──────┬──────────────────────┘
       │
       │ results in
       │
       ▼
┌─────────────────────────────┐
│  Priority Class             │
│                             │
│  🔴 CRITICAL  (75-100)      │
│  🟠 HIGH      (60-74)       │
│  🔵 MEDIUM    (40-59)       │
│  🟢 LOW       (0-39)        │
└─────────────────────────────┘
       │
       │ determines
       │
       ▼
┌─────────────────────────────┐
│  Delivery Sequence          │
│  (Sorted by priority_score) │
└─────────────────────────────┘
```

---

## 🚀 Key Features

### 1. **Priority-Based Delivery Sequencing**

```sql
-- 6-Factor Priority Score (0-100)
Priority Score =
  (Temperature × 0.30) +      -- Highest weight
  (Expiration × 0.25) +       -- FEFO strategy
  (Customer Priority × 0.15) + -- VIP, urgent
  (Order Value × 0.10) +      -- Revenue impact
  (Delivery Window × 0.15) +  -- Time sensitivity
  (Fragility × 0.05)          -- Handling care
```

**Example Results:**
- 🔴 **91.0** → Hot food, urgent, <30 min window
- 🟠 **77.5** → Ice cream, VIP customer
- 🔵 **74.2** → Chilled sandwich, standard
- 🟢 **41.0** → Snacks, economy delivery

### 2. **Real-Time GPS Tracking**

```javascript
// 22 Million GPS points per day
// Update frequency: 10-15 seconds
// Partitioned by month
// Retention: 30 days (then archived to S3)

{
  driver_id: "uuid",
  vehicle_id: "uuid",
  latitude: 13.7563,
  longitude: 100.5018,
  speed: 45.5,        // km/h
  heading: 135,       // degrees
  accuracy: 10,       // meters
  battery_level: 85,  // %
  timestamp: "2025-11-02T14:30:00Z"
}
```

### 3. **Route Optimization**

```javascript
// Google Maps API integration
// Traffic-aware routing
// Multi-stop optimization
// Temperature zone constraints

Route {
  total_distance_km: 45.2,
  total_duration_min: 120,
  total_orders: 15,
  optimization_score: 92.5,
  stops: [
    { order: 1, priority: 91.0, eta: "14:30" },
    { order: 2, priority: 77.5, eta: "14:45" },
    { order: 3, priority: 74.2, eta: "15:00" },
    // ... 12 more stops
  ]
}
```

### 4. **Temperature Management**

```javascript
// Vehicle temperature zones
{
  vehicle_type: "van",
  temperature_zones: [
    { zone: "frozen", capacity: 100, temp: -18 },
    { zone: "chilled", capacity: 150, temp: 0-4 },
    { zone: "hot", capacity: 80, temp: 60-70 },
    { zone: "ambient", capacity: 200 }
  ]
}

// Product categories
hot_food  → 60-70°C  → Must deliver within 3 hours
frozen    → -18°C    → Up to 30 days
chilled   → 0-4°C    → Up to 8 hours
beverage  → 15-20°C  → Up to 1 year
snack     → Ambient  → Up to 6 months
```

### 5. **Data Volume Handling (5Vs)**

| Dimension | Strategy | Implementation |
|-----------|----------|----------------|
| **Volume** | 10-25 GB/day | Partitioning + Archival |
| **Velocity** | GPS every 10-15s | Queue-based processing (Bull) |
| **Variety** | Structured (80%), Semi-structured (20%) | PostgreSQL + JSON fields |
| **Veracity** | Validation rules + Outlier detection | GPS bounds, speed limits |
| **Value** | Priority calculation + Route optimization | 6-factor algorithm |

---

## 📈 Performance Optimizations

### 1. **Partitioning Strategy**

```sql
-- GPS Tracking: Monthly partitions
gps_trackings_2025_01
gps_trackings_2025_02
gps_trackings_2025_03
...

-- Delivery History: Yearly partitions
delivery_histories_2023
delivery_histories_2024
delivery_histories_2025

-- Traffic Data: Weekly partitions
traffic_data_2025_01  (Week 1)
traffic_data_2025_02  (Week 2)
...
```

### 2. **Indexing Strategy**

```sql
-- Composite indexes for common queries
idx_orders_priority_date (priority_score DESC, delivery_date)
idx_deliveries_status_driver_date (delivery_status, driver_id, created_at)

-- Partial indexes for active records only
idx_orders_active WHERE order_status IN ('pending', 'assigned')
idx_drivers_active WHERE status = 'active'

-- Spatial indexes (PostGIS)
idx_customers_location USING GIST(location)
idx_stores_location USING GIST(location)

-- Full-text search indexes
idx_orders_search USING GIN(search_vector)
```

### 3. **Caching Strategy (Redis)**

```yaml
Cache Layers:
  traffic:       5 min TTL   (high volatility)
  weather:       15 min TTL  (moderate volatility)
  stores:        1 hour TTL  (low volatility)
  products:      1 hour TTL  (low volatility)
  priority_cfg:  24 hours    (static)
```

### 4. **Archival Strategy**

```
┌─────────────┐  30 days   ┌─────────────┐  90 days   ┌─────────────┐
│  Hot Data   │─────────→  │  Warm Data  │─────────→  │  Cold Data  │
│ PostgreSQL  │            │ PostgreSQL  │            │   AWS S3    │
│  (Active)   │            │ (Archived)  │            │  (Parquet)  │
└─────────────┘            └─────────────┘            └─────────────┘
```

---

## 🔐 Security & Compliance

### Data Protection

- ✅ **Encryption at rest**: PostgreSQL + AWS RDS encryption
- ✅ **Encryption in transit**: SSL/TLS connections
- ✅ **Access control**: Role-based permissions (RBAC)
- ✅ **Audit trail**: All priority calculations logged
- ✅ **Data retention**: GDPR-compliant (3 years max)
- ✅ **PII protection**: Customer data encrypted

### API Security

- ✅ Rate limiting: 2,500 requests/day (Google Maps)
- ✅ JWT authentication
- ✅ CORS configuration
- ✅ SQL injection prevention (Prisma ORM)

---

## 📊 Sample Queries

### Get High-Priority Pending Orders

```javascript
const urgentOrders = await prisma.order.findMany({
  where: {
    order_status: 'pending',
    priority_class: { in: ['critical', 'high'] }
  },
  orderBy: { priority_score: 'desc' },
  take: 50,
  include: {
    order_items: {
      include: { product: true }
    },
    customer: true
  }
});
```

### Find Nearest Stores (5km radius)

```sql
SELECT *,
  ST_Distance(
    location::geography,
    ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326)::geography
  ) / 1000 AS distance_km
FROM stores
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326)::geography,
  5000
)
ORDER BY distance_km
LIMIT 5;
```

### Get Driver Performance Metrics

```javascript
const metrics = await prisma.performanceMetric.findMany({
  where: {
    entity_type: 'driver',
    entity_id: driverId,
    metric_date: {
      gte: new Date('2025-01-01'),
      lte: new Date('2025-12-31')
    }
  },
  orderBy: { metric_date: 'asc' }
});

// Calculate annual stats
const annual = {
  total_deliveries: metrics.reduce((sum, m) => sum + m.total_deliveries, 0),
  success_rate: metrics.reduce((sum, m) => sum + m.successful, 0) /
                metrics.reduce((sum, m) => sum + m.total_deliveries, 0),
  on_time_rate: metrics.reduce((sum, m) => sum + m.on_time, 0) /
                metrics.reduce((sum, m) => sum + m.total_deliveries, 0),
  avg_delay: metrics.reduce((sum, m) => sum + (m.avg_delay_min || 0), 0) / metrics.length
};
```

---

## 🛠️ Setup Instructions

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/KittiphonKamnuan/DeliveryGenie.git
cd delivery-genie-dashboard

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 4. Setup database
npx prisma db push
npx prisma generate

# 5. Seed data
npx ts-node prisma/seed.ts

# 6. Run advanced setup (optional)
psql -d deliverygenie -f prisma/migrations/001_advanced_indexes.sql
psql -d deliverygenie -f prisma/migrations/002_partitioning.sql

# 7. Start application
npm run dev

# 8. Open Prisma Studio
npx prisma studio
```

### Production Setup

```bash
# 1. Use production database
DATABASE_URL="postgresql://user:pass@aws-rds-endpoint/deliverygenie"

# 2. Run migrations (not db push)
npx prisma migrate deploy

# 3. Setup connection pooling (PgBouncer)
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/deliverygenie"

# 4. Enable monitoring
# - CloudWatch for RDS
# - Redis for caching
# - Sentry for error tracking

# 5. Setup automated backups
# - Daily full backups
# - Hourly WAL archiving
# - Monthly archival to S3
```

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `schema.prisma` | Complete database schema (20+ tables) |
| `DATABASE_SCHEMA.md` | Detailed documentation (50+ pages) |
| `seed.ts` | Sample data seeding script |
| `001_advanced_indexes.sql` | Performance indexes (spatial, full-text) |
| `002_partitioning.sql` | Time-based partitioning setup |
| `README.md` | Setup & troubleshooting guide |
| `.env.example` | Environment variables template |

---

## 🎯 Business Impact

### Expected ROI

```
Cost Savings:
├─ Fuel efficiency:      -20%  (~฿10M/year)
├─ Delivery time:        -30%  (~฿15M/year)
└─ Failed deliveries:    -50%  (~฿5M/year)

Revenue Increase:
├─ Order volume:         +15%  (~฿50M/year)
└─ Customer retention:   +25%  (~฿20M/year)

Total Impact: ~฿100M/year
```

### KPIs

- ⏱️ **Delivery time**: Target -30% reduction
- ⛽ **Fuel consumption**: Target -20% reduction
- ⭐ **Customer satisfaction**: Target >90% on-time delivery
- 📊 **Order capacity**: Support 300K orders/day
- 🎯 **Priority accuracy**: >95% correct classification

---

## 📞 Support

- **GitHub**: https://github.com/KittiphonKamnuan/DeliveryGenie
- **Documentation**: See `prisma/DATABASE_SCHEMA.md`
- **Issues**: https://github.com/KittiphonKamnuan/DeliveryGenie/issues
- **Email**: support@deliverygenie.com

---

**Version**: 1.0
**Last Updated**: November 2, 2025
**Maintained By**: DeliveryGenie Team
**License**: MIT
