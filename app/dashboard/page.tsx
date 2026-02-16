'use client';

import { useEffect, useState, useMemo } from 'react';
import { FacilitySummary } from '@/types/facility-summary';
import DashboardTable from '@/components/dashboard/DashboardTable';
import SummaryCards from '@/components/dashboard/SummaryCards';
import ChartsSection from '@/components/dashboard/ChartsSection';
import FiltersBar from '@/components/dashboard/FiltersBar';

export default function DashboardPage() {
  const [data, setData] = useState<FacilitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    facilityStatus: '',
    product: '',
    lobL1: '',
    region: '',
    riskRating: '',
    hasAmendment: '',
    isSyndicated: '',
  });

  useEffect(() => {
    fetch('/api/facility-summary')
      .then((res) => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || `HTTP ${res.status}: ${res.statusText}`);
          });
        }
        return res.json();
      })
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
        } else {
          throw new Error('Invalid data format received from API');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading facility summary:', err);
        setError(err.message || 'Failed to load facility data. Make sure the data has been generated.');
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((facility) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !facility.facility_id.toLowerCase().includes(searchLower) &&
          !facility.counterparty_name.toLowerCase().includes(searchLower) &&
          !facility.credit_agreement_id.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.facilityStatus && facility.facility_status !== filters.facilityStatus) {
        return false;
      }
      if (filters.product && facility.product !== filters.product) {
        return false;
      }
      if (filters.lobL1 && facility.lob_l1_name !== filters.lobL1) {
        return false;
      }
      if (filters.region && facility.region !== filters.region) {
        return false;
      }
      if (filters.riskRating && facility.internal_risk_rating.toString() !== filters.riskRating) {
        return false;
      }
      if (filters.hasAmendment === 'yes' && !facility.has_amendment) {
        return false;
      }
      if (filters.hasAmendment === 'no' && facility.has_amendment) {
        return false;
      }
      if (filters.isSyndicated === 'yes' && !facility.is_syndicated) {
        return false;
      }
      if (filters.isSyndicated === 'no' && facility.is_syndicated) {
        return false;
      }
      return true;
    });
  }, [data, filters]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: '#4b5563' }}>Loading facility data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-xl font-semibold text-red-800 mb-2">Error loading data</p>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="text-sm text-left bg-white p-4 rounded border" style={{ color: '#4b5563' }}>
              <p className="font-semibold mb-2">Troubleshooting steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Make sure you&apos;ve generated the data: <code className="bg-gray-100 px-1 rounded">cd facility-summary-mvp && npm run dev</code></li>
                <li>Verify the file exists: <code className="bg-gray-100 px-1 rounded">facility-summary-mvp/output/l3/facility-summary.json</code></li>
                <li>Check the browser console and server terminal for detailed errors</li>
                <li>Try refreshing the page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Credit Risk Dashboard</h1>
          <p className="mt-2 text-sm" style={{ color: '#4b5563' }}>
            Facility Summary Analysis - {filteredData.length} of {data.length} facilities
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SummaryCards data={filteredData} />
        
        <div className="mt-8">
          <FiltersBar filters={filters} setFilters={setFilters} data={data} />
        </div>

        <div className="mt-8">
          <ChartsSection data={filteredData} />
        </div>

        <div className="mt-8">
          <DashboardTable data={filteredData} />
        </div>
      </div>
    </>
  );
}
