# WMS Frontend - React 19 + Tailwind CSS v4 + shadcn/ui

Modern warehouse management system frontend with FEFO compliance for food products.

## Technology Stack (December 2025)

| Component | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.0+ | UI framework with useActionState, useOptimistic hooks |
| **TypeScript** | 5.7+ | Type safety in strict mode |
| **Vite** | 6.0+ | Build tool with @tailwindcss/vite plugin |
| **Tailwind CSS** | 4.0+ | CSS-first config with @theme directive |
| **shadcn/ui** | canary | Component library for React 19 + Tailwind v4 |
| **TanStack Query** | 5.90+ | Server state with queryOptions pattern |
| **Zustand** | 5.x | Client state (auth, UI preferences) |
| **React Hook Form** | 7.54+ | Form state management |
| **Zod** | 3.24+ | Schema validation |
| **date-fns** | 4.1+ | Hungarian locale date formatting |
| **Recharts** | 2.15+ | Charts for dashboard |
| **lucide-react** | 0.460+ | Icon library |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

**Backend**: Ensure backend is running on `http://localhost:8000`

**Default credentials**:
- Username: `admin`
- Password: `Admin123!`

The frontend proxies `/api/*` requests to `http://localhost:8000` (configured in `vite.config.ts`).

## Features

### Authentication & Authorization
- Login with JWT token refresh (15 min access, 7 day refresh)
- Protected routes with RBAC
- Role-based menus (admin, manager, warehouse, viewer)
- Automatic token refresh on 401 errors

### Dashboard
- 4 KPI cards (stock, occupancy, warnings, movements)
- Occupancy chart (bar chart, color-coded)
- Movement history chart (line chart, 7-day trend)
- Expiry warnings list with urgency badges

### Master Data CRUD
- **Warehouses**: Name, code, address management
- **Products**: SKU, category, 5 units (Darab, Kilogramm, Liter, Méter, Csomag)
- **Suppliers**: Hungarian tax number validation (`12345678-2-42`)
- **Bins**: Status badges, warehouse filtering, **bulk generation** (Cartesian product)

### Inventory Operations (FEFO Compliant)
- **Receipt**: Receive goods with batch tracking and expiry dates
- **Issue**: Issue goods with FEFO recommendation (oldest expiry first)
- **FEFO Visualization**: Ordered picking list with urgency badges
- **Stock Overview**: Current inventory with filters
- **Expiry Warnings**: Critical/high/medium/low alerts
- **Movement History**: Immutable audit trail

### Transfers & Reservations
- Same-warehouse transfers
- Cross-warehouse transfers (pending → dispatched → completed)
- Stock reservations with FEFO allocation

### Reports
- **Stock Levels**: Filterable with CSV export
- **Expiry Timeline**: Grouped by urgency
- **Movements**: Date range filter with CSV export

