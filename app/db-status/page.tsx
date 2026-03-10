import { Suspense } from 'react';
import DbStatusDashboard from '@/components/db-status/DbStatusDashboard';

export const metadata = {
  title: 'Database Status',
  description: 'View database connection status, table row counts, and loading stages',
};

export default function DbStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
          Loading...
        </div>
      }
    >
      <DbStatusDashboard />
    </Suspense>
  );
}
