# Operations Runbook

**WMS (Warehouse Management System) - Phase 6**
**Last Updated**: 2025-12-28

This runbook provides operational procedures for managing the WMS in production.

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Monitoring](#monitoring)
3. [Common Tasks](#common-tasks)
4. [Incident Response](#incident-response)
5. [Maintenance Windows](#maintenance-windows)
6. [Performance Tuning](#performance-tuning)
7. [Log Management](#log-management)

---

## Daily Operations

### Morning Health Check

Perform these checks every morning before business hours:

```bash
# 1. Check all services are running
cd /opt/wms/w7-WHv1
docker compose -f docker-compose.prod.yml ps

# Expected: All services "Up" status

# 2. Check service health
curl http://localhost:8000/health  # Backend
curl http://localhost/health       # Frontend

# 3. Check resource usage
docker stats --no-stream

# 4. Check disk space
df -h
# Alert if > 80% full

# 5. Check recent errors in logs
docker compose -f docker-compose.prod.yml logs --since 24h --tail 100 | grep -i error
```

### Weekly Tasks

**Every Monday:**

```bash
# 1. Review error logs from past week
docker compose -f docker-compose.prod.yml logs --since 168h | grep -i error > /opt/wms/logs/weekly-errors.log

# 2. Check database size growth
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'wms';"

# 3. Verify backup success (see Backup_Recovery.md)
ls -lh /opt/wms/backups/ | tail -7

# 4. Review Celery task execution stats
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app inspect stats
```

### Monthly Tasks

**First of each month:**

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Update Docker images (if security patches available)
docker compose -f docker-compose.prod.yml pull

# 3. Clean up old Docker resources
docker system prune -f

# 4. Review and archive old logs
sudo journalctl --vacuum-time=30d

# 5. Test backup restoration (see Backup_Recovery.md)
# Follow "Test Restore" procedure

# 6. Review user accounts and deactivate unused ones
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.session import get_sync_session
from app.db.models.user import User
from datetime import datetime, timedelta, UTC

with get_sync_session() as session:
    inactive_30d = datetime.now(UTC) - timedelta(days=30)
    users = session.query(User).filter(User.last_login < inactive_30d).all()
    for user in users:
        print(f'{user.username} - Last login: {user.last_login}')
"
```

---

## Monitoring

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| CPU Usage | > 70% | > 90% | Scale up or optimize |
| Memory Usage | > 80% | > 95% | Investigate leaks |
| Disk Usage | > 80% | > 90% | Clean up or expand |
| Database Connections | > 80 | > 95 | Check connection pool |
| API Response Time | > 500ms | > 2000ms | Investigate slow queries |
| Error Rate | > 1% | > 5% | Check logs immediately |

### Prometheus Metrics (Phase 6E)

If Prometheus is configured, these metrics are available:

```bash
# Access metrics endpoint
curl http://localhost:8000/metrics

# Key metrics:
# - wms_http_requests_total{method,endpoint,status_code}
# - wms_http_request_duration_seconds{method,endpoint}
# - wms_inventory_stock_total{warehouse_id,product_id}
# - wms_inventory_expiry_warnings_total{urgency}
# - wms_db_connections_active
# - wms_celery_tasks_total{task_name,status}
# - wms_errors_total{error_type,severity}
```

### Real-Time Monitoring Commands

```bash
# 1. Watch service resource usage
watch -n 5 'docker stats --no-stream'

# 2. Follow backend logs (JSON format in production)
docker compose -f docker-compose.prod.yml logs -f backend | jq .

# 3. Monitor API requests
docker compose -f docker-compose.prod.yml logs -f backend | grep "HTTP request"

# 4. Watch database connections
watch -n 10 'docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT count(*) as connections, state
FROM pg_stat_activity
WHERE datname = '\''wms'\''
GROUP BY state;"'

# 5. Monitor Celery queue length
watch -n 30 'docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app inspect active_queues'
```

---

## Common Tasks

### Restart Services

```bash
# Restart single service
docker compose -f docker-compose.prod.yml restart backend

# Restart all services (30-60s downtime)
docker compose -f docker-compose.prod.yml restart

# Restart with rebuild (use for code changes)
docker compose -f docker-compose.prod.yml up -d --build backend
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs backend

# Follow logs (real-time)
docker compose -f docker-compose.prod.yml logs -f backend

# Last N lines
docker compose -f docker-compose.prod.yml logs --tail 100 backend

# Logs since timestamp
docker compose -f docker-compose.prod.yml logs --since 2025-12-28T10:00:00

# Logs from last N hours
docker compose -f docker-compose.prod.yml logs --since 2h
```

### Access Container Shell

```bash
# Backend container (Python)
docker compose -f docker-compose.prod.yml exec backend bash

# Database container (PostgreSQL)
docker compose -f docker-compose.prod.yml exec db bash

# Frontend container (Nginx)
docker compose -f docker-compose.prod.yml exec frontend sh

# Celery worker container
docker compose -f docker-compose.prod.yml exec celery-worker bash
```

### Database Operations

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms

# Run SQL query
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "SELECT count(*) FROM users;"

# Check database size
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT pg_size_pretty(pg_database_size('wms')) as size;"

# List active connections
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'wms';"

# Kill stuck query (emergency only)
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT pg_terminate_backend(<pid>);"
```

### User Management

```bash
# List all users
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.session import get_sync_session
from app.db.models.user import User

with get_sync_session() as session:
    users = session.query(User).all()
    for user in users:
        print(f'{user.username} - {user.role} - Active: {user.is_active}')
"

# Deactivate user
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.session import get_sync_session
from app.db.models.user import User

username = 'problematic_user'
with get_sync_session() as session:
    user = session.query(User).filter(User.username == username).first()
    if user:
        user.is_active = False
        session.commit()
        print(f'User {username} deactivated')
    else:
        print(f'User {username} not found')
"

# Reset user password (generates random password)
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.session import get_sync_session
from app.db.models.user import User
from app.core.security import get_password_hash
import secrets
import string

username = 'user_to_reset'
# Generate random password
alphabet = string.ascii_letters + string.digits + string.punctuation
new_password = ''.join(secrets.choice(alphabet) for i in range(16))

with get_sync_session() as session:
    user = session.query(User).filter(User.username == username).first()
    if user:
        user.password_hash = get_password_hash(new_password)
        session.commit()
        print(f'User: {username}')
        print(f'New password: {new_password}')
        print('SAVE THIS PASSWORD SECURELY!')
    else:
        print(f'User {username} not found')
"
```

### Clear Celery Queue

```bash
# Purge all tasks from queue (emergency only)
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app purge

# Inspect active tasks
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app inspect active

# Revoke specific task
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app revoke <task-id>
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P1 - Critical** | Complete outage, data loss risk | < 15 minutes | Immediate |
| **P2 - High** | Major feature down, performance degraded | < 1 hour | After 30 min |
| **P3 - Medium** | Minor feature issue, workaround available | < 4 hours | After 2 hours |
| **P4 - Low** | Cosmetic issue, no business impact | < 1 day | Not required |

### P1: Service Completely Down

```bash
# 1. Check if all services are running
docker compose -f docker-compose.prod.yml ps

# 2. If services are down, restart them
docker compose -f docker-compose.prod.yml up -d

# 3. Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail 200 | grep -i error

# 4. If database connection errors, check PostgreSQL
docker compose -f docker-compose.prod.yml exec db pg_isready -U wms_user

# 5. If persistent, rollback to previous version (see Production_Deployment.md)
```

### P2: High Error Rate

```bash
# 1. Check error logs
docker compose -f docker-compose.prod.yml logs --since 1h backend | grep -i error

# 2. Check metrics (if Prometheus enabled)
curl http://localhost:8000/metrics | grep wms_errors_total

# 3. Check database performance
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
ORDER BY duration DESC;"

# 4. Restart affected service
docker compose -f docker-compose.prod.yml restart backend
```

### P3: Slow Performance

```bash
# 1. Check resource usage
docker stats --no-stream

# 2. Check database connections
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT count(*) as connections FROM pg_stat_activity WHERE datname = 'wms';"

# 3. Check for slow queries
docker compose -f docker-compose.prod.yml logs backend | grep "duration_ms"

# 4. Restart Celery if background tasks are stuck
docker compose -f docker-compose.prod.yml restart celery-worker celery-beat
```

### P4: Celery Tasks Failing

```bash
# 1. Check Celery worker logs
docker compose -f docker-compose.prod.yml logs celery-worker | grep -i error

# 2. Check Valkey connection
docker compose -f docker-compose.prod.yml exec valkey valkey-cli ping

# 3. Restart Celery services
docker compose -f docker-compose.prod.yml restart celery-worker celery-beat

# 4. Re-run failed tasks manually (if needed)
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.tasks.celery_app import send_expiry_alerts
send_expiry_alerts.delay()
"
```

---

## Maintenance Windows

### Planned Maintenance Procedure

**Recommended maintenance window**: Sunday 02:00-04:00 (lowest traffic)

1. **Announce Maintenance** (24 hours before):
   - Email users
   - Post notice on login page
   - Set up status page

2. **Pre-Maintenance Backup**:
   ```bash
   # Full backup before maintenance
   /opt/wms/scripts/backup-database.sh
   ```

3. **Perform Maintenance**:
   ```bash
   # Update application
   cd /opt/wms
   git pull origin main
   cd w7-WHv1
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d --build
   ```

4. **Post-Maintenance Verification**:
   ```bash
   # Health checks
   curl http://localhost:8000/health
   curl http://localhost/health

   # Test API
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"<admin-password>"}'

   # Check logs for errors
   docker compose -f docker-compose.prod.yml logs --tail 100 | grep -i error
   ```

5. **Announce Completion**:
   - Email users
   - Remove maintenance notice
   - Update status page

---

## Performance Tuning

### Database Optimization

```bash
# Run VACUUM ANALYZE (weekly)
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "VACUUM ANALYZE;"

# Check table sizes
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Identify slow queries (requires pg_stat_statements extension)
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

### Application Performance

```bash
# Adjust Gunicorn worker count (in backend/Dockerfile.prod)
# Formula: (2 x CPU cores) + 1
# Example for 4 cores: 9 workers

# Restart backend after change
docker compose -f docker-compose.prod.yml up -d --build backend

# Monitor worker memory usage
docker stats wms-backend-prod
```

### Celery Performance

```bash
# Adjust Celery concurrency
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app control pool_grow 2

# Check task execution stats
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app inspect stats
```

---

## Log Management

### Log Rotation

Logs are managed by Docker's logging driver. Configure log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Apply changes:
```bash
sudo systemctl restart docker
cd /opt/wms/w7-WHv1
docker compose -f docker-compose.prod.yml restart
```

### Export Logs

```bash
# Export all logs from last 24 hours
docker compose -f docker-compose.prod.yml logs --since 24h > /opt/wms/logs/app-$(date +%Y%m%d).log

# Export specific service logs
docker compose -f docker-compose.prod.yml logs backend --since 24h > /opt/wms/logs/backend-$(date +%Y%m%d).log

# Export logs with timestamps
docker compose -f docker-compose.prod.yml logs -t --since 24h > /opt/wms/logs/timestamped-$(date +%Y%m%d).log
```

### Search Logs

```bash
# Search for errors
docker compose -f docker-compose.prod.yml logs | grep -i error

# Search for specific user activity
docker compose -f docker-compose.prod.yml logs backend | grep "user_id"

# Count error occurrences
docker compose -f docker-compose.prod.yml logs | grep -i error | wc -l

# Filter by log level (if using structured JSON logging)
docker compose -f docker-compose.prod.yml logs backend | jq 'select(.level=="ERROR")'
```

---

## Contact Information

**On-Call Engineer**: +36 XX XXX XXXX
**Escalation Manager**: manager@example.com
**Database Admin**: dba@example.com

**External Support**:
- Hosting Provider: support@hosting.com
- Database Support: postgres-support@company.com

---

## Related Documentation

- [Production_Deployment.md](./Production_Deployment.md) - Deployment procedures
- [Security_Hardening.md](./Security_Hardening.md) - Security configuration
- [Backup_Recovery.md](./Backup_Recovery.md) - Backup and recovery procedures
