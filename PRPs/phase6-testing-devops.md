# PRP: Phase 6 - Testing, Quality Assurance & DevOps

**Version**: 1.0
**Created**: 2025-12-28
**Feature File**: INITIAL6.md
**Estimated Complexity**: Very High (6 sub-phases, ~80 files, production-ready infrastructure)
**Branch**: `06-Testing-Phase_6`

---

## Goal

Transform the WMS system into a production-ready application with:
- **Frontend E2E Tests** - Playwright tests for 20+ critical user flows
- **Frontend Unit Tests** - Vitest tests for utilities, hooks, and components
- **Backend Integration Tests** - Multi-service workflow validation
- **Load Testing** - Locust performance testing for 100 concurrent users
- **Production Docker** - Multi-stage builds, security hardening, health checks
- **CI/CD Pipeline** - GitHub Actions for automated test, build, and deploy
- **Monitoring** - Prometheus metrics, structured logging
- **Security** - Rate limiting, CSP headers, HTTPS configuration
- **Full System Build** - One-command deployment from zero

## Why

- **Quality Assurance**: E2E tests verify critical FEFO flows work for end users
- **Production Readiness**: Docker + CI/CD enables reliable deployments
- **Performance Confidence**: Load tests validate system handles 100+ users
- **Security Compliance**: Rate limiting, CSP headers prevent common attacks
- **Food Safety**: FEFO compliance tests ensure regulatory adherence
- **Operational Excellence**: Monitoring enables proactive issue detection

## What

### Success Criteria
- [ ] 20+ Playwright E2E tests covering critical flows (auth, FEFO, inventory)
- [ ] 50+ Vitest unit tests for utilities and components
- [ ] 146 backend tests continue passing
- [ ] Load test: 100 users, <500ms avg response time
- [ ] Production Docker images build successfully
- [ ] GitHub Actions CI/CD pipeline runs on push
- [ ] Full system deploys from `scripts/install-production.sh`
- [ ] All documentation complete (deployment guide, runbook)

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Testing Frameworks
- url: https://playwright.dev/docs/best-practices
  why: Playwright test isolation, auto-waiting, parallel execution
  critical: Use locator APIs, avoid waitForTimeout, test isolation per test

- url: https://playwright.dev/docs/test-components
  why: Component testing for React in isolation

- url: https://vitest.dev/guide/
  why: Vitest setup, globals, coverage configuration

- url: https://testing-library.com/docs/react-testing-library/setup/
  why: React Testing Library integration with Vitest

- url: https://articles.mergify.com/e-2-e-testing-react-playwright/
  why: E2E testing React with Playwright patterns

# MUST READ - Docker & DevOps
- url: https://fastapi.tiangolo.com/deployment/docker/
  why: Official FastAPI Docker guidance
  critical: Multi-stage builds, non-root user, health checks

- url: https://python.plainenglish.io/docker-multi-stage-fastapi-tutorial-cb0d97b6d274
  why: Multi-stage build patterns reducing image 70%+

- url: https://github.com/fastapi/full-stack-fastapi-template
  why: Official FastAPI full-stack template with GitHub Actions
  critical: CI/CD workflow patterns, Docker Compose setup

# Codebase References
- file: w7-WHv1/backend/app/tests/conftest.py
  why: Existing test fixtures pattern (admin_user, warehouse_user, etc.)

- file: w7-WHv1/backend/app/tests/test_inventory.py
  why: Integration test pattern with auth headers and assertions

- file: w7-WHv1/frontend/src/lib/i18n.ts
  why: Hungarian translations to verify in E2E tests

- file: w7-WHv1/frontend/src/lib/api-client.ts
  why: Token refresh pattern to test in E2E

- file: w7-WHv1/docker-compose.yml
  why: Existing development Docker setup to extend

- file: w7-WHv1/backend/Dockerfile
  why: Existing backend Dockerfile to enhance for production

- file: INITIAL6.md
  why: Complete Phase 6 specification with all requirements
