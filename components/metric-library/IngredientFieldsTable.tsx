'use client';

import { useState, useEffect } from 'react';
import type { IngredientField } from '@/lib/metric-library/types';

const LAYER_COLORS: Record<string, string> = {
  L1: 'bg-blue-100 text-blue-800',
  L2: 'bg-amber-100 text-amber-800',
  L3: 'bg-emerald-100 text-emerald-800',
};

interface IngredientTableField {
  layer: string;
  table: string;
  field: string;
  description: string;
  data_type?: string;
  sample_value?: string;
  role?: string;
}

interface Props {
  /** Static fields from CatalogueItem (used as fallback while API loads) */
  fields: IngredientField[];
  /** When provided, fetches dynamic ingredients from governance API */
  itemId?: string;
  /** Level to fetch ingredients for (e.g., 'facility') */
  level?: string;
}

export default function IngredientFieldsTable({ fields, itemId, level }: Props) {
  const [dynamicFields, setDynamicFields] = useState<IngredientTableField[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    const params = new URLSearchParams({ item_id: itemId });
    if (level) params.set('level', level);
    fetch(`/api/metrics/governance/ingredients?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok !== false && json.tables) {
          const allFields: IngredientTableField[] = [];
          for (const table of json.tables) {
            for (const f of table.fields) {
              allFields.push({
                layer: f.layer || table.layer,
                table: f.table || table.table,
                field: f.field,
                description: f.description || '',
                data_type: f.data_type,
                role: f.role,
              });
            }
          }
          setDynamicFields(allFields);
        }
      })
      .catch(() => {
        // Silently fall back to static fields
      })
      .finally(() => setLoading(false));
  }, [itemId, level]);

  const displayFields: IngredientTableField[] = dynamicFields ?? fields;

  if (displayFields.length === 0 && !loading) {
    return <p className="text-sm text-gray-400 italic">No ingredient fields defined.</p>;
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Ingredient fields">
      {loading && !dynamicFields && (
        <p className="text-xs text-gray-500 mb-2 animate-pulse">Loading ingredient fields...</p>
      )}
      {dynamicFields && (
        <p className="text-[10px] text-gray-600 mb-2">
          Dynamically resolved from formula SQL{level ? ` (${level} level)` : ''}
        </p>
      )}
      <table className="w-full text-sm">
        <caption className="sr-only">Source fields used to compute this metric</caption>
        <thead>
          <tr className="border-b border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Layer</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Table</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Field</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Description</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Data Type</th>
            {dynamicFields && <th scope="col" className="py-2 whitespace-nowrap">Role</th>}
            {!dynamicFields && <th scope="col" className="py-2 whitespace-nowrap">Sample</th>}
          </tr>
        </thead>
        <tbody>
          {displayFields.map((f, i) => (
            <tr key={`${f.table}.${f.field}-${i}`} className="border-b border-gray-800 hover:bg-white/5">
              <td className="py-2 pr-4">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${LAYER_COLORS[f.layer] ?? 'bg-gray-200 text-gray-700'}`}>
                  {f.layer}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-300 whitespace-nowrap">{f.table}</td>
              <td className="py-2 pr-4 font-mono text-xs text-purple-300 whitespace-nowrap">{f.field}</td>
              <td className="py-2 pr-4 text-gray-400">{f.description}</td>
              <td className={`py-2 pr-4 font-mono text-[11px] ${f.data_type ? 'text-gray-500' : 'text-red-400'}`}>{f.data_type || '—'}</td>
              {dynamicFields && (
                <td className="py-2 font-mono text-[11px] text-gray-500">{f.role ?? '—'}</td>
              )}
              {!dynamicFields && (
                <td className="py-2 font-mono text-[11px] text-gray-500">{(f as IngredientField).sample_value ?? '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
