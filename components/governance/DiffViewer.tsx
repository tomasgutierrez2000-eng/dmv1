'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, Edit3 } from 'lucide-react';

interface DiffEntry {
  field: string;
  old: unknown;
  new: unknown;
}

interface DiffViewerProps {
  /** JSONB diff_summary from change log: { field: { old, new } } */
  diffSummary: Record<string, { old: unknown; new: unknown }>;
  /** Max entries to show before "show more" */
  maxVisible?: number;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'string') return val || '(empty)';
  if (Array.isArray(val)) return val.join(', ') || '(empty)';
  return JSON.stringify(val);
}

function classifyChange(entry: DiffEntry): 'added' | 'removed' | 'modified' {
  if (entry.old === null || entry.old === undefined || entry.old === 'added') return 'added';
  if (entry.new === null || entry.new === undefined) return 'removed';
  return 'modified';
}

function ChangeIcon({ type }: { type: 'added' | 'removed' | 'modified' }) {
  if (type === 'added') return <Plus className="w-3.5 h-3.5 text-emerald-400" />;
  if (type === 'removed') return <Minus className="w-3.5 h-3.5 text-red-400" />;
  return <Edit3 className="w-3.5 h-3.5 text-amber-400" />;
}

function FieldLabel({ field }: { field: string }) {
  // Format field names for display (e.g. "level.facility" → "Level: facility")
  const parts = field.split('.');
  if (parts.length === 1) {
    return <span className="font-mono text-xs">{field.replace(/_/g, ' ')}</span>;
  }
  return (
    <span className="font-mono text-xs">
      <span className="text-gray-500">{parts.slice(0, -1).join('.')}</span>
      <span className="text-gray-400">.</span>
      <span>{parts[parts.length - 1].replace(/_/g, ' ')}</span>
    </span>
  );
}

/**
 * Renders a diff summary showing what changed between two metric snapshots.
 * Groups changes into: field changes, level changes, ingredient changes.
 */
export default function DiffViewer({ diffSummary, maxVisible = 10 }: DiffViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!diffSummary || Object.keys(diffSummary).length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No changes recorded</p>
    );
  }

  const entries: DiffEntry[] = Object.entries(diffSummary).map(([field, diff]) => ({
    field,
    old: diff.old,
    new: diff.new,
  }));

  // Group by category
  const fieldChanges = entries.filter(e => !e.field.startsWith('level.') && !e.field.startsWith('ingredient.'));
  const levelChanges = entries.filter(e => e.field.startsWith('level.'));
  const ingredientChanges = entries.filter(e => e.field.startsWith('ingredient.'));

  const total = entries.length;
  const showAll = expanded || total <= maxVisible;
  const visibleEntries = showAll ? entries : entries.slice(0, maxVisible);

  return (
    <div className="space-y-1">
      {/* Summary counts */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        {fieldChanges.length > 0 && (
          <span className="flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-amber-400" />
            {fieldChanges.length} field{fieldChanges.length !== 1 ? 's' : ''}
          </span>
        )}
        {levelChanges.length > 0 && (
          <span className="flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-blue-400" />
            {levelChanges.length} level{levelChanges.length !== 1 ? 's' : ''}
          </span>
        )}
        {ingredientChanges.length > 0 && (
          <span className="flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-purple-400" />
            {ingredientChanges.length} ingredient{ingredientChanges.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Change rows */}
      <div className="space-y-0.5">
        {visibleEntries.map((entry) => {
          const type = classifyChange(entry);
          return (
            <div
              key={entry.field}
              className={`flex items-start gap-2 px-2.5 py-1.5 rounded text-sm
                ${type === 'added' ? 'bg-emerald-500/5' : ''}
                ${type === 'removed' ? 'bg-red-500/5' : ''}
                ${type === 'modified' ? 'bg-amber-500/5' : ''}
              `}
            >
              <ChangeIcon type={type} />
              <div className="flex-1 min-w-0">
                <FieldLabel field={entry.field} />
                <div className="flex items-center gap-2 mt-0.5">
                  {type !== 'added' && (
                    <span className="text-xs text-red-400/80 line-through truncate max-w-[200px]">
                      {formatValue(entry.old)}
                    </span>
                  )}
                  {type === 'modified' && (
                    <span className="text-xs text-gray-600">→</span>
                  )}
                  {type !== 'removed' && (
                    <span className="text-xs text-emerald-400/80 truncate max-w-[200px]">
                      {formatValue(entry.new)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less */}
      {total > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronDown className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronRight className="w-3 h-3" />
              Show {total - maxVisible} more change{total - maxVisible !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}
    </div>
  );
}
