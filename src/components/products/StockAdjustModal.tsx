import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Product } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Plus, Minus, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (payload: {
    adjustmentType: 'add' | 'subtract' | 'set';
    amount?: number;
    newQuantity?: number;
    reason?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjust,
  isLoading = false,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [amount, setAmount] = useState<string>('5');
  const [reason, setReason] = useState<string>('Restocked from supplier shipment');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setAdjustmentType('add');
      setAmount('5');
      setReason('Restocked from supplier shipment');
      setError(null);
    }
  }, [product, isOpen]);

  if (!product) return null;

  const currentStock = product.quantity;
  const numAmount = Math.max(0, Math.floor(Number(amount) || 0));

  let projectedStock = currentStock;
  if (adjustmentType === 'add') {
    projectedStock = currentStock + numAmount;
  } else if (adjustmentType === 'subtract') {
    projectedStock = currentStock - numAmount;
  } else if (adjustmentType === 'set') {
    projectedStock = numAmount;
  }

  const isNegative = projectedStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount < 0) {
      setError('Amount must be non-negative');
      return;
    }

    if (isNegative) {
      setError(`Cannot reduce inventory below 0 units. Current stock is ${currentStock}.`);
      return;
    }

    try {
      if (adjustmentType === 'set') {
        await onAdjust({
          adjustmentType: 'set',
          newQuantity: numAmount,
          reason,
        });
      } else {
        await onAdjust({
          adjustmentType,
          amount: numAmount,
          reason,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update stock');
    }
  };

  const reasonsList = [
    'Restocked from supplier shipment',
    'Customer order fulfillment / dispatch',
    'Inventory cycle count reconciliation',
    'Damaged / expired goods write-off',
    'Customer return restock',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Quantity"
      description={`Update live stock for ${product.name} (${product.sku})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current status pill */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Current Stock on Hand</div>
            <div className="text-xl font-extrabold text-white">
              {currentStock} <span className="text-xs font-normal text-slate-500">units</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Status</div>
            <StatusBadge status={product.inventoryStatus} size="sm" />
          </div>
        </div>

        {/* Operation type selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Action Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('add');
                setReason('Restocked from supplier shipment');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                adjustmentType === 'add'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock (+)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('subtract');
                setReason('Customer order fulfillment / dispatch');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                adjustmentType === 'subtract'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Deduct (-)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('set');
                setReason('Inventory cycle count reconciliation');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                adjustmentType === 'set'
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Set Exact (=)</span>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {adjustmentType === 'set' ? 'New Target Quantity' : 'Units to Adjust'}
          </label>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Live Calculation Flow Preview */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            isNegative
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono">{currentStock}</span>
            <span className="text-slate-500">
              {adjustmentType === 'add' ? '+' : adjustmentType === 'subtract' ? '-' : '→'}
            </span>
            <span className="font-mono font-semibold">{numAmount}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className={`font-mono text-base font-extrabold ${isNegative ? 'text-rose-400' : 'text-white'}`}>
              {projectedStock} units
            </span>
          </div>
          <div>
            {isNegative ? (
              <span className="text-rose-400 font-semibold">Negative Invalid</span>
            ) : projectedStock === 0 ? (
              <span className="text-rose-400 font-semibold">Out of Stock</span>
            ) : projectedStock <= product.effectiveThreshold ? (
              <span className="text-amber-400 font-semibold">Low Stock Alert</span>
            ) : (
              <span className="text-emerald-400 font-semibold">Healthy Level</span>
            )}
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Audit Trail Note</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Audit explanation for this inventory adjustment..."
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-1.5"
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {reasonsList.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className="text-[10px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-750 px-2 py-0.5 rounded-lg border border-slate-700/60 transition-colors"
              >
                {preset}
              </button>
            ))}
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
            disabled={isLoading || isNegative}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>Apply Stock Adjustment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
