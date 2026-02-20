'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DeepDiveView from '@/components/metrics-engine/DeepDiveView';
import type { L3Metric } from '@/data/l3-metrics';
import { isDeepDiveMetric } from '@/lib/deep-dive/scope';

export default function MetricDeepDivePage() {
  const params = useParams();
  const router = useRouter();
  const metricId = typeof params.metricId === 'string' ? params.metricId : null;
  const [metric, setMetric] = useState<L3Metric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metricId) {
      setLoading(false);
      setError('Missing metric ID');
      return;
    }
    if (!isDeepDiveMetric(metricId)) {
      setLoading(false);
      setError('Deep dive is currently enabled for 8 metrics only (C100-C107).');
      return;
    }
    fetch(`/api/metrics?id=${encodeURIComponent(metricId)}`)
      .then((res) => res.json())
      .then((data: L3Metric[]) => {
        const m = Array.isArray(data) ? data.find((x) => x.id === metricId) : null;
        setMetric(m ?? null);
        setError(m ? null : 'Metric not found');
      })
      .catch(() => setError('Failed to load metric'))
      .finally(() => setLoading(false));
  }, [metricId]);

  const handleBack = () => router.push('/metrics');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (error || !metric) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-amber-400">{error ?? 'Metric not found'}</p>
          <button
            type="button"
            onClick={() => router.push('/metrics')}
            className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
          >
            Back to metrics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <DeepDiveView metric={metric} onBack={handleBack} />
    </div>
  );
}
