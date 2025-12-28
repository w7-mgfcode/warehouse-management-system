#!/bin/bash
#
# WMS Database Backup Script
# Creates compressed PostgreSQL database backups with rotation
#
# Usage: bash backup-database.sh
#
# Cron example (daily at 2 AM):
#   0 2 * * * /opt/wms/scripts/backup-database.sh >> /var/log/wms-backup.log 2>&1
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
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DATE_ONLY=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/wms-db-${TIMESTAMP}.sql.gz"

echo "========================================" backup-database.sh
echo "WMS Database Backup"
echo "========================================"
echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if WMS directory exists
if [ ! -d "$WMS_DIR" ]; then
    echo -e "${RED}Error: WMS directory not found: $WMS_DIR${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if Docker Compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not found${NC}"
    exit 1
fi

cd "$WMS_DIR/w7-WHv1"

# Check if database container is running
if ! docker compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    echo -e "${RED}Error: Database container is not running${NC}"
    exit 1
fi

echo "[1/5] Creating database backup..."
# Create backup with pg_dump
if docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U wms_user -d wms | gzip > "$BACKUP_FILE"; then
    echo -e "${GREEN}✓ Backup created successfully${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo "[2/5] Verifying backup integrity..."
# Test gzip integrity
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Backup file is valid${NC}"
else
    echo -e "${RED}✗ Backup file is corrupted${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Check backup size
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE")
BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))

if [ $BACKUP_SIZE -lt 1048576 ]; then
    echo -e "${YELLOW}Warning: Backup file is suspiciously small (< 1MB)${NC}"
    echo "Size: $BACKUP_SIZE_MB MB"
fi

echo "[3/5] Creating backup metadata..."
# Create metadata file
METADATA_FILE="$BACKUP_DIR/wms-db-${TIMESTAMP}.meta"
cat > "$METADATA_FILE" << EOF
Backup Metadata
===============
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Database: wms
User: wms_user
Size: $BACKUP_SIZE_MB MB
File: $(basename "$BACKUP_FILE")
Host: $(hostname)
Git Commit: $(cd "$WMS_DIR" && git rev-parse HEAD 2>/dev/null || echo "unknown")
EOF

echo "[4/5] Creating symlink to latest backup..."
# Create symlink to latest backup
ln -sf "$(basename "$BACKUP_FILE")" "$BACKUP_DIR/wms-db-latest.sql.gz"
ln -sf "$(basename "$METADATA_FILE")" "$BACKUP_DIR/wms-db-latest.meta"

echo "[5/5] Cleaning up old backups..."
# Delete backups older than retention period
DELETED_COUNT=$(find "$BACKUP_DIR" -name "wms-db-*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
find "$BACKUP_DIR" -name "wms-db-*.meta" -mtime +${RETENTION_DAYS} -delete

if [ $DELETED_COUNT -gt 0 ]; then
    echo "Deleted $DELETED_COUNT old backup(s) (older than $RETENTION_DAYS days)"
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo "========================================"
echo "Backup Complete!"
echo "========================================"
echo "Backup file: $BACKUP_FILE"
echo "Backup size: $BACKUP_SIZE_MB MB"
echo "Total backups: $(find "$BACKUP_DIR" -name "wms-db-*.sql.gz" | wc -l)"
echo "Total size: $TOTAL_SIZE"
echo "Retention: $RETENTION_DAYS days"
echo "Completed: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Optional: Send to offsite storage (uncomment to enable)
# Uncomment one of the following:

# Option 1: AWS S3
# if command -v aws &> /dev/null; then
#     echo "Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE" s3://wms-backups/database/ --storage-class GLACIER
#     echo "✓ Uploaded to S3"
# fi

# Option 2: rsync to remote server
# REMOTE_HOST="backup@backup-server.example.com"
# REMOTE_DIR="/backups/wms/database"
# if command -v rsync &> /dev/null; then
#     echo "Syncing to remote server..."
#     rsync -avz "$BACKUP_FILE" "${REMOTE_HOST}:${REMOTE_DIR}/"
#     echo "✓ Synced to remote server"
# fi

# Send notification (optional)
# Uncomment if you have mail configured:
# echo "Backup completed: $BACKUP_FILE ($BACKUP_SIZE_MB MB)" | \
#     mail -s "WMS Backup Success - $(date +%Y-%m-%d)" admin@example.com

exit 0
