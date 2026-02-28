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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
            <th className="py-2 pr-4">Layer</th>
            <th className="py-2 pr-4">Table</th>
            <th className="py-2 pr-4">Field</th>
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4">Data Type</th>
            <th className="py-2">Sample</th>
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
              <td className="py-2 pr-4 font-mono text-xs text-gray-300">{f.table}</td>
              <td className="py-2 pr-4 font-mono text-xs text-purple-300">{f.field}</td>
              <td className="py-2 pr-4 text-gray-400">{f.description}</td>
              <td className="py-2 pr-4 font-mono text-[11px] text-gray-500">{f.data_type ?? '—'}</td>
              <td className="py-2 font-mono text-[11px] text-gray-500">{f.sample_value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
