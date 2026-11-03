export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  email?: string | null;
  currency: string;
  defaultLowStockThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  description: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number | null;
  effectiveThreshold: number;
  inventoryStatus: InventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog {
  id: string;
  productName: string;
  productSku: string;
  userName: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  reason: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalStockUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  alertProducts: Product[];
  recentProducts: Product[];
  recentActivity: InventoryLog[];
  organization: Organization;
}

export interface SystemInfo {
  database: {
    engine: string;
    type: string;
    details: string;
    multiTenancy: string;
    passwordEncryption: string;
    tables: {
      organizations: number;
      users: number;
      products: number;
      inventory_logs: number;
    };
  };
  currentTenant: {
    organizationId: string;
    organizationName: string;
    userEmail: string;
  };
}
