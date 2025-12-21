# PRP: Phase 5 - Frontend (React 19 + Tailwind v4 + shadcn/ui)

**Version**: 1.0
**Created**: 2025-12-21
**Feature File**: INITIAL5.md
**Estimated Complexity**: Very High (8 milestones, ~130 files, complete SPA)
**Branch**: `05-Frontend-Phase_5`

---

## Goal

Build a complete Single Page Application (SPA) frontend for the WMS system using:
- **React 19** with new hooks (`useActionState`, `useOptimistic`, `useFormStatus`)
- **Tailwind CSS v4** with CSS-first `@theme` configuration
- **shadcn/ui** (canary) optimized for React 19 + Tailwind v4
- **TanStack Query v5** for server state with `queryOptions` pattern
- **Zustand 5** for client state (auth, UI preferences)

## Why

- **User Experience**: Provide intuitive warehouse management interface for Hungarian users
- **FEFO Compliance**: Visual indicators for expiry urgency aid food safety compliance
- **Operational Efficiency**: Dashboard KPIs and real-time inventory visibility
- **Mobile Support**: Responsive design for warehouse floor tablets/phones

## What

### Success Criteria
- [ ] Project initializes with Vite + React 19 + TypeScript + Tailwind v4
- [ ] shadcn/ui components work correctly
- [ ] Authentication flow works (login, logout, token refresh)
- [ ] All CRUD pages functional (warehouses, products, suppliers, bins)
- [ ] Inventory operations work (receipt, issue, FEFO recommendation)
- [ ] Dashboard displays KPIs and charts
- [ ] All UI text in Hungarian
- [ ] RBAC enforced in UI (admin, manager, warehouse, viewer)
- [ ] ESLint passes: `npm run lint`
- [ ] TypeScript passes: `npm run build`
- [ ] Unit tests pass: `npm run test`

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Official Documentation
- url: https://vite.dev/guide/
  why: Vite setup, configuration, build optimization

- url: https://ui.shadcn.com/docs/installation/vite
  why: shadcn/ui + Vite setup with Tailwind v4
  critical: Use canary version for React 19 + Tailwind v4

- url: https://ui.shadcn.com/docs/tailwind-v4
  why: Tailwind v4 specific configuration, @theme inline, HSL to OKLCH

- url: https://tailwindcss.com/docs/theme
  why: @theme directive for custom design tokens

- url: https://tanstack.com/query/v5/docs/framework/react/reference/useSuspenseQuery
  why: TanStack Query v5 suspense pattern

- url: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5
  why: queryOptions pattern, breaking changes from v4

- url: https://react.dev/blog/2024/12/05/react-19
  why: React 19 new features, useActionState, useOptimistic, useFormStatus

- url: https://www.robinwieruch.de/react-router-private-routes/
  why: Protected routes pattern with React Router 7

- url: https://akhilaariyachandra.com/blog/refreshing-an-authentication-in-token-in-tanstack-query
  why: Token refresh with TanStack Query + Axios interceptors

# Codebase References
- file: w7-WHv1/backend/app/api/v1/auth.py
  why: Auth endpoints structure, OAuth2 form login

- file: w7-WHv1/backend/app/schemas/auth.py
  why: Token schema, LoginRequest, RefreshTokenRequest

- file: w7-WHv1/backend/app/schemas/warehouse.py
  why: Pydantic schema pattern for TypeScript types

- file: w7-WHv1/backend/app/schemas/inventory.py
  why: FEFO, receipt, issue schemas for frontend forms

- file: w7-WHv1/backend/app/core/i18n.py
  why: Hungarian translations pattern (HU_MESSAGES, HU_ERRORS)

- file: INITIAL5.md
  why: Complete feature specification with code examples

- file: CLAUDE.md
  why: Project conventions, Hungarian localization requirements
