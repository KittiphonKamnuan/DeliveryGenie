#!/bin/bash

# ===================================
# DeliveryGenie RDS Setup Script
# For AWS Learner Lab Environment
# ===================================

set -e  # Exit on error

echo "🚀 DeliveryGenie Database Setup on AWS RDS"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Step 1: Check Prerequisites
# ============================================
echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Installing...${NC}"

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Amazon Linux / RHEL
        if command -v dnf &> /dev/null; then
            sudo dnf install -y postgresql15
        # Debian / Ubuntu
        elif command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y postgresql-client
        else
            echo -e "${RED}❌ Unsupported Linux distribution${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install postgresql@15
        else
            echo -e "${RED}❌ Homebrew not found. Please install it first.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported operating system${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL client installed${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm --version) found${NC}"
echo ""

# ============================================
# Step 2: Get RDS Connection Details
# ============================================
echo -e "${BLUE}📝 Step 2: Configure RDS connection${NC}"

# Prompt for RDS endpoint
read -p "Enter RDS Endpoint (e.g., deliverygenie-db.xxxxx.us-east-1.rds.amazonaws.com): " RDS_ENDPOINT

if [ -z "$RDS_ENDPOINT" ]; then
    echo -e "${RED}❌ RDS Endpoint is required${NC}"
    exit 1
fi

# Prompt for password
read -sp "Enter RDS Password: " RDS_PASSWORD
echo ""

if [ -z "$RDS_PASSWORD" ]; then
    echo -e "${RED}❌ Password is required${NC}"
    exit 1
fi

# Database details
DB_NAME="deliverygenie"
DB_USER="postgres"
DB_PORT="5432"

echo -e "${GREEN}✅ Connection details configured${NC}"
echo ""

# ============================================
# Step 3: Test Connection
# ============================================
echo -e "${BLUE}🔌 Step 3: Testing connection to RDS...${NC}"

export PGPASSWORD="$RDS_PASSWORD"

if psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d postgres -p "$DB_PORT" -c "SELECT version();" &> /dev/null; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Connection failed. Please check your settings.${NC}"
    exit 1
fi

echo ""

# ============================================
# Step 4: Create Database (if not exists)
# ============================================
echo -e "${BLUE}🗄️  Step 4: Creating database...${NC}"

# Check if database exists
DB_EXISTS=$(psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d postgres -p "$DB_PORT" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to continue? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Exiting..."
        exit 0
    fi
else
    echo "Creating database '$DB_NAME'..."
    psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d postgres -p "$DB_PORT" -c "CREATE DATABASE $DB_NAME;" &> /dev/null
    echo -e "${GREEN}✅ Database created${NC}"
fi

echo ""

# ============================================
# Step 5: Enable Extensions
# ============================================
echo -e "${BLUE}🔧 Step 5: Enabling PostgreSQL extensions...${NC}"

# Enable PostGIS
psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Verify PostGIS
POSTGIS_VERSION=$(psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -tAc "SELECT PostGIS_Version();" 2>/dev/null || echo "")

if [ -n "$POSTGIS_VERSION" ]; then
    echo -e "${GREEN}✅ PostGIS $POSTGIS_VERSION enabled${NC}"
else
    echo -e "${YELLOW}⚠️  PostGIS installation could not be verified${NC}"
fi

echo ""

# ============================================
# Step 6: Create .env File
# ============================================
echo -e "${BLUE}📝 Step 6: Creating .env file...${NC}"

# Build DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${RDS_PASSWORD}@${RDS_ENDPOINT}:${DB_PORT}/${DB_NAME}?schema=public"

# Create .env file
cat > .env << EOF
# ===================================
# DeliveryGenie - AWS RDS Configuration
# Generated: $(date)
# ===================================

# Database (AWS RDS)
DATABASE_URL="${DATABASE_URL}"

# Redis (Add your Redis endpoint)
REDIS_URL="redis://localhost:6379"

# Google Maps API
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# Weather API
WEATHER_API_URL="https://data.tmd.go.th/api/v1"
WEATHER_API_KEY="your_weather_api_key_here"

# Application
NODE_ENV="development"
PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Priority Calculation Settings
PRIORITY_WEIGHT_TEMPERATURE=0.30
PRIORITY_WEIGHT_EXPIRATION=0.25
PRIORITY_WEIGHT_CUSTOMER=0.15
PRIORITY_WEIGHT_VALUE=0.10
PRIORITY_WEIGHT_TIME_WINDOW=0.15
PRIORITY_WEIGHT_FRAGILITY=0.05

# Priority thresholds
PRIORITY_CRITICAL_THRESHOLD=75
PRIORITY_HIGH_THRESHOLD=60
PRIORITY_MEDIUM_THRESHOLD=40

# GPS Tracking Settings
GPS_UPDATE_INTERVAL_SECONDS=15
GPS_BATCH_SIZE=1000
GPS_RETENTION_DAYS=30

# Debug
DEBUG_SQL=false
DEBUG_CACHE=false
EOF

echo -e "${GREEN}✅ .env file created${NC}"
echo ""

# ============================================
# Step 7: Install Dependencies
# ============================================
echo -e "${BLUE}📦 Step 7: Installing dependencies...${NC}"

npm install --silent

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# ============================================
# Step 8: Generate Prisma Client
# ============================================
echo -e "${BLUE}🔨 Step 8: Generating Prisma Client...${NC}"

npx prisma generate

echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# ============================================
# Step 9: Push Schema to Database
# ============================================
echo -e "${BLUE}🚀 Step 9: Deploying database schema...${NC}"

npx prisma db push --skip-generate

echo -e "${GREEN}✅ Schema deployed${NC}"
echo ""

# ============================================
# Step 10: Seed Database
# ============================================
echo -e "${BLUE}🌱 Step 10: Seeding database with sample data...${NC}"

read -p "Do you want to seed the database with sample data? (y/n): " SEED_DB

if [ "$SEED_DB" = "y" ]; then
    npx ts-node prisma/seed.ts
    echo -e "${GREEN}✅ Database seeded${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping seed${NC}"
fi

echo ""

# ============================================
# Step 11: Verify Installation
# ============================================
echo -e "${BLUE}✅ Step 11: Verifying installation...${NC}"

# Count tables
TABLE_COUNT=$(psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")

echo "📊 Database Statistics:"
echo "  - Tables created: $TABLE_COUNT"

if [ "$SEED_DB" = "y" ]; then
    PRODUCT_COUNT=$(psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -tAc "SELECT COUNT(*) FROM products" 2>/dev/null || echo "0")
    STORE_COUNT=$(psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -tAc "SELECT COUNT(*) FROM stores" 2>/dev/null || echo "0")
    DRIVER_COUNT=$(psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -tAc "SELECT COUNT(*) FROM drivers" 2>/dev/null || echo "0")

    echo "  - Products: $PRODUCT_COUNT"
    echo "  - Stores: $STORE_COUNT"
    echo "  - Drivers: $DRIVER_COUNT"
fi

echo ""

# ============================================
# Cleanup
# ============================================
unset PGPASSWORD

# ============================================
# Final Summary
# ============================================
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📊 Database Details:"
echo "   Host: $RDS_ENDPOINT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Port: $DB_PORT"
echo ""
echo "📝 Next Steps:"
echo "   1. Update API keys in .env file"
echo "   2. Start development server: npm run dev"
echo "   3. Open Prisma Studio: npx prisma studio"
echo "   4. View documentation: cat prisma/README.md"
echo ""
echo -e "${BLUE}🎉 Happy coding!${NC}"
echo ""
