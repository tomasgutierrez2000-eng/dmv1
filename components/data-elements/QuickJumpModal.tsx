'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Database, X } from 'lucide-react';
import type { DataDictionaryTable } from '@/lib/data-dictionary';
import { LayerBadge } from './badges';

interface QuickJumpModalProps {
  tables: DataDictionaryTable[];
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'table' | 'field';
  table: DataDictionaryTable;
  fieldName?: string;
  fieldDescription?: string;
}

const MAX_RESULTS = 15;

export default function QuickJumpModal({ tables, isOpen, onClose }: QuickJumpModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const matches: SearchResult[] = [];

    for (const table of tables) {
      if (matches.length >= MAX_RESULTS) break;

      // Match table name
      if (table.name.toLowerCase().includes(q)) {
        matches.push({ type: 'table', table });
        continue;
      }

      // Match field names
      for (const field of table.fields) {
        if (matches.length >= MAX_RESULTS) break;
        if (
          field.name.toLowerCase().includes(q) ||
          field.description?.toLowerCase().includes(q)
        ) {
          matches.push({
            type: 'field',
            table,
            fieldName: field.name,
            fieldDescription: field.description,
          });
        }
      }
    }

    return matches;
  }, [tables, query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const navigate = useCallback(
    (result: SearchResult) => {
      router.push(`/data-elements/${result.table.layer}/${encodeURIComponent(result.table.name)}`);
      onClose();
    },
    [router, onClose]
  );

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            navigate(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to table or field..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
            aria-label="Search tables and fields"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No tables or fields match &ldquo;{query}&rdquo;
              </div>
            ) : (
              results.map((result, i) => (
                <button
                  key={`${result.table.layer}.${result.table.name}.${result.fieldName ?? ''}`}
                  type="button"
                  onClick={() => navigate(result)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                    i === selectedIndex ? 'bg-blue-600/20 text-white' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <LayerBadge layer={result.table.layer} dark />
                  {result.type === 'table' ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" aria-hidden />
                      <code className="font-mono text-sm truncate">{result.table.name}</code>
                      <span className="text-xs text-gray-500">{result.table.category}</span>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs text-gray-500">{result.table.name}</code>
                        <span className="text-gray-600">.</span>
                        <code className="font-mono text-sm text-purple-300">{result.fieldName}</code>
                      </div>
                      {result.fieldDescription && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{result.fieldDescription}</p>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* Hint */}
        {!query.trim() && (
          <div className="px-4 py-6 text-center text-xs text-gray-600">
            Type to search across all tables and fields
          </div>
        )}
      </div>
    </div>
  );
}
