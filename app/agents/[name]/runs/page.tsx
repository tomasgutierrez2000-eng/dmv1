'use client';

import { use } from 'react';
import RunTimeline from '@/components/agent-library/RunTimeline';

export default function AgentRunsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  return <RunTimeline agentSlug={decodeURIComponent(name)} />;
}
