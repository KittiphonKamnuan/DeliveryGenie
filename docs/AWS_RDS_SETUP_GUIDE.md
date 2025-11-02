# 🌐 AWS RDS Setup Guide - DeliveryGenie Database

Complete guide to deploy DeliveryGenie PostgreSQL database on AWS RDS using Learner Lab.

---

## 📋 Prerequisites

✅ AWS Learner Lab access (with budget)
✅ `labsuser.pem` key file downloaded
✅ Region: **us-east-1** or **us-west-2**
✅ Local project files ready

---

## 🎯 Quick Overview

```
Step 1: Launch EC2 Instance (Jump Server)
Step 2: Create RDS PostgreSQL Instance
Step 3: SSH to EC2 and Install Tools
Step 4: Connect to RDS and Setup Database
Step 5: Deploy Schema from Local Machine
Step 6: Verify and Test Connection
```

---

## 📦 Step 1: Launch EC2 Instance (Jump Server)

### Why EC2?
We'll use EC2 as a "jump server" to:
- Install PostgreSQL client tools
- Connect to RDS (which is in private subnet)
- Run database migrations

### Launch Instance

1. **Open EC2 Console**: https://console.aws.amazon.com/ec2/
2. Click **Launch Instance**
3. Configure:

```yaml
Name: deliverygenie-jumpserver
AMI: Amazon Linux 2023 (Free tier)
Instance Type: t2.micro (or t3.micro)
Key pair: vockey (already exists in us-east-1)
```

4. **Network Settings**:
   - VPC: Default VPC
   - Auto-assign public IP: **Enable**
   - Security Group: Create new
     - Name: `deliverygenie-jumpserver-sg`
     - Rules:
       ```
       Type: SSH
       Port: 22
       Source: My IP (your IP address)
       ```

5. **Advanced Details**:
   - IAM instance profile: **LabInstanceProfile**

6. Click **Launch Instance**
7. Note the **Public IPv4 address**

---

## 🗄️ Step 2: Create RDS PostgreSQL Instance

### Configure RDS

1. **Open RDS Console**: https://console.aws.amazon.com/rds/
2. Click **Create database**

### Settings

#### Step 1: Choose engine
```yaml
Engine type: PostgreSQL
Engine version: PostgreSQL 15.5 (or latest available)
Templates: Free tier (if available) or Dev/Test
```

#### Step 2: Settings
```yaml
DB instance identifier: deliverygenie-db
Master username: postgres
Master password: DeliveryGenie2025!
  (⚠️ Save this password securely!)
Confirm password: DeliveryGenie2025!
```

#### Step 3: Instance configuration
```yaml
DB instance class:
  - Burstable classes (includes t classes)
  - db.t3.micro (Free tier) or db.t3.small
```

#### Step 4: Storage
```yaml
Storage type: General Purpose SSD (gp2)
Allocated storage: 20 GB
Storage autoscaling: Disable (to control costs)
```

⚠️ **Important**: Max 100 GB due to Learner Lab limits

#### Step 5: Connectivity
```yaml
Virtual private cloud (VPC): Default VPC
Public access: Yes (for development)
VPC security group: Create new
  - Name: deliverygenie-db-sg
Availability Zone: No preference
```

#### Step 6: Database authentication
```yaml
Database authentication: Password authentication
```

#### Step 7: Additional configuration
```yaml
Initial database name: deliverygenie
DB parameter group: default.postgres15
Backup:
  - Disable automated backups (to save costs)
Encryption: Use default
Enhanced monitoring: ⚠️ DISABLE (not supported in Learner Lab)
Log exports: None (to save costs)
```

#### Step 8: Create database
- Review all settings
- Estimated monthly costs should show
- Click **Create database**

⏳ **Wait 5-10 minutes** for RDS to be created

### Get RDS Endpoint

Once status is **Available**:
1. Click on `deliverygenie-db`
2. In **Connectivity & security** tab
3. Copy **Endpoint**: `deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com`
4. Note **Port**: `5432`

---

## 🔐 Step 3: Configure Security Groups

### Update RDS Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Find `deliverygenie-db-sg`
3. Click **Edit inbound rules**
4. Add rule:

