'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import UndrawnExposurePipelineView from '@/components/metrics-engine/pipeline/UndrawnExposurePipelineView';

export default function UndrawnExposureLineagePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <UndrawnExposurePipelineView onBack={() => router.push('/metrics')} />
    </div>
  );
}