```

### Current Codebase Tree

```bash
w7-WHv1/
├── backend/                    # Phases 1-4 complete (140 tests)
│   ├── app/
│   │   ├── api/v1/            # 12 API routers
│   │   │   ├── auth.py        # POST /login, /refresh, GET /me
│   │   │   ├── warehouses.py  # CRUD
│   │   │   ├── products.py    # CRUD + search
│   │   │   ├── suppliers.py   # CRUD + search
│   │   │   ├── bins.py        # CRUD + bulk generation
│   │   │   ├── inventory.py   # receipt, issue, FEFO, stock-levels
│   │   │   ├── movements.py   # audit trail
│   │   │   ├── transfers.py   # same-warehouse, cross-warehouse
│   │   │   ├── reservations.py # FEFO reservations
│   │   │   ├── jobs.py        # background job status
│   │   │   └── reports.py     # inventory summary
│   │   ├── schemas/           # Pydantic v2 schemas (frontend types mirror)
│   │   └── core/i18n.py       # Hungarian messages
│   └── requirements.txt
├── frontend/                   # TO BE CREATED
└── docker-compose.yml
```

### Desired Codebase Tree (Frontend)

```bash
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (~20 files)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── calendar.tsx
│   │   │   └── ...
│   │   ├── layout/                # Layout components
│   │   │   ├── app-layout.tsx     # Main layout with sidebar
│   │   │   ├── sidebar.tsx        # Navigation sidebar
│   │   │   ├── header.tsx         # Top header with user menu
│   │   │   └── breadcrumb.tsx
│   │   ├── auth/                  # Auth components
│   │   │   ├── login-form.tsx
│   │   │   ├── protected-route.tsx
│   │   │   └── role-guard.tsx
│   │   ├── dashboard/             # Dashboard components
│   │   │   ├── kpi-card.tsx
│   │   │   ├── expiry-warnings-list.tsx
│   │   │   ├── occupancy-chart.tsx
│   │   │   └── movement-chart.tsx
│   │   ├── warehouses/            # Warehouse components
│   │   │   ├── warehouse-form.tsx
│   │   │   ├── warehouse-list.tsx
│   │   │   └── warehouse-card.tsx
│   │   ├── products/              # Product components
│   │   │   ├── product-form.tsx
│   │   │   ├── product-list.tsx
│   │   │   └── product-select.tsx
│   │   ├── suppliers/             # Supplier components
│   │   │   ├── supplier-form.tsx
│   │   │   ├── supplier-list.tsx
│   │   │   └── supplier-select.tsx
│   │   ├── bins/                  # Bin components
│   │   │   ├── bin-form.tsx
│   │   │   ├── bin-list.tsx
│   │   │   ├── bin-bulk-form.tsx
│   │   │   └── bin-status-badge.tsx
│   │   ├── inventory/             # Inventory components
│   │   │   ├── receipt-form.tsx
│   │   │   ├── issue-form.tsx
│   │   │   ├── fefo-recommendation.tsx
│   │   │   ├── expiry-badge.tsx
│   │   │   ├── stock-table.tsx
│   │   │   └── movement-history.tsx
│   │   ├── transfers/             # Transfer components
│   │   │   ├── transfer-form.tsx
│   │   │   └── transfer-list.tsx
│   │   ├── reservations/          # Reservation components
│   │   │   ├── reservation-form.tsx
│   │   │   ├── reservation-list.tsx
│   │   │   └── reservation-details.tsx
│   │   └── reports/               # Report components
│   │       ├── stock-levels-report.tsx
│   │       ├── expiry-report.tsx
│   │       └── movement-report.tsx
│   ├── pages/                     # Route pages (~20 files)
│   │   ├── login.tsx
│   │   ├── dashboard.tsx
│   │   ├── warehouses/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── products/
│   │   ├── suppliers/
│   │   ├── bins/
│   │   ├── inventory/
│   │   ├── transfers/
│   │   ├── reservations/
│   │   └── reports/
│   ├── queries/                   # TanStack Query definitions
│   │   ├── auth.ts
│   │   ├── dashboard.ts
│   │   ├── warehouses.ts
│   │   ├── products.ts
│   │   ├── suppliers.ts
│   │   ├── bins.ts
│   │   ├── inventory.ts
│   │   ├── transfers.ts
│   │   ├── reservations.ts
│   │   └── reports.ts
│   ├── stores/                    # Zustand stores
│   │   ├── auth-store.ts          # Auth state with persistence
│   │   ├── ui-store.ts            # Theme, sidebar state
│   │   └── filter-store.ts        # Persistent filters
│   ├── schemas/                   # Zod validation schemas
│   │   ├── auth.ts
│   │   ├── warehouse.ts
│   │   ├── product.ts
│   │   ├── supplier.ts
│   │   ├── bin.ts
│   │   ├── inventory.ts
│   │   ├── transfer.ts
│   │   └── reservation.ts
│   ├── types/                     # TypeScript types
│   │   ├── index.ts               # Re-exports
│   │   ├── api.ts                 # API response types
│   │   └── models.ts              # Domain model types
│   ├── lib/
│   │   ├── api-client.ts          # Axios instance with interceptors
│   │   ├── query-client.ts        # TanStack Query config
│   │   ├── date.ts                # Hungarian date formatting
│   │   ├── number.ts              # Hungarian number formatting
│   │   ├── i18n.ts                # Hungarian UI translations
│   │   └── utils.ts               # cn() helper from shadcn
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-toast.ts
│   │   └── use-debounce.ts
│   ├── App.tsx                    # Router setup
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Tailwind CSS with @theme
├── tests/
│   ├── setup.ts                   # Vitest setup
│   ├── mocks/
│   │   ├── handlers.ts            # MSW handlers
│   │   └── server.ts              # MSW server
│   └── components/
│       └── ...                    # Component tests
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── components.json                # shadcn/ui config
├── eslint.config.js
└── README.md
```

### Known Gotchas & Library Quirks

```typescript
// ========================================
// CRITICAL: React 19 - No more forwardRef
// ========================================
// ❌ WRONG (React 18 pattern):
const MyComponent = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref}>{props.children}</div>
})