```

### Current Codebase Tree

```bash
w7-WHv1/
├── backend/                    # 146 tests passing
│   ├── app/
│   │   ├── api/v1/            # 14 API routers
│   │   ├── tests/             # 12 test files (conftest, test_*.py)
│   │   ├── services/          # Business logic
│   │   └── core/              # Config, security, i18n
│   ├── alembic/               # Migrations
│   ├── Dockerfile             # Development (single-stage)
│   └── requirements.txt
├── frontend/                   # React 19 + Tailwind v4
│   ├── src/
│   │   ├── components/        # UI components (14 directories)
│   │   ├── pages/             # Route pages (10 directories)
│   │   ├── queries/           # TanStack Query (10 files)
│   │   ├── lib/               # Utilities (api-client, i18n, date, number)
│   │   └── stores/            # Zustand (auth-store, ui-store)
│   ├── package.json           # No test deps yet
│   └── vite.config.ts         # Vite + Tailwind v4
├── docker-compose.yml         # Development setup (db, valkey, backend)
└── deploy/nginx/              # Nginx config (placeholder)
```

### Desired Codebase Tree (Phase 6 Additions)

```bash
w7-WHv1/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── metrics.py         # NEW: Prometheus metrics
│   │   │   ├── logging_config.py  # NEW: Structured JSON logging
│   │   │   └── rate_limit.py      # NEW: SlowAPI rate limiting
│   │   └── tests/
│   │       └── test_integration.py # NEW: Multi-service workflow tests
│   ├── tests/load/
│   │   └── locustfile.py          # NEW: Load testing
│   ├── Dockerfile                  # ENHANCED: Multi-stage production
│   ├── Dockerfile.prod            # NEW: Production-optimized
│   └── requirements.txt           # UPDATED: +gunicorn, prometheus-client, slowapi, locust
├── frontend/
│   ├── e2e/                       # NEW: Playwright E2E tests
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── logout.spec.ts
│   │   │   ├── token-refresh.spec.ts
│   │   │   └── rbac.spec.ts
│   │   ├── inventory/
│   │   │   ├── receipt.spec.ts
│   │   │   ├── issue.spec.ts
│   │   │   ├── fefo.spec.ts
│   │   │   └── stock-levels.spec.ts
│   │   ├── master-data/
│   │   │   ├── warehouses.spec.ts
│   │   │   ├── products.spec.ts
│   │   │   ├── suppliers.spec.ts
│   │   │   ├── bins.spec.ts
│   │   │   └── bulk-generation.spec.ts
│   │   ├── reports/
│   │   │   └── export.spec.ts
│   │   └── accessibility/
│   │       └── a11y.spec.ts
│   ├── src/
│   │   └── test/
│   │       ├── setup.ts           # NEW: Vitest setup
│   │       └── utils.tsx          # NEW: Test utilities
│   ├── tests/                     # NEW: Vitest unit tests
│   │   ├── lib/
│   │   │   ├── date.test.ts
│   │   │   ├── number.test.ts
│   │   │   └── export.test.ts
│   │   └── components/
│   │       ├── expiry-badge.test.tsx
│   │       ├── fefo-recommendation.test.tsx
│   │       └── search-input.test.tsx
│   ├── Dockerfile.prod            # NEW: Production multi-stage
│   ├── nginx.conf                 # NEW: SPA routing + security
│   ├── playwright.config.ts       # NEW: Playwright configuration
│   ├── vitest.config.ts           # NEW: Vitest configuration
│   └── package.json               # UPDATED: +playwright, vitest, testing-library
├── docker-compose.prod.yml        # NEW: Production compose
├── .github/workflows/
│   ├── ci.yml                     # ENHANCED: Full CI pipeline
│   └── deploy-prod.yml            # NEW: Production deployment
├── scripts/
│   ├── install-production.sh      # NEW: Fresh install script
│   ├── deploy.sh                  # NEW: Zero-downtime deployment
│   ├── backup-database.sh         # NEW: Automated backup
│   └── restore-database.sh        # NEW: Recovery script
└── Docs/
    ├── Production_Deployment.md   # NEW: Deployment guide
    ├── Operations_Runbook.md      # NEW: Operational procedures
    ├── Security_Hardening.md      # NEW: Security checklist
    └── Backup_Recovery.md         # NEW: Backup/restore guide
```

### Known Gotchas & Library Quirks

```typescript
// ========================================
// CRITICAL: Playwright - Test Isolation
// ========================================
// Each test MUST be independent with its own state
// ❌ WRONG: Sharing login state between tests
test.describe('Inventory', () => {
  test.beforeAll(async ({ page }) => {
    await login(page); // ❌ Shared state
  });
});

// ✅ CORRECT: Isolated login per test or use storageState
test.describe('Inventory', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });
});

// ========================================
// CRITICAL: Playwright - Auto-waiting
// ========================================
// ❌ WRONG: Manual waiting
await page.waitForTimeout(2000);
await page.click('button');

// ✅ CORRECT: Rely on auto-waiting
await page.click('button');
await expect(page.locator('text=Success')).toBeVisible();

