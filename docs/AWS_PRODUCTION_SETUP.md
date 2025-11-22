# 🚀 AWS Production Setup Guide - DeliveryGenie

> คู่มือ Setup ระบบครั้งแรกบน AWS Real Account

**เวอร์ชัน:** 1.0
**อัปเดตล่าสุด:** November 3, 2025

---

## 📋 สารบัญ

1. [Prerequisites](#prerequisites)
2. [Phase 1: AWS RDS Setup](#phase-1-aws-rds-setup)
3. [Phase 2: Database Configuration](#phase-2-database-configuration)
4. [Phase 3: Application Deployment](#phase-3-application-deployment)
5. [Phase 4: Testing & Verification](#phase-4-testing--verification)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### สิ่งที่ต้องมี:

- ✅ AWS Account (Real Account - ไม่ใช่ Learner Lab)
- ✅ AWS CLI ติดตั้งบนเครื่อง
- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ Code editor (VS Code แนะนำ)
- ✅ Terminal/Command line access

### ตรวจสอบความพร้อม:

```bash
# ตรวจสอบ AWS CLI
aws --version
# Output: aws-cli/2.x.x

# ตรวจสอบ Node.js
node --version
# Output: v18.x.x หรือสูงกว่า

# ตรวจสอบ npm
npm --version
# Output: 9.x.x หรือสูงกว่า
```

---

## 🗄️ Phase 1: AWS RDS Setup

### Step 1.1: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# ป้อนข้อมูล:
# AWS Access Key ID: <YOUR_ACCESS_KEY>
# AWS Secret Access Key: <YOUR_SECRET_KEY>
# Default region name: ap-southeast-1  (Singapore - ใกล้ไทยที่สุด)
# Default output format: json
```

**หา AWS Credentials:**
1. เข้า AWS Console → IAM
2. Users → Your User → Security credentials
3. Create access key → CLI
4. Copy Access Key ID และ Secret Access Key

---

### Step 1.2: Create RDS PostgreSQL Instance

#### Option A: ใช้ AWS Console (แนะนำสำหรับครั้งแรก)

1. **เปิด RDS Console:**
   - เข้า https://console.aws.amazon.com/rds/
   - เลือก Region: **Asia Pacific (Singapore) - ap-southeast-1**

2. **Create Database:**
   - คลิก "Create database"
   - **Engine type:** PostgreSQL
   - **Engine Version:** PostgreSQL 15.5 หรือใหม่กว่า
   - **Templates:** Production (สำหรับ production) หรือ Dev/Test (ถ้าทดสอบก่อน)

3. **Settings:**
   ```
   DB instance identifier: deliverygenie-prod-db
   Master username: postgres
   Master password: <สร้าง password ที่แข็งแรง>
   Confirm password: <ยืนยัน password>
   ```

   **⚠️ เก็บ password ไว้ปลอดภัย! ต้องใช้ทุกครั้งที่เชื่อมต่อ database**

4. **Instance Configuration:**
   ```
   DB instance class: db.t3.micro (Free tier eligible)
   หรือ db.t3.small (แนะนำสำหรับ production)

   Storage type: General Purpose SSD (gp3)
   Allocated storage: 20 GB (เพิ่มได้ภายหลัง)
   Enable storage autoscaling: ✓ เปิด
   Maximum storage threshold: 100 GB
   ```

5. **Connectivity:**
   ```
   Compute resource: Don't connect to an EC2 compute resource

   Virtual private cloud (VPC): Default VPC

   Public access: Yes (✓ เปิด - สำหรับเชื่อมต่อจากภายนอก)

   VPC security group: Create new
   New VPC security group name: deliverygenie-db-sg

   Availability Zone: No preference
   ```

6. **Database authentication:**
   ```
   ✓ Password authentication
   ```

7. **Additional configuration:**
   ```
   Initial database name: deliverygenie

   DB parameter group: default.postgres15

   Backup:
   - Enable automated backups: ✓ เปิด (สำหรับ production)
   - Backup retention period: 7 days
   - Backup window: No preference

   Monitoring:
   - Enable Enhanced monitoring: ❌ ปิด (ประหยัดค่าใช้จ่าย)

   Maintenance:
   - Enable auto minor version upgrade: ✓ เปิด
   ```

8. **Estimated monthly costs:**
   - db.t3.micro: ~$15-20/month
   - db.t3.small: ~$30-35/month

9. **คลิก "Create database"**

10. **รอ 5-10 นาที** ให้ RDS สร้าง instance

---

#### Option B: ใช้ AWS CLI (สำหรับผู้ชำนาญ)

```bash
# สร้าง Security Group
aws ec2 create-security-group \
  --group-name deliverygenie-db-sg \
  --description "Security group for DeliveryGenie RDS" \
  --region ap-southeast-1

# เก็บ Security Group ID
SG_ID=$(aws ec2 describe-security-groups \
  --group-names deliverygenie-db-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region ap-southeast-1)

# เปิด port PostgreSQL (5432)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region ap-southeast-1

# สร้าง RDS Instance
aws rds create-db-instance \
  --db-instance-identifier deliverygenie-prod-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 15.5 \
  --master-username postgres \
  --master-user-password '<YOUR_STRONG_PASSWORD>' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $SG_ID \
  --publicly-accessible \
  --db-name deliverygenie \
  --backup-retention-period 7 \
  --no-multi-az \
  --region ap-southeast-1

# ตรวจสอบสถานะ
aws rds describe-db-instances \
  --db-instance-identifier deliverygenie-prod-db \
  --query 'DBInstances[0].DBInstanceStatus' \
  --region ap-southeast-1
```

---

### Step 1.3: Get RDS Endpoint

หลังจาก RDS สร้างเสร็จ (Status: Available):

**Via Console:**
1. RDS Console → Databases
2. คลิกที่ `deliverygenie-prod-db`
3. ใน **Connectivity & security** tab
4. Copy **Endpoint**: `deliverygenie-prod-db.xxxxxxxxxx.ap-southeast-1.rds.amazonaws.com`

**Via CLI:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier deliverygenie-prod-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region ap-southeast-1
```

**บันทึก Endpoint นี้ไว้!**

---

### Step 1.4: Configure Security Group

**⚠️ สำคัญมาก: ต้องเปิด port 5432 ให้เชื่อมต่อได้**

#### Option 1: เปิดให้ IP ของคุณเท่านั้น (แนะนำ)

1. หา IP ของคุณ:
   ```bash
   curl ifconfig.me
   # Output: xxx.xxx.xxx.xxx
   ```

2. **Via Console:**
   - EC2 Console → Security Groups
   - เลือก `deliverygenie-db-sg`
   - Inbound rules → Edit inbound rules
   - Add rule:
     ```
     Type: PostgreSQL
     Protocol: TCP
     Port: 5432
     Source: My IP (จะใส่ IP ของคุณอัตโนมัติ)
     Description: My computer
     ```
   - Save rules

**Via CLI:**
```bash
MY_IP=$(curl -s ifconfig.me)

aws ec2 authorize-security-group-ingress \
  --group-name deliverygenie-db-sg \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32 \
  --region ap-southeast-1
```

#### Option 2: เปิดให้ทุก IP (ไม่แนะนำสำหรับ production)

```bash
aws ec2 authorize-security-group-ingress \
  --group-name deliverygenie-db-sg \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region ap-southeast-1
```

⚠️ **หมายเหตุ:** Option 2 เสี่ยงต่อการโจมตี ใช้เฉพาะเพื่อทดสอบเท่านั้น

---

### Step 1.5: Test Connection

```bash
# ติดตั้ง psql (ถ้ายังไม่มี)
# macOS:
brew install postgresql@15

# Ubuntu/Debian:
sudo apt-get install postgresql-client-15

# ทดสอบเชื่อมต่อ
psql -h deliverygenie-prod-db.xxxxxxxxxx.ap-southeast-1.rds.amazonaws.com \
     -U postgres \
     -d deliverygenie

# ป้อน password ที่ตั้งไว้
# ถ้าเชื่อมต่อสำเร็จ จะเห็น:
# deliverygenie=>
```

**ทดสอบคำสั่ง:**
```sql
-- ตรวจสอบ PostgreSQL version
SELECT version();

-- List databases
\l

-- ออกจาก psql
\q
```

✅ **ถ้าเชื่อมต่อได้ = RDS Setup สำเร็จ!**

---

## 🗃️ Phase 2: Database Configuration

### Step 2.1: Clone Project

```bash
# Clone repository
git clone https://github.com/KittiphonKamnuan/DeliveryGenie.git
cd DeliveryGenie/delivery-genie-dashboard

# Checkout latest features
git checkout feature/interactive-maps-driver-performance

# Install dependencies
npm install
```

---

### Step 2.2: Configure Environment Variables

```bash
# สร้างไฟล์ .env
cp .env.example .env

# แก้ไข .env
nano .env
```

**ใส่ข้อมูลดังนี้:**

```env
# Database
DATABASE_URL="postgresql://postgres:<YOUR_PASSWORD>@deliverygenie-prod-db.xxxxxxxxxx.ap-southeast-1.rds.amazonaws.com:5432/deliverygenie?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<สร้าง random string ยาว 32 ตัวอักษร>"

# Optional: API Keys (ถ้ามี)
GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
WEATHER_API_KEY="your_weather_api_key"
```

**สร้าง NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**แทนที่:**
- `<YOUR_PASSWORD>` → รหัส RDS ที่ตั้งไว้
- `xxxxxxxxxx` → RDS endpoint ที่คัดลอกไว้

---

### Step 2.3: Enable PostGIS Extension

```bash
# เชื่อมต่อ RDS
psql -h deliverygenie-prod-db.xxxxxxxxxx.ap-southeast-1.rds.amazonaws.com \
     -U postgres \
     -d deliverygenie

# รันคำสั่งใน psql:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ตรวจสอบ
SELECT PostGIS_version();

-- ออกจาก psql
\q
```

---

### Step 2.4: Deploy Database Schema

```bash
# Generate Prisma Client
npx prisma generate

# Deploy schema to RDS
npx prisma db push

# ตรวจสอบผล - ควรเห็น:
# ✔ Generated Prisma Client
# Your database is now in sync with your Prisma schema.
```

**ตรวจสอบตาราง:**
```bash
psql -h <RDS_ENDPOINT> -U postgres -d deliverygenie

\dt

# ควรเห็นตารางทั้งหมด:
# customers, stores, products, orders, drivers, vehicles, etc.
```

---

### Step 2.5: Seed Initial Data

```bash
# รัน seed script
npx tsx prisma/seed.ts

# ผลลัพธ์ที่คาดหวัง:
# ✅ Seeded 5 stores
# ✅ Seeded 12 products
# ✅ Seeded 10 customers
# ✅ Seeded 3 drivers
# ✅ Seeded 3 vehicles
# ✅ Database seeding completed!
```

**ตรวจสอบข้อมูล:**
```sql
-- เชื่อมต่อ database
psql -h <RDS_ENDPOINT> -U postgres -d deliverygenie

-- ตรวจนับข้อมูล
SELECT COUNT(*) FROM stores;      -- ควรได้ 5
SELECT COUNT(*) FROM products;    -- ควรได้ 12
SELECT COUNT(*) FROM drivers;     -- ควรได้ 3

-- ดูข้อมูล stores
SELECT name, latitude, longitude FROM stores;

-- ออก
\q
```

✅ **Database พร้อมใช้งาน!**

---

## 🚀 Phase 3: Application Deployment

### Option A: Deploy to Vercel (แนะนำ - ง่ายที่สุด)

#### Step 3.1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 3.2: Login to Vercel

```bash
vercel login
# เลือก GitHub/GitLab/Email
```

#### Step 3.3: Deploy

```bash
# ใน project root
vercel

# ตอบคำถาม:
# ? Set up and deploy "~/DeliveryGenie/delivery-genie-dashboard"? [Y/n] Y
# ? Which scope do you want to deploy to? <your-account>
# ? Link to existing project? [y/N] N
# ? What's your project's name? deliverygenie-dashboard
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N
```

#### Step 3.4: Configure Environment Variables

```bash
# เพิ่ม environment variables
vercel env add DATABASE_URL

# Paste: postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/deliverygenie?schema=public

vercel env add NEXTAUTH_SECRET
# Paste: <your-secret>

vercel env add NEXTAUTH_URL
# Paste: https://deliverygenie-dashboard.vercel.app
```

#### Step 3.5: Deploy to Production

```bash
vercel --prod
```

**ผลลัพธ์:**
```
✅  Production: https://deliverygenie-dashboard.vercel.app
```

---

### Option B: Deploy to AWS (EC2 + PM2)

#### Step 3.1: Launch EC2 Instance

**Via Console:**
1. EC2 Console → Launch Instance
2. **Name:** DeliveryGenie-App
3. **AMI:** Ubuntu Server 22.04 LTS
4. **Instance type:** t2.micro (Free tier) หรือ t2.small
5. **Key pair:** สร้างใหม่หรือใช้ของเดิม
6. **Network settings:**
   - Allow SSH (port 22) from My IP
   - Allow HTTP (port 80) from Anywhere
   - Allow HTTPS (port 443) from Anywhere
   - Allow Custom TCP (port 3000) from Anywhere
7. **Storage:** 20 GB gp3
8. **Launch instance**

#### Step 3.2: Connect to EC2

```bash
# SSH เข้า EC2
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

#### Step 3.3: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Install PM2
sudo npm install -g pm2

# Verify
node --version
npm --version
pm2 --version
```

#### Step 3.4: Clone and Setup

```bash
# Clone project
git clone https://github.com/KittiphonKamnuan/DeliveryGenie.git
cd DeliveryGenie/delivery-genie-dashboard

# Checkout feature branch
git checkout feature/interactive-maps-driver-performance

# Install dependencies
npm install

# Create .env file
nano .env
```

**ใส่ environment variables:**
```env
DATABASE_URL="postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/deliverygenie?schema=public"
NEXTAUTH_URL="http://<EC2-PUBLIC-IP>:3000"
NEXTAUTH_SECRET="<your-secret>"
```

#### Step 3.5: Build Application

```bash
# Generate Prisma Client
npx prisma generate

# Build Next.js
npm run build
```

#### Step 3.6: Start with PM2

```bash
# Start application
pm2 start npm --name "deliverygenie" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it gives you

# Check status
pm2 status
pm2 logs deliverygenie
```

#### Step 3.7: Configure Nginx (Optional)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/deliverygenie
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name <YOUR_DOMAIN_OR_IP>;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/deliverygenie /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**เข้าถึงได้ที่:** `http://<EC2-PUBLIC-IP>`

---

## ✅ Phase 4: Testing & Verification

### Step 4.1: Test Database Connection

```bash
# Open Prisma Studio
npx prisma studio

# เปิดใน browser: http://localhost:5555
# ดูข้อมูลในตาราง stores, products, drivers
```

### Step 4.2: Test Application

**เปิด browser:**
```
http://localhost:3000
# หรือ
https://deliverygenie-dashboard.vercel.app
# หรือ
http://<EC2-PUBLIC-IP>
```

**ทดสอบ features:**

1. ✅ **Homepage** - แสดง Priority System
2. ✅ **Route Optimization** - แผนที่ทำงาน
3. ✅ **Vehicle Tracking** - รถเคลื่อนที่บนแผนที่
4. ✅ **Driver Performance** - แสดงอันดับคนขับ
5. ✅ **Analytics** - สถิติแสดงผล

### Step 4.3: Test API Endpoints

```bash
# Test health check
curl http://localhost:3000/api/health

# Test drivers performance
curl http://localhost:3000/api/drivers/performance

# Test route optimization
curl -X POST http://localhost:3000/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "stores": [
      {"name": "Start", "lat": 14.0729, "lon": 100.6058},
      {"name": "Stop 1", "lat": 14.0293, "lon": 100.6193}
    ],
    "start_index": 0,
    "end_index": 1
  }'
```

---

## 🔧 Troubleshooting

### Problem 1: Cannot connect to RDS

**Error:** `timeout` หรือ `connection refused`

**Solution:**
```bash
# 1. ตรวจสอบ Security Group
aws ec2 describe-security-groups \
  --group-names deliverygenie-db-sg \
  --region ap-southeast-1

# 2. เพิ่ม inbound rule
aws ec2 authorize-security-group-ingress \
  --group-name deliverygenie-db-sg \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s ifconfig.me)/32 \
  --region ap-southeast-1

# 3. ทดสอบ telnet
telnet <RDS_ENDPOINT> 5432
```

---

### Problem 2: Prisma migration failed

**Error:** `P1001: Can't reach database server`

**Solution:**
```bash
# ตรวจสอบ DATABASE_URL ใน .env
cat .env | grep DATABASE_URL

# ทดสอบ connection string
psql "$DATABASE_URL"

# ถ้าไม่ได้ - ตรวจสอบ:
# 1. RDS endpoint ถูกต้อง
# 2. Password ถูกต้อง
# 3. Database name ถูกต้อง
# 4. Security group เปิด port 5432
```

---

### Problem 3: Build failed on Vercel

**Error:** `Module not found: Can't resolve...`

**Solution:**
```bash
# ลบ node_modules และ reinstall
rm -rf node_modules package-lock.json
npm install

# Build locally ก่อน
npm run build

# ถ้า build ผ่าน แล้ว push ใหม่
git add .
git commit -m "fix: dependencies"
git push

# Deploy ใหม่
vercel --prod
```

---

### Problem 4: PostGIS not available

**Error:** `extension "postgis" is not available`

**Solution:**
```sql
-- เชื่อมต่อเป็น postgres user
psql -h <RDS_ENDPOINT> -U postgres -d postgres

-- สร้าง extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ตรวจสอบ
SELECT PostGIS_version();

\q
```

---

## 💰 Cost Estimation

### AWS RDS:
- **db.t3.micro:** ~$15-20/month (Free tier 1 year)
- **db.t3.small:** ~$30-35/month
- **Storage (20 GB):** ~$2.30/month
- **Backup (7 days):** ~$0.50/month

### AWS EC2 (ถ้าใช้):
- **t2.micro:** Free tier 1 year
- **t2.small:** ~$17/month
- **Storage (20 GB):** ~$1.60/month

### Vercel (ถ้าใช้):
- **Hobby plan:** $0 (Free)
- **Pro plan:** $20/month (ถ้าต้องการ features เพิ่ม)

**Total ประมาณ:** $20-60/month (ขึ้นกับ configuration)

---

## 📚 Next Steps

หลังจาก Setup เสร็จ:

1. ✅ **Setup Domain** - ซื้อ domain และ configure DNS
2. ✅ **SSL Certificate** - ติดตั้ง HTTPS (Let's Encrypt)
3. ✅ **Monitoring** - Setup CloudWatch/Datadog
4. ✅ **Backup Strategy** - Configure automated backups
5. ✅ **CI/CD Pipeline** - Setup GitHub Actions
6. ✅ **Load Testing** - ทดสอบ performance

---

## 🆘 Need Help?

- 📧 **Email:** support@deliverygenie.com
- 💬 **Discord:** [Join Server](https://discord.gg/deliverygenie)
- 📚 **Docs:** See other guides in `/docs` folder

---

## ✅ Checklist

```
Phase 1: AWS RDS
□ AWS CLI configured
□ RDS instance created
□ Security group configured
□ Database connection tested

Phase 2: Database
□ Project cloned
□ .env configured
□ PostGIS enabled
□ Schema deployed
□ Data seeded

Phase 3: Deployment
□ Application deployed (Vercel/EC2)
□ Environment variables set
□ Application accessible
□ All features working

Phase 4: Verification
□ Database queries working
□ API endpoints responding
□ Maps displaying correctly
□ No console errors
```

---

**เสร็จแล้ว! ระบบพร้อมใช้งาน Production! 🎉**

*Last updated: November 3, 2025*
