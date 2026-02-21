'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, Callout,
  DiagramBox, DataTable, Divider, FilePath,
} from '../Primitives'

export default function S06_CodeOrganization() {
  return (
    <Section id="code-organization">
      <SectionTitle>How the Code Is Organized</SectionTitle>

      <Lead>
        The project follows a standard Next.js structure. Once you learn where things live,
        you can navigate to any file in seconds. This section is your map.
      </Lead>

      {/* ── Top-Level Folders ────────────────────────────────────── */}
      <SubSection id="top-level-folders">
        <SubTitle>Top-Level Folders</SubTitle>

        <DiagramBox title="Project Root">
          <div className="font-mono text-xs space-y-1">
            {[
              { name: 'app/', color: 'text-blue-300', desc: 'Pages and API routes — the "front door"', indent: 0 },
              { name: 'components/', color: 'text-emerald-300', desc: 'Reusable UI components — buttons, cards, layouts', indent: 0 },
              { name: 'lib/', color: 'text-purple-300', desc: 'Core business logic — metrics engine, data stores', indent: 0 },
              { name: 'data/', color: 'text-amber-300', desc: 'Data files — metric definitions, library catalog, JSON', indent: 0 },
              { name: 'sql/', color: 'text-cyan-300', desc: 'SQL files — DDL, population, orchestrator', indent: 0 },
              { name: 'scripts/', color: 'text-pink-300', desc: 'Admin scripts — data generation, migrations, tests', indent: 0 },
              { name: 'types/', color: 'text-slate-300', desc: 'TypeScript type definitions — shared data shapes', indent: 0 },
              { name: 'utils/', color: 'text-slate-300', desc: 'Utility functions — column mapping, layout, colors', indent: 0 },
              { name: 'hooks/', color: 'text-slate-300', desc: 'React hooks — reusable data-fetching logic', indent: 0 },
              { name: 'public/', color: 'text-slate-500', desc: 'Static assets — images, fonts', indent: 0 },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`${f.color} font-semibold w-32 flex-shrink-0`}>{f.name}</span>
                <span className="text-slate-500">{f.desc}</span>
              </div>
            ))}
          </div>
        </DiagramBox>

        <Callout type="tip" title="The 80/20 rule">
          You&apos;ll spend 80% of your time in just 3 folders: <FilePath>sql/</FilePath> (data model),{' '}
          <FilePath>data/</FilePath> (metric definitions), and <FilePath>lib/</FilePath> (business logic).
          The rest is UI and infrastructure you rarely need to touch.
        </Callout>
      </SubSection>

      {/* ── Where to Find Things ─────────────────────────────────── */}
      <SubSection id="where-to-find-things">
        <SubTitle>Where to Find Things</SubTitle>
        <P>
          Use this table when you need to make a change. Find what you want to change in
          the left column, and the right column tells you exactly where to go.
        </P>

        <DataTable
          headers={['I Want To...', 'Go To']}
          rows={[
            ['Add or modify an SQL table (any layer)', <FilePath key="1">sql/l1/</FilePath>, <FilePath key="1b">sql/l2/</FilePath>, <span key="1c"> or </span>, <FilePath key="1d">sql/l3/01_DDL_all_tables.sql</FilePath>].filter(Boolean).reduce((a: any[], b) => [...a, b], []),
            ['Add or modify a metric definition', <FilePath key="2">data/l3-metrics.ts</FilePath>],
            ['Add or modify metric library entries', <FilePath key="3">data/metric-library/</FilePath>],
            ['Change how a metric is calculated', <FilePath key="4">lib/metrics-calculation/engine.ts</FilePath>],
            ['Change how L3 tables are populated', <span key="5"><FilePath>sql/l3/02_POPULATION_tier1.sql</FilePath> through <FilePath>05_POPULATION_tier4.sql</FilePath></span>],
            ['Modify the dashboard UI', <FilePath key="6">components/dashboard/</FilePath>],
            ['Modify the data model visualizer', <FilePath key="7">components/visualizer/</FilePath>],
            ['Modify the metric library UI', <FilePath key="8">components/metric-library/</FilePath>],
            ['Add a new page to the app', <span key="9"><FilePath>app/your-page/page.tsx</FilePath> (create a new folder)</span>],
            ['Add a new API endpoint', <span key="10"><FilePath>app/api/your-endpoint/route.ts</FilePath></span>],
            ['Change L1 table generation', <FilePath key="11">scripts/l1/l1-definitions.ts</FilePath>],
            ['Change L2 table generation', <FilePath key="12">scripts/l2/generate.ts</FilePath>],
            ['Run or test metric calculations', <FilePath key="13">scripts/test-metrics.ts</FilePath>],
            ['Understand naming conventions', <FilePath key="14">sql/l3/09_GLOBAL_CONVENTIONS.md</FilePath>],
            ['Understand seed data rules', <FilePath key="15">sql/SEED_CONVENTIONS.md</FilePath>],
          ]}
        />
      </SubSection>

      {/* ── Key Files Reference ──────────────────────────────────── */}
      <SubSection id="key-files">
        <SubTitle>Key Files Reference</SubTitle>
        <P>
          These are the most important files in the project. Bookmark these — you&apos;ll reference
          them often.
        </P>

        <div className="space-y-4 mb-6">
          {[
            {
              category: 'Data Model',
              files: [
                { path: 'sql/l3/01_DDL_all_tables.sql', desc: 'All 49 L3 table definitions. The single source of truth for L3 structure.' },
                { path: 'sql/l3/06_ORCHESTRATOR.sql', desc: 'Master execution script. Runs everything in the correct order.' },
                { path: 'scripts/l1/l1-definitions.ts', desc: 'All 78 L1 table definitions. Change this to modify L1 structure.' },
                { path: 'sql/l3/09_GLOBAL_CONVENTIONS.md', desc: 'Naming conventions and data type rules. Read before making any changes.' },
              ],
            },
            {
              category: 'Metrics',
              files: [
                { path: 'data/l3-metrics.ts', desc: 'The full catalog of 106+ metric definitions with formulas and sources.' },
                { path: 'data/metric-library/variants.json', desc: 'All metric variants with rollup logic, governance, and formulas.' },
                { path: 'data/metric-library/parent-metrics.json', desc: 'Parent metric definitions — the conceptual layer.' },
                { path: 'data/metric-library/domains.json', desc: 'The 8 domain definitions (CQ, EX, PR, LP, CA, PC, PO, EW).' },
                { path: 'lib/metrics-calculation/engine.ts', desc: 'The calculation engine — runs metrics on demand.' },
              ],
            },
            {
              category: 'Application',
              files: [
                { path: 'app/layout.tsx', desc: 'Root layout — wraps every page. Fonts, global styles.' },
                { path: 'app/page.tsx', desc: 'Home page — the first thing users see.' },
                { path: 'tailwind.config.ts', desc: 'Design system — colors, fonts, spacing definitions.' },
                { path: 'package.json', desc: 'Dependencies and scripts. Lists every library the project uses.' },
              ],
            },
          ].map(cat => (
            <div key={cat.category}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{cat.category}</p>
              <div className="space-y-2">
                {cat.files.map(f => (
                  <div key={f.path} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 bg-slate-900/40 border border-slate-700/40 rounded-lg px-3 py-2">
                    <FilePath>{f.path}</FilePath>
                    <span className="text-xs text-slate-500">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      <Divider />
    </Section>
  )
}
