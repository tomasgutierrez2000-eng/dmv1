'use client';
import { useState, useEffect } from 'react';

interface SchemaCounts {
  l1Tables: number;
  l2Tables: number;
  l3Tables: number;
  totalTables: number;
  metricCount: number;
  relationshipCount: number;
}

const DEFAULT_COUNTS: SchemaCounts = {
  l1Tables: 0, l2Tables: 0, l3Tables: 0,
  totalTables: 0, metricCount: 0, relationshipCount: 0,
};

let cachedCounts: SchemaCounts | null = null;
let fetchPromise: Promise<SchemaCounts> | null = null;

async function fetchCounts(): Promise<SchemaCounts> {
  try {
    const res = await fetch('/api/schema/bundle?summary=true');
    if (!res.ok) return DEFAULT_COUNTS;
    const data = await res.json();
    const summary = data.summary || data;
    const l1 = summary.l1TableCount ?? summary.tableCounts?.L1 ?? summary.tableCountByLayer?.L1 ?? 0;
    const l2 = summary.l2TableCount ?? summary.tableCounts?.L2 ?? summary.tableCountByLayer?.L2 ?? 0;
    const l3 = summary.l3TableCount ?? summary.tableCounts?.L3 ?? summary.tableCountByLayer?.L3 ?? 0;
    return {
      l1Tables: l1, l2Tables: l2, l3Tables: l3,
      totalTables: l1 + l2 + l3,
      metricCount: summary.metricCount ?? summary.l3MetricCount ?? 0,
      relationshipCount: summary.relationshipCount ?? 0,
    };
  } catch { return DEFAULT_COUNTS; }
}

export function useSchemaBundle() {
  const [counts, setCounts] = useState<SchemaCounts>(cachedCounts ?? DEFAULT_COUNTS);
  const [loading, setLoading] = useState(!cachedCounts);

  useEffect(() => {
    if (cachedCounts) { setCounts(cachedCounts); setLoading(false); return; }
    if (!fetchPromise) fetchPromise = fetchCounts();
    fetchPromise.then((c) => { cachedCounts = c; setCounts(c); setLoading(false); });
  }, []);

  return { counts, loading };
}
