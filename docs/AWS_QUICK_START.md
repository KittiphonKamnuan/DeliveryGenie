# ⚡ DeliveryGenie AWS Quick Start

> Get your DeliveryGenie database running on AWS RDS in under 15 minutes!

---

## 🎯 Overview

This guide will help you deploy the DeliveryGenie PostgreSQL database to AWS RDS using your Learner Lab environment.

**What you'll get:**
- ✅ PostgreSQL 15 database on AWS RDS
- ✅ PostGIS extension for spatial queries
- ✅ 20+ tables with complete schema
- ✅ Sample data (stores, products, drivers, etc.)
- ✅ Ready for production use

---

## 📋 Prerequisites

Before starting, make sure you have:

- ✅ AWS Learner Lab access
- ✅ `labsuser.pem` key downloaded
- ✅ Node.js 18+ installed locally
- ✅ Budget remaining in your lab account
- ✅ 15-20 minutes of time

---

## 🚀 Quick Start (3 Options)

### Option 1: Automated Script (Easiest) ⭐

```bash
# 1. Navigate to project
cd ~/Documents/Project/Delivery_Genie/delivery-genie-dashboard

# 2. Run setup script
./scripts/setup-rds.sh

# 3. Follow the prompts!
```

The script will:
- ✅ Install PostgreSQL client
- ✅ Connect to your RDS instance
- ✅ Create database and enable PostGIS
- ✅ Deploy schema with Prisma
- ✅ Seed sample data
- ✅ Generate `.env` file

---

### Option 2: AWS Console + Local Setup

#### Step 1: Create RDS Instance (AWS Console)

1. Open **RDS Console**: https://console.aws.amazon.com/rds/
2. Click **Create database**
3. Configure:

```yaml
Engine: PostgreSQL 15.5
Template: Dev/Test
DB identifier: deliverygenie-db
Master username: postgres
Master password: DeliveryGenie2025!
Instance type: db.t3.micro
Storage: 20 GB (gp2)
Public access: Yes
Initial database: deliverygenie
```

4. **Important**:
   - ⚠️ **Disable** Enhanced monitoring
   - ⚠️ **Disable** automated backups (to save costs)

5. Click **Create database**
6. ⏳ Wait 5-10 minutes
7. Copy **Endpoint**: `deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com`

#### Step 2: Configure Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Find `deliverygenie-db-sg`
3. Add inbound rule:

```yaml
Type: PostgreSQL
Port: 5432
Source: My IP
```

#### Step 3: Setup Locally

```bash
# Navigate to project
cd ~/Documents/Project/Delivery_Genie/delivery-genie-dashboard

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:DeliveryGenie2025!@deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com:5432/deliverygenie?schema=public"
EOF

# Replace xxxxx with your actual RDS endpoint!
nano .env

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Deploy schema
npx prisma db push

# Seed data
npx ts-node prisma/seed.ts

# ✅ Done! Open Prisma Studio
npx prisma studio
```

---

### Option 3: Via EC2 Jump Server

If you need to access RDS from a private subnet:

#### Step 1: Launch EC2 Instance

```yaml
AMI: Amazon Linux 2023
Instance type: t2.micro
Key pair: vockey
Security group: Allow SSH (port 22) from My IP
IAM role: LabInstanceProfile
```

#### Step 2: SSH to EC2

```bash
# Set permissions
chmod 400 labsuser.pem

# Connect
ssh -i labsuser.pem ec2-user@<EC2-PUBLIC-IP>
```

#### Step 3: Setup on EC2

```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs postgresql15

# Upload project files
# (From local machine in another terminal)
scp -i labsuser.pem -r prisma ec2-user@<EC2-IP>:~/
scp -i labsuser.pem package*.json ec2-user@<EC2-IP>:~/

# Back on EC2: Run setup script
cd ~
./scripts/setup-rds.sh
```

---

## 🔧 Helper Scripts

We've created useful scripts to manage your database:

### Connect to RDS

```bash
# Quick connect
./scripts/connect-rds.sh

# Runs: psql to your RDS instance
```

### Backup Database

```bash
# Create backup
./scripts/backup-rds.sh

# Creates: ./backups/deliverygenie_YYYYMMDD_HHMMSS.sql.gz
```

### Restore Database

```bash
# Restore from backup
gunzip -c backups/deliverygenie_20250102_143000.sql.gz | \
  psql -h <RDS-ENDPOINT> -U postgres -d deliverygenie
```

---

## 📊 Verify Installation

### Check Tables

```bash
# Connect to database
./scripts/connect-rds.sh

# Inside psql:
\dt  -- List all tables

# Should see 20+ tables:
# customers, stores, products, orders, drivers, vehicles, etc.
```

### Check Sample Data

```sql
-- Products
SELECT COUNT(*) FROM products;
-- Expected: 12

-- Stores
SELECT COUNT(*) FROM stores;
-- Expected: 5

-- Drivers
SELECT COUNT(*) FROM drivers;
-- Expected: 3

-- Test spatial query
SELECT name, latitude, longitude
FROM stores
ORDER BY name
LIMIT 3;
```

