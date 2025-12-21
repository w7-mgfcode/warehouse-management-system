# Warehouse Management System - Technical Specification

**Last Updated**: December 2025

## 1. Project Overview

### 1.1 Purpose
A comprehensive web-based warehouse management system (WMS) designed for pallet racking warehouses with support for food products requiring strict date tracking and FEFO (First Expired, First Out) inventory management.

### 1.2 Language Requirements
**CRITICAL: All user-facing content, UI elements, labels, and messages MUST be in Hungarian language.**
- Code: English (variables, functions, comments)
- Database: English (table names, column names)
- UI/UX: Hungarian (all text visible to users)
- Documentation: English (technical docs), Hungarian (user manuals)

### 1.3 Core Principles
- **One bin = one product** with detailed metadata
- **Flexible bin structure** - fully customizable naming conventions
- **FEFO compliance** - automated expiry tracking and alerts
- **Pallet racking optimization** - weight, height, and accessibility management
- **CMR/waybill tracking** - full traceability

---

## 2. System Architecture

### 2.1 Technology Stack (December 2025 - Latest Versions)

#### Backend
| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.13+ | FastAPI 0.125.0 supports 3.9-3.14 |
| FastAPI | 0.125.0 | Released Dec 17, 2025 - scope="request" for deps |
| SQLAlchemy | 2.0.45 | Released Dec 9, 2025 - async with asyncpg |
| Pydantic | 2.11+ | @field_validator syntax, 4-50x faster than v1 |
| PostgreSQL | 17.7 | Released Nov 13, 2025 - JSON_TABLE, incremental backups |
| Valkey | 8.1 | Open-source Redis fork (BSD 3-clause), 230% perf gains |
| Alembic | 1.14+ | Async template: `alembic init -t async alembic` |
| Celery | 5.4+ | Task queue for scheduled jobs |

#### Frontend
| Component | Version | Notes |
|-----------|---------|-------|
| React | 19.0.1 | Released Dec 3, 2025 - useActionState, useOptimistic, useFormStatus |
| TypeScript | 5.7+ | Strict mode enabled |
| Tailwind CSS | 4.0 | CSS-first config, @theme directive, 5x faster builds |
| shadcn/ui | Latest | Updated for React 19 + Tailwind v4 (`npx shadcn@canary init`) |
| TanStack Query | 5.90+ | useSuspenseQuery, queryOptions pattern |
| Zustand | 5.x | useSyncExternalStore for concurrent rendering |
| React Hook Form | 7.54+ | With Zod validation |
| date-fns | 4.1+ | Hungarian locale support (`hu`) |
| Recharts | 2.15+ | Chart library |

#### DevOps & Infrastructure
| Component | Version | Notes |
|-----------|---------|-------|
| Docker | 27+ | Docker Compose v2 |
| Nginx | 1.27+ | Reverse proxy |
| Node.js | 22 LTS | Frontend build |

### 2.2 Deprecated Technologies (DO NOT USE)

```python
# ❌ DEPRECATED - Pydantic v1 syntax
class OldModel(BaseModel):
    class Config:
        orm_mode = True  # ❌ Use model_config = ConfigDict(from_attributes=True)

    @validator("name")  # ❌ Use @field_validator
    def validate_name(cls, v):
        return v

# ❌ DEPRECATED - SQLAlchemy 1.x style
session.query(User).filter(User.id == id).first()  # ❌
# ✅ Use: result = await session.execute(select(User).where(User.id == id))

# ❌ DEPRECATED - Naive datetime
datetime.utcnow()  # ❌ Use datetime.now(timezone.utc)

# ❌ DEPRECATED - Redis (license changed to RSALv2/SSPLv1)
# Use Valkey 8.1 instead (BSD 3-clause, fully open source)
```

### 2.3 2025 WMS Market Trends (Future-Ready Design)

#### AI & Automation
- **AI-driven demand forecasting** and inventory optimization
- **Predictive analytics** for bottleneck prevention
- **Smart picking route optimization**
- **Robotics integration readiness** (cobots, AMRs)

#### RFID & Scanning Technology
- **RFID bulk scanning** (vs single barcode) - UHF tags through objects
- **Drone inventory scanning** readiness
- **Voice-directed picking** integration points

#### IoT & Cold Chain
- **Real-time temperature monitoring** with IoT sensors
- **Dynamic FEFO** - automatic expiration date adjustments based on temperature
- **Compliance record maintenance** for cold chain

#### Modern UX
- **AR/smart glasses** compatibility for hands-free operation
- **Low-code workflow customization**
- **Mobile-first warehouse operations**

### 2.4 Deployment
- Single-server deployment with Docker Compose
- PostgreSQL 17 data persistence with volumes
- Automated backups (daily) with incremental backup support
- SSL/TLS certificate support

---

## 3. Database Schema

### 3.1 Core Tables

#### warehouses
```sql
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    bin_structure_template JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**bin_structure_template format:**
```json
{
  "fields": [
    {"name": "aisle", "label": "Sor", "required": true, "order": 1},
    {"name": "rack", "label": "Állvány", "required": false, "order": 2},
    {"name": "level", "label": "Szint", "required": true, "order": 3},
    {"name": "position", "label": "Pozíció", "required": true, "order": 4}
  ],
  "code_format": "{aisle}-{rack}-{level}-{position}",
  "separator": "-",
  "auto_uppercase": true,
  "zero_padding": true
}
```

#### bins
```sql
CREATE TABLE bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    structure_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'empty',
    max_weight_kg DECIMAL(10,2),
    max_height_cm INTEGER,
    accessibility VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_status CHECK (status IN ('empty', 'occupied', 'reserved', 'inactive'))
);

