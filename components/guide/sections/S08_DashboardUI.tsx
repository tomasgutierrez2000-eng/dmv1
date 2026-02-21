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
              '/metrics/library',
              'Metric Library',
              'Browse domains, parent metrics, and variants. View governance and rollup logic.',
              <FilePath key="f3">components/metric-library/</FilePath>,
            ],
            [
              '/metrics/deep-dive',
              'Metrics Deep Dive',
              'Run metric calculations on demand. Currently supports DSCR.',
              <FilePath key="f4">components/metrics-engine/</FilePath>,
            ],
            [
              '/metrics',
              'Metrics Dashboard',
              'View all metrics, explore lineage, and see how metrics are built.',
              <FilePath key="f5">app/metrics/page.tsx</FilePath>,
            ],
            [
              '/dashboard',
              'Facility Dashboard',
              'Executive dashboard — KPIs, charts, filterable facility table.',
              <FilePath key="f6">components/dashboard/</FilePath>,
            ],
            [
              '/agent',
              'AI Agent',
              'Chat with an AI about the data model. Ask questions in plain English.',
              <FilePath key="f7">app/agent/</FilePath>,
            ],
            [
              '/upload',
              'Excel Upload',
              'Upload Excel files to import schema definitions or metric data.',
              <FilePath key="f8">app/upload/</FilePath>,
            ],
            [
              '/guide',
              'Team Playbook',
              'This guide! The page you are reading right now.',
              <FilePath key="f9">components/guide/</FilePath>,
            ],
          ]}
        />
      </SubSection>

      {/* ── Dashboard Overview ───────────────────────────────────── */}
      <SubSection id="dashboard-overview">
        <SubTitle>Facility Dashboard</SubTitle>
        <P>
          The Facility Dashboard (<FilePath>components/dashboard/</FilePath>) is the primary
          executive view. It shows portfolio-level KPIs and lets users drill into individual
          facilities.
        </P>

        <DiagramBox title="Dashboard Layout">
          <div className="space-y-3">
            {/* KPI Row */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Summary Cards (top row)</p>
              <div className="flex flex-wrap gap-2">
                {['Total Facilities', 'Committed Amount', 'Outstanding Exposure', 'Avg Utilization', 'Watch List', 'Avg Risk Rating', 'Coverage Ratio'].map(k => (
                  <div key={k} className="bg-slate-900/60 border border-slate-700/40 rounded px-2 py-1.5 text-[10px] text-slate-300">
                    {k}
                  </div>
                ))}
              </div>
            </div>

            {/* Filters Row */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Filters Bar</p>
              <div className="flex flex-wrap gap-2">
                {['Search', 'Status', 'Product', 'LoB', 'Region', 'Risk Rating', 'Amendments', 'Syndication'].map(f => (
                  <div key={f} className="bg-slate-900/60 border border-slate-600/40 rounded px-2 py-1 text-[10px] text-slate-400">
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Charts Row */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Charts Section</p>
              <div className="flex gap-2">
                {['Exposure by Product', 'Exposure by Region', 'Exposure by Risk Rating'].map(c => (
                  <div key={c} className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded p-2 text-center">
                    <div className="text-lg mb-1">📊</div>
                    <div className="text-[10px] text-slate-400">{c}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Facility Table (sortable, paginated)</p>
              <div className="text-[10px] text-slate-500">
                Columns: Facility Name, Counterparty, Product, Committed, Outstanding, Utilization, Risk Rating, Status...
              </div>
            </div>
          </div>
        </DiagramBox>

        <P>
          <strong>Key component files:</strong>
        </P>
        <DataTable
          headers={['Component', 'File', 'Purpose']}
          rows={[
            ['SummaryCards', <FilePath key="f1">components/dashboard/SummaryCards.tsx</FilePath>, 'The 7 KPI cards at the top'],
            ['FiltersBar', <FilePath key="f2">components/dashboard/FiltersBar.tsx</FilePath>, 'Search and filter controls'],
            ['ChartsSection', <FilePath key="f3">components/dashboard/ChartsSection.tsx</FilePath>, 'The three charts'],
            ['DashboardTable', <FilePath key="f4">components/dashboard/DashboardTable.tsx</FilePath>, 'The sortable facility table'],
            ['DashboardWrapper', <FilePath key="f5">components/dashboard/DashboardWrapper.tsx</FilePath>, 'Orchestrates all components'],
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
            The top-level view showing all 8 domains as tabs. Click a domain to see its
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
