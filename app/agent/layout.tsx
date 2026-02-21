import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ask the data model | Bank Data Model Visualizer',
  description: 'Chat with an AI assistant about the L1/L2/L3 data model, tables, relationships, and metrics.',
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