// ✅ CORRECT (React 19 pattern):
function MyComponent({ ref, children }: Props & { ref?: React.Ref<HTMLDivElement> }) {
  return <div ref={ref}>{children}</div>
}

// ========================================
// CRITICAL: Tailwind CSS v4 - CSS-first config
// ========================================
// ❌ WRONG (Tailwind v3):
// @tailwind base;
// @tailwind components;
// @tailwind utilities;

// ✅ CORRECT (Tailwind v4):
// @import "tailwindcss";
// @theme { --color-primary: hsl(210, 100%, 40%); }

// ========================================
// CRITICAL: shadcn/ui - Use canary for React 19
// ========================================
// ❌ WRONG:
// npx shadcn@latest init

// ✅ CORRECT:
// npx shadcn@canary init
// Note: Stable version may not support React 19 + Tailwind v4

// ========================================
// CRITICAL: TanStack Query v5 - queryOptions pattern
// ========================================
// ❌ WRONG (v4 pattern):
const { data } = useQuery(['products'], fetchProducts)

// ✅ CORRECT (v5 pattern):
const productsQueryOptions = (filters: Filters) => queryOptions({
  queryKey: ['products', filters],
  queryFn: () => fetchProducts(filters),
})
const { data } = useQuery(productsQueryOptions(filters))

// ========================================
// CRITICAL: TanStack Query v5 - No onError in useQuery
// ========================================
// ❌ WRONG (removed in v5):
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onError: (error) => handleError(error), // ❌ Removed!
})

// ✅ CORRECT (use QueryCache for global error handling):
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Handle 401 errors globally
      if (error.response?.status === 401) {
        // Trigger token refresh or logout
      }
    },
  }),
})

