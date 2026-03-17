'use client';

import type { IngredientField } from '@/lib/metric-library/types';

const LAYER_COLORS: Record<string, string> = {
  L1: 'bg-blue-100 text-blue-800',
  L2: 'bg-amber-100 text-amber-800',
  L3: 'bg-emerald-100 text-emerald-800',
};

export default function IngredientFieldsTable({ fields }: { fields: IngredientField[] }) {
  if (fields.length === 0) {
    return <p className="text-sm text-gray-400 italic">No ingredient fields defined.</p>;
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Ingredient fields">
      <table className="w-full text-sm">
        <caption className="sr-only">Source fields used to compute this metric</caption>
        <thead>
          <tr className="border-b border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Layer</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Table</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Field</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Description</th>
            <th scope="col" className="py-2 pr-4 whitespace-nowrap">Data Type</th>
            <th scope="col" className="py-2 whitespace-nowrap">Sample</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
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
              <td className="py-2 font-mono text-[11px] text-gray-500">{f.sample_value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
