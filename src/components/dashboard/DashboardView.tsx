import React from 'react';
import { DashboardData, Product } from '../../types';
import { StatusBadge } from '../common/Badge';
import {
  Boxes,
  Layers,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  Plus,
} from 'lucide-react';

interface DashboardViewProps {
  data: DashboardData | null;
  isLoading: boolean;
  onNavigateToProducts: () => void;
  onOpenAddProduct: () => void;
  onOpenStockAdjust: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  isLoading,
  onNavigateToProducts,
  onOpenAddProduct,
  onOpenStockAdjust,
}) => {
  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/60 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-800/60 rounded-2xl border border-slate-800" />
          <div className="h-72 bg-slate-800/60 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  const { metrics, alertProducts, recentProducts, recentActivity, organization } = data;
  const currencySymbol = organization?.currency || 'USD';

  // Distribution calculations
  const totalItems = metrics.totalProducts || 1;
  const inStockPct = Math.round((metrics.inStockCount / totalItems) * 100);
  const lowStockPct = Math.round((metrics.lowStockCount / totalItems) * 100);
  const outOfStockPct = Math.round((metrics.outOfStockCount / totalItems) * 100);

  // Financial Margin calculations
  const marginGross = metrics.totalRetailValue - metrics.totalCostValue;
  const marginPct =
    metrics.totalRetailValue > 0
      ? ((marginGross / metrics.totalRetailValue) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Organization Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-slate-800 p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Active Multi-Tenant Organization
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{organization.name}</h2>
            <p className="text-xs text-slate-400">
              Default Low Stock Alert Threshold:{' '}
              <span className="font-semibold text-slate-200">
                {organization.defaultLowStockThreshold} units
              </span>{' '}
              • Base Currency:{' '}
              <span className="font-semibold text-slate-200">{currencySymbol}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAddProduct}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
            <button
              onClick={onNavigateToProducts}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-colors"
            >
              <span>View All Inventory</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Requirement Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Products</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white tracking-tight">{metrics.totalProducts}</div>
            <p className="text-xs text-slate-400 mt-1">Unique catalog SKUs managed</p>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Stock Units</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white tracking-tight">{metrics.totalStockUnits}</div>
            <p className="text-xs text-slate-400 mt-1">Total physical units on hand</p>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Low Stock Alert</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-400 tracking-tight">{metrics.lowStockCount}</div>
            <p className="text-xs text-slate-400 mt-1">Units ≤ individual/org threshold</p>
          </div>
        </div>

        {/* Out of Stock Products */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Out of Stock</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-400 tracking-tight">{metrics.outOfStockCount}</div>
            <p className="text-xs text-slate-400 mt-1">Depleted inventory (0 units)</p>
          </div>
        </div>
      </div>

      {/* Inventory Financial & Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Valuation Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Inventory Valuation</h3>
            <span className="text-xs text-slate-500 font-mono">Live DB Calc</span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-400">Cost Basis (Asset Value)</span>
              <span className="text-base font-bold text-white">
                {currencySymbol} {metrics.totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-400">Projected Retail Value</span>
              <span className="text-base font-bold text-indigo-400">
                {currencySymbol} {metrics.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div>
                <span className="text-xs text-emerald-400 font-medium block">Potential Gross Margin</span>
                <span className="text-[10px] text-emerald-400/80">Rate: {marginPct}%</span>
              </div>
              <span className="text-base font-bold text-emerald-400">
                +{currencySymbol} {marginGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Health Distribution Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stock Health Distribution</h3>
            <span className="text-xs text-slate-400">
              {metrics.totalProducts} total registered products
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${inStockPct}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`In Stock: ${metrics.inStockCount}`}
              />
              <div
                style={{ width: `${lowStockPct}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Low Stock: ${metrics.lowStockCount}`}
              />
              <div
                style={{ width: `${outOfStockPct}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Out of Stock: ${metrics.outOfStockCount}`}
              />
            </div>

            {/* Distribution Legend */}
            <div className="grid grid-cols-3 gap-2 pt-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-xs text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  In Stock
                </div>
                <div className="text-lg font-bold text-white">{metrics.inStockCount}</div>
                <div className="text-[10px] text-slate-500">{inStockPct}% of catalog</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-xs text-amber-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Low Stock
                </div>
                <div className="text-lg font-bold text-amber-400">{metrics.lowStockCount}</div>
                <div className="text-[10px] text-slate-500">{lowStockPct}% of catalog</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-xs text-rose-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Out of Stock
                </div>
                <div className="text-lg font-bold text-rose-400">{metrics.outOfStockCount}</div>
                <div className="text-[10px] text-slate-500">{outOfStockPct}% of catalog</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Stock Attention Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Priority Restock Queue
              </h3>
              <p className="text-xs text-slate-400">
                Products currently low in stock or completely out of stock
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToProducts}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {alertProducts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">All Stock Levels Healthy</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No products are currently under their low stock threshold or out of stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Stock on Hand</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {alertProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{prod.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{prod.sku}</td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-sm text-white">{prod.quantity}</span> units
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      ≤ {prod.effectiveThreshold} units
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={prod.inventoryStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenStockAdjust(prod)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/40 border border-indigo-500/30 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Section: Recent Products & Inventory Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              Recently Added Products
            </h3>
            <button
              onClick={onNavigateToProducts}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Catalog
            </button>
          </div>

          {recentProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No products added yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-white truncate">{prod.name}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">{prod.sku}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">{prod.quantity} in stock</div>
                      <div className="text-[11px] text-slate-400">
                        {currencySymbol} {prod.sellingPrice.toFixed(2)}
                      </div>
                    </div>
                    <StatusBadge status={prod.inventoryStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Activity Logs */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recent Inventory Audit Logs
            </h3>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Automatic Trail
            </span>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No stock adjustment logs recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentActivity.map((log) => {
                const isPositive = log.changeAmount >= 0;
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-white truncate">{log.productName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{log.reason || 'Manual update'}</p>
                      <p className="text-[10px] text-slate-500">
                        By {log.userName} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <span
                        className={`inline-block font-bold text-xs px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isPositive ? `+${log.changeAmount}` : log.changeAmount}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {log.previousQuantity} → {log.newQuantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
