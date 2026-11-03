import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { StatusBadge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  Layers,
  DollarSign,
  AlertTriangle,
  X,
  Package,
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  isLoading: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
  onOpenDeleteModal: (product: Product) => void;
  onOpenStockAdjustModal: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  isLoading,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onOpenStockAdjustModal,
}) => {
  const { organization } = useAuth();
  const currencySymbol = organization?.currency || 'USD';

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'quantity' | 'costPrice' | 'sellingPrice' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort client-side
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter: checks name, sku, and description
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query);

        // Status filter
        const matchesStatus = statusFilter === 'all' || p.inventoryStatus === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleToggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by Name or SKU..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Add Product button */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Status Filter Pills & Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            {(
              [
                { id: 'all', label: 'All Items' },
                { id: 'in_stock', label: 'In Stock' },
                { id: 'low_stock', label: 'Low Stock' },
                { id: 'out_of_stock', label: 'Out of Stock' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Product Name</option>
              <option value="sku">SKU Code</option>
              <option value="quantity">Stock Quantity</option>
              <option value="costPrice">Cost Price</option>
              <option value="sellingPrice">Selling Price</option>
            </select>
            <button
              onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
              className="p-1 text-slate-400 hover:text-white rounded border border-slate-700/80 bg-slate-950/80"
              title={`Sort order: ${sortOrder.toUpperCase()}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading inventory products from PostgreSQL...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No products found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or status filter to find what you are looking for.'
                : 'Get started by creating your first product record in this multi-tenant organization.'}
            </p>
            {searchQuery || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Product</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white"
                    onClick={() => handleToggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Product Info</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white"
                    onClick={() => handleToggleSort('sku')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>SKU</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white"
                    onClick={() => handleToggleSort('quantity')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Stock on Hand</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Threshold</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white"
                    onClick={() => handleToggleSort('costPrice')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cost Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white"
                    onClick={() => handleToggleSort('sellingPrice')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Selling Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Product Name & Description */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{prod.name}</div>
                      {prod.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {prod.description}
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                        {prod.sku}
                      </span>
                    </td>

                    {/* Stock on Hand */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{prod.quantity}</span>
                        <span className="text-[11px] text-slate-500">units</span>
                      </div>
                    </td>

                    {/* Threshold */}
                    <td className="py-3.5 px-4 text-xs">
                      {prod.lowStockThreshold !== null ? (
                        <span className="text-slate-300 font-medium">
                          {prod.lowStockThreshold} units
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          Org ({prod.effectiveThreshold})
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={prod.inventoryStatus} size="sm" />
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {currencySymbol} {prod.costPrice.toFixed(2)}
                    </td>

                    {/* Selling */}
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-white">
                      {currencySymbol} {prod.sellingPrice.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenStockAdjustModal(prod)}
                          title="Quick Stock Adjustment (+ / -)"
                          className="p-1.5 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-lg transition-colors border border-indigo-500/20"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenEditModal(prod)}
                          title="Edit Product"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenDeleteModal(prod)}
                          title="Delete Product"
                          className="p-1.5 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-lg transition-colors border border-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer with count */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>
            Showing <strong className="text-white">{filteredProducts.length}</strong> of{' '}
            <strong className="text-white">{products.length}</strong> total products
          </span>
          <span className="text-[11px] text-slate-500">Multi-tenant PostgreSQL Row Isolation</span>
        </div>
      </div>
    </div>
  );
};
