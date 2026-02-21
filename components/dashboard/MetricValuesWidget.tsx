'use client';

import { useMetricValues, type MetricValuesConfig } from '@/lib/use-metric-values';

interface MetricValuesWidgetProps {
  config: MetricValuesConfig | null;
  maxRows?: number;
  className?: string;
}

export default function MetricValuesWidget({ config, maxRows = 10, className = '' }: MetricValuesWidgetProps) {
  const { data, error, loading } = useMetricValues(config);

  if (!config?.metricId || !config?.level) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Select a metric and level to load values.
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-amber-400 ${className}`}>
        {error}
      </div>
    );
  }

  if (!data?.rows?.length) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No rows returned for this metric and level.
      </div>
    );
  }

  const rows = data.rows.slice(0, maxRows);
  const level = data.level;
  const LEVEL_ID_KEY: Record<string, keyof typeof data.rows[0]> = {
    facility: 'facility_id',
    counterparty: 'counterparty_id',
    desk: 'desk_id',
    portfolio: 'portfolio_id',
    lob: 'lob_id',
  };
  const idKey = LEVEL_ID_KEY[level] ?? 'facility_id';

  return (
    <div className={className}>
      <p className="text-xs text-gray-500 mb-2">
        {data.metric.name} at {level} (as of {data.asOfDate || 'latest'})
      </p>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th scope="col" className="px-3 py-2 font-medium text-gray-400">{level} id</th>
              <th scope="col" className="px-3 py-2 font-medium text-gray-400">value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const idVal = row[idKey];
              const val = row.value;
              return (
                <tr key={row.facility_id ?? row.counterparty_id ?? row.desk_id ?? row.portfolio_id ?? row.lob_id ?? i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2 font-mono text-gray-300">{String(idVal ?? '—')}</td>
                  <td className="px-3 py-2 text-white">
                    {val != null ? (typeof val === 'number' && !Number.isNaN(val) ? val : String(val)) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.rows.length > maxRows && (
        <p className="text-xs text-gray-500 mt-1">
          Showing {maxRows} of {data.rows.length} rows.
        </p>
      )}
    </div>
  );
}