### UI/UX
- **Hungarian localization**: 100+ translations, all UI in Hungarian
- **Dark mode**: Toggle with persistence
- **Responsive**: Desktop (fixed sidebar) + Mobile (drawer)
- **Loading states**: Skeleton UI and Suspense boundaries
- **Toast notifications**: Success/error messages in Hungarian

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # 18 shadcn/ui components
│   │   ├── auth/                  # Login, protected routes, role guard
│   │   ├── layout/                # Sidebar, header, breadcrumb, app layout
│   │   ├── dashboard/             # KPIs, charts, expiry warnings
│   │   ├── shared/                # Search, delete dialog
│   │   ├── warehouses/            # Warehouse form & list
│   │   ├── products/              # Product form, list, select
│   │   ├── suppliers/             # Supplier form, list, select
│   │   ├── bins/                  # Bin form, list, status badge, bulk, select
│   │   ├── inventory/             # Receipt, issue, FEFO, stock, movement history
│   │   ├── transfers/             # Transfer list
│   │   └── reservations/          # Reservation list
│   ├── pages/                     # 21 route pages
│   ├── queries/                   # TanStack Query definitions (10 files)
│   ├── stores/                    # Zustand stores (auth, ui)
│   ├── schemas/                   # Zod validation (8 files)
│   ├── types/                     # TypeScript types
│   ├── lib/                       # Utilities (api-client, date, number, i18n, export)
│   ├── hooks/                     # Custom hooks
│   ├── App.tsx                    # Routing (21 routes)
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Tailwind v4 with @theme
├── public/
├── index.html                     # Hungarian lang, dark mode script
├── package.json
├── tsconfig.json
├── vite.config.ts                 # Vite + Tailwind + path aliases
├── components.json                # shadcn/ui config
└── README.md                      # This file
```

## Development

### Available Scripts

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Code Style

- **TypeScript strict mode** enabled
- **Hungarian UI text**: All user-facing text from `src/lib/i18n.ts`
- **Date format**: `yyyy. MM. dd.` (e.g., `2025. 12. 21.`)
- **Number format**: `1 234,56` (space thousands, comma decimal)
- **Component naming**: PascalCase, descriptive names
- **File organization**: Feature-based (products/, bins/, inventory/)

## Key Concepts

### FEFO Compliance

**First Expired, First Out** - Critical for food safety:
- Issue operations show FEFO recommendation
- Bins ordered by: `use_by_date ASC, batch_number ASC`
- Manager can override with documented reason
- Expiry urgency color coding:
  - **Critical** (<7 days): Red with pulse
  - **High** (7-14 days): Orange
  - **Medium** (15-30 days): Yellow
  - **Low** (>30 days): Green

### RBAC (Role-Based Access Control)

| Role | Permissions |
|------|-------------|
| **Admin** | Full access including user management |
| **Manager** | CRUD operations, FEFO override, adjustments |
| **Warehouse** | Receipt, issue (FEFO only), same-warehouse transfers |
| **Viewer** | Read-only access |

Enforced via:
- `<ProtectedRoute allowedRoles={...}>` for pages
- `<RoleGuard allowedRoles={...}>` for UI elements

### Bulk Bin Generation

Cartesian product algorithm for mass bin creation:
- Input: Aisles (A-C), Racks (1-10), Levels (1-5), Positions (1-4)
- Calculation: 3 × 10 × 5 × 4 = **600 bins**
- Preview: Shows first 20 bins before creation
- Format: `A-01-01-01`, `A-01-01-02`, ..., `C-10-05-04`

## Testing with Backend

### Prerequisites

1. Backend running on `http://localhost:8000`
2. Database seeded with default admin user
3. At least one warehouse, product, supplier created

### Test Flow

1. **Login**: Navigate to `/login`, enter `admin` / `Admin123!`
2. **Dashboard**: See KPIs, charts, expiry warnings
3. **Create Warehouse**: Navigate to `/warehouses/new`, create warehouse
4. **Bulk Bins**: Navigate to `/bins/bulk`, generate 600 bins
5. **Create Product**: Navigate to `/products/new`, add product
6. **Receipt**: Navigate to `/inventory/receipt`, receive goods
7. **FEFO**: Navigate to `/inventory/issue`, see FEFO recommendation
8. **Reports**: Navigate to `/reports`, export CSV

## Hungarian Localization

All UI text is in Hungarian:

| Feature | Hungarian |
|---------|-----------|
| Dashboard | Irányítópult |
| Warehouses | Raktárak |
| Products | Termékek |
| Suppliers | Beszállítók |
| Bins | Tárolóhelyek |
| Inventory | Készlet |
| Receipt | Bevételezés |
| Issue | Kiadás |
| Transfers | Áthelyezések |
| Reservations | Foglalások |
| Reports | Riportok |

Numbers: `1 234,56`
Dates: `2025. 12. 21.`
Units: Darab, Kilogramm, Liter, Méter, Csomag

## Build Output

```
dist/index.html                     1.20 kB │ gzip:   0.61 kB
dist/assets/index-*.css            31.66 kB │ gzip:   6.44 kB
dist/assets/index-*.js          1,055.00 kB │ gzip: 320.00 kB
```

**Total**: ~1.1MB production build (gzipped: ~327KB)

## API Integration

All API calls go through `/api/v1` proxy:
- **Auth**: `POST /api/v1/auth/login` (OAuth2 form data)
- **CRUD**: Standard REST (GET, POST, PUT, DELETE)
- **Inventory**: `/inventory/receive`, `/inventory/issue`, `/inventory/fefo-recommendation`
- **Reports**: `/reports/inventory-summary`, `/movements`

Token management:
- Access token: 15 minutes (memory only)
- Refresh token: 7 days (localStorage)
- Auto-refresh on 401 errors

## Deployment

### Production Build

```bash
npm run build
```

Output in `dist/` directory, ready for:
- Nginx/Apache static hosting
- Docker container with nginx
- CDN deployment

### Docker (Optional)

```dockerfile
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

## License

Proprietary - All rights reserved.

## Support

See main project README and documentation in `/Docs` folder:
- `INITIAL5.md` - Phase 5 frontend specification
- `PRPs/phase5-frontend-react19-tailwind4.md` - Implementation blueprint
- `Docs/Phase5_Live-*.md` - Implementation documentation

---

**WMS Frontend v1.0** - Built with ❤️ using React 19 and Tailwind CSS v4
