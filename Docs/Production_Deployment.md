# Production Deployment Guide

**WMS (Warehouse Management System) - Phase 6**
**Last Updated**: 2025-12-28

This guide covers deploying the WMS to a production Ubuntu 24.04 server using Docker Compose.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Initial Deployment](#initial-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Updating the Application](#updating-the-application)
8. [Rollback Procedure](#rollback-procedure)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Ubuntu 24.04 LTS** (server or desktop)
- **Docker Engine** 27.x or later
- **Docker Compose** v2.30 or later
- **Git** 2.x
- **OpenSSL** (for generating secrets)

### Server Access

- SSH access with sudo privileges
- Domain name pointing to server (optional but recommended)
- SSL/TLS certificate (Let's Encrypt recommended)

### Network Requirements

- Open ports:
  - `80` (HTTP) - Frontend access
  - `443` (HTTPS) - Secure frontend access (with reverse proxy)
  - `22` (SSH) - Server management

---

## Server Requirements

### Minimum Specifications

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 20 GB SSD | 50+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Disk Space Breakdown

- Docker images: ~2 GB
- PostgreSQL data: 5-50 GB (depends on usage)
- Application logs: 1-5 GB
- Backups: 10-100 GB (depends on backup retention)

---

## Installation Steps

### 1. System Update

```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install basic utilities
sudo apt install -y curl wget git vim htop ufw
```

### 2. Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify Docker installation
docker --version
docker compose version
```

### 3. Configure Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 4. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/wms
sudo chown $USER:$USER /opt/wms

# Clone repository
cd /opt/wms
git clone https://github.com/w7-mgfcode/warehouse-management-system.git .

# Checkout main branch
git checkout main
```

### 5. Generate Secrets

```bash
# Generate JWT secret (min 32 characters)
openssl rand -base64 48

# Generate PostgreSQL password
openssl rand -base64 24

# Generate Valkey password
openssl rand -base64 24
```

**Save these values securely!** You'll need them in the `.env` file.

---

## Configuration

### 1. Create Production Environment File

Create `/opt/wms/.env.prod`:

```bash
# Database Configuration
DB_NAME=wms
DB_USER=wms_user
DB_PASSWORD=<GENERATED_POSTGRES_PASSWORD>

# JWT Authentication (CRITICAL: Use strong random value)
JWT_SECRET=<GENERATED_JWT_SECRET>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Valkey (Redis) Configuration
VALKEY_PASSWORD=<GENERATED_VALKEY_PASSWORD>

# Application Settings
TIMEZONE=Europe/Budapest
LANGUAGE=hu
DEBUG=false

# Celery (Background Tasks)
# Note: CELERY_BROKER_URL and CELERY_RESULT_BACKEND are automatically constructed
# in docker-compose.prod.yml using VALKEY_PASSWORD. Do NOT set them here.

# Email Configuration (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=wms@example.com
SMTP_PASSWORD=<SMTP_PASSWORD>
SMTP_FROM_EMAIL=wms@example.com
SMTP_TLS=true
EMAIL_ENABLED=true

# Expiry Alerts
EXPIRY_WARNING_DAYS=14
EXPIRY_CRITICAL_DAYS=7
ALERT_RECIPIENT_EMAILS=manager@example.com,warehouse@example.com

# Monitoring (Optional)
# PROMETHEUS_ENABLED=true
# LOG_LEVEL=INFO
```

### 2. Set File Permissions

```bash
# Protect .env.prod file
chmod 600 /opt/wms/.env.prod
chown $USER:$USER /opt/wms/.env.prod
```

### 3. Configure Docker Compose

The production stack is defined in `w7-WHv1/docker-compose.prod.yml`:

```yaml
services:
  - db (PostgreSQL 17)
  - valkey (Valkey 8.1)
  - backend (FastAPI + Gunicorn)
  - celery-worker (Background tasks)
  - celery-beat (Scheduled tasks)
  - frontend (React 19 + Nginx)
```

**No changes needed** - the compose file uses environment variables from `.env.prod`.

**Variable Substitution Pattern**:
- Simple variables (e.g., `JWT_SECRET`, `VALKEY_PASSWORD`) are read directly from `.env.prod`
- Complex URLs with embedded variables (e.g., `CELERY_BROKER_URL=redis://:${VALKEY_PASSWORD}@valkey:6379/0`) are constructed in `docker-compose.prod.yml` using Docker Compose's `${VAR}` substitution
- Docker Compose performs variable expansion **only** in the compose file, **not** in `.env` files

---

## Initial Deployment

### 1. Build Docker Images

```bash
cd /opt/wms/w7-WHv1

# Build all images (takes 5-10 minutes)
docker compose -f docker-compose.prod.yml --env-file ../.env.prod build
```

### 2. Start Services

```bash
# Start all services in detached mode
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d

# Check service status
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                    STATUS    PORTS
wms-backend-prod        Up        0.0.0.0:8000->8000/tcp
wms-celery-beat-prod    Up
wms-celery-worker-prod  Up
wms-db-prod             Up        5432/tcp
wms-frontend-prod       Up        0.0.0.0:80->80/tcp
wms-valkey-prod         Up        6379/tcp
```

### 3. Initialize Database

```bash
# Wait for PostgreSQL to be ready (check logs)
docker compose -f docker-compose.prod.yml logs -f db

# Run database migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed initial data (creates admin user)
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```

### 4. Default Admin Credentials

After seeding, the default admin account is:

- **Username**: `admin`
- **Password**: `Admin123!`

**⚠️ CRITICAL**: Change this password immediately after first login!

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health check
curl http://localhost:8000/health

# Expected: {"status":"healthy"}

# Frontend health check
curl http://localhost/health

# Expected: healthy
```

### 2. Test API Access

```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Expected: {"access_token":"...","token_type":"bearer",...}
```

### 3. Check Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# Follow specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f celery-worker
```

### 4. Verify Celery Tasks

```bash
# Check Celery worker status
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app inspect active

# Check Celery beat status
docker compose -f docker-compose.prod.yml exec celery-beat celery -A app.tasks.celery_app inspect scheduled
```

### 5. Access Frontend

Open browser to:
- `http://<server-ip>` or
- `http://your-domain.com`

You should see the WMS login page in Hungarian.

---

## Updating the Application

### Zero-Downtime Update Procedure

```bash
# 1. Pull latest changes
cd /opt/wms
git fetch origin
git pull origin main

# 2. Rebuild images
cd w7-WHv1
docker compose -f docker-compose.prod.yml --env-file ../.env.prod build

# 3. Run migrations (if any)
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 4. Rolling restart (minimal downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker compose -f docker-compose.prod.yml up -d --no-deps --build frontend
docker compose -f docker-compose.prod.yml up -d --no-deps --build celery-worker
docker compose -f docker-compose.prod.yml up -d --no-deps --build celery-beat

# 5. Verify health
curl http://localhost:8000/health
curl http://localhost/health
```

### Alternative: Full Restart (30-60 seconds downtime)

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Start updated services
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

---

## Rollback Procedure

### Quick Rollback to Previous Version

```bash
# 1. Stop current services
cd /opt/wms/w7-WHv1
docker compose -f docker-compose.prod.yml down

# 2. Checkout previous version
cd /opt/wms
git log --oneline -10  # Find previous commit hash
git checkout <previous-commit-hash>

# 3. Rebuild and restart
cd w7-WHv1
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d --build

# 4. Verify health
curl http://localhost:8000/health
```

### Database Rollback

If migrations need to be rolled back:

```bash
# Downgrade to previous migration
docker compose -f docker-compose.prod.yml exec backend alembic downgrade -1

# Or restore from backup (see Backup_Recovery.md)
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker compose -f docker-compose.prod.yml logs <service-name>

# Common issues:
# - PostgreSQL: Check DB_PASSWORD in .env.prod
# - Backend: Check JWT_SECRET (must be >= 32 chars)
# - Celery: Check VALKEY_PASSWORD matches
```

### Database Connection Errors

```bash
# Check PostgreSQL health
docker compose -f docker-compose.prod.yml exec db pg_isready -U wms_user

# Check DATABASE_URL format
# Should be: postgresql+asyncpg://wms_user:<password>@db:5432/wms

# Restart database
docker compose -f docker-compose.prod.yml restart db
```

### Frontend 502 Bad Gateway

```bash
# Check if backend is running
docker compose -f docker-compose.prod.yml ps backend

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### Celery Tasks Not Running

```bash
# Check Valkey connection
docker compose -f docker-compose.prod.yml exec valkey valkey-cli ping
# Expected: PONG

# Check Celery worker logs
docker compose -f docker-compose.prod.yml logs celery-worker

# Restart Celery services
docker compose -f docker-compose.prod.yml restart celery-worker celery-beat
```

### High Memory Usage

```bash
# Check container resource usage
docker stats

# If PostgreSQL is using too much memory:
# - Add shared_buffers limit in postgresql.conf
# - Tune work_mem and maintenance_work_mem

# If backend is using too much memory:
# - Reduce Gunicorn worker count in Dockerfile.prod
# - Check for memory leaks in application logs
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a --volumes  # WARNING: Removes unused data

# Clean up old images
docker image prune -a

# Clean up old logs
sudo journalctl --vacuum-time=7d
```

---

## Next Steps

- **Security**: See [Security_Hardening.md](./Security_Hardening.md) for production security setup
- **Operations**: See [Operations_Runbook.md](./Operations_Runbook.md) for daily operations
- **Backups**: See [Backup_Recovery.md](./Backup_Recovery.md) for backup and recovery procedures

---

## Support

For issues and bug reports:
- GitHub Issues: https://github.com/w7-mgfcode/warehouse-management-system/issues
- Email: support@example.com