CREATE INDEX idx_bins_code ON bins(code);
CREATE INDEX idx_bins_warehouse ON bins(warehouse_id);
CREATE INDEX idx_bins_status ON bins(status);
CREATE INDEX idx_bins_structure ON bins USING GIN (structure_data);
```

**structure_data format:**
```json
{
  "aisle": "A",
  "rack": "03",
  "level": "2",
  "position": "01"
}
```

#### products
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    default_unit VARCHAR(20) DEFAULT 'kg',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);
```

#### suppliers
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
```

#### bin_contents
```sql
CREATE TABLE bin_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bin_id UUID REFERENCES bins(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    supplier_id UUID REFERENCES suppliers(id),
    pallet_count INTEGER DEFAULT 1,
    delivery_date DATE NOT NULL,
    best_before_date DATE NOT NULL,
    freeze_date DATE,
    use_by_date DATE NOT NULL,
    net_weight_kg DECIMAL(10,2) NOT NULL,
    gross_weight_kg DECIMAL(10,2),
    cmr_waybill_number VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (use_by_date >= best_before_date),
    CONSTRAINT check_pallet_count CHECK (pallet_count > 0)
);

CREATE INDEX idx_bin_contents_bin ON bin_contents(bin_id);
CREATE INDEX idx_bin_contents_product ON bin_contents(product_id);
CREATE INDEX idx_bin_contents_supplier ON bin_contents(supplier_id);
CREATE INDEX idx_bin_contents_cmr ON bin_contents(cmr_waybill_number);
CREATE INDEX idx_bin_contents_expiry ON bin_contents(use_by_date);
CREATE INDEX idx_bin_contents_best_before ON bin_contents(best_before_date);
```

#### bin_history
```sql
CREATE TABLE bin_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bin_id UUID REFERENCES bins(id),
    product_id UUID REFERENCES products(id),
    supplier_id UUID REFERENCES suppliers(id),
    pallet_count INTEGER,
    delivery_date DATE,
    best_before_date DATE,
    freeze_date DATE,
    use_by_date DATE,
    net_weight_kg DECIMAL(10,2),
    gross_weight_kg DECIMAL(10,2),
    cmr_waybill_number VARCHAR(100),
    notes TEXT,
    removal_reason VARCHAR(50),
    created_at TIMESTAMPTZ,
    removed_at TIMESTAMPTZ DEFAULT NOW(),
    removed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_bin_history_bin ON bin_history(bin_id);
CREATE INDEX idx_bin_history_removed_at ON bin_history(removed_at);
```

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'warehouse',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_role CHECK (role IN ('admin', 'manager', 'warehouse', 'viewer'))
);
```

### 3.2 Relationships
- One warehouse → Many bins (1:N)
- One bin → One current content (1:1)
- One bin → Many historical contents (1:N)
- One product → Many bin contents (1:N)
- One supplier → Many bin contents (1:N)

---

## 4. Core Features

### 4.1 Master Data Management

#### 4.1.1 Warehouse Management
**Features:**
- Create/edit/delete warehouses
- Define custom bin structure templates per warehouse
- Activate/deactivate warehouses
- View warehouse statistics (total bins, occupied, utilization %)

**UI Requirements (Hungarian):**
- List view with search and filters
- Form with dynamic bin structure editor
- Template preview with example codes
- Validation messages in Hungarian

#### 4.1.2 Bin Structure Templates
**Predefined Templates:**

1. **Standard Pallet Racking** (Raklapállványos)
   - Fields: Aisle, Rack, Level, Position
   - Format: `{aisle}-{rack}-{level}-{position}`
   - Example: `A-03-2-01`

2. **Simplified** (Egyszerűsített)
   - Fields: Aisle, Level, Position
   - Format: `{aisle}-{level}-{position}`
   - Example: `A-2-01`

3. **Floor Storage** (Padlós tárolás)
   - Fields: Zone, Position
   - Format: `{zone}-{position}`
   - Example: `FRISS-12`

4. **Freezer** (Fagyasztó raktár)
   - Fields: Zone, Temperature, Aisle, Position
   - Format: `{zone}-{temp}-{aisle}-{position}`
   - Example: `F1-M18-A-05`

**Custom Template Editor:**
- Drag-and-drop field ordering
- Add/remove fields dynamically
- Set field properties: name, label (Hungarian), required, order
- Code format builder with live preview
- Separator configuration
- Auto-uppercase and zero-padding options
- Save as reusable template
- Import/export as JSON

#### 4.1.3 Product Management
**Fields:**
- Name* (Hungarian)
- SKU (optional, unique)
- Category (dropdown, extendable)
- Default unit (kg, db, l, m³)
- Active status

**Features:**
- CRUD operations
- Bulk import from CSV/Excel
- Search and filter by category
- Active/inactive toggle
- Usage statistics (how many times used)

#### 4.1.4 Supplier Management
**Fields:**
- Company name*
- Contact person
- Email
- Phone
- Address
- Tax number
- Active status

**Features:**
- CRUD operations
- Search and filter
- Link to delivery statistics
- Active/inactive toggle

