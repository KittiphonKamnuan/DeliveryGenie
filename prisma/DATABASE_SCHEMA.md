# DeliveryGenie Database Schema Documentation

## Overview

This document provides comprehensive documentation for the DeliveryGenie database schema, designed to handle AI-based route optimization for last-mile delivery.

## Schema Architecture

### 10 Major Components

```
┌─────────────────────────────────────────────────────────────┐
│                    DeliveryGenie Schema                     │
├─────────────────────────────────────────────────────────────┤
│  1. Customer & Store Management                             │
│  2. Product Management                                      │
│  3. Order Management                                        │
│  4. Driver & Vehicle Management                             │
│  5. Delivery & Route Management                             │
│  6. Real-time GPS Tracking                                  │
│  7. Traffic & Weather Data                                  │
│  8. Priority Calculation & Analytics                        │
│  9. Historical Data & ML Training                           │
│  10. System Configuration & Logs                            │
└─────────────────────────────────────────────────────────────┘
```

## Entity Relationship Diagram (ERD)

```
┌──────────────┐         ┌──────────────┐
│   Customer   │─────────│    Order     │
└──────────────┘ 1    ∞  └──────────────┘
                              │ 1
                              │
                              │ ∞
                        ┌──────────────┐        ┌──────────────┐
                        │  OrderItem   │────────│   Product    │
                        └──────────────┘ ∞    1 └──────────────┘
                              │                       │
                              │                       │
┌──────────────┐              │                       │
│   Delivery   │──────────────┘                       │
└──────────────┘ 1                                    │
       │                                              │
       ├─────────────┬──────────────┬─────────────────┘
       │ 1           │ 1            │ ∞
       │             │              │
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    Driver    │ │   Vehicle    │ │    Store     │
└──────────────┘ └──────────────┘ └──────────────┘
       │             │               │
       │             │               │
       └─────────────┴───────────────┤
                     ∞               │ 1
                ┌──────────────┐    │
                │ GPSTracking  │    │
                └──────────────┘    │
                                    │
                        ┌───────────┴────────┐
                        │       Route        │
                        └────────────────────┘
                               │ 1
                               │
                               │ ∞
                        ┌──────────────┐
                        │  RouteStop   │
                        └──────────────┘
```

## Table Details

### 1. Customer & Store Management (3 tables)

#### `customers`
- **Purpose**: Store customer information and delivery preferences
- **Volume**: ~100K-500K records
- **Key Indexes**: phone, lat/lng, priority_level

#### `stores`
- **Purpose**: 6,000+ 7-Eleven branches in Bangkok & vicinity
- **Volume**: ~6,000 records
- **Key Indexes**: lat/lng, city/district, is_active
- **Special**: GeoJSON support for map rendering

#### `store_inventories`
- **Purpose**: Track product stock at each branch
- **Volume**: ~6,000 stores × 1,000 products = 6M records
- **Key Indexes**: store_id, product_id, composite unique

---

### 2. Product Management (1 table)

#### `products`
- **Purpose**: Product catalog with temperature requirements
- **Volume**: ~10K-50K SKUs
- **Key Fields**:
  - `category`: hot_food, frozen, chilled, beverage, snack, medicine
  - `temperature_requirement`: hot, frozen, chilled, cool, ambient
  - `typical_expiration_hours`: For priority calculation
  - `is_fragile`: Affects handling priority

**Temperature Categories:**
```
hot_food  → 60-70°C  → Score: 100 (30% weight)
frozen    → -18°C    → Score: 90
chilled   → 0-4°C    → Score: 75
beverage  → 15-20°C  → Score: 40
snack     → Ambient  → Score: 20
medicine  → Ambient  → Score: 60
```

---

### 3. Order Management (2 tables)

#### `orders`
- **Purpose**: Customer orders with priority scores
- **Volume**: 120K-300K orders/day = 36M-90M/year
- **Key Fields**:
  - `priority_score`: 0-100 (calculated)
  - `priority_class`: critical | high | medium | low
  - `priority_breakdown`: JSON with 6-factor scores
  - `order_status`: pending → assigned → in_transit → delivered

**Order Status Flow:**
```
pending → assigned → in_transit → delivered
   ↓         ↓           ↓
cancelled  failed    failed
```

