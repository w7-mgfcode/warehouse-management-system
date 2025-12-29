# INITIAL6 — WMS Phase 6: Testing, Quality Assurance & DevOps

This document defines Phase 6 implementation requirements, building on Phase 5 (React 19 Frontend).

**Last Updated**: December 2025
**Prerequisite**: Phase 5 complete (146 backend tests, complete React 19 frontend)
**Branch**: `06-Testing-Phase_6`

## CRITICAL CONSTRAINTS

- **100% test coverage** for critical user flows (authentication, FEFO, inventory operations)
- **Production-ready DevOps** - Zero-downtime deployments, automated backups, monitoring
- **Security hardening** - HTTPS, rate limiting, CSP headers, SQL injection prevention
- **Performance validated** - Load testing for 100 concurrent users, <2s page load
- **Documentation complete** - Deployment guide, runbooks, troubleshooting

## PHASE 6 SCOPE

Phase 6 focuses on **production readiness** through comprehensive testing and DevOps automation:

### Part A: Frontend Testing (E2E + Unit)
1. **Playwright E2E Tests** - Critical user flows
2. **Vitest Unit Tests** - Component and utility testing
3. **Visual Regression** - Screenshot comparison
4. **Accessibility Testing** - ARIA compliance, keyboard navigation

### Part B: Backend Testing & Quality
1. **Integration Tests** - Multi-service workflows
2. **Load Testing** - Performance under concurrent load
3. **Security Testing** - OWASP Top 10 validation
4. **API Contract Tests** - Schema validation

### Part C: DevOps & Deployment
1. **Production Docker Setup** - Multi-stage builds, security
2. **CI/CD Pipeline** - GitHub Actions automation
3. **Infrastructure as Code** - Terraform/Docker Compose
4. **Monitoring & Logging** - Prometheus, Grafana, ELK

### Part D: Full System Build from Zero
1. **Fresh Installation Guide** - Step-by-step from empty server
2. **Automated Deployment Scripts** - One-command deploy
3. **Database Migration Strategy** - Zero-downtime schema changes
4. **Backup & Recovery** - Automated backups, restore procedures

---

## PART A: FRONTEND E2E TESTING (PLAYWRIGHT)

### Technology Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Playwright | 1.49+ | E2E testing framework |
| @playwright/test | 1.49+ | Test runner |
| Vitest | 2.1+ | Unit testing |
| @testing-library/react | 16.0+ | Component testing |
| @testing-library/user-event | 14.5+ | User interaction simulation |
| @axe-core/playwright | 4.10+ | Accessibility testing |
| MSW | 2.7+ | API mocking |

### Critical User Flows to Test

#### 1. Authentication Flow (Priority: Critical)
```typescript
test('User can login with valid credentials', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});

test('Invalid credentials show Hungarian error', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.fill('[name="username"]', 'wrong');
  await page.fill('[name="password"]', 'wrong');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Érvénytelen felhasználónév vagy jelszó')).toBeVisible();
});

test('Token refresh works after 15 minutes', async ({ page }) => {
  // Login, wait 16 minutes, make API call, verify auto-refresh
});

test('User can logout successfully', async ({ page }) => {
  // Login, click logout, verify redirect to login page
});
```

#### 2. FEFO Compliance Flow (Priority: Critical)
```typescript
test('FEFO recommendation shows oldest expiry first', async ({ page }) => {
  // Navigate to inventory issue page
  // Select product with multiple batches
  // Verify FEFO recommendation shows correct order
  // Verify critical expiry warnings appear
});

test('Manager can override FEFO with reason', async ({ page }) => {
  // Login as manager
  // Attempt non-FEFO issue
  // Provide override reason
  // Verify issue succeeds
});

test('Warehouse user cannot override FEFO', async ({ page }) => {
  // Login as warehouse user
  // Verify override option is not visible
});
```

