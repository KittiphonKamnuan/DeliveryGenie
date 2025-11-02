# DeliveryGenie Database Setup

Complete guide for setting up and managing the DeliveryGenie database.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Edit .env with your database credentials
DATABASE_URL="postgresql://username:password@localhost:5432/deliverygenie"

# 4. Push schema to database
npx prisma db push

# 5. Generate Prisma Client
npx prisma generate

# 6. Seed database with sample data
npx ts-node prisma/seed.ts

# 7. Open Prisma Studio (Database GUI)
npx prisma studio
```

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Schema](#database-schema)
4. [Migrations](#migrations)
5. [Seeding](#seeding)
6. [Advanced Features](#advanced-features)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v7 or higher (for caching)

### Optional (Recommended)

- **PostGIS**: For geospatial queries
- **pgAdmin** or **DBeaver**: Database GUI tools
- **pg_cron**: For scheduled tasks
- **PgBouncer**: For connection pooling

---

## Installation

### 1. PostgreSQL Setup

#### macOS (Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb deliverygenie
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb deliverygenie
```

#### Docker
```bash
docker run --name deliverygenie-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=deliverygenie \
  -p 5432:5432 \
  -d postgres:14
```

### 2. PostGIS Extension (for spatial queries)

```bash
# macOS
brew install postgis

# Ubuntu
sudo apt install postgis postgresql-14-postgis-3

# Inside psql
psql -d deliverygenie
CREATE EXTENSION postgis;
```

### 3. Redis Setup

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Docker
docker run --name deliverygenie-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

---

## Database Schema

### Schema Overview

The database consists of 20+ tables organized into 10 logical groups:

```
📊 DeliveryGenie Schema
├── 1. Customer & Store Management (3 tables)
│   ├── customers
│   ├── stores
│   └── store_inventories
│
├── 2. Product Management (1 table)
│   └── products
│
├── 3. Order Management (2 tables)
│   ├── orders
│   └── order_items
│
├── 4. Driver & Vehicle (2 tables)
│   ├── drivers
│   └── vehicles
│
├── 5. Delivery & Routes (3 tables)
│   ├── deliveries
│   ├── routes
│   └── route_stops
│
├── 6. GPS Tracking (1 table)
│   └── gps_trackings (partitioned)
│
├── 7. Traffic & Weather (2 tables)
│   ├── traffic_data (partitioned)
│   └── weather_data
│
├── 8. Priority System (2 tables)
│   ├── priority_calculation_logs
│   └── priority_configs
│
├── 9. Analytics (2 tables)
│   ├── delivery_histories (partitioned)
│   └── performance_metrics
│
└── 10. System (2 tables)
    ├── system_logs
    └── api_usages
```

### Key Relationships

```
Customer → Orders → OrderItems → Products
             ↓
         Deliveries → Driver
             ↓         ↓
          Route  ←  Vehicle
             ↓
        RouteStops
             ↓
       GPSTracking
```

---

## Migrations

### Create Database Schema

```bash
# Push schema to database (development)
npx prisma db push

# Generate migration files (production)
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy
```

### Apply Advanced Indexes

```bash
# Run spatial indexes, composite indexes, etc.
psql -d deliverygenie -f prisma/migrations/001_advanced_indexes.sql
```

### Setup Partitioning

```bash
# Setup monthly/weekly/yearly partitions
psql -d deliverygenie -f prisma/migrations/002_partitioning.sql
```

### Reset Database (⚠️ Destructive)

```bash
# Drop all tables and recreate
npx prisma migrate reset

# Alternative: Manual drop
dropdb deliverygenie
createdb deliverygenie
npx prisma db push
```

---

## Seeding

### Run Seed Script

```bash
# TypeScript
npx ts-node prisma/seed.ts

# JavaScript
node prisma/seed.js
```

### What Gets Seeded

- ✅ **2 Priority Configurations**: default, rush_hour
- ✅ **12 Products**: Hot food, frozen, chilled, beverages, snacks, medicine
- ✅ **5 Stores**: Bangkok & vicinity locations
- ✅ **3 Drivers**: With ratings and performance metrics
- ✅ **3 Vehicles**: Motorcycle and vans with temperature zones
- ✅ **3 Customers**: Corporate, individual, hospital (urgent)

### Custom Seeding

Edit `prisma/seed.ts` to add your own data:

```typescript
const customProducts = [
  {
    sku: 'CUSTOM-001',
    name: 'My Custom Product',
    category: 'snack',
    base_price: 50,
    // ... other fields
  }
];

for (const product of customProducts) {
  await prisma.product.create({ data: product });
}
```

---

## Advanced Features

### 1. Spatial Queries (PostGIS)

```javascript
// Find nearest stores (within 5km)
const nearbyStores = await prisma.$queryRaw`
  SELECT *,
    ST_Distance(
      location::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
    ) / 1000 AS distance_km
  FROM stores
  WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
    5000
  )
  ORDER BY distance_km
  LIMIT 5
`;
```

### 2. Full-Text Search

```javascript
// Search orders
const results = await prisma.$queryRaw`
  SELECT *
  FROM orders
  WHERE search_vector @@ to_tsquery('simple', ${query})
  ORDER BY ts_rank(search_vector, to_tsquery('simple', ${query})) DESC
  LIMIT 20
`;
```