#### 4.1.5 Bin Management
**Features:**
- Create bins individually or in bulk
- Edit bin properties (weight limit, height limit, accessibility)
- Delete bins (only if empty)
- Activate/deactivate bins
- Visual warehouse map
- Filter by warehouse, status, structure fields
- Export to Excel/CSV

**Bulk Generation:**
- Specify ranges for each structure field
- Preview generated codes
- Batch create with validation
- Progress indicator for large batches

**Example:**
```
Warehouse: Main Warehouse (Főraktár)
Structure: Aisle-Level-Position

Input:
- Aisle: A, B, C, D
- Level: 1-4
- Position: 01-12

Output: 192 bins
- A-1-01, A-1-02, ..., D-4-12
```

### 4.2 Inventory Operations

#### 4.2.1 Goods Receipt (Bevételezés)
**Form Fields (Hungarian labels):**
- Bin selection* (dropdown: empty bins only)
- Product* (dropdown with search, "+ Add new" option)
- Supplier* (dropdown with search, "+ Add new" option)
- Pallet count* (default: 1)
- Net weight (kg)*
- Gross weight (kg) (optional)
- Pallet height (cm) (optional)
- Delivery date* (date picker, default: today)
- Best before date* (date picker)
- Freeze date (optional date picker)
- Use by date* (date picker)
- CMR/Waybill number* (text input)
- Notes (textarea)

**Validation:**
- use_by_date >= best_before_date
- freeze_date <= today (if provided)
- net_weight > 0
- pallet_count > 0
- Weight check: gross_weight <= bin.max_weight_kg
- Height check: height <= bin.max_height_cm
- CMR uniqueness warning (not blocking)

**Smart Suggestions:**
- Suggest bins based on:
  - Product type (same product nearby)
  - Supplier (group by supplier)
  - Expiry date (FEFO positioning)
  - Weight/height constraints
  - Empty bins on ground level (easier access)

**Post-Submit Actions:**
- Update bin status to 'occupied'
- Generate printable pallet label (optional)
- Show success message with bin code
- Option to "Add another" or "View bin"

**Pallet Label Print:**
```
┌─────────────────────────────┐
│ [Supplier Name]             │
│ [Product Name]              │
├─────────────────────────────┤
│ CMR: [Number]               │
│ Nettó: [XX] kg              │
│ Bruttó: [XX] kg             │
├─────────────────────────────┤
│ Beszállítás: YYYY-MM-DD     │
│ Lejár: YYYY-MM-DD           │
├─────────────────────────────┤
│  [QR Code with bin_id]      │
│                             │
│    📍 [Bin Code]            │
└─────────────────────────────┘
```

#### 4.2.2 Goods Issue (Kiadás)
**Process:**
1. Search bin by code or scan QR
2. Display bin contents (product, supplier, dates, weight, CMR)
3. Confirm removal
4. Specify removal reason (dropdown, Hungarian):
   - Felhasználva (Used)
   - Selejtezve (Scrapped)
   - Áthelyezve (Transferred)
   - Egyéb (Other - with text input)
5. Archive to bin_history
6. Update bin status to 'empty'

**FEFO Warning:**
If removing a product that is NOT the oldest expiring item in the warehouse, show warning:
```
⚠️ Figyelem! Ez nem a leghamarabb lejáró tétel.
Legrégebbi lejárat: [Product] ([Bin]) - [Date]
Folytatja? [Mégse] [Igen, folytatom]
```

#### 4.2.3 Inventory List View
**Table Columns:**
- Bin code (sortable, clickable)
- Product name (sortable)
- Supplier name (sortable, filterable)
- CMR number (searchable)
- Net weight
- Delivery date (sortable)
- Best before date (sortable)
- Use by date (sortable)
- Days until expiry (calculated, color-coded)
- Status indicator (🟢 >7 days, 🟡 3-7 days, 🔴 <3 days, ⚫ expired)
- Actions (View, Remove)

**Filters:**
- Warehouse (multi-select)
- Product (multi-select autocomplete)
- Supplier (multi-select autocomplete)
- Date range (delivery, expiry)
- Status (fresh, expiring soon, expired)
- CMR number (search)
- Structure fields (dynamic based on warehouse)

**Bulk Actions:**
- Export selected to Excel/CSV
- Print labels for selected
- Generate picking list

**Pagination:**
- Default: 50 items per page
- Options: 25, 50, 100, 200

### 4.3 Reporting & Analytics

#### 4.3.1 Dashboard (Hungarian)
**KPIs:**
- Total bins / Occupied bins / Utilization %
- Products expiring in 7 days (count + list)
- Products expiring in 3 days (count + list)
- Expired products (count + list)
- Today's receipts (count)
- Today's issues (count)
- Total inventory value (optional, if cost tracking)

**Charts:**
- Occupancy over time (line chart, last 30 days)
- Products by supplier (pie chart)
- Expiry distribution (bar chart: >30 days, 15-30, 7-14, 3-6, <3, expired)
- Warehouse utilization comparison (bar chart)

#### 4.3.2 FEFO Report (FEFO Riport)
**Purpose:** List all items sorted by use_by_date ascending

**Columns:**
- Priority (1, 2, 3...)
- Bin code
- Product name
- Supplier
- Use by date
- Days until expiry
- Net weight
- CMR number
- Status indicator

**Export:**
- Excel with conditional formatting (red/yellow/green)
- PDF with company header
- CSV

