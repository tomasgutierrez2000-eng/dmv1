/**
 * Guide Section Registry
 * ─────────────────────
 * To add a new section:
 *   1. Create a component in components/guide/sections/YourSection.tsx
 *   2. Add an entry to GUIDE_SECTIONS below
 *   3. That's it — it auto-appears in the sidebar nav + page
 *
 * Sections render in the order they appear in this array.
 */

export interface GuideSection {
  /** Unique slug used for URL hash and scroll target */
  id: string
  /** Display title in the sidebar */
  title: string
  /** Short label shown next to the title (optional) */
  badge?: string
  /** Icon name from lucide-react (rendered by the layout) */
  icon: string
  /** Subsections for nested TOC (optional, auto-generated scroll targets) */
  subsections?: { id: string; title: string }[]
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'what-this-platform-does',
    title: 'What This Platform Does',
    icon: 'Rocket',
    subsections: [
      { id: 'the-problem', title: 'The Problem' },
      { id: 'what-we-built', title: 'What We Built' },
      { id: 'who-uses-it', title: 'Who Uses It' },
    ],
  },
  {
    id: 'the-big-picture',
    title: 'The Big Picture',
    icon: 'Map',
    badge: 'Architecture',
    subsections: [
      { id: 'factory-floor', title: 'The Factory Floor' },
      { id: 'end-to-end-flow', title: 'End-to-End Flow' },
      { id: 'tech-stack', title: 'Tech Stack' },
    ],
  },
  {
    id: 'data-layers',
    title: 'The Data Layer System',
    icon: 'Layers',
    badge: 'L1 / L2 / L3',
    subsections: [
      { id: 'why-layers', title: 'Why Layers?' },
      { id: 'l1-reference', title: 'L1 — Reference Data' },
      { id: 'l2-snapshots', title: 'L2 — Snapshots & Events' },
      { id: 'l3-analytics', title: 'L3 — Analytics & Reporting' },
      { id: 'how-layers-connect', title: 'How Layers Connect' },
    ],
  },
  {
    id: 'sql-files',
    title: 'Understanding the SQL Files',
    icon: 'FileCode2',
    badge: 'SQL',
    subsections: [
      { id: 'what-is-sql', title: 'What Is SQL?' },
      { id: 'sql-file-map', title: 'The File Map' },
      { id: 'ddl-walkthrough', title: 'DDL: Creating Tables' },
      { id: 'population-walkthrough', title: 'Population: Filling Tables' },
      { id: 'orchestrator-walkthrough', title: 'The Orchestrator' },
      { id: 'naming-conventions', title: 'Naming Conventions' },
    ],
  },
  {
    id: 'metrics-system',
    title: 'The Metrics System',
    icon: 'BarChart3',
    badge: 'Metrics',
    subsections: [
      { id: 'metrics-overview', title: 'Three Layers of Metrics' },
      { id: 'metric-library', title: 'The Metric Library' },
      { id: 'domains-explained', title: 'Domains' },
      { id: 'parents-and-variants', title: 'Parents & Variants' },
      { id: 'rollup-hierarchy', title: 'The Rollup Hierarchy' },
      { id: 'calculation-engine', title: 'The Calculation Engine' },
    ],
  },
  {
    id: 'code-organization',
    title: 'How the Code Is Organized',
    icon: 'FolderTree',
    subsections: [
      { id: 'top-level-folders', title: 'Top-Level Folders' },
      { id: 'where-to-find-things', title: 'Where to Find Things' },
      { id: 'key-files', title: 'Key Files Reference' },
    ],
  },
  {
    id: 'api-layer',
    title: 'The API Layer',
    icon: 'Plug',
    subsections: [
      { id: 'what-is-api', title: 'What Is an API?' },
      { id: 'api-reference', title: 'API Reference' },
    ],
  },
  {
    id: 'dashboard-ui',
    title: 'The Dashboard & UI',
    icon: 'LayoutDashboard',
    subsections: [
      { id: 'page-map', title: 'Page Map' },
      { id: 'dashboard-overview', title: 'Facility Dashboard' },
      { id: 'visualizer-overview', title: 'Data Model Visualizer' },
      { id: 'library-overview', title: 'Metric Library UI' },
    ],
  },
  {
    id: 'recipes',
    title: 'Recipes',
    icon: 'ChefHat',
    badge: 'How-To',
    subsections: [
      { id: 'recipe-add-table', title: 'Add a New SQL Table' },
      { id: 'recipe-add-field', title: 'Add a Field to a Table' },
      { id: 'recipe-add-metric', title: 'Add a New Metric' },
      { id: 'recipe-modify-metric', title: 'Modify an Existing Metric' },
      { id: 'recipe-execution-order', title: 'Understand Execution Order' },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    icon: 'BookOpen',
    subsections: [
      { id: 'sql-terms', title: 'SQL Terms' },
      { id: 'domain-abbreviations', title: 'Domain Abbreviations' },
      { id: 'platform-terms', title: 'Platform Terms' },
    ],
  },
]
