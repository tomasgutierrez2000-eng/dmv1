'use client';

import { create } from 'zustand';
import type {
  AgentDefinition, AgentRun, SchemaChange, MetricDecomposition,
  ReviewFinding, ArtifactSummary, AgentPerformanceSummary, AgentCategory,
} from '@/lib/agent-library/types';

type ArtifactTab = 'schema_changes' | 'decompositions' | 'findings' | 'lineage';

interface AgentLibraryState {
  // Catalog
  agents: AgentDefinition[];
  agentsLoading: boolean;
  agentsError: string | null;
  auditConnected: boolean;
  selectedCategory: AgentCategory | 'all';
  searchQuery: string;

  // Run detail
  currentRuns: AgentRun[];
  runsTotal: number;
  runsPage: number;
  runsLoading: boolean;
  selectedRun: AgentRun | null;
  compareRunId: string | null;

  // Artifacts
  artifactSummary: ArtifactSummary | null;
  artifactTab: ArtifactTab;
  schemaChanges: SchemaChange[];
  decompositions: MetricDecomposition[];
  findings: ReviewFinding[];

  // Performance
  performanceSummaries: AgentPerformanceSummary[];
  performanceLoading: boolean;

  // Actions
  setAgents: (agents: AgentDefinition[], auditConnected: boolean) => void;
  setAgentsLoading: (loading: boolean) => void;
  setAgentsError: (error: string | null) => void;
  setSelectedCategory: (category: AgentCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  setCurrentRuns: (runs: AgentRun[], total: number, page: number) => void;
  setRunsLoading: (loading: boolean) => void;
  setSelectedRun: (run: AgentRun | null) => void;
  setCompareRunId: (runId: string | null) => void;
  setArtifactSummary: (summary: ArtifactSummary) => void;
  setArtifactTab: (tab: ArtifactTab) => void;
  setSchemaChanges: (changes: SchemaChange[]) => void;
  setDecompositions: (decomps: MetricDecomposition[]) => void;
  setFindings: (findings: ReviewFinding[]) => void;
  setPerformanceSummaries: (summaries: AgentPerformanceSummary[]) => void;
  setPerformanceLoading: (loading: boolean) => void;

  // Computed
  filteredAgents: () => AgentDefinition[];
}

export const useAgentLibraryStore = create<AgentLibraryState>((set, get) => ({
  agents: [],
  agentsLoading: false,
  agentsError: null,
  auditConnected: false,
  selectedCategory: 'all',
  searchQuery: '',

  currentRuns: [],
  runsTotal: 0,
  runsPage: 1,
  runsLoading: false,
  selectedRun: null,
  compareRunId: null,

  artifactSummary: null,
  artifactTab: 'schema_changes',
  schemaChanges: [],
  decompositions: [],
  findings: [],

  performanceSummaries: [],
  performanceLoading: false,

  setAgents: (agents, auditConnected) => set({ agents, auditConnected, agentsLoading: false, agentsError: null }),
  setAgentsLoading: (agentsLoading) => set({ agentsLoading }),
  setAgentsError: (agentsError) => set({ agentsError, agentsLoading: false }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCurrentRuns: (currentRuns, runsTotal, runsPage) => set({ currentRuns, runsTotal, runsPage, runsLoading: false }),
  setRunsLoading: (runsLoading) => set({ runsLoading }),
  setSelectedRun: (selectedRun) => set({ selectedRun }),
  setCompareRunId: (compareRunId) => set({ compareRunId }),
  setArtifactSummary: (artifactSummary) => set({ artifactSummary }),
  setArtifactTab: (artifactTab) => set({ artifactTab }),
  setSchemaChanges: (schemaChanges) => set({ schemaChanges }),
  setDecompositions: (decompositions) => set({ decompositions }),
  setFindings: (findings) => set({ findings }),
  setPerformanceSummaries: (performanceSummaries) => set({ performanceSummaries, performanceLoading: false }),
  setPerformanceLoading: (performanceLoading) => set({ performanceLoading }),

  filteredAgents: () => {
    const { agents, selectedCategory, searchQuery } = get();
    let filtered = agents.filter(a => a.category !== 'session');
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.capabilities.some(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      );
    }
    return filtered;
  },
}));