```yaml
Type: PostgreSQL
Protocol: TCP
Port: 5432
Source: Custom
  → Select the EC2 jumpserver security group
  → OR enter EC2 private IP: 172.31.x.x/32
Description: Allow from EC2 jumpserver
```

5. Click **Save rules**

### (Optional) Allow from Your Local Machine

If you want to connect directly from your laptop:

```yaml
Type: PostgreSQL
Protocol: TCP
Port: 5432
Source: My IP
Description: Allow from local machine
```

⚠️ **Security Note**: For production, keep RDS in private subnet only!

---

## 🔧 Step 4: SSH to EC2 and Install PostgreSQL Client

### SSH to EC2

From your local terminal:

```bash
# Set correct permissions
chmod 400 labsuser.pem

# SSH to EC2 (replace with your EC2 public IP)
ssh -i labsuser.pem ec2-user@<EC2-PUBLIC-IP>

# Example:
# ssh -i labsuser.pem ec2-user@54.123.45.67
```

### Install PostgreSQL Client

Once connected to EC2:

```bash
# Update system
sudo dnf update -y

# Install PostgreSQL 15 client
sudo dnf install -y postgresql15

# Verify installation
psql --version
# Output: psql (PostgreSQL) 15.x
```

---

## 🔌 Step 5: Connect to RDS from EC2

### Test Connection

```bash
# Replace with your actual RDS endpoint
export RDS_ENDPOINT="deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com"
export RDS_PASSWORD="DeliveryGenie2025!"

# Test connection
psql -h $RDS_ENDPOINT -U postgres -d deliverygenie -c "SELECT version();"

# You'll be prompted for password: enter DeliveryGenie2025!
```

✅ If you see PostgreSQL version, connection works!

### Enable PostGIS Extension

```bash
# Connect to database
psql -h $RDS_ENDPOINT -U postgres -d deliverygenie

# Inside psql prompt
deliverygenie=> CREATE EXTENSION IF NOT EXISTS postgis;
deliverygenie=> CREATE EXTENSION IF NOT EXISTS postgis_topology;
deliverygenie=> SELECT PostGIS_Version();
deliverygenie=> \q
```

✅ PostGIS is now ready for spatial queries!

---

## 💻 Step 6: Deploy Schema from Local Machine

### Option A: From EC2 (Recommended)

#### Upload Files to EC2

From your **local machine**:

```bash
# Navigate to your project
cd ~/Documents/Project/Delivery_Genie/delivery-genie-dashboard

# Upload Prisma files to EC2
scp -i labsuser.pem -r prisma ec2-user@<EC2-PUBLIC-IP>:~/

# Upload package files
scp -i labsuser.pem package.json ec2-user@<EC2-PUBLIC-IP>:~/
scp -i labsuser.pem package-lock.json ec2-user@<EC2-PUBLIC-IP>:~/
```

#### Install Node.js and Setup on EC2

Back in your **EC2 SSH session**:

```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version

# Install dependencies
cd ~
npm install prisma @prisma/client typescript ts-node --save-dev

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:DeliveryGenie2025!@deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com:5432/deliverygenie?schema=public"
EOF

# ⚠️ Replace with your actual RDS endpoint!
nano .env
# Edit the DATABASE_URL with your real RDS endpoint
# Save: Ctrl+O, Enter, Ctrl+X

# Generate Prisma Client
npx prisma generate

# Push schema to RDS
npx prisma db push

# Verify
npx prisma studio --browser none --port 5555
```

#### Run Advanced Setup (Optional)

```bash
# Install PostgreSQL client (if not already)
sudo dnf install -y postgresql15

# Run advanced indexes
psql -h $RDS_ENDPOINT -U postgres -d deliverygenie -f prisma/migrations/001_advanced_indexes.sql

# Run partitioning (optional for now)
# psql -h $RDS_ENDPOINT -U postgres -d deliverygenie -f prisma/migrations/002_partitioning.sql
```

#### Seed Database

```bash
# Run seed script
npx ts-node prisma/seed.ts
```

✅ Database is now ready!

---

### Option B: From Local Machine (Direct Connection)

If you opened port 5432 to your local IP:

