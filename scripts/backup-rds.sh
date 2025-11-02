#!/bin/bash

# ===================================
# Backup DeliveryGenie RDS Database
# ===================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}💾 DeliveryGenie Database Backup${NC}"
echo "=================================="
echo ""

# Create backups directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Parse DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^\?]+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    fi
else
    echo -e "${RED}❌ DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Check pg_dump
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found${NC}"
    exit 1
fi

# Generate filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/deliverygenie_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo "📊 Backup Details:"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  Output: $BACKUP_FILE_GZ"
echo ""

# Set password
export PGPASSWORD="$DB_PASSWORD"

# Perform backup
echo -e "${BLUE}🔄 Creating backup...${NC}"

pg_dump -h "$DB_HOST" \
        -U "$DB_USER" \
        -p "$DB_PORT" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        -F p \
        -f "$BACKUP_FILE"

# Compress
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip "$BACKUP_FILE"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)

# Cleanup
unset PGPASSWORD

echo ""
echo -e "${GREEN}✅ Backup completed!${NC}"
echo ""
echo "📁 Backup Details:"
echo "  File: $BACKUP_FILE_GZ"
echo "  Size: $FILE_SIZE"
echo ""
echo "📝 To restore this backup:"
echo "  gunzip -c $BACKUP_FILE_GZ | psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME"
echo ""

# List all backups
echo "📚 All Backups:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null || echo "  No backups found"
echo ""

# Cleanup old backups (keep last 7 days)
echo -e "${BLUE}🧹 Cleaning up old backups (keeping last 7 days)...${NC}"
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +7 -delete 2>/dev/null || true
echo -e "${GREEN}✅ Cleanup done${NC}"
echo ""
