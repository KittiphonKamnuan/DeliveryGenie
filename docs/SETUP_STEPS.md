# 🎯 Setup Steps for Your RDS Database

Your RDS endpoint: `deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com`

---

## ✅ Step 1: .env File Created

The `.env` file has been created with your actual RDS endpoint.

**Current password**: `DeliveryGenie2025!`

⚠️ If you used a different password when creating RDS, edit `.env` and update the `DATABASE_URL`

---

## 🔌 Step 2: Test Connection

Before deploying the schema, let's verify the connection works:

```bash
# Test connection using psql (if you have it installed)
psql -h deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d deliverygenie \
     -c "SELECT version();"

# You'll be prompted for password: DeliveryGenie2025!
```

### If psql is not installed:

**macOS:**
```bash
brew install postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

---

## 🛠️ Step 3: Enable PostGIS Extension

```bash
# Connect to database
psql -h deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d deliverygenie

# Inside psql, run:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Verify
SELECT PostGIS_Version();

# Exit
\q
```

---

## 🚀 Step 4: Deploy Schema with Prisma

```bash
# Make sure you're in the project directory
cd ~/Documents/Project/Delivery_Genie/delivery-genie-dashboard

# Install dependencies (if not already installed)
npm install

# Generate Prisma Client
npx prisma generate

# Deploy schema to RDS
npx prisma db push

# This will create all 20+ tables:
# ✅ customers, stores, products
# ✅ orders, order_items
# ✅ drivers, vehicles
# ✅ deliveries, routes, route_stops
# ✅ gps_trackings, traffic_data, weather_data
# ✅ priority_calculation_logs, priority_configs
# ✅ delivery_histories, performance_metrics
# ✅ system_logs, api_usages
```

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "deliverygenie"

🚀 Your database is now in sync with your Prisma schema. Done in XXXms

✔ Generated Prisma Client
```

---

## 🌱 Step 5: Seed Database with Sample Data

```bash
# Run seed script
npx ts-node prisma/seed.ts
```

Expected output:
```
🌱 Starting database seeding...

📊 Seeding Priority Configurations...
✅ Created configs: default, rush_hour

🛍️  Seeding Products...
✅ Created 12 products

🏪 Seeding Stores...
✅ Created 5 stores

🚗 Seeding Drivers...
✅ Created 3 drivers

🚛 Seeding Vehicles...
✅ Created 3 vehicles

👥 Seeding Customers...
✅ Created 3 customers

✨ Seeding completed successfully!
```

---

## ✅ Step 6: Verify Everything Works

### Option A: Use Prisma Studio (GUI)

```bash
npx prisma studio
```

This will open a web interface at http://localhost:5555 where you can:
- View all tables
- Browse data
- Edit records
- Run queries

### Option B: Use psql (Command Line)

```bash
# Connect to database
psql -h deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d deliverygenie
```

Inside psql:
```sql
-- List all tables
\dt

-- Check products
SELECT id, name, category, base_price FROM products LIMIT 5;

-- Check stores
SELECT name, city, latitude, longitude FROM stores;

-- Check drivers
SELECT first_name, last_name, rating, total_deliveries FROM drivers;

-- Test spatial query (find stores in Bangkok)
SELECT
  name,
  district,
  ST_AsText(location) as location_wkt
FROM stores
WHERE city = 'กรุงเทพมหานคร';

-- Check priority configs
SELECT config_name, weight_temperature, weight_expiration, is_active
FROM priority_configs;
```

---

## 🎨 Step 7: Start Development Server

```bash
# Start Next.js development server
npm run dev
```

Open: http://localhost:3000

---

## 🔒 Security: Update RDS Security Group

Make sure your RDS security group allows connections from your IP:

1. Go to **EC2 Console** → **Security Groups**
2. Find `deliverygenie-db-sg` (or the security group attached to your RDS)
3. Edit **Inbound rules**
4. Add rule:
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: My IP (or specific IP range)
   ```
5. Save rules

---

## 📊 Step 8: Test Priority Calculation API

Once your server is running, test the priority calculation:

```bash
curl -X POST http://localhost:3000/api/orders/calculate-priority \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [{
      "order_id": "TEST-001",
      "customer_priority": "urgent",
      "order_time": "2025-11-02T09:00:00Z",
      "delivery_window_end": "2025-11-02T09:30:00Z",
      "products": [{
        "product_id": "HOT-001",
        "name": "ข้าวกล่องหมูกระเพรา",
        "category": "hot_food",
        "price": 65,
        "quantity": 1,
        "expiration_hours": 3
      }]
    }]
  }'
```

Expected response:
```json
{
  "success": true,
  "total_orders": 1,
  "orders": [{
    "order_id": "TEST-001",
    "priority_score": 91.0,
    "priority_class": "critical",
    "suggested_delivery_order": 1,
    "breakdown": {
      "temperature": 30.0,
      "expiration": 25.0,
      "customer_priority": 15.0,
      "value": 6.0,
      "delivery_window": 13.5,
      "fragility": 1.5
    }
  }]
}
```

---

## 🐛 Troubleshooting

### Problem: "Connection timed out"

**Solution 1**: Check RDS Security Group
```bash
# Test if port 5432 is accessible
telnet deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com 5432

# If it hangs, update security group to allow your IP
```

**Solution 2**: Check RDS is available
- Go to RDS Console
- Verify status is "Available" (not "Stopped" or "Starting")

### Problem: "Password authentication failed"

**Solution**: Update .env with correct password
```bash
# Edit .env
nano .env

# Find DATABASE_URL and update password
# DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@..."
```

### Problem: "Database 'deliverygenie' does not exist"

**Solution**: Create database manually
```bash
# Connect to default postgres database
psql -h deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d postgres

# Create database
CREATE DATABASE deliverygenie;

# Exit and reconnect
\q
```

### Problem: "Prisma Client not generated"

**Solution**: Regenerate Prisma Client
```bash
npx prisma generate
```

---

## 💰 Cost Management Reminder

Your RDS instance is now running and will incur costs:

**Estimated cost**:
- db.t3.micro: ~$0.017/hour = ~$12/month (if running 24/7)

**To stop RDS when not in use**:
```bash
# Via AWS Console
RDS Console → Select instance → Actions → Stop

# Via AWS CLI
aws rds stop-db-instance --db-instance-identifier deliverygenie-db
```

⚠️ **Important**: AWS will auto-restart stopped RDS after 7 days!

**Monitor your budget** in Learner Lab dashboard regularly.

---

## ✅ Verification Checklist

- [ ] `.env` file created with correct endpoint
- [ ] Connection to RDS successful
- [ ] PostGIS extension enabled
- [ ] Schema deployed (20+ tables created)
- [ ] Sample data seeded
- [ ] Prisma Studio accessible
- [ ] Development server running
- [ ] Priority API working
- [ ] Security group configured

---

## 🎉 You're All Set!

Your DeliveryGenie database is now fully operational on AWS RDS!

**What you have:**
- ✅ PostgreSQL 15 with PostGIS
- ✅ 20+ tables with complete relationships
- ✅ Sample data (12 products, 5 stores, 3 drivers, 3 vehicles)
- ✅ Priority calculation system (6-factor algorithm)
- ✅ Ready for GPS tracking & route optimization
- ✅ Production-ready infrastructure

**Next steps:**
1. Add Google Maps API key to `.env`
2. Build route optimization features
3. Create dashboard UI
4. Implement real-time GPS tracking
5. Deploy to production

---

## 📚 Additional Resources

- **Prisma Studio**: http://localhost:5555 (after running `npx prisma studio`)
- **Development Server**: http://localhost:3000 (after running `npm run dev`)
- **Documentation**: See `prisma/DATABASE_SCHEMA.md` and `DATABASE_OVERVIEW.md`
- **AWS RDS Console**: https://console.aws.amazon.com/rds/

---

**Need help?** Check the troubleshooting section above or open an issue on GitHub!

🚀 Happy coding!