#### 3. Inventory Operations (Priority: High)
```typescript
test('Receipt creates inventory with batch tracking', async ({ page }) => {
  // Navigate to receipt page
  // Fill form (product, supplier, bin, batch, expiry)
  // Submit and verify success toast
  // Verify stock levels updated
});

test('Issue reduces inventory and creates movement', async ({ page }) => {
  // Navigate to issue page
  // Select product and quantity
  // Verify FEFO recommendation
  // Complete issue
  // Verify movement history updated
});

test('Bulk bin generation creates 600 bins', async ({ page }) => {
  // Navigate to bulk bin page
  // Enter range: A-C × 1-10 × 1-5 × 1-4
  // Verify preview shows 600 bins
  // Submit and verify creation
});
```

#### 4. CRUD Operations (Priority: Medium)
```typescript
test('Admin can create/edit/delete warehouse', async ({ page }) => {
  // Create warehouse with bin template
  // Edit warehouse name
  // Delete empty warehouse
});

test('Viewer role cannot create/edit/delete', async ({ page }) => {
  // Login as viewer
  // Verify create buttons are hidden
  // Verify edit/delete are disabled
});
```

#### 5. Reports & Export (Priority: Medium)
```typescript
test('Stock levels report exports to CSV', async ({ page }) => {
  // Navigate to stock levels report
  // Apply filters
  // Click export CSV
  // Verify download with Hungarian headers
});
```

### Playwright Configuration

**File**: `w7-WHv1/frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Organization

```
w7-WHv1/frontend/
  e2e/
    auth/
      login.spec.ts
      logout.spec.ts
      token-refresh.spec.ts
      rbac.spec.ts
    inventory/
      receipt.spec.ts
      issue.spec.ts
      fefo.spec.ts
      stock-levels.spec.ts
    master-data/
      warehouses.spec.ts
      products.spec.ts
      suppliers.spec.ts
      bins.spec.ts
      bulk-generation.spec.ts
    reports/
      stock-levels-export.spec.ts
      expiry-report.spec.ts
      movements-report.spec.ts
    transfers/
      same-warehouse.spec.ts
      cross-warehouse.spec.ts
    accessibility/
      a11y.spec.ts (axe-core integration)
```

### Accessibility Testing

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Dashboard should not have accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## PART B: FRONTEND UNIT TESTING (VITEST)

### Vitest Configuration

**File**: `w7-WHv1/frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/test/**', '**/e2e/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Unit Test Priorities

#### 1. Utility Functions (Priority: High)
- `formatDate()` - Hungarian date formatting
- `formatNumber()` - Hungarian number formatting
- `formatWeight()` - Weight display
- `interpolate()` - Message interpolation
- `exportToCSV()` - CSV export logic

#### 2. Custom Hooks (Priority: Medium)
- `useAuth()` - Authentication state
- `useDebounce()` - Search input debouncing
- Form hooks with validation

#### 3. Component Tests (Priority: Medium)
- `<FEFORecommendation />` - FEFO display logic
- `<ExpiryBadge />` - Urgency calculation
- `<DeleteDialog />` - Async handling
- `<SearchInput />` - Debounce behavior

### Example Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber } from '@/lib/date';

describe('Hungarian formatting', () => {
  it('formats dates in Hungarian style', () => {
    const date = new Date('2025-12-28');
    expect(formatDate(date)).toBe('2025. 12. 28.');
  });

  it('formats numbers with Hungarian separators', () => {
    expect(formatNumber(1234.56, 2)).toBe('1 234,56');
  });
});
```

---

## PART C: BACKEND TESTING ENHANCEMENTS

### Integration Testing

**New File**: `w7-WHv1/backend/app/tests/test_integration.py`

Test multi-service workflows:

```python
class TestInventoryWorkflow:
    """Test complete inventory workflow from receipt to issue."""

    async def test_receipt_to_issue_workflow(
        self, client, warehouse_token, db_session
    ):
        """Test: Receive goods → Check FEFO → Issue goods → Verify movement audit."""
        # 1. Receive goods
        receipt_response = await client.post("/api/v1/inventory/receive", ...)
        # 2. Get FEFO recommendation
        fefo_response = await client.get("/api/v1/inventory/fefo-recommendation", ...)
        # 3. Issue goods following FEFO
        issue_response = await client.post("/api/v1/inventory/issue", ...)
        # 4. Verify movement history
        movements = await client.get("/api/v1/movements", ...)
        # Assert complete audit trail
