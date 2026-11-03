import { Router, Response } from 'express';
import crypto from 'crypto';
import { getDb } from './db.ts';
import {
  requireAuth,
  hashPassword,
  verifyPassword,
  generateToken,
  AuthRequest,
} from './auth.ts';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION MODULE
// ==========================================

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// POST /api/auth/register
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, organizationName } = req.body;

    // Server-side validations
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required (minimum 2 characters)',
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'A valid email address is required',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match',
      });
    }

    if (!organizationName || typeof organizationName !== 'string' || organizationName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required (minimum 2 characters)',
      });
    }

    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      });
    }

    const orgId = 'org_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const passwordHash = await hashPassword(password);

    // 1. Create Organization
    await db.query(
      `INSERT INTO organizations (id, name, email, currency, default_low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5)`,
      [orgId, organizationName.trim(), cleanEmail, 'USD', 10]
    );

    // 2. Create User linked to this new Organization
    await db.query(
      `INSERT INTO users (id, organization_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, orgId, cleanEmail, passwordHash, fullName.trim(), 'admin']
    );

    // 3. Seed starter sample inventory for great onboarding experience
    const initialProducts = [
      {
        name: 'Logitech MX Master 3S Wireless Mouse',
        sku: 'LOGI-MXM3S',
        desc: 'Ergonomic performance wireless mouse with quiet clicks and 8K DPI sensor',
        qty: 24,
        cost: 65.0,
        sell: 99.99,
        threshold: 8,
      },
      {
        name: 'Keychron Q1 Pro Mechanical Keyboard',
        sku: 'KEY-Q1PRO',
        desc: '75% layout QMK/VIA wireless custom mechanical keyboard, aluminum frame',
        qty: 12,
        cost: 130.0,
        sell: 199.0,
        threshold: 5,
      },
      {
        name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
        sku: 'DELL-U2723QE',
        desc: '4K UHD IPS Black monitor with 90W power delivery hub and RJ45',
        qty: 4,
        cost: 380.0,
        sell: 579.99,
        threshold: 5, // Low stock since qty (4) <= threshold (5)
      },
      {
        name: 'Anker 737 Power Bank (PowerCore 24K)',
        sku: 'ANK-737-PB',
        desc: '24,000mAh 3-port portable charger with 140W smart digital display',
        qty: 0,
        cost: 95.0,
        sell: 149.99,
        threshold: 10, // Out of stock since qty is 0
      },
      {
        name: 'CalDigit TS4 Thunderbolt 4 Dock',
        sku: 'CAL-TS4-DOCK',
        desc: '18-port Thunderbolt 4 dock with 98W host charging and dual 6K display',
        qty: 15,
        cost: 260.0,
        sell: 399.99,
        threshold: 6,
      },
    ];

    for (const p of initialProducts) {
      const prodId = 'prd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await db.query(
        `INSERT INTO products (id, organization_id, name, sku, description, quantity, cost_price, selling_price, low_stock_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [prodId, orgId, p.name, p.sku, p.desc, p.qty, p.cost, p.sell, p.threshold]
      );
    }

    const authenticatedUser = {
      id: userId,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: 'admin',
      organizationId: orgId,
    };

    const token = generateToken(authenticatedUser);

    return res.status(201).json({
      success: true,
      message: 'Account and organization created successfully',
      token,
      user: authenticatedUser,
      organization: {
        id: orgId,
        name: organizationName.trim(),
        currency: 'USD',
        defaultLowStockThreshold: 10,
      },
    });
  } catch (error: any) {
    console.error('[Register Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to a server error. Please try again.',
    });
  }
});

// POST /api/auth/login
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const db = await getDb();
    const cleanEmail = email.toLowerCase().trim();

    const userRes = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.organization_id,
              o.name as org_name, o.currency, o.default_low_stock_threshold
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const authenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      organizationId: user.organization_id,
    };

    const token = generateToken(authenticatedUser);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: authenticatedUser,
      organization: {
        id: user.organization_id,
        name: user.org_name,
        currency: user.currency,
        defaultLowStockThreshold: user.default_low_stock_threshold,
      },
    });
  } catch (error: any) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed due to a server error. Please try again.',
    });
  }
});

// GET /api/auth/me (Get current session)
apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  return res.json({
    success: true,
    user: req.user,
    organization: req.organization,
  });
});

