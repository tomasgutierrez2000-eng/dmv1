'use client';

import { use } from 'react';
import AgentDetail from '@/components/agent-library/AgentDetail';

export default function AgentDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  return <AgentDetail slug={decodeURIComponent(name)} />;
}
