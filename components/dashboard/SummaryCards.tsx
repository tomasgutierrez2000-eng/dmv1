'use client';

import { FacilitySummary } from '@/types/facility-summary';
import { TrendingUp, TrendingDown, DollarSign, Building2, AlertCircle, Users } from 'lucide-react';

interface SummaryCardsProps {
  data: FacilitySummary[];
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const totalFacilities = data.length;
  const totalCommitted = data.reduce((sum, f) => sum + f.committed_amount_usd, 0);
  const totalOutstanding = data.reduce((sum, f) => sum + f.outstanding_exposure_usd, 0);
  const avgUtilization = data.length > 0 
    ? data.reduce((sum, f) => sum + f.utilization_pct, 0) / data.length 
    : 0;
  const facilitiesWithAmendments = data.filter(f => f.has_amendment).length;
  const syndicatedFacilities = data.filter(f => f.is_syndicated).length;
  const avgRiskRating = data.length > 0
    ? data.reduce((sum, f) => sum + f.internal_risk_rating, 0) / data.length
    : 0;
  const totalExposureChange = data.reduce((sum, f) => sum + f.exposure_change_pct, 0) / data.length;

  const cards = [
    {
      title: 'Total Facilities',
      value: totalFacilities.toLocaleString(),
      icon: Building2,
      color: 'bg-blue-500',
      change: null,
    },
    {
      title: 'Total Committed',
      value: `$${totalCommitted.toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-green-500',
      change: null,
    },
    {
      title: 'Total Outstanding',
      value: `$${totalOutstanding.toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-purple-500',
      change: totalExposureChange > 0 ? 'up' : totalExposureChange < 0 ? 'down' : null,
      changeValue: `${(totalExposureChange * 100).toFixed(1)}%`,
    },
    {
      title: 'Avg Utilization',
      value: `${(avgUtilization * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: null,
    },
    {
      title: 'With Amendments',
      value: facilitiesWithAmendments.toLocaleString(),
      icon: AlertCircle,
      color: 'bg-yellow-500',
      change: null,
    },
    {
      title: 'Syndicated',
      value: syndicatedFacilities.toLocaleString(),
      icon: Users,
      color: 'bg-indigo-500',
      change: null,
    },
    {
      title: 'Avg Risk Rating',
      value: avgRiskRating.toFixed(2),
      icon: AlertCircle,
      color: 'bg-red-500',
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                {card.change && (
                  <div className={`mt-2 flex items-center text-sm ${
                    card.change === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change === 'up' ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {card.changeValue}
                  </div>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