```

### Load Testing (Locust)

**New File**: `w7-WHv1/backend/tests/load/locustfile.py`

```python
from locust import HttpUser, task, between

class WMSUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login and get token
        response = self.client.post("/api/v1/auth/login", data={
            "username": "warehouse",
            "password": "Warehouse123!"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def get_stock_levels(self):
        self.client.get("/api/v1/inventory/stock-levels", headers=self.headers)

    @task(2)
    def get_fefo_recommendation(self):
        self.client.get("/api/v1/inventory/fefo-recommendation?product_id=...", headers=self.headers)

    @task(1)
    def receive_goods(self):
        self.client.post("/api/v1/inventory/receive", json={...}, headers=self.headers)
```

**Run**: `locust -f locustfile.py --users 100 --spawn-rate 10`

**Target Performance**:
- 100 concurrent users
- <500ms avg response time
- <1% error rate
- 1000 requests/second sustained

---

## PART D: DEVOPS - FULL SYSTEM BUILD FROM ZERO

### Phase D1: Production Docker Setup

#### Multi-Stage Dockerfile (Backend)

**File**: `w7-WHv1/backend/Dockerfile.prod`

```dockerfile
# Stage 1: Build stage
FROM python:3.13-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime stage
FROM python:3.13-slim

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1000 wms && chown -R wms:wms /app
USER wms

# Copy dependencies from builder
COPY --from=builder /root/.local /home/wms/.local
ENV PATH=/home/wms/.local/bin:$PATH

# Copy application code
COPY --chown=wms:wms . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run with Gunicorn (production ASGI server)
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

#### Multi-Stage Dockerfile (Frontend)

**File**: `w7-WHv1/frontend/Dockerfile.prod`

```dockerfile
# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Nginx runtime
FROM nginx:1.25-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**File**: `w7-WHv1/frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # SPA routing - all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### Production Docker Compose

**File**: `w7-WHv1/docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:17-alpine
    container_name: wms-db-prod
    environment:
      POSTGRES_DB: ${DB_NAME:-wms}
      POSTGRES_USER: ${DB_USER:-wms_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - wms-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-wms_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  valkey:
    image: valkey/valkey:8.1-alpine
    container_name: wms-valkey-prod
    command: valkey-server --appendonly yes --requirepass ${VALKEY_PASSWORD}
    volumes:
      - valkey-data:/data
    networks:
      - wms-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "valkey-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: wms-backend-prod
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      VALKEY_URL: valkey://:${VALKEY_PASSWORD}@valkey:6379
      JWT_SECRET: ${JWT_SECRET}
      CELERY_BROKER_URL: redis://:${VALKEY_PASSWORD}@valkey:6379/0
      SMTP_HOST: ${SMTP_HOST}
      EMAIL_ENABLED: ${EMAIL_ENABLED:-false}
    depends_on:
      db:
        condition: service_healthy
      valkey:
        condition: service_healthy
    networks:
      - wms-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: wms-celery-prod
    command: celery -A app.tasks.celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      CELERY_BROKER_URL: redis://:${VALKEY_PASSWORD}@valkey:6379/0
      SMTP_HOST: ${SMTP_HOST}
    depends_on:
      - db
      - valkey
    networks:
      - wms-network
    restart: unless-stopped

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: wms-beat-prod
    command: celery -A app.tasks.celery_app beat --loglevel=info
    environment:
      CELERY_BROKER_URL: redis://:${VALKEY_PASSWORD}@valkey:6379/0
    depends_on:
      - valkey
    networks:
      - wms-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: wms-frontend-prod
    ports:
      - "80:80"
      - "443:443"
    networks:
      - wms-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:1.25-alpine
    container_name: wms-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deploy/nginx/ssl:/etc/nginx/ssl:ro
      - ./deploy/nginx/logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - wms-network
    restart: unless-stopped

networks:
  wms-network:
    driver: bridge

volumes:
  postgres-data:
  valkey-data:
```

### Phase D2: CI/CD Pipeline Enhancements

#### GitHub Actions Workflow

**File**: `.github/workflows/deploy-prod.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.13
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'

      - name: Install backend dependencies
        run: |
          cd w7-WHv1/backend
          pip install -r requirements.txt

      - name: Run backend tests
        run: |
          cd w7-WHv1/backend
          pytest app/tests/ -v
          ruff check .

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install frontend dependencies
        run: |
          cd w7-WHv1/frontend
          npm ci

      - name: Run frontend tests
        run: |
          cd w7-WHv1/frontend
          npm run test
          npm run lint

      - name: Build frontend
        run: |
          cd w7-WHv1/frontend
          npm run build

      - name: Run E2E tests
        run: |
          cd w7-WHv1/frontend
          npx playwright install --with-deps
          npx playwright test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./w7-WHv1/backend
          file: ./w7-WHv1/backend/Dockerfile.prod
          push: true
          tags: |
            wms/backend:latest
            wms/backend:${{ github.sha }}

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./w7-WHv1/frontend
          file: ./w7-WHv1/frontend/Dockerfile.prod
          push: true
          tags: |
            wms/frontend:latest
            wms/frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/wms
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
```

### Phase D3: Full System Build from Zero

#### Prerequisites Checklist

**Target Environment**: Ubuntu 24.04 LTS (bare metal or VM)

- [ ] Ubuntu 24.04 LTS installed
- [ ] Root or sudo access
- [ ] Domain name pointed to server IP (optional: `wms.example.com`)
- [ ] Ports open: 80 (HTTP), 443 (HTTPS), 22 (SSH)

#### Installation Script

**File**: `scripts/install-production.sh`

```bash
#!/bin/bash
set -e

echo "=== WMS Production Installation Script ==="
echo "This script will install the complete WMS system from scratch"
echo ""

# 1. Update system
echo "[1/10] Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Docker
echo "[2/10] Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# 3. Install Docker Compose
echo "[3/10] Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Git
echo "[4/10] Installing Git..."
sudo apt-get install -y git

# 5. Clone repository
echo "[5/10] Cloning WMS repository..."
cd /opt
sudo git clone https://github.com/w7-mgfcode/warehouse-management-system.git wms
sudo chown -R $USER:$USER /opt/wms
cd /opt/wms

# 6. Create environment file
echo "[6/10] Creating environment configuration..."
cp w7-WHv1/.env.example w7-WHv1/.env

echo "Please configure the following in w7-WHv1/.env:"
echo "  - JWT_SECRET (min 32 characters)"
echo "  - DB_PASSWORD"
echo "  - VALKEY_PASSWORD"
echo "  - SMTP credentials (if email enabled)"
echo ""
read -p "Press Enter after editing .env file..."

# 7. Build Docker images
echo "[7/10] Building Docker images..."
cd /opt/wms/w7-WHv1
docker-compose -f docker-compose.prod.yml build

# 8. Start services
echo "[8/10] Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# 9. Wait for database
echo "[9/10] Waiting for database..."
sleep 10

# 10. Run migrations and seed
echo "[10/10] Running database migrations and seed..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
docker-compose -f docker-compose.prod.yml exec -T backend python -m app.db.seed

echo ""
echo "=== Installation Complete! ==="
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:8000"
echo "  - Frontend: http://localhost"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: Admin123!"
echo ""
echo "IMPORTANT: Change admin password immediately!"
echo ""
echo "View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "Stop services: docker-compose -f docker-compose.prod.yml down"
```

**Run**: `chmod +x scripts/install-production.sh && ./scripts/install-production.sh`

#### Zero-Downtime Deployment Script

**File**: `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

echo "=== WMS Zero-Downtime Deployment ==="

cd /opt/wms/w7-WHv1

# 1. Pull latest code
echo "[1/6] Pulling latest code..."
git pull origin main

# 2. Build new images
echo "[2/6] Building new Docker images..."
docker-compose -f docker-compose.prod.yml build

# 3. Backup database
echo "[3/6] Backing up database..."
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U wms_user wms > ./backups/backup-$(date +%Y%m%d-%H%M%S).sql

# 4. Run migrations
echo "[4/6] Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# 5. Rolling restart services
echo "[5/6] Performing rolling restart..."
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
sleep 5
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend

# 6. Cleanup old images
echo "[6/6] Cleaning up old images..."
docker image prune -f

echo ""
echo "=== Deployment Complete! ==="
echo "Services restarted with zero downtime"
```

### Phase D4: Monitoring & Logging

#### Prometheus Configuration

**File**: `w7-WHv1/deploy/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'wms-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'valkey'
    static_configs:
      - targets: ['valkey-exporter:9121']
```

#### Application Metrics

**File**: `w7-WHv1/backend/app/core/metrics.py`

```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
request_count = Counter('wms_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('wms_request_duration_seconds', 'Request duration', ['method', 'endpoint'])

# Inventory metrics
stock_level = Gauge('wms_stock_level', 'Current stock level', ['product_id', 'warehouse_id'])
fefo_violations = Counter('wms_fefo_violations_total', 'FEFO violations count')
expired_items = Gauge('wms_expired_items', 'Number of expired items', ['warehouse_id'])

# Business metrics
movements_total = Counter('wms_movements_total', 'Total movements', ['type'])
transfers_total = Counter('wms_transfers_total', 'Total transfers', ['status'])
```

#### Logging Configuration

**File**: `w7-WHv1/backend/app/core/logging_config.py`

```python
import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging():
    """Configure structured JSON logging for production."""

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # JSON formatter
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(name)s %(levelname)s %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S'
    )

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger
```

### Phase D5: Security Hardening

#### Security Checklist

**File**: `Docs/Security_Checklist.md`

- [ ] **Secrets Management**
  - [ ] JWT_SECRET min 32 characters, randomly generated
  - [ ] Database password min 16 characters
  - [ ] All secrets in environment variables (not committed to git)
  - [ ] .env in .gitignore

- [ ] **HTTPS/TLS**
  - [ ] SSL certificate installed (Let's Encrypt)
  - [ ] HTTP → HTTPS redirect
  - [ ] HSTS header enabled
  - [ ] TLS 1.2+ only

- [ ] **Database Security**
  - [ ] PostgreSQL user has minimal privileges
  - [ ] Database not exposed to public internet
  - [ ] Regular automated backups
  - [ ] Encrypted backups

- [ ] **API Security**
  - [ ] Rate limiting enabled (100 req/min per IP)
  - [ ] CORS restricted to frontend domain only
  - [ ] SQL injection prevention (SQLAlchemy parameterized queries)
  - [ ] XSS prevention (React auto-escaping)
  - [ ] CSRF tokens for state-changing operations

- [ ] **Authentication**
  - [ ] Password min 8 chars with complexity requirements
  - [ ] Bcrypt with cost factor 12+
  - [ ] JWT with short expiry (15 min access, 7 day refresh)
  - [ ] Refresh token rotation

- [ ] **Infrastructure**
  - [ ] Firewall configured (ufw)
  - [ ] Fail2ban for SSH protection
  - [ ] Non-root Docker containers
  - [ ] Regular security updates (unattended-upgrades)

#### Rate Limiting

**File**: `w7-WHv1/backend/app/core/rate_limit.py`

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Apply to FastAPI app
from fastapi import FastAPI, Request
from slowapi.errors import RateLimitExceeded

app = FastAPI()
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Túl sok kérés. Kérjük, próbálja újra később."}
    )
```

### Phase D6: Backup & Recovery

#### Automated Backup Script

**File**: `scripts/backup-database.sh`

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/wms/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wms-backup-$TIMESTAMP.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /opt/wms/w7-WHv1/docker-compose.prod.yml exec -T db \
  pg_dump -U wms_user wms > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3 (optional)
# aws s3 cp $BACKUP_FILE.gz s3://wms-backups/

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup complete: $BACKUP_FILE.gz"
```

**Crontab**: `0 2 * * * /opt/wms/scripts/backup-database.sh`

#### Recovery Script

**File**: `scripts/restore-database.sh`

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore-database.sh <backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE=$1

echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Decompress backup
gunzip -c $BACKUP_FILE > /tmp/restore.sql

# Restore database
docker-compose -f /opt/wms/w7-WHv1/docker-compose.prod.yml exec -T db \
  psql -U wms_user wms < /tmp/restore.sql

# Cleanup
rm /tmp/restore.sql

echo "Database restored successfully"
```

---

## TESTING STRATEGY

### Testing Pyramid

```
           /\
          /  \  E2E Tests (Playwright)
         /____\ ~20 critical flows
        /      \
       /  Unit  \ Vitest + pytest
      /  Tests   \ ~200 tests
     /____________\
```

### Test Coverage Goals

| Layer | Framework | Target Coverage | Priority |
|-------|-----------|-----------------|----------|
| Backend Unit | pytest | 100% | Critical |
| Backend Integration | pytest | 80% | High |
| Frontend Unit | Vitest | 70% | Medium |
| Frontend E2E | Playwright | 100% critical flows | Critical |
| Accessibility | axe-core | 0 violations | High |
| Load Testing | Locust | 100 users | Medium |

---

## DELIVERABLES

### Part A: Frontend Testing
- [ ] 20+ Playwright E2E tests (critical flows)
- [ ] 50+ Vitest unit tests (utilities, hooks, components)
- [ ] Accessibility tests with axe-core
- [ ] Visual regression tests (screenshot comparison)
- [ ] CI integration for E2E tests

### Part B: Backend Testing
- [ ] 10+ integration tests (multi-service workflows)
- [ ] Load testing setup with Locust
- [ ] Security testing (OWASP Top 10)
- [ ] API contract tests with OpenAPI validation

### Part C: DevOps
- [ ] Production Dockerfiles (multi-stage, security hardened)
- [ ] docker-compose.prod.yml (with health checks)
- [ ] Nginx reverse proxy configuration
- [ ] SSL/TLS setup with Let's Encrypt
- [ ] CI/CD pipeline (test + build + deploy)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Centralized logging (ELK stack or similar)

### Part D: Documentation
- [ ] Production Deployment Guide (`Docs/Production_Deployment.md`)
- [ ] Operations Runbook (`Docs/Operations_Runbook.md`)
- [ ] Troubleshooting Guide (`Docs/Troubleshooting.md`)
- [ ] Security Hardening Guide (`Docs/Security_Hardening.md`)
- [ ] Backup & Recovery Guide (`Docs/Backup_Recovery.md`)

### Part E: Build from Zero
- [ ] Fresh installation script (`scripts/install-production.sh`)
- [ ] Automated deployment script (`scripts/deploy.sh`)
- [ ] Database backup script (`scripts/backup-database.sh`)
- [ ] Database restore script (`scripts/restore-database.sh`)
- [ ] Health check script (`scripts/health-check.sh`)

---

## SUCCESS CRITERIA

### Testing
- ✅ All 146 backend tests passing
- ✅ 20+ E2E tests covering critical flows
- ✅ 50+ frontend unit tests
- ✅ 0 accessibility violations (WCAG 2.1 Level AA)
- ✅ Load test: 100 users, <500ms avg response time

### DevOps
- ✅ Full system deploys from single command
- ✅ Zero-downtime deployments working
- ✅ Automated backups running daily
- ✅ Monitoring dashboards operational
- ✅ SSL/HTTPS configured
- ✅ All services health-checked

### Documentation
- ✅ Any team member can deploy from docs alone
- ✅ Troubleshooting guide covers common issues
- ✅ Runbook includes all operational procedures

---

## IMPLEMENTATION PHASES

### Phase 6A: Frontend E2E Tests (Week 1)
- Set up Playwright
- Implement 20 critical flow tests
- Add accessibility tests
- CI integration

### Phase 6B: Frontend Unit Tests (Week 1)
- Set up Vitest
- Test utilities and custom hooks
- Test critical components (FEFO, forms)

### Phase 6C: Backend Integration & Load Tests (Week 2)
- Implement integration tests
- Set up Locust for load testing
- Run performance benchmarks
- Optimize slow endpoints

### Phase 6D: Production Docker & CI/CD (Week 2)
- Create production Dockerfiles
- Set up docker-compose.prod.yml
- Configure CI/CD pipeline
- Test deployment automation

### Phase 6E: Monitoring & Security (Week 3)
- Set up Prometheus + Grafana
- Configure structured logging
- Implement rate limiting
- Security audit and hardening

### Phase 6F: Documentation & Scripts (Week 3)
- Write deployment guide
- Create operations runbook
- Build automation scripts
- Full system build from zero test

---

## VALIDATION CHECKLIST

Before considering Phase 6 complete:

### Testing Validation
- [ ] Run `npm run test` - All frontend unit tests pass
- [ ] Run `npx playwright test` - All E2E tests pass
- [ ] Run `pytest app/tests/` - All 146 backend tests pass
- [ ] Run load test - 100 users, <500ms avg response time
- [ ] Run security scan - No critical vulnerabilities

### DevOps Validation
- [ ] Fresh Ubuntu 24.04 VM → Run install script → System operational
- [ ] Deploy script → Zero-downtime deployment → No errors
- [ ] Kill database container → Automatic restart → Service restored
- [ ] Backup script → Restore script → Data integrity verified
- [ ] SSL certificate → HTTPS working → A+ on SSL Labs

### Documentation Validation
- [ ] Junior developer can deploy using docs only
- [ ] All runbook procedures tested and working
- [ ] Troubleshooting guide covers 10+ common issues

---

## NOTES

### Testing Philosophy
- **Backend**: 100% coverage (already achieved with 146 tests)
- **Frontend E2E**: Focus on critical user flows, not exhaustive coverage
- **Frontend Unit**: Test utilities and complex components
- **Integration**: Test multi-service workflows (receipt → FEFO → issue)

### DevOps Philosophy
- **Automation First**: Everything scriptable should be scripted
- **Security by Default**: Principle of least privilege
- **Observability**: Metrics, logs, and traces for all services
- **Fail-Safe**: Automated backups, health checks, auto-restart

### Performance Targets
- **API Response Time**: <200ms (p95), <500ms (p99)
- **Frontend Load**: <2s initial load, <1s navigation
- **Database Queries**: <50ms (p95)
- **Concurrent Users**: 100 without degradation

---

## DEPENDENCIES

**Python Packages** (add to requirements.txt):
```txt
# Production server
gunicorn>=23.0.0
uvicorn[standard]>=0.34.0

# Monitoring
prometheus-client>=0.21.0
python-json-logger>=3.2.0

# Rate limiting
slowapi>=0.1.9

# Load testing
locust>=2.32.0
```

**Node Packages** (add to package.json):
```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@axe-core/playwright": "^4.10.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@testing-library/jest-dom": "^6.6.0",
    "msw": "^2.7.0"
  }
}
```

---

## TIMELINE ESTIMATE

- **Phase 6A + 6B** (Frontend Testing): 5-7 days
- **Phase 6C** (Backend Integration/Load): 3-4 days
- **Phase 6D** (Docker + CI/CD): 4-5 days
- **Phase 6E** (Monitoring + Security): 3-4 days
- **Phase 6F** (Documentation + Scripts): 2-3 days

**Total**: 17-23 days for complete Phase 6

---

**END OF INITIAL6.md**
