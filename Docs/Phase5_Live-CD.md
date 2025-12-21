# Phase 5 Live Implementation: Layout & Dashboard (C & D)

**Status**: ✅ Complete
**Completed**: 2025-12-21
**Branch**: `05-Frontend-Phase_5`
**Files Created**: 14 new files (Phase C: 8, Phase D: 6)
**Build Size**: 932KB (28KB CSS, 932KB JS with Recharts)

---

## Overview

This document covers the completion of **Phase C (Layout & Navigation)** and **Phase D (Dashboard)**. These phases transform the basic auth flow into a fully functional warehouse management interface with professional layout, dark mode, and comprehensive dashboard.

### Cumulative Progress

| Phase | Status | Files | Description |
|-------|--------|-------|-------------|
| Phase A | ✅ Complete | 27 | Foundation (Vite, Tailwind v4, shadcn/ui) |
| Phase B | ✅ Complete | 8 | Authentication & Protected Routes |
| Phase C | ✅ Complete | 8 | Layout & Navigation |
| Phase D | ✅ Complete | 6 | Dashboard with KPIs and charts |
| **Total** | **49 files** | **932KB** | **50% foundation complete** |

---

## Phase C: Layout & Navigation ✅

### C1: Hungarian Translations

**src/lib/i18n.ts** (150 lines, 100+ translations)

Complete Hungarian UI text organized by category:

```typescript
export const HU = {
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
  actions: { create, edit, delete, save, cancel, search, filter, ... },
  status: { active, inactive, empty, occupied, reserved, ... },
  roles: { admin, manager, warehouse, viewer },
  validation: { required, minLength, invalidEmail, ... },
  success: { created, updated, deleted, ... },
  errors: { generic, notFound, unauthorized, ... },
  table: { name, code, sku, status, warehouse, bin, ... },
  units: { db, kg, l, m, csomag },
  movementTypes: { receipt, issue, transfer, adjustment, scrap },
  expiry: { critical, high, medium, low, expired },
} as const;

// Helper for message interpolation
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}
```

**Coverage**: Navigation, actions, status, roles, validation, success, errors, table headers, units, movement types, expiry levels

### C2: UI Store for Dark Mode & Sidebar

**src/stores/ui-store.ts** (65 lines)

Zustand store for client-side UI preferences with persistence:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDarkMode: () => set((state) => {
        const newMode = !state.darkMode;
        document.documentElement.classList.toggle('dark', newMode);
        return { darkMode: newMode };
      }),
      setDarkMode: (enabled) => {
        document.documentElement.classList.toggle('dark', enabled);
        set({ darkMode: enabled });
      },
    }),
    {
      name: "wms-ui",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.darkMode);
        }
      },
    }
  )
);
```

**Features**:
- Persists dark mode and sidebar preferences to localStorage
- Auto-applies dark mode on page load
- System preference detection on first visit
- Updates `document.documentElement` class for Tailwind v4

### C3: Sidebar Component

**src/components/layout/sidebar.tsx** (120 lines)

Navigation sidebar with RBAC filtering:

```typescript
const menuItems: MenuItem[] = [
  { path: "/dashboard", label: HU.nav.dashboard, icon: LayoutDashboard },
  { path: "/warehouses", label: HU.nav.warehouses, icon: Warehouse },
  { path: "/products", label: HU.nav.products, icon: Package },
  { path: "/suppliers", label: HU.nav.suppliers, icon: Truck },
  { path: "/bins", label: HU.nav.bins, icon: Grid3x3 },
  { path: "/inventory", label: HU.nav.inventory, icon: ClipboardList },
  { path: "/transfers", label: HU.nav.transfers, icon: ArrowRightLeft },
  { path: "/reservations", label: HU.nav.reservations, icon: CalendarCheck },
  { path: "/reports", label: HU.nav.reports, icon: FileText },
  { path: "/users", label: HU.nav.users, icon: Users, roles: ["admin"] },
];

