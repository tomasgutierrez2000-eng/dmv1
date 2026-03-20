'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowLeft, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import type { S1Response } from '@/app/api/scenarios/s1/route';

function formatUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function S1VisualizerPage() {
  const [data, setData] = useState<S1Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scenarios/s1');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load');
        setData(null);
        return;
      }
      const payload = json.ok ? json.data : json;
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-pwc-black text-pwc-white p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-pwc-gray-light hover:text-pwc-orange transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-8 h-8 animate-spin text-pwc-orange" />
            <span className="ml-3 text-pwc-gray-light">Loading S1 scenario...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-pwc-black text-pwc-white p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-pwc-gray-light hover:text-pwc-orange transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-300">Cannot load S1 data</h2>
              <p className="text-pwc-gray-light mt-1">{error}</p>
              <p className="text-sm text-pwc-gray-light mt-3">
                Ensure <code className="bg-pwc-gray/50 px-1 rounded">DATABASE_URL</code> is set and run{' '}
                <code className="bg-pwc-gray/50 px-1 rounded">npm run db:load-gsib</code> to load the scenario seed.
              </p>
              <button
                type="button"
                onClick={fetchData}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-pwc-orange hover:bg-pwc-orange-light text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const d = data!;
  const chartData = [
    ...d.facilities.map((f) => ({
      name: f.facility_name.length > 20 ? f.facility_name.slice(0, 18) + '…' : f.facility_name,
      fullName: f.facility_name,
      drawn: f.drawn_amount,
    })),
    {
      name: 'Total',
      fullName: 'Total drawn exposure',
      drawn: d.utilized_amount,
    },
  ];

  return (
    <div className="min-h-screen bg-pwc-black text-pwc-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-pwc-gray-light hover:text-pwc-orange transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">S1 — Large Exposure Breach</h1>
            <p className="text-pwc-gray-light mt-1">
              {d.counterparty_name} · As of {d.as_of_date}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-pwc-gray-light/50 hover:border-pwc-orange hover:bg-pwc-gray/30 text-sm transition-colors"
            title="Refresh from database"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Breach indicator */}
        <div
          className={`rounded-xl p-6 mb-8 border-2 ${
            d.is_breach ? 'border-red-500/80 bg-red-950/20' : 'border-emerald-500/50 bg-emerald-950/20'
          }`}
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-pwc-gray-light">Utilization</span>
              <span
                className={`text-4xl font-bold tabular-nums ${
                  d.is_breach ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {d.utilization_pct}%
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-pwc-gray-light">Drawn</span>
                <span className="ml-2 font-mono font-semibold">{formatUsd(d.utilized_amount)}</span>
              </div>
              <div className="text-pwc-gray-light">/</div>
              <div>
                <span className="text-pwc-gray-light">Limit</span>
                <span className="ml-2 font-mono font-semibold">{formatUsd(d.limit_amount_usd)}</span>
              </div>
            </div>
            {d.is_breach && (
              <div className="flex items-center gap-2 text-red-400 font-medium">
                <AlertTriangle className="w-5 h-5" />
                Breach: {formatUsd(Math.abs(d.available_amount))} over limit
              </div>
            )}
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border border-pwc-gray/50 bg-pwc-gray/10 p-6">
          <h2 className="text-lg font-semibold mb-4">Drawn vs Limit by Facility</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" tickFormatter={(v) => formatUsd(v)} stroke="#888" />
                <YAxis type="category" dataKey="name" width={120} stroke="#888" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [formatUsd(Number(value ?? 0)), '']}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ''}
                />
                <Legend />
                <ReferenceLine x={d.limit_amount_usd} stroke="#D04A02" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Limit', position: 'top' }} />
                <Bar dataKey="drawn" name="Drawn" fill="#E87722" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-pwc-gray-light mt-2">Orange dashed line = limit</p>
        </div>

        {/* Facility table */}
        <div className="mt-8 rounded-xl border border-pwc-gray/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pwc-gray/30 border-b border-pwc-gray/50">
                <th className="text-left py-3 px-4 font-medium">Facility</th>
                <th className="text-right py-3 px-4 font-medium">Drawn</th>
                <th className="text-right py-3 px-4 font-medium">Committed</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {d.facilities.map((f) => (
                <tr key={f.facility_id} className="border-b border-pwc-gray/30 hover:bg-pwc-gray/20">
                  <td className="py-3 px-4">{f.facility_name}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatUsd(f.drawn_amount)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatUsd(f.committed_amount)}</td>
                  <td className="py-3 px-4 text-center">
                    {f.limit_status_code === 'BREACHED' ? (
                      <span className="text-red-400 font-medium">Breach</span>
                    ) : (
                      <span className="text-pwc-gray-light">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-pwc-gray-light flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Data from <code>facility_exposure_snapshot</code>, <code>limit_utilization_event</code>, <code>limit_rule</code>
        </p>
      </div>
    </div>
  );
}
