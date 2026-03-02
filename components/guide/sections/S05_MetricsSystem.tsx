'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, SubSubTitle, P, Lead, Callout,
  DiagramBox, CardGrid, Card, FlowArrow, DataTable, Divider, FilePath, InlineCode,
} from '../Primitives'

export default function S05_MetricsSystem() {
  return (
    <Section id="metrics-system">
      <SectionTitle badge="Metrics">The Metrics System</SectionTitle>

      <Lead>
        Metrics are the heartbeat of this platform. Every number on every dashboard —
        total exposure, DSCR ratio, utilization percentage — is a metric that&apos;s been
        defined, governed, and calculated through a three-layer system.
      </Lead>

      {/* ── Three Layers of Metrics ──────────────────────────────── */}
      <SubSection id="metrics-overview">
        <SubTitle>Three Layers of Metrics</SubTitle>
        <P>
          The metrics system mirrors the data layer concept — three layers, each with a
          clear purpose:
        </P>

        <DiagramBox title="The Three Layers of Metrics" caption="Definition → Specification → Execution">
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="text-xs font-mono text-emerald-400 mb-2">LAYER 1</div>
              <div className="text-sm font-semibold text-emerald-300 mb-2">Data Catalogue</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">The recipe book.</strong> Business definitions,
                ownership, formulas in plain English, rollup rules, governance status.
                &quot;DSCR means NOI divided by Debt Service, owned by Credit Risk, reviewed quarterly.&quot;
              </p>
            </div>

            <FlowArrow label="specifies" />

            <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="text-xs font-mono text-blue-400 mb-2">LAYER 2</div>
              <div className="text-sm font-semibold text-blue-300 mb-2">L3 Metrics Catalog</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">The technical spec.</strong> Executable formulas,
                source table references, SQL queries, dimension-specific overrides.
                &quot;C001: SUM(outstanding_amt) FROM exposure_metric_cube WHERE...&quot;
              </p>
            </div>

            <FlowArrow label="executes" />

            <div className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="text-xs font-mono text-purple-400 mb-2">LAYER 3</div>
              <div className="text-sm font-semibold text-purple-300 mb-2">Calculation Engine</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">The kitchen.</strong> Actually runs the SQL,
                resolves formulas for the requested dimension, returns results.
                &quot;DSCR for Facility F001 = 1.35x&quot;
              </p>
            </div>
          </div>
        </DiagramBox>
      </SubSection>

      {/* ── The Data Catalogue ───────────────────────────────────── */}
      <SubSection id="metric-library">
        <SubTitle>The Data Catalogue</SubTitle>
        <P>
          The Data Catalogue is the single source of truth for what every metric means. It answers:
          What is this metric? Who owns it? How is it calculated? How does it roll up from
          facility level to portfolio level?
        </P>
        <P>
          The library is organized in a hierarchy: <strong>Domains → Parent Metrics → Variants</strong>.
        </P>

        <DiagramBox title="Data Catalogue Hierarchy">
          <div className="space-y-4">
            {/* Domain level */}
            <div className="flex items-center gap-3">
              <div className="w-24 h-10 bg-amber-500/15 border border-amber-500/30 rounded flex items-center justify-center text-xs font-semibold text-amber-300">
                Domain
              </div>
              <div className="text-xs text-slate-400 flex-1">
                A business area. e.g., &quot;Credit Quality&quot; (CQ), &quot;Exposure&quot; (EX), &quot;Profitability&quot; (PR)
              </div>
            </div>

            {/* Arrow */}
            <div className="pl-10 text-slate-600 text-xs">contains ↓</div>

            {/* Parent level */}
            <div className="flex items-center gap-3">
              <div className="w-24 h-10 bg-blue-500/15 border border-blue-500/30 rounded flex items-center justify-center text-xs font-semibold text-blue-300 ml-6">
                Parent
              </div>
              <div className="text-xs text-slate-400 flex-1">
                A metric concept. e.g., &quot;DSCR&quot;, &quot;Total Exposure&quot;, &quot;LGD&quot;
              </div>
            </div>

            {/* Arrow */}
            <div className="pl-16 text-slate-600 text-xs">has variants ↓</div>

            {/* Variant level */}
            <div className="flex items-center gap-3">
              <div className="w-24 h-10 bg-purple-500/15 border border-purple-500/30 rounded flex items-center justify-center text-xs font-semibold text-purple-300 ml-12">
                Variant
              </div>
              <div className="text-xs text-slate-400 flex-1">
                A specific version. e.g., &quot;CRE DSCR (NOI)&quot;, &quot;C&I DSCR (EBITDA)&quot; — same concept, different calculation
              </div>
            </div>
          </div>
        </DiagramBox>

        <Callout type="tip" title="Why variants?">
          Think of &quot;DSCR&quot; (Debt Service Coverage Ratio). It means different things for different
          loan types: for commercial real estate, you use NOI. For corporate loans, you use
          EBITDA. Same parent metric concept, different variant calculations.
        </Callout>

        <P>
          <strong>Files:</strong> The library data lives in <FilePath>data/metric-library/</FilePath> —
          three JSON files: <InlineCode>domains.json</InlineCode>,{' '}
          <InlineCode>parent-metrics.json</InlineCode>, and <InlineCode>variants.json</InlineCode>.
        </P>
      </SubSection>

      {/* ── Domains Explained ────────────────────────────────────── */}
      <SubSection id="domains-explained">
        <SubTitle>Domains</SubTitle>
        <P>
          Domains group related metrics by business area. There are 8 domains:
        </P>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { code: 'CQ', name: 'Credit Quality', color: 'bg-red-500/15 border-red-500/30 text-red-300', examples: 'PD, DSCR, LTV, Rating' },
            { code: 'EX', name: 'Exposure', color: 'bg-blue-500/15 border-blue-500/30 text-blue-300', examples: 'Outstanding, Committed, EAD' },
            { code: 'PR', name: 'Profitability', color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', examples: 'NIM, ROE, Revenue' },
            { code: 'LP', name: 'Loss & Provision', color: 'bg-amber-500/15 border-amber-500/30 text-amber-300', examples: 'EL Rate, LGD, Allowance' },
            { code: 'CA', name: 'Capital', color: 'bg-purple-500/15 border-purple-500/30 text-purple-300', examples: 'RWA, Capital Allocated' },
            { code: 'PC', name: 'Pricing', color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300', examples: 'Spread, Fee Rate, All-In' },
            { code: 'PO', name: 'Portfolio', color: 'bg-pink-500/15 border-pink-500/30 text-pink-300', examples: 'Tenor, Concentration, Maturity' },
            { code: 'EW', name: 'Early Warning', color: 'bg-orange-500/15 border-orange-500/30 text-orange-300', examples: 'Migration, PD Divergence' },
          ].map(d => (
            <div key={d.code} className={`${d.color} border rounded-lg p-3`}>
              <div className="font-mono text-sm font-bold mb-1">{d.code}</div>
              <div className="text-xs font-semibold mb-1">{d.name}</div>
              <div className="text-[10px] text-slate-500">{d.examples}</div>
            </div>
          ))}
        </div>
      </SubSection>

      {/* ── Parents & Variants ───────────────────────────────────── */}
      <SubSection id="parents-and-variants">
        <SubTitle>Parents & Variants</SubTitle>
        <P>
          Each parent metric has key properties that define what it is:
        </P>

        <DataTable
          headers={['Property', 'What It Means', 'Example']}
          rows={[
            ['metric_class', 'How it gets its value', 'SOURCED (from data), CALCULATED (formula), HYBRID (both)'],
            ['unit_type', 'What unit the result is in', 'RATIO (1.35x), PERCENTAGE (84%), CURRENCY ($10M), COUNT (42)'],
            ['direction', 'Is higher better or worse?', 'HIGHER_BETTER (DSCR), LOWER_BETTER (PD), NEUTRAL'],
          ]}
        />

        <P>
          Variants add the specifics: the actual formula, the rollup logic, the governance
          status, and the link to the executable metric in the L3 catalog.
        </P>

        <DataTable
          headers={['Variant Property', 'What It Means', 'Example']}
          rows={[
            ['variant_type', 'SOURCED or CALCULATED', 'CALCULATED — needs a formula to compute'],
            ['status', 'Governance state', 'ACTIVE, DRAFT, DEPRECATED, PROPOSED'],
            ['formula_display', 'Human-readable formula', '"NOI / Debt Service"'],
            ['formula_specification', 'Detailed formula', '"Annual NOI / Sum of Interest + Principal"'],
            ['executable_metric_id', 'Link to L3 catalog', '"C001" — the metric ID in the calculation engine'],
            ['rollup_logic', 'How to aggregate up', 'Facility: take value; Counterparty: weighted avg by EAD'],
            ['weighting_basis', 'What to weight by', 'BY_EAD, BY_OUTSTANDING, BY_COMMITTED'],
          ]}
        />
      </SubSection>

      {/* ── The Rollup Hierarchy ─────────────────────────────────── */}
      <SubSection id="rollup-hierarchy">
        <SubTitle>The Rollup Hierarchy</SubTitle>
        <P>
          Every metric can be viewed at different levels. A DSCR ratio exists at the facility
          level, but the CRO wants to see it at the portfolio level. The rollup hierarchy
          defines how a metric aggregates from the finest grain (facility) up to the broadest
          view (Line of Business).
        </P>

        <DiagramBox title="The 5-Level Rollup Hierarchy" caption="Each variant defines how it aggregates at each level.">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { level: 'Facility', desc: 'Individual loan', color: 'bg-blue-500/15 border-blue-500/30 text-blue-300' },
              { level: 'Counterparty', desc: 'All loans to one borrower', color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
              { level: 'Desk', desc: 'A trading/lending desk', color: 'bg-purple-500/15 border-purple-500/30 text-purple-300' },
              { level: 'Portfolio', desc: 'A portfolio of desks', color: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
              { level: 'LoB', desc: 'Line of Business', color: 'bg-red-500/15 border-red-500/30 text-red-300' },
            ].map((l, i) => (
              <div key={l.level} className="flex items-center gap-2">
                <div className={`${l.color} border rounded-lg px-4 py-3 text-center min-w-[90px]`}>
                  <div className="text-xs font-semibold">{l.level}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{l.desc}</div>
                </div>
                {i < 4 && <FlowArrow />}
              </div>
            ))}
          </div>
        </DiagramBox>

        <P>
          <strong>Common rollup methods:</strong>
        </P>
        <DataTable
          headers={['Method', 'When Used', 'How It Works']}
          rows={[
            ['Weighted average', 'Ratios and percentages', 'Average weighted by exposure (bigger facilities count more)'],
            ['Sum', 'Dollar amounts and counts', 'Simply add up all values'],
            ['Distribution', 'Rating distributions', 'Show the breakdown (30% A-rated, 50% BBB, 20% BB)'],
            ['Worst-of', 'Binary flags', 'If any facility is flagged, the counterparty is flagged'],
          ]}
        />
      </SubSection>

      {/* ── The Calculation Engine ───────────────────────────────── */}
      <SubSection id="calculation-engine">
        <SubTitle>The Calculation Engine</SubTitle>
        <P>
          The Calculation Engine is the machinery that takes a metric definition and produces
          an actual number. When a dashboard needs &quot;DSCR for Facility F001,&quot; here&apos;s what
          happens:
        </P>

        <DiagramBox title="Calculation Engine Flow">
          <div className="space-y-3">
            {[
              { step: '1', label: 'Resolve formula', desc: 'Check if this metric has a dimension-specific formula. If calculating at the counterparty level, use the counterparty formula. Otherwise, use the base formula.' },
              { step: '2', label: 'Check escape hatch', desc: 'Some complex metrics (like DSCR) have custom JavaScript calculators instead of SQL. If one exists, use it.' },
              { step: '3', label: 'Resolve tables', desc: 'Look at the metric\'s source fields to determine which L1/L2/L3 tables are needed.' },
              { step: '4', label: 'Execute SQL', desc: 'Run the formula SQL against the database (or in-memory engine) to get the result.' },
              { step: '5', label: 'Return result', desc: 'Package the result with diagnostics (execution time, tables used, any errors).' },
            ].map(s => (
              <div key={s.step} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-300">{s.step}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{s.label}</p>
                  <p className="text-[11px] text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DiagramBox>

        <P>
          <strong>Key files:</strong>
        </P>
        <DataTable
          headers={['File', 'Purpose']}
          rows={[
            [<FilePath key="f1">lib/metrics-calculation/engine.ts</FilePath>, 'Main orchestrator — coordinates the calculation'],
            [<FilePath key="f2">lib/metrics-calculation/formula-resolver.ts</FilePath>, 'Picks the right formula for the dimension'],
            [<FilePath key="f3">lib/metrics-calculation/sql-runner.ts</FilePath>, 'Executes SQL queries'],
            [<FilePath key="f4">lib/metrics-calculation/table-resolver.ts</FilePath>, 'Finds which tables are needed'],
            [<FilePath key="f5">lib/metrics-calculation/escape-hatch.ts</FilePath>, 'Custom JavaScript calculators (DSCR, etc.)'],
            [<FilePath key="f6">data/l3-metrics.ts</FilePath>, 'The full catalog of 106+ metric definitions'],
          ]}
        />
      </SubSection>

      <Divider />
    </Section>
  )
}
