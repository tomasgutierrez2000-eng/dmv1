'use client';

import { useRouter } from 'next/navigation';
import DSCRResultsView from '@/components/metrics-engine/DSCRResultsView';

export default function DSCRResultsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <DSCRResultsView onBack={() => router.push('/metrics')} />
    </div>
  );
}
