import React from 'react';
import { InventoryStatus } from '../../types';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface BadgeProps {
  status: InventoryStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs font-semibold px-2.5 py-1';

  switch (status) {
    case 'in_stock':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          In Stock
        </span>
      );
    case 'low_stock':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Low Stock
        </span>
      );
    case 'out_of_stock':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          Out of Stock
        </span>
      );
    default:
      return null;
  }
};
