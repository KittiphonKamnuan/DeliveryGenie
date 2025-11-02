#!/bin/bash

# ===================================
# Quick Connect to DeliveryGenie RDS
# ===================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load .env file if exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Extract connection details from DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    # Parse DATABASE_URL
    # Format: postgresql://user:password@host:port/database

    # Extract using regex
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^\?]+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        echo -e "${YELLOW}⚠️  Could not parse DATABASE_URL${NC}"
        echo "Please enter connection details manually:"
        read -p "Host: " DB_HOST
        read -p "Port [5432]: " DB_PORT
        DB_PORT=${DB_PORT:-5432}
        read -p "Database [deliverygenie]: " DB_NAME
        DB_NAME=${DB_NAME:-deliverygenie}
        read -p "User [postgres]: " DB_USER
        DB_USER=${DB_USER:-postgres}
        read -sp "Password: " DB_PASSWORD
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not found in .env${NC}"
    echo "Please enter connection details:"
    read -p "Host: " DB_HOST
    read -p "Port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Database [deliverygenie]: " DB_NAME
    DB_NAME=${DB_NAME:-deliverygenie}
    read -p "User [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}
    read -sp "Password: " DB_PASSWORD
    echo ""
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client not found${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo "  Amazon Linux: sudo dnf install postgresql15"
    exit 1
fi

# Display connection info
echo ""
echo -e "${BLUE}🔌 Connecting to DeliveryGenie Database${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Set password for psql
export PGPASSWORD="$DB_PASSWORD"

# Connect
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT"

# Cleanup
unset PGPASSWORD
