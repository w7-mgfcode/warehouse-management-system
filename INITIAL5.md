# INITIAL5 — WMS Phase 5: Frontend (React 19 + Tailwind v4 + shadcn/ui)

This document defines Phase 5 implementation requirements, building on Phase 4 (Transfers, Reservations, Scheduled Jobs).

**Last Updated**: December 2025
**Prerequisite**: Phase 4 complete (140 tests passing, 18 API endpoints for transfers/reservations/jobs)
**Branch**: `05-Frontend-Phase_5`

## CRITICAL CONSTRAINTS

- **All user-facing UI text must be Hungarian** (labels, buttons, messages, tooltips, placeholders)
- Code identifiers, comments, and component names remain **English**
- Date format: `yyyy. MM. dd.` (e.g., `2025. 12. 21.`)
- Number format: comma decimal separator, space thousands separator (e.g., `1 234,56`)
- Target: **Modern browsers only** (Tailwind v4 uses bleeding-edge CSS features)

## TECHNOLOGY STACK (December 2025 - Latest Versions)

### Core Framework
| Package | Version | Notes |
|---------|---------|-------|
| React | 19.0+ | useActionState, useOptimistic, useFormStatus |
| TypeScript | 5.7+ | Strict mode enabled |
| Vite | 6.0+ | Build tool with @tailwindcss/vite plugin |

### Styling
| Package | Version | Notes |
|---------|---------|-------|
| Tailwind CSS | 4.0+ | CSS-first config with @theme directive |
| shadcn/ui | Latest (canary) | `npx shadcn@canary init` for React 19 + Tailwind v4 |
| tailwindcss-animate | Deprecated | Use CSS animations directly in Tailwind v4 |

### State Management
| Package | Version | Notes |
|---------|---------|-------|
| TanStack Query | 5.90+ | Server state: useSuspenseQuery, queryOptions pattern |
| Zustand | 5.x | Client state: auth, UI preferences, filters |

### Forms & Validation
| Package | Version | Notes |
|---------|---------|-------|
| React Hook Form | 7.54+ | Form state management |
| Zod | 3.24+ | Schema validation (shared with backend types) |
| @hookform/resolvers | 3.9+ | Zod resolver integration |

### Utilities
| Package | Version | Notes |
|---------|---------|-------|
| date-fns | 4.1+ | Hungarian locale for date formatting |
| axios | 1.7+ | HTTP client with interceptors |
| react-router-dom | 7.0+ | Client-side routing |
| lucide-react | 0.460+ | Icon library (shadcn default) |
| recharts | 2.15+ | Charts for dashboard |

### Development
| Package | Version | Notes |
|---------|---------|-------|
| Vitest | 2.1+ | Unit testing |
| @testing-library/react | 16.0+ | Component testing |
| Playwright | 1.49+ | E2E testing |
| MSW | 2.7+ | API mocking for tests |

## FEATURE

### Phase 5 Scope

1. **Authentication UI** - Login, logout, token refresh, protected routes
2. **Dashboard** - KPIs, charts, expiry warnings overview
3. **Master Data CRUD** - Warehouses, Products, Suppliers, Bins
4. **Inventory Operations** - Receipt, Issue, FEFO recommendations
5. **Transfers** - Same-warehouse and cross-warehouse transfers
6. **Reservations** - Create, fulfill, cancel stock reservations
7. **Reports** - Stock levels, expiry warnings, movement history
8. **User Management** - Admin-only user CRUD (Phase 6 optional)

### Key Features

- **Responsive Design** - Desktop-first with mobile support
- **Dark Mode** - Toggle with system preference detection
- **Real-time Updates** - TanStack Query background refetching
- **Optimistic Updates** - Instant feedback with useOptimistic
- **Form Validation** - Client-side with Hungarian error messages
- **Loading States** - Skeletons and Suspense boundaries
- **Error Handling** - Error boundaries with retry functionality

## EXAMPLES

### Project Setup

```bash
# Create Vite project with React 19 + TypeScript
npm create vite@latest frontend -- --template react-ts

# Install Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Initialize shadcn/ui (canary for React 19 + Tailwind v4)
npx shadcn@canary init

# Install dependencies
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod
npm install date-fns axios react-router-dom lucide-react recharts
npm install -D vitest @testing-library/react @playwright/test msw
```

