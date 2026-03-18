'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, Shuffle, ChevronDown } from 'lucide-react';

interface EntityOption {
  key: string;
  label: string;
}

interface TraceEntityPickerProps {
  level: string;
  itemId: string;
  formulaSql: string;
  asOfDate: string;
  selectedKey: string | null;
  onSelect: (key: string, label: string) => void;
}

const LEVEL_TABS = [
  { key: 'facility', label: 'Facility' },
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'desk', label: 'Desk' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'business_segment', label: 'Segment' },
];

export default function TraceEntityPicker({
  level,
  itemId,
  formulaSql,
  asOfDate,
  selectedKey,
  onSelect,
}: TraceEntityPickerProps) {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch entities when level/formula changes
  const fetchEntities = useCallback(async () => {
    if (!formulaSql || !asOfDate) return;
    setLoading(true);
    try {
      const res = await fetch('/api/metrics/governance/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: formulaSql,
          as_of_date: asOfDate,
          level,
          max_rows: 500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rows = (data.rows ?? []) as Array<{
          dimension_key: unknown;
          dimension_label?: string;
          metric_value?: unknown;
        }>;
        setEntities(
          rows.map(r => ({
            key: String(r.dimension_key),
            label: r.dimension_label
              ? `${r.dimension_label} (${r.dimension_key})`
              : String(r.dimension_key),
          })),
        );
      }
    } catch {
      setEntities([]);
    }
    setLoading(false);
  }, [level, formulaSql, asOfDate]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredEntities = search
    ? entities.filter(e => e.label.toLowerCase().includes(search.toLowerCase()) || e.key.includes(search))
    : entities;

  const selectedEntity = entities.find(e => e.key === selectedKey);

  const handleRandom = () => {
    if (entities.length === 0) return;
    const idx = Math.floor(Math.random() * entities.length);
    onSelect(entities[idx].key, entities[idx].label);
    setIsOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Selected entity display + dropdown trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-pwc-gray-light bg-pwc-black text-left hover:border-pwc-orange/50 transition-colors"
        >
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <span className={`flex-1 text-sm truncate ${selectedEntity ? 'text-gray-200' : 'text-gray-500'}`}>
            {selectedEntity ? selectedEntity.label : 'Select an entity to trace...'}
          </span>
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-pwc-gray-light bg-pwc-gray shadow-xl max-h-64 overflow-hidden">
            {/* Search input */}
            <div className="px-3 py-2 border-b border-gray-700/50">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entities..."
                className="w-full text-xs bg-transparent text-gray-300 placeholder:text-gray-600 outline-none"
                autoFocus
              />
            </div>

            {/* Entity list */}
            <div className="overflow-y-auto max-h-48">
              {filteredEntities.length === 0 ? (
                <p className="text-xs text-gray-500 px-3 py-4 text-center">
                  {loading ? 'Loading entities...' : 'No entities found'}
                </p>
              ) : (
                filteredEntities.map(entity => (
                  <button
                    key={entity.key}
                    type="button"
                    onClick={() => { onSelect(entity.key, entity.label); setIsOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors ${
                      entity.key === selectedKey ? 'bg-pwc-orange/10 text-pwc-orange' : 'text-gray-300'
                    }`}
                  >
                    {entity.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Random button */}
      <button
        type="button"
        onClick={handleRandom}
        disabled={entities.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-gray-400 hover:text-pwc-orange hover:bg-pwc-orange/5 rounded transition-colors disabled:opacity-30"
      >
        <Shuffle className="w-3 h-3" />
        Pick random entity ({entities.length} available)
      </button>
    </div>
  );
}