#### 4.3.3 Supplier Statistics (Beszállítói statisztika)
**Group by supplier:**
- Total deliveries
- Total products currently in stock
- Average delivery-to-expiry time
- List of active bins
- CMR numbers

**Export:** Excel, PDF

#### 4.3.4 Expiring Products Report (Lejáró termékek)
**Filters:**
- Days threshold (default: 7)
- Product
- Supplier

**Columns:**
- Bin code
- Product
- Supplier
- Use by date
- Days remaining
- Net weight
- CMR

**Actions:**
- Send email alert to manager
- Print picking list
- Export

#### 4.3.5 Empty/Full Bins Report
**Purpose:** Identify available capacity or congestion

**Metrics:**
- Empty bins by warehouse/zone
- Bins at capacity
- Average occupancy per warehouse
- Underutilized areas

### 4.4 Warehouse Visualization

#### 4.4.1 Visual Map
**Requirements:**
- Interactive 2D grid representation
- Color-coded bins:
  - 🟢 Green: Empty
  - 🔴 Red: Occupied
  - 🟡 Yellow: Expiring <7 days
  - 🟠 Orange: Expiring <3 days
  - ⚫ Black: Expired
  - ⚪ Gray: Inactive
- Click bin → Show details popup
- Filter by structure fields (e.g., show only Level 1)
- Zoom in/out
- Print warehouse layout

**Example Layout:**
```
Aisle A - Rack 03:

Level 4: [🟢][🟢][🟢][🟢]
Level 3: [🔴][🟡][🟢][🟢]
Level 2: [🔴][🔴][🟢][🟢]
Level 1: [🔴][🔴][🔴][🟢]
         01  02  03  04
```

#### 4.4.2 Bin Details Popup
**On bin click, show:**
- Bin code
- Warehouse, structure details
- Status
- Max weight/height
- If occupied:
  - Product name
  - Supplier
  - CMR number
  - Weights
  - All dates
  - Days until expiry
  - Actions: Remove, Print label

### 4.5 Automation & Alerts

#### 4.5.1 Scheduled Jobs (Celery + Valkey Tasks)
**Daily at 6:00 AM:**
- Check expiring products (7 days, 3 days, 1 day thresholds)
- Send email alerts to managers
- Log alert in system

**Daily at 1:00 AM:**
- Database backup (PostgreSQL 17 incremental backup support)
- Archive old history records (>365 days)

**Hourly:**
- Check CMR duplicates
- Update bin status consistency

#### 4.5.2 Email Notifications (Hungarian)
**Templates:**

1. **Expiring Soon (7 days)**
   - Subject: "🟡 Figyelmeztetés: 7 napon belül lejáró termékek"
   - Body: List of products with bin codes, expiry dates
   - Attachment: Excel report

2. **Expiring Soon (3 days)**
   - Subject: "🟠 Sürgős: 3 napon belül lejáró termékek"
   - Body: Highlighted list
   - Attachment: Excel + PDF picking list

3. **Expired**
   - Subject: "🔴 Azonnali cselekvés szükséges: Lejárt termékek!"
   - Body: Urgent removal required

**Configuration:**
- SMTP settings in .env
- Recipient emails (admin panel)
- Enable/disable per alert type

### 4.6 User Management & Permissions

#### 4.6.1 Roles

| Role      | Hungarian Label | Permissions                                      |
|-----------|-----------------|--------------------------------------------------|
| Admin     | Adminisztrátor  | Full access (all CRUD, settings, users)          |
| Manager   | Menedzser       | View, reports, master data edit, no user mgmt    |
| Warehouse | Raktáros        | Goods receipt/issue, inventory view, no settings |
| Viewer    | Megtekintő      | Read-only access to inventory and reports        |

#### 4.6.2 User CRUD
**Admin only:**
- Create/edit/delete users
- Assign roles
- Activate/deactivate accounts
- Reset passwords

**User profile (self-service):**
- Change own password
- Update email, full name

---

## 5. API Endpoints

### 5.1 Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

### 5.2 Warehouses
```
GET    /api/v1/warehouses
POST   /api/v1/warehouses
GET    /api/v1/warehouses/{id}
PUT    /api/v1/warehouses/{id}
DELETE /api/v1/warehouses/{id}
GET    /api/v1/warehouses/{id}/stats
```

### 5.3 Bins
```
GET    /api/v1/bins
POST   /api/v1/bins
POST   /api/v1/bins/bulk
GET    /api/v1/bins/{id}
PUT    /api/v1/bins/{id}
DELETE /api/v1/bins/{id}
GET    /api/v1/bins/search?warehouse_id=&status=&structure={}
```

### 5.4 Products
```
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/{id}
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}
```

### 5.5 Suppliers
```
GET    /api/v1/suppliers
POST   /api/v1/suppliers
GET    /api/v1/suppliers/{id}
PUT    /api/v1/suppliers/{id}
DELETE /api/v1/suppliers/{id}
```

### 5.6 Inventory
```
POST   /api/v1/inventory/receipt
POST   /api/v1/inventory/issue
GET    /api/v1/inventory/contents
GET    /api/v1/inventory/contents/{id}
GET    /api/v1/inventory/history
```

