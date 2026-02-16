'use client';

import { FacilitySummary } from '@/types/facility-summary';
import { useMemo } from 'react';

interface ChartsSectionProps {
  data: FacilitySummary[];
}

export default function ChartsSection({ data }: ChartsSectionProps) {
  const exposureByProduct = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(f => {
      const current = map.get(f.product) || 0;
      map.set(f.product, current + f.outstanding_exposure_usd);
    });
    return Array.from(map.entries())
      .map(([product, exposure]) => ({ product, exposure }))
      .sort((a, b) => b.exposure - a.exposure);
  }, [data]);

  const exposureByRegion = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(f => {
      const current = map.get(f.region) || 0;
      map.set(f.region, current + f.outstanding_exposure_usd);
    });
    return Array.from(map.entries())
      .map(([region, exposure]) => ({ region, exposure }))
      .sort((a, b) => b.exposure - a.exposure);
  }, [data]);

  const exposureByRiskRating = useMemo(() => {
    const map = new Map<number, number>();
    data.forEach(f => {
      const current = map.get(f.internal_risk_rating) || 0;
      map.set(f.internal_risk_rating, current + f.outstanding_exposure_usd);
    });
    return Array.from(map.entries())
      .map(([rating, exposure]) => ({ rating, exposure }))
      .sort((a, b) => a.rating - b.rating);
  }, [data]);

  const maxExposure = Math.max(
    ...exposureByProduct.map(d => d.exposure),
    ...exposureByRegion.map(d => d.exposure),
    ...exposureByRiskRating.map(d => d.exposure)
  );

  const BarChart = ({ data, labelKey, valueKey, maxValue }: {
    data: any[];
    labelKey: string;
    valueKey: string;
    maxValue: number;
  }) => (
    <div className="space-y-2">
      {data.map((item, idx) => {
        const value = item[valueKey];
        const percentage = (value / maxValue) * 100;
        return (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{item[labelKey]}</span>
              <span className="font-semibold text-gray-900">${value.toFixed(1)}M</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exposure by Product</h3>
        <BarChart
          data={exposureByProduct}
          labelKey="product"
          valueKey="exposure"
          maxValue={maxExposure}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exposure by Region</h3>
        <BarChart
          data={exposureByRegion}
          labelKey="region"
          valueKey="exposure"
          maxValue={maxExposure}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exposure by Risk Rating</h3>
        <BarChart
          data={exposureByRiskRating}
          labelKey="rating"
          valueKey="exposure"
          maxValue={maxExposure}
        />
      </div>
    </div>
  );
}