// ========================================
// CRITICAL: Auth token refresh pattern
// ========================================
// Problem: Multiple simultaneous 401 errors can trigger multiple refresh calls
// Solution: Use a flag to prevent duplicate refresh requests

let isRefreshing = false;
let failedQueue: Array<{resolve: Function, reject: Function}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await refreshToken();
        // Retry failed requests
        failedQueue.forEach(({ resolve }) => resolve(newToken));
      } finally {
        isRefreshing = false;
        failedQueue = [];
      }
    }
    return Promise.reject(error);
  }
);

// ========================================
// CRITICAL: Hungarian date/number formatting
// ========================================
// Date: use date-fns with hu locale
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
format(new Date(), 'yyyy. MM. dd.', { locale: hu }); // "2025. 12. 21."

// Number: use Intl.NumberFormat
new Intl.NumberFormat('hu-HU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(1234.56); // "1 234,56"

// ========================================
// CRITICAL: Zustand persist middleware
// ========================================
// Only persist non-sensitive data (refreshToken, UI preferences)
// NEVER persist accessToken (short-lived, should be in memory)
persist(
  (set) => ({ /* state */ }),
  {
    name: 'wms-auth',
    partialize: (state) => ({ refreshToken: state.refreshToken }),
  }
)

// ========================================
// CRITICAL: Backend API base path
// ========================================
// All API endpoints are prefixed with /api/v1
// Auth uses OAuth2 form data (not JSON) for login:
// POST /api/v1/auth/login with form data: username, password

// ========================================
// CRITICAL: RBAC UI enforcement
// ========================================
// admin: Full access
// manager: CRUD, FEFO override, adjust, scrap, cross-warehouse transfers
// warehouse: Receipt, issue, same-warehouse transfers, reservations
// viewer: Read-only access
```

---

## Implementation Blueprint

### Phase A: Project Foundation

**Goal**: Set up Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui

```yaml
Task A1: Create Vite project
  - RUN: cd w7-WHv1 && npm create vite@latest frontend -- --template react-ts
  - VERIFY: cd frontend && npm install && npm run dev

Task A2: Install Tailwind CSS v4
  - RUN: npm install tailwindcss @tailwindcss/vite
  - UPDATE: vite.config.ts to add tailwindcss plugin
  - UPDATE: src/index.css with @import "tailwindcss"

Task A3: Configure TypeScript path aliases
  - RUN: npm install -D @types/node
  - UPDATE: tsconfig.json with baseUrl and paths
  - UPDATE: tsconfig.app.json with same paths
  - UPDATE: vite.config.ts with resolve.alias

Task A4: Initialize shadcn/ui
  - RUN: npx shadcn@canary init
  - SELECT: Neutral base color
  - VERIFY: components.json created

Task A5: Add base shadcn components
  - RUN: npx shadcn@canary add button card input form select table dialog alert badge skeleton toast dropdown-menu sheet tabs navigation-menu calendar separator scroll-area avatar popover command
  - VERIFY: src/components/ui/ populated

Task A6: Create @theme configuration
  - UPDATE: src/index.css with full theme from INITIAL5.md
  - INCLUDE: Primary colors, expiry urgency colors, bin status colors
  - INCLUDE: Dark mode overrides
```

**vite.config.ts pattern:**
```typescript
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
})
```

**src/index.css pattern:**
```css
@import "tailwindcss";