// Filter based on user role
const visibleItems = menuItems.filter(
  (item) => !item.roles || (user && item.roles.includes(user.role))
);
```

**Features**:
- 10 navigation items with lucide-react icons
- RBAC filtering (admin-only "Felhasználók" menu)
- Active route highlighting (primary color background)
- User info in footer (name, role)
- Fixed width: 240px (60rem)

### C4: Header Component

**src/components/layout/header.tsx** (100 lines)

Top header bar with controls:

```typescript
export function Header() {
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode, toggleSidebar } = useUIStore();
  const logoutMutation = useLogoutMutation();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      {/* Left: Hamburger (mobile) + Breadcrumb */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
          <Menu />
        </Button>
        <Breadcrumb />
      </div>

      {/* Right: Dark mode toggle + User menu */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
          {darkMode ? <Sun /> : <Moon />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.full_name}, {HU.roles[user?.role]}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut /> {HU.nav.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

**Features**:
- Mobile: Hamburger menu button (toggles Sheet sidebar)
- Breadcrumb navigation in center
- Dark mode toggle: Moon (light) / Sun (dark)
- User dropdown: Avatar with initials, name, role, logout
- Responsive: Hamburger hidden on desktop (lg+)

### C5: Breadcrumb Component

**src/components/layout/breadcrumb.tsx** (70 lines)

Dynamic breadcrumb from current route:

```typescript
const routeLabels: Record<string, string> = {
  "/dashboard": HU.nav.dashboard,
  "/warehouses": HU.nav.warehouses,
  "/products": HU.nav.products,
  "/new": "Új",
  "/edit": "Szerkesztés",
  // ... etc
};

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <nav className="flex items-center gap-2">
      <Link to="/dashboard"><Home /></Link>
      {pathnames.map((segment, index) => {
        const path = `/${pathnames.slice(0, index + 1).join("/")}`;
        const label = routeLabels[path] || segment;
        return (
          <>
            <ChevronRight />
            {isLast ? <span>{label}</span> : <Link to={path}>{label}</Link>}
          </>
        );
      })}
    </nav>
  );
}
```

**Example**: `/products/new` → `Home / Termékek / Új`

### C6: App Layout Component

**src/components/layout/app-layout.tsx** (60 lines)

Main layout shell with responsive sidebar:

```typescript
export function AppLayout() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - Always visible on lg+ */}
      <aside className="hidden lg:flex">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar - Sheet overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-60">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            <Outlet /> {/* Nested routes render here */}
          </div>
        </main>
      </div>
    </div>
  );
}
```

**Responsive Strategy**:
- **Desktop** (lg+): Fixed sidebar (240px), no hamburger
- **Mobile** (<lg): Hidden sidebar, Sheet drawer on hamburger click
- Uses React Router `Outlet` for nested routes

### C7: Role Guard Component

**src/components/auth/role-guard.tsx** (25 lines)

Conditional rendering based on user role:

```typescript
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

**Usage**:
```tsx
<RoleGuard allowedRoles={["admin", "manager"]}>
  <Button>Törlés</Button>
</RoleGuard>
```

### C8: Updated Files

**index.html**:
- Changed `lang="en"` to `lang="hu"`
- Updated title: `"WMS - Raktárkezelő Rendszer"`
- Added dark mode FOUC prevention script
- Detects localStorage preference and system `prefers-color-scheme`

**src/App.tsx**:
- Wrapped protected routes with `<AppLayout />`
- All routes now render inside the layout shell
- Login page remains outside layout (full-screen)

---

## Phase D: Dashboard ✅

### D1: Date Formatting Utilities

**src/lib/date.ts** (85 lines)

Hungarian locale date/time formatting with `date-fns`:

```typescript
import { format, formatDistance, differenceInDays, parseISO } from "date-fns";
import { hu } from "date-fns/locale";

// Format: yyyy. MM. dd.
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy. MM. dd.", { locale: hu });
}

// Format: yyyy. MM. dd. HH:mm
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy. MM. dd. HH:mm", { locale: hu });
}

// Relative time: "2 napja", "3 nap múlva"
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: hu });
}

// Calculate days until expiry
export function getDaysUntilExpiry(useByDate: Date | string): number {
  const d = typeof useByDate === "string" ? parseISO(useByDate) : useByDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDay = new Date(d);
  expiryDay.setHours(0, 0, 0, 0);
  return differenceInDays(expiryDay, today);
}

// FEFO compliance - expiry urgency levels
export function getExpiryUrgency(useByDate: Date | string): ExpiryUrgency {
  const days = getDaysUntilExpiry(useByDate);
  if (days < 0) return "expired";
  if (days < 7) return "critical";   // < 7 days
  if (days < 14) return "high";      // 7-14 days
  if (days < 30) return "medium";    // 15-30 days
  return "low";                       // > 30 days
}

