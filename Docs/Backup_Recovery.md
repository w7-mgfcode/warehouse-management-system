# Backup and Recovery Guide

**WMS (Warehouse Management System) - Phase 6**
**Last Updated**: 2025-12-28

This guide covers backup strategies and recovery procedures for the WMS.

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Automated Backups](#automated-backups)
5. [Recovery Procedures](#recovery-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Testing and Validation](#testing-and-validation)
8. [Backup Storage](#backup-storage)

---

## Overview

### Backup Scope

**What is backed up:**

| Component | Backup Method | Frequency | Retention |
|-----------|---------------|-----------|-----------|
| PostgreSQL Database | pg_dump | Daily | 30 days |
| Docker Volumes | tar archive | Weekly | 4 weeks |
| Application Code | Git repository | On commit | Infinite |
| Configuration Files | File copy | On change | 30 days |
| SSL Certificates | File copy | Monthly | 12 months |

**What is NOT backed up:**

- Docker images (rebuilt from Dockerfiles)
- System packages (reinstalled via apt)
- Temporary files and logs (rotated automatically)
- Valkey cache (ephemeral data)

### RPO and RTO Targets

- **RPO (Recovery Point Objective)**: 24 hours (daily backups)
- **RTO (Recovery Time Objective)**: 4 hours (time to restore and verify)

---

## Backup Strategy

### 3-2-1 Rule

The industry-standard backup strategy:

- **3** copies of data (1 primary + 2 backups)
- **2** different storage media (local disk + cloud/offsite)
- **1** copy offsite (cloud storage, remote server)

### Backup Locations

```
/opt/wms/backups/
├── database/
│   ├── wms-db-2025-12-28.sql.gz
│   ├── wms-db-2025-12-27.sql.gz
│   └── ...
├── volumes/
│   ├── postgres-data-2025-12-28.tar.gz
│   └── valkey-data-2025-12-28.tar.gz
└── config/
    ├── env-prod-2025-12-28.tar.gz.gpg
    └── nginx-conf-2025-12-28.tar.gz
```

---

## Manual Backup Procedures

### 1. Database Backup

#### Full Database Backup

```bash
# Create backup directory
mkdir -p /opt/wms/backups/database

# Backup with pg_dump
docker compose -f /opt/wms/w7-WHv1/docker-compose.prod.yml exec -T db \
  pg_dump -U wms_user -d wms | gzip > \
  /opt/wms/backups/database/wms-db-$(date +%Y%m%d-%H%M%S).sql.gz

# Verify backup created
ls -lh /opt/wms/backups/database/
```

#### Schema-Only Backup

```bash
# Backup schema only (no data)
docker compose -f /opt/wms/w7-WHv1/docker-compose.prod.yml exec -T db \
  pg_dump -U wms_user -d wms --schema-only | gzip > \
  /opt/wms/backups/database/wms-schema-$(date +%Y%m%d).sql.gz
```

#### Specific Table Backup

```bash
# Backup single table
docker compose -f /opt/wms/w7-WHv1/docker-compose.prod.yml exec -T db \
  pg_dump -U wms_user -d wms -t bin_contents | gzip > \
  /opt/wms/backups/database/bin_contents-$(date +%Y%m%d).sql.gz
```

### 2. Docker Volume Backup

```bash
# Stop services (data consistency)
cd /opt/wms/w7-WHv1
docker compose -f docker-compose.prod.yml down

# Backup PostgreSQL volume
docker run --rm \
  -v wms-postgres-data:/data \
  -v /opt/wms/backups/volumes:/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .

# Backup Valkey volume
docker run --rm \
  -v wms-valkey-data:/data \
  -v /opt/wms/backups/volumes:/backup \
  alpine tar czf /backup/valkey-data-$(date +%Y%m%d).tar.gz -C /data .

# Restart services
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d
```

### 3. Configuration Backup

```bash
# Backup configuration files
mkdir -p /opt/wms/backups/config

# Create encrypted archive
tar czf - \
  /opt/wms/.env.prod \
  /opt/wms/w7-WHv1/docker-compose.prod.yml \
  /opt/wms/w7-WHv1/frontend/nginx.conf \
  | gpg --symmetric --cipher-algo AES256 \
  > /opt/wms/backups/config/config-$(date +%Y%m%d).tar.gz.gpg

# Enter encryption passphrase when prompted
```

### 4. SSL Certificate Backup

```bash
# Backup SSL certificates
mkdir -p /opt/wms/backups/ssl

# Copy certificates
sudo cp -r /etc/letsencrypt /opt/wms/backups/ssl/letsencrypt-$(date +%Y%m%d)

# Create encrypted archive
sudo tar czf - /opt/wms/backups/ssl/letsencrypt-$(date +%Y%m%d) \
  | gpg --symmetric --cipher-algo AES256 \
  > /opt/wms/backups/ssl/ssl-certs-$(date +%Y%m%d).tar.gz.gpg
```

---

## Automated Backups

### Backup Script

Create `/opt/wms/scripts/backup-database.sh` (see [Deployment Scripts](#deployment-scripts) section):

```bash
#!/bin/bash
# Automated database backup script
# Usage: ./backup-database.sh

set -e

BACKUP_DIR="/opt/wms/backups/database"
RETENTION_DAYS=30

# Create backup
docker compose -f /opt/wms/w7-WHv1/docker-compose.prod.yml exec -T db \
  pg_dump -U wms_user -d wms | gzip > \
  "${BACKUP_DIR}/wms-db-$(date +%Y%m%d-%H%M%S).sql.gz"

# Delete old backups
find "${BACKUP_DIR}" -name "wms-db-*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_DIR}/wms-db-$(date +%Y%m%d-%H%M%S).sql.gz"
```

### Cron Schedule

```bash
# Edit crontab
sudo crontab -e

# Add backup schedule
# Daily backup at 2 AM
0 2 * * * /opt/wms/scripts/backup-database.sh >> /var/log/wms-backup.log 2>&1

# Weekly volume backup on Sunday at 3 AM
0 3 * * 0 /opt/wms/scripts/backup-volumes.sh >> /var/log/wms-backup.log 2>&1

# Monthly config backup on 1st of month at 4 AM
0 4 1 * * /opt/wms/scripts/backup-config.sh >> /var/log/wms-backup.log 2>&1
```

### Backup Verification

```bash
# Create verification script
cat > /opt/wms/scripts/verify-backup.sh << 'EOF'
#!/bin/bash
# Verify backup integrity

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Test gzip integrity
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "Error: Backup file is corrupted: $BACKUP_FILE"
    exit 1
fi

echo "Backup file is valid: $BACKUP_FILE"
EOF

chmod +x /opt/wms/scripts/verify-backup.sh

# Run verification
/opt/wms/scripts/verify-backup.sh /opt/wms/backups/database/wms-db-latest.sql.gz
```

---

## Recovery Procedures

### 1. Full Database Restore

```bash
# Stop application services
cd /opt/wms/w7-WHv1
docker compose -f docker-compose.prod.yml stop backend celery-worker celery-beat

# List available backups
ls -lh /opt/wms/backups/database/

# Choose backup to restore
BACKUP_FILE="/opt/wms/backups/database/wms-db-2025-12-28.sql.gz"

# Drop existing database (WARNING: Destructive!)
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d postgres -c "DROP DATABASE IF EXISTS wms;"

# Recreate database
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d postgres -c "CREATE DATABASE wms;"

# Restore from backup
gunzip -c "$BACKUP_FILE" | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U wms_user -d wms

# Restart services
docker compose -f docker-compose.prod.yml start backend celery-worker celery-beat

# Verify restoration
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "SELECT count(*) FROM users;"
```

### 2. Partial Data Restore

Restore specific table:

```bash
# Stop services
docker compose -f docker-compose.prod.yml stop backend

# Restore single table (append mode)
gunzip -c /opt/wms/backups/database/bin_contents-2025-12-28.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U wms_user -d wms

# Restart services
docker compose -f docker-compose.prod.yml start backend
```

### 3. Point-in-Time Recovery

If Write-Ahead Logging (WAL) archiving is enabled:

```bash
# Restore base backup
gunzip -c /opt/wms/backups/database/wms-db-base.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U wms_user -d wms

# Apply WAL archives up to specific timestamp
# Configure recovery.conf in PostgreSQL data directory
# target_time = '2025-12-28 14:30:00'
```

### 4. Docker Volume Restore

```bash
# Stop services
cd /opt/wms/w7-WHv1
docker compose -f docker-compose.prod.yml down

# Remove existing volume
docker volume rm wms-postgres-data

# Create new volume
docker volume create wms-postgres-data

# Restore from backup
docker run --rm \
  -v wms-postgres-data:/data \
  -v /opt/wms/backups/volumes:/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres-data-2025-12-28.tar.gz"

# Restart services
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d
```

### 5. Configuration Restore

```bash
# Decrypt and extract config backup
gpg --decrypt /opt/wms/backups/config/config-2025-12-28.tar.gz.gpg | \
  tar xzf - -C /

# Verify files restored
ls -l /opt/wms/.env.prod
```

---

## Disaster Recovery

### Scenario 1: Complete Server Failure

**Recovery Steps:**

1. **Provision new server**
   ```bash
   # Run installation script
   bash /opt/wms/scripts/install-production.sh
   ```

2. **Restore configuration**
   ```bash
   # Copy .env.prod from backup
   scp backup-server:/opt/wms/backups/config/config-latest.tar.gz.gpg .
   gpg --decrypt config-latest.tar.gz.gpg | tar xzf - -C /
   ```

3. **Clone repository**
   ```bash
   cd /opt/wms
   git clone https://github.com/w7-mgfcode/warehouse-management-system.git .
   git checkout main
   ```

4. **Start services**
   ```bash
   cd w7-WHv1
   docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d
   ```

5. **Restore database**
   ```bash
   # Copy backup from offsite storage
   scp backup-server:/opt/wms/backups/database/wms-db-latest.sql.gz /opt/wms/backups/database/

   # Restore database
   gunzip -c /opt/wms/backups/database/wms-db-latest.sql.gz | \
     docker compose -f docker-compose.prod.yml exec -T db \
     psql -U wms_user -d wms
   ```

6. **Verify and test**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost/health
   ```

**Estimated Time**: 2-4 hours

### Scenario 2: Database Corruption

```bash
# 1. Identify corruption
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "SELECT * FROM users;"
# Error: could not read block...

# 2. Stop services
docker compose -f docker-compose.prod.yml stop backend celery-worker celery-beat

# 3. Attempt repair (may work for minor corruption)
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "REINDEX DATABASE wms;"

# 4. If repair fails, restore from backup (see Full Database Restore)

# 5. Verify data integrity
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public';"
```

### Scenario 3: Accidental Data Deletion

```bash
# Example: Accidentally deleted all products

# 1. Immediately stop writes
docker compose -f docker-compose.prod.yml stop backend

# 2. Check if data can be recovered from WAL logs
# (requires WAL archiving configured)

# 3. Restore from most recent backup
# Follow "Partial Data Restore" procedure for products table

# 4. Verify restoration
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "SELECT count(*) FROM products;"

# 5. Restart services
docker compose -f docker-compose.prod.yml start backend
```

---

## Testing and Validation

### Monthly Backup Test

Perform monthly backup restoration test on separate server:

```bash
# 1. Provision test server
# 2. Install Docker and dependencies
# 3. Restore latest backup
# 4. Verify data integrity
# 5. Test application functionality
# 6. Document results

# Test script
cat > /opt/wms/scripts/test-restore.sh << 'EOF'
#!/bin/bash
# Test backup restoration

BACKUP_FILE="/opt/wms/backups/database/wms-db-latest.sql.gz"

# Create test database
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d postgres -c "
DROP DATABASE IF EXISTS wms_test;
CREATE DATABASE wms_test;
"

# Restore to test database
gunzip -c "$BACKUP_FILE" | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U wms_user -d wms_test

# Run integrity checks
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms_test << SQL
-- Check table counts
SELECT 'users' as table_name, count(*) FROM users
UNION ALL
SELECT 'products', count(*) FROM products
UNION ALL
SELECT 'warehouses', count(*) FROM warehouses
UNION ALL
SELECT 'bins', count(*) FROM bins
UNION ALL
SELECT 'bin_contents', count(*) FROM bin_contents;

-- Check data integrity
SELECT count(*) as orphaned_bins FROM bins b
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.id = b.warehouse_id);

SELECT count(*) as orphaned_contents FROM bin_contents bc
WHERE NOT EXISTS (SELECT 1 FROM bins b WHERE b.id = bc.bin_id);
SQL

# Cleanup
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d postgres -c "DROP DATABASE wms_test;"

echo "Backup test completed successfully"
EOF

chmod +x /opt/wms/scripts/test-restore.sh
```

### Backup Health Checks

```bash
# Check backup freshness (alert if > 25 hours old)
LATEST_BACKUP=$(ls -t /opt/wms/backups/database/wms-db-*.sql.gz | head -1)
BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))

if [ $BACKUP_AGE -gt 90000 ]; then
    echo "WARNING: Latest backup is older than 25 hours!"
    # Send alert email
fi

# Check backup size (alert if < 1MB - likely incomplete)
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")

if [ $BACKUP_SIZE -lt 1048576 ]; then
    echo "WARNING: Latest backup is suspiciously small!"
    # Send alert email
fi
```

---

## Backup Storage

### Local Storage

```bash
# Ensure sufficient disk space
df -h /opt/wms/backups

# Clean up old backups (manual)
find /opt/wms/backups/database -name "wms-db-*.sql.gz" -mtime +30 -delete
find /opt/wms/backups/volumes -name "*.tar.gz" -mtime +90 -delete
```

### Offsite Storage (S3/AWS)

```bash
# Install AWS CLI
sudo apt install awscli

# Configure AWS credentials
aws configure

# Upload backup to S3
aws s3 cp /opt/wms/backups/database/wms-db-$(date +%Y%m%d).sql.gz \
  s3://wms-backups/database/ \
  --storage-class GLACIER

# Automate with cron
0 4 * * * aws s3 sync /opt/wms/backups/database/ s3://wms-backups/database/ --storage-class GLACIER
```

### Offsite Storage (rsync)

```bash
# Setup SSH key for backup server
ssh-keygen -t ed25519 -f ~/.ssh/backup_key
ssh-copy-id -i ~/.ssh/backup_key backup@backup-server.example.com

# Sync backups to remote server
rsync -avz -e "ssh -i ~/.ssh/backup_key" \
  /opt/wms/backups/ \
  backup@backup-server.example.com:/backups/wms/

# Automate with cron
0 5 * * * rsync -avz -e "ssh -i ~/.ssh/backup_key" /opt/wms/backups/ backup@backup-server.example.com:/backups/wms/
```

### Backup Retention Policy

| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| Daily Database | Daily | 30 days | Local + S3 Glacier |
| Weekly Volumes | Weekly | 4 weeks | Local |
| Monthly Full | Monthly | 12 months | S3 Glacier |
| Yearly Archive | Yearly | 7 years | S3 Glacier Deep Archive |

---

## Backup Checklist

### Daily

- [ ] Verify daily backup completed
- [ ] Check backup file size
- [ ] Verify backup integrity (gzip -t)
- [ ] Check disk space

### Weekly

- [ ] Review backup logs
- [ ] Verify offsite sync completed
- [ ] Test random backup restoration

### Monthly

- [ ] Perform full restoration test
- [ ] Review and update retention policy
- [ ] Verify backup encryption
- [ ] Update disaster recovery documentation

---

## Related Documentation

- [Production_Deployment.md](./Production_Deployment.md) - Deployment procedures
- [Operations_Runbook.md](./Operations_Runbook.md) - Daily operations
- [Security_Hardening.md](./Security_Hardening.md) - Security configuration

---

## Emergency Contacts

**Database Admin**: dba@example.com
**DevOps Lead**: devops@example.com
**24/7 Support**: +36 XX XXX XXXX

**Backup Service Providers**:
- AWS Support: https://aws.amazon.com/support/
- Backup Server Provider: backup@hosting.com