### 3. Priority Calculation

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function calculatePriority(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      order_items: {
        include: { product: true }
      }
    }
  });

  // Get active config
  const config = await prisma.priorityConfig.findFirst({
    where: { is_active: true }
  });

  // Calculate scores (6 factors)
  const tempScore = calculateTemperatureScore(order);
  const expScore = calculateExpirationScore(order);
  const custScore = calculateCustomerScore(order);
  const valueScore = calculateValueScore(order);
  const timeScore = calculateTimeWindowScore(order);
  const fragilityScore = calculateFragilityScore(order);

  // Weighted sum
  const priorityScore =
    tempScore * config.weight_temperature +
    expScore * config.weight_expiration +
    custScore * config.weight_customer +
    valueScore * config.weight_value +
    timeScore * config.weight_time_window +
    fragilityScore * config.weight_fragility;

  // Update order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      priority_score: priorityScore,
      priority_class: getPriorityClass(priorityScore),
      priority_breakdown: {
        temperature: tempScore,
        expiration: expScore,
        customer: custScore,
        value: valueScore,
        timeWindow: timeScore,
        fragility: fragilityScore
      }
    }
  });

  return priorityScore;
}
```

### 4. Route Optimization

```javascript
// Get optimal delivery sequence
async function optimizeRoute(orderIds: string[]) {
  // Fetch orders with priority scores
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    orderBy: { priority_score: 'desc' }
  });

  // Use Google Maps Directions API
  const waypoints = orders.map(o => ({
    lat: o.delivery_latitude,
    lng: o.delivery_longitude
  }));

  // Call optimization algorithm
  const optimizedRoute = await computeOptimalRoute(waypoints);

  // Save route
  const route = await prisma.route.create({
    data: {
      route_number: generateRouteNumber(),
      origin_store_id: storeId,
      route_date: new Date(),
      total_orders: orders.length,
      route_polyline: optimizedRoute.polyline,
      optimization_score: optimizedRoute.score
    }
  });

  return route;
}
```

---

## Performance Optimization

### 1. Connection Pooling

```javascript
// prisma/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 2. Query Optimization

```javascript
// ❌ BAD: N+1 queries
const orders = await prisma.order.findMany();
for (const order of orders) {
  const items = await prisma.orderItem.findMany({
    where: { order_id: order.id }
  });
}

// ✅ GOOD: Single query with includes
const orders = await prisma.order.findMany({
  include: {
    order_items: {
      include: { product: true }
    },
    customer: true
  }
});
```

### 3. Redis Caching

```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedStores() {
  const cached = await redis.get('stores:all');
  if (cached) return JSON.parse(cached);

  const stores = await prisma.store.findMany();
  await redis.setex('stores:all', 3600, JSON.stringify(stores)); // 1 hour TTL

  return stores;
}
```

### 4. Batch Operations

```javascript
// Batch insert GPS points
const gpsData = Array(1000).fill(null).map(() => ({
  driver_id: driverId,
  vehicle_id: vehicleId,
  latitude: randomLat(),
  longitude: randomLng(),
  timestamp: new Date()
}));

await prisma.gPSTracking.createMany({
  data: gpsData,
  skipDuplicates: true
});
```

---

## Troubleshooting

### Issue: "Can't reach database server"

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Test connection
psql -d deliverygenie -c "SELECT 1;"

# Check .env DATABASE_URL
echo $DATABASE_URL
```

### Issue: "Table does not exist"

```bash
# Regenerate Prisma Client
npx prisma generate

# Push schema
npx prisma db push
```

### Issue: "Out of memory" (GPS data)

```bash
# Enable partitioning
psql -d deliverygenie -f prisma/migrations/002_partitioning.sql

# Archive old data
npm run archive:gps
```

### Issue: Slow queries

```sql
-- Enable query logging
ALTER DATABASE deliverygenie SET log_statement = 'all';
ALTER DATABASE deliverygenie SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

---

## Backup & Restore

### Backup

```bash
# Full backup
pg_dump deliverygenie > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump deliverygenie | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup specific tables
pg_dump -t orders -t deliveries deliverygenie > orders_backup.sql
```

### Restore

```bash
# From SQL file
psql deliverygenie < backup_20250101.sql

# From compressed file
gunzip -c backup_20250101.sql.gz | psql deliverygenie
```

### Automated Backups (cron)

```bash
# Add to crontab -e
0 2 * * * pg_dump deliverygenie | gzip > /backups/deliverygenie_$(date +\%Y\%m\%d).sql.gz

# Retention: Delete backups older than 7 days
0 3 * * * find /backups -name "deliverygenie_*.sql.gz" -mtime +7 -delete
```

---

## Monitoring

### Query Performance

```bash
# Open Prisma Studio
npx prisma studio

# Enable query logging
DATABASE_URL="postgresql://...?log_queries=true"
```

### Database Size

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('deliverygenie'));

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Active Connections

```sql
SELECT
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = 'deliverygenie'
GROUP BY state;
```

---

## Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Manual**: https://www.postgresql.org/docs/
- **PostGIS Docs**: https://postgis.net/documentation/
- **Database Schema**: See `DATABASE_SCHEMA.md`

---

**Need Help?**
- GitHub Issues: https://github.com/KittiphonKamnuan/DeliveryGenie/issues
- Email: support@deliverygenie.com