#### `order_items`
- **Purpose**: Line items with expiration tracking
- **Volume**: ~3-5 items per order = 108M-450M records/year
- **Key Fields**:
  - `expiration_datetime`: Actual expiry (not typical)
  - `temperature_zone`: For vehicle compartment assignment

---

### 4. Driver & Vehicle Management (2 tables)

#### `drivers`
- **Purpose**: Driver profiles and performance metrics
- **Volume**: ~1,000-5,000 drivers
- **Key Metrics**:
  - `rating`: Customer satisfaction (1-5)
  - `total_deliveries`: Lifetime count
  - `on_time_rate`: % delivered within time window

#### `vehicles`
- **Purpose**: Fleet management with temperature zones
- **Volume**: ~1,000-5,000 vehicles
- **Key Fields**:
  - `temperature_zones`: JSON array `[{"zone": "hot", "capacity": 50}]`
  - `fuel_efficiency`: For cost optimization (km/liter)

---

### 5. Delivery & Route Management (3 tables)

#### `deliveries`
- **Purpose**: Actual delivery execution tracking
- **Volume**: Same as orders (~36M-90M/year)
- **Performance Fields**:
  - `estimated_distance_km` vs `actual_distance_km`
  - `planned_arrival` vs `actual_arrival`
  - `delay_minutes`: For KPI tracking

#### `routes`
- **Purpose**: Optimized multi-stop delivery routes
- **Volume**: ~10K-50K routes/day
- **Key Fields**:
  - `route_polyline`: Encoded polyline from Google Maps
  - `optimization_score`: Algorithm performance metric
  - `google_route_token`: For Navigation SDK

#### `route_stops`
- **Purpose**: Waypoints in optimized sequence
- **Volume**: ~5-20 stops per route = 50K-1M records/day
- **Key Fields**:
  - `stop_order`: Sequence number (1, 2, 3...)
  - `stop_type`: pickup | delivery | waypoint

---

### 6. Real-time GPS Tracking (1 table)

#### `gps_trackings`
- **Purpose**: Real-time vehicle location (22M points/day)
- **Volume**: HIGH - Requires partitioning
- **Update Frequency**: Every 10-15 seconds
- **Retention**: 30 days in DB, then archive to S3

**Partitioning Strategy:**
```sql
-- Monthly partitions
gps_trackings_2025_01
gps_trackings_2025_02
gps_trackings_2025_03
```

**Data Fields:**
- Position: latitude, longitude, altitude
- Movement: speed, heading, is_moving
- Quality: accuracy, battery_level

---

### 7. Traffic & Weather Data (2 tables)

#### `traffic_data`
- **Purpose**: Google Maps API traffic conditions
- **API Limit**: 2,500 requests/day
- **Cache TTL**: 5 minutes (Redis)
- **Volume**: ~50K-100K records/day
- **Retention**: 7 days

**Traffic Conditions:**
```
light       → Green  → 0-20% delay
moderate    → Yellow → 20-40% delay
heavy       → Orange → 40-70% delay
very_heavy  → Red    → >70% delay
```

#### `weather_data`
- **Purpose**: Weather impact on delivery time
- **Source**: กรมอุตุนิยมวิทยา
- **Update**: Every 10-15 minutes
- **Volume**: ~100-500 records/day
- **Impact**: Rain → +15-30% delivery time

---

### 8. Priority Calculation & Analytics (2 tables)

#### `priority_calculation_logs`
- **Purpose**: Audit trail of priority scores
- **Volume**: 1 log per order = 36M-90M/year
- **Key Fields**:
  - `temperature_score`: 30% weight
  - `expiration_score`: 25% weight
  - `customer_score`: 15% weight
  - `value_score`: 10% weight
  - `time_window_score`: 15% weight
  - `fragility_score`: 5% weight

**Priority Calculation Formula:**
```
Priority Score =
  (Temperature × 0.30) +
  (Expiration × 0.25) +
  (Customer Priority × 0.15) +
  (Order Value × 0.10) +
  (Delivery Window × 0.15) +
  (Fragility × 0.05)
```