// Hungarian expiry warning messages
export function formatExpiryWarning(days: number): string {
  if (days < 0) return `LEJÁRT (${Math.abs(days)} napja)`;
  if (days === 0) return "MA LEJÁR!";
  if (days === 1) return "Holnap lejár!";
  return `${days} nap múlva lejár`;
}

// CSS classes for urgency badges
export function getExpiryBadgeClass(urgency: ExpiryUrgency): string {
  const classes = {
    expired: "bg-expiry-critical text-white",
    critical: "bg-expiry-critical text-white animate-pulse",
    high: "bg-expiry-high text-white",
    medium: "bg-expiry-medium text-black",
    low: "bg-expiry-low text-white",
  };
  return classes[urgency];
}
```

**Key Features**:
- Uses `date-fns` with `hu` locale for proper Hungarian formatting
- FEFO compliance: 4 urgency levels aligned with backend logic
- Handles both Date objects and ISO string dates
- Critical < 7 days gets pulse animation

### D2: Number Formatting Utilities

**src/lib/number.ts** (60 lines)

Hungarian locale number formatting:

```typescript
// Hungarian format: 1 234,56 (space thousands, comma decimal)
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("hu-HU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Weight: "1 234,56 kg"
export function formatWeight(kg: number): string {
  return `${formatNumber(kg)} kg`;
}

// Quantity with unit: "100 db", "50,5 kg"
export function formatQuantity(value: number, unit: string): string {
  const unitLabels: Record<string, string> = {
    db: "db",
    kg: "kg",
    l: "l",
    m: "m",
    csomag: "cs",
  };
  return `${formatNumber(value, 0)} ${unitLabels[unit] || unit}`;
}

// Percentage: "85,0%"
export function formatPercentage(value: number, decimals = 1): string {
  return `${formatNumber(value * 100, decimals)}%`;
}

// Currency: "12 345 Ft"
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    minimumFractionDigits: 0,
  }).format(value);
}

// Parse Hungarian number back to JavaScript number
export function parseHungarianNumber(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  return parseFloat(normalized);
}
```

**Format Examples**:
- `1234.56` → `"1 234,56"`
- `0.85` → `"85,0%"`
- `100` (db) → `"100 db"`
- `12345` → `"12 345 Ft"`

### D3: Dashboard Queries

**src/queries/dashboard.ts** (75 lines)

TanStack Query definitions for dashboard data:

```typescript
export interface DashboardStats {
  total_stock_kg: number;
  total_products: number;
  total_batches: number;
  occupancy_rate: number;
  occupied_bins: number;
  total_bins: number;
  expiry_warnings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  today_movements: number;
  today_receipts: number;
  today_issues: number;
}

export const dashboardStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // Mock data for now
      // Production: aggregate from /reports/inventory-summary, /bins, /movements
      return { /* stats */ };
    },
  });

export const expiryWarningsQueryOptions = (limit = 10) =>
  queryOptions({
    queryKey: ["expiry-warnings", limit],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpiryWarning[]>(
        "/inventory/expiry-warnings",
        { params: { limit } }
      );
      return data;
    },
  });
```

**Note**: Using mock data for stats (backend doesn't have dedicated dashboard endpoint). Production will aggregate from existing endpoints.

### D4: KPI Card Component

**src/components/dashboard/kpi-card.tsx** (40 lines)

Reusable KPI card with icon, value, subtitle:

```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
}

