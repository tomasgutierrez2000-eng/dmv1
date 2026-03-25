import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentLibraryStore } from '../agentLibraryStore';
import type { AgentDefinition, AgentCapability } from '@/lib/agent-library/types';

function makeCap(title: string, description = '', phase: AgentCapability['phase'] = 'general'): AgentCapability {
  return { title, description, phase };
}

function makeAgent(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test agent',
    filePath: '/path/to/test.md',
    category: 'expert',
    status: 'built',
    sessionId: null,
    capabilities: [],
    prerequisites: [],
    dependencies: [],
    version: null,
    inputFormat: null,
    lastRunAt: null,
    totalRuns: 0,
    successRate: null,
    ...overrides,
  };
}

describe('agentLibraryStore — filteredAgents', () => {
  beforeEach(() => {
    const store = useAgentLibraryStore.getState();
    store.setSearchQuery('');
    store.setSelectedCategory('all');
    store.setAgents([], false);
  });

  it('excludes session agents by default', () => {
    const agents = [
      makeAgent({ name: 'Expert A', category: 'expert' }),
      makeAgent({ name: 'Session S1', category: 'session' }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Expert A');
  });

  it('filters by category', () => {
    const agents = [
      makeAgent({ name: 'Expert A', category: 'expert' }),
      makeAgent({ name: 'Builder B', category: 'builder' }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSelectedCategory('builder');
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Builder B');
  });

  it('searches capability titles', () => {
    const agents = [
      makeAgent({
        name: 'Agent A',
        capabilities: [makeCap('Decomposition Engine')],
      }),
      makeAgent({
        name: 'Agent B',
        capabilities: [makeCap('Output Format')],
      }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSearchQuery('decomposition');
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Agent A');
  });

  it('searches capability descriptions', () => {
    const agents = [
      makeAgent({
        name: 'Agent A',
        capabilities: [makeCap('Step 1', 'Performs deep credit risk analysis')],
      }),
      makeAgent({
        name: 'Agent B',
        capabilities: [makeCap('Step 1', 'Generates audit reports')],
      }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSearchQuery('credit risk');
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Agent A');
  });

  it('search matches agent name', () => {
    const agents = [
      makeAgent({ name: 'Credit Risk Decomposition Expert' }),
      makeAgent({ name: 'Market Risk Expert' }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSearchQuery('credit');
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Credit Risk Decomposition Expert');
  });

  it('search matches agent description', () => {
    const agents = [
      makeAgent({ name: 'Agent A', description: 'Handles capital adequacy metrics' }),
      makeAgent({ name: 'Agent B', description: 'Builds database schemas' }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSearchQuery('capital');
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Agent A');
  });

  it('search is case insensitive', () => {
    const agents = [
      makeAgent({
        name: 'Agent A',
        capabilities: [makeCap('DSCR Analysis')],
      }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSearchQuery('dscr');
    expect(useAgentLibraryStore.getState().filteredAgents()).toHaveLength(1);
  });

  it('empty search returns all non-session agents', () => {
    const agents = [
      makeAgent({ name: 'A', category: 'expert' }),
      makeAgent({ name: 'B', category: 'builder' }),
      makeAgent({ name: 'S', category: 'session' }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSearchQuery('');
    expect(useAgentLibraryStore.getState().filteredAgents()).toHaveLength(2);
  });

  it('combines category filter and search', () => {
    const agents = [
      makeAgent({ name: 'Expert A', category: 'expert', capabilities: [makeCap('Risk Analysis')] }),
      makeAgent({ name: 'Builder B', category: 'builder', capabilities: [makeCap('Risk Schema')] }),
    ];
    useAgentLibraryStore.getState().setAgents(agents, false);
    useAgentLibraryStore.getState().setSelectedCategory('expert');
    useAgentLibraryStore.getState().setSearchQuery('risk');
    const filtered = useAgentLibraryStore.getState().filteredAgents();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Expert A');
  });
});