#### `priority_configs`
- **Purpose**: Admin-adjustable weight configurations
- **Volume**: ~5-10 configs (default, rush_hour, weekend, etc.)
- **Key Fields**:
  - `weight_*`: Must sum to 1.0
  - `thresholds`: JSON defining score ranges

---

### 9. Historical Data & Analytics (2 tables)

#### `delivery_histories`
- **Purpose**: 3 years of data for ML training
- **Volume**: ~30M-100M records
- **Use Cases**:
  - Traffic pattern prediction
  - ETA accuracy improvement
  - Demand forecasting

**ML Features:**
- Temporal: day_of_week, hour_of_day
- Spatial: origin/dest coordinates, district
- Conditions: traffic, weather, temperature
- Performance: on_time, delay_minutes

#### `performance_metrics`
- **Purpose**: Pre-aggregated KPIs for dashboard
- **Volume**: ~100K records
- **Aggregation Types**:
  - Daily, weekly, monthly
  - By driver, vehicle, route
  - Success rate, on-time rate, fuel efficiency

---

### 10. System Configuration & Logs (2 tables)

#### `system_logs`
- **Purpose**: Error tracking and debugging
- **Volume**: Variable (5-20 GB/day during issues)
- **Log Levels**: info | warning | error | critical
- **Retention**: 90 days

