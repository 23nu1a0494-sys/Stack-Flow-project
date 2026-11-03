/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { SettingsView } from './components/settings/SettingsView';
import { ArchitectureView } from './components/architecture/ArchitectureView';
import { ProductFormModal } from './components/products/ProductFormModal';
import { StockAdjustModal } from './components/products/StockAdjustModal';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { api } from './lib/api';
import { Product, DashboardData } from './types';

function MainApp() {
  const { user, isLoading: authLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load all data
  const loadData = useCallback(async () => {
    if (!user) return;
    setIsFetchingData(true);
    try {
      const [dashRes, prodsRes] = await Promise.all([
        api.getDashboard(),
        api.getProducts(),
      ]);
      setDashboardData(dashRes);
      setProducts(prodsRes.products || []);
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      addToast('error', err.message || 'Failed to fetch inventory records');
    } finally {
      setIsFetchingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Handle Add Product
  const handleCreateProduct = async (payload: {
    name: string;
    sku: string;
    description: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    lowStockThreshold: number | null;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await api.createProduct(payload);
      if (res.success) {
        addToast('success', `Product "${res.product.name}" added successfully!`);
        setIsAddModalOpen(false);
        await loadData();
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Product
  const handleUpdateProduct = async (payload: {
    name: string;
    sku: string;
    description: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    lowStockThreshold: number | null;
  }) => {
    if (!productToEdit) return;
    setIsSubmitting(true);
    try {
      const res = await api.updateProduct(productToEdit.id, payload);
      if (res.success) {
        addToast('success', `Product "${res.product.name}" updated successfully!`);
        setProductToEdit(null);
        await loadData();
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await api.deleteProduct(productToDelete.id);
      if (res.success) {
        addToast('success', res.message || 'Product removed from database');
        setProductToDelete(null);
        await loadData();
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Direct Stock Adjustment
  const handleAdjustStock = async (payload: {
    adjustmentType: 'add' | 'subtract' | 'set';
    amount?: number;
    newQuantity?: number;
    reason?: string;
  }) => {
    if (!productToAdjust) return;
    setIsSubmitting(true);
    try {
      const res = await api.adjustStock(productToAdjust.id, payload);
      if (res.success) {
        addToast('success', res.message || 'Stock updated successfully');
        setProductToAdjust(null);
        await loadData();
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-white">StockFlow SaaS</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to PostgreSQL engine...</p>
      </div>
    );
  }

  // Not logged in -> Show Auth Page
  if (!user) {
    return (
      <>
        <AuthPage onSuccessToast={(msg) => addToast('success', msg)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Navbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onAddProduct={() => setIsAddModalOpen(true)}
          onRefresh={loadData}
          isRefreshing={isFetchingData}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              isLoading={isFetchingData && !dashboardData}
              onNavigateToProducts={() => setCurrentTab('products')}
              onOpenAddProduct={() => setIsAddModalOpen(true)}
              onOpenStockAdjust={(prod) => setProductToAdjust(prod)}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              isLoading={isFetchingData && products.length === 0}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenEditModal={(prod) => setProductToEdit(prod)}
              onOpenDeleteModal={(prod) => setProductToDelete(prod)}
              onOpenStockAdjustModal={(prod) => setProductToAdjust(prod)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onSuccessToast={(msg) => {
                addToast('success', msg);
                loadData();
              }}
              onErrorToast={(msg) => addToast('error', msg)}
            />
          )}

          {currentTab === 'architecture' && <ArchitectureView />}
        </main>
      </div>

      {/* Product Form Modal (Add) */}
      <ProductFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateProduct}
        productToEdit={null}
        isLoading={isSubmitting}
      />

      {/* Product Form Modal (Edit) */}
      <ProductFormModal
        isOpen={!!productToEdit}
        onClose={() => setProductToEdit(null)}
        onSubmit={handleUpdateProduct}
        productToEdit={productToEdit}
        isLoading={isSubmitting}
      />

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={!!productToAdjust}
        onClose={() => setProductToAdjust(null)}
        product={productToAdjust}
        onAdjust={handleAdjustStock}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product from Inventory"
        message={`Are you sure you want to delete "${productToDelete?.name}" (${productToDelete?.sku})? This will permanently remove its catalog entry and stock records.`}
        confirmText="Permanently Delete"
        isLoading={isSubmitting}
      />

      {/* Toast System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
