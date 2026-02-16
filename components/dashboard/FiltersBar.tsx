'use client';

import { FacilitySummary } from '@/types/facility-summary';
import { Search, X } from 'lucide-react';

interface FiltersBarProps {
  filters: {
    search: string;
    facilityStatus: string;
    product: string;
    lobL1: string;
    region: string;
    riskRating: string;
    hasAmendment: string;
    isSyndicated: string;
  };
  setFilters: (filters: any) => void;
  data: FacilitySummary[];
}

export default function FiltersBar({ filters, setFilters, data }: FiltersBarProps) {
  const uniqueProducts = Array.from(new Set(data.map(f => f.product))).sort();
  const uniqueLobL1 = Array.from(new Set(data.map(f => f.lob_l1_name))).sort();
  const uniqueRegions = Array.from(new Set(data.map(f => f.region))).sort();
  const uniqueStatuses = Array.from(new Set(data.map(f => f.facility_status))).sort();
  const uniqueRatings = Array.from(new Set(data.map(f => f.internal_risk_rating))).sort((a, b) => a - b);

  const clearFilters = () => {
    setFilters({
      search: '',
      facilityStatus: '',
      product: '',
      lobL1: '',
      region: '',
      riskRating: '',
      hasAmendment: '',
      isSyndicated: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <X className="w-4 h-4 mr-1" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Facility ID, Counterparty..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.facilityStatus}
            onChange={(e) => setFilters({ ...filters, facilityStatus: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product
          </label>
          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {uniqueProducts.map(product => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Line of Business
          </label>
          <select
            value={filters.lobL1}
            onChange={(e) => setFilters({ ...filters, lobL1: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {uniqueLobL1.map(lob => (
              <option key={lob} value={lob}>{lob}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <select
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {uniqueRegions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Risk Rating
          </label>
          <select
            value={filters.riskRating}
            onChange={(e) => setFilters({ ...filters, riskRating: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            {uniqueRatings.map(rating => (
              <option key={rating} value={rating.toString()}>{rating}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Has Amendment
          </label>
          <select
            value={filters.hasAmendment}
            onChange={(e) => setFilters({ ...filters, hasAmendment: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Syndicated
          </label>
          <select
            value={filters.isSyndicated}
            onChange={(e) => setFilters({ ...filters, isSyndicated: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
    </div>
  );
}
