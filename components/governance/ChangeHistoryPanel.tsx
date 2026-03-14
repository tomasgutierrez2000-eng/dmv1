'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History, ChevronDown, ChevronRight, Clock, User, FileText,
  RotateCcw, RefreshCw, AlertCircle, Tag,
} from 'lucide-react';
import DiffViewer from './DiffViewer';
import type { ChangeLogEntry } from '@/lib/governance/change-logger';

interface ChangeHistoryPanelProps {
  itemId: string;
  /** Refresh trigger — increment to re-fetch */
  refreshKey?: number;
}

interface HistoryResponse {
  item_id: string;
  entries: ChangeLogEntry[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  CREATE:        { label: 'Created',          color: 'text-emerald-400', icon: FileText },
  UPDATE:        { label: 'Updated',          color: 'text-amber-400',   icon: FileText },
  STATUS_CHANGE: { label: 'Status Changed',   color: 'text-blue-400',    icon: Tag },
  ROLLBACK:      { label: 'Rolled Back',      color: 'text-purple-400',  icon: RotateCcw },
  EXCEPTION:     { label: 'Exception',         color: 'text-red-400',     icon: AlertCircle },
};

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return 'Unknown';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function RelativeTime({ ts }: { ts: string | undefined }) {
  if (!ts) return <span className="text-gray-500">—</span>;
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    let relative: string;
    if (diffMin < 1) relative = 'just now';
    else if (diffMin < 60) relative = `${diffMin}m ago`;
    else if (diffHr < 24) relative = `${diffHr}h ago`;
    else if (diffDay < 30) relative = `${diffDay}d ago`;
    else relative = formatTimestamp(ts);

    return (
      <span className="text-gray-500" title={formatTimestamp(ts)}>
        {relative}
      </span>
    );
  } catch {
    return <span className="text-gray-500">{ts}</span>;
  }
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const colors: Record<string, string> = {
    analyst: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    modeler: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    reviewer: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[role] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
      {role}
    </span>
  );
}

/**
 * Change history timeline for a metric. Shows audit trail entries
 * with expandable diff viewer for each change.
 */
export default function ChangeHistoryPanel({ itemId, refreshKey = 0 }: ChangeHistoryPanelProps) {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const LIMIT = 20;

  const fetchHistory = useCallback(async (newOffset = 0, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/metrics/library/catalogue/${encodeURIComponent(itemId)}/history?limit=${LIMIT}&offset=${newOffset}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: HistoryResponse = await res.json();
      setEntries(prev => append ? [...prev, ...data.entries] : data.entries);
      setTotal(data.total);
      setOffset(newOffset);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory, refreshKey]);

  const toggleExpand = (id: number | undefined) => {
    if (id === undefined) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="border border-pwc-gray-light rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-pwc-orange" />
          <h3 className="text-lg font-semibold text-pwc-white">Change History</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-pwc-gray-light rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-pwc-orange" />
          <h3 className="text-lg font-semibold text-pwc-white">Change History</h3>
          {total > 0 && (
            <span className="text-xs text-gray-500 bg-pwc-gray-light/50 px-2 py-0.5 rounded-full">
              {total} change{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fetchHistory(0)}
          className="p-1.5 rounded hover:bg-pwc-gray-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh history"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !loading && !error && (
        <div className="text-center py-8">
          <History className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No changes recorded yet</p>
          <p className="text-xs text-gray-600 mt-1">Changes will appear here when the metric is edited</p>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-pwc-gray-light" />

          <div className="space-y-1">
            {entries.map((entry, idx) => {
              const typeInfo = CHANGE_TYPE_LABELS[entry.change_type] ?? CHANGE_TYPE_LABELS.UPDATE;
              const Icon = typeInfo.icon;
              const isExpanded = expandedId === (entry.change_id ?? idx);

              return (
                <div key={entry.change_id ?? idx} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className={`absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 bg-pwc-gray ${
                    entry.change_type === 'CREATE' ? 'border-emerald-400' :
                    entry.change_type === 'ROLLBACK' ? 'border-purple-400' :
                    entry.change_type === 'STATUS_CHANGE' ? 'border-blue-400' :
                    'border-amber-400'
                  }`} />

                  {/* Entry card */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.change_id ?? idx)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-pwc-gray-light/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <Icon className={`w-3.5 h-3.5 ${typeInfo.color}`} />
                      <span className={`text-sm font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>

                      {/* User info */}
                      {entry.changed_by_name && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <User className="w-3 h-3" />
                          {entry.changed_by_name}
                        </span>
                      )}
                      <RoleBadge role={entry.changed_by_role} />

                      {/* Timestamp */}
                      <span className="ml-auto flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <RelativeTime ts={entry.created_ts} />
                      </span>
                    </div>

                    {/* Change reason */}
                    {entry.change_reason && (
                      <p className="mt-1 text-xs text-gray-500 truncate pl-5">
                        &ldquo;{entry.change_reason}&rdquo;
                      </p>
                    )}

                    {/* Ticket reference */}
                    {entry.ticket_reference && (
                      <span className="inline-flex items-center gap-1 mt-1 ml-5 text-[10px] text-gray-500 bg-pwc-gray-light/50 px-1.5 py-0.5 rounded">
                        {entry.ticket_reference}
                      </span>
                    )}
                  </button>

                  {/* Expanded diff */}
                  {isExpanded && (
                    <div className="ml-5 mt-1 mb-3 p-3 rounded-lg bg-pwc-black/50 border border-pwc-gray-light/50">
                      <DiffViewer diffSummary={entry.diff_summary ?? {}} />

                      {/* Metadata */}
                      <div className="mt-3 pt-2 border-t border-pwc-gray-light/30 flex items-center gap-4 text-[10px] text-gray-600">
                        <span>ID: {entry.change_id}</span>
                        <span>{formatTimestamp(entry.created_ts)}</span>
                        {entry.governance_status && (
                          <span>Status: {entry.governance_status}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => fetchHistory(offset + LIMIT, true)}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 bg-pwc-gray-light/30 hover:bg-pwc-gray-light/50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load more (${total - entries.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