@theme {
  /* Primary colors - Hungarian blue theme */
  --color-primary: hsl(210, 100%, 40%);
  --color-primary-foreground: hsl(0, 0%, 100%);
  --color-secondary: hsl(210, 15%, 95%);
  --color-secondary-foreground: hsl(210, 50%, 20%);

  /* Semantic colors */
  --color-success: hsl(142, 76%, 36%);
  --color-warning: hsl(38, 92%, 50%);
  --color-error: hsl(0, 84%, 60%);
  --color-info: hsl(199, 89%, 48%);

  /* Expiry urgency colors */
  --color-expiry-critical: hsl(0, 84%, 60%);
  --color-expiry-high: hsl(25, 95%, 53%);
  --color-expiry-medium: hsl(45, 93%, 47%);
  --color-expiry-low: hsl(142, 71%, 45%);

  /* Bin status colors */
  --color-bin-empty: hsl(142, 76%, 36%);
  --color-bin-occupied: hsl(210, 100%, 40%);
  --color-bin-reserved: hsl(280, 87%, 40%);
  --color-bin-inactive: hsl(0, 0%, 60%);

  /* Fonts */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

/* Dark mode */
.dark {
  --color-primary: hsl(210, 100%, 60%);
  --color-secondary: hsl(210, 15%, 15%);
  --color-secondary-foreground: hsl(210, 15%, 90%);
}
```

### Phase B: Authentication & Protected Routes

**Goal**: Login flow, token management, protected routes

```yaml
Task B1: Create TypeScript types
  - CREATE: src/types/index.ts
  - CREATE: src/types/api.ts (Token, User, PaginatedResponse)
  - CREATE: src/types/models.ts (Warehouse, Product, Supplier, Bin, etc.)

Task B2: Create Zustand auth store
  - CREATE: src/stores/auth-store.ts
  - INCLUDE: user, accessToken, refreshToken, isAuthenticated
  - INCLUDE: setAuth, updateAccessToken, logout actions
  - USE: persist middleware for refreshToken only

Task B3: Create API client with interceptors
  - INSTALL: npm install axios
  - CREATE: src/lib/api-client.ts
  - INCLUDE: Request interceptor to add Authorization header
  - INCLUDE: Response interceptor for 401 handling with token refresh
  - INCLUDE: Duplicate refresh prevention flag

Task B4: Create TanStack Query client
  - INSTALL: npm install @tanstack/react-query @tanstack/react-query-devtools
  - CREATE: src/lib/query-client.ts
  - INCLUDE: QueryCache with global error handler for 401
  - CONFIGURE: staleTime, gcTime, retry options

Task B5: Create auth queries
  - CREATE: src/queries/auth.ts
  - INCLUDE: loginMutation (uses form data, not JSON!)
  - INCLUDE: refreshMutation
  - INCLUDE: meQueryOptions

Task B6: Create login page
  - INSTALL: npm install react-hook-form @hookform/resolvers zod
  - CREATE: src/schemas/auth.ts (loginSchema with Hungarian messages)
  - CREATE: src/components/auth/login-form.tsx
  - CREATE: src/pages/login.tsx
  - USE: React Hook Form + Zod for validation

Task B7: Create protected route component
  - INSTALL: npm install react-router-dom
  - CREATE: src/components/auth/protected-route.tsx
  - INCLUDE: isAuthenticated check, redirect to /login
  - INCLUDE: allowedRoles prop for RBAC

Task B8: Set up routing
  - CREATE: src/App.tsx with BrowserRouter
  - INCLUDE: Public routes (/login)
  - INCLUDE: Protected routes (dashboard, CRUD pages)
  - UPDATE: src/main.tsx with QueryClientProvider
```

**Auth store pattern:**
```typescript
// src/stores/auth-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "manager" | "warehouse" | "viewer";
  full_name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "wms-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        // CRITICAL: Do NOT persist accessToken or user
      }),
    }
  )
);
```

**API client pattern:**
```typescript
// src/lib/api-client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Prevent duplicate refresh requests
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Request interceptor - add auth token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor - handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, updateAccessToken, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post("/api/v1/auth/refresh", {
          refresh_token: refreshToken,
        });
        const newAccessToken = response.data.access_token;
        updateAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

