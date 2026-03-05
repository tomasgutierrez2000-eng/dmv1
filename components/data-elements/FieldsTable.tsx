'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Copy, Check, ChevronRight } from 'lucide-react';
import type { DataDictionaryField } from '@/lib/data-dictionary';
import { PKBadge, FKBadge, DataTypeBadge } from './badges';

type SortField = 'name' | 'pk_fk';
type SortDir = 'asc' | 'desc';

interface FieldsTableProps {
  fields: DataDictionaryField[];
  layer: string;
  tableName: string;
}

function fieldSortKey(f: DataDictionaryField, field: SortField): string | number {
  switch (field) {
    case 'name':
      return f.name;
    case 'pk_fk':
      if (f.pk_fk?.is_pk) return 0;
      if (f.pk_fk?.fk_target) return 1;
      return 2;
  }
}

export default function FieldsTable({ fields, layer, tableName }: FieldsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('pk_fk');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = fields;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.data_type?.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const aKey = fieldSortKey(a, sortField);
      const bKey = fieldSortKey(b, sortField);
      let cmp: number;
      if (typeof aKey === 'number' && typeof bKey === 'number') {
        cmp = aKey - bKey;
      } else {
        cmp = String(aKey).localeCompare(String(bKey));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [fields, searchQuery, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-500" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  }

  async function copyFieldPath(fieldName: string) {
    const path = `${layer}.${tableName}.${fieldName}`;
    try {
      await navigator.clipboard.writeText(path);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  return (
    <div>
      {/* Search + stats */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="fields-search" className="sr-only">Search fields</label>
          <input
            id="fields-search"
            type="search"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-700 rounded-lg text-sm placeholder-gray-500 bg-gray-900 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
        </div>
        <div className="text-xs text-gray-500">
          {filtered.length} of {fields.length} field{fields.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300"
                onClick={() => toggleSort('name')}
              >
                <span className="inline-flex items-center gap-1">
                  Field Name
                  <SortIcon field="name" />
                </span>
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 whitespace-nowrap"
                onClick={() => toggleSort('pk_fk')}
              >
                <span className="inline-flex items-center gap-1">
                  Key
                  <SortIcon field="pk_fk" />
                </span>
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.map((field) => {
              const isExpanded = expandedField === field.name;
              return (
                <FieldRow
                  key={field.name}
                  field={field}
                  layer={layer}
                  isExpanded={isExpanded}
                  isCopied={copiedField === field.name}
                  onToggle={() => setExpandedField(isExpanded ? null : field.name)}
                  onCopy={() => copyFieldPath(field.name)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  layer,
  isExpanded,
  isCopied,
  onToggle,
  onCopy,
}: {
  field: DataDictionaryField;
  layer: string;
  isExpanded: boolean;
  isCopied: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const hasDetail =
    field.why_required ||
    field.simplification_note ||
    field.formula ||
    field.source_tables?.length ||
    field.dashboard_usage ||
    field.grain ||
    field.notes ||
    field.pk_fk?.fk_target;

  return (
    <>
      <tr
        className={`group hover:bg-white/5 cursor-pointer transition-colors ${isExpanded ? 'bg-white/5' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasDetail && (
              <ChevronRight
                className={`w-3.5 h-3.5 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                aria-hidden
              />
            )}
            <code className="text-sm font-mono text-purple-300 whitespace-nowrap">{field.name}</code>
            {field.data_type && <DataTypeBadge type={field.data_type} />}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
              title="Copy field path"
              style={{ opacity: isCopied ? 1 : undefined }}
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
              )}
            </button>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex gap-1">
            {field.pk_fk?.is_pk && <PKBadge />}
            {field.pk_fk?.fk_target && <FKBadge />}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          <span className="line-clamp-2">{field.description ?? '—'}</span>
        </td>
      </tr>

      {/* Expanded detail */}
      {isExpanded && hasDetail && (
        <tr>
          <td colSpan={3} className="px-4 py-4 bg-black/20 border-t border-gray-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pl-6">
              {field.why_required && (
                <DetailItem label="Why Required" value={field.why_required} />
              )}
              {field.grain && (
                <DetailItem label="Grain" value={field.grain} />
              )}
              {field.formula && (
                <DetailItem label="Formula" value={field.formula} mono />
              )}
              {field.dashboard_usage && (
                <DetailItem label="Dashboard Usage" value={field.dashboard_usage} />
              )}
              {field.simplification_note && (
                <DetailItem label="Simplification Note" value={field.simplification_note} />
              )}
              {field.notes && (
                <DetailItem label="Notes" value={field.notes} />
              )}
              {field.source_tables && field.source_tables.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Source Tables</div>
                  <div className="flex flex-wrap gap-1">
                    {field.source_tables.map((st) => (
                      <Link
                        key={`${st.layer}.${st.table}`}
                        href={`/data-elements/${st.layer}/${encodeURIComponent(st.table)}`}
                        className="text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {st.layer}.{st.table}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {field.pk_fk?.fk_target && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">FK Target</div>
                  <Link
                    href={`/data-elements/${field.pk_fk.fk_target.layer}/${encodeURIComponent(field.pk_fk.fk_target.table)}`}
                    className="text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {field.pk_fk.fk_target.layer}.{field.pk_fk.fk_target.table}.{field.pk_fk.fk_target.field}
                  </Link>
                  {field.pk_fk.is_composite && (
                    <span className="ml-2 text-[10px] text-gray-500">(composite)</span>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={`text-gray-300 ${mono ? 'font-mono bg-black/20 px-2 py-1 rounded' : ''}`}>{value}</div>
    </div>
  );
}
