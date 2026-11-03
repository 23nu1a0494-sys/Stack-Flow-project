import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getDb } from './db.ts';

dotenv.config();

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'stockflow-jwt-assessment-secret-key-2026';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
}

export interface AuthenticatedOrganization {
  id: string;
  name: string;
  currency: string;
  defaultLowStockThreshold: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  organization?: AuthenticatedOrganization;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication token is missing',
      });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      email: string;
      organizationId: string;
      role: string;
    };

    const db = await getDb();

    // Verify user exists
    const userRes = await db.query(
      `SELECT id, email, full_name, role, organization_id FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User account not found or has been removed',
      });
    }

    const dbUser = userRes.rows[0];

    // Verify organization exists
    const orgRes = await db.query(
      `SELECT id, name, currency, default_low_stock_threshold FROM organizations WHERE id = $1`,
      [dbUser.organization_id]
    );

    if (orgRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Organization not found',
      });
    }

    const dbOrg = orgRes.rows[0];

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role,
      organizationId: dbUser.organization_id,
    };

    req.organization = {
      id: dbOrg.id,
      name: dbOrg.name,
      currency: dbOrg.currency,
      defaultLowStockThreshold: dbOrg.default_low_stock_threshold,
    };

    next();
  } catch (err: any) {
    console.error('[Auth Error]', err.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired authentication token',
    });
  }
}