### Test PostGIS

```sql
-- Check PostGIS version
SELECT PostGIS_Version();

-- Find stores within 5km
SELECT
  name,
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
ORDER BY distance_km;
```

---

## 🎨 Next Steps

### 1. Update Configuration

Edit `.env` to add your API keys:

```bash
# Google Maps API
GOOGLE_MAPS_API_KEY="your_actual_api_key"

# Weather API
WEATHER_API_KEY="your_weather_api_key"
```

### 2. Start Development Server

```bash
npm run dev

# Open: http://localhost:3000
```

### 3. Open Prisma Studio

```bash
npx prisma studio

# Open: http://localhost:5555
```

### 4. Run Priority Calculation

```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/orders/calculate-priority \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [{
      "order_id": "test-001",
      "customer_priority": "urgent",
      "order_time": "2025-11-02T09:00:00Z",
      "delivery_window_end": "2025-11-02T09:30:00Z",
      "products": [{
        "product_id": "P001",
        "name": "ข้าวกล่องหมูกระเพรา",
        "category": "hot_food",
        "price": 65,
        "quantity": 1,
        "expiration_hours": 3
      }]
    }]
  }'
```

---

## 💰 Cost Management

### Monitor Your Budget

```
⚠️ IMPORTANT: Monitor your Learner Lab budget!

Estimated costs:
- RDS db.t3.micro (20 GB): ~$12/month (24/7)
- EC2 t2.micro: ~$8/month (24/7)

Tips to save money:
1. Stop RDS when not in use
2. Stop EC2 instance after setup
3. Delete resources when done with project
```

### Stop RDS Instance

```bash
# Via AWS Console
RDS Console → Select instance → Actions → Stop

# Via AWS CLI (on EC2)
aws rds stop-db-instance --db-instance-identifier deliverygenie-db
```

⚠️ **Note**: AWS auto-starts stopped RDS after 7 days!

### Monitor Costs

```bash
# Via AWS Console
AWS Console → Billing → Cost Explorer

# Check Learner Lab dashboard regularly
# Budget remaining updates every 8-12 hours
```

---

## 🔒 Security Checklist

- ✅ Strong password for RDS
- ✅ Security group restricts access to your IP only
- ✅ Public access disabled (if using private subnet)
- ✅ SSL/TLS enabled for connections
- ✅ Backup important data regularly
- ✅ Monitor CloudWatch logs

---

## 🐛 Troubleshooting

### "Connection timed out"

**Solution**: Check security group allows port 5432 from your IP

```bash
# Test connection
telnet deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com 5432

# If hangs: Update security group
```

### "Password authentication failed"

**Solution**:
1. Verify password in RDS Console
2. Reset password if needed
3. Update `.env` file

### "Database does not exist"

**Solution**:
```bash
# Connect to postgres database
psql -h <RDS-ENDPOINT> -U postgres -d postgres

# Create database
CREATE DATABASE deliverygenie;
\q
```

### "Prisma schema push failed"

**Solution**:
```bash
# Reset and retry
npx prisma migrate reset
npx prisma db push
npx ts-node prisma/seed.ts
```

---

## 📚 Documentation

- **Full Setup Guide**: [AWS_RDS_SETUP_GUIDE.md](./AWS_RDS_SETUP_GUIDE.md)
- **Database Schema**: [prisma/DATABASE_SCHEMA.md](./prisma/DATABASE_SCHEMA.md)
- **Database Overview**: [DATABASE_OVERVIEW.md](./DATABASE_OVERVIEW.md)
- **Prisma Guide**: [prisma/README.md](./prisma/README.md)

---

## 🆘 Quick Commands

```bash
# Connect to RDS
./scripts/connect-rds.sh

# Backup database
./scripts/backup-rds.sh

# Deploy schema
npx prisma db push

# Seed data
npx ts-node prisma/seed.ts

# Open Prisma Studio
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Stop RDS (save money)
aws rds stop-db-instance --db-instance-identifier deliverygenie-db

# Start RDS
aws rds start-db-instance --db-instance-identifier deliverygenie-db

# Delete RDS (⚠️ destructive!)
aws rds delete-db-instance \
  --db-instance-identifier deliverygenie-db \
  --skip-final-snapshot
```

---

## 🎉 Success!

Your DeliveryGenie database is now running on AWS RDS!

**What you have:**
- ✅ PostgreSQL 15 with PostGIS
- ✅ 20+ tables with relationships
- ✅ Sample data ready to use
- ✅ Priority calculation system
- ✅ GPS tracking support
- ✅ Route optimization ready

**Next:**
- 📱 Build the API endpoints
- 🗺️ Integrate Google Maps
- 📊 Create dashboards
- 🚀 Deploy to production

---

## 💬 Need Help?

- **Documentation**: See files listed above
- **Issues**: https://github.com/KittiphonKamnuan/DeliveryGenie/issues
- **AWS RDS Docs**: https://docs.aws.amazon.com/rds/
- **Prisma Docs**: https://www.prisma.io/docs

---

**Happy Coding! 🚀**

*Generated: November 2, 2025*
*Version: 1.0*