### 5.7 Reports
```
GET    /api/v1/reports/dashboard
GET    /api/v1/reports/fefo
GET    /api/v1/reports/expiring?days=7
GET    /api/v1/reports/supplier-stats
GET    /api/v1/reports/occupancy
POST   /api/v1/reports/export (JSON body: {type, filters, format})
```

### 5.8 Users (Admin only)
```
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

---

## 6. Frontend Requirements

### 6.1 Responsive Design
- Desktop-first (1920x1080 primary)
- Tablet support (1024x768)
- Mobile support (375x667) for basic operations

### 6.2 Key UI Components

#### 6.2.1 Navigation
**Top Bar:**
- Logo + App name
- Main menu: Dashboard, Készlet, Törzsadatok, Riportok, Beállítások
- User dropdown (profile, logout)
- Notifications bell (expiry alerts)

**Sidebar (collapsible):**
- Hierarchical menu
- Active state indication
- Icons + labels

#### 6.2.2 Forms (React 19 + React Hook Form + Zod)
**Standard Features:**
- Client-side validation with Zod
- Error messages in Hungarian
- Required field indicators (*)
- Autocomplete for large dropdowns
- Date pickers with Hungarian locale
- Number inputs with unit labels
- Cancel/Save buttons (right-aligned)
- Use React 19 `useActionState` for form submissions where applicable

**Example (React 19 style):**
```tsx
<Input
  label="Termék neve*"
  name="name"
  error={errors.name?.message}
  required
/>
```

#### 6.2.3 Tables (TanStack Query v5 + Server-side)
**Features:**
- Server-side pagination
- Column sorting (ASC/DESC)
- Multi-column filtering
- Export to Excel/CSV buttons
- Bulk selection with actions
- Responsive (stack on mobile)
- Empty state with helpful message
- Use `queryOptions` pattern for type-safe queries

**Hungarian Labels:**
- "Keresés..." (Search)
- "Szűrők" (Filters)
- "Exportálás" (Export)
- "Oldal X / Y" (Page X of Y)
- "Nincs találat" (No results)

#### 6.2.4 Modals
**Types:**
- Confirmation (e.g., delete bin)
- Form (e.g., add product)
- Details view (e.g., bin contents)
- Warning (e.g., FEFO violation)

**Buttons:**
- "Mégse" (Cancel - secondary)
- "Mentés" (Save - primary)
- "Törlés" (Delete - danger)

#### 6.2.5 Notifications
**Toast Messages:**
- Success (green): "Sikeres mentés!" (Successful save)
- Error (red): "Hiba történt!" (Error occurred)
- Warning (yellow): "Figyelmeztetés!" (Warning)
- Info (blue): "Információ" (Information)

**Position:** Top-right
**Duration:** 5 seconds (dismissible)

### 6.3 Accessibility
- Keyboard navigation support
- ARIA labels in Hungarian
- Focus indicators
- Color contrast WCAG AA compliant

### 6.4 Performance
- Lazy loading for routes (React 19 Suspense)
- Virtual scrolling for large tables (>1000 rows)
- Debounced search inputs (300ms)
- Optimistic UI updates (React 19 `useOptimistic`)
- Image lazy loading

---

## 7. Security

### 7.1 Authentication
- JWT tokens (access: 15min, refresh: 7 days)
- Password hashing: bcrypt (cost factor: 12)
- Password requirements:
  - Min 8 characters
  - At least 1 uppercase, 1 lowercase, 1 number
- Account lockout after 5 failed login attempts (15min)

### 7.2 Authorization
- Role-based access control (RBAC)
- Endpoint-level permission checks
- Row-level security for multi-tenant (future)

### 7.3 Data Protection
- HTTPS only (enforce in production)
- CORS configuration (whitelist domains)
- SQL injection prevention (ORM, parameterized queries)
- XSS protection (sanitize inputs, CSP headers)
- CSRF tokens for state-changing operations

### 7.4 Audit Logging
**Log events:**
- User login/logout
- CRUD operations on master data
- Inventory movements (receipt/issue)
- Configuration changes
- Failed login attempts

**Log storage:**
- Database table: audit_logs
- Fields: user_id, action, entity_type, entity_id, changes (JSON), ip_address, timestamp

---

## 8. Deployment & DevOps

### 8.1 Docker Setup

#### docker-compose.yml (Updated for December 2025)
```yaml
version: '3.8'

services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: wms
      POSTGRES_USER: wms_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - wms_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wms_user -d wms"]
      interval: 10s
      timeout: 5s
      retries: 5

  valkey:
    image: valkey/valkey:8-alpine
    networks:
      - wms_network
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://wms_user:${DB_PASSWORD}@db:5432/wms
      VALKEY_URL: valkey://valkey:6379
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
      valkey:
        condition: service_healthy
    networks:
      - wms_network

  celery_worker:
    build:
      context: ./backend
    command: celery -A app.celery worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://wms_user:${DB_PASSWORD}@db:5432/wms
      VALKEY_URL: valkey://valkey:6379
    depends_on:
      - db
      - valkey
    networks:
      - wms_network

  celery_beat:
    build:
      context: ./backend
    command: celery -A app.celery beat --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://wms_user:${DB_PASSWORD}@db:5432/wms
      VALKEY_URL: valkey://valkey:6379
    depends_on:
      - db
      - valkey
    networks:
      - wms_network

  frontend:
    build:
      context: ./frontend
    environment:
      VITE_API_URL: ${API_URL}
    networks:
      - wms_network

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - wms_network

volumes:
  postgres_data:

networks:
  wms_network:
```

### 8.2 Environment Variables (.env)
```bash
# Database - PostgreSQL 17
DB_PASSWORD=strong_password_here
DATABASE_URL=postgresql+asyncpg://wms_user:${DB_PASSWORD}@localhost:5432/wms

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_ACCESS_EXPIRY=900  # 15 minutes
JWT_REFRESH_EXPIRY=604800  # 7 days

# Valkey (Redis replacement - BSD 3-clause license)
VALKEY_URL=valkey://localhost:6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@yourcompany.com

# Frontend
API_URL=http://localhost:8000/api/v1

# App Config
TIMEZONE=Europe/Budapest
LANGUAGE=hu
```

### 8.3 Backup Strategy
**Automated Daily Backups (PostgreSQL 17 Incremental Support):**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="wms"

# PostgreSQL 17 dump with parallel jobs for faster backup
docker exec wms_db pg_dump -U wms_user -j 4 $DB_NAME | gzip > $BACKUP_DIR/wms_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "wms_*.sql.gz" -mtime +30 -delete
```

**Cron job:**
```
0 1 * * * /path/to/backup.sh
```

### 8.4 Monitoring (Optional)
- Prometheus metrics endpoint: `/metrics`
- Grafana dashboards:
  - API response times
  - Database query performance
  - Celery task queue length
  - Error rates
  - Active users

---

## 9. Testing Requirements

### 9.1 Backend Testing
**Unit Tests:**
- Model validation
- Business logic functions
- Date calculations (FEFO, expiry)
- Bin code generation
- Weight/height validation

**Integration Tests:**
- API endpoints (CRUD operations)
- Authentication flow
- Database transactions
- Celery task execution

**Test Coverage Target:** >80%

**Tools:**
- pytest 8.3+
- pytest-asyncio 0.24+
- pytest-cov 6.0+
- factory_boy 3.3+ (fixtures)
- httpx 0.28+ (async test client)

### 9.2 Frontend Testing
**Unit Tests:**
- Component rendering
- Form validation logic
- Utility functions (date formatting, Hungarian locale)

**Integration Tests:**
- API integration (TanStack Query v5)
- Form submission flows
- Navigation

**E2E Tests (Playwright):**
- Complete goods receipt flow
- Complete goods issue flow
- Report generation
- User login/logout

**Tools:**
- Vitest
- React Testing Library
- Playwright

---

## 10. Future Enhancements (Phase 2+)

### 10.1 Mobile App
- React Native or Flutter
- QR code scanner for bins and pallets
- Offline mode with sync
- Push notifications for expiry alerts
- Streamlined receipt/issue forms

### 10.2 Advanced Features
- **Barcode/RFID integration**
  - Scanner API integration
  - Auto-fill forms on scan
  - Bulk scanning for inventory checks
  - RFID UHF tags for through-object scanning

- **Route optimization**
  - Picker routing (shortest path for multi-bin picking)
  - Forklift task queue
  - AI-driven path optimization

- **Multi-warehouse transfers**
  - Transfer requests
  - In-transit status
  - Transfer history

- **Batch tracking**
  - Lot numbers
  - Batch-level expiry
  - Recall management

- **Integration APIs**
  - ERP integration (SAP, Odoo)
  - WMS integration
  - Accounting software sync

- **Advanced analytics**
  - Predictive expiry forecasting (AI)
  - Inventory turnover analysis
  - ABC analysis (product classification)
  - Slow-moving stock report

- **Temperature monitoring**
  - IoT sensor integration (if freezer/cooler)
  - Temperature logs
  - Alerts on threshold breach
  - Dynamic FEFO adjustments based on temperature

- **Drone inventory scanning**
  - Automated stock-taking
  - Integration with drone flight APIs

- **Voice-directed picking**
  - Voice command integration
  - Hands-free warehouse operations

- **AR/Smart glasses**
  - Visual picking guidance
  - Real-time bin information overlay

### 10.3 Customization
- Custom fields for products, suppliers, bins
- Configurable workflows
- Custom report builder
- Webhooks for integrations
- Low-code workflow customization

---

## 11. Localization (Hungarian)

### 11.1 Translation Keys (Examples)

**Common:**
- `common.save` → "Mentés"
- `common.cancel` → "Mégse"
- `common.delete` → "Törlés"
- `common.edit` → "Szerkesztés"
- `common.search` → "Keresés..."
- `common.filter` → "Szűrő"
- `common.export` → "Exportálás"
- `common.add` → "Hozzáadás"
- `common.actions` → "Műveletek"
- `common.status` → "Státusz"

**Bins:**
- `bins.title` → "Raktárhelyek"
- `bins.code` → "Kód"
- `bins.warehouse` → "Raktár"
- `bins.status.empty` → "Üres"
- `bins.status.occupied` → "Foglalt"
- `bins.status.reserved` → "Foglalt (fenntartva)"
- `bins.status.inactive` → "Inaktív"
- `bins.create` → "Új raktárhely"
- `bins.bulkCreate` → "Tömeges létrehozás"