// POST /api/auth/logout
apiRouter.post('/auth/logout', async (_req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ==========================================
// 2. ORGANIZATION & SETTINGS MODULE
// ==========================================

// GET /api/organization
apiRouter.get('/organization', requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const orgRes = await db.query(
      `SELECT id, name, email, currency, default_low_stock_threshold, created_at, updated_at
       FROM organizations WHERE id = $1`,
      [req.user!.organizationId]
    );

    if (orgRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const row = orgRes.rows[0];
    return res.json({
      success: true,
      organization: {
        id: row.id,
        name: row.name,
        email: row.email,
        currency: row.currency,
        defaultLowStockThreshold: row.default_low_stock_threshold,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Get Org Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve organization settings' });
  }
});

// PUT /api/organization
apiRouter.put('/organization', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, currency, defaultLowStockThreshold, email } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Organization name must be at least 2 characters long',
      });
    }

    const thresholdNum = Number(defaultLowStockThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Default low stock threshold must be a non-negative number',
      });
    }

    const db = await getDb();
    const orgRes = await db.query(
      `UPDATE organizations
       SET name = $1,
           currency = $2,
           default_low_stock_threshold = $3,
           email = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, currency, default_low_stock_threshold, updated_at`,
      [
        name.trim(),
        currency || 'USD',
        Math.floor(thresholdNum),
        email ? email.trim() : null,
        req.user!.organizationId,
      ]
    );

    const updated = orgRes.rows[0];
    return res.json({
      success: true,
      message: 'Organization settings updated successfully',
      organization: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        currency: updated.currency,
        defaultLowStockThreshold: updated.default_low_stock_threshold,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Update Org Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update organization settings' });
  }
});

// ==========================================
// 3. PRODUCT & INVENTORY MANAGEMENT MODULE
// ==========================================

// Helper to determine inventory status
function getStockStatus(quantity: number, threshold: number): 'out_of_stock' | 'low_stock' | 'in_stock' {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= threshold) return 'low_stock';
  return 'in_stock';
}

