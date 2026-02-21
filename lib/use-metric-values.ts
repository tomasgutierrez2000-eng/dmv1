'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConsumptionLevel } from '@/data/l3-metrics';

export interface MetricValuesConfig {
  metricId: string;
  variantId?: string | null;
  level: ConsumptionLevel;
  asOfDate?: string | null;
  runVersion?: string | null;
  facilityId?: string | null;
  counterpartyId?: string | null;
  portfolioId?: string | null;
  deskId?: string | null;
  lobId?: string | null;
}

export interface MetricValueRow {
  run_version_id: string;
  as_of_date: string;
  metric_id: string;
  variant_id: string | null;
  aggregation_level: string;
  facility_id: string | null;
  counterparty_id: string | null;
  desk_id: string | null;
  portfolio_id: string | null;
  lob_id: string | null;
  value: number | null;
  unit?: string | null;
  display_format?: string | null;
}

export interface MetricValuesResponse {
  metric: { id: string; name: string; displayFormat?: string };
  level: string;
  asOfDate: string;
  runVersion: string;
  rows: MetricValueRow[];
}

export function useMetricValues(config: MetricValuesConfig | null) {
  const [data, setData] = useState<MetricValuesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchValues = useCallback(() => {
    if (!config?.metricId?.trim() || !config?.level) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('metricId', config.metricId.trim());
    params.set('level', config.level);
    if (config.variantId) params.set('variantId', config.variantId);
    if (config.asOfDate) params.set('asOfDate', config.asOfDate);
    if (config.runVersion) params.set('runVersion', config.runVersion);
    if (config.facilityId) params.set('facilityId', config.facilityId);
    if (config.counterpartyId) params.set('counterpartyId', config.counterpartyId);
    if (config.portfolioId) params.set('portfolioId', config.portfolioId);
    if (config.deskId) params.set('deskId', config.deskId);
    if (config.lobId) params.set('lobId', config.lobId);
    fetch(`/api/metrics/values?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          let message = res.statusText;
          try {
            const b = await res.json();
            if (b?.error && typeof b.error === 'string') message = b.error;
          } catch {
            // use statusText
          }
          throw new Error(message);
        }
        return res.json() as Promise<MetricValuesResponse>;
      })
      .then((body) => {
        setData(body);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to fetch metric values');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [config?.metricId, config?.level, config?.variantId, config?.asOfDate, config?.runVersion, config?.facilityId, config?.counterpartyId, config?.portfolioId, config?.deskId, config?.lobId]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  return { data, error, loading, refetch: fetchValues };
}
