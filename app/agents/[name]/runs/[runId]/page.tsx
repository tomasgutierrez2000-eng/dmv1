'use client';

import { use } from 'react';
import ReasoningReplay from '@/components/agent-library/ReasoningReplay';

export default function RunDetailPage({ params }: { params: Promise<{ name: string; runId: string }> }) {
  const { name, runId } = use(params);
  return <ReasoningReplay agentSlug={decodeURIComponent(name)} runId={runId} />;
}