// GET /api/products
apiRouter.get('/products', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organizationId;
    const defaultThreshold = req.organization!.defaultLowStockThreshold;
    const { search, status, sortBy, sortOrder } = req.query;

    const db = await getDb();

    let query = `
      SELECT id, organization_id, name, sku, description, quantity,
             cost_price, selling_price, low_stock_threshold,
             created_at, updated_at
      FROM products
      WHERE organization_id = $1
    `;
    const params: any[] = [orgId];

    if (search && typeof search === 'string' && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    // Sorting
    const validSortCols: Record<string, string> = {
      name: 'name',
      sku: 'sku',
      quantity: 'quantity',
      cost_price: 'cost_price',
      selling_price: 'selling_price',
      created_at: 'created_at',
      updated_at: 'updated_at',
    };

    const sortColumn = validSortCols[String(sortBy)] || 'created_at';
    const direction = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${direction}`;

    const result = await db.query(query, params);

    // Map and enrich with calculated inventory status
    let products = result.rows.map((row) => {
      const effectiveThreshold =
        row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
          ? Number(row.low_stock_threshold)
          : defaultThreshold;

      const qty = Number(row.quantity);
      const inventoryStatus = getStockStatus(qty, effectiveThreshold);

      return {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        sku: row.sku,
        description: row.description || '',
        quantity: qty,
        costPrice: Number(row.cost_price),
        sellingPrice: Number(row.selling_price),
        lowStockThreshold:
          row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
            ? Number(row.low_stock_threshold)
            : null,
        effectiveThreshold,
        inventoryStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    // Optional status filter
    if (status && status !== 'all') {
      products = products.filter((p) => p.inventoryStatus === status);
    }

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    console.error('[Get Products Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
apiRouter.get('/products/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    const defaultThreshold = req.organization!.defaultLowStockThreshold;

    const db = await getDb();
    const result = await db.query(
      `SELECT id, organization_id, name, sku, description, quantity,
              cost_price, selling_price, low_stock_threshold,
              created_at, updated_at
       FROM products
       WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const row = result.rows[0];
    const effectiveThreshold =
      row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
        ? Number(row.low_stock_threshold)
        : defaultThreshold;
    const qty = Number(row.quantity);

    return res.json({
      success: true,
      product: {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        sku: row.sku,
        description: row.description || '',
        quantity: qty,
        costPrice: Number(row.cost_price),
        sellingPrice: Number(row.selling_price),
        lowStockThreshold:
          row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
            ? Number(row.low_stock_threshold)
            : null,
        effectiveThreshold,
        inventoryStatus: getStockStatus(qty, effectiveThreshold),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Get Single Product Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve product details' });
  }
});

// POST /api/products (Create Product)
apiRouter.post('/products', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organizationId;
    const {
      name,
      sku,
      description,
      quantity,
      costPrice,
      sellingPrice,
      lowStockThreshold,
    } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'SKU is required' });
    }

    const cleanSku = sku.trim().toUpperCase();
    const qty = quantity !== undefined && quantity !== '' ? Number(quantity) : 0;
    const cost = costPrice !== undefined && costPrice !== '' ? Number(costPrice) : 0.0;
    const sell = sellingPrice !== undefined && sellingPrice !== '' ? Number(sellingPrice) : 0.0;
    const threshold =
      lowStockThreshold !== undefined && lowStockThreshold !== '' && lowStockThreshold !== null
        ? Number(lowStockThreshold)
        : null;

    if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ success: false, error: 'Quantity must be a non-negative integer' });
    }

    if (isNaN(cost) || cost < 0) {
      return res.status(400).json({ success: false, error: 'Cost price must be a non-negative number' });
    }

    if (isNaN(sell) || sell < 0) {
      return res.status(400).json({ success: false, error: 'Selling price must be a non-negative number' });
    }

    if (threshold !== null && (isNaN(threshold) || threshold < 0 || !Number.isInteger(threshold))) {
      return res.status(400).json({
        success: false,
        error: 'Low stock threshold must be a non-negative integer or left empty',
      });
    }

    const db = await getDb();

    // 2. Prevent duplicate SKU within the same organization
    const skuCheck = await db.query(
      `SELECT id FROM products WHERE organization_id = $1 AND sku = $2`,
      [orgId, cleanSku]
    );

    if (skuCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `A product with SKU "${cleanSku}" already exists in your organization. SKUs must be unique.`,
      });
    }

    const newId = 'prd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const insertRes = await db.query(
      `INSERT INTO products (
        id, organization_id, name, sku, description, quantity,
        cost_price, selling_price, low_stock_threshold
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        newId,
        orgId,
        name.trim(),
        cleanSku,
        description ? description.trim() : '',
        qty,
        cost,
        sell,
        threshold,
      ]
    );

    // Record initial inventory log if quantity > 0
    if (qty > 0) {
      const logId = 'log_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await db.query(
        `INSERT INTO inventory_logs (
          id, organization_id, product_id, user_id, previous_quantity, new_quantity, change_amount, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [logId, orgId, newId, req.user!.id, 0, qty, qty, 'Initial stock entry']
      );
    }

    const row = insertRes.rows[0];
    const effectiveThreshold =
      row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : req.organization!.defaultLowStockThreshold;

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        sku: row.sku,
        description: row.description,
        quantity: Number(row.quantity),
        costPrice: Number(row.cost_price),
        sellingPrice: Number(row.selling_price),
        lowStockThreshold: row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : null,
        effectiveThreshold,
        inventoryStatus: getStockStatus(Number(row.quantity), effectiveThreshold),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Create Product Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// PUT /api/products/:id (Update Product)
