import React from 'react';
import { Menu, Plus, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavTab;
  onOpenMobileMenu: () => void;
  onAddProduct: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onAddProduct,
  onRefresh,
  isRefreshing = false,
}) => {
  const { organization } = useAuth();

  const titleMap: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Real-time inventory metrics, stock health, and recent operations',
    },
    products: {
      title: 'Product Catalog',
      subtitle: 'Manage products, SKUs, pricing, and stock threshold boundaries',
    },
    settings: {
      title: 'Organization Settings',
      subtitle: 'Configure multi-tenant organization profile and stock policies',
    },
    architecture: {
      title: 'Architecture & PostgreSQL Inspector',
      subtitle: 'Live verification of multi-tenant PostgreSQL schema and security',
    },
  };

  const { title, subtitle } = titleMap[currentTab];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{title}</h1>
              {organization && (
                <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {organization.name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 hidden sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all disabled:opacity-50"
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          <button
            onClick={onAddProduct}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
};