#### `api_usages`
- **Purpose**: Track API rate limits and costs
- **Monitored APIs**:
  - Google Maps Directions: 2,500 req/day
  - Google Maps Geocoding: 1,000 req/day
  - Weather API: Unlimited (gov't)

---

## Data Volume Summary (5Vs Analysis)

### Volume
```
Daily Data Generation:
├─ GPS Tracking:        ~22M points      (~5-10 GB)
├─ Orders:              120K-300K        (~500 MB)
├─ Traffic Data:        50K-100K         (~50-100 MB)
├─ Weather Data:        100-500          (~1 MB)
└─ Application Logs:    Variable         (~5-20 GB)

Total: ~10-25 GB/day
```

### Velocity
```
Real-time:
├─ GPS Updates:         Every 10-15 sec
├─ Order Status:        Real-time events
└─ Traffic Updates:     Every 2-5 min

Near Real-time:
├─ Priority Calc:       < 30 sec
└─ Route Optimization:  < 60 sec

Batch:
├─ Daily Reports:       02:00 AM
├─ ML Training:         Weekly
└─ Data Archival:       Monthly
```

### Variety
```
Structured (80%):
├─ PostgreSQL Tables:   Orders, Products, Customers
└─ Relational Data:     Foreign keys, indexes

Semi-structured (20%):
├─ JSON Fields:         priority_breakdown, route_geometry
├─ API Responses:       Google Maps, Weather
└─ GPS Streams:         Location data

Unstructured (<1%):
├─ Images:              Delivery proofs
└─ Text:                Customer notes, driver feedback
```

### Veracity (Data Quality)

**Validation Rules:**
```javascript
// GPS Coordinates
latitude:  13-19   (Thailand bounds)
longitude: 97-106

// Speed Validation
speed: < 120 km/h  (reject outliers)

// Time Windows
delivery_window: > order_time
estimated_arrival: within window ± 30 min
```

**Quality Checks:**
- Duplicate detection
- Null value handling
- Referential integrity
- Business rule validation

### Value (Business Impact)

**Expected ROI:**
```
Cost Savings:
├─ Fuel:           -20%    (~฿10M/year)
├─ Time:           -30%    (~฿15M/year)
└─ Failed Orders:  -50%    (~฿5M/year)

Revenue Increase:
├─ More Orders:    +15%    (~฿50M/year)
└─ Customer LTV:   +25%    (~฿20M/year)

Total Impact: ~฿100M/year
```

---

## Index Strategy

### Primary Indexes (Auto-created)
```sql
-- All tables have @id with UUID
-- All @unique fields have indexes
```

### Performance Indexes
```sql
-- High-frequency queries
CREATE INDEX idx_orders_priority_delivery ON orders(priority_score DESC, delivery_date);
CREATE INDEX idx_gps_driver_time ON gps_trackings(driver_id, timestamp DESC);
CREATE INDEX idx_deliveries_status_date ON deliveries(delivery_status, created_at);

-- Spatial indexes (PostGIS extension)
CREATE INDEX idx_customers_location ON customers USING GIST(ll_to_earth(latitude, longitude));
CREATE INDEX idx_stores_location ON stores USING GIST(ll_to_earth(latitude, longitude));
```

### Partial Indexes
```sql
-- Only index active records
CREATE INDEX idx_active_drivers ON drivers(status) WHERE status = 'active';
CREATE INDEX idx_pending_orders ON orders(order_status) WHERE order_status = 'pending';
```

---

## Partitioning Strategy

### Time-based Partitioning

#### GPS Tracking (Monthly)
```sql
-- Parent table
CREATE TABLE gps_trackings (...) PARTITION BY RANGE (recorded_date);

-- Child partitions
CREATE TABLE gps_trackings_2025_01 PARTITION OF gps_trackings
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE gps_trackings_2025_02 PARTITION OF gps_trackings
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

#### Delivery History (Yearly)
```sql
CREATE TABLE delivery_histories (...) PARTITION BY RANGE (delivery_date);

CREATE TABLE delivery_histories_2025 PARTITION OF delivery_histories
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

---

## Archival Strategy

### Data Lifecycle

```
┌─────────────┐    30 days    ┌─────────────┐    90 days    ┌─────────────┐
│  Hot Data   │──────────────→│  Warm Data  │──────────────→│  Cold Data  │
│ PostgreSQL  │               │ PostgreSQL  │               │  AWS S3     │
│  (Active)   │               │ (Archived)  │               │ (Parquet)   │
└─────────────┘               └─────────────┘               └─────────────┘
     ↑                              ↑                              ↑
     │                              │                              │
GPS Tracking                  System Logs                  Delivery History
Traffic Data                  API Logs                     Old GPS Data
```

### Archive Script Example
```sql
-- Move old GPS data to S3
COPY (
  SELECT * FROM gps_trackings
  WHERE recorded_date < NOW() - INTERVAL '30 days'
) TO PROGRAM 'aws s3 cp - s3://deliverygenie/archive/gps/$(date +%Y%m).parquet';

-- Delete archived data
DELETE FROM gps_trackings
WHERE recorded_date < NOW() - INTERVAL '30 days';
```

---

## Caching Strategy

### Redis Cache Layers

```
┌──────────────────────────────────────────┐
│          Application Layer               │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│         Redis Cache (L1)                 │
│  - Traffic: 5 min TTL                    │
│  - Weather: 15 min TTL                   │
│  - Stores: 1 hour TTL                    │
│  - Products: 1 hour TTL                  │
└──────────────────┬───────────────────────┘
                   ↓ (cache miss)
┌──────────────────────────────────────────┐
│         PostgreSQL (L2)                  │
└──────────────────────────────────────────┘
```

### Cache Keys
```
traffic:{lat1},{lng1}:{lat2},{lng2}      → 5 min
weather:bangkok                           → 15 min
store:{store_id}                         → 1 hour
product:{sku}                            → 1 hour
priority_config:default                  → 24 hours
```

---

## Query Optimization Tips

### 1. Use Composite Indexes
```sql
-- BAD: Two separate queries
WHERE order_status = 'pending'
AND delivery_date = '2025-01-15'

-- GOOD: Single composite index
CREATE INDEX idx_order_status_date ON orders(order_status, delivery_date);
```

### 2. Avoid N+1 Queries
```javascript
// BAD: N+1 queries
const orders = await prisma.order.findMany();
for (const order of orders) {
  const items = await prisma.orderItem.findMany({
    where: { order_id: order.id }
  });
}

// GOOD: Single query with join
const orders = await prisma.order.findMany({
  include: { order_items: true }
});
```

### 3. Use Materialized Views for Reports
```sql
-- Pre-calculate daily metrics
CREATE MATERIALIZED VIEW daily_performance AS
SELECT
  DATE(created_at) as report_date,
  COUNT(*) as total_orders,
  AVG(delay_minutes) as avg_delay,
  SUM(total_amount) as revenue
FROM orders
GROUP BY DATE(created_at);

-- Refresh nightly
REFRESH MATERIALIZED VIEW daily_performance;
```

---

## Connection Pooling

### PgBouncer Configuration
```ini
[databases]
deliverygenie = host=localhost port=5432 dbname=deliverygenie

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 5
```

### Prisma Configuration
```javascript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pooling
  connection_limit = 10
  pool_timeout = 20
}
```

---

## Backup Strategy

### Automated Backups

```bash
# Full backup (daily)
pg_dump deliverygenie | gzip > backup_$(date +%Y%m%d).sql.gz

# Incremental backup (hourly) using WAL
pg_basebackup -D /backup/base -Ft -z -P

# Retention policy
Daily:   Keep 7 days
Weekly:  Keep 4 weeks
Monthly: Keep 12 months
```

### Point-in-Time Recovery (PITR)
```sql
-- Enable WAL archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
wal_level = replica

-- Restore to specific time
pg_restore --target-time '2025-01-15 14:30:00'
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

```yaml
Database Health:
  - Connection count: < 80% of max
  - Query latency: p95 < 500ms
  - Disk usage: < 80%
  - Replication lag: < 1 second

Table-specific:
  - orders: INSERT rate (orders/sec)
  - gps_trackings: Partition size
  - deliveries: Failed delivery rate
  - api_usages: Daily quota usage

Performance:
  - Cache hit ratio: > 90%
  - Index usage: > 95% of queries
  - Slow queries: < 1% of total
```

### Alert Thresholds
```
CRITICAL:
  - Database CPU > 90% for 5 min
  - Disk space > 90%
  - Replication stopped

WARNING:
  - Query latency > 1s
  - API quota > 80%
  - Failed deliveries > 5%
```

---

## Security Best Practices

### 1. Encryption
```sql
-- At rest: PostgreSQL + AWS RDS encryption
-- In transit: SSL/TLS connections
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### 2. Access Control
```sql
-- Principle of least privilege
CREATE ROLE app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

CREATE ROLE app_readwrite;
GRANT SELECT, INSERT, UPDATE ON orders, deliveries TO app_readwrite;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readwrite;
```

### 3. SQL Injection Prevention
```javascript
// BAD: String concatenation
prisma.$executeRaw(`SELECT * FROM orders WHERE id = ${orderId}`);

// GOOD: Parameterized queries
prisma.$executeRaw`SELECT * FROM orders WHERE id = ${orderId}`;
```

---

## Migration Guide

### Initial Setup
```bash
# 1. Install dependencies
npm install prisma @prisma/client

# 2. Initialize Prisma
npx prisma init

# 3. Create .env file
DATABASE_URL="postgresql://user:password@localhost:5432/deliverygenie"

# 4. Push schema to database
npx prisma db push

# 5. Generate Prisma Client
npx prisma generate

# 6. Open Prisma Studio
npx prisma studio
```

### Adding New Fields
```bash
# 1. Edit schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_new_field

# 3. Apply migration
npx prisma migrate deploy

# 4. Regenerate client
npx prisma generate
```

---

## Performance Benchmarks

### Expected Query Performance

| Query Type | Target | Example |
|------------|--------|---------|
| Simple SELECT by ID | < 5ms | Get order by ID |
| JOIN 2-3 tables | < 50ms | Order with items & customer |
| Aggregation | < 200ms | Daily metrics |
| Full-text search | < 100ms | Search orders |
| Geospatial | < 50ms | Find nearest stores |
| Complex analytics | < 2s | Route optimization |

---

## Troubleshooting

### Common Issues

#### Issue: Slow GPS Inserts
```sql
-- Solution: Batch inserts
INSERT INTO gps_trackings (driver_id, latitude, longitude, ...)
VALUES
  (uuid1, 13.7, 100.5, ...),
  (uuid2, 13.8, 100.6, ...),
  ... (1000 rows)
ON CONFLICT DO NOTHING;
```

#### Issue: Large Table Scans
```sql
-- Check query plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE delivery_date > '2025-01-01';

-- Add missing index
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
```

#### Issue: Connection Pool Exhausted
```javascript
// Solution: Use connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error'],
});
```

---

## Further Reading

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostGIS Spatial Queries](https://postgis.net/documentation/)
- [AWS RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)

---

**Last Updated**: November 2, 2025
**Schema Version**: 1.0
**Maintained By**: DeliveryGenie Team