apiRouter.put('/products/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    const {
      name,
      sku,
      description,
      quantity,
      costPrice,
      sellingPrice,
      lowStockThreshold,
    } = req.body;

    const db = await getDb();

    // Check existing
    const existingRes = await db.query(
      `SELECT * FROM products WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found or access denied' });
    }

    const currentProduct = existingRes.rows[0];

    // Validations
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'SKU is required' });
    }

    const cleanSku = sku.trim().toUpperCase();
    const qty = quantity !== undefined ? Number(quantity) : Number(currentProduct.quantity);
    const cost = costPrice !== undefined ? Number(costPrice) : Number(currentProduct.cost_price);
    const sell = sellingPrice !== undefined ? Number(sellingPrice) : Number(currentProduct.selling_price);
    const threshold =
      lowStockThreshold !== undefined && lowStockThreshold !== '' && lowStockThreshold !== null
        ? Number(lowStockThreshold)
        : null;

    if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      return res.status(400).json({ success: false, error: 'Quantity must be a non-negative integer' });
    }

    if (isNaN(cost) || cost < 0) {
      return res.status(400).json({ success: false, error: 'Cost price must be a non-negative number' });
    }

    if (isNaN(sell) || sell < 0) {
      return res.status(400).json({ success: false, error: 'Selling price must be a non-negative number' });
    }

    if (threshold !== null && (isNaN(threshold) || threshold < 0 || !Number.isInteger(threshold))) {
      return res.status(400).json({
        success: false,
        error: 'Low stock threshold must be a non-negative integer or left empty',
      });
    }

    // Check SKU duplicate (excluding self)
    const skuCheck = await db.query(
      `SELECT id FROM products WHERE organization_id = $1 AND sku = $2 AND id != $3`,
      [orgId, cleanSku, id]
    );

    if (skuCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Another product with SKU "${cleanSku}" already exists in your organization.`,
      });
    }

    const prevQty = Number(currentProduct.quantity);
    const qtyDiff = qty - prevQty;

    const updateRes = await db.query(
      `UPDATE products
       SET name = $1,
           sku = $2,
           description = $3,
           quantity = $4,
           cost_price = $5,
           selling_price = $6,
           low_stock_threshold = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND organization_id = $9
       RETURNING *`,
      [
        name.trim(),
        cleanSku,
        description !== undefined ? description.trim() : currentProduct.description,
        qty,
        cost,
        sell,
        threshold,
        id,
        orgId,
      ]
    );

    // If quantity changed, log audit trail
    if (qtyDiff !== 0) {
      const logId = 'log_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await db.query(
        `INSERT INTO inventory_logs (
          id, organization_id, product_id, user_id, previous_quantity, new_quantity, change_amount, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          logId,
          orgId,
          id,
          req.user!.id,
          prevQty,
          qty,
          qtyDiff,
          'Product updated via edit form',
        ]
      );
    }

    const row = updateRes.rows[0];
    const effectiveThreshold =
      row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : req.organization!.defaultLowStockThreshold;

    return res.json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        sku: row.sku,
        description: row.description,
        quantity: Number(row.quantity),
        costPrice: Number(row.cost_price),
        sellingPrice: Number(row.selling_price),
        lowStockThreshold: row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : null,
        effectiveThreshold,
        inventoryStatus: getStockStatus(Number(row.quantity), effectiveThreshold),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Update Product Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (Delete Product)
apiRouter.delete('/products/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;

    const db = await getDb();

    // Verify ownership
    const check = await db.query(
      `SELECT id, name, sku FROM products WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found or access denied' });
    }

    const prod = check.rows[0];

    // Delete product (cascades logs if configured, or delete explicitly)
    await db.query(`DELETE FROM products WHERE id = $1 AND organization_id = $2`, [id, orgId]);

    return res.json({
      success: true,
      message: `Product "${prod.name}" (${prod.sku}) deleted successfully`,
    });
  } catch (error: any) {
    console.error('[Delete Product Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// PATCH /api/products/:id/stock (Direct Stock Adjustment)
apiRouter.patch('/products/:id/stock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    const { adjustmentType, amount, newQuantity, reason } = req.body;

    const db = await getDb();

    const check = await db.query(
      `SELECT * FROM products WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const prod = check.rows[0];
    const prevQty = Number(prod.quantity);
    let finalQty = prevQty;

    if (adjustmentType === 'set') {
      if (newQuantity === undefined || isNaN(Number(newQuantity)) || Number(newQuantity) < 0) {
        return res.status(400).json({ success: false, error: 'New quantity must be a non-negative number' });
      }
      finalQty = Math.floor(Number(newQuantity));
    } else if (adjustmentType === 'add') {
      const addAmount = Number(amount);
      if (isNaN(addAmount) || addAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Addition amount must be positive' });
      }
      finalQty = prevQty + Math.floor(addAmount);
    } else if (adjustmentType === 'subtract') {
      const subAmount = Number(amount);
      if (isNaN(subAmount) || subAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Subtraction amount must be positive' });
      }
      finalQty = prevQty - Math.floor(subAmount);
      if (finalQty < 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot reduce stock below zero. Current stock is ${prevQty}.`,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid adjustment type. Use "add", "subtract", or "set".',
      });
    }

    const changeAmount = finalQty - prevQty;

    const updateRes = await db.query(
      `UPDATE products
       SET quantity = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [finalQty, id, orgId]
    );

    // Audit log
    const logId = 'log_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await db.query(
      `INSERT INTO inventory_logs (
        id, organization_id, product_id, user_id, previous_quantity, new_quantity, change_amount, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        logId,
        orgId,
        id,
        req.user!.id,
        prevQty,
        finalQty,
        changeAmount,
        reason ? reason.trim() : 'Manual stock adjustment',
      ]
    );

    const row = updateRes.rows[0];
    const effectiveThreshold =
      row.low_stock_threshold !== null ? Number(row.low_stock_threshold) : req.organization!.defaultLowStockThreshold;

    return res.json({
      success: true,
      message: `Stock updated for ${row.name}: ${prevQty} → ${finalQty}`,
      product: {
        id: row.id,
        name: row.name,
        sku: row.sku,
        quantity: finalQty,
        effectiveThreshold,
        inventoryStatus: getStockStatus(finalQty, effectiveThreshold),
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Adjust Stock Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

// ==========================================
// 4. DASHBOARD METRICS MODULE
// ==========================================

// GET /api/dashboard
apiRouter.get('/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.organizationId;
    const defaultThreshold = req.organization!.defaultLowStockThreshold;
    const db = await getDb();

    // Fetch all products for the org to calculate accurate real-time aggregates
    const productsRes = await db.query(
      `SELECT id, name, sku, quantity, cost_price, selling_price, low_stock_threshold, created_at, updated_at
       FROM products
       WHERE organization_id = $1
       ORDER BY updated_at DESC`,
      [orgId]
    );

    const rows = productsRes.rows;
    const totalProducts = rows.length;
    let totalStockUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    const enrichedProducts = rows.map((r) => {
      const qty = Number(r.quantity);
      const cost = Number(r.cost_price);
      const sell = Number(r.selling_price);
      const threshold =
        r.low_stock_threshold !== null && r.low_stock_threshold !== undefined
          ? Number(r.low_stock_threshold)
          : defaultThreshold;

      totalStockUnits += qty;
      totalCostValue += qty * cost;
      totalRetailValue += qty * sell;

      const status = getStockStatus(qty, threshold);
      if (status === 'out_of_stock') {
        outOfStockCount++;
      } else if (status === 'low_stock') {
        lowStockCount++;
      } else {
        inStockCount++;
      }

      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        quantity: qty,
        costPrice: cost,
        sellingPrice: sell,
        effectiveThreshold: threshold,
        inventoryStatus: status,
        updatedAt: r.updated_at,
      };
    });

    // Low stock items table (both out of stock and low stock, prioritized)
    const alertProducts = enrichedProducts
      .filter((p) => p.inventoryStatus === 'out_of_stock' || p.inventoryStatus === 'low_stock')
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 8);

    // Recent 5 products
    const recentProducts = enrichedProducts.slice(0, 5);

    // Recent stock activity logs
    const logsRes = await db.query(
      `SELECT l.id, l.previous_quantity, l.new_quantity, l.change_amount, l.reason, l.created_at,
              p.name as product_name, p.sku as product_sku,
              u.full_name as user_name
       FROM inventory_logs l
       JOIN products p ON l.product_id = p.id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.organization_id = $1
       ORDER BY l.created_at DESC
       LIMIT 6`,
      [orgId]
    );

    return res.json({
      success: true,
      metrics: {
        totalProducts,
        totalStockUnits,
        totalCostValue: Number(totalCostValue.toFixed(2)),
        totalRetailValue: Number(totalRetailValue.toFixed(2)),
        lowStockCount,
        outOfStockCount,
        inStockCount,
      },
      alertProducts,
      recentProducts,
      recentActivity: logsRes.rows.map((log) => ({
        id: log.id,
        productName: log.product_name,
        productSku: log.product_sku,
        userName: log.user_name || 'System',
        previousQuantity: Number(log.previous_quantity),
        newQuantity: Number(log.new_quantity),
        changeAmount: Number(log.change_amount),
        reason: log.reason,
        createdAt: log.created_at,
      })),
      organization: req.organization,
    });
  } catch (error: any) {
    console.error('[Dashboard Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate dashboard metrics' });
  }
});

