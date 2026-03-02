'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Calculator,
  Network,
  Database,
  Layers,
  Search,
  Zap,
  Sparkles,
  GitBranch,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

/* ── Data ── */
import {
  COUNTERPARTY_WEIGHTED_LTV,
  FACILITY_DATA,
} from './ltv-lineage/ltv-lineage-data';

/* ── Components ── */
import {
  fmtPct,
  SectionHeading,
  FlowArrow,
  InsightCallout,
  MetricDefinitionCard,
  InteractiveJoinMap,
  FKExplorer,
  L1Tables,
  L2FieldTable,
  QueryPlanView,
  FacilityCalcTable,
  AnimatedDataFlow,
  EnhancedRollupPyramid,
  LTVFoundationalRule,
  LTVDistributionBuckets,
  LineageAuditTrail,
  ProvenanceBreadcrumb,
  useActiveSection,
  FooterLegend,
} from './ltv-lineage/ltv-lineage-components';

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function LTVLineageView() {
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
                Data Catalogue
              </Link>
              <h1 className="text-xl font-bold text-white">LTV (Loan-to-Value %) — End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From facility exposure &amp; collateral valuation through weighted rollup to dashboard —{' '}
                <span className="text-teal-400 font-medium">{fmtPct(COUNTERPARTY_WEIGHTED_LTV)} weighted avg</span> across{' '}
                {FACILITY_DATA.length} facilities
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-400">Sourcing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-400">Calculation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-400">Hybrid</span>
              </div>
            </div>
          </div>
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
            title="LTV (Loan-to-Value %)"
            subtitle="Drawn exposure divided by aggregated collateral value — with HYBRID sourcing for multi-collateral facilities"
          />
          <InsightCallout>
            <strong>LTV measures credit risk coverage.</strong> At the facility level, LTV = Drawn Amount / Total Collateral Value.
            Collateral aggregation is a <strong className="text-amber-300">HYBRID</strong> step — it sources multiple collateral items
            per facility and SUMs them before the ratio calculation. Higher tiers use exposure-weighted averages:{' '}
            <strong className="text-teal-300">{fmtPct(COUNTERPARTY_WEIGHTED_LTV)}</strong> weighted avg.
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
            subtitle="Every FK relationship used to compute LTV — hover any table to trace its connections"
          />
          <InteractiveJoinMap />
          <InsightCallout>
            <strong>Collateral aggregation is the key data challenge.</strong> The{' '}
            <code className="text-amber-300">collateral_snapshot</code> table has multiple rows per facility (different collateral types).
            These must be SUMmed into a single <code className="text-blue-300">collateral_value</code> before dividing.
            The <code className="text-blue-300">facility_master</code> table is the central hub connecting L1 dimensions to L2 snapshots.
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
            subtitle="Reference tables providing facility identity, counterparty relationships, collateral asset metadata, and business hierarchy"
          />
          <L1Tables />
          <InsightCallout>
            <strong>4 dimensional tables anchor every LTV calculation.</strong>{' '}
            <code className="text-blue-300">facility_master</code> links facilities to counterparties and the business hierarchy.{' '}
            <code className="text-blue-300">collateral_asset_master</code> provides collateral type and appraisal metadata.{' '}
            <code className="text-blue-300">enterprise_business_taxonomy</code> maps the Desk → Portfolio → LoB rollup path.
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
            subtitle="Two L2 snapshot tables — facility_exposure_snapshot for drawn amounts and collateral_snapshot for valuations"
          />
          <L2FieldTable />
          <InsightCallout>
            <strong>Two source tables, one ratio.</strong>{' '}
            <code className="text-amber-300">facility_exposure_snapshot</code> provides the numerator (drawn_amount) and the
            weighting basis (gross_exposure_usd).{' '}
            <code className="text-amber-300">collateral_snapshot</code> provides the denominator (current_valuation_usd) — but
            requires a <strong className="text-amber-300">HYBRID</strong> SUM aggregation since facilities can have multiple collateral items.
          </InsightCallout>
        </section>

        <FlowArrow label="Foundational rule: never average pre-computed LTVs" />

        {/* ── SECTION 5: FOUNDATIONAL RULE ── */}
        <section id="section-foundational-rule" aria-labelledby="heading-foundational-rule">
          <SectionHeading
            id="heading-foundational-rule"
            icon={ShieldCheck}
            step="Foundational Rule"
            layerColor="bg-red-600"
            title="Never Average Pre-Computed LTVs"
            subtitle="Why exposure-weighted rollup is mandatory — simple averaging creates misleading risk indicators"
          />
          <LTVFoundationalRule />
        </section>

        <FlowArrow label="Engine executes the query plan" />

        {/* ── SECTION 6: QUERY PLAN ── */}
        <section id="section-query-plan" aria-labelledby="heading-query-plan">
          <SectionHeading
            id="heading-query-plan"
            icon={Search}
            step="Under the Hood"
            layerColor="bg-purple-600"
            title="How the Engine Thinks"
            subtitle="Query plan showing SOURCING, CALCULATION, and HYBRID steps — click any step for the technical view"
          />
          <QueryPlanView />
        </section>

        <FlowArrow label="Query results feed into facility-level calculation" />

        {/* ── SECTION 7: CALCULATION ENGINE ── */}
        <section id="section-calculation" aria-labelledby="heading-calculation">
          <SectionHeading
            id="heading-calculation"
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-emerald-600"
            title="LTV Calculation at Facility Level"
            subtitle="Each facility's LTV computed from drawn amount and aggregated collateral — expand to see collateral breakdown"
          />
          <FacilityCalcTable />
          <InsightCallout>
            <strong>Multi-collateral aggregation in action.</strong> F-7001 has 2 collateral items (Real Estate $24M + Equipment $1.2M)
            summed to $25.2M before dividing. F-7003 has 3 items totaling $25.5M — demonstrating the HYBRID sourcing step.
            Gross exposure weights are used for higher-tier rollup.
          </InsightCallout>
        </section>

        <FlowArrow label="Watch the numbers flow end-to-end" />

        {/* ── SECTION 8: ANIMATED DATA FLOW ── */}
        <section id="section-data-flow" aria-labelledby="heading-data-flow">
          <SectionHeading
            id="heading-data-flow"
            icon={Sparkles}
            step="End-to-End Trace"
            layerColor="bg-amber-600"
            title="Watch a Number Travel"
            subtitle="Follow facility F-7001 through the entire LTV pipeline — from L2 source tables to dashboard display"
          />
          <AnimatedDataFlow />
        </section>

        <FlowArrow label="Individual results aggregate up the hierarchy" />

        {/* ── SECTION 9: ENHANCED ROLLUP HIERARCHY ── */}
        <section id="section-rollup" aria-labelledby="heading-rollup">
          <SectionHeading
            id="heading-rollup"
            icon={GitBranch}
            step="Step 5 — Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="5-Level Aggregation with Source Tables"
            subtitle="LTV rolls up from facility through counterparty, desk, portfolio, and LoB — source tables shown alongside each tier"
          />
          <EnhancedRollupPyramid
            expandedLevel={expandedLevel}
            onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)}
          />
          <InsightCallout>
            <strong>Exposure-weighted at every level.</strong> Unlike additive metrics (committed amount), LTV uses
            Σ(LTV<sub>i</sub> × exposure<sub>i</sub>) / Σ(exposure<sub>i</sub>) at each rollup tier.
            Source tables are shown alongside each tier — the facility level requires 3 L2 tables while upper tiers
            depend on lower-tier results plus the business hierarchy taxonomy.
          </InsightCallout>
        </section>

        <FlowArrow label="LTV distribution across the portfolio" />

        {/* ── SECTION 10: LTV DISTRIBUTION ── */}
        <section id="section-distribution" aria-labelledby="heading-distribution">
          <SectionHeading
            id="heading-distribution"
            icon={BarChart3}
            step="Dashboard Consumption"
            layerColor="bg-teal-600"
            title="LTV Distribution Buckets"
            subtitle="How the portfolio distributes across LTV risk bands — standard regulatory reporting view"
          />
          <LTVDistributionBuckets />
        </section>

        <FlowArrow label="Can we trace this number back to source?" />

        {/* ── SECTION 11: LINEAGE AUDIT TRAIL ── */}
        <section id="section-audit-trail" aria-labelledby="heading-audit-trail">
          <SectionHeading
            id="heading-audit-trail"
            icon={Search}
            step="Regulatory Validation"
            layerColor="bg-emerald-600"
            title="Lineage Audit Trail"
            subtitle="Trace any dashboard LTV value back through every rollup level to exact L2 source rows"
          />
          <LineageAuditTrail />
          <InsightCallout>
            <strong>Full chain of custody for LTV.</strong> When a regulator asks how the portfolio-level LTV of{' '}
            {fmtPct(COUNTERPARTY_WEIGHTED_LTV)} was derived, this audit trail traces through each tier: which counterparties
            contributed, how facility-level LTVs were computed from drawn amounts and collateral valuations, and which exact L2
            snapshot rows provided the source data — including the HYBRID collateral aggregation step.
          </InsightCallout>
        </section>

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
