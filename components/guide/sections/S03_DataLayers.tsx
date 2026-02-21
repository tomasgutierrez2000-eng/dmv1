'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, SubSubTitle, P, Lead, Callout,
  DiagramBox, CardGrid, Card, FlowArrow, DataTable, Divider, FilePath, InlineCode,
} from '../Primitives'

export default function S03_DataLayers() {
  return (
    <Section id="data-layers">
      <SectionTitle badge="L1 / L2 / L3">The Data Layer System</SectionTitle>

      <Lead>
        The platform organizes all data into three layers. Each layer has a single purpose, and each
        layer feeds the next. This separation keeps the system clean, traceable, and scalable.
      </Lead>

      {/* ── Why Layers? ──────────────────────────────────────────── */}
      <SubSection id="why-layers">
        <SubTitle>Why Layers?</SubTitle>
        <P>
          Imagine you run a restaurant. You wouldn&apos;t store raw ingredients, prepped ingredients, and
          plated dishes all in the same fridge. You separate them because each stage has different rules:
          raw ingredients need inspection, prepped ingredients need dating, and plated dishes need
          immediate serving.
        </P>
        <P>
          Data works the same way. Raw reference data (L1) needs to be accurate and stable.
          Time-series snapshots (L2) need to capture change over time. Derived analytics (L3)
          need to combine everything into actionable insights. Mixing them creates chaos.
        </P>

        <DiagramBox title="The Three Layers">
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            {/* L1 */}
            <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-300">L1</div>
                <div>
                  <div className="text-sm font-semibold text-blue-300">Reference Data</div>
                  <div className="text-[10px] text-blue-400/60">78 tables</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Analogy:</strong> Your contact book. Names,
                addresses, and relationships that rarely change. The &quot;who&quot; and &quot;what&quot; of your world.
              </p>
            </div>

            <FlowArrow label="feeds" />

            {/* L2 */}
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300">L2</div>
                <div>
                  <div className="text-sm font-semibold text-emerald-300">Snapshots & Events</div>
                  <div className="text-[10px] text-emerald-400/60">26 tables</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Analogy:</strong> Monthly bank statements. A
                photograph of what things looked like at each point in time.
              </p>
            </div>

            <FlowArrow label="feeds" />

            {/* L3 */}
            <div className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300">L3</div>
                <div>
                  <div className="text-sm font-semibold text-purple-300">Analytics & Reporting</div>
                  <div className="text-[10px] text-purple-400/60">49 tables</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Analogy:</strong> Executive summary reports.
                Calculated numbers, trends, and roll-ups derived from the raw data.
              </p>
            </div>
          </div>
        </DiagramBox>

        <Callout type="tip" title="Key rule">
          Data only flows forward: L1 → L2 → L3. L3 tables can read from L1 and L2, but
          L1 tables never read from L2 or L3. This keeps dependencies clean and predictable.
        </Callout>
      </SubSection>

      {/* ── L1 Reference Data ────────────────────────────────────── */}
      <SubSection id="l1-reference">
        <SubTitle>L1 — Reference Data</SubTitle>
        <P>
          L1 is the foundation. These 78 tables define the core entities in the banking world.
          Think of it as the &quot;master list&quot; of everything that exists: every counterparty, every
          facility, every product type, every currency.
        </P>

        <SubSubTitle>What&apos;s in L1?</SubSubTitle>

        <DataTable
          headers={['Category', 'Key Tables', 'What They Store']}
          rows={[
            [
              'Core Entities',
              <span key="c1"><InlineCode>counterparty</InlineCode>, <InlineCode>facility_master</InlineCode>, <InlineCode>legal_entity</InlineCode></span>,
              'The main players: who borrows money, what loan facilities exist, which legal entities are involved',
            ],
            [
              'Credit',
              <span key="c2"><InlineCode>credit_agreement_master</InlineCode>, <InlineCode>credit_agreement_facility_link</InlineCode></span>,
              'Credit agreements and how they link to specific facilities',
            ],
            [
              'Dimensions',
              <span key="c3"><InlineCode>country_dim</InlineCode>, <InlineCode>industry_dim</InlineCode>, <InlineCode>currency_dim</InlineCode></span>,
              'Lookup tables for categorization — countries, industries, currencies, rating grades',
            ],
            [
              'Collateral',
              <span key="c4"><InlineCode>collateral_type_dim</InlineCode>, <InlineCode>collateral_owner</InlineCode></span>,
              'Types of collateral (real estate, cash, securities) and who owns them',
            ],
            [
              'Limits',
              <span key="c5"><InlineCode>limit_assignment_master</InlineCode>, <InlineCode>limit_rule</InlineCode></span>,
              'Credit limits — how much exposure is allowed per counterparty, industry, etc.',
            ],
            [
              'Taxonomies',
              <span key="c6"><InlineCode>enterprise_business_taxonomy</InlineCode>, <InlineCode>enterprise_product_taxonomy</InlineCode></span>,
              'How the bank organizes its business lines and products',
            ],
          ]}
        />

        <Callout type="info" title="L1 is relatively stable">
          L1 data doesn&apos;t change every day. A counterparty&apos;s name, a facility&apos;s terms, a
          country code — these are set once and updated infrequently. This stability makes
          L1 the reliable foundation everything else builds on.
        </Callout>

        <P>
          <strong>Files:</strong> L1 definitions live in <FilePath>scripts/l1/l1-definitions.ts</FilePath>.
          Generated DDL and seed data go to <FilePath>scripts/l1/output/</FilePath>.
        </P>
      </SubSection>

      {/* ── L2 Snapshots & Events ────────────────────────────────── */}
      <SubSection id="l2-snapshots">
        <SubTitle>L2 — Snapshots & Events</SubTitle>
        <P>
          If L1 is &quot;what exists,&quot; L2 is &quot;what happened and when.&quot; These 26 tables capture
          time-series data — monthly photographs of facility exposure, collateral valuations,
          ratings — plus event records like defaults, amendments, and rating changes.
        </P>

        <SubSubTitle>Two types of L2 data</SubSubTitle>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-emerald-300 mb-2">Snapshots (point-in-time)</p>
            <p className="text-xs text-slate-400 mb-3">
              One row per entity per date. &quot;As of January 31, Facility ABC had $10M outstanding.&quot;
            </p>
            <div className="space-y-1 text-[11px] text-slate-500">
              <div><InlineCode>facility_exposure_snapshot</InlineCode></div>
              <div><InlineCode>collateral_snapshot</InlineCode></div>
              <div><InlineCode>facility_pricing_snapshot</InlineCode></div>
              <div><InlineCode>facility_delinquency_snapshot</InlineCode></div>
              <div><InlineCode>counterparty_behavioral_snapshot</InlineCode></div>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-300 mb-2">Events (things that happened)</p>
            <p className="text-xs text-slate-400 mb-3">
              Individual occurrences. &quot;On February 3, Counterparty X had a rating downgrade.&quot;
            </p>
            <div className="space-y-1 text-[11px] text-slate-500">
              <div><InlineCode>credit_event</InlineCode></div>
              <div><InlineCode>amendment_event</InlineCode></div>
              <div><InlineCode>stress_test_result</InlineCode></div>
              <div><InlineCode>deal_pipeline_fact</InlineCode></div>
              <div><InlineCode>risk_flag</InlineCode></div>
            </div>
          </div>
        </div>

        <Callout type="info" title="The as_of_date pattern">
          Almost every L2 table has an <InlineCode>as_of_date</InlineCode> column. This is the
          &quot;photograph date&quot; — when was this snapshot taken? This pattern lets you compare
          the same facility across months: &quot;Exposure in January was $10M, in February it
          grew to $12M.&quot;
        </Callout>

        <P>
          <strong>Files:</strong> L2 definitions are generated from <FilePath>scripts/l2/generate.ts</FilePath>.
          Output goes to <FilePath>scripts/l2/output/</FilePath>.
        </P>
      </SubSection>

      {/* ── L3 Analytics & Reporting ─────────────────────────────── */}
      <SubSection id="l3-analytics">
        <SubTitle>L3 — Analytics & Reporting</SubTitle>
        <P>
          L3 is where the magic happens. These 49 tables are <strong>derived</strong> — they don&apos;t
          store raw data. Instead, they combine L1 + L2 data through SQL queries to produce
          the actual numbers that appear on dashboards: exposure summaries, risk metrics,
          KPI roll-ups, regulatory snapshots.
        </P>

        <SubSubTitle>The 4-Tier Execution Order</SubSubTitle>
        <P>
          L3 tables are built in a specific order because some depend on others. This order
          is organized into 4 tiers:
        </P>

        <DiagramBox title="L3 Tier Execution Order" caption="Each tier can read from all tiers above it, plus L1 and L2.">
          <div className="space-y-3">
            {[
              { tier: '1', color: 'blue', desc: 'Reads L1 + L2 only', count: '30 tables', examples: 'exposure_metric_cube, risk_metric_cube, portfolio_summary, limit_current_state' },
              { tier: '2', color: 'emerald', desc: 'Reads L1 + L2 + Tier 1', count: '3 tables', examples: 'counterparty_exposure_summary, limit_tier_status_matrix' },
              { tier: '3', color: 'purple', desc: 'Reads L1 + L2 + Tier 1–2', count: '12 tables', examples: 'lob_exposure_summary, data_quality_score_summary, facility_detail_snapshot' },
              { tier: '4', color: 'amber', desc: 'Reads everything', count: '4 tables', examples: 'kpi_period_summary, executive_highlight_summary, risk_appetite_metric_state' },
            ].map(t => (
              <div key={t.tier} className={`flex items-start gap-3 bg-${t.color}-500/5 border border-${t.color}-500/20 rounded-lg p-3`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded bg-${t.color}-500/20 flex items-center justify-center`}>
                  <span className={`text-sm font-bold text-${t.color}-300`}>T{t.tier}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white">{t.desc}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{t.count}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">e.g., {t.examples}</p>
                </div>
              </div>
            ))}
          </div>
        </DiagramBox>

        <Callout type="warning" title="Order matters!">
          If you run Tier 3 before Tier 1, the tables will be empty or have wrong data.
          The orchestrator (<FilePath>sql/l3/06_ORCHESTRATOR.sql</FilePath>) handles this
          automatically — always use it instead of running SQL files manually.
        </Callout>

        <P>
          <strong>Files:</strong> All L3 SQL lives in <FilePath>sql/l3/</FilePath>. The DDL is in{' '}
          <FilePath>sql/l3/01_DDL_all_tables.sql</FilePath>, and population scripts are split by tier
          (02 through 05).
        </P>
      </SubSection>

      {/* ── How Layers Connect ───────────────────────────────────── */}
      <SubSection id="how-layers-connect">
        <SubTitle>How Layers Connect</SubTitle>
        <P>
          Layers connect through <strong>shared keys</strong> — consistent ID columns that appear
          across tables. When you see <InlineCode>facility_id</InlineCode> in an L1 table and the
          same <InlineCode>facility_id</InlineCode> in an L2 table, that&apos;s how the system knows
          they&apos;re talking about the same facility.
        </P>

        <DiagramBox title="Key Connection Example" caption="The same facility_id links data across all three layers.">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
              <div className="font-semibold text-blue-300 mb-1">L1: facility_master</div>
              <div className="font-mono text-[10px] text-slate-400">
                facility_id = &quot;F001&quot;<br />
                facility_name = &quot;Term Loan A&quot;<br />
                committed_amt = 50,000,000
              </div>
            </div>

            <div className="text-slate-500 font-mono text-[10px]">facility_id →</div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
              <div className="font-semibold text-emerald-300 mb-1">L2: facility_exposure_snapshot</div>
              <div className="font-mono text-[10px] text-slate-400">
                facility_id = &quot;F001&quot;<br />
                as_of_date = 2025-01-31<br />
                outstanding_amt = 42,000,000
              </div>
            </div>

            <div className="text-slate-500 font-mono text-[10px]">facility_id →</div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
              <div className="font-semibold text-purple-300 mb-1">L3: exposure_metric_cube</div>
              <div className="font-mono text-[10px] text-slate-400">
                facility_id = &quot;F001&quot;<br />
                utilization_pct = 84.0%<br />
                ead_amt = 45,600,000
              </div>
            </div>
          </div>
        </DiagramBox>

        <DataTable
          headers={['Key Column', 'What It Identifies', 'Found In']}
          rows={[
            [<InlineCode key="k1">facility_id</InlineCode>, 'A specific loan/credit facility', 'All layers'],
            [<InlineCode key="k2">counterparty_id</InlineCode>, 'A specific borrower or client', 'All layers'],
            [<InlineCode key="k3">as_of_date</InlineCode>, 'The snapshot date', 'L2, L3'],
            [<InlineCode key="k4">run_version_id</InlineCode>, 'A specific calculation run', 'L3'],
            [<InlineCode key="k5">legal_entity_id</InlineCode>, 'A legal entity in the bank', 'L1, L3'],
          ]}
        />
      </SubSection>

      <Divider />
    </Section>
  )
}