// ==========================================
// 5. SYSTEM & ARCHITECTURE AUDIT MODULE
// ==========================================

// GET /api/system/info
apiRouter.get('/system/info', requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const orgId = req.user!.organizationId;

    const countUsers = await db.query('SELECT count(*) as c FROM users WHERE organization_id = $1', [orgId]);
    const countProducts = await db.query('SELECT count(*) as c FROM products WHERE organization_id = $1', [orgId]);
    const countLogs = await db.query('SELECT count(*) as c FROM inventory_logs WHERE organization_id = $1', [orgId]);

    return res.json({
      success: true,
      database: {
        engine: 'PostgreSQL Relational Database',
        type: db.type,
        details: db.details,
        multiTenancy: 'Enforced organization_id foreign key & row isolation',
        passwordEncryption: 'bcrypt (salt rounds = 10)',
        tables: {
          organizations: 1,
          users: Number(countUsers.rows[0]?.c || 0),
          products: Number(countProducts.rows[0]?.c || 0),
          inventory_logs: Number(countLogs.rows[0]?.c || 0),
        },
      },
      currentTenant: {
        organizationId: orgId,
        organizationName: req.organization!.name,
        userEmail: req.user!.email,
      },
    });
  } catch (error: any) {
    console.error('[System Info Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve system info' });
  }
});