```bash
# On your local machine
cd ~/Documents/Project/Delivery_Genie/delivery-genie-dashboard

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:DeliveryGenie2025!@deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com:5432/deliverygenie?schema=public"
EOF

# ⚠️ Edit with your real RDS endpoint
nano .env

# Generate Prisma Client
npx prisma generate

# Push schema
npx prisma db push

# Seed data
npx ts-node prisma/seed.ts

# Open Prisma Studio
npx prisma studio
```

✅ You can now manage the database from your local machine!

---

## ✅ Step 7: Verify Database

### Check Tables

```bash
# SSH to EC2 (or from local if direct connection)
psql -h deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d deliverygenie
```

```sql
-- List all tables
\dt

-- Should see:
-- customers, stores, products, orders, order_items,
-- drivers, vehicles, deliveries, routes, route_stops,
-- gps_trackings, traffic_data, weather_data, etc.

-- Check sample data
SELECT COUNT(*) FROM products;
-- Should return: 12

SELECT COUNT(*) FROM stores;
-- Should return: 5

SELECT * FROM priority_configs;
-- Should return: 2 configs (default, rush_hour)

-- Test spatial query
SELECT
  name,
  ST_AsText(location) as location,
  latitude,
  longitude
FROM stores
LIMIT 3;

-- Exit
\q
```

---

## 🔗 Step 8: Update Application Configuration

### Local Development

Update your local `.env`:

```bash
# On your local machine
cd ~/Documents/Project/Delivery_Genie/delivery-genie-dashboard

cat > .env << 'EOF'
# ===================================
# DeliveryGenie - AWS RDS Production
# ===================================

# Database (AWS RDS)
DATABASE_URL="postgresql://postgres:DeliveryGenie2025!@deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com:5432/deliverygenie?schema=public"

# Redis (Local for now)
REDIS_URL="redis://localhost:6379"

# Google Maps API
GOOGLE_MAPS_API_KEY="your_api_key_here"

# Application
NODE_ENV="development"
PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Priority Settings
PRIORITY_WEIGHT_TEMPERATURE=0.30
PRIORITY_WEIGHT_EXPIRATION=0.25
PRIORITY_WEIGHT_CUSTOMER=0.15
PRIORITY_WEIGHT_VALUE=0.10
PRIORITY_WEIGHT_TIME_WINDOW=0.15
PRIORITY_WEIGHT_FRAGILITY=0.05

# Debug
DEBUG_SQL=false
EOF

# Replace with actual RDS endpoint
nano .env
```

### Test Application

```bash
# Install dependencies (if not already)
npm install

# Generate Prisma Client
npx prisma generate

# Start development server
npm run dev

# Open browser: http://localhost:3000
```

---

## 📊 Step 9: Monitor Database

### Check RDS Metrics

1. Open **RDS Console**
2. Select `deliverygenie-db`
3. Click **Monitoring** tab
4. View:
   - CPU Utilization
   - Database Connections
   - Free Storage Space
   - Read/Write IOPS

### Set Up CloudWatch Alarms (Optional)

```bash
# Via AWS CLI on EC2
aws cloudwatch put-metric-alarm \
  --alarm-name deliverygenie-db-cpu-high \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=deliverygenie-db
```

---

## 💰 Cost Management

### Estimated Costs (Learner Lab Budget)

```
db.t3.micro (20 GB storage):
  - ~$0.017/hour = ~$12/month (if running 24/7)
  - ~$2/month (if running 6 hours/day)

ec2.t2.micro:
  - Free tier or ~$8/month
  - Turn off when not in use!

Total: ~$10-20/month
```

### Cost Saving Tips

1. **Stop RDS when not in use**:
```bash
# Via AWS Console
RDS Console → Select instance → Actions → Stop

# Via CLI
aws rds stop-db-instance --db-instance-identifier deliverygenie-db
```

⚠️ **Note**: AWS will auto-start stopped RDS after 7 days!

2. **Stop EC2 jumpserver**:
```bash
# Via Console
EC2 Console → Select instance → Instance state → Stop

# Via CLI
aws ec2 stop-instances --instance-ids i-xxxxx
```

3. **Delete snapshots** (if any):
```bash
# List snapshots
aws rds describe-db-snapshots

# Delete old snapshots
aws rds delete-db-snapshot --db-snapshot-identifier snapshot-name
```

4. **Monitor budget**:
   - Check Learner Lab dashboard regularly
   - Set up billing alerts

---

## 🔒 Security Best Practices