### Vite Configuration

```typescript
// vite.config.ts
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
});
```

### Tailwind CSS v4 Configuration

```css
/* src/index.css */
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
  --color-expiry-critical: hsl(0, 84%, 60%);    /* < 7 days - red */
  --color-expiry-high: hsl(25, 95%, 53%);       /* 7-14 days - orange */
  --color-expiry-medium: hsl(45, 93%, 47%);     /* 15-30 days - yellow */
  --color-expiry-low: hsl(142, 71%, 45%);       /* > 30 days - green */

  /* Bin status colors */
  --color-bin-empty: hsl(142, 76%, 36%);
  --color-bin-occupied: hsl(210, 100%, 40%);
  --color-bin-reserved: hsl(280, 87%, 40%);
  --color-bin-inactive: hsl(0, 0%, 60%);

  /* Fonts */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Spacing */
  --spacing-page: 1.5rem;
  --spacing-card: 1rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

/* Dark mode theme overrides */
@theme dark {
  --color-primary: hsl(210, 100%, 60%);
  --color-secondary: hsl(210, 15%, 15%);
  --color-secondary-foreground: hsl(210, 15%, 90%);
}
```

### Authentication Store (Zustand)

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
      }),
    }
  )
);
```

### API Client with Token Refresh

```typescript
// src/lib/api-client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      const { refreshToken, updateAccessToken, logout } =
        useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post("/api/v1/auth/refresh", {
            refresh_token: refreshToken,
          });
          const newAccessToken = response.data.access_token;
          updateAccessToken(newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch {
          logout();
          window.location.href = "/login";
        }
      } else {
        logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
```

### TanStack Query Setup with queryOptions

```typescript
// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// src/queries/products.ts
import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Product, PaginatedResponse, ProductFilters } from "@/types";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export const productsQueryOptions = (filters: ProductFilters) =>
  queryOptions({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>(
        "/products",
        { params: filters }
      );
      return data;
    },
  });

export const productQueryOptions = (id: string) =>
  queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Product>(`/products/${id}`);
      return data;
    },
  });
```

### Form with React Hook Form + Zod + Hungarian Validation

```typescript
// src/schemas/product.ts
import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string()
    .min(2, "A termék neve legalább 2 karakter legyen")
    .max(255, "A termék neve maximum 255 karakter lehet"),
  sku: z
    .string()
    .min(3, "Az SKU legalább 3 karakter legyen")
    .max(100, "Az SKU maximum 100 karakter lehet")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .max(100, "A kategória maximum 100 karakter lehet")
    .optional()
    .or(z.literal("")),
  default_unit: z.enum(["db", "kg", "l", "m", "csomag"], {
    errorMap: () => ({ message: "Érvénytelen mértékegység" }),
  }),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;

// src/components/products/product-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActionState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productSchema, type ProductFormData } from "@/schemas/product";
import { apiClient } from "@/lib/api-client";
import { productKeys } from "@/queries/products";

const UNITS = [
  { value: "db", label: "Darab" },
  { value: "kg", label: "Kilogramm" },
  { value: "l", label: "Liter" },
  { value: "m", label: "Méter" },
  { value: "csomag", label: "Csomag" },
];

interface ProductFormProps {
  product?: ProductFormData & { id: string };
  onSuccess?: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? {
      name: "",
      sku: "",
      category: "",
      default_unit: "db",
      description: "",
      is_active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (isEdit) {
        return apiClient.put(`/products/${product.id}`, data);
      }
      return apiClient.post("/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      onSuccess?.();
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Termék neve *</FormLabel>
              <FormControl>
                <Input placeholder="pl. Csirkemell filé" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU (cikkszám)</FormLabel>
              <FormControl>
                <Input placeholder="pl. CSIRKE-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mértékegység *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon mértékegységet" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Mentés..."
            : isEdit
              ? "Módosítás"
              : "Létrehozás"}
        </Button>
      </form>
    </Form>
  );
}
```

### Date Formatting with Hungarian Locale

```typescript
// src/lib/date.ts
import { format, formatDistance, isAfter, isBefore, addDays } from "date-fns";
import { hu } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy. MM. dd.", { locale: hu });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy. MM. dd. HH:mm", { locale: hu });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: hu });
}

