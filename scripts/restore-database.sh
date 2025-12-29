#!/bin/bash
#
# WMS Database Restore Script
# Restores PostgreSQL database from compressed backup
#
# Usage: bash restore-database.sh [backup-file]
#   backup-file: Path to backup file (default: latest backup)
#
# Example:
#   bash restore-database.sh /opt/wms/backups/database/wms-db-20251228-140000.sql.gz
#   bash restore-database.sh  # Uses latest backup
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WMS_DIR="/opt/wms"
BACKUP_DIR="/opt/wms/backups/database"
BACKUP_FILE="${1:-$BACKUP_DIR/wms-db-latest.sql.gz}"

echo -e "${RED}========================================"
echo -e "WMS Database Restore"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will REPLACE the current database!${NC}"
echo -e "${YELLOW}⚠️  All current data will be LOST!${NC}"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/wms-db-*.sql.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

# Show backup info
echo "Backup file: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "Backup date: $(stat -c %y "$BACKUP_FILE" | cut -d'.' -f1)"
echo ""

# Verify backup integrity
echo "Verifying backup integrity..."
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${RED}Error: Backup file is corrupted${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backup file is valid${NC}"
echo ""

# Confirm restore
echo -e "${YELLOW}This action cannot be undone!${NC}"
read -p "Type 'RESTORE' in uppercase to continue: " -r
echo
if [ "$REPLY" != "RESTORE" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo ""
echo "Starting restore process..."
echo ""

cd "$WMS_DIR/w7-WHv1"

# Check if database container is running
if ! docker compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    echo -e "${RED}Error: Database container is not running${NC}"
    exit 1
fi

echo "[1/6] Creating pre-restore backup..."
# Create a backup of current state before restore
PRE_RESTORE_BACKUP="$BACKUP_DIR/wms-db-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U wms_user -d wms | gzip > "$PRE_RESTORE_BACKUP"
echo -e "${GREEN}✓ Pre-restore backup created: $PRE_RESTORE_BACKUP${NC}"

echo "[2/6] Stopping application services..."
# Stop backend and celery to prevent write operations
docker compose -f docker-compose.prod.yml stop backend celery-worker celery-beat
echo -e "${GREEN}✓ Services stopped${NC}"

echo "[3/6] Terminating active database connections..."
# Terminate all connections to database
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d postgres <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'wms' AND pid <> pg_backend_pid();
EOF
echo -e "${GREEN}✓ Connections terminated${NC}"

echo "[4/6] Dropping and recreating database..."
# Drop existing database
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d postgres <<EOF
DROP DATABASE IF EXISTS wms;
CREATE DATABASE wms;
EOF
echo -e "${GREEN}✓ Database recreated${NC}"

echo "[5/6] Restoring from backup..."
# Restore from backup file
if gunzip -c "$BACKUP_FILE" | \
    docker compose -f docker-compose.prod.yml exec -T db \
    psql -U wms_user -d wms > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    echo ""
    echo "Attempting to restore from pre-restore backup..."
    gunzip -c "$PRE_RESTORE_BACKUP" | \
        docker compose -f docker-compose.prod.yml exec -T db \
        psql -U wms_user -d wms
    echo -e "${YELLOW}Restored from pre-restore backup${NC}"
    exit 1
fi

echo "[6/6] Restarting application services..."
# Restart services
docker compose -f docker-compose.prod.yml start backend celery-worker celery-beat
sleep 5

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Warning: Backend health check timed out${NC}"
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}========================================"
echo -e "Restore Complete!"
echo -e "========================================${NC}"
echo ""

# Verify restoration
echo "Verification:"
echo ""

# Check table counts
echo "Table counts:"
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms <<EOF
SELECT 'users' as table_name, count(*) FROM users
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'warehouses', count(*) FROM warehouses
UNION ALL SELECT 'bins', count(*) FROM bins
UNION ALL SELECT 'bin_contents', count(*) FROM bin_contents;
EOF

echo ""
echo "Restored from: $BACKUP_FILE"
echo "Pre-restore backup: $PRE_RESTORE_BACKUP"
echo "Completed: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test critical functionality"
echo "2. Verify data integrity"
echo "3. Check recent movements and operations"
echo "4. Monitor logs for errors"
echo ""

# Create restore log
RESTORE_LOG="$WMS_DIR/logs/restore-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$WMS_DIR/logs"
cat > "$RESTORE_LOG" << EOF
Restore Log: $(date '+%Y-%m-%d %H:%M:%S')
========================================
Restored from: $BACKUP_FILE
Pre-restore backup: $PRE_RESTORE_BACKUP
User: $(whoami)
Status: SUCCESS

Services:
$(docker compose -f "$WMS_DIR/w7-WHv1/docker-compose.prod.yml" ps)
EOF

echo "Restore log: $RESTORE_LOG"
echo ""
echo -e "${GREEN}Database restore completed successfully!${NC}"
