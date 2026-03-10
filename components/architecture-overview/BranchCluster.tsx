'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, Database, Users, Globe, Star, AlertTriangle,
  Shield, Building2, TrendingUp, Link2, Gauge, BookOpen, Calendar,
  BarChart3, DollarSign, AlertCircle, Activity,
} from 'lucide-react';
import { useOverviewStore } from './useOverviewStore';
import { SPINE_COLORS } from './data';
import type { TableRef } from './types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Users, Globe, Star, AlertTriangle, Shield, Building2, TrendingUp,
  Link2, Gauge, BookOpen, Calendar, Database, BarChart3, DollarSign,
  AlertCircle, Activity,
};

interface BranchClusterProps {
  id: string;
  label: string;
  icon: string;
  color: string;
  tables: TableRef[];
  spineAttachment?: string;
  isDimmed?: boolean;
  isHighlighted?: boolean;
}

export default function BranchCluster({
  id,
  label,
  icon,
  color,
  tables,
  spineAttachment,
  isDimmed = false,
  isHighlighted = false,
}: BranchClusterProps) {
  const expandedGroups = useOverviewStore((s) => s.expandedGroups);
  const toggleGroup = useOverviewStore((s) => s.toggleGroup);
  const setHoveredGroup = useOverviewStore((s) => s.setHoveredGroup);
  const isExpanded = expandedGroups.has(id);

  const IconComponent = ICON_MAP[icon] ?? Database;

  const spineColor = spineAttachment ? SPINE_COLORS[spineAttachment] : undefined;

  return (
    <motion.div
      layout
      className={`
        rounded-lg border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm
        transition-all duration-200
        ${isDimmed ? 'opacity-30' : 'opacity-100'}
        ${isHighlighted ? 'ring-1 ring-white/20' : ''}
      `}
      onMouseEnter={() => setHoveredGroup(id)}
      onMouseLeave={() => setHoveredGroup(null)}
    >
      {/* Header */}
      <button
        onClick={() => toggleGroup(id)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-800/50 transition-colors rounded-lg"
      >
        <IconComponent className="w-4 h-4 shrink-0" style={{ color }} />
        <span className="text-sm font-medium text-slate-200 flex-1">{label}</span>

        {/* Spine attachment indicator */}
        {spineColor && (
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: spineColor }}
            title={`Connects to ${spineAttachment}`}
          />
        )}

        {/* Count badge */}
        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {tables.length}
        </span>

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              {tables.map((t) => (
                <div
                  key={t.name}
                  className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
                >
                  <Database className="w-3 h-3 mt-0.5 shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-slate-300">{t.name}</p>
                    {t.description && (
                      <p className="text-[10px] text-slate-500">{t.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