// ========================================
// CRITICAL: Playwright - Use Locators
// ========================================
// ❌ WRONG: Using selectors directly
await page.click('[data-testid="submit"]');

// ✅ CORRECT: Use locator API
const submitBtn = page.getByRole('button', { name: 'Mentés' }); // Hungarian!
await submitBtn.click();

// ========================================
// CRITICAL: Vitest - Cleanup After Each Test
// ========================================
// setup.ts MUST include cleanup
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup(); // REQUIRED for React Testing Library
});

// ========================================
// CRITICAL: Hungarian Text Verification
// ========================================
// Always use Hungarian text in assertions
await expect(page.locator('text=Érvénytelen felhasználónév')).toBeVisible();
// NOT: await expect(page.locator('text=Invalid username')).toBeVisible();

// ========================================
// CRITICAL: Docker - Non-root User
// ========================================
// Production images MUST use non-root user
// ❌ WRONG: Running as root
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]

// ✅ CORRECT: Create and use non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

// ========================================
// CRITICAL: Docker - Health Checks
// ========================================
// Production containers MUST have health checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

// ========================================
// CRITICAL: Gunicorn for Production
// ========================================
// Development uses uvicorn, production uses gunicorn with uvicorn workers
# Production CMD
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000"]

// ========================================
// CRITICAL: Rate Limiting with SlowAPI
// ========================================
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/v1/products")
@limiter.limit("100/minute")
async def list_products(request: Request):
    ...

// ========================================
// CRITICAL: Locust - Synchronous Tasks
// ========================================
// Locust tasks are synchronous, not async
from locust import HttpUser, task

class WMSUser(HttpUser):
    @task
    def get_stock(self):
        self.client.get("/api/v1/inventory/stock-levels", headers=self.headers)
        # NOT: await self.client.get(...)
```

---

## Implementation Blueprint

### Phase 6A: Frontend E2E Testing (Playwright)

**Goal**: Set up Playwright and create 20+ E2E tests for critical flows

```yaml
Task A1: Install Playwright
  - RUN: cd w7-WHv1/frontend && npm install -D @playwright/test @axe-core/playwright
  - RUN: npx playwright install chromium firefox webkit
  - RUN: npx playwright install-deps  # System dependencies

Task A2: Create playwright.config.ts
  - CREATE: w7-WHv1/frontend/playwright.config.ts
  - CONFIGURE: baseURL, projects (chromium, firefox, webkit, mobile)
  - CONFIGURE: webServer to start frontend + backend
  - CONFIGURE: reporter for HTML output

Task A3: Create authentication setup
  - CREATE: w7-WHv1/frontend/e2e/auth/setup.ts
  - IMPLEMENT: Global setup to create auth state files
  - CREATE: playwright/.auth/ directory for storage states

Task A4: Create auth tests (4 tests)
  - CREATE: w7-WHv1/frontend/e2e/auth/login.spec.ts
  - IMPLEMENT: test_login_success, test_login_invalid, test_login_hungarian_error
  - CREATE: w7-WHv1/frontend/e2e/auth/logout.spec.ts
  - IMPLEMENT: test_logout_redirect
  - CREATE: w7-WHv1/frontend/e2e/auth/rbac.spec.ts
  - IMPLEMENT: test_viewer_cannot_create, test_warehouse_cannot_adjust

Task A5: Create inventory tests (6 tests)
  - CREATE: w7-WHv1/frontend/e2e/inventory/receipt.spec.ts
  - IMPLEMENT: test_receipt_success, test_receipt_validation
  - CREATE: w7-WHv1/frontend/e2e/inventory/issue.spec.ts
  - IMPLEMENT: test_issue_success, test_issue_insufficient
  - CREATE: w7-WHv1/frontend/e2e/inventory/fefo.spec.ts
  - IMPLEMENT: test_fefo_recommendation_order, test_fefo_expiry_badges

Task A6: Create master data tests (5 tests)
  - CREATE: w7-WHv1/frontend/e2e/master-data/warehouses.spec.ts
  - IMPLEMENT: test_crud_warehouse
  - CREATE: w7-WHv1/frontend/e2e/master-data/products.spec.ts
  - IMPLEMENT: test_crud_product
  - CREATE: w7-WHv1/frontend/e2e/master-data/bins.spec.ts
  - IMPLEMENT: test_crud_bin
  - CREATE: w7-WHv1/frontend/e2e/master-data/bulk-generation.spec.ts
  - IMPLEMENT: test_bulk_bin_generation_preview, test_bulk_bin_creation

