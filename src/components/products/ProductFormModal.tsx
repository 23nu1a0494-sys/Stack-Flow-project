import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, DollarSign, Hash, Layers, Tag, FileText } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    sku: string;
    description: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    lowStockThreshold: number | null;
  }) => Promise<void>;
  productToEdit?: Product | null;
  isLoading?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  isLoading = false,
}) => {
  const { organization } = useAuth();
  const defaultOrgThreshold = organization?.defaultLowStockThreshold ?? 10;
  const currencySymbol = organization?.currency || 'USD';

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<string>('0');
  const [costPrice, setCostPrice] = useState<string>('0.00');
  const [sellingPrice, setSellingPrice] = useState<string>('0.00');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setDescription(productToEdit.description || '');
      setQuantity(String(productToEdit.quantity));
      setCostPrice(String(productToEdit.costPrice));
      setSellingPrice(String(productToEdit.sellingPrice));
      setLowStockThreshold(
        productToEdit.lowStockThreshold !== null && productToEdit.lowStockThreshold !== undefined
          ? String(productToEdit.lowStockThreshold)
          : ''
      );
    } else {
      setName('');
      setSku('');
      setDescription('');
      setQuantity('0');
      setCostPrice('0.00');
      setSellingPrice('0.00');
      setLowStockThreshold('');
    }
    setError(null);
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product Name is required');
      return;
    }

    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum < 0 || !Number.isInteger(qtyNum)) {
      setError('Quantity on hand must be a non-negative whole number (0, 1, 2, ...)');
      return;
    }

    const costNum = Number(costPrice);
    if (isNaN(costNum) || costNum < 0) {
      setError('Cost price must be a valid non-negative number');
      return;
    }

    const sellNum = Number(sellingPrice);
    if (isNaN(sellNum) || sellNum < 0) {
      setError('Selling price must be a valid non-negative number');
      return;
    }

    let threshNum: number | null = null;
    if (lowStockThreshold.trim() !== '') {
      const parsed = Number(lowStockThreshold);
      if (isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        setError('Low stock threshold must be a non-negative whole number');
        return;
      }
      threshNum = parsed;
    }

    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        description: description.trim(),
        quantity: qtyNum,
        costPrice: costNum,
        sellingPrice: sellNum,
        lowStockThreshold: threshNum,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  // Live financial preview calculations
  const parsedCost = Math.max(0, Number(costPrice) || 0);
  const parsedSell = Math.max(0, Number(sellingPrice) || 0);
  const parsedQty = Math.max(0, Number(quantity) || 0);
  const unitProfit = parsedSell - parsedCost;
  const marginPercent = parsedSell > 0 ? ((unitProfit / parsedSell) * 100).toFixed(1) : '0';
  const totalCostVal = parsedCost * parsedQty;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product Details' : 'Add New Inventory Product'}
      description={
        productToEdit
          ? `Updating product SKU: ${productToEdit.sku}`
          : 'Create a new product with inventory controls and multi-tenant isolation'
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ergonomic Office Chair"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Stock Keeping Unit (SKU) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. CHR-ERG-01"
                className="w-full pl-9 pr-3 py-2 font-mono uppercase bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Must be unique within your organization</p>
          </div>

          {/* Quantity on hand */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Quantity on Hand <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Layers className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Non-negative whole integer</p>
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cost Price ({currencySymbol}) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Selling Price ({currencySymbol}) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder={`Leave empty to inherit organization default (${defaultOrgThreshold} units)`}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              When stock drops to or below this quantity, it will be flagged with a Low Stock badge and alert on your dashboard.
            </p>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Description <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add specifications, supplier details, or notes..."
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Live Financial Metrics Strip */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Unit Margin</span>
            <span className={`font-semibold ${unitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currencySymbol} {unitProfit.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Margin Rate</span>
            <span className={`font-semibold ${Number(marginPercent) >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {marginPercent}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Stock Value</span>
            <span className="font-semibold text-white">
              {currencySymbol} {totalCostVal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{productToEdit ? 'Save Changes' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