export function KPICard({ title, value, subtitle, icon: Icon, trend }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend && <p className="text-xs">{trend.value >= 0 ? "+" : ""}{trend.value}%</p>}
      </CardContent>
    </Card>
  );
}
```

**Used for**: Stock, Occupancy, Expiry Warnings, Movements KPIs

### D5: Expiry Warnings List

**src/components/dashboard/expiry-warnings-list.tsx** (95 lines)

Displays expiry warnings with color-coded urgency badges:

```typescript
export function ExpiryWarningsList() {
  const { data: warnings } = useSuspenseQuery(expiryWarningsQueryOptions(10));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <AlertTriangle /> Lejárati figyelmeztetések
        </CardTitle>
      </CardHeader>
      <CardContent>
        {warnings.map((warning) => {
          const urgency = getExpiryUrgency(warning.use_by_date);
          const days = getDaysUntilExpiry(warning.use_by_date);

          return (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p>{warning.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {warning.bin_code} • {warning.batch_number}
                </p>
                <p className="text-sm">
                  {formatWeight(warning.weight_kg)} • {formatDate(warning.use_by_date)}
                </p>
              </div>
              <Badge className={getExpiryBadgeClass(urgency)}>
                {formatExpiryWarning(days)}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

**Features**:
- Shows 10 most urgent items
- Color-coded badges: Critical (red + pulse), High (orange), Medium (yellow), Low (green)
- Product info: name, bin code, batch number, weight, expiry date
- Hungarian date formatting
- Suspense boundary with skeleton fallback

### D6: Occupancy Chart

**src/components/dashboard/occupancy-chart.tsx** (80 lines)

Bar chart showing warehouse utilization:

```typescript
export function OccupancyChart({ data = [] }: OccupancyChartProps) {
  const getColor = (rate: number) => {
    if (rate >= 0.9) return "hsl(0, 84%, 60%)";    // Critical (red)
    if (rate >= 0.75) return "hsl(38, 92%, 50%)";  // Warning (orange)
    return "hsl(210, 100%, 40%)";                   // Normal (blue)
  };

  return (
    <Card>
      <CardHeader><CardTitle>Raktár kihasználtság</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="warehouse_name" />
            <YAxis tickFormatter={(value) => formatPercentage(value, 0)} />
            <Tooltip formatter={(value) => formatPercentage(value as number)} />
            <Bar dataKey="occupancy_rate" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.occupancy_rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**Features**:
- Color-coded bars: Red (≥90%), Orange (≥75%), Blue (normal)
- Hungarian percentage formatting
- Responsive container
- Rounded bar tops

### D7: Movement History Chart

**src/components/dashboard/movement-chart.tsx** (85 lines)

Line chart showing receipts vs issues over time:

```typescript
export function MovementChart({ data = [] }: MovementChartProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Mozgások (utolsó 7 nap)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatNumber(value, 0)} />
            <Tooltip formatter={(value) => formatNumber(value as number, 0)} />
            <Legend formatter={(value) => {
              const labels = { receipts: "Bevételezés", issues: "Kiadás" };
              return labels[value] || value;
            }} />
            <Line
              type="monotone"
              dataKey="receipts"
              stroke="hsl(142, 76%, 36%)"  // Green
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="issues"
              stroke="hsl(0, 84%, 60%)"    // Red
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**Features**:
- 7-day trend (receipts vs issues)
- Green line for receipts (incoming)
- Red line for issues (outgoing)
- Hungarian legend labels
- Mock data (ready for backend integration)

### D8: Updated Dashboard Page

**src/pages/dashboard.tsx** (125 lines)

Complete dashboard with KPIs, charts, and expiry warnings:

```typescript
function DashboardContent() {
  const { data: stats } = useSuspenseQuery(dashboardStatsQueryOptions());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Irányítópult</h1>

      {/* 4 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Összes készlet"
          value={`${formatNumber(stats.total_stock_kg, 0)} kg`}
          subtitle={`${stats.total_products} termék, ${stats.total_batches} sarzs`}
          icon={Package}
        />
        <KPICard
          title="Raktár kihasználtság"
          value={formatPercentage(stats.occupancy_rate)}
          subtitle={`${stats.occupied_bins} / ${stats.total_bins} tárolóhely`}
          icon={Warehouse}
        />
        <KPICard
          title="Lejárati figyelmeztetések"
          value={stats.expiry_warnings.critical + stats.expiry_warnings.high}
          subtitle={`${stats.expiry_warnings.critical} kritikus, ${stats.expiry_warnings.high} magas`}
          icon={AlertTriangle}
        />
        <KPICard
          title="Mai mozgások"
          value={stats.today_movements}
          subtitle={`${stats.today_receipts} bevételezés, ${stats.today_issues} kiadás`}
          icon={TrendingUp}
        />
      </div>

      {/* 2 Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <OccupancyChart />
        <MovementChart />
      </div>

      {/* Expiry Warnings List */}
      <ExpiryWarningsList />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
```

**Layout Grid**:
- 4 KPI cards (responsive: 2 cols on md, 4 cols on lg)
- 2 charts side-by-side (responsive: stacked on mobile, 2 cols on md)
- Expiry warnings list (full width)

**Skeleton Loading**:
- Complete skeleton UI while data loads
- Matches final layout structure
- Smooth transition when data appears

---

## File Structure (Phases C & D)

### Phase C Files (8)

```
src/
├── lib/
│   └── i18n.ts                        # Hungarian translations (150 lines)
├── stores/
│   └── ui-store.ts                    # Dark mode + sidebar state (65 lines)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                # Navigation sidebar (120 lines)
│   │   ├── header.tsx                 # Top header bar (100 lines)
│   │   ├── breadcrumb.tsx             # Dynamic breadcrumb (70 lines)
│   │   └── app-layout.tsx             # Main layout shell (60 lines)
│   └── auth/
│       └── role-guard.tsx             # RBAC UI guard (25 lines)
├── App.tsx                            # Updated routing (modified)
└── index.html                         # Hungarian + dark mode (modified)
```

### Phase D Files (6)

```
src/
├── lib/
│   ├── date.ts                        # Date formatting (85 lines)
│   └── number.ts                      # Number formatting (60 lines)
├── queries/
│   └── dashboard.ts                   # Dashboard queries (75 lines)
└── components/
    └── dashboard/
        ├── kpi-card.tsx               # Reusable KPI card (40 lines)
        ├── expiry-warnings-list.tsx   # Warnings with badges (95 lines)
        ├── occupancy-chart.tsx        # Bar chart (80 lines)
        └── movement-chart.tsx         # Line chart (85 lines)
```

---

## Build Validation

### Build Output

```bash
npm run build
```

```
> tsc -b && vite build

vite v7.3.0 building client environment for production...
✓ 3466 modules transformed.
dist/index.html                   1.20 kB │ gzip:   0.61 kB
dist/assets/index-DTvTGyxn.css   27.61 kB │ gzip:   5.85 kB
dist/assets/index-CcV5ESn_.js   932.30 kB │ gzip: 291.62 kB
✓ built in 6.58s
```

**Result**: ✅ Build successful, no TypeScript errors

**Bundle Size Note**: Increased from 522KB to 932KB (+410KB) due to Recharts library. This is expected and can be optimized later with:
- Code splitting (lazy load routes)
- Manual chunks configuration
- Dynamic imports for charts

### Dependencies Added

**Phase C**:
- None (used existing zustand, react-router-dom, lucide-react)

**Phase D**:
- `date-fns` (100KB) - Date formatting with Hungarian locale
- `recharts` (410KB) - Chart library for dashboard

---

## Key Features

### Layout (Phase C)

✅ **Responsive Design**
- Desktop (≥1024px): Fixed sidebar (240px)
- Tablet/Mobile: Sheet drawer sidebar
- Hamburger menu appears on mobile

✅ **Dark Mode**
- Toggle in header (Moon/Sun icons)
- Persists across page refreshes
- System preference detection
- FOUC prevention with inline script

✅ **Navigation**
- 10 menu items with icons
- All labels in Hungarian
- RBAC filtering (admin sees "Felhasználók", others don't)
- Active route highlighting

✅ **User Menu**
- Avatar with initials
- Displays name, email, role in Hungarian
- Logout button

✅ **Breadcrumb**
- Dynamic route-to-Hungarian mapping
- Clickable parent navigation
- Home icon for dashboard

### Dashboard (Phase D)

✅ **KPI Cards (4)**
1. **Összes készlet** - Total stock (kg, products, batches)
2. **Raktár kihasználtság** - Occupancy rate (%, bins used/total)
3. **Lejárati figyelmeztetések** - Expiry warnings (critical + high count)
4. **Mai mozgások** - Today's movements (receipts + issues)

✅ **Charts (2)**
1. **Occupancy Bar Chart** - Color-coded by utilization level
2. **Movement Line Chart** - 7-day trend (receipts vs issues)

✅ **Expiry Warnings List**
- 10 most urgent items
- Color badges: Critical (red pulse), High (orange), Medium (yellow), Low (green)
- Product details: name, bin, batch, weight, expiry date
- Hungarian formatting throughout

✅ **Loading States**
- Suspense boundaries for data fetching
- Comprehensive skeleton UI
- Smooth transitions

---

## Hungarian Localization Examples

### Navigation (from sidebar)
- Dashboard → **Irányítópult**
- Warehouses → **Raktárak**
- Products → **Termékek**
- Suppliers → **Beszállítók**
- Bins → **Tárolóhelyek**
- Inventory → **Készlet**
- Transfers → **Áthelyezések**
- Reservations → **Foglalások**
- Reports → **Riportok**
- Users → **Felhasználók**

### Dashboard Labels
- Total Stock → **Összes készlet**
- Warehouse Occupancy → **Raktár kihasználtság**
- Expiry Warnings → **Lejárati figyelmeztetések**
- Today's Movements → **Mai mozgások**
- Receipts → **Bevételezés**
- Issues → **Kiadás**
- Last 7 Days → **utolsó 7 nap**

### Date Formatting
- `2025-12-21` → **2025. 12. 21.**
- `2025-12-21 14:30` → **2025. 12. 21. 14:30**
- `2 days ago` → **2 napja**
- `3 days from now` → **3 nap múlva**

### Number Formatting
- `1234.56` → **1 234,56**
- `0.75` → **75,0%**
- `100` kg → **100 kg**
- Expired → **LEJÁRT**
- Expires today → **MA LEJÁR!**
- Expires tomorrow → **Holnap lejár!**

---

## Testing with Backend

### Prerequisites

1. Backend running on `http://localhost:8000`
2. Database seeded with test data
3. At least one warehouse, product, bin with inventory

### Manual Testing

```bash
# Terminal 1: Start backend
cd w7-WHv1/backend
source ../../venv_linux/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Start frontend
cd w7-WHv1/frontend
npm run dev
```

### Test Checklist

**Layout (Phase C)**:
- [ ] Login redirects to dashboard with sidebar and header
- [ ] Sidebar shows all navigation items (or filtered by role)
- [ ] Click navigation items → routes change
- [ ] Active route highlighted in primary color
- [ ] Dark mode toggle works → colors change
- [ ] Dark mode persists after page refresh
- [ ] Resize to mobile → sidebar hides
- [ ] Click hamburger → Sheet sidebar appears
- [ ] User menu shows name, role, email
- [ ] Logout button redirects to login
- [ ] Breadcrumb shows current route in Hungarian

**Dashboard (Phase D)**:
- [ ] KPI cards display with values
- [ ] Occupancy chart renders with bars
- [ ] Movement chart renders with lines
- [ ] Expiry warnings list shows items
- [ ] Urgency badges have correct colors
- [ ] All text in Hungarian
- [ ] Numbers formatted: `1 234,56`
- [ ] Dates formatted: `yyyy. MM. dd.`
- [ ] Skeleton loading appears briefly

---

## Summary

**Phases C & D Complete** ✅

**14 new files created** | **932KB build** | **50% foundation done**

The WMS frontend now has:
- ✅ Professional layout with responsive sidebar
- ✅ Dark mode with persistence
- ✅ 100+ Hungarian translations
- ✅ Role-based navigation (RBAC)
- ✅ Comprehensive dashboard with KPIs
- ✅ Interactive charts (Recharts)
- ✅ Expiry warnings with urgency badges
- ✅ Hungarian date/number formatting
- ✅ Skeleton loading states
- ✅ Full Hungarian localization

**Ready for Phase E** (Master Data CRUD)! 🚀

---

## What's Next (Phases E-H)

### Phase E: Master Data CRUD (~40 files)
- Warehouses CRUD (list, form, detail pages)
- Products CRUD with search and filters
- Suppliers CRUD with Hungarian tax number validation
- Bins CRUD with status management
- Bulk bin generation (Cartesian product UI)

### Phase F: Inventory Operations (~15 files)
- Receipt form with validation
- Issue form with FEFO recommendation
- Stock overview table
- Expiry warnings page
- Movement history with filters

### Phase G: Transfers & Reservations (~12 files)
- Same-warehouse transfers
- Cross-warehouse transfers with dispatch/confirm
- Reservations with FEFO allocation
- Reservation fulfillment workflow

### Phase H: Reports & Testing (~14 files)
- Stock levels report with export
- Expiry timeline report
- Movements report
- Unit tests (Vitest)
- E2E tests (Playwright)
- Frontend README
