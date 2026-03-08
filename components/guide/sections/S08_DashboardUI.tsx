'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, Callout,
  DiagramBox, DataTable, CardGrid, Card, Divider, FilePath,
} from '../Primitives'

export default function S08_DashboardUI() {
  return (
    <Section id="dashboard-ui">
      <SectionTitle>The Dashboard & UI</SectionTitle>

      <Lead>
        The UI is how users interact with all the data and metrics. The platform has multiple
        pages, each serving a different purpose. This section maps every page and explains
        what it does.
      </Lead>

      {/* ── Page Map ─────────────────────────────────────────────── */}
      <SubSection id="page-map">
        <SubTitle>Page Map</SubTitle>
        <P>
          Every page in the application corresponds to a folder in <FilePath>app/</FilePath>.
          Here is the complete map:
        </P>

        <DataTable
          headers={['URL', 'Page Name', 'What It Does', 'Key Component']}
          rows={[
            [
              '/',
              'Home / Overview',
              'Landing page — shows the three-layer architecture overview and quick links',
              <FilePath key="f0">components/overview/OverviewContent.tsx</FilePath>,
            ],
            [
              '/visualizer',
              'Data Model Visualizer',
              'Interactive ERD — explore tables, fields, and relationships visually',
              <FilePath key="f1">components/visualizer/</FilePath>,
            ],
            [
              '/data-model',
              'Data Model Editor',
              'Add, remove, or edit tables and fields. See impact analysis.',
              <FilePath key="f2">app/data-model/</FilePath>,
            ],
            [
              '/data-elements',
              'Data Elements',
              'Browse all tables, fields, and relationships with search and detail views.',
              <FilePath key="f3">components/data-elements/</FilePath>,
            ],
            [
              '/metrics/library',
              'Metric Library',
              'Browse domains, parent metrics, and variants. View governance and rollup logic.',
              <FilePath key="f4">components/metric-library/</FilePath>,
            ],
            [
              '/executive-summary',
              'Executive Summary',
              'Animated four-act walkthrough of the data architecture for stakeholders.',
              <FilePath key="f5">components/executive-summary/</FilePath>,
            ],
            [
              '/agent',
              'AI Agent',
              'Chat with an AI about the data model. Ask questions in plain English.',
              <FilePath key="f6">app/agent/</FilePath>,
            ],
            [
              '/upload',
              'Excel Upload',
              'Upload Excel files to import schema definitions or metric data.',
              <FilePath key="f7">app/upload/</FilePath>,
            ],
            [
              '/guide',
              'Team Playbook',
              'This guide! The page you are reading right now.',
              <FilePath key="f8">components/guide/</FilePath>,
            ],
            [
              '/architecture',
              'Architecture',
              'Technical pipeline diagram showing the L1 → L2 → L3 data flow.',
              <FilePath key="f9">components/architecture/</FilePath>,
            ],
            [
              '/release-tracker',
              'Release Tracker',
              'Changelog tracking schema evolution across versions.',
              <FilePath key="f10">lib/release-tracker-data.ts</FilePath>,
            ],
          ]}
        />
      </SubSection>

      {/* ── Visualizer Overview ──────────────────────────────────── */}
      <SubSection id="visualizer-overview">
        <SubTitle>Data Model Visualizer</SubTitle>
        <P>
          The visualizer (<FilePath>components/visualizer/</FilePath>) is an interactive ERD
          (Entity Relationship Diagram) that lets you explore the data model visually. You can:
        </P>
        <div className="space-y-1.5 mb-6">
          {[
            'Zoom and pan across the full data model',
            'Click tables to see their fields, descriptions, and relationships',
            'See connection lines between related tables (solid = same layer, dashed = cross-layer)',
            'Filter by layer (L1, L2, L3) or category',
            'Search for specific tables or fields',
            'Auto-layout the diagram in different arrangements (grid, hierarchical, circular)',
          ].map((item, i) => (
            <div key={i} className="flex gap-2 items-start text-sm text-slate-300">
              <span className="text-slate-600">-</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SubSection>

      {/* ── Library Overview ─────────────────────────────────────── */}
      <SubSection id="library-overview">
        <SubTitle>Metric Library UI</SubTitle>
        <P>
          The Metric Library UI (<FilePath>components/metric-library/</FilePath>) is how you
          browse and manage metric definitions. It has three views:
        </P>

        <CardGrid>
          <Card title="Main View" subtitle="LibraryMainView.tsx" accent="bg-blue-500">
            The top-level view showing all domains as tabs. Click a domain to see its
            parent metrics. Shows counts, search, and domain descriptions.
          </Card>
          <Card title="Parent Detail" subtitle="ParentDetailView.tsx" accent="bg-emerald-500">
            Click a parent metric to see all its variants. Shows the metric class, unit type,
            direction, and rollup philosophy. Lists all variants with their status badges.
          </Card>
          <Card title="Variant Detail" subtitle="VariantDetailView.tsx" accent="bg-purple-500">
            The deepest view — shows the full variant specification: formula, rollup logic at
            each level (facility → counterparty → desk → portfolio → LoB), governance fields,
            and the link to the executable metric.
          </Card>
        </CardGrid>
      </SubSection>

      <Divider />
    </Section>
  )
}