**Login mutation pattern (CRITICAL: uses form data!):**
```typescript
// src/queries/auth.ts
import { useMutation, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Token, User } from "@/types";

export const loginMutation = () =>
  useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      // CRITICAL: Backend uses OAuth2 form data, not JSON!
      const formData = new URLSearchParams();
      formData.append("username", credentials.username);
      formData.append("password", credentials.password);

      const { data } = await apiClient.post<Token>("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return data;
    },
    onSuccess: async (data) => {
      const { setAuth, updateAccessToken } = useAuthStore.getState();
      updateAccessToken(data.access_token);

      // Fetch user info
      const { data: user } = await apiClient.get<User>("/auth/me");
      setAuth(user, data.access_token, data.refresh_token);
    },
  });

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get<User>("/auth/me");
      return data;
    },
  });
```

### Phase C: Layout & Navigation

**Goal**: App shell with sidebar, header, breadcrumbs, dark mode

```yaml
Task C1: Create Hungarian translations
  - CREATE: src/lib/i18n.ts
  - COPY: All translations from INITIAL5.md (nav, actions, status, roles, etc.)

Task C2: Create UI store
  - CREATE: src/stores/ui-store.ts
  - INCLUDE: sidebarOpen, darkMode states
  - INCLUDE: persist preference

Task C3: Create layout components
  - CREATE: src/components/layout/sidebar.tsx
  - CREATE: src/components/layout/header.tsx
  - CREATE: src/components/layout/breadcrumb.tsx
  - CREATE: src/components/layout/app-layout.tsx
  - USE: Outlet from react-router-dom for nested routes

Task C4: Implement dark mode
  - UPDATE: src/components/layout/header.tsx with theme toggle
  - UPDATE: index.html with class="dark" toggle logic
  - USE: system preference detection

Task C5: Create role guard component
  - CREATE: src/components/auth/role-guard.tsx
  - USE: Hide/disable UI elements based on user role
```

### Phase D: Dashboard

**Goal**: KPI cards, charts, expiry warnings

```yaml
Task D1: Create date/number formatting utilities
  - INSTALL: npm install date-fns
  - CREATE: src/lib/date.ts (formatDate, formatDateTime, getExpiryUrgency)
  - CREATE: src/lib/number.ts (formatNumber, formatWeight, formatQuantity)

Task D2: Create dashboard queries
  - CREATE: src/queries/dashboard.ts
  - INCLUDE: dashboardStatsQueryOptions

Task D3: Create dashboard components
  - CREATE: src/components/dashboard/kpi-card.tsx
  - CREATE: src/components/dashboard/expiry-warnings-list.tsx
  - INSTALL: npm install recharts
  - CREATE: src/components/dashboard/occupancy-chart.tsx
  - CREATE: src/components/dashboard/movement-chart.tsx

Task D4: Create dashboard page
  - CREATE: src/pages/dashboard.tsx
  - USE: useSuspenseQuery for data fetching
  - USE: Suspense boundary with skeleton fallback
```

### Phase E: Master Data CRUD

**Goal**: Warehouses, Products, Suppliers, Bins CRUD pages

```yaml
Task E1: Create shared CRUD components
  - CREATE: src/components/shared/data-table.tsx (reusable table with pagination)
  - CREATE: src/components/shared/delete-dialog.tsx
  - CREATE: src/components/shared/search-input.tsx

Task E2: Warehouses CRUD
  - CREATE: src/queries/warehouses.ts
  - CREATE: src/schemas/warehouse.ts
  - CREATE: src/components/warehouses/warehouse-form.tsx
  - CREATE: src/components/warehouses/warehouse-list.tsx
  - CREATE: src/pages/warehouses/index.tsx
  - CREATE: src/pages/warehouses/new.tsx
  - CREATE: src/pages/warehouses/[id].tsx

Task E3: Products CRUD
  - CREATE: src/queries/products.ts
  - CREATE: src/schemas/product.ts
  - CREATE: src/components/products/product-form.tsx
  - CREATE: src/components/products/product-list.tsx
  - CREATE: src/components/products/product-select.tsx
  - CREATE: src/pages/products/ (index, new, [id])

Task E4: Suppliers CRUD
  - CREATE: src/queries/suppliers.ts
  - CREATE: src/schemas/supplier.ts
  - CREATE: src/components/suppliers/supplier-form.tsx
  - CREATE: src/components/suppliers/supplier-list.tsx
  - CREATE: src/components/suppliers/supplier-select.tsx
  - CREATE: src/pages/suppliers/ (index, new, [id])

Task E5: Bins CRUD
  - CREATE: src/queries/bins.ts
  - CREATE: src/schemas/bin.ts
  - CREATE: src/components/bins/bin-form.tsx
  - CREATE: src/components/bins/bin-list.tsx
  - CREATE: src/components/bins/bin-status-badge.tsx
  - CREATE: src/components/bins/bin-bulk-form.tsx
  - CREATE: src/pages/bins/ (index, new, [id], bulk)
```

