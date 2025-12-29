# WMS - Warehouse Management System
## Complete Technical Documentation

[![CI Status](https://img.shields.io/badge/CI-passing-brightgreen)](https://github.com/w7-mgfcode/w7-WAREHOUSE/actions)
[![Tests](https://img.shields.io/badge/tests-279%20passing-brightgreen)](#testing)
[![Coverage](https://img.shields.io/badge/backend-100%25-brightgreen)](#testing)
[![Production Ready](https://img.shields.io/badge/production-ready-blue)](#production-deployment)

**A modern Warehouse Management System with FEFO (First Expired, First Out) inventory management, built with FastAPI and PostgreSQL.**

---

## 📋 Table of Contents

### Getting Started
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)

### Development
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
- [Configuration](#configuration)
- [API Reference](#api-reference)

### Production & Operations
- [Production Deployment](#production-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Performance](#performance)

### Testing & Quality
- [Testing](#testing)
- [Code Quality](#code-quality)

### Additional Resources
- [Features Deep Dive](#features-deep-dive)
- [Environment Variables](#environment-variables)
- [Docker Configuration](#docker-configuration)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

WMS is a **production-ready** warehouse management system specifically designed for pallet racking warehouses managing food products with strict expiry date requirements. The system enforces **FEFO (First Expired, First Out)** compliance to ensure food safety and regulatory adherence.

### Key Capabilities
- ✅ **FEFO Enforcement**: Automated 3-level sort algorithm for picking oldest products first
- ✅ **Multi-Warehouse Management**: Support for multiple warehouses with cross-warehouse transfers
- ✅ **Immutable Audit Trail**: Complete chain of custody for regulatory compliance
- ✅ **Real-Time Inventory**: React 19 frontend with TanStack Query for live updates
- ✅ **Background Automation**: Celery tasks for cleanup, expiry alerts, and maintenance
- ✅ **100% Hungarian UI**: All user-facing text, validation, and formatting in Hungarian

### Current Status
**Phase 7 - Manual Testing** (Phases 1-6 Complete ✅)
- **Test Coverage**: 279 total tests (173 backend + 47 E2E + 59 unit)
- **CI/CD**: 3-job pipeline passing (backend 1m45s, frontend 38s, E2E 3m50s)
- **Production Infrastructure**: 6 Docker services, zero-downtime deployment
- **Monitoring**: 20+ Prometheus metrics, structured JSON logging, rate limiting

---

## ✨ Key Features

### Food Safety & Compliance
- **FEFO Algorithm**: 3-level sort priority (`use_by_date → batch_number → received_date`)
- **Expiry Warnings**: 4 urgency levels with automatic email alerts (critical < 7 days)
- **Manager Override**: FEFO override with documented reason for exceptional cases
- **Movement Audit Trail**: Immutable history of all inventory transactions
- **Batch Tracking**: Complete traceability from receipt to issue

### Full-Stack Modern Application
- **Frontend**: React 19 with useActionState, useOptimistic hooks, Tailwind CSS 4.0
- **Backend**: FastAPI 0.125.0 with async Python 3.13+, SQLAlchemy 2.0.45
- **Database**: PostgreSQL 17 with async driver (asyncpg)
- **Cache**: Valkey 8.1 (Redis-compatible, BSD licensed)
- **Real-time**: TanStack Query 5.90+ for server state synchronization

### Production-Ready DevOps
- **Zero-Downtime Deployment**: Automated script with pre-deployment backup
- **6 Docker Services**: PostgreSQL, Valkey, Backend (Gunicorn), Celery Worker/Beat, Frontend (Nginx)
- **Automated Scripts**: install-production.sh, deploy.sh, backup-database.sh, restore-database.sh
- **Monitoring**: 20+ Prometheus metrics, structured JSON logging, SlowAPI rate limiting
- **Security**: UFW firewall, Fail2Ban, non-root Docker containers, secret management

### Enterprise Testing
- **Backend**: 173 pytest tests (100% coverage for Phases 1-6)
- **E2E**: 47 Playwright tests (chromium, firefox, webkit) with graceful degradation
- **Unit**: 59 Vitest tests with 70% coverage thresholds
- **CI/CD**: 3-job pipeline (backend, frontend, E2E) with automatic test runs

### Advanced Operations
- **Stock Reservations**: FEFO-compliant allocation with automatic expiry
- **Warehouse Transfers**: Same-warehouse (immediate) and cross-warehouse (dispatch/confirm workflow)
- **Background Jobs**: 3 Celery scheduled tasks (cleanup reservations, check expiry, send alerts)
- **Bulk Operations**: Cartesian product bin generation (e.g., A-C × 1-10 × 1-5 × 1-4 = 600 bins)
- **Multi-Warehouse**: Centralized inventory management across multiple sites

---

## 🛠 Technology Stack

### Backend (December 2025 - Latest Stable)

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.13+ | Runtime environment (latest stable) |
| FastAPI | 0.125.0 | High-performance async web framework |
| SQLAlchemy | 2.0.45 | Async ORM with relationship management |
| Pydantic | 2.11+ | Data validation with @field_validator |
| PostgreSQL | 17.7 | Primary database with JSONB support |
| Valkey | 8.1 | Redis-compatible cache (BSD license) |
| Alembic | 1.14+ | Database migration tool |
| Celery | 5.4+ | Distributed task queue |
| asyncpg | Latest | PostgreSQL async driver |
| bcrypt | 4.x | Password hashing (< 5.0 for passlib compat) |
| python-jose | Latest | JWT token generation/validation |

### Frontend (December 2025 - React 19)

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 19.0.1 | UI framework with latest hooks |
| TypeScript | 5.7+ | Type-safe development |
| Vite | 7.2+ | Lightning-fast build tool + HMR |
| Tailwind CSS | 4.0 | CSS-first configuration with @theme |
| shadcn/ui | canary | React 19 + Tailwind v4 components |
| TanStack Query | 5.90+ | Server state management |
| Zustand | 5.x | Client state (auth, UI prefs) |
| React Hook Form | 7.54+ | Form handling with validation |
| Zod | 4.2+ | Schema validation |
| date-fns | 4.1+ | Hungarian locale date formatting |
| Recharts | 3.6+ | Dashboard charts |
| axios | 1.13+ | HTTP client with interceptors |

### DevOps & Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | Latest | Container platform |
| Docker Compose | Latest | Multi-container orchestration |
| Gunicorn | 23.0+ | WSGI HTTP server (production) |
| Uvicorn | Latest | ASGI server (4 workers) |
| Nginx | 1.27 | Static hosting + reverse proxy |
| GitHub Actions | Latest | CI/CD pipeline (3 jobs) |
| UFW | Latest | Uncomplicated Firewall |

### Testing & Quality

| Component | Version | Purpose |
|-----------|---------|---------|
| pytest | Latest | Backend test framework (173 tests) |
| Playwright | 1.57+ | E2E testing (47 tests, multi-browser) |
| Vitest | 4.0+ | Frontend unit testing (59 tests) |
| Testing Library | 16.3+ | React component testing |
| ruff | Latest | Python linting + formatting |
| mypy | Latest | Static type checking |
| ESLint | 9.39+ | Frontend linting |
| TypeScript ESLint | 8.46+ | TypeScript-specific linting |

### Monitoring & Observability

| Component | Version | Purpose |
|-----------|---------|---------|
| prometheus-client | 0.21+ | Metrics collection (20+ metrics) |
| python-json-logger | 3.2+ | Structured JSON logging |
| slowapi | 0.1.9+ | Rate limiting (100 req/min default) |
| aiosmtplib | 3.0+ | Async SMTP for email alerts |

---

## 🏗 Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            User Browser                                 │
│                     (React 19 + Tailwind v4)                           │
│  • SPA with client-side routing (React Router v7)                     │
│  • Dark mode support (next-themes)                                    │
│  • Hungarian localization (date-fns hu locale)                        │
│  • JWT token refresh (automatic via interceptors)                     │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Nginx (Port 80/443)                              │
│  • Serves static assets (React build)                                  │
│  • SPA routing (try_files → index.html)                               │
│  • API proxy (/api/* → backend:8000)                                   │
│  • Security headers (CSP, X-Frame-Options, X-XSS-Protection)          │
│  • Gzip compression + asset caching (1 year)                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Gunicorn + 4 Uvicorn Workers)            │
│  • REST API (30+ endpoints organized by feature)                       │
│  • JWT authentication with access/refresh tokens                       │
│  • Role-based access control (admin, manager, warehouse, viewer)      │
│  • FEFO business logic (services layer)                                │
│  • Rate limiting (SlowAPI: 100 req/min default)                       │
│  • Prometheus metrics endpoint (/metrics)                              │
│  • Health check endpoint (/health)                                     │
└───────┬─────────┬──────────┬──────────┬──────────┬──────────────────────┘
        │         │          │          │          │
        ▼         ▼          ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────┐
│PostgreSQL│ │ Valkey │ │  Celery │ │ Celery  │ │  External SMTP   │
│    17    │ │  8.1   │ │ Worker  │ │  Beat   │ │     (Email)      │
│          │ │        │ │         │ │         │ │                  │
│ • Users  │ │• Cache │ │• Cleanup│ │• Hourly │ │• Expiry alerts   │
│ • Prods  │ │• Broker│ │• Alerts │ │• Daily  │ │  (Hungarian)     │
│ • Bins   │ │• Result│ │         │ │         │ │                  │
│ • Invtry │ │        │ │         │ │         │ │                  │
│ • Movmts │ │        │ │         │ │         │ │                  │
└──────────┘ └────────┘ └─────────┘ └─────────┘ └──────────────────┘
```

### Component Responsibilities

1. **Frontend (React 19 + Nginx)**
   - Serves single-page application with client-side routing
   - Handles user authentication (stores refresh token in localStorage)
   - Manages UI state (Zustand) and server state (TanStack Query)
   - Provides real-time inventory updates via polling
   - Dark mode persistence across sessions

2. **Backend (FastAPI + Gunicorn)**
   - Exposes REST API with 30+ endpoints
   - Validates requests with Pydantic v2 schemas
   - Implements FEFO business logic in services layer
   - Manages JWT authentication (15min access, 7day refresh)
   - Enforces RBAC at endpoint level
   - Tracks metrics (HTTP, inventory, auth, errors)

3. **PostgreSQL 17**
   - Stores all persistent data (users, products, suppliers, bins, inventory, movements)
   - Handles async queries via asyncpg driver
   - Supports JSONB for flexible metadata
   - Connection pooling (10 min, 20 max)

4. **Valkey 8.1**
   - Caches frequently accessed data
   - Acts as Celery message broker
   - Stores Celery task results
   - Session storage (future enhancement)

5. **Celery Worker**
   - Processes background tasks asynchronously
   - 3 tasks: cleanup expired reservations, check expiry warnings, send email alerts
   - Task timeout: 300 seconds
   - Single task prefetch (prevents blocking)

6. **Celery Beat**
   - Schedules periodic tasks
   - Hourly: Cleanup expired reservations
   - Daily: Check expiry warnings + send alerts
   - Uses database scheduler for persistence

### Data Flow Examples

#### 1. Inventory Receipt (FEFO Entry Point)
```
User → Frontend → POST /api/v1/inventory/receive
                   ↓
               Backend validates request (Pydantic)
                   ↓
               Service checks bin availability
                   ↓
               Creates BinContent record (batch_number, use_by_date, quantity)
                   ↓
               Creates BinMovement record (type="receipt", immutable)
                   ↓
               Returns success with bin content ID
                   ↓
               Frontend updates inventory view (TanStack Query invalidates cache)
```

#### 2. FEFO Issue (Critical Path)
```
User → Frontend → GET /api/v1/inventory/fefo-recommendation?product_id=X&quantity=100
                   ↓
               Backend queries all bin_contents for product X
                   ↓
               FEFO service sorts by use_by_date ASC, batch_number ASC, received_date ASC
                   ↓
               Allocates from oldest batches first until quantity met
                   ↓
               Returns picking list with bin codes and quantities
                   ↓
               Frontend displays picking recommendations
                   ↓
User confirms → POST /api/v1/inventory/issue
                   ↓
               Backend decrements bin_contents quantities
                   ↓
               Creates BinMovement records (type="issue")
                   ↓
               Validates FEFO compliance (manager override if violated)
                   ↓
               Returns success
```

#### 3. Background Job: Expiry Alerts (Automated)
```
Celery Beat (daily) → Triggers check_expiry_warnings_task
                        ↓
                   Worker queries bin_contents with use_by_date within warning threshold
                        ↓
                   Groups by urgency (critical < 7 days, high 7-14 days)
                        ↓
                   If EMAIL_ENABLED → Triggers send_expiry_alerts_task
                        ↓
                   Worker builds Hungarian HTML + text email
                        ↓
                   Sends to ALERT_RECIPIENT_EMAILS via SMTP
                        ↓
                   Logs execution to job_executions table
```

---

## 🚀 Quick Start

### Prerequisites

**Development**:
- Docker Desktop 20.10+ (Windows/Mac) or Docker Engine (Linux)
- Git 2.30+
- Node.js 22+ (for frontend)
- Python 3.13+ (optional, for local backend development without Docker)

**Production**:
- Ubuntu 24.04 LTS (recommended) or Ubuntu 22.04 LTS
- Docker Engine 20.10+
- 4GB+ RAM (minimum), 8GB+ recommended
- 50GB+ disk space (10GB app + 40GB database/logs/backups)
- Public IP or domain name (for HTTPS)

### Option 1: Full Stack with Docker (Recommended for Development)

Start backend, database, and frontend together:

```bash
# 1. Clone repository
git clone <repository-url>
cd w7-WAREHOUSE/w7-WHv1

# 2. Create environment file (optional, has defaults)
cp .env.example .env
# Edit .env if needed (JWT_SECRET, DATABASE_URL, etc)

# 3. Start backend services (PostgreSQL, Valkey, Backend)
docker-compose up -d

# 4. Verify services are healthy
docker-compose ps
# All services should show "healthy" status

# 5. Run database migrations
docker-compose exec backend alembic upgrade head

# 6. Seed initial data
docker-compose exec backend python -m app.db.seed
# Creates admin user (admin/Admin123!) and sample data

# 7. Start frontend development server
cd frontend
npm install
npm run dev

# 8. Access application
# Backend API docs: http://localhost:8000/docs
# Backend health: http://localhost:8000/health
# Frontend UI: http://localhost:5173
# Default login: admin / Admin123!
```

**Development Architecture**:
- **Backend**: Runs in Docker with `--reload` for hot-reload
- **Frontend**: Runs with Vite dev server (HMR enabled)
- **Database**: PostgreSQL 17 in Docker (port 5432)
- **Cache**: Valkey 8.1 in Docker (port 6379)

**Hot Reload**:
- Backend: Changes to `app/*.py` trigger automatic reload
- Frontend: Changes to `src/**/*` trigger instant HMR updates

### Option 2: Local Development (Backend + Frontend Separate)

Run backend and frontend separately for debugging:

```bash
# Terminal 1: Start only database services
cd w7-WHv1
docker-compose up -d db valkey

# Terminal 2: Run backend locally
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms"
export JWT_SECRET="your-super-secret-key-change-in-production-min-32-chars"
export VALKEY_URL="valkey://localhost:6379"

# Run migrations and seed
alembic upgrade head
python -m app.db.seed

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Run frontend
cd frontend
npm install
npm run dev
# Access: http://localhost:5173
```

**When to use this option**:
- Debugging backend with breakpoints (use VS Code/PyCharm debugger)
- Testing database queries directly (use PostgreSQL client)
- Profiling backend performance

### Option 3: Production Deployment (One-Command Install)

Deploy to production Ubuntu server:

```bash
# SSH to your Ubuntu 24.04 server
ssh user@your-server-ip

# Clone repository
cd /opt
sudo git clone <repository-url> wms
cd wms

# Run automated installation script
sudo bash scripts/install-production.sh

# This script performs:
# 1. System updates (apt update && apt upgrade)
# 2. Docker Engine installation
# 3. UFW firewall configuration (allows 22, 80, 443)
# 4. Fail2Ban installation (DDoS protection)
# 5. Generates secure secrets (JWT_SECRET, DB_PASSWORD, VALKEY_PASSWORD)
# 6. Creates .env.prod file with production settings
# 7. Builds 6 Docker images (multi-stage, optimized)
# 8. Runs docker-compose.prod.yml
# 9. Executes database migrations
# 10. Seeds initial data

# Installation takes ~10-15 minutes (depending on server speed)

# Verify installation
docker ps
# Should show 6 running containers:
# - wms-db-prod (PostgreSQL 17)
# - wms-valkey-prod (Valkey 8.1)
# - wms-backend-prod (FastAPI + Gunicorn)
# - wms-celery-worker-prod
# - wms-celery-beat-prod
# - wms-frontend-prod (Nginx)

# Check application health
curl http://localhost:8000/health
# Should return: {"status": "healthy"}

# Access application
# Open browser: http://your-server-ip
# Login: admin / Admin123!
# IMPORTANT: Change password immediately in production!
```

**Production Stack**: 6 services
- PostgreSQL 17 (persistent volume)
- Valkey 8.1 (persistent volume)
- Backend (Gunicorn + 4 Uvicorn workers)
- Celery Worker (background tasks)
- Celery Beat (task scheduler)
- Frontend (Nginx serving React build)

**Post-Installation**:
1. Change admin password immediately
2. Configure HTTPS (see [Security](#security))
3. Set up monitoring (see [Monitoring & Observability](#monitoring--observability))
4. Configure backup cron job (see [Production Deployment](#production-deployment))

**📘 See [Production Deployment](#production-deployment) section for zero-downtime updates and rollback procedures**

---

## 📦 Production Deployment

### Server Requirements

**Minimum Requirements**:
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB SSD
- OS: Ubuntu 24.04 LTS or 22.04 LTS
- Network: Public IP with ports 22, 80, 443 open

**Recommended Requirements**:
- CPU: 4+ cores
- RAM: 8+ GB
- Disk: 50+ GB SSD (10GB app + 40GB database/logs/backups)
- OS: Ubuntu 24.04 LTS (latest)
- Network: Domain name with HTTPS (Let's Encrypt)

**Disk Space Breakdown**:
- Docker images: ~2 GB (6 services)
- Database: 5-50 GB (depends on inventory size)
- Application code: ~500 MB
- Logs: 1-5 GB (rotated daily)
- Backups: 10-100 GB (30-day retention)

### Installation Scripts

#### 1. install-production.sh - Automated Setup

**Purpose**: Fresh Ubuntu server installation with all dependencies

**Duration**: ~10-15 minutes

**What it does**:
1. **System Updates**: `apt update && apt upgrade -y`
2. **Docker Installation**: Installs Docker Engine + Docker Compose
3. **UFW Firewall**: Configures firewall (allows 22, 80, 443)
4. **Fail2Ban**: Installs DDoS protection for SSH
5. **Directory Setup**: Creates `/opt/wms` structure
6. **Git Clone**: Clones repository to `/opt/wms`
7. **Secret Generation**:
   - `JWT_SECRET`: 48-byte base64 random string
   - `DB_PASSWORD`: 32-byte base64 random string
   - `VALKEY_PASSWORD`: 24-byte base64 random string
8. **.env.prod Creation**: Generates production environment file with secure defaults
9. **Docker Image Build**: Builds 6 production images (multi-stage, optimized)
10. **Service Startup**: Runs `docker-compose -f docker-compose.prod.yml up -d`
11. **Database Migrations**: `alembic upgrade head`
12. **Data Seeding**: Creates admin user and sample data

**Usage**:
```bash
cd /opt
sudo git clone <repository-url> wms
cd wms
sudo bash scripts/install-production.sh
```

**Post-Installation**:
- Application: http://your-server-ip
- Login: admin / Admin123!
- Secrets stored in: `/opt/wms/.env.prod` (600 permissions)

#### 2. deploy.sh - Zero-Downtime Deployment

**Purpose**: Update production with minimal downtime

**Duration**: ~5-10 minutes

**What it does**:
1. **Pre-Deployment Backup**: Creates database backup before changes
2. **Git Pull**: Fetches latest code from specified branch (default: main)
3. **Commit Verification**: Stores previous commit SHA for rollback
4. **Image Rebuild**: Rebuilds Docker images with `--no-cache`
5. **Database Migrations**: Runs `alembic upgrade head` (with rollback on failure)
6. **Rolling Restart**:
   - Backend (wait for health check)
   - Frontend (wait for health check)
   - Celery Worker (graceful shutdown)
   - Celery Beat (graceful shutdown)
7. **Health Check Loop**: 30-second polls with 120-second timeout
8. **Post-Deployment Verification**:
   - All services running
   - Health endpoints responding
   - Database connectivity
   - Celery worker ping

**Usage**:
```bash
cd /opt/wms
sudo bash scripts/deploy.sh [branch]

# Examples:
sudo bash scripts/deploy.sh main           # Deploy main branch
sudo bash scripts/deploy.sh feature-xyz    # Deploy feature branch
```

**Rollback on Failure**:
- If migrations fail → automatic git reset to previous commit
- If health checks fail → manual rollback instructions displayed
- Backup created before deployment for emergency restoration

**Deployment Log**: `/opt/wms/logs/deploy-{timestamp}.log`

#### 3. backup-database.sh - Automated Backup

**Purpose**: Create compressed PostgreSQL backup with verification

**Duration**: ~1-5 minutes (depends on database size)

**What it does**:
1. **pg_dump**: Exports full database with schema + data
2. **Gzip Compression**: Reduces backup size (~90% compression ratio)
3. **Integrity Check**: Verifies backup file is valid and > 1MB
4. **Metadata File**: Creates `.meta` file with timestamp, size, commit SHA
5. **Symlink Latest**: Creates `latest-backup.sql.gz` symlink
6. **Retention Cleanup**: Deletes backups older than 30 days
7. **Offsite Copy** (optional): rsync to remote server or S3 upload (commented examples)

**Usage**:
```bash
cd /opt/wms
sudo bash scripts/backup-database.sh

# Backup saved to: /opt/wms/backups/wms-backup-YYYYMMDD-HHMMSS.sql.gz
```

**3-2-1 Backup Strategy**:
- **3 copies**: 1 production + 2 local backups (30-day retention)
- **2 media types**: Local disk + cloud/offsite storage
- **1 offsite copy**: rsync to remote server or S3 (configure in script)

**Cron Job** (daily at 2 AM):
```bash
# Add to /etc/cron.d/wms-backup
0 2 * * * root /opt/wms/scripts/backup-database.sh >> /opt/wms/logs/backup.log 2>&1
```

#### 4. restore-database.sh - Disaster Recovery

**Purpose**: Restore database from backup with safety checks

**Duration**: ~5-15 minutes (depends on backup size)

**What it does**:
1. **Pre-Restore Backup**: Creates current database backup before restoration (safety)
2. **Service Shutdown**: Stops backend, Celery worker, Celery beat
3. **Connection Termination**: Kills active database connections
4. **Database Drop & Recreate**: `DROP DATABASE wms; CREATE DATABASE wms;`
5. **Gunzip & Restore**: Decompresses and imports backup with `psql`
6. **Service Restart**: Starts backend, Celery worker, Celery beat
7. **Health Check**: Verifies services are healthy
8. **Table Count Verification**: Compares table counts before/after

**Usage**:
```bash
cd /opt/wms
sudo bash scripts/restore-database.sh /opt/wms/backups/wms-backup-20251229-020000.sql.gz

# Or restore latest:
sudo bash scripts/restore-database.sh /opt/wms/backups/latest-backup.sql.gz
```

**Restore Log**: `/opt/wms/logs/restore-{timestamp}.log`

### Deployment Workflow

#### Initial Deployment
```bash
# 1. Prepare server (Ubuntu 24.04)
ssh root@your-server-ip

# 2. Run automated installation
cd /opt
git clone <repository-url> wms
cd wms
bash scripts/install-production.sh
# Duration: ~10-15 minutes

# 3. Verify installation
docker ps  # Should show 6 running containers
curl http://localhost:8000/health  # Should return {"status": "healthy"}

# 4. Access application
# http://your-server-ip
# Login: admin / Admin123!

# 5. Change admin password immediately
# 6. Configure HTTPS (see Security section)
# 7. Set up backup cron job
```

#### Updating Production
```bash
# 1. SSH to server
ssh root@your-server-ip
cd /opt/wms

# 2. Run deployment script
bash scripts/deploy.sh main
# Duration: ~5-10 minutes

# 3. Verify deployment
docker ps  # All containers should be running
curl http://localhost:8000/health  # Should return healthy
curl http://localhost/  # Frontend should load

# 4. Check logs if issues
docker logs wms-backend-prod --tail 50
docker logs wms-frontend-prod --tail 50
```

#### Rollback Procedure
```bash
# If deployment fails or issues detected:

# 1. Check deployment log
cat /opt/wms/logs/deploy-*.log | tail -100

# 2. Manual rollback to previous commit
cd /opt/wms
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-sha>

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify rollback
curl http://localhost:8000/health

# 5. If database corrupted, restore from backup
bash scripts/restore-database.sh /opt/wms/backups/latest-backup.sql.gz
```

### Security Hardening

**Automatic (via install-production.sh)**:
- ✅ UFW firewall configured (allows 22, 80, 443)
- ✅ Fail2Ban installed (SSH brute-force protection)
- ✅ Docker non-root users (appuser UID 1000)
- ✅ Secure secrets generation (JWT_SECRET, passwords)
- ✅ .env.prod file permissions (600 - owner only)

**Manual Steps** (recommended):
1. **Change Default Passwords**:
   ```bash
   # Change admin password via UI
   # Or via database:
   docker exec -it wms-backend-prod python -c "
   from app.db.session import get_db
   from app.core.security import get_password_hash
   # Update admin password
   "
   ```

2. **Configure HTTPS** (Let's Encrypt):
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx

   # Get certificate
   sudo certbot --nginx -d your-domain.com

   # Auto-renewal
   sudo systemctl enable certbot.timer
   ```

3. **Restrict SSH**:
   ```bash
   # Disable root login
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

4. **Enable Firewall Logging**:
   ```bash
   sudo ufw logging on
   ```

5. **Configure SMTP for Alerts**:
   ```bash
   # Edit .env.prod
   sudo nano /opt/wms/.env.prod
   # Set: EMAIL_ENABLED=true
   # Set: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
   # Set: ALERT_RECIPIENT_EMAILS=admin@example.com

   # Restart services
   cd /opt/wms
   docker-compose -f docker-compose.prod.yml restart celery-worker celery-beat
   ```

### Monitoring Production

**Health Checks**:
```bash
# Backend health
curl http://localhost:8000/health
# Expected: {"status": "healthy"}

# Frontend health
curl http://localhost/health
# Expected: nginx welcome or frontend HTML

# Service status
docker ps
# All 6 containers should be "Up" and "healthy"

# Database connectivity
docker exec -it wms-db-prod psql -U wms_user -d wms -c "SELECT version();"

# Celery worker ping
docker exec -it wms-backend-prod celery -A app.tasks.celery_app inspect ping
# Expected: {"worker@...": {"ok": "pong"}}
```

**Resource Usage**:
```bash
# Container stats
docker stats --no-stream

# Disk space
df -h /opt/wms
df -h /var/lib/docker

# Database size
docker exec -it wms-db-prod psql -U wms_user -d wms -c "
SELECT pg_size_pretty(pg_database_size('wms'));
"
```

**Log Monitoring**:
```bash
# Backend logs (last 50 lines)
docker logs wms-backend-prod --tail 50 --follow

# Frontend logs
docker logs wms-frontend-prod --tail 50

# Celery worker logs
docker logs wms-celery-worker-prod --tail 50

# Database logs
docker logs wms-db-prod --tail 50

# All errors (grep)
docker logs wms-backend-prod 2>&1 | grep -i error
```

**Performance Monitoring**:
```bash
# API response times (avg last 100 requests)
docker exec -it wms-backend-prod python -c "
from app.core.metrics import wms_http_request_duration_seconds
print(wms_http_request_duration_seconds.collect())
"

# Database connection pool
docker exec -it wms-db-prod psql -U wms_user -d wms -c "
SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';
"
```

---

## 📊 Monitoring & Observability

### Prometheus Metrics (20+ Metrics)

The backend exposes comprehensive Prometheus metrics at `/metrics` endpoint.

**HTTP Metrics**:
```python
# Total HTTP requests
wms_http_requests_total{method="GET", endpoint="/api/v1/products", status_code="200"}

# HTTP request latency histogram
wms_http_request_duration_seconds{method="POST", endpoint="/api/v1/inventory/receive"}
# Buckets: 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 10.0
```

**Inventory Metrics**:
```python
# Current stock levels
wms_inventory_stock_total{warehouse_id="uuid", product_id="uuid"} 150.0

# Expiry warnings count
wms_inventory_expiry_warnings_total{urgency="critical"} 3
wms_inventory_expiry_warnings_total{urgency="high"} 12

# Expired items
wms_inventory_expired_items_total{warehouse_id="uuid"} 2

# Movement count
wms_inventory_movements_total{type="receipt", warehouse_id="uuid"} 45
```

**Transfer & Reservation Metrics**:
```python
# Transfer count by status
wms_transfers_total{status="completed"} 23
wms_transfers_total{status="pending"} 5

# Transfer duration histogram
wms_transfer_duration_seconds{from_warehouse="A", to_warehouse="B"}

# Active reservations
wms_reservations_active{warehouse_id="uuid"} 7

# Reservation count
wms_reservations_total{status="fulfilled"} 15
```

**Database & Celery Metrics**:
```python
# Active database connections
wms_db_connections_active 8

# Database query duration
wms_db_query_duration_seconds{query_type="select"}

# Celery tasks
wms_celery_tasks_total{task_name="check_expiry_warnings_task", status="success"} 30

# Celery task duration
wms_celery_task_duration_seconds{task_name="cleanup_expired_reservations_task"}

# Celery queue length
wms_celery_queue_length{queue_name="default"} 0
```

**Authentication & Error Metrics**:
```python
# Login attempts
wms_auth_attempts_total{result="success"} 245
wms_auth_attempts_total{result="failure"} 12

# Active sessions
wms_active_sessions 15

# Errors by type
wms_errors_total{error_type="ValidationError", severity="warning"} 3
wms_errors_total{error_type="DatabaseError", severity="error"} 1
```

### Structured JSON Logging

Production logs use JSON format for easy parsing with ELK/Loki/CloudWatch:

**Log Format**:
```json
{
  "timestamp": "2025-12-29T14:23:45.678Z",
  "level": "INFO",
  "logger": "app.services.inventory",
  "message": "Inventory receipt completed",
  "app": "wms",
  "version": "1.0.0",
  "phase": "6",
  "process": 1234,
  "thread": 5678,
  "module": "inventory",
  "function": "receive_goods",
  "line": 145,
  "user_id": "uuid",
  "request_id": "uuid",
  "bin_id": "uuid",
  "product_id": "uuid",
  "quantity": 100
}
```

**Log Levels**:
- `DEBUG`: Development details (disabled in production)
- `INFO`: Normal operations (inventory movements, user actions)
- `WARNING`: Recoverable issues (FEFO override, low stock)
- `ERROR`: Unhandled exceptions (database errors, API failures)
- `CRITICAL`: System failures (database down, critical data corruption)

**Configuring Logging** (`app/core/logging_config.py`):
```python
from app.core.logging_config import setup_logging

# In main.py or app startup
setup_logging(
    log_level="INFO",           # DEBUG, INFO, WARNING, ERROR, CRITICAL
    log_format="json",          # "json" or "text"
    enable_file_logging=True,
    log_file_path="/var/log/wms/app.log"
)
```

### Rate Limiting (SlowAPI)

**Default Limits**:
- Authentication endpoints: 20 requests/minute (prevent brute-force)
- Read operations (GET): 200 requests/minute
- Write operations (POST/PUT/DELETE): 100 requests/minute (default)
- Bulk operations: 20 requests/minute
- Reports: 50 requests/minute

**Rate Limiting Key**:
- Authenticated users: `user:{user_id}`
- Anonymous users: IP address

**Rate Limit Exceeded Response** (HTTP 429):
```json
{
  "detail": "Túl sok kérés. Kérjük, próbálja újra később.",
  "error_code": "RATE_LIMIT_EXCEEDED"
}
```

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640876400
Retry-After: 60
```

**Configuring Rate Limits** (`app/core/rate_limit.py`):
```python
from slowapi import Limiter
from app.core.rate_limit import authenticated_limiter

# Apply to specific endpoint
@router.post("/resource")
@authenticated_limiter.limit("50/minute")  # Custom limit
async def create_resource():
    ...
```

### Email Alerts (Hungarian)

**Expiry Alert Email** (sent daily if EMAIL_ENABLED=true):

**Subject**: `[WMS] Lejárat Figyelmeztetés - {critical_count} kritikus, {high_count} magas`

**Content** (HTML + Text):
- Summary: Total items by urgency (critical, high)
- Critical items table: Product, SKU, Batch, Bin, Warehouse, Quantity, Expiry Date, Days Remaining
- High priority items table: Same columns
- Footer: Warehouse name, date generated

**Email Configuration** (.env.prod):
```bash
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=wms@example.com
SMTP_FROM_NAME=WMS - Raktárkezelő Rendszer
SMTP_TLS=true
EXPIRY_WARNING_DAYS=14
EXPIRY_CRITICAL_DAYS=7
ALERT_RECIPIENT_EMAILS=manager@example.com,admin@example.com
```

**Testing Email**:
```python
# In Python shell (docker exec -it wms-backend-prod python)
from app.services.email import send_test_email

await send_test_email(
    to_email="admin@example.com",
    smtp_settings={...}  # From config
)
```

**Celery Schedule** (daily at 8:00 AM):
```python
# app/tasks/__init__.py
beat_schedule = {
    'check-expiry-daily': {
        'task': 'app.tasks.jobs.check_expiry_warnings_task',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
    },
}
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. Backend Fails to Start

**Symptoms**:
- `docker ps` shows backend container restarting
- Backend logs show connection errors

**Possible Causes**:

**A. Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs wms-db-prod --tail 50

# Verify DATABASE_URL in .env.prod
cat .env.prod | grep DATABASE_URL

# Test database connection manually
docker exec -it wms-db-prod psql -U wms_user -d wms -c "SELECT 1;"
```

**Solution**:
```bash
# Restart database
docker restart wms-db-prod

# Wait for healthy status
docker ps | grep postgres
# Should show "healthy"

# Restart backend
docker restart wms-backend-prod
```

**B. Missing Database Migrations**
```bash
# Check migration status
docker exec -it wms-backend-prod alembic current

# Run pending migrations
docker exec -it wms-backend-prod alembic upgrade head
```

**C. Invalid JWT_SECRET**
```bash
# Check JWT_SECRET length (must be 32+ characters)
cat .env.prod | grep JWT_SECRET | wc -c

# If too short, regenerate:
JWT_SECRET=$(openssl rand -base64 48)
echo "JWT_SECRET=$JWT_SECRET" >> .env.prod

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

#### 2. Frontend Shows "Network Error"

**Symptoms**:
- Frontend loads but shows "Hiba történt" (Error occurred)
- Browser console shows CORS or network errors

**Possible Causes**:

**A. Backend Not Running**
```bash
# Check backend status
docker ps | grep backend
curl http://localhost:8000/health
```

**Solution**: Restart backend (see issue #1)

**B. Wrong API URL**
```bash
# Check Nginx proxy configuration
docker exec -it wms-frontend-prod cat /etc/nginx/nginx.conf | grep proxy_pass
# Should show: proxy_pass http://backend:8000;
```

**C. CORS Configuration**
```bash
# Check backend CORS settings (app/main.py)
docker exec -it wms-backend-prod python -c "
from app.main import app
print(app.middleware)
"
# Should show CORSMiddleware configured
```

#### 3. Login Fails with Valid Credentials

**Symptoms**:
- User enters correct username/password
- Login returns 401 Unauthorized

**Possible Causes**:

**A. User Not Seeded**
```bash
# Check if admin user exists
docker exec -it wms-db-prod psql -U wms_user -d wms -c "
SELECT id, username, email, role, is_active FROM users WHERE username='admin';
"

# If no results, run seed script
docker exec -it wms-backend-prod python -m app.db.seed
```

**B. User Inactive**
```bash
# Check is_active flag
docker exec -it wms-db-prod psql -U wms_user -d wms -c "
UPDATE users SET is_active=true WHERE username='admin';
"
```

**C. Password Hash Mismatch** (bcrypt 5.0.0 issue)
```bash
# Check bcrypt version (must be <5.0.0)
docker exec -it wms-backend-prod pip show bcrypt
# Should show: Version: 4.x.x

# If 5.0.0, downgrade:
docker exec -it wms-backend-prod pip install 'bcrypt<5.0.0'
docker restart wms-backend-prod
```

#### 4. Celery Tasks Not Running

**Symptoms**:
- Expiry alerts not being sent
- Expired reservations not cleaned up

**Possible Causes**:

**A. Valkey Not Running**
```bash
# Check Valkey status
docker ps | grep valkey
docker logs wms-valkey-prod --tail 50

# Test Valkey connection
docker exec -it wms-valkey-prod valkey-cli ping
# Should return: PONG
```

**Solution**: Restart Valkey
```bash
docker restart wms-valkey-prod
docker restart wms-celery-worker-prod wms-celery-beat-prod
```

**B. Wrong Broker URL**
```bash
# Check CELERY_BROKER_URL
cat .env.prod | grep CELERY_BROKER_URL
# Should be: redis://:password@valkey:6379/0

# Test connection
docker exec -it wms-backend-prod python -c "
from celery import Celery
app = Celery(broker='redis://:password@valkey:6379/0')
print(app.control.inspect().ping())
"
```

**C. Task Not Registered**
```bash
# List registered tasks
docker exec -it wms-celery-worker-prod celery -A app.tasks.celery_app inspect registered
# Should show: cleanup_expired_reservations_task, check_expiry_warnings_task, send_expiry_alerts_task

# If missing, rebuild worker
docker-compose -f docker-compose.prod.yml build celery-worker
docker-compose -f docker-compose.prod.yml restart celery-worker
```

#### 5. E2E Tests Failing

**Symptoms**:
- Playwright tests fail with timeouts
- Tests can't find elements

**Possible Causes**:

**A. Backend Not Running**
```bash
# Start backend for tests
cd w7-WHv1
docker-compose up -d
docker-compose exec backend alembic upgrade head
docker-compose exec backend python -m app.db.seed
```

**B. Frontend Not Running**
```bash
# Start frontend dev server
cd w7-WHv1/frontend
npm run dev
```

**C. Database Not Seeded**
```bash
# Seed test data
docker-compose exec backend python -m app.db.seed
```

**D. Hungarian Text Selector Mismatch**
```bash
# Check selectors in e2e/auth/login.spec.ts
# Should use exact Hungarian text:
page.getByRole('button', { name: 'Bejelentkezés' })  # NOT 'Login'
```

#### 6. Production Deployment Fails

**Symptoms**:
- deploy.sh exits with errors
- Services don't start after deployment

**Possible Causes**:

**A. Disk Full**
```bash
# Check disk space
df -h /opt/wms
df -h /var/lib/docker

# Clean up old Docker images
docker system prune -a -f

# Clean up old backups (keep last 7)
find /opt/wms/backups -name "*.sql.gz" -mtime +7 -delete
```

**B. Build Failure** (frontend)
```bash
# Check frontend build logs
docker logs wms-frontend-prod --tail 100

# Common issue: Node memory limit
# Solution: Increase memory in docker-compose.prod.yml
# frontend:
#   environment:
#     NODE_OPTIONS: "--max-old-space-size=4096"
```

**C. Git Conflicts**
```bash
# Check git status
cd /opt/wms
git status

# If conflicts, resolve manually
git stash          # Save local changes
git pull           # Get remote changes
git stash pop      # Reapply local changes
# Resolve conflicts, then:
bash scripts/deploy.sh
```

### Debugging Tools

**Backend Debugging**:
```bash
# Python shell (with app context)
docker exec -it wms-backend-prod python
>>> from app.db.session import async_session
>>> from app.db.models import User
>>> # Query database, test functions, etc.

# View environment variables
docker exec -it wms-backend-prod env | grep -E '(DATABASE|JWT|VALKEY)'

# Check SQLAlchemy queries (enable echo)
docker exec -it wms-backend-prod python -c "
from sqlalchemy import create_engine
engine = create_engine('postgresql://...', echo=True)
"
```

**Database Debugging**:
```bash
# psql shell
docker exec -it wms-db-prod psql -U wms_user -d wms

# Common queries:
SELECT * FROM users WHERE username='admin';
SELECT * FROM bins WHERE status='occupied';
SELECT COUNT(*) FROM bin_contents WHERE use_by_date < NOW();

# Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Frontend Debugging**:
```bash
# Check build output
cd w7-WHv1/frontend
npm run build 2>&1 | tee build.log

# Check bundle size
ls -lh dist/assets/*.js

# Analyze bundle
npm run build -- --mode=analyze
```

**Docker Debugging**:
```bash
# Inspect container
docker inspect wms-backend-prod | jq '.[0].State'

# View container filesystem
docker exec -it wms-backend-prod ls -la /app

# Copy files from container
docker cp wms-backend-prod:/app/logs/app.log ./local-app.log

# View resource usage
docker stats --no-stream
```

---

## 📄 License

**Proprietary** - All rights reserved.

---

## 📚 Additional Documentation

For complete documentation, see:
- **[Root README.md](../README.md)** - Project overview and quick start
- **[Production Deployment Guide](../Docs/Production_Deployment.md)** - Detailed deployment procedures
- **[Operations Runbook](../Docs/Operations_Runbook.md)** - Daily operations and maintenance
- **[Security Hardening Guide](../Docs/Security_Hardening.md)** - Security best practices
- **[Backup & Recovery Guide](../Docs/Backup_Recovery.md)** - Backup strategy and disaster recovery
- **[Phase 6 Comprehensive Guide](../Docs/Phase6_Testing_DevOps.md)** - 11,000 words, 22 sections
- **[GitHub Workflow](../Docs/GitHub_Workflow.md)** - Development conventions

---

**Last Updated**: 2025-12-29 | **Status**: Phase 7 - Manual Testing | **Version**: 1.0.0 (Production Ready)

---

**End of Technical Documentation** - For questions or issues, see [Troubleshooting](#troubleshooting) or create an issue.