export function getDaysUntilExpiry(useByDate: Date | string): number {
  const d = typeof useByDate === "string" ? new Date(useByDate) : useByDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryUrgency(
  useByDate: Date | string
): "critical" | "high" | "medium" | "low" | "expired" {
  const days = getDaysUntilExpiry(useByDate);
  if (days < 0) return "expired";
  if (days < 7) return "critical";
  if (days < 14) return "high";
  if (days < 30) return "medium";
  return "low";
}

export function formatExpiryWarning(days: number): string {
  if (days < 0) return `LEJÁRT (${Math.abs(days)} napja)`;
  if (days === 0) return "MA LEJÁR!";
  if (days === 1) return "Holnap lejár!";
  return `${days} nap múlva lejár`;
}
```

### Number Formatting with Hungarian Locale

```typescript
// src/lib/number.ts
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("hu-HU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatWeight(kg: number): string {
  return `${formatNumber(kg)} kg`;
}

export function formatQuantity(value: number, unit: string): string {
  const unitLabels: Record<string, string> = {
    db: "db",
    kg: "kg",
    l: "l",
    m: "m",
    csomag: "cs",
  };
  return `${formatNumber(value)} ${unitLabels[unit] || unit}`;
}

export function formatPercentage(value: number): string {
  return `${formatNumber(value * 100, 1)}%`;
}
```

### Expiry Warning Badge Component

```typescript
// src/components/inventory/expiry-badge.tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getExpiryUrgency, formatExpiryWarning, getDaysUntilExpiry } from "@/lib/date";

interface ExpiryBadgeProps {
  useByDate: Date | string;
  showDays?: boolean;
  className?: string;
}

export function ExpiryBadge({ useByDate, showDays = true, className }: ExpiryBadgeProps) {
  const days = getDaysUntilExpiry(useByDate);
  const urgency = getExpiryUrgency(useByDate);

  const urgencyStyles = {
    expired: "bg-expiry-critical text-white",
    critical: "bg-expiry-critical text-white animate-pulse",
    high: "bg-expiry-high text-white",
    medium: "bg-expiry-medium text-black",
    low: "bg-expiry-low text-white",
  };

  const urgencyLabels = {
    expired: "Lejárt",
    critical: "Kritikus",
    high: "Magas",
    medium: "Közepes",
    low: "Alacsony",
  };

  return (
    <Badge className={cn(urgencyStyles[urgency], className)}>
      {showDays ? formatExpiryWarning(days) : urgencyLabels[urgency]}
    </Badge>
  );
}
```

### FEFO Recommendation Component

```typescript
// src/components/inventory/fefo-recommendation.tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fefoRecommendationQueryOptions } from "@/queries/inventory";
import { ExpiryBadge } from "./expiry-badge";
import { formatQuantity } from "@/lib/number";

interface FefoRecommendationProps {
  productId: string;
  requestedQuantity: number;
}

export function FefoRecommendation({
  productId,
  requestedQuantity,
}: FefoRecommendationProps) {
  const { data } = useSuspenseQuery(
    fefoRecommendationQueryOptions(productId, requestedQuantity)
  );

  const hasWarnings = data.fefo_warnings.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasWarnings ? (
            <AlertTriangle className="h-5 w-5 text-warning" />
          ) : (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          FEFO Javaslat - {data.product_name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasWarnings && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>FEFO Figyelmeztetés</AlertTitle>
            <AlertDescription>
              {data.fefo_warnings.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {data.recommendations.map((rec, index) => (
            <div
              key={rec.bin_id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{rec.bin_code}</div>
                <div className="text-sm text-muted-foreground">
                  Sarzsszám: {rec.batch_number}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatQuantity(rec.suggested_quantity, "kg")}
                </div>
                <ExpiryBadge useByDate={rec.use_by_date} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between">
          <span className="text-muted-foreground">Összesen elérhető:</span>
          <span className="font-bold">
            {formatQuantity(data.total_available, "kg")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Protected Route Component

```typescript
// src/components/auth/protected-route.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "manager" | "warehouse" | "viewer">;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

### Dashboard with KPIs

```typescript
// src/pages/dashboard.tsx
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  Calendar,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStatsQueryOptions } from "@/queries/dashboard";
import { ExpiryWarningsList } from "@/components/dashboard/expiry-warnings-list";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { MovementChart } from "@/components/dashboard/movement-chart";
import { formatNumber, formatPercentage } from "@/lib/number";

function DashboardContent() {
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Irányítópult</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Összes készlet
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.total_stock_kg, 0)} kg
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total_products} termék, {stats.total_batches} sarzs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Raktár kihasználtság
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(stats.occupancy_rate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.occupied_bins} / {stats.total_bins} tárolóhely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Lejárati figyelmeztetések
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.expiry_warnings.critical + stats.expiry_warnings.high}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.expiry_warnings.critical} kritikus, {stats.expiry_warnings.high} magas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Mai mozgások
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today_movements}</div>
            <p className="text-xs text-muted-foreground">
              {stats.today_receipts} bevételezés, {stats.today_issues} kiadás
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <OccupancyChart data={stats.warehouse_occupancy} />
        <MovementChart data={stats.movement_history} />
      </div>

      {/* Expiry Warnings */}
      <ExpiryWarningsList />
    </div>
  );
}

export function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## DOCUMENTATION

### Hungarian UI Text Constants

```typescript
// src/lib/i18n.ts
export const HU = {
  // Navigation
  nav: {
    dashboard: "Irányítópult",
    warehouses: "Raktárak",
    products: "Termékek",
    suppliers: "Beszállítók",
    bins: "Tárolóhelyek",
    inventory: "Készlet",
    receipt: "Bevételezés",
    issue: "Kiadás",
    transfers: "Áthelyezések",
    reservations: "Foglalások",
    reports: "Riportok",
    users: "Felhasználók",
    settings: "Beállítások",
    logout: "Kijelentkezés",
  },

  // Common actions
  actions: {
    create: "Létrehozás",
    edit: "Szerkesztés",
    delete: "Törlés",
    save: "Mentés",
    cancel: "Mégse",
    search: "Keresés",
    filter: "Szűrés",
    export: "Exportálás",
    import: "Importálás",
    refresh: "Frissítés",
    back: "Vissza",
    next: "Következő",
    previous: "Előző",
    confirm: "Megerősítés",
    close: "Bezárás",
  },

  // Status labels
  status: {
    active: "Aktív",
    inactive: "Inaktív",
    empty: "Üres",
    occupied: "Foglalt",
    reserved: "Lefoglalt",
    available: "Elérhető",
    expired: "Lejárt",
    scrapped: "Selejtezett",
    pending: "Függőben",
    completed: "Teljesített",
    cancelled: "Törölve",
  },

  // Role labels
  roles: {
    admin: "Adminisztrátor",
    manager: "Menedzser",
    warehouse: "Raktáros",
    viewer: "Megtekintő",
  },

  // Validation messages
  validation: {
    required: "Kötelező mező",
    minLength: "Minimum {min} karakter szükséges",
    maxLength: "Maximum {max} karakter engedélyezett",
    invalidEmail: "Érvénytelen email cím",
    invalidPhone: "Érvénytelen telefonszám",
    invalidTaxNumber: "Érvénytelen adószám formátum",
    invalidDate: "Érvénytelen dátum",
    futureDate: "A dátum nem lehet múltbeli",
    pastDate: "A dátum nem lehet jövőbeli",
    positiveNumber: "Pozitív szám szükséges",
    insufficientQuantity: "Nincs elegendő mennyiség",
  },

  // Success messages
  success: {
    created: "{entity} sikeresen létrehozva",
    updated: "{entity} sikeresen módosítva",
    deleted: "{entity} sikeresen törölve",
    received: "Termék sikeresen beérkeztetve",
    issued: "Termék sikeresen kiadva",
    transferred: "Áthelyezés sikeresen végrehajtva",
    reserved: "Foglalás sikeresen létrehozva",
    fulfilled: "Foglalás sikeresen teljesítve",
  },

  // Error messages
  errors: {
    generic: "Hiba történt. Kérjük, próbálja újra.",
    notFound: "Az elem nem található.",
    unauthorized: "Nincs jogosultsága ehhez a művelethez.",
    networkError: "Hálózati hiba. Ellenőrizze az internetkapcsolatot.",
    serverError: "Szerverhiba. Kérjük, próbálja újra később.",
    binNotEmpty: "A tárolóhely nem üres, nem törölhető.",
    binOccupied: "A tárolóhely már foglalt.",
    fefoViolation: "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető.",
    productHasInventory: "A termék nem törölhető, mert van belőle készlet.",
    supplierHasInventory: "A beszállító nem törölhető, mert van hozzá tartozó készlet.",
  },

  // Table headers
  table: {
    name: "Név",
    code: "Kód",
    sku: "SKU",
    category: "Kategória",
    unit: "Egység",
    quantity: "Mennyiség",
    weight: "Súly",
    status: "Státusz",
    warehouse: "Raktár",
    bin: "Tárolóhely",
    product: "Termék",
    supplier: "Beszállító",
    batch: "Sarzs",
    useByDate: "Lejárat",
    receivedDate: "Beérkezés",
    createdAt: "Létrehozva",
    updatedAt: "Módosítva",
    actions: "Műveletek",
  },

  // Units
  units: {
    db: "Darab",
    kg: "Kilogramm",
    l: "Liter",
    m: "Méter",
    csomag: "Csomag",
  },

  // Movement types
  movementTypes: {
    receipt: "Bevételezés",
    issue: "Kiadás",
    transfer: "Áthelyezés",
    adjustment: "Korrekció",
    scrap: "Selejtezés",
  },

  // Expiry urgency
  expiry: {
    critical: "Kritikus",
    high: "Magas",
    medium: "Közepes",
    low: "Alacsony",
    expired: "Lejárt",
  },
};
```

### File Structure

```text
frontend/
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── app-layout.tsx     # Main layout with sidebar
│   │   │   ├── sidebar.tsx        # Navigation sidebar
│   │   │   ├── header.tsx         # Top header with user menu
│   │   │   └── breadcrumb.tsx
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── protected-route.tsx
│   │   │   └── role-guard.tsx
│   │   ├── dashboard/
│   │   │   ├── kpi-card.tsx
│   │   │   ├── expiry-warnings-list.tsx
│   │   │   ├── occupancy-chart.tsx
│   │   │   └── movement-chart.tsx
│   │   ├── warehouses/
│   │   │   ├── warehouse-form.tsx
│   │   │   ├── warehouse-list.tsx
│   │   │   └── warehouse-card.tsx
│   │   ├── products/
│   │   │   ├── product-form.tsx
│   │   │   ├── product-list.tsx
│   │   │   └── product-select.tsx
│   │   ├── suppliers/
│   │   │   ├── supplier-form.tsx
│   │   │   ├── supplier-list.tsx
│   │   │   └── supplier-select.tsx
│   │   ├── bins/
│   │   │   ├── bin-form.tsx
│   │   │   ├── bin-list.tsx
│   │   │   ├── bin-bulk-form.tsx
│   │   │   ├── bin-status-badge.tsx
│   │   │   └── bin-grid-view.tsx  # 2D warehouse visualization
│   │   ├── inventory/
│   │   │   ├── receipt-form.tsx
│   │   │   ├── issue-form.tsx
│   │   │   ├── fefo-recommendation.tsx
│   │   │   ├── expiry-badge.tsx
│   │   │   ├── stock-table.tsx
│   │   │   └── movement-history.tsx
│   │   ├── transfers/
│   │   │   ├── transfer-form.tsx
│   │   │   ├── transfer-list.tsx
│   │   │   └── cross-warehouse-form.tsx
│   │   ├── reservations/
│   │   │   ├── reservation-form.tsx
│   │   │   ├── reservation-list.tsx
│   │   │   └── reservation-details.tsx
│   │   └── reports/
│   │       ├── stock-levels-report.tsx
│   │       ├── expiry-report.tsx
│   │       ├── movement-report.tsx
│   │       └── export-button.tsx
│   ├── pages/
│   │   ├── login.tsx
│   │   ├── dashboard.tsx
│   │   ├── warehouses/
│   │   │   ├── index.tsx          # List
│   │   │   ├── [id].tsx           # Detail/Edit
│   │   │   └── new.tsx            # Create
│   │   ├── products/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── suppliers/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── bins/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   ├── new.tsx
│   │   │   └── bulk.tsx           # Bulk generation
│   │   ├── inventory/
│   │   │   ├── index.tsx          # Stock overview
│   │   │   ├── receipt.tsx
│   │   │   ├── issue.tsx
│   │   │   └── expiry.tsx         # Expiry warnings
│   │   ├── transfers/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx
│   │   │   └── pending.tsx        # Cross-warehouse pending
│   │   ├── reservations/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── reports/
│   │   │   ├── index.tsx
│   │   │   ├── stock-levels.tsx
│   │   │   ├── expiry-timeline.tsx
│   │   │   └── movements.tsx
│   │   └── users/                 # Admin only
│   │       ├── index.tsx
│   │       └── [id].tsx
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
│   │   ├── auth-store.ts
│   │   ├── ui-store.ts            # Theme, sidebar state
│   │   └── filter-store.ts        # Persistent filters
│   ├── schemas/                   # Zod schemas
│   │   ├── auth.ts
│   │   ├── warehouse.ts
│   │   ├── product.ts
│   │   ├── supplier.ts
│   │   ├── bin.ts
│   │   ├── inventory.ts
│   │   ├── transfer.ts
│   │   └── reservation.ts
│   ├── types/                     # TypeScript types
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── models.ts
│   ├── lib/
│   │   ├── api-client.ts          # Axios instance
│   │   ├── query-client.ts        # TanStack Query config
│   │   ├── date.ts                # Date formatting
│   │   ├── number.ts              # Number formatting
│   │   ├── i18n.ts                # Hungarian translations
│   │   └── utils.ts               # cn() and helpers
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-toast.ts
│   │   └── use-debounce.ts
│   ├── App.tsx                    # Router setup
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Tailwind CSS
├── tests/
│   ├── setup.ts
│   ├── mocks/
│   │   ├── handlers.ts            # MSW handlers
│   │   └── server.ts              # MSW server
│   ├── components/
│   │   └── ...
│   └── e2e/
│       ├── auth.spec.ts
│       ├── inventory.spec.ts
│       └── ...
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── components.json                # shadcn/ui config
└── README.md
```

### Routes Configuration

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/query-client";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Toaster } from "@/components/ui/toaster";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import WarehouseList from "@/pages/warehouses";
import WarehouseDetail from "@/pages/warehouses/[id]";
import WarehouseNew from "@/pages/warehouses/new";
// ... other imports

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Master Data */}
            <Route path="/warehouses" element={<WarehouseList />} />
            <Route path="/warehouses/new" element={<WarehouseNew />} />
            <Route path="/warehouses/:id" element={<WarehouseDetail />} />

            <Route path="/products" element={<ProductList />} />
            <Route path="/products/new" element={<ProductNew />} />
            <Route path="/products/:id" element={<ProductDetail />} />

            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/suppliers/new" element={<SupplierNew />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />

            <Route path="/bins" element={<BinList />} />
            <Route path="/bins/new" element={<BinNew />} />
            <Route path="/bins/bulk" element={<BinBulk />} />
            <Route path="/bins/:id" element={<BinDetail />} />

            {/* Inventory Operations */}
            <Route path="/inventory" element={<InventoryOverview />} />
            <Route path="/inventory/receipt" element={<InventoryReceipt />} />
            <Route path="/inventory/issue" element={<InventoryIssue />} />
            <Route path="/inventory/expiry" element={<ExpiryWarnings />} />

            {/* Transfers */}
            <Route path="/transfers" element={<TransferList />} />
            <Route path="/transfers/new" element={<TransferNew />} />
            <Route path="/transfers/pending" element={<TransferPending />} />

            {/* Reservations */}
            <Route path="/reservations" element={<ReservationList />} />
            <Route path="/reservations/new" element={<ReservationNew />} />
            <Route path="/reservations/:id" element={<ReservationDetail />} />

            {/* Reports */}
            <Route path="/reports" element={<ReportsIndex />} />
            <Route path="/reports/stock-levels" element={<StockLevelsReport />} />
            <Route path="/reports/expiry" element={<ExpiryReport />} />
            <Route path="/reports/movements" element={<MovementsReport />} />

            {/* Admin only */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UserList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UserDetail />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## OTHER CONSIDERATIONS

### RBAC UI Enforcement

| Page/Feature | admin | manager | warehouse | viewer |
|--------------|-------|---------|-----------|--------|
| Dashboard | Full | Full | Full | Full |
| Warehouses CRUD | Full | Full | Read | Read |
| Products CRUD | Full | Full | Read | Read |
| Suppliers CRUD | Full | Full | Read | Read |
| Bins CRUD | Full | Full | Full | Read |
| Bins Bulk Generate | Full | Full | - | - |
| Inventory Receipt | Full | Full | Full | - |
| Inventory Issue (FEFO) | Full | Full | Full | - |
| Inventory Issue (Force) | Full | Full | - | - |
| Adjust/Scrap | Full | Full | - | - |
| Transfers (same WH) | Full | Full | Full | - |
| Transfers (cross WH) | Full | Full | - | - |
| Reservations Create | Full | Full | Full | - |
| Reservations Cancel | Full | Full | - | - |
| Reports View | Full | Full | Full | Full |
| Reports Export | Full | Full | Full | - |
| Users Management | Full | - | - | - |

### Responsive Breakpoints

```css
/* Tailwind v4 breakpoints */
@theme {
  --breakpoint-sm: 640px;   /* Mobile landscape */
  --breakpoint-md: 768px;   /* Tablet */
  --breakpoint-lg: 1024px;  /* Desktop */
  --breakpoint-xl: 1280px;  /* Large desktop */
  --breakpoint-2xl: 1536px; /* Extra large */
}
```

**Layout Strategy**:
- **Desktop (lg+)**: Fixed sidebar (240px), main content with padding
- **Tablet (md)**: Collapsible sidebar, drawer menu
- **Mobile (sm)**: Bottom navigation, hamburger menu

### Performance Optimizations

1. **Code Splitting**: Lazy load routes with `React.lazy()`
2. **Query Prefetching**: Prefetch on hover for navigation links
3. **Skeleton Loading**: Show skeletons during suspense
4. **Optimistic Updates**: Use `useOptimistic` for mutations
5. **Image Optimization**: Lazy load images, use WebP format
6. **Bundle Analysis**: Use `vite-plugin-visualizer`

### Error Handling Strategy

```typescript
// src/components/error-boundary.tsx
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-error mb-4" />
      <h2 className="text-xl font-semibold mb-2">Hiba történt</h2>
      <p className="text-muted-foreground mb-4">
        {error.message || "Ismeretlen hiba. Kérjük, próbálja újra."}
      </p>
      <Button onClick={resetErrorBoundary}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Újrapróbálás
      </Button>
    </div>
  );
}

export function QueryBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallback}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

### Testing Strategy

**Unit Tests (Vitest)**:
- Component rendering tests
- Hook tests (custom hooks)
- Utility function tests
- Schema validation tests

**Integration Tests**:
- Form submission flows
- API integration with MSW
- Authentication flows
- RBAC enforcement

**E2E Tests (Playwright)**:
- Full user journeys
- Cross-browser testing
- Visual regression tests

```typescript
// tests/e2e/inventory-receipt.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Inventory Receipt", () => {
  test.beforeEach(async ({ page }) => {
    // Login as warehouse user
    await page.goto("/login");
    await page.fill('[name="username"]', "warehouse");
    await page.fill('[name="password"]', "Warehouse123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");
  });

  test("should receive product into empty bin", async ({ page }) => {
    await page.goto("/inventory/receipt");

    // Fill form
    await page.selectOption('[name="warehouse_id"]', "budapest-central");
    await page.selectOption('[name="bin_id"]', "A-01-01-01");
    await page.selectOption('[name="product_id"]', "csirkemell");
    await page.selectOption('[name="supplier_id"]', "magyar-hus");
    await page.fill('[name="batch_number"]', "BATCH-2025-001");
    await page.fill('[name="quantity"]', "100");
    await page.fill('[name="use_by_date"]', "2025-06-30");

    // Submit
    await page.click('button:has-text("Bevételezés")');

    // Verify success
    await expect(page.getByText("Termék sikeresen beérkeztetve")).toBeVisible();
  });
});
```

### Implementation Milestones

**Milestone 1: Foundation (Week 1)**
- [ ] Project setup (Vite + React 19 + TypeScript)
- [ ] Tailwind CSS v4 configuration with theme
- [ ] shadcn/ui initialization and base components
- [ ] API client with interceptors
- [ ] Auth store and protected routes
- [ ] Login page

**Milestone 2: Layout & Navigation (Week 2)**
- [ ] App layout with sidebar
- [ ] Navigation menu with Hungarian labels
- [ ] Breadcrumb component
- [ ] Dark mode toggle
- [ ] Responsive design

**Milestone 3: Dashboard (Week 2-3)**
- [ ] KPI cards
- [ ] Occupancy chart
- [ ] Movement history chart
- [ ] Expiry warnings list
- [ ] Quick actions

**Milestone 4: Master Data CRUD (Week 3-4)**
- [ ] Warehouses list/form
- [ ] Products list/form
- [ ] Suppliers list/form
- [ ] Bins list/form
- [ ] Bulk bin generation

**Milestone 5: Inventory Operations (Week 4-5)**
- [ ] Receipt form with validation
- [ ] Issue form with FEFO recommendation
- [ ] Stock overview table
- [ ] Expiry warnings page
- [ ] Movement history

**Milestone 6: Advanced Features (Week 5-6)**
- [ ] Same-warehouse transfers
- [ ] Cross-warehouse transfers
- [ ] Reservations CRUD
- [ ] Reservation fulfillment

**Milestone 7: Reports & Polish (Week 6-7)**
- [ ] Stock levels report
- [ ] Expiry timeline report
- [ ] Movements report
- [ ] Export functionality (CSV/Excel)
- [ ] User management (admin)

**Milestone 8: Testing & Documentation (Week 7-8)**
- [ ] Unit tests for components
- [ ] Integration tests with MSW
- [ ] E2E tests with Playwright
- [ ] README documentation
- [ ] Performance optimization

### Environment Variables

```bash
# .env.local (frontend)
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=WMS - Raktárkezelő Rendszer
VITE_DEFAULT_LOCALE=hu
VITE_DEFAULT_TIMEZONE=Europe/Budapest
```

### Docker Integration

```dockerfile
# frontend/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# Add to docker-compose.yml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: wms_frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - wms_network
```

### Deprecated Patterns (DO NOT USE)

```typescript
// ❌ DEPRECATED - React 18 patterns
import { useFormState } from "react-dom";  // ❌ Use useActionState
const [state, formAction] = useFormState(action);