### 1. Change Default Password

```sql
-- Connect to RDS
psql -h deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d deliverygenie

-- Change password
ALTER USER postgres WITH PASSWORD 'NewSecurePassword123!@#';

-- Create app user
CREATE USER deliverygenie_app WITH PASSWORD 'AppPassword456!@#';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE deliverygenie TO deliverygenie_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO deliverygenie_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO deliverygenie_app;

-- Use app user in .env
-- DATABASE_URL="postgresql://deliverygenie_app:AppPassword456!@#@...
```

### 2. Restrict Security Group

```yaml
# Tighten inbound rules:
- Only allow from EC2 jumpserver
- Remove "My IP" rule if not needed
- Never allow 0.0.0.0/0 (entire internet)
```

### 3. Enable SSL

```bash
# Download RDS SSL certificate
cd ~
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Update DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslrootcert=/path/to/global-bundle.pem"
```

### 4. Backup Important Data

```bash
# Manual backup from EC2
pg_dump -h $RDS_ENDPOINT -U postgres deliverygenie > backup_$(date +%Y%m%d).sql

# Upload to S3 (if needed)
aws s3 cp backup_20250102.sql s3://your-bucket/backups/
```

---

## 🐛 Troubleshooting

### Issue: "Connection timed out"

**Cause**: Security group not configured

**Solution**:
1. Check RDS security group allows port 5432
2. Check EC2 can reach RDS:
```bash
telnet deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com 5432
```

### Issue: "Password authentication failed"

**Cause**: Wrong password

**Solution**:
1. Reset password in RDS Console
2. Update .env file

### Issue: "Database does not exist"

**Cause**: Initial database not created

**Solution**:
```bash
# Connect to default postgres database
psql -h $RDS_ENDPOINT -U postgres -d postgres

# Create database
CREATE DATABASE deliverygenie;

# Exit and reconnect
\q
psql -h $RDS_ENDPOINT -U postgres -d deliverygenie
```

### Issue: "PostGIS extension not found"

**Cause**: Extension not installed

**Solution**:
```sql
-- Connect as postgres user
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

### Issue: "Prisma migration failed"

**Cause**: Incompatible schema

**Solution**:
```bash
# Reset database
npx prisma migrate reset

# Or manually drop all tables
psql -h $RDS_ENDPOINT -U postgres -d deliverygenie -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Rerun migrations
npx prisma db push
```

---

## 📚 Next Steps

✅ Database is running on AWS RDS
✅ Schema deployed with Prisma
✅ Sample data seeded

### What's Next?

1. **Deploy Application**: Deploy to EC2, ECS, or Lambda
2. **Setup Redis**: Use ElastiCache for caching
3. **Configure Google Maps API**: Add API key
4. **Implement APIs**: Build REST endpoints
5. **Add Monitoring**: CloudWatch + Sentry
6. **Setup CI/CD**: GitHub Actions or CodePipeline

---

## 🆘 Quick Commands Cheat Sheet

```bash
# SSH to EC2
ssh -i labsuser.pem ec2-user@<EC2-IP>

# Connect to RDS
psql -h deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d deliverygenie

# Generate Prisma Client
npx prisma generate

# Push schema
npx prisma db push

# Seed database
npx ts-node prisma/seed.ts

# Open Prisma Studio
npx prisma studio

# Backup database
pg_dump -h $RDS_ENDPOINT -U postgres deliverygenie > backup.sql

# Restore database
psql -h $RDS_ENDPOINT -U postgres deliverygenie < backup.sql

# Stop RDS
aws rds stop-db-instance --db-instance-identifier deliverygenie-db

# Start RDS
aws rds start-db-instance --db-instance-identifier deliverygenie-db

# Delete RDS (when done)
aws rds delete-db-instance --db-instance-identifier deliverygenie-db --skip-final-snapshot
```

---

## 📞 Support Resources

- **AWS RDS Docs**: https://docs.aws.amazon.com/rds/
- **Prisma Docs**: https://www.prisma.io/docs
- **PostGIS Docs**: https://postgis.net/documentation/
- **Project Issues**: https://github.com/KittiphonKamnuan/DeliveryGenie/issues

---

**Last Updated**: November 2, 2025
**Version**: 1.0
**Author**: DeliveryGenie Team
