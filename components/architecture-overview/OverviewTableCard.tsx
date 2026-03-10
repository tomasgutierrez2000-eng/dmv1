'use client';

import { motion } from 'framer-motion';
import { Database, Key, ArrowRightLeft } from 'lucide-react';
import type { FieldDisplay } from './types';
import { LAYER_COLORS } from './data';

interface OverviewTableCardProps {
  tableName: string;
  label: string;
  subtitle?: string;
  layer: 'L1' | 'L2' | 'L3';
  fields?: FieldDisplay[];
  isHighlighted?: boolean;
  isDimmed?: boolean;
  onHover?: (hovered: boolean) => void;
  onClick?: () => void;
  size?: 'normal' | 'compact';
}

export default function OverviewTableCard({
  tableName,
  label,
  subtitle,
  layer,
  fields,
  isHighlighted = false,
  isDimmed = false,
  onHover,
  onClick,
  size = 'normal',
}: OverviewTableCardProps) {
  const colors = LAYER_COLORS[layer];
  const isCompact = size === 'compact';

  return (
    <motion.div
      layout
      className={`
        rounded-lg border backdrop-blur-sm cursor-pointer
        transition-all duration-200
        ${colors.bg} ${colors.border}
        ${isHighlighted ? 'ring-2 ring-white/30 shadow-lg shadow-white/5' : ''}
        ${isDimmed ? 'opacity-30' : 'opacity-100'}
        ${isCompact ? 'px-3 py-2' : 'px-4 py-3'}
      `}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Database className={`w-3.5 h-3.5 ${colors.text}`} />
        <span className={`text-xs font-semibold ${colors.text}`}>{label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge} font-medium`}>
          {layer}
        </span>
      </div>

      {/* Table name */}
      <p className="text-[10px] text-slate-500 font-mono mb-1">{tableName}</p>

      {/* Subtitle */}
      {subtitle && !isCompact && (
        <p className="text-[11px] text-slate-400 mb-2">{subtitle}</p>
      )}

      {/* Fields */}
      {fields && !isCompact && (
        <div className="space-y-0.5 mt-2 border-t border-slate-700/50 pt-2">
          {fields.map((f) => (
            <div key={f.name} className="flex items-center gap-1.5">
              {f.type === 'pk' && <Key className="w-3 h-3 text-amber-400" />}
              {f.type === 'fk' && <ArrowRightLeft className="w-3 h-3 text-blue-400" />}
              {f.type === 'field' && <span className="w-3 h-3 inline-block" />}
              <span className={`text-[10px] font-mono ${
                f.type === 'pk' ? 'text-amber-300' :
                f.type === 'fk' ? 'text-blue-300' :
                'text-slate-400'
              }`}>
                {f.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