**Inventory:**
- `inventory.receipt` → "Bevételezés"
- `inventory.issue` → "Kiadás"
- `inventory.product` → "Termék"
- `inventory.supplier` → "Beszállító"
- `inventory.deliveryDate` → "Beszállítás dátuma"
- `inventory.bestBefore` → "Minőségét megőrzi"
- `inventory.freezeDate` → "Fagyasztás dátuma"
- `inventory.useBy` → "Felhasználhatóság"
- `inventory.netWeight` → "Nettó súly (kg)"
- `inventory.grossWeight` → "Bruttó súly (kg)"
- `inventory.cmr` → "CMR / Szállító levél száma"
- `inventory.palletCount` → "Raklapok száma"

**Reports:**
- `reports.dashboard` → "Áttekintés"
- `reports.fefo` → "FEFO Riport"
- `reports.expiring` → "Lejáró termékek"
- `reports.supplierStats` → "Beszállítói statisztika"
- `reports.daysUntilExpiry` → "Lejáratig hátralévő napok"

**Validation:**
- `validation.required` → "A mező kitöltése kötelező"
- `validation.minLength` → "Minimum {{min}} karakter szükséges"
- `validation.email` → "Érvényes email cím szükséges"
- `validation.dateAfter` → "A dátumnak {{date}} után kell lennie"
- `validation.positive` → "Pozitív szám szükséges"

### 11.2 Date/Time Formatting
**Library:** date-fns 4.1+ with `hu` locale

**Formats:**
- Date: `yyyy. MM. dd.` (2024. 12. 21.)
- DateTime: `yyyy. MM. dd. HH:mm` (2024. 12. 21. 14:30)
- Relative: `distance_in_words_to_now` → "3 napja"

### 11.3 Number Formatting
**Decimal separator:** `,` (comma)
**Thousands separator:** ` ` (space)

**Examples:**
- 1000 → `1 000`
- 1234.56 → `1 234,56`
- Weight: `380,5 kg`

---

## 12. Development Guidelines

### 12.1 Code Style

#### Backend (Python 3.13+ / FastAPI 0.125.0)
- **Formatter:** Black
- **Linter:** Ruff 0.8+
- **Type hints:** Mandatory for functions
- **Docstrings:** Google style
- **Naming:**
  - snake_case for variables, functions
  - PascalCase for classes
  - UPPER_CASE for constants
- **Pydantic:** Use v2.11+ syntax (`@field_validator`, `ConfigDict`)
- **SQLAlchemy:** Use 2.0.45+ async syntax (`select().where()`)
- **Datetime:** Always use timezone-aware (`datetime.now(timezone.utc)`)

#### Frontend (TypeScript 5.7+ / React 19)
- **Formatter:** Prettier
- **Linter:** ESLint (Airbnb config)
- **Naming:**
  - camelCase for variables, functions
  - PascalCase for components, types
  - UPPER_SNAKE_CASE for constants
- **React 19:** Use new hooks (`useActionState`, `useOptimistic`, `useFormStatus`)
- **Tailwind v4:** CSS-first configuration with `@theme` directive
- **TanStack Query v5:** Use `queryOptions` pattern

### 12.2 Git Workflow
**Branches:**
- `main` → Production-ready
- `develop` → Integration branch
- `feature/*` → New features
- `bugfix/*` → Bug fixes
- `hotfix/*` → Urgent production fixes

**Commit Messages:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(inventory): add FEFO violation warning on goods issue

- Display modal when user tries to remove non-oldest item
- Show oldest expiring item details
- Add confirmation step

Closes #123
```

### 12.3 Code Review Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] Error handling implemented
- [ ] Translations added (Hungarian)
- [ ] Database migrations (if schema changes)
- [ ] Performance considerations addressed
- [ ] Uses latest syntax (Pydantic v2, SQLAlchemy 2.0, React 19)

---

## 13. Documentation Requirements

### 13.1 Technical Documentation (English)
- API documentation (auto-generated with Swagger)
- Database schema diagram (ERD)
- Architecture overview
- Deployment guide
- Development setup guide

### 13.2 User Documentation (Hungarian)
- User manual (PDF)
- Quick start guide
- Video tutorials (optional)
- FAQ
- Troubleshooting guide

### 13.3 Admin Documentation (Hungarian)
- System configuration guide
- User management guide
- Backup/restore procedures
- Email template customization

---

## 14. Acceptance Criteria

### 14.1 Functional Requirements
- [x] All CRUD operations work for master data
- [x] Goods receipt records correctly with validation
- [x] Goods issue archives to history
- [x] FEFO warning displays when removing non-oldest item
- [x] Reports generate with correct data
- [x] Export to Excel/PDF works
- [x] Email notifications sent on schedule
- [x] User authentication and authorization work
- [x] Bin structure is fully customizable
- [x] Bulk bin generation works
- [x] Visual warehouse map displays correctly

### 14.2 Non-Functional Requirements
- [x] System responds within 2 seconds for typical operations
- [x] Database handles 10,000+ bins and 5,000+ inventory items
- [x] All UI text is in Hungarian
- [x] System works on Chrome, Firefox, Edge (latest versions)
- [x] Mobile responsive for basic views
- [x] Daily backups execute successfully
- [x] No critical security vulnerabilities (OWASP Top 10)

---

## 15. Deliverables

1. **Source Code**
   - Backend repository (Git)
   - Frontend repository (Git)
   - Docker configuration
   - Database migrations

2. **Documentation**
   - This technical specification
   - API documentation (Swagger/OpenAPI)
   - User manual (Hungarian PDF)
   - Setup/deployment guide

3. **Deployment Package**
   - Docker Compose file
   - Environment variable template
   - Nginx configuration
   - SSL certificate setup guide
   - Backup scripts

4. **Testing**
   - Test suite (backend + frontend)
   - Test coverage report
   - E2E test scenarios

---

## Appendix A: Database Indexes Strategy

**Purpose:** Optimize query performance for common operations

### Critical Indexes
```sql
-- Bin lookups by code (primary lookup method)
CREATE INDEX idx_bins_code ON bins(code);