### Phase F: Inventory Operations

**Goal**: Receipt, issue, FEFO, stock overview, expiry warnings

```yaml
Task F1: Create inventory queries
  - CREATE: src/queries/inventory.ts
  - INCLUDE: receiveGoodsMutation, issueGoodsMutation
  - INCLUDE: fefoRecommendationQueryOptions
  - INCLUDE: stockLevelsQueryOptions
  - INCLUDE: expiryWarningsQueryOptions

Task F2: Create expiry badge component
  - CREATE: src/components/inventory/expiry-badge.tsx
  - USE: CSS custom properties for urgency colors

Task F3: Create FEFO recommendation component
  - CREATE: src/components/inventory/fefo-recommendation.tsx
  - SHOW: Ordered picking list with expiry warnings

Task F4: Create inventory forms
  - CREATE: src/schemas/inventory.ts
  - CREATE: src/components/inventory/receipt-form.tsx
  - CREATE: src/components/inventory/issue-form.tsx
  - USE: useOptimistic for instant feedback

Task F5: Create inventory pages
  - CREATE: src/pages/inventory/index.tsx (stock overview)
  - CREATE: src/pages/inventory/receipt.tsx
  - CREATE: src/pages/inventory/issue.tsx
  - CREATE: src/pages/inventory/expiry.tsx

Task F6: Create movement history
  - CREATE: src/queries/movements.ts
  - CREATE: src/components/inventory/movement-history.tsx
```

### Phase G: Transfers & Reservations

**Goal**: Transfer and reservation management

```yaml
Task G1: Create transfer components
  - CREATE: src/queries/transfers.ts
  - CREATE: src/schemas/transfer.ts
  - CREATE: src/components/transfers/transfer-form.tsx
  - CREATE: src/components/transfers/transfer-list.tsx
  - CREATE: src/pages/transfers/ (index, new, pending)

Task G2: Create reservation components
  - CREATE: src/queries/reservations.ts
  - CREATE: src/schemas/reservation.ts
  - CREATE: src/components/reservations/reservation-form.tsx
  - CREATE: src/components/reservations/reservation-list.tsx
  - CREATE: src/components/reservations/reservation-details.tsx
  - CREATE: src/pages/reservations/ (index, new, [id])
```

### Phase H: Reports & Testing

**Goal**: Reports, export, testing

```yaml
Task H1: Create report queries
  - CREATE: src/queries/reports.ts

Task H2: Create report pages
  - CREATE: src/pages/reports/index.tsx
  - CREATE: src/pages/reports/stock-levels.tsx
  - CREATE: src/pages/reports/expiry.tsx
  - CREATE: src/pages/reports/movements.tsx

Task H3: Set up testing
  - INSTALL: npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom msw
  - CREATE: tests/setup.ts
  - CREATE: tests/mocks/handlers.ts
  - CREATE: tests/mocks/server.ts
  - UPDATE: vite.config.ts with test configuration
  - UPDATE: package.json with test scripts

Task H4: Write component tests
  - CREATE: tests/components/login-form.test.tsx
  - CREATE: tests/components/protected-route.test.tsx
  - CREATE: tests/components/expiry-badge.test.tsx

Task H5: Create README
  - CREATE: frontend/README.md
  - DOCUMENT: Setup, development, testing, building
```