// ❌ DEPRECATED - Tailwind v3 syntax
@tailwind base;       // ❌ Use @import "tailwindcss"
@tailwind components; // ❌ Not needed in v4
@tailwind utilities;  // ❌ Not needed in v4

// tailwind.config.js // ❌ Use @theme in CSS instead

// ❌ DEPRECATED - React Query v4 patterns
import { useQuery } from "@tanstack/react-query";
useQuery(["products"], fetchProducts);  // ❌ Use queryOptions pattern

// ❌ DEPRECATED - forwardRef in React 19
const MyComponent = React.forwardRef((props, ref) => {});  // ❌ Use ref prop directly

// ❌ DEPRECATED - tailwindcss-animate
require("tailwindcss-animate");  // ❌ Deprecated in March 2025
```

### Future Enhancements (Phase 6+)

- **Barcode Scanner Integration** - Camera-based scanning for mobile
- **Print Labels** - Generate and print pallet labels
- **Notifications** - Real-time WebSocket notifications
- **Offline Support** - PWA with service worker
- **Multi-language** - Add English support
- **Advanced Analytics** - AI-driven insights and predictions
- **Mobile App** - React Native companion app
- **Voice Commands** - Voice-directed picking

## REFERENCES

### React 19
- [React v19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [New Hooks: useActionState, useFormStatus, useOptimistic](https://www.manuelsanchezdev.com/blog/react-19-new-hooks-useoptimistic-useformstatus-useactionstate)

### Tailwind CSS v4
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Theme Variables Documentation](https://tailwindcss.com/docs/theme)
- [CSS-First Configuration Guide](https://rozsazoltan.vercel.app/blog/2025-05-25-tailwind-css-v4-css-first-configuration)

### shadcn/ui
- [Tailwind v4 Setup Guide](https://ui.shadcn.com/docs/tailwind-v4)
- [React 19 Compatibility](https://github.com/shadcn-ui/ui/discussions/6714)

### TanStack Query v5
- [useSuspenseQuery Documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useSuspenseQuery)
- [queryOptions Pattern](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)

### Zustand
- [Zustand GitHub Repository](https://github.com/pmndrs/zustand)
- [Modern React State Management 2025](https://dev.to/joodi/modern-react-state-management-in-2025-a-practical-guide-2j8f)