Task A7: Create reports tests (2 tests)
  - CREATE: w7-WHv1/frontend/e2e/reports/export.spec.ts
  - IMPLEMENT: test_csv_export_hungarian_headers

Task A8: Create accessibility tests (3 tests)
  - CREATE: w7-WHv1/frontend/e2e/accessibility/a11y.spec.ts
  - IMPLEMENT: test_dashboard_a11y, test_forms_a11y, test_keyboard_navigation

Task A9: Update package.json
  - ADD scripts: "test:e2e": "playwright test"
  - ADD scripts: "test:e2e:ui": "playwright test --ui"
  - ADD scripts: "test:e2e:report": "playwright show-report"
```

**playwright.config.ts pattern:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Setup project for authentication
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8000',
      url: 'http://localhost:8000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

**E2E Test pattern (Hungarian assertions):**
```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill form using Hungarian labels
    await page.getByLabel('Felhasználónév').fill('admin');
    await page.getByLabel('Jelszó').fill('Admin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // Wait for navigation and verify Hungarian dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Irányítópult' })).toBeVisible();
  });

  test('invalid credentials show Hungarian error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Felhasználónév').fill('wrong');
    await page.getByLabel('Jelszó').fill('wrong');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // Verify Hungarian error message
    await expect(page.getByText('Érvénytelen felhasználónév vagy jelszó')).toBeVisible();
  });
});
```

**FEFO Test pattern:**
```typescript
// e2e/inventory/fefo.spec.ts
import { test, expect } from '@playwright/test';

test.describe('FEFO Compliance', () => {
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test('FEFO recommendation shows oldest expiry first', async ({ page }) => {
    await page.goto('/inventory/issue');

    // Select product (Hungarian label)
    await page.getByLabel('Termék').click();
    await page.getByRole('option', { name: 'Test Product' }).click();

    // Enter quantity
    await page.getByLabel('Mennyiség').fill('50');

    // Click FEFO recommendation button (Hungarian)
    await page.getByRole('button', { name: 'FEFO Javaslat' }).click();

    // Verify recommendations are visible
    const recommendations = page.locator('[data-testid="fefo-item"]');
    await expect(recommendations).toHaveCount.greaterThan(0);

    // Verify expiry badges with Hungarian text
    await expect(page.getByText('Kritikus')).toBeVisible(); // Critical
  });
});
```

### Phase 6B: Frontend Unit Testing (Vitest)

**Goal**: Set up Vitest and create 50+ unit tests for utilities and components

```yaml
Task B1: Install Vitest and Testing Library
  - RUN: npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8

Task B2: Create vitest.config.ts
  - CREATE: w7-WHv1/frontend/vitest.config.ts
  - CONFIGURE: globals, jsdom environment, coverage

Task B3: Create test setup file
  - CREATE: w7-WHv1/frontend/src/test/setup.ts
  - INCLUDE: cleanup, jest-dom matchers

Task B4: Create test utilities
  - CREATE: w7-WHv1/frontend/src/test/utils.tsx
  - INCLUDE: renderWithProviders (QueryClient, Router)

Task B5: Create utility tests (15 tests)
  - CREATE: w7-WHv1/frontend/tests/lib/date.test.ts
  - IMPLEMENT: test_formatDate_hungarian, test_formatDateTime, test_getExpiryUrgency
  - CREATE: w7-WHv1/frontend/tests/lib/number.test.ts
  - IMPLEMENT: test_formatNumber_hungarian, test_formatWeight, test_formatQuantity
  - CREATE: w7-WHv1/frontend/tests/lib/export.test.ts
  - IMPLEMENT: test_exportToCSV_hungarian_headers

Task B6: Create component tests (20 tests)
  - CREATE: w7-WHv1/frontend/tests/components/expiry-badge.test.tsx
  - IMPLEMENT: test_critical_style, test_high_style, test_expired_text
  - CREATE: w7-WHv1/frontend/tests/components/fefo-recommendation.test.tsx
  - IMPLEMENT: test_renders_items, test_empty_state
  - CREATE: w7-WHv1/frontend/tests/components/search-input.test.tsx
  - IMPLEMENT: test_debounce, test_clear_button

Task B7: Create hook tests (10 tests)
  - CREATE: w7-WHv1/frontend/tests/hooks/use-debounce.test.ts
  - IMPLEMENT: test_debounce_delay, test_immediate_first

Task B8: Update package.json and tsconfig
  - ADD scripts: "test": "vitest", "test:coverage": "vitest run --coverage"
  - UPDATE tsconfig.json: "types": ["vitest/globals"]
