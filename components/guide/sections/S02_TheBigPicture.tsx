'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, Callout,
  DiagramBox, FlowArrow, DataTable, Divider, FilePath,
} from '../Primitives'

export default function S02_TheBigPicture() {
  return (
    <Section id="the-big-picture">
      <SectionTitle badge="Architecture">The Big Picture</SectionTitle>

      <Lead>
        Think of this platform as a factory. Raw materials (source data) come in one end,
        pass through a series of processing stations (layers), and finished products
        (metrics, dashboards, reports) come out the other end.
      </Lead>

      {/* ── Factory Floor ────────────────────────────────────────── */}
      <SubSection id="factory-floor">
        <SubTitle>The Factory Floor</SubTitle>
        <P>
          The entire platform can be understood through this factory metaphor. Each station
          does one job, and hands its output to the next station. Nothing skips a step.
        </P>

        <DiagramBox title="The Factory Floor — End to End" caption="Data flows left-to-right. Each layer feeds the next. Metrics and dashboards consume the final output.">
          <div className="space-y-6">
            {/* Row 1: Main pipeline */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {/* Source */}
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-800 border border-slate-600 flex flex-col items-center justify-center">
                  <div className="text-lg sm:text-2xl mb-1">📦</div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">RAW DATA</div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Source Systems</p>
              </div>

              <FlowArrow />

              {/* L1 */}
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-col items-center justify-center">
                  <div className="text-lg sm:text-2xl mb-1">🗄️</div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-blue-400">L1</div>
                </div>
                <p className="text-[10px] text-blue-300/70 mt-1.5">Reference Data</p>
                <p className="text-[9px] text-slate-500">78 tables</p>
              </div>

              <FlowArrow />

              {/* L2 */}
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center justify-center">
                  <div className="text-lg sm:text-2xl mb-1">📸</div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-emerald-400">L2</div>
                </div>
                <p className="text-[10px] text-emerald-300/70 mt-1.5">Snapshots & Events</p>
                <p className="text-[9px] text-slate-500">26 tables</p>
              </div>

              <FlowArrow />

              {/* L3 */}
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-purple-500/10 border border-purple-500/30 flex flex-col items-center justify-center">
                  <div className="text-lg sm:text-2xl mb-1">📊</div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-purple-400">L3</div>
                </div>
                <p className="text-[10px] text-purple-300/70 mt-1.5">Analytics</p>
                <p className="text-[9px] text-slate-500">49 tables</p>
              </div>

              <FlowArrow />

              {/* Output */}
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center">
                  <div className="text-lg sm:text-2xl mb-1">📈</div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-amber-400">OUTPUT</div>
                </div>
                <p className="text-[10px] text-amber-300/70 mt-1.5">Metrics & Dashboards</p>
                <p className="text-[9px] text-slate-500">106+ metrics</p>
              </div>
            </div>

            {/* Row 2: Supporting systems */}
            <div className="flex items-center justify-center gap-6 border-t border-slate-800 pt-4">
              {[
                { label: 'Data Catalogue', desc: 'Governs definitions' },
                { label: 'Calculation Engine', desc: 'Runs formulas' },
                { label: 'API Layer', desc: 'Serves data' },
                { label: 'UI / Dashboards', desc: 'Visualizes results' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[10px] font-semibold text-slate-300">{s.label}</div>
                  <div className="text-[9px] text-slate-500">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </DiagramBox>
      </SubSection>

      {/* ── End-to-End Flow ──────────────────────────────────────── */}
      <SubSection id="end-to-end-flow">
        <SubTitle>End-to-End Flow</SubTitle>
        <P>
          Here is exactly what happens when data moves through the platform, step by step:
        </P>

        <div className="space-y-3 mb-6">
          {[
            { step: '1', title: 'Source data arrives', desc: 'Raw data from bank systems (loans, ratings, collateral) gets loaded or uploaded via Excel.' },
            { step: '2', title: 'L1 tables are populated', desc: 'Reference/master tables are filled with entity data — who are the counterparties, what facilities exist, what products, what currencies.' },
            { step: '3', title: 'L2 snapshots are created', desc: 'Monthly snapshots capture the state of each facility: exposure amounts, collateral values, ratings, pricing. Events like defaults or amendments are recorded.' },
            { step: '4', title: 'L3 analytics are derived', desc: 'The system joins L1 + L2 data to calculate cubes, summaries, and aggregated views. This happens in 4 tiers — each tier can read from the ones before it.' },
            { step: '5', title: 'Metrics are calculated', desc: 'The Data Catalogue defines what to calculate (e.g., DSCR = NOI / Debt Service). The Calculation Engine runs the formula against the right tables and returns results.' },
            { step: '6', title: 'Dashboards display results', desc: 'The UI pulls metric values through APIs and renders them as KPI cards, charts, tables, and drill-down views.' },
          ].map(s => (
            <div key={s.step} className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-300">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      {/* ── Tech Stack ───────────────────────────────────────────── */}
      <SubSection id="tech-stack">
        <SubTitle>Tech Stack</SubTitle>
        <P>
          You don&apos;t need to be an expert in any of these, but it helps to know what each piece does:
        </P>

        <DataTable
          headers={['Technology', 'What It Is', 'What It Does Here']}
          rows={[
            ['Next.js', 'A web application framework', 'Builds the website — pages, navigation, server-side logic'],
            ['React', 'A UI library', 'Renders the interactive components you see on screen'],
            ['TypeScript', 'JavaScript with types', 'The programming language — adds safety checks to prevent bugs'],
            ['Tailwind CSS', 'A styling system', 'Controls how everything looks — colors, spacing, layout'],
            ['PostgreSQL', 'A database', 'Stores the actual data in tables (like a very powerful spreadsheet)'],
            ['SQL', 'Database language', 'The language used to create tables, insert data, and query results'],
          ]}
        />

        <Callout type="info" title="You don't need to code">
          The platform is designed so that most changes (adding metrics, modifying tables) follow
          clear recipes. You&apos;ll primarily be editing SQL files and JSON configuration — not writing
          application code from scratch.
        </Callout>
      </SubSection>

      <Divider />
    </Section>
  )
}
