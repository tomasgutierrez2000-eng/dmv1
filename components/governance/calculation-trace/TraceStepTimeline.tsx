'use client';

import { useState } from 'react';
import { Database, Link, Filter, Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import TraceTablePanel from './TraceTablePanel';

interface TraceColumnUsed {
  name: string;
  value: unknown;
  role: 'measure' | 'join_key' | 'filter' | 'reference';
}

interface TraceStep {
  order: number;
  type: 'source' | 'join' | 'filter' | 'compute';
  table_name: string;
  table_display: string;
  layer: string;
  alias_in_sql: string;
  description: string;
  join_condition?: string;
  columns_used: TraceColumnUsed[];
  row_data: Record<string, unknown>[];
  row_count: number;
}

interface TraceStepTimelineProps {
  steps: TraceStep[];
}

const STEP_CONFIG: Record<string, {
  icon: typeof Database;
  color: string;
  bg: string;
  border: string;
}> = {
  source: {
    icon: Database,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  join: {
    icon: Link,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  filter: {
    icon: Filter,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  compute: {
    icon: Calculator,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
};

const LAYER_BADGE: Record<string, string> = {
  L1: 'bg-blue-500/20 text-blue-300',
  L2: 'bg-emerald-500/20 text-emerald-300',
  L3: 'bg-amber-500/20 text-amber-300',
};

function StepCard({ step, index, total }: { step: TraceStep; index: number; total: number }) {
  const [expanded, setExpanded] = useState(step.type === 'source' || step.type === 'compute');
  const config = STEP_CONFIG[step.type] ?? STEP_CONFIG.source;
  const Icon = config.icon;
  const isLast = index === total - 1;

  return (
    <div className="relative flex gap-3" style={{ animationDelay: `${index * 80}ms` }}>
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.bg} border ${config.border}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gray-700/50 my-1" />
        )}
      </div>

      {/* Step content */}
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`w-full text-left rounded-lg border ${config.border} ${config.bg} hover:bg-white/[0.03] transition-colors`}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {step.layer && step.type !== 'compute' && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${LAYER_BADGE[step.layer] ?? 'bg-gray-700 text-gray-400'}`}>
                {step.layer}
              </span>
            )}
            <span className="text-xs font-medium text-gray-200 flex-1">
              {step.description}
            </span>
            {step.row_count > 0 && (
              <span className="text-[10px] text-gray-500">
                {step.row_count} {step.row_count === 1 ? 'row' : 'rows'}
              </span>
            )}
            {step.row_data.length > 0 && (
              expanded
                ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            )}
          </div>

          {/* Table name subtitle */}
          {step.type !== 'compute' && (
            <div className="px-3 pb-2 flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-500">{step.table_name}</span>
              {step.alias_in_sql !== step.table_name.split('.')[1] && (
                <span className="text-[10px] text-gray-600">
                  as <span className="font-mono">{step.alias_in_sql}</span>
                </span>
              )}
            </div>
          )}

          {/* Join condition */}
          {step.join_condition && (
            <div className="px-3 pb-2">
              <span className="text-[9px] font-mono text-gray-600">
                ON {step.join_condition}
              </span>
            </div>
          )}
        </button>

        {/* Expanded data table */}
        {expanded && step.row_data.length > 0 && (
          <div className="mt-1 rounded-lg border border-gray-800 bg-pwc-black/50 overflow-hidden">
            <TraceTablePanel
              rows={step.row_data}
              columnsUsed={step.columns_used}
              rowCount={step.row_count}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TraceStepTimeline({ steps }: TraceStepTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic py-4">No trace steps available</p>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <StepCard key={`${step.order}-${step.table_name}`} step={step} index={i} total={steps.length} />
      ))}
    </div>
  );
}