```

**vitest.config.ts pattern:**
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
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/e2e/**',
        'src/main.tsx',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Unit test patterns:**
```typescript
// tests/lib/date.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, getExpiryUrgency } from '@/lib/date';

describe('Hungarian date formatting', () => {
  it('formats dates in Hungarian style (yyyy. MM. dd.)', () => {
    const date = new Date('2025-12-28');
    expect(formatDate(date)).toBe('2025. 12. 28.');
  });

  it('formats datetime with time', () => {
    const date = new Date('2025-12-28T14:30:00');
    expect(formatDateTime(date)).toMatch(/2025\. 12\. 28\. \d{2}:\d{2}/);
  });
});

describe('Expiry urgency calculation', () => {
  it('returns critical for < 7 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    expect(getExpiryUrgency(date)).toBe('critical');
  });

  it('returns high for 7-14 days', () => {
    const date = new Date();
    date.setDate(date.getDate() + 10);
    expect(getExpiryUrgency(date)).toBe('high');
  });

  it('returns expired for past dates', () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    expect(getExpiryUrgency(date)).toBe('expired');
  });
});

// tests/lib/number.test.ts
import { describe, it, expect } from 'vitest';
import { formatNumber, formatWeight } from '@/lib/number';

describe('Hungarian number formatting', () => {
  it('uses comma as decimal separator', () => {
    expect(formatNumber(1234.56, 2)).toBe('1 234,56');
  });

  it('uses space as thousands separator', () => {
    expect(formatNumber(1234567)).toBe('1 234 567');
  });

  it('formats weight with kg suffix', () => {
    expect(formatWeight(1234.5)).toBe('1 234,50 kg');
  });
});
```

**Component test pattern:**
```typescript
// tests/components/expiry-badge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpiryBadge } from '@/components/inventory/expiry-badge';

describe('ExpiryBadge', () => {
  it('shows critical style for urgent expiry', () => {
    const criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() + 3);

    render(<ExpiryBadge date={criticalDate} />);

    const badge = screen.getByText('Kritikus'); // Hungarian
    expect(badge).toHaveClass('bg-expiry-critical');
  });

  it('shows LEJÁRT for expired items', () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 5);

    render(<ExpiryBadge date={expiredDate} />);

    expect(screen.getByText('Lejárt')).toBeInTheDocument(); // Hungarian
  });
});
```

### Phase 6C: Production Docker Setup

**Goal**: Create production-optimized Docker images with security hardening

```yaml
Task C1: Create backend production Dockerfile
  - CREATE: w7-WHv1/backend/Dockerfile.prod
  - IMPLEMENT: Multi-stage build (builder + runtime)
  - INCLUDE: Non-root user, health check
  - INCLUDE: Gunicorn with uvicorn workers

Task C2: Create frontend production Dockerfile
  - CREATE: w7-WHv1/frontend/Dockerfile.prod
  - IMPLEMENT: Multi-stage build (builder + nginx)
  - INCLUDE: Nginx configuration for SPA

Task C3: Create frontend nginx.conf
  - CREATE: w7-WHv1/frontend/nginx.conf
  - IMPLEMENT: SPA routing (try_files)
  - IMPLEMENT: Gzip compression
  - IMPLEMENT: Security headers (X-Frame-Options, CSP, etc.)
  - IMPLEMENT: Static asset caching

Task C4: Create production docker-compose
  - CREATE: w7-WHv1/docker-compose.prod.yml
  - INCLUDE: All services (db, valkey, backend, celery-worker, celery-beat, frontend, nginx)
  - INCLUDE: Health checks for all services
  - INCLUDE: Volume mounts for persistence
  - INCLUDE: Network isolation

Task C5: Create health check endpoint
  - MODIFY: w7-WHv1/backend/app/main.py
  - ADD: GET /health endpoint returning service status

Task C6: Add production requirements
  - MODIFY: w7-WHv1/backend/requirements.txt
  - ADD: gunicorn>=23.0.0
  - ADD: prometheus-client>=0.21.0
  - ADD: python-json-logger>=3.2.0
  - ADD: slowapi>=0.1.9
