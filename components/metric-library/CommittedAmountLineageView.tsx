'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Calculator,
  Network,
  Database,
  Layers,
  Link2,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  Search,
  Zap,
  Sparkles,
  GitBranch,
} from 'lucide-react';

/* ── Data ── */
import {
  TOTAL_COMMITTED_USD,
} from './committed-lineage/committed-lineage-data';

/* ── Components ── */
import {
  fmtDollar,
  SectionHeading,
  FlowArrow,
  InsightCallout,
  MetricDefinitionCard,
  InteractiveJoinMap,
  FKExplorer,
  L1Tables,
  L2FieldTable,
  SyndicationCallout,
  FxSensitivityCallout,
  RiskBearingCallout,
  QueryPlanView,
  FacilityCalcTable,
  CounterpartyCalcTable,
  AnimatedDataFlow,
  RollupPyramid,
  LineageAuditTrail,
  ProvenanceBreadcrumb,
  useActiveSection,
  FooterLegend,
} from './committed-lineage/committed-lineage-components';

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CommittedAmountLineageView() {
  const [expandedLevel, setExpandedLevel] = useState<string | null>('facility');
  const activeSection = useActiveSection();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link
                href="/metrics/library"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors mb-1 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Metric Library
              </Link>
              <h1 className="text-xl font-bold text-white">Committed Amount (USD) — End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From facility commitment through FX conversion & syndication share to dashboard —{' '}
                <span className="text-teal-400 font-medium">{fmtDollar(TOTAL_COMMITTED_USD)}</span> across 3 facilities
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-xs text-gray-400">Facility Path</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-400">Counterparty Path</span>
              </div>
            </div>
          </div>
          {/* Provenance Breadcrumb */}
          <ProvenanceBreadcrumb activeSection={activeSection} />
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-2">
        {/* ── SECTION 1: METRIC DEFINITION ── */}
        <section id="section-definition" aria-labelledby="heading-definition">
          <SectionHeading
            id="heading-definition"
            icon={Calculator}
            step="Step 1 — Metric Definition"
            layerColor="bg-teal-600"
            title="Committed Amount (USD)"
            subtitle="Two calculation paths — facility-level direct multiplication vs counterparty-level pre-computed attribution"
          />
          <InsightCallout>
            <strong>Same metric, two paths.</strong> The facility path multiplies raw components (commitment × FX × bank share).
            The counterparty path uses pre-computed attributed amounts with risk-bearing filtering and multi-borrower attribution.
            Both paths converge to the same total: <strong className="text-teal-300">{fmtDollar(TOTAL_COMMITTED_USD)}</strong>.
          </InsightCallout>
          <div className="mt-4">
            <MetricDefinitionCard />
          </div>
        </section>

        <FlowArrow label="Components map to data model fields" />

        {/* ── SECTION 2: INTERACTIVE JOIN MAP ── */}
        <section id="section-join-map" aria-labelledby="heading-join-map">
          <SectionHeading
            id="heading-join-map"
            icon={Network}
            step="Data Plumbing"
            layerColor="bg-cyan-600"
            title="Table-to-Table Join Map"
            subtitle="Every FK relationship used to compute committed amount — hover any table to trace its connections"
          />
          <InteractiveJoinMap />
          <InsightCallout>
            <strong>4 layers, 8 tables, 10 join relationships.</strong> Every committed amount value can be traced through this
            exact join graph. The <code className="text-blue-300">facility_master</code> table is the central hub — it connects
            L1 dimensions to L2 snapshots via <code className="text-amber-300">facility_id</code>.
            FX conversion flows through <code className="text-blue-300">fx_rate</code> and syndication shares through{' '}
            <code className="text-blue-300">facility_lender_allocation</code>.
          </InsightCallout>
          <div className="mt-4">
            <FKExplorer />
          </div>
        </section>

        <FlowArrow label="L1 dimensions anchor L2 snapshots" />

        {/* ── SECTION 3: L1 REFERENCE TABLES ── */}
        <section id="section-l1-reference" aria-labelledby="heading-l1-reference">
          <SectionHeading
            id="heading-l1-reference"
            icon={Database}
            step="Step 2 — L1 Reference Data"
            layerColor="bg-blue-600"
            title="Dimensional Anchors"
            subtitle="Reference tables that identify facilities, FX rates, syndication shares, counterparty roles, and business hierarchy"
          />
          <L1Tables />
          <InsightCallout>
            <strong>6 dimensional tables anchor every committed amount calculation.</strong>{' '}
            <code className="text-blue-300">facility_master</code> is the central hub linking to FX rates (
            <code className="text-blue-300">fx_rate</code>), syndication shares (
            <code className="text-blue-300">facility_lender_allocation</code>), counterparty roles (
            <code className="text-blue-300">counterparty_role_dim</code>), and the business hierarchy (
            <code className="text-blue-300">enterprise_business_taxonomy</code>).
          </InsightCallout>
        </section>

        <FlowArrow label="Dimension keys join to snapshot data" />

        {/* ── SECTION 4: L2 SNAPSHOT DATA ── */}
        <section id="section-l2-snapshot" aria-labelledby="heading-l2-snapshot">
          <SectionHeading
            id="heading-l2-snapshot"
            icon={Layers}
            step="Step 3 — L2 Snapshot Data"
            layerColor="bg-amber-600"
            title="Source Data Tables"
            subtitle="Two L2 tables serve the two paths — position_detail for facility path, exposure_counterparty_attribution for counterparty path"
          />
          <L2FieldTable />
          <InsightCallout>
            <strong>Two source tables, two calculation paths.</strong>{' '}
            <code className="text-amber-300">position_detail</code> provides raw commitment amounts for the facility path.{' '}
            <code className="text-amber-300">exposure_counterparty_attribution</code> provides pre-computed attributed amounts
            with multi-borrower splits for the counterparty path. Click any field for X-Ray metadata.
          </InsightCallout>
        </section>

        <FlowArrow label="Context: Why syndication share matters" />

        {/* ── SECTION 5: SYNDICATION SHARE ── */}
        <section id="section-syndication" aria-labelledby="heading-syndication">
          <SectionHeading
            id="heading-syndication"
            icon={Link2}
            step="Syndication Context"
            layerColor="bg-blue-600"
            title="Bank Share in Syndicated Facilities"
            subtitle="F-3 Pacific Ridge — why bank_share_pct prevents overstating your exposure"
          />
          <SyndicationCallout />
        </section>

        <FlowArrow label="Context: Why FX rates matter" />

        {/* ── SECTION 6: FX SENSITIVITY ── */}
        <section id="section-fx-sensitivity" aria-labelledby="heading-fx-sensitivity">
          <SectionHeading
            id="heading-fx-sensitivity"
            icon={AlertTriangle}
            step="Foundational Rule"
            layerColor="bg-amber-600"
            title="FX Rate Sensitivity"
            subtitle="Currency movements change committed exposure with no credit event — the hidden risk in cross-currency portfolios"
          />
          <FxSensitivityCallout />
        </section>

        <FlowArrow label="Context: Which counterparties count" />

        {/* ── SECTION 7: RISK-BEARING FILTER ── */}
        <section id="section-risk-bearing" aria-labelledby="heading-risk-bearing">
          <SectionHeading
            id="heading-risk-bearing"
            icon={ShieldCheck}
            step="Business Rule"
            layerColor="bg-red-600"
            title="Risk-Bearing Counterparty Filter"
            subtitle="Only counterparties with credit risk exposure are included — agents, trustees, and servicers are excluded"
          />
          <RiskBearingCallout />
        </section>

        <FlowArrow label="Engine executes the query plan" />

        {/* ── SECTION 8: QUERY PLAN ── */}
        <section id="section-query-plan" aria-labelledby="heading-query-plan">
          <SectionHeading
            id="heading-query-plan"
            icon={Search}
            step="Under the Hood"
            layerColor="bg-purple-600"
            title="How the Engine Thinks"
            subtitle="Logical query steps the calculation engine follows — click any step or toggle 'Show SQL' for the technical view"
          />
          <QueryPlanView />
        </section>

        <FlowArrow label="Query results feed into calculation" />

        {/* ── SECTION 9: CALCULATION ENGINE ── */}
        <section id="section-calculation" aria-labelledby="heading-calculation">
          <SectionHeading
            id="heading-calculation"
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-emerald-600"
            title="Committed Amount Calculation"
            subtitle="Formula applied at facility level — two views showing facility-level and counterparty-level computation"
          />
          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" aria-hidden="true" />
                Facility-Level Calculation: commitment × fx_rate × bank_share_pct
              </div>
              <FacilityCalcTable />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                Counterparty-Level Attribution (Multi-Borrower Split)
              </div>
              <CounterpartyCalcTable />
            </div>
          </div>
          <InsightCallout>
            <strong>Cross-check: both paths converge.</strong> Facility total = Counterparty total ={' '}
            <strong className="text-teal-300">{fmtDollar(TOTAL_COMMITTED_USD)}</strong>. The counterparty view shows
            how F-3&apos;s $569.3M splits 60/40 between Pacific Ridge and Summit Capital, with the Agent excluded.
          </InsightCallout>
        </section>

        <FlowArrow label="Watch the numbers flow end-to-end" />

        {/* ── SECTION 10: ANIMATED DATA FLOW ── */}
        <section id="section-data-flow" aria-labelledby="heading-data-flow">
          <SectionHeading
            id="heading-data-flow"
            icon={Sparkles}
            step="End-to-End Trace"
            layerColor="bg-amber-600"
            title="Watch a Number Travel"
            subtitle="Follow F-3 Pacific Ridge (GBP £1B syndicated, multi-borrower) through the entire pipeline"
          />
          <AnimatedDataFlow />
        </section>

        <FlowArrow label="Individual results aggregate up the hierarchy" />

        {/* ── SECTION 11: ROLLUP HIERARCHY ── */}
        <section id="section-rollup" aria-labelledby="heading-rollup">
          <SectionHeading
            id="heading-rollup"
            icon={GitBranch}
            step="Step 5 — Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="6-Level Aggregation"
            subtitle="Committed amounts sum from facility through counterparty, desk, portfolio, LoB to enterprise — click any level to expand"
          />
          <RollupPyramid
            expandedLevel={expandedLevel}
            onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)}
          />
          <InsightCallout>
            <strong>Additive summation at every level.</strong> Unlike ratio metrics (DSCR, WABR), committed amount uses simple
            addition — facility values sum to counterparty, counterparty sums to desk, and so on up to enterprise. The multi-borrower
            scenario (F-3) is the key complexity: CP-3 and CP-7 each get their attributed share, not the full facility amount.
          </InsightCallout>
        </section>

        <FlowArrow label="Can we trace this number back to source?" />

        {/* ── SECTION 13: LINEAGE AUDIT TRAIL ── */}
        <section id="section-audit-trail" aria-labelledby="heading-audit-trail">
          <SectionHeading
            id="heading-audit-trail"
            icon={Search}
            step="Regulatory Validation"
            layerColor="bg-emerald-600"
            title="Lineage Audit Trail"
            subtitle="Trace any dashboard value back through every rollup level to exact L2 source rows — the worksheet regulators ask for"
          />
          <LineageAuditTrail />
          <InsightCallout>
            <strong>This is what examiners need.</strong> When a regulator points to &ldquo;Enterprise Committed = $1.26B&rdquo; on
            your dashboard and asks &ldquo;prove it,&rdquo; this audit trail provides the complete chain of custody: which LoB segments
            contributed, how counterparty attribution splits a syndicated facility across co-borrowers, which L2 tables were queried,
            what WHERE filters were applied, and the exact formula execution with intermediate values at every step.
            Notice F-3 Pacific Ridge appears under <strong className="text-teal-300">two counterparties</strong> — CP-3 (60%) and
            CP-7 (40%) — demonstrating multi-issuer attribution in action.
          </InsightCallout>
        </section>

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
