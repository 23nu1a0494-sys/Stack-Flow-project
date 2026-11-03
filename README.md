# StockFlow – SaaS Inventory Management System

> **Simplifying Inventory. Empowering Businesses.**

StockFlow is a production-grade, multi-tenant SaaS inventory management platform engineered to deliver real-time stock control, financial valuation, and complete organization-level data isolation. Built with modern full-stack technologies including **React 19**, **Node.js/Express**, and **PostgreSQL**.

---

## Key Highlights

- **Multi-Tenant Architecture:** Every user belongs to an organization. All product records, inventory logs, and settings are strictly isolated at the database layer using `organization_id`.
- **Relational PostgreSQL Persistence:** Fully normalized relational models with foreign keys, check constraints (`quantity >= 0`), and composite unique constraints (`UNIQUE(organization_id, sku)`). Supports **Supabase**, AWS RDS, Google Cloud SQL, or native PostgreSQL.
- **Enterprise Security:** Passwords hashed with **bcrypt** (10 salt rounds), stateless JWT authentication, server-side parameter sanitization, and parameterized SQL queries.
- **Dynamic Real-Time Calculations:** Zero hardcoded demo metrics. All dashboard counts, valuations, margins, and threshold evaluations are dynamically aggregated from live database records.
- **Auditable Stock Adjustments:** Complete change tracking recording user attribution, previous quantities, new quantities, adjustment deltas, and audit reasons in `inventory_logs`.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide React Icons |
| **Backend** | Node.js, Express 4, TypeScript (`tsx` runtime) |
| **Database** | PostgreSQL 17 (Supabase Pooler / Native Postgres / PGlite WASM fallback) |
| **Authentication** | `bcryptjs` password hashing, `jsonwebtoken` (JWT Bearer tokens) |
| **Build Tooling** | Vite 8, TypeScript Compiler (`tsc`), Tailwind CSS Vite Plugin |

---

## Core Application Modules

### 1. Authentication & Tenant Provisioning
- **Self-Service Registration:** Creates a user and auto-provisions a dedicated, isolated organization workspace.
- **Secure Sign-In:** Authenticates email and password via bcrypt comparison; issues signed JWTs with 7-day validity.
- **Session Recovery:** Persistent authentication across browser refreshes via `GET /api/auth/me`.
- **Validation:** Strict validation on email syntax, minimum password length ($\ge 6$ chars), password confirmation matching, and organization name.

### 2. Multi-Tenant Organization Management
- **Strict Server-Side Isolation:** Tenant boundaries are enforced in SQL query `WHERE` clauses (`WHERE organization_id = req.user.organizationId`), never through client-side filtering.
- **Scoped SKU Uniqueness:** Ensures unique SKUs *within* each organization while allowing different organizations to use industry-standard SKUs without collisions.

### 3. Product Catalog Management (Full CRUD)
- **Fields:** Product Name, SKU, Description, Quantity on Hand, Cost Price, Selling Price, Low Stock Alert Threshold, Timestamps.
- **Real-Time Search & Filters:** Filter products by name, SKU, description, and inventory status (`all`, `in_stock`, `low_stock`, `out_of_stock`).
- **Live Profit Margin Analytics:** Instant calculation of unit gross profit and margin percentages during product creation and editing.
- **Delete Protection:** Modal confirmation dialog preventing accidental deletions with safe cascade deletion of audit logs.

### 4. Inventory Controls & Threshold Policies
- **Direct Stock Adjustments:** Fast modal supporting three adjustment modes:
  - `Add (+)`: Receive restock shipments.
  - `Deduct (-)`: Fulfill customer orders or dispatch.
  - `Set Exact (=)`: Reconcile physical cycle counts.
- **Negative Stock Prevention:** Server-side logic and database constraints reject deductions that would cause inventory to drop below zero.
- **Low-Stock Evaluation Formula:**
  - **Out of Stock:** `quantity === 0`
  - **Low Stock:** `quantity > 0 && quantity <= (product.low_stock_threshold ?? organization.default_low_stock_threshold)`
  - **In Stock:** `quantity > effectiveThreshold`

### 5. Dynamic Dashboard
- **Core KPI Cards:** Total Products, Total Stock Units, Low Stock Alerts, and Out of Stock Count.
- **Financial Valuation:** Real-time calculation of Cost Basis (Total Asset Value), Projected Retail Value, and Potential Gross Profit.
- **Catalog Health Breakdown:** Visual progress distribution across healthy, low, and depleted stock.
- **Priority Restock Queue:** Priority table surfacing low/out-of-stock items with one-click restock actions.
- **Audit Feed:** Live activity feed showing the latest inventory adjustments.

### 6. Settings & System Architecture Inspector
- **Organization Profile:** Update organization name, contact email, default currency symbol, and the Default Low Stock Threshold.
- **PostgreSQL Inspector:** In-app inspection tab displaying live database engine details, active tenant ID, table row counts, and schema constraints.

---

## Database Architecture & Schema

```sql
-- 1. Multi-Tenant Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  default_low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users with bcrypt password hashes
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Catalog with Strict Constraints
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
  low_stock_threshold INTEGER CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_org_sku UNIQUE (organization_id, sku)
);

-- 4. Inventory Audit Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_logs_org_prod ON inventory_logs(organization_id, product_id);
```

---

## Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Server
PORT=3000
NODE_ENV="development"
JWT_SECRET="your-secure-random-jwt-secret-key"

# PostgreSQL Database
# Supabase connection string format:
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Optional standard PostgreSQL parameters (if not using DATABASE_URL):
# PGHOST="localhost"
# PGPORT="5432"
# PGUSER="postgres"
# PGPASSWORD="password"
# PGDATABASE="stockflow"
```

> **Note:** If `DATABASE_URL` is omitted, StockFlow automatically boots into its embedded persistent PostgreSQL engine (`./data/stockflow-pg`) using `@electric-sql/pglite` with full SQL compliance.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 3. Verify TypeScript Compilation & Linting
```bash
npm run lint
```

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## RESTful API Reference

### Authentication
- `POST /api/auth/register` — Register new user and auto-create organization.
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `GET /api/auth/me` — Retrieve active authenticated session and organization.
- `POST /api/auth/logout` — Terminate session.

### Organization & Policies
- `GET /api/organization` — Fetch organization profile and default threshold.
- `PUT /api/organization` — Update name, currency, and default low-stock threshold.

### Products & Inventory
- `GET /api/products` — List products (supports `search`, `status`, `sortBy`, `sortOrder`).
- `GET /api/products/:id` — Get single product details.
- `POST /api/products` — Create a new product.
- `PUT /api/products/:id` — Update existing product.
- `DELETE /api/products/:id` — Permanently delete a product.
- `PATCH /api/products/:id/stock` — Adjust quantity (`add`, `subtract`, or `set`) with audit note.

### Metrics & Diagnostics
- `GET /api/dashboard` — Live aggregates: counts, financial valuations, alerts, recent activity.
- `GET /api/system/info` — Database connectivity status, table counts, tenant verification.
- `GET /api/health` — Service health check.

---

## License

Apache-2.0 License.