```

**Dockerfile.prod (backend) pattern:**
```dockerfile
# w7-WHv1/backend/Dockerfile.prod
# Stage 1: Builder
FROM python:3.13-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.13-slim

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Copy dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Production server with Gunicorn
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--timeout", "120"]
```

**Dockerfile.prod (frontend) pattern:**
```dockerfile
# w7-WHv1/frontend/Dockerfile.prod
# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Nginx runtime
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf pattern:**
```nginx
# w7-WHv1/frontend/nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;

    # SPA routing - all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

### Phase 6D: CI/CD Pipeline

**Goal**: Automate testing, building, and deployment with GitHub Actions

```yaml
Task D1: Enhance existing CI workflow
  - MODIFY: .github/workflows/ci.yml
  - ADD: Frontend lint and build
  - ADD: Playwright E2E tests
  - ADD: Vitest unit tests
  - ADD: Docker build verification

Task D2: Create production deployment workflow
  - CREATE: .github/workflows/deploy-prod.yml
  - IMPLEMENT: Build Docker images
  - IMPLEMENT: Push to registry
  - IMPLEMENT: Deploy to server

Task D3: Create deployment scripts
  - CREATE: scripts/install-production.sh
  - IMPLEMENT: Fresh installation from Ubuntu 24.04
  - CREATE: scripts/deploy.sh
  - IMPLEMENT: Zero-downtime rolling deployment
```

**CI workflow pattern:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, 'feature/*', '*-Phase_*']
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: wms_user
          POSTGRES_PASSWORD: wms_password
          POSTGRES_DB: wms_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.13
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd w7-WHv1/backend
          pip install -r requirements.txt

      - name: Lint with ruff
        run: |
          cd w7-WHv1/backend
          ruff check .

      - name: Type check with mypy
        run: |
          cd w7-WHv1/backend
          mypy app/ --ignore-missing-imports
        continue-on-error: true

      - name: Run tests
        env:
          TEST_DATABASE_URL: postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms_test
        run: |
          cd w7-WHv1/backend
          pytest app/tests/ -v --tb=short

  frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: w7-WHv1/frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd w7-WHv1/frontend
          npm ci

      - name: Lint
        run: |
          cd w7-WHv1/frontend
          npm run lint

      - name: Type check
        run: |
          cd w7-WHv1/frontend
          npm run build

      - name: Unit tests
        run: |
          cd w7-WHv1/frontend
          npm run test -- --run

  e2e:
    runs-on: ubuntu-latest
    needs: [backend, frontend]
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: wms_user
          POSTGRES_PASSWORD: wms_password
          POSTGRES_DB: wms
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.13
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'

      - name: Set up Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install backend
        run: |
          cd w7-WHv1/backend
          pip install -r requirements.txt

      - name: Install frontend
        run: |
          cd w7-WHv1/frontend
          npm ci

      - name: Install Playwright
        run: |
          cd w7-WHv1/frontend
          npx playwright install --with-deps chromium

      - name: Run migrations and seed
        env:
          DATABASE_URL: postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms
        run: |
          cd w7-WHv1/backend
          alembic upgrade head
          python -m app.db.seed

      - name: Start backend
        env:
          DATABASE_URL: postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms
          JWT_SECRET: test-secret-key-for-ci-minimum-32-characters
        run: |
          cd w7-WHv1/backend
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 5

      - name: Start frontend
        run: |
          cd w7-WHv1/frontend
          npm run dev &
          sleep 5

      - name: Run E2E tests
        run: |
          cd w7-WHv1/frontend
          npx playwright test --project=chromium

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: w7-WHv1/frontend/playwright-report/
          retention-days: 7
```

### Phase 6E: Backend Enhancements (Monitoring, Rate Limiting)

**Goal**: Add production monitoring, metrics, and rate limiting

```yaml
Task E1: Add health endpoint
  - MODIFY: w7-WHv1/backend/app/main.py
  - ADD: GET /health endpoint with service status

Task E2: Add Prometheus metrics
  - CREATE: w7-WHv1/backend/app/core/metrics.py
  - IMPLEMENT: Request count, duration, inventory gauges

Task E3: Add structured logging
  - CREATE: w7-WHv1/backend/app/core/logging_config.py
  - IMPLEMENT: JSON logging for production

Task E4: Add rate limiting
  - CREATE: w7-WHv1/backend/app/core/rate_limit.py
  - IMPLEMENT: 100 req/min per IP default
  - ADD Hungarian error message for rate limit

Task E5: Create integration tests
  - CREATE: w7-WHv1/backend/app/tests/test_integration.py
  - IMPLEMENT: Full workflow tests (receipt → FEFO → issue)
```

**Health endpoint pattern:**
```python
# Add to app/main.py
from datetime import datetime, timezone
from sqlalchemy import text

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_async_session)):
    """Health check endpoint for container orchestration."""
    try:
        # Check database connection
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": db_status,
            "api": "healthy",
        },
    }
```

