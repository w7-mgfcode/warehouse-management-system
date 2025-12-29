# Warehouse Management System (WMS)

[![CI Status](https://img.shields.io/badge/CI-passing-brightgreen)](https://github.com/w7-mgfcode/w7-WAREHOUSE/actions)
[![Tests](https://img.shields.io/badge/tests-279%20passing-brightgreen)](#testing)
[![Production Ready](https://img.shields.io/badge/production-ready-blue)](#production-deployment)
[![License](https://img.shields.io/badge/license-proprietary-red)](#license)

**A production-ready warehouse management system for pallet racking warehouses with FEFO (First Expired, First Out) compliance for food products requiring strict expiry date tracking.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**WMS** is a comprehensive, full-stack warehouse management system specifically designed for **pallet racking warehouses** managing **food products**. Built with modern technologies and production-ready DevOps practices, it ensures food safety compliance through automated FEFO (First Expired, First Out) enforcement.

### Target Audience
- Pallet racking warehouses
- Food product distribution centers
- Operations requiring strict expiry date tracking
- Multi-warehouse operations with cross-site transfers

### Key Differentiators
- ✅ **FEFO Compliance**: Automated 3-level sort algorithm ensuring oldest products are picked first
- ✅ **Hungarian Localization**: 100% Hungarian UI with proper date/number formatting
- ✅ **Production-Ready**: Phase 6 complete with 279 tests, zero-downtime deployment, comprehensive monitoring
- ✅ **Full-Stack Modern**: React 19 + FastAPI with real-time updates

### Current Status
**Phase 7 - Manual Testing** (Phases 1-6 Complete ✅)
- 279 total tests (173 backend + 106 frontend)
- CI/CD pipeline: 3 jobs passing (backend 1m45s, frontend 38s, E2E 3m50s)
- 6 Docker services in production
- 4 production deployment scripts

---

## ✨ Key Features

### 🔬 Food Safety Compliance
- **FEFO Algorithm**: 3-level sort priority (`use_by_date → batch_number → received_date`)
- **Expiry Warnings**: 4 urgency levels (critical < 7 days, high 7-14 days, medium 15-30 days, low 31-60 days)
- **Immutable Audit Trail**: Complete chain of custody for all inventory movements
- **Manager Override**: FEFO override capability with documented reason for exceptions

### 💻 Full-Stack Modern Application
- **React 19 Frontend**: Latest hooks (useActionState, useOptimistic), Tailwind CSS 4.0, shadcn/ui
- **FastAPI 0.125.0 Backend**: Async Python 3.13+, SQLAlchemy 2.0.45, PostgreSQL 17
- **Real-time Updates**: TanStack Query 5.90+ for server state synchronization
- **100% Hungarian UI**: All user-facing text, validation messages, date/number formats

### 🚀 Production-Ready DevOps
- **Zero-Downtime Deployment**: Automated deploy script with pre-deployment backup and rollback
- **6 Docker Services**: PostgreSQL, Valkey, Backend (Gunicorn), Celery Worker/Beat, Frontend (Nginx)
- **Automated Operations**: 4 production scripts (install, deploy, backup, restore)
- **Comprehensive Monitoring**: 20+ Prometheus metrics, structured JSON logging, rate limiting

### 🧪 Enterprise Testing
- **279 Total Tests**: 173 backend (pytest) + 47 E2E (Playwright multi-browser) + 59 unit (Vitest)
- **3-Job CI Pipeline**: Backend (1m45s), Frontend (38s), E2E (3m50s)
- **100% Phase Coverage**: All features from Phases 1-6 fully tested
- **Multi-Browser E2E**: Chromium, Firefox, WebKit with graceful degradation

### 🏢 Advanced Operations
- **Multi-Warehouse Support**: Cross-warehouse transfers with dispatch/confirm workflow
- **Stock Reservations**: FEFO-compliant allocation for customer orders with auto-expiry
- **Background Jobs**: 3 Celery scheduled tasks (cleanup, expiry check, email alerts)
- **Bulk Bin Generation**: Cartesian product algorithm (e.g., A-C × 1-10 × 1-5 × 1-4 = 600 bins)

---

## 🛠 Technology Stack

### Backend
| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.13+ | Runtime environment |
| FastAPI | 0.125.0 | Async web framework |
| SQLAlchemy | 2.0.45 | Async ORM with asyncpg |
| PostgreSQL | 17.7 | Primary database |
| Valkey | 8.1 | Redis-compatible cache (BSD license) |

### Frontend
| Component | Version | Purpose |
|-----------|---------|---------|
| React | 19.0.1 | UI framework with latest hooks |
| Vite | 7.2+ | Lightning-fast build tool |
| Tailwind CSS | 4.0 | CSS-first styling |
| shadcn/ui | canary | React 19 + Tailwind v4 components |
| TanStack Query | 5.90+ | Server state management |

### DevOps & Infrastructure
| Component | Version | Purpose |
|-----------|---------|---------|
| Docker Compose | Latest | Container orchestration |
| GitHub Actions | Latest | CI/CD pipeline (3 jobs) |
| Gunicorn + Uvicorn | Latest | Production WSGI/ASGI server |
| Nginx | 1.27 | Static hosting + API proxy |

**📘 See [w7-WHv1/README.md](w7-WHv1/README.md) for complete technology stack with all 38 components**

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                    (React 19 + Tailwind v4)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx (Port 80/443)                        │
│  • Static assets (React build)                                  │
│  • API proxy to backend (/api/* → backend:8000)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Gunicorn + 4 Uvicorn)             │
│  • REST API (30+ endpoints)                                     │
│  • JWT Authentication & RBAC                                    │
│  • FEFO business logic                                          │
└───────┬──────────────┬──────────────┬──────────────┬────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL 17│ │ Valkey 8.1│ │Celery Worker│ │ Celery Beat │
│ (Database)   │ │ (Cache)   │ │(Background) │ │ (Scheduler) │
└──────────────┘ └──────────┘ └─────────────┘ └─────────────┘
```

### Services Overview
1. **Frontend (Nginx)**: Serves React 19 SPA with security headers and SPA routing
2. **Backend (FastAPI)**: Handles API requests, authentication, business logic
3. **PostgreSQL**: Stores inventory, products, users, movements, reservations
4. **Valkey**: Caches session data, Celery broker/result backend
5. **Celery Worker**: Processes background jobs (cleanup, alerts)
6. **Celery Beat**: Schedules periodic tasks (hourly/daily)

**📘 See [w7-WHv1/README.md](w7-WHv1/README.md#architecture-overview) for detailed architecture and data flows**

---

## 🚀 Quick Start

### Prerequisites
- **Development**: Docker Desktop, Git
- **Production**: Ubuntu 24.04+, Docker Engine, 4GB+ RAM

### Development: Full Stack with Docker

Start the complete application (backend + frontend + database):

```bash
# 1. Clone repository
git clone <repository-url>
cd w7-WAREHOUSE/w7-WHv1

# 2. Start all services (PostgreSQL, Valkey, Backend)
docker-compose up -d

# 3. Run database migrations
docker-compose exec backend alembic upgrade head

# 4. Seed initial data (admin user: admin/Admin123!)
docker-compose exec backend python -m app.db.seed

# 5. Start frontend development server
cd frontend
npm install
npm run dev

# 6. Access application
# Backend API: http://localhost:8000/docs
# Frontend UI: http://localhost:5173
# Login: admin / Admin123!
```

**Development Mode**:
- Backend runs in Docker with hot-reload (`--reload`)
- Frontend runs with Vite dev server (hot module replacement)
- Database and Valkey run in Docker containers

### Production: One-Command Install

Deploy to production Ubuntu server:

```bash
# Automated installation (Ubuntu 24.04+)
cd w7-WAREHOUSE
sudo bash scripts/install-production.sh

# This installs:
# - Docker Engine
# - UFW firewall + Fail2Ban
# - Generates secure secrets
# - Builds 6 Docker images
# - Runs migrations + seeds data
# - Starts all services

# Access: http://<your-server-ip>
# Login: admin / Admin123! (change immediately!)
```

**Production Stack**: 6 services (PostgreSQL, Valkey, Backend, Celery Worker, Celery Beat, Frontend)

**📘 See [w7-WHv1/README.md](w7-WHv1/README.md#quick-start) for complete setup options and troubleshooting**

---

## 📁 Project Structure

```
w7-WAREHOUSE/
├── w7-WHv1/                    # Main application
│   ├── backend/                # FastAPI backend (173 tests)
│   │   ├── app/               # Application code
│   │   │   ├── api/v1/       # REST API endpoints (30+)
│   │   │   ├── core/         # Config, security, metrics
│   │   │   ├── db/models/    # SQLAlchemy models
│   │   │   ├── services/     # Business logic (FEFO, etc)
│   │   │   └── tests/        # pytest test suite
│   │   ├── alembic/          # Database migrations
│   │   └── requirements.txt   # Python dependencies
│   ├── frontend/              # React 19 frontend (106 tests)
│   │   ├── src/              # Source code
│   │   │   ├── components/  # UI components
│   │   │   ├── pages/       # Route pages
│   │   │   ├── queries/     # TanStack Query
│   │   │   └── stores/      # Zustand state
│   │   ├── e2e/             # Playwright E2E tests (47)
│   │   ├── tests/           # Vitest unit tests (59)
│   │   └── package.json      # npm dependencies
│   ├── docker-compose.yml     # Development (3 services)
│   └── docker-compose.prod.yml # Production (6 services)
├── scripts/                   # Production scripts
│   ├── install-production.sh  # Automated setup
│   ├── deploy.sh             # Zero-downtime deploy
│   ├── backup-database.sh    # 3-2-1 backup strategy
│   └── restore-database.sh   # Disaster recovery
├── Docs/                      # 31 documentation files
├── PRPs/                      # Planning & Requirements Prompts
├── CLAUDE.md                  # AI assistant guidance
├── PLANNING.md                # Project roadmap
└── TASK.md                    # Task tracking
```

---

## 📚 Documentation

### 📖 Complete Technical Guide
**[w7-WHv1/README.md](w7-WHv1/README.md)** - Comprehensive 800+ line technical documentation
- Configuration (22 environment variables)
- Production Deployment (4 scripts, zero-downtime workflow)
- Monitoring & Observability (20+ Prometheus metrics, logging, rate limiting)
- Troubleshooting (6 common issues with solutions)
- Full API Reference (30+ endpoints)
- Development workflows (backend + frontend)

### 📑 Phase Documentation (31 Guides)

**Getting Started**
- [Setup Guide](w7-WHv1/README.md) - Installation and configuration
- [GitHub Workflow](Docs/GitHub_Workflow.md) - Development conventions

**Phase 1-4 - Backend Foundation**
- [Architecture](Docs/Phase1_Architecture.md), [API Reference](Docs/Phase1_API_Reference.md), [Database Schema](Docs/Phase1_Database_Schema.md)
- [FEFO Compliance](Docs/Phase3_FEFO_Compliance.md) - Algorithm deep dive
- [Movement Audit](Docs/Phase3_Movement_Audit.md) - Traceability

**Phase 5 - Frontend (React 19)**
- [Live Implementation A & B](Docs/Phase5_Live-AB.md) - Foundation and Authentication
- [Live Implementation C & D](Docs/Phase5_Live-CD.md) - Layout and Dashboard
- [Live Implementation E](Docs/Phase5_Live-E.md) - Master Data CRUD
- [Live Implementation F-G-H](Docs/Phase5_Live-FGH.md) - Inventory, Transfers, Reports

**Phase 6 - Production Ready**
- [Comprehensive Guide](Docs/Phase6_Testing_DevOps.md) - 11,000 words, 22 sections
- [Production Deployment](Docs/Production_Deployment.md) - Installation, updates, rollback
- [Operations Runbook](Docs/Operations_Runbook.md) - Daily operations, monitoring
- [Security Hardening](Docs/Security_Hardening.md) - Server security, HTTPS, secrets
- [Backup & Recovery](Docs/Backup_Recovery.md) - 3-2-1 strategy, disaster recovery

---

## 🤝 Contributing

This repository is designed for both human and AI collaboration.

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests (279 tests must pass)
3. Run linting: `ruff check .` (backend), `npm run lint` (frontend)
4. Submit PR (3-job CI must pass: backend, frontend, E2E)

### Git Conventions
- Branch naming: `##-Description-Phase_#` (e.g., `07-MANUALTesting-Phase_7`)
- Commit messages: Conventional Commits with `🤖 Generated with Claude Code` footer
- PR template: Auto-generated checklist

### Testing Requirements
- Backend: pytest coverage >80%
- Frontend: Vitest unit tests + Playwright E2E
- All 279 tests must pass before merge

**📘 See [w7-WHv1/README.md](w7-WHv1/README.md#contributing) for detailed guidelines**

### Agent Governance
- [AGENTS.md](AGENTS.md) - Agent roles and boundaries
- [specs/global-rules.md](specs/global-rules.md) - Merge gates
- [specs/copilot-instructions.md](specs/copilot-instructions.md) - GitHub Copilot rules

---

## 📄 License

**Proprietary** - All rights reserved.

---

## 🔗 Quick Links

- **Technical Documentation**: [w7-WHv1/README.md](w7-WHv1/README.md)
- **Production Deployment**: [Docs/Production_Deployment.md](Docs/Production_Deployment.md)
- **API Documentation**: http://localhost:8000/docs (when running)
- **CI/CD Pipeline**: [.github/workflows/ci.yml](.github/workflows/ci.yml)

---

**Last Updated**: 2025-12-29 | **Status**: Phase 7 - Manual Testing | **Version**: 1.0.0 (Production Ready)
