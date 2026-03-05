'use client';

import { useRouter } from 'next/navigation';
import PipelineDemoWrapper from '@/components/metrics-engine/pipeline/PipelineDemoWrapper';

export default function DSCRResultsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <PipelineDemoWrapper onBack={() => router.push('/metrics')} />
    </div>
  );
}