**Rate limiting pattern:**
```python
# app/core/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.i18n import HU_MESSAGES

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Hungarian error message for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={"detail": HU_MESSAGES.get("rate_limit_exceeded", "Túl sok kérés. Próbálja újra később.")},
    )
```

### Phase 6F: Documentation & Scripts

**Goal**: Complete production documentation and automation scripts

```yaml
Task F1: Create production deployment guide
  - CREATE: Docs/Production_Deployment.md
  - DOCUMENT: Prerequisites, installation, configuration

Task F2: Create operations runbook
  - CREATE: Docs/Operations_Runbook.md
  - DOCUMENT: Daily tasks, monitoring, troubleshooting

Task F3: Create security guide
  - CREATE: Docs/Security_Hardening.md
  - DOCUMENT: Secrets, HTTPS, firewall, rate limiting

Task F4: Create backup guide
  - CREATE: Docs/Backup_Recovery.md
  - DOCUMENT: Backup schedule, restore procedures

Task F5: Create installation script
  - CREATE: scripts/install-production.sh
  - IMPLEMENT: Full installation from Ubuntu 24.04

Task F6: Create deployment script
  - CREATE: scripts/deploy.sh
  - IMPLEMENT: Zero-downtime rolling deployment

Task F7: Create backup scripts
  - CREATE: scripts/backup-database.sh
  - CREATE: scripts/restore-database.sh
```

**install-production.sh pattern:**
```bash
#!/bin/bash
set -e

echo "=== WMS Production Installation Script ==="
echo "Target: Ubuntu 24.04 LTS"
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

# 4. Clone repository
echo "[4/10] Cloning WMS repository..."
cd /opt
sudo git clone https://github.com/w7-mgfcode/w7-WAREHOUSE.git wms
sudo chown -R $USER:$USER /opt/wms
cd /opt/wms

# 5. Create environment file
echo "[5/10] Creating environment configuration..."
cat > w7-WHv1/.env << 'EOF'
# Database
DB_USER=wms_user
DB_PASSWORD=CHANGE_ME_SECURE_PASSWORD_32CHARS
DB_NAME=wms

# JWT (min 32 characters)
JWT_SECRET=CHANGE_ME_SECURE_JWT_SECRET_MIN_32_CHARS

# Valkey
VALKEY_PASSWORD=CHANGE_ME_VALKEY_PASSWORD

# App
TIMEZONE=Europe/Budapest
LANGUAGE=hu
DEBUG=false
EOF

echo "IMPORTANT: Edit w7-WHv1/.env and set secure passwords!"
read -p "Press Enter after editing .env file..."

# 6. Build Docker images
echo "[6/10] Building Docker images..."
cd /opt/wms/w7-WHv1
docker-compose -f docker-compose.prod.yml build

# 7. Start services
echo "[7/10] Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# 8. Wait for database
echo "[8/10] Waiting for database..."
sleep 15

# 9. Run migrations and seed
echo "[9/10] Running database migrations and seed..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
docker-compose -f docker-compose.prod.yml exec -T backend python -m app.db.seed

# 10. Setup daily backup cron
echo "[10/10] Setting up daily backup..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/wms/scripts/backup-database.sh") | crontab -

echo ""
echo "=== Installation Complete! ==="
echo ""
echo "Services:"
echo "  - Frontend: http://localhost"
echo "  - Backend API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Default admin: admin / Admin123!"
echo "IMPORTANT: Change admin password immediately!"
```

---

## Validation Loop

### Level 1: Syntax & Style (Run after EACH phase)

```bash
# Backend
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/backend
source ../../venv_linux/bin/activate
ruff check app/ --fix
ruff format app/

# Frontend
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/frontend
npm run lint
npm run build
# Expected: No errors
```

### Level 2: Unit Tests (Run after Phase 6A and 6B)

```bash
# Backend (existing + new)
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/backend
pytest app/tests/ -v
# Expected: 146+ tests pass

# Frontend unit tests
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/frontend
npm run test -- --run
# Expected: 50+ tests pass
```

### Level 3: E2E Tests (Run after Phase 6A)

```bash
# Start backend first
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/backend
source ../../venv_linux/bin/activate
uvicorn app.main:app --reload &

# Run E2E tests
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/frontend
npm run test:e2e
# Expected: 20+ tests pass
```

### Level 4: Docker Build (Run after Phase 6C)

