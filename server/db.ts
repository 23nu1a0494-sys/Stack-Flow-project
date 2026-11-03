
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface DatabaseAdapter {
  query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<QueryResult<T>>;
  type: 'external-postgres';
  details: string;
}

let dbInstance: DatabaseAdapter | null = null;
let poolInstance: InstanceType<typeof Pool> | null = null;

export async function getDb(): Promise<DatabaseAdapter> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing. Configure your PostgreSQL connection string.'
    );
  }

  const parsedUrl = new URL(databaseUrl);

  const isLocal =
    parsedUrl.hostname === 'localhost' ||
    parsedUrl.hostname === '127.0.0.1';

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]:', err.message);
  });

  try {
    console.log('[Database] Connecting to PostgreSQL...');

    const result = await pool.query(
      'SELECT NOW() AS now, version() AS version'
    );

    console.log(
      '[Database] PostgreSQL connected successfully:',
      result.rows[0].now
    );

    const adapter: DatabaseAdapter = {
      type: 'external-postgres',
      details: `PostgreSQL (${parsedUrl.hostname})`,

      async query<T = any>(
        sql: string,
        params?: any[]
      ): Promise<QueryResult<T>> {
        const queryResult = await pool.query(sql, params);

        return {
          rows: queryResult.rows as T[],
          rowCount: queryResult.rowCount ?? undefined,
        };
      },
    };

    await initializeSchema(adapter);

    poolInstance = pool;
    dbInstance = adapter;

    console.log('[Database] Schema initialized successfully.');

    return dbInstance;
  } catch (error: any) {
    await pool.end();

    console.error(
      '[Database] PostgreSQL initialization failed:',
      error.message
    );

    throw error;
  }
}

async function initializeSchema(db: DatabaseAdapter) {
  console.log('[Database] Initializing database tables...');

  // 1. Organizations table
  await db.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      default_low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
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
      organization_id TEXT NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 0
        CHECK (quantity >= 0),
      cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (cost_price >= 0),
      selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (selling_price >= 0),
      low_stock_threshold INTEGER
        CHECK (
          low_stock_threshold IS NULL
          OR low_stock_threshold >= 0
        ),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_org_sku UNIQUE (organization_id, sku)
    );
  `);

  // 4. Inventory logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,
      user_id TEXT
        REFERENCES users(id) ON DELETE SET NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      change_amount INTEGER NOT NULL,
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Database indexes
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_org
    ON users(organization_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_products_org
    ON products(organization_id);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_products_org_sku
    ON products(organization_id, sku);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_logs_org_prod
    ON inventory_logs(organization_id, product_id);
  `);

  console.log('[Database] All tables and indexes are ready.');
}
