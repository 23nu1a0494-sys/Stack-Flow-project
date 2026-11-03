import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  type: 'external-postgres' | 'embedded-postgres';
  details: string;
}

let dbInstance: DatabaseAdapter | null = null;

export async function getDb(): Promise<DatabaseAdapter> {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;

  // Attempt external PostgreSQL connection if DATABASE_URL or PGHOST is explicitly set
  // and not pointing to localhost if we don't have local PG running
  if (databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')) {
    try {
      const parsedUrl = new URL(databaseUrl);
      const isSupabase = parsedUrl.host.includes('supabase');
      const providerLabel = isSupabase ? 'Supabase PostgreSQL' : 'External PostgreSQL';

      console.log(`[Database] Attempting connection to ${providerLabel} (${parsedUrl.host})...`);
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        max: 10,
      });

      // Prevent unhandled errors on idle clients
      pool.on('error', (err) => {
        console.error('[PostgreSQL Pool Client Error]:', err.message);
      });

      // Verification test query
      const res = await pool.query('SELECT NOW() as now, version() as version');
      console.log(`[Database] Connected to ${providerLabel} successfully at ${res.rows[0].now}`);

      dbInstance = {
        type: 'external-postgres',
        details: `${providerLabel} (${parsedUrl.host}:${parsedUrl.port || '5432'})`,
        async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
          const result = await pool.query(sql, params);
          return { rows: result.rows as T[], rowCount: result.rowCount ?? undefined };
        },
      };

      await initializeSchema(dbInstance);
      return dbInstance;
    } catch (err: any) {
      console.error('[Database] Failed to connect to external PostgreSQL:', err.message);
      console.warn('[Database] Falling back to embedded PostgreSQL...');
    }
  }

  // Use embedded PostgreSQL engine (PGlite WASM) with persistent storage
  console.log('[Database] Initializing persistent Embedded PostgreSQL (PGlite)...');
  const dataDir = path.resolve(process.cwd(), 'data', 'stockflow-pg');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  console.log('[Database] Embedded PostgreSQL (PGlite) ready at', dataDir);

  dbInstance = {
    type: 'embedded-postgres',
    details: 'Embedded PostgreSQL instance (PGlite WASM) with persistent disk storage',
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const result = await pglite.query(sql, params);
      return { rows: (result.rows || []) as T[], rowCount: result.rows ? result.rows.length : 0 };
    },
  };

  await initializeSchema(dbInstance);
  return dbInstance;
}

async function initializeSchema(db: DatabaseAdapter) {
  console.log('[Database] Initializing relational schema and tables...');

  // 1. Organizations table
  await db.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      default_low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Users table
  await db.query(`
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
  `);

  // 3. Products table
  await db.query(`
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
  `);

  // 4. Inventory logs for audit history
  await db.query(`
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
  `);

  // Indexes
  await db.query(`CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_logs_org_prod ON inventory_logs(organization_id, product_id);`);

  console.log('[Database] Schema successfully verified and ready.');
}