```bash
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1

# Build production images
docker-compose -f docker-compose.prod.yml build
# Expected: All images build successfully

# Run production stack
docker-compose -f docker-compose.prod.yml up -d
# Expected: All services healthy

# Check health
curl http://localhost:8000/health
# Expected: {"status": "healthy", ...}
```

### Level 5: Full System Test (Run after Phase 6F)

```bash
# Fresh Ubuntu 24.04 VM
./scripts/install-production.sh
# Expected: System operational

# Test deployment
./scripts/deploy.sh
# Expected: Zero-downtime update

# Test backup/restore
./scripts/backup-database.sh
./scripts/restore-database.sh backup-file.sql.gz
# Expected: Data integrity verified
```

---

## Final Validation Checklist

### Testing
- [ ] `npm run test` - All Vitest unit tests pass (50+)
- [ ] `npm run test:e2e` - All Playwright E2E tests pass (20+)
- [ ] `pytest app/tests/` - All 146 backend tests pass
- [ ] Accessibility tests have 0 violations

### Docker
- [ ] `docker-compose -f docker-compose.prod.yml build` - All images build
- [ ] All containers start with `service_healthy` status
- [ ] `/health` endpoint returns `{"status": "healthy"}`
- [ ] Non-root users in all containers

### CI/CD
- [ ] GitHub Actions CI workflow passes on push
- [ ] E2E tests run successfully in CI

### Documentation
- [ ] Production_Deployment.md complete
- [ ] Operations_Runbook.md complete
- [ ] Security_Hardening.md complete
- [ ] Backup_Recovery.md complete

### Scripts
- [ ] `install-production.sh` completes on fresh Ubuntu 24.04
- [ ] `deploy.sh` performs zero-downtime update
- [ ] `backup-database.sh` creates compressed backup
- [ ] `restore-database.sh` restores from backup

---

## Anti-Patterns to Avoid

- ❌ Don't use `waitForTimeout()` in Playwright - use locator auto-waiting
- ❌ Don't share login state between Playwright tests - use storageState
- ❌ Don't forget `cleanup()` in Vitest setup - React Testing Library requires it
- ❌ Don't use English text in assertions - use Hungarian (HU object)
- ❌ Don't run Docker containers as root - create non-root user
- ❌ Don't skip health checks in production containers
- ❌ Don't use `uvicorn` directly in production - use `gunicorn` with uvicorn workers
- ❌ Don't hardcode secrets - use environment variables
- ❌ Don't skip rate limiting - implement with SlowAPI
- ❌ Don't forget security headers in nginx config

---

## Confidence Score: 8/10

**Strengths:**
- Complete file structure documented
- Existing test patterns in backend provide clear templates
- Playwright and Vitest documentation is mature and well-documented
- Docker multi-stage builds are well-established patterns
- GitHub Actions workflows have official templates
- Hungarian translations already exist in codebase

**Risks:**
- Large scope (6 sub-phases) may require iterations
- E2E tests depend on backend being fully operational
- Playwright browser installation in CI can be slow
- Production deployment scripts need real server validation

**Recommendation:**
Execute phases sequentially (6A → 6B → 6C → 6D → 6E → 6F). Validate each phase before proceeding. If E2E tests fail, check backend logs first.

---

## Sources

### Testing
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [E2E Testing React with Playwright](https://articles.mergify.com/e-2-e-testing-react-playwright/)
- [Vitest Getting Started](https://vitest.dev/guide/)
- [React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup/)
- [Automated Testing in React 19](https://www.ideaflow.studio/en/blog/automated-testing-in-react-19-from-unit-to-e2-e-with-playwright)

### Docker & DevOps
- [FastAPI in Docker](https://fastapi.tiangolo.com/deployment/docker/)
- [Docker Multi-Stage FastAPI Tutorial](https://python.plainenglish.io/docker-multi-stage-fastapi-tutorial-cb0d97b6d274)
- [FastAPI Full-Stack Template](https://github.com/fastapi/full-stack-fastapi-template)
- [Slimmer FastAPI Docker Images](https://davidmuraya.com/blog/slimmer-fastapi-docker-images-multistage-builds/)

### CI/CD
- [GitHub Actions CI/CD Setup](https://www.raythurman.dev/blog/setting-up-ci-cd-with-github-actions)
- [FastAPI GitHub Actions Deploy](https://dzone.com/articles/fastapi-github-actions-deploy)
- [FastAPI CI/CD with Docker](https://dev.to/tony_uketui_6cca68c7eba02/deploying-a-fastapi-app-with-cicd-github-actions-docker-nginx-aws-ec2-6p8)

---

**END OF PRP**