-- Inventory expiry queries (FEFO reports)
CREATE INDEX idx_bin_contents_use_by ON bin_contents(use_by_date);
CREATE INDEX idx_bin_contents_best_before ON bin_contents(best_before_date);

-- CMR tracking
CREATE UNIQUE INDEX idx_bin_contents_cmr ON bin_contents(cmr_waybill_number);

-- Product/Supplier filtering
CREATE INDEX idx_bin_contents_product ON bin_contents(product_id);
CREATE INDEX idx_bin_contents_supplier ON bin_contents(supplier_id);

-- Warehouse filtering
CREATE INDEX idx_bins_warehouse ON bins(warehouse_id);
CREATE INDEX idx_bins_status ON bins(status);

-- Dynamic structure queries (JSONB GIN index)
CREATE INDEX idx_bins_structure ON bins USING GIN (structure_data);

-- History queries
CREATE INDEX idx_bin_history_removed_at ON bin_history(removed_at DESC);
CREATE INDEX idx_bin_history_bin ON bin_history(bin_id);

-- User lookups
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### Composite Indexes (if needed)
```sql
-- Warehouse + status filtering (common combo)
CREATE INDEX idx_bins_warehouse_status ON bins(warehouse_id, status);

-- Product + expiry (FEFO by product)
CREATE INDEX idx_bin_contents_product_expiry ON bin_contents(product_id, use_by_date);
```

---

## Appendix B: Sample API Request/Response

### POST /api/v1/inventory/receipt

**Request:**
```json
{
  "bin_id": "550e8400-e29b-41d4-a716-446655440000",
  "product_id": "660e8400-e29b-41d4-a716-446655440001",
  "supplier_id": "770e8400-e29b-41d4-a716-446655440002",
  "pallet_count": 1,
  "net_weight_kg": 380.5,
  "gross_weight_kg": 450.0,
  "delivery_date": "2024-12-21",
  "best_before_date": "2025-01-20",
  "freeze_date": "2024-12-21",
  "use_by_date": "2025-02-15",
  "cmr_waybill_number": "SH-2024-1234",
  "notes": "Friss szállítmány, jó minőség"
}
```

**Response (201 Created):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "bin": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "A-03-2-01",
    "warehouse": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Főraktár"
    }
  },
  "product": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Csirkemell"
  },
  "supplier": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Gallus Kft"
  },
  "pallet_count": 1,
  "net_weight_kg": 380.5,
  "gross_weight_kg": 450.0,
  "delivery_date": "2024-12-21",
  "best_before_date": "2025-01-20",
  "freeze_date": "2024-12-21",
  "use_by_date": "2025-02-15",
  "days_until_expiry": 56,
  "cmr_waybill_number": "SH-2024-1234",
  "notes": "Friss szállítmány, jó minőség",
  "created_at": "2024-12-21T14:30:00Z",
  "updated_at": "2024-12-21T14:30:00Z"
}
```

---

## Appendix C: Email Template Example

### Subject: 🟡 Figyelmeztetés: 7 napon belül lejáró termékek

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background-color: #FFA500; color: white; padding: 20px; }
    .content { padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .warning { color: #FF6600; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🟡 Lejáró Termékek Figyelmeztetés</h1>
  </div>

  <div class="content">
    <p>Tisztelt Vezetőség,</p>

    <p>A következő termékek <span class="warning">7 napon belül lejárnak</span>:</p>

    <table>
      <thead>
        <tr>
          <th>Bin Kód</th>
          <th>Termék</th>
          <th>Beszállító</th>
          <th>Lejárati Dátum</th>
          <th>Hátralévő Napok</th>
          <th>Nettó Súly (kg)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A-03-2-01</td>
          <td>Csirkemell</td>
          <td>Gallus Kft</td>
          <td>2024-12-28</td>
          <td class="warning">6 nap</td>
          <td>380,5</td>
        </tr>
        <tr>
          <td>B-05-1-03</td>
          <td>Marha hús</td>
          <td>Beef Co</td>
          <td>2024-12-27</td>
          <td class="warning">5 nap</td>
          <td>420,0</td>
        </tr>
      </tbody>
    </table>

    <p>Kérem, tegye meg a szükséges intézkedéseket a termékek időben történő felhasználása vagy selejtezése érdekében.</p>

    <p>Részletes riport a mellékletben.</p>

    <p>Üdvözlettel,<br>Raktárkezelő Rendszer</p>
  </div>
</body>
</html>
```

---

## Version History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 1.0     | 2024-12-21 | -      | Initial specification            |
| 2.0     | 2025-12-21 | -      | December 2025 version updates: FastAPI 0.125.0, SQLAlchemy 2.0.45, Pydantic 2.11+, PostgreSQL 17.7, Valkey 8.1, React 19.0.1, Tailwind CSS 4.0, TanStack Query 5.90+, Zustand 5.x. Added 2025 WMS market trends, deprecated patterns section, async database patterns. |

---

**END OF SPECIFICATION**