---

## Validation Loop

### Level 1: Syntax & Style (Run after EACH phase)

```bash
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/frontend

# TypeScript check
npm run build
# Expected: No type errors

# Lint check
npm run lint
# Expected: No lint errors

# Dev server runs
npm run dev
# Expected: Opens at http://localhost:5173
```

### Level 2: Unit Tests (Run after Phase H)

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Expected: All tests pass
```

### Level 3: Integration Test (Manual)

```bash
# Start backend
cd ../backend
source ../../venv_linux/bin/activate
uvicorn app.main:app --reload

# Start frontend
cd ../frontend
npm run dev

# Test login flow
# 1. Navigate to http://localhost:5173/login
# 2. Login with admin / Admin123!
# 3. Verify redirect to /dashboard
# 4. Verify KPIs displayed
# 5. Navigate to /warehouses, verify list loads
# 6. Create new warehouse, verify success
# 7. Navigate to /inventory/receipt, verify form works
```

---

## Final Validation Checklist

- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Login/logout works correctly
- [ ] Token refresh works (wait 15 min or modify token expiry)
- [ ] All CRUD pages load and submit correctly
- [ ] Dashboard displays KPIs and charts
- [ ] FEFO recommendations display correctly
- [ ] Expiry badges show correct colors
- [ ] Dark mode toggle works
- [ ] Responsive layout works on mobile
- [ ] All UI text is in Hungarian
- [ ] RBAC enforced (viewer can't create, warehouse can't adjust, etc.)

---

## Anti-Patterns to Avoid

- ❌ Don't use `npx shadcn@latest` - use `@canary` for React 19 + Tailwind v4
- ❌ Don't use Tailwind v3 syntax (`@tailwind base`) - use `@import "tailwindcss"`
- ❌ Don't use `forwardRef` in React 19 - use ref prop directly
- ❌ Don't use `useQuery` with `onError` - use QueryCache for global error handling
- ❌ Don't send JSON to `/auth/login` - it requires form data
- ❌ Don't persist accessToken in localStorage - it's short-lived
- ❌ Don't hardcode English text - use src/lib/i18n.ts
- ❌ Don't ignore RBAC - check user.role before showing actions
- ❌ Don't use `datetime.toLocaleDateString()` - use date-fns with hu locale
- ❌ Don't create custom form handling - use React Hook Form + Zod

---

## Confidence Score: 6/10

**Strengths:**
- Complete file structure documented
- Code patterns from INITIAL5.md included
- Auth flow fully specified with gotchas
- Hungarian translations pattern defined
- Validation gates clear and executable

**Risks:**
- Large scope (~130 files) may require iterations
- Complex auth flow with token refresh
- React 19 + Tailwind v4 + shadcn/ui canary is bleeding edge
- Charts/dashboard require Recharts integration
- FEFO visualization is complex

**Recommendation:**
Execute phases sequentially. If Phase A or B fails, stop and fix before proceeding.
For large teams, consider splitting into sub-PRPs per milestone.

---

## Sources

- [Vite Getting Started](https://vite.dev/guide/)
- [shadcn/ui Vite Installation](https://ui.shadcn.com/docs/installation/vite)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme)
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)
- [TanStack Query v5 Migration](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [TanStack Query useSuspenseQuery](https://tanstack.com/query/v5/docs/framework/react/reference/useSuspenseQuery)
- [React Router v7 Protected Routes](https://www.robinwieruch.de/react-router-private-routes/)
- [Token Refresh with TanStack Query](https://akhilaariyachandra.com/blog/refreshing-an-authentication-in-token-in-tanstack-query)
- [Efficient Token Refresh Pattern](https://dev.to/elmehdiamlou/efficient-refresh-token-implementation-with-react-query-and-axios-f8d)
