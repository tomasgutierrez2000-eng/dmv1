'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION: FACILITY SUMMARY — Updated to L1/L2 Final Data Model
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  id: "facility_summary",
  title: "Facility Summary",
  subtitle: "How one dashboard row is assembled from L1 reference data, L2 snapshots, and derived calculations",
  mode: "assembly",
  joinField: "facility_id",
  joinValue: "FAC-2024-00847",

  sources: [
    {
      id: "facility_master",
      name: "L1 · facility_master",
      icon: "📋",
      color: "#3B82F6",
      description:
        "L1 reference table (34 fields). Core facility terms — type, committed amount, maturity, interest rate structure, amortization, LoB assignment (via lob_segment_id → enterprise_business_taxonomy), product classification (via product_node_id → enterprise_product_taxonomy), and the link to its credit agreement. Now carries rate terms and GL booking (ledger_account_id).",
      fields: [
        { name: "facility_id", value: "FAC-2024-00847" },
        { name: "facility_type", value: "REVOLVING_CREDIT" },
        { name: "committed_facility_amt", value: "$250.0M" },
        { name: "maturity_date", value: "2027-03-15" },
        { name: "lob_segment_id", value: "SEG-TMT-003 → enterprise_business_taxonomy" },
        { name: "product_node_id", value: "PRD-REVOLVER → enterprise_product_taxonomy" },
        { name: "credit_agreement_id", value: "CA-2024-1120" },
        { name: "counterparty_id", value: "CTP-00294 → counterparty" },
        { name: "interest_rate_type", value: "FLOATING" },
        { name: "interest_rate_spread_bps", value: "175 bps" },
        { name: "all_in_rate_pct", value: "6.08%" },
        { name: "amortization_type", value: "REVOLVING" },
        { name: "portfolio_id", value: "IG-CORP → portfolio_dim" },
      ],
      annotation:
        "L1 reference — the foundational facility record. Now 34 fields including full rate structure (interest_rate_type, spread_bps, rate_cap/floor, payment_frequency), amortization_type, and ledger_account_id for GL booking. Links to credit_agreement_master, enterprise_business_taxonomy (LoB), enterprise_product_taxonomy (product), portfolio_dim, interest_rate_index_dim, and counterparty.",
    },
    {
      id: "counterparty",
      name: "L1 · counterparty",
      icon: "🏢",
      color: "#10B981",
      description:
        "L1 reference table (33 fields). Definitive record of every borrower — legal name, ratings (internal + three external agencies), industry (via industry_id → industry_dim), Basel asset class, regulatory flags, and risk parameters (pd_annual, lgd_unsecured). Parent/subsidiary links via counterparty_hierarchy.",
      fields: [
        { name: "counterparty_id", value: "CTP-00294" },
        { name: "legal_name", value: "Meridian Industrial Holdings, Inc." },
        { name: "counterparty_type", value: "CORPORATE" },
        { name: "industry_id", value: "IND-TMT → industry_dim" },
        { name: "internal_risk_rating", value: "2 (Investment Grade)" },
        { name: "external_rating_sp", value: "BBB+" },
        { name: "external_rating_moodys", value: "Baa1" },
        { name: "basel_asset_class", value: "CORPORATE" },
        { name: "pd_annual", value: "0.45%" },
        { name: "lgd_unsecured", value: "40%" },
        { name: "is_parent_flag", value: "Y (ultimate_parent = self)" },
      ],
      annotation:
        "L1 reference — counterparty identity. Now 33 fields including pd_annual and lgd_unsecured as source-system risk parameters, three external rating fields (S&P, Moody's, Fitch), and regulatory flags (is_financial_institution, is_sovereign, is_regulated_entity, etc.). Joins to counterparty_hierarchy for group roll-up, rating_scale_dim for standardized analytics, and entity_type_dim.",
    },
    {
      id: "facility_exposure_snapshot",
      name: "L2 · facility_exposure_snapshot",
      icon: "📊",
      color: "#F59E0B",
      description:
        "L2 snapshot (15 fields). Monthly reading of gross/net exposure, drawn/undrawn amounts, and coverage ratio. Key change: net_exposure_usd and coverage_ratio_pct are now stored directly here (previously derived in L3). Also carries fr2590_category_code and product_node_id for reporting.",
      fields: [
        { name: "gross_exposure_usd", value: "$178.3M" },
        { name: "net_exposure_usd", value: "$83.3M" },
        { name: "drawn_amount", value: "$162.5M" },
        { name: "undrawn_amount", value: "$87.5M" },
        { name: "coverage_ratio_pct", value: "53.3%" },
        { name: "fr2590_category_code", value: "→ fr2590_category_dim" },
        { name: "lob_segment_id", value: "→ enterprise_business_taxonomy" },
        { name: "as_of_date", value: "2026-02-28" },
      ],
      annotation:
        "L2 snapshot — now 15 fields. Key change: net_exposure_usd and coverage_ratio_pct stored directly (not L3 only). Also carries its own lob_segment_id and product_node_id FKs for denormalized reporting. EAD is still derived from position_detail (funded + unfunded × CCF).",
    },
    {
      id: "position",
      name: "L2 · position + position_detail",
      icon: "📐",
      color: "#06B6D4",
      description:
        "L2 snapshot tables. position (24 fields) carries PD/LGD estimates, credit status, exposure type, and trading/banking book indicator. position_detail (25 fields) extends with product-specific attributes: funded/unfunded amounts, CCF, interest rate, days past due, derivative MTM/PFE, SFT terms.",
      fields: [
        { name: "position_type", value: "LOAN" },
        { name: "pd_estimate", value: "0.45%" },
        { name: "lgd_estimate", value: "35%" },
        { name: "credit_status_code", value: "PERFORMING → credit_status_dim" },
        { name: "exposure_type_code", value: "→ exposure_type_dim" },
        { name: "funded_amount (detail)", value: "$162.5M" },
        { name: "unfunded_amount (detail)", value: "$87.5M" },
        { name: "ccf (detail)", value: "18%" },
        { name: "total_commitment (detail)", value: "$250.0M" },
        { name: "days_past_due (detail)", value: "0" },
      ],
      annotation:
        "L2 snapshot — the position grain. position carries risk parameters (pd_estimate, lgd_estimate) and credit status. position_detail extends with funded/unfunded, ccf, and product-specific fields (derivatives: MTM, replacement_cost, PFE; SFTs: cash_leg, haircut; securities: fair_value, unrealized_gain_loss). EAD = funded_amount + (unfunded_amount × ccf).",
    },
    {
      id: "collateral_snapshot",
      name: "L2 · collateral_snapshot",
      icon: "🛡️",
      color: "#8B5CF6",
      description:
        "L2 snapshot (13 fields). Each row = one risk mitigant allocated to one facility. Now carries mitigant_group_code (M1/M2), mitigant_subtype for granular classification, and risk_shifting_flag for CRM substitution tracking. Links to collateral_asset_master and crm_type_dim.",
      fields: [
        { name: "crm_type_code", value: "COLLATERAL → crm_type_dim" },
        { name: "mitigant_group_code", value: "M1 (Eligible Collateral)" },
        { name: "mitigant_subtype", value: "Cash" },
        { name: "current_valuation_usd", value: "$120.0M" },
        { name: "allocated_amount_usd", value: "$95.0M" },
        { name: "haircut_pct", value: "20.8%" },
        { name: "risk_shifting_flag", value: "N" },
      ],
      annotation:
        "L2 snapshot — 13 fields. mitigant_subtype provides granular classification (Cash, Sovereign Debt, Guarantees, etc.) within each mitigant_group_code (M1/M2). risk_shifting_flag = Y when CRM shifts exposure to another counterparty (tracked in exposure_counterparty_attribution). Links to collateral_asset_master and crm_type_dim for Basel recognition method.",
    },
    {
      id: "amendment_event",
      name: "L2 · amendment_event",
      icon: "📝",
      color: "#EF4444",
      description:
        "L2 event record (13 fields). Tracks amendment lifecycle from identification through completion. Includes amendment_description and explicit effective_date/completed_date. Links to amendment_change_detail for field-level before/after values.",
      fields: [
        { name: "amendment_type", value: "Commitment Changes" },
        { name: "amendment_subtype", value: "Increase" },
        { name: "amendment_status", value: "PENDING_APPROVAL" },
        { name: "identified_date", value: "2025-12-27" },
        { name: "amendment_description", value: "Commitment increase $200M → $250M" },
      ],
      annotation:
        "L2 event — 13 fields. amendment_change_detail holds the field-level changes (old_value: $200M → new_value: $250M, change_field_name: committed_facility_amt). Standardized via amendment_type_dim and amendment_status_dim. Lifecycle: Prospect Identified → In Underwriting → Under Credit Review → Pending Approval → Approved → Effective → Completed.",
    },
    {
      id: "facility_counterparty_participation",
      name: "L1 · facility_counterparty_participation",
      icon: "🤝",
      color: "#EC4899",
      description:
        "L1 reference (9 fields). Links facilities to counterparties with roles (counterparty_role_dim). participation_pct for pro-rata. New: is_primary_flag and role_priority_rank for deterministic primary selection.",
      fields: [
        { name: "counterparty_role_code", value: "BORROWER → counterparty_role_dim" },
        { name: "participation_pct", value: "100%" },
        { name: "is_primary_flag", value: "Y" },
        { name: "role_priority_rank", value: "1" },
      ],
      annotation:
        "L1 reference — who participates and how. is_primary_flag and role_priority_rank enable deterministic primary counterparty selection (avoids fan-out). Also see credit_agreement_counterparty_participation for agreement-level roles, and L2 exposure_counterparty_attribution for actual per-counterparty exposure attribution.",
    },
    {
      id: "facility_lob_attribution",
      name: "L2 · facility_lob_attribution",
      icon: "🏷️",
      color: "#14B8A6",
      description:
        "L2 snapshot (7 fields). NEW TABLE. Handles split-LoB exposure attribution — one row per (facility, lob_segment) with attribution_pct, attribution_amount_usd, and attribution_type (PRIMARY/SECONDARY). Replaces old pattern of LoB splits via counterparty participation.",
      fields: [
        { name: "lob_segment_id", value: "SEG-TMT-003 → enterprise_business_taxonomy" },
        { name: "attribution_pct", value: "100%" },
        { name: "attribution_amount_usd", value: "$178.3M" },
        { name: "attribution_type", value: "PRIMARY" },
      ],
      annotation:
        "L2 snapshot — NEW dedicated LoB attribution table. For Meridian's facility, 100% to TMT. For split-exposure facilities like Silverline, two rows: TMT 60% ($91.7M) + Infrastructure 40% ($61.1M). attribution_pct must sum to 100%. Replaces reliance on facility_counterparty_participation for LoB splits.",
    },
  ],

  timeline: {
    months: [
      { month: "Mar 2025", exposure: 155.2 },
      { month: "Apr 2025", exposure: 158.7 },
      { month: "May 2025", exposure: 160.1 },
      { month: "Jun 2025", exposure: 163.4 },
      { month: "Jul 2025", exposure: 159.8 },
      { month: "Aug 2025", exposure: 165.2 },
      { month: "Sep 2025", exposure: 168.0 },
      { month: "Oct 2025", exposure: 170.5 },
      { month: "Nov 2025", exposure: 171.0 },
      { month: "Dec 2025", exposure: 174.2 },
      { month: "Jan 2026", exposure: 176.8 },
      { month: "Feb 2026", exposure: 178.3 },
    ],
    events: [
      {
        date: "Dec 27, 2025",
        type: "L2 amendment_event",
        detail:
          "Commitment Increase $200M → $250M — status: PENDING_APPROVAL. amendment_change_detail: old_value = 200M, new_value = 250M",
        source: "amendment_event",
      },
      {
        date: "Oct 15, 2025",
        type: "L2 counterparty_rating_observation",
        detail:
          "External S&P upgraded BBB → BBB+ (rating_grade_id → rating_scale_dim). prior_rating_value recorded.",
        source: "counterparty",
      },
    ],
  },

  calculations: [
    {
      field: "coverage_ratio_pct",
      explanation:
        "Now on L2 facility_exposure_snapshot: SUM(collateral_snapshot.allocated_amount_usd) ÷ gross_exposure_usd. Previously L3-only.",
      inputs: [
        { value: "$95.0M", label: "SUM(allocated_amount_usd)", source: "collateral_snapshot" },
        { value: "$178.3M", label: "gross_exposure_usd", source: "facility_exposure_snapshot" },
      ],
      result: "53.3%",
      operator: "÷",
    },
    {
      field: "ead_amount (derived)",
      explanation:
        "From L2 position_detail: funded_amount + (unfunded_amount × ccf). CCF from position_detail.ccf, fallback to exposure_type_dim.ccf_pct.",
      inputs: [
        { value: "$162.5M", label: "funded_amount", source: "position" },
        { value: "$87.5M × 18%", label: "unfunded × ccf", source: "position" },
      ],
      result: "$178.3M",
      operator: "+",
    },
    {
      field: "net_exposure_usd",
      explanation:
        "Now on L2 facility_exposure_snapshot: gross_exposure_usd − SUM(collateral_snapshot.allocated_amount_usd). Previously L3-only.",
      inputs: [
        { value: "$178.3M", label: "gross_exposure_usd", source: "facility_exposure_snapshot" },
        { value: "$95.0M", label: "SUM(allocated_amount_usd)", source: "collateral_snapshot" },
      ],
      result: "$83.3M",
      operator: "−",
    },
    {
      field: "expected_loss (derived)",
      explanation:
        "pd_estimate × lgd_estimate × ead_amount. PD and LGD from L2 position.",
      inputs: [
        { value: "0.45%", label: "pd_estimate (L2 position)", source: "position" },
        { value: "35%", label: "lgd_estimate (L2 position)", source: "position" },
        { value: "$178.3M", label: "ead (derived)", source: "position" },
      ],
      result: "$0.28M",
      operator: "×",
    },
    {
      field: "exposure_mom_change_pct (derived)",
      explanation:
        "(gross_exposure[T] − gross_exposure[T-1]) ÷ gross_exposure[T-1]",
      inputs: [
        { value: "$178.3M", label: "gross_exposure (Feb)", source: "facility_exposure_snapshot" },
        { value: "$176.8M", label: "gross_exposure (Jan)", source: "facility_exposure_snapshot" },
      ],
      result: "+0.8%",
      operator: "Δ",
    },
    {
      field: "limit_status (derived)",
      explanation:
        "Compare utilization_pct against L1 limit_rule thresholds (via limit_threshold: NO_BREACH / WARNING / BREACH). limit_rule replaces old limit_definition.",
      inputs: [
        { value: "70.0%", label: "utilization_pct (derived)", source: "facility_exposure_snapshot" },
        { value: "85%/100%", label: "threshold bounds (L1 limit_threshold)", source: "facility_exposure_snapshot" },
      ],
      result: "NO_BREACH",
      operator: "→",
    },
    {
      field: "net_interest_margin (derived)",
      explanation:
        "From L2 facility_profitability_snapshot: (interest_income − interest_expense) ÷ avg_earning_assets.",
      inputs: [
        { value: "$3.8M", label: "net_interest_income", source: "facility_exposure_snapshot" },
        { value: "$162.5M", label: "avg_earning_assets", source: "facility_exposure_snapshot" },
      ],
      result: "2.34%",
      operator: "÷",
    },
  ],

  finalView: {
    directFields: 22,
    lookupFields: 14,
    aggregatedFields: 6,
    calculatedFields: 10,
    totalSources: 8,
    sections: [
      {
        title: "L1 Reference — Facility & Structure",
        fields: [
          { name: "facility_id", value: "FAC-2024-00847", source: "facility_master", type: "direct" },
          { name: "facility_type", value: "REVOLVING_CREDIT", source: "facility_master", type: "direct" },
          { name: "lob_segment_id → enterprise_business_taxonomy", value: "Corp Banking › Large Corp › TMT", source: "facility_master", type: "direct" },
          { name: "product_node_id → enterprise_product_taxonomy", value: "Lending › Revolving Credit", source: "facility_master", type: "direct" },
          { name: "credit_agreement_id", value: "CA-2024-1120", source: "facility_master", type: "direct" },
          { name: "portfolio_id → portfolio_dim", value: "IG-CORP", source: "facility_master", type: "direct" },
          { name: "interest_rate_type / spread_bps", value: "FLOATING / 175 bps", source: "facility_master", type: "direct" },
          { name: "all_in_rate_pct", value: "6.08%", source: "facility_master", type: "direct" },
          { name: "amortization_type", value: "REVOLVING", source: "facility_master", type: "direct" },
        ],
      },
      {
        title: "L1 Reference — Counterparty",
        fields: [
          { name: "legal_name", value: "Meridian Industrial Holdings, Inc.", source: "counterparty", type: "direct" },
          { name: "counterparty_type", value: "CORPORATE", source: "counterparty", type: "direct" },
          { name: "industry_id → industry_dim", value: "TMT", source: "counterparty", type: "direct" },
          { name: "internal_risk_rating", value: "2 — Investment Grade", source: "counterparty", type: "direct" },
          { name: "external_rating_sp / moodys", value: "BBB+ / Baa1", source: "counterparty", type: "direct" },
          { name: "basel_asset_class", value: "CORPORATE", source: "counterparty", type: "direct" },
          { name: "pd_annual", value: "0.45%", source: "counterparty", type: "direct" },
          { name: "lgd_unsecured", value: "40%", source: "counterparty", type: "direct" },
        ],
      },
      {
        title: "L2 Snapshot — Exposure (facility_exposure_snapshot)",
        fields: [
          { name: "gross_exposure_usd", value: "$178.3M", source: "facility_exposure_snapshot", type: "direct" },
          { name: "net_exposure_usd", value: "$83.3M", source: "facility_exposure_snapshot", type: "direct" },
          { name: "drawn_amount", value: "$162.5M", source: "facility_exposure_snapshot", type: "direct" },
          { name: "undrawn_amount", value: "$87.5M", source: "facility_exposure_snapshot", type: "direct" },
          { name: "coverage_ratio_pct", value: "53.3%", source: "facility_exposure_snapshot", type: "direct" },
        ],
      },
      {
        title: "L2 Snapshot — Position Risk (position + position_detail)",
        fields: [
          { name: "position_type", value: "LOAN", source: "position", type: "direct" },
          { name: "pd_estimate", value: "0.45%", source: "position", type: "direct" },
          { name: "lgd_estimate", value: "35%", source: "position", type: "direct" },
          { name: "credit_status_code", value: "PERFORMING", source: "position", type: "direct" },
          { name: "funded / unfunded", value: "$162.5M / $87.5M", source: "position", type: "direct" },
          { name: "ccf", value: "18%", source: "position", type: "direct" },
          { name: "days_past_due", value: "0", source: "position", type: "direct" },
        ],
      },
      {
        title: "L2 Snapshot — Collateral & CRM",
        fields: [
          { name: "allocated_amount_usd (M1)", value: "$95.0M", source: "collateral_snapshot", type: "direct" },
          { name: "mitigant_subtype", value: "Cash", source: "collateral_snapshot", type: "direct" },
          { name: "haircut_pct", value: "20.8%", source: "collateral_snapshot", type: "direct" },
          { name: "risk_shifting_flag", value: "N", source: "collateral_snapshot", type: "direct" },
        ],
      },
      {
        title: "Derived — Calculations",
        fields: [
          { name: "ead_amount", value: "$178.3M", source: null, type: "calculated", formula: "funded + (unfunded × ccf) from position_detail" },
          { name: "expected_loss", value: "$0.28M", source: null, type: "calculated", formula: "PD × LGD × EAD from position" },
          { name: "exposure_mom_change_pct", value: "+0.8%", source: null, type: "calculated", formula: "(current − prior) ÷ prior" },
          { name: "limit_status", value: "NO_BREACH", source: null, type: "calculated", formula: "utilization vs limit_rule thresholds" },
          { name: "net_interest_margin", value: "2.34%", source: null, type: "calculated", formula: "NII ÷ avg_earning_assets" },
        ],
      },
      {
        title: "L1/L2 — Participation & LoB Attribution",
        fields: [
          { name: "counterparty_role_code", value: "BORROWER", source: "facility_counterparty_participation", type: "direct" },
          { name: "participation_pct", value: "100%", source: "facility_counterparty_participation", type: "direct" },
          { name: "is_primary_flag", value: "Y", source: "facility_counterparty_participation", type: "direct" },
          { name: "lob_attribution_pct (TMT)", value: "100%", source: "facility_lob_attribution", type: "direct" },
          { name: "lob_attribution_amount_usd", value: "$178.3M", source: "facility_lob_attribution", type: "direct" },
          { name: "attribution_type", value: "PRIMARY", source: "facility_lob_attribution", type: "direct" },
        ],
      },
    ],
  },
};

const STEPS = [
  { num: 1, label: "Where the Data Lives" },
  { num: 2, label: "Snapshots & Events" },
  { num: 3, label: "Connecting the Pieces" },
  { num: 4, label: "Calculations & Enrichment" },
  { num: 5, label: "The Final View" },
];

// CSS Styles
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--navy-900:#0C1222;--navy-800:#111A2E;--navy-700:#1A2542;--navy-600:#243356;--slate-400:#94A3B8;--slate-300:#CBD5E1;--slate-200:#E2E8F0;--white:#FFFFFF;--blue:#3B82F6;--green:#10B981;--amber:#F59E0B;--purple:#8B5CF6;--coral:#EF4444;--teal:#06B6D4}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:var(--navy-900);color:var(--slate-200);-webkit-font-smoothing:antialiased}
.mono{font-family:'JetBrains Mono',monospace}
.app-root{min-height:100vh;background:linear-gradient(180deg,var(--navy-900),#0A0F1C);position:relative;overflow-x:hidden}
.app-root::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 800px 600px at 20% 20%,rgba(59,130,246,.04) 0%,transparent 70%),radial-gradient(ellipse 600px 400px at 80% 80%,rgba(139,92,246,.03) 0%,transparent 70%);pointer-events:none;z-index:0}
.step-nav{position:sticky;top:0;z-index:100;background:rgba(12,18,34,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.06);padding:16px 24px 14px}
.step-nav-inner{display:flex;align-items:center;justify-content:center;gap:8px;max-width:900px;margin:0 auto}
.step-item{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;flex:1;max-width:160px;transition:all .2s}
.step-circle{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;transition:all .3s;border:2px solid rgba(255,255,255,.12);color:var(--slate-400);background:transparent}
.step-item.active .step-circle{background:var(--blue);border-color:var(--blue);color:white;box-shadow:0 0 20px rgba(59,130,246,.3)}
.step-item.completed .step-circle{background:var(--green);border-color:var(--green);color:white}
.step-label{font-size:11px;color:var(--slate-400);text-align:center;font-weight:500;line-height:1.3}
.step-item.active .step-label{color:var(--white)}
.step-connector{width:40px;height:2px;background:rgba(255,255,255,.08);margin-bottom:20px}
.step-connector.done{background:var(--green)}
.main-content{max-width:1100px;margin:0 auto;padding:32px 24px 100px;position:relative;z-index:1}
.step-title{font-size:28px;font-weight:700;color:var(--white);margin-bottom:8px}
.step-intro{font-size:16px;color:var(--slate-300);line-height:1.65;margin-bottom:32px;max-width:800px}
.source-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.source-card{background:var(--navy-800);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px;cursor:pointer;transition:all .4s cubic-bezier(.16,1,.3,1);opacity:0;transform:translateY(20px);position:relative;overflow:hidden}
.source-card.visible{opacity:1;transform:translateY(0)}
.source-card-header{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.source-icon{font-size:24px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:10px;flex-shrink:0}
.source-name{font-size:17px;font-weight:600;color:var(--white)}
.source-desc{font-size:14px;color:var(--slate-400);line-height:1.5}
.source-fields{display:grid;gap:8px}
.source-field{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.source-field-name{font-size:13px;color:var(--slate-400)}
.source-field-value{font-size:13px;color:var(--white);font-weight:500;font-family:'JetBrains Mono',monospace;text-align:right}
.timeline-container{background:var(--navy-800);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:32px 28px 28px;overflow-x:auto}
.snapshot-chart{display:flex;align-items:flex-end;gap:6px;height:140px;margin-bottom:20px;padding:0 4px}
.snapshot-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
.snapshot-bar{width:100%;border-radius:4px 4px 0 0;transition:all .4s ease;min-height:4px;cursor:pointer;opacity:0;transform:scaleY(0);transform-origin:bottom}
.snapshot-bar.visible{opacity:1;transform:scaleY(1)}
.snapshot-bar:hover{filter:brightness(1.3)}
.snapshot-bar-label{font-size:10px;color:var(--slate-400);text-align:center;white-space:nowrap}
.snapshot-bar.current{box-shadow:0 0 12px rgba(245,158,11,.3)}
.timeline-line{width:100%;height:2px;background:rgba(255,255,255,.08);position:relative;margin:12px 0 24px}
.timeline-today-marker{position:absolute;right:0;top:-6px;width:14px;height:14px;background:var(--amber);border-radius:50%;border:2px solid var(--navy-800)}
.events-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.event-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 16px;display:flex;gap:12px;align-items:flex-start;flex:1;min-width:280px;opacity:0;transform:translateY(10px);transition:all .5s}
.event-card.visible{opacity:1;transform:translateY(0)}
.event-pin{width:10px;height:10px;border-radius:50%;margin-top:4px;flex-shrink:0}
.event-type{font-size:14px;font-weight:600;color:var(--white);margin-bottom:2px}
.event-date{font-size:12px;color:var(--slate-400);margin-bottom:4px}
.event-detail{font-size:13px;color:var(--slate-300);line-height:1.4}
.assembly-container{display:flex;gap:20px;align-items:stretch;min-height:500px}
.assembly-sources{flex:0 0 280px;display:flex;flex-direction:column;gap:8px}
.assembly-source-card{padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:var(--navy-800);transition:all .4s;cursor:pointer}
.assembly-source-card.active{border-color:currentColor;box-shadow:0 0 16px rgba(59,130,246,.15);transform:scale(1.02)}
.assembly-source-card.connected{opacity:.6}
.assembly-source-name{font-size:14px;font-weight:600;color:var(--white);display:flex;align-items:center;gap:8px}
.assembly-source-id{font-size:11px;font-family:'JetBrains Mono',monospace;padding:2px 8px;border-radius:4px;margin-top:6px;display:inline-block}
.assembly-result{flex:1;background:var(--navy-800);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;overflow:auto}
.assembly-result-title{font-size:16px;font-weight:700;color:var(--white);margin-bottom:4px}
.assembly-result-counter{font-size:13px;color:var(--slate-400);margin-bottom:16px;font-family:'JetBrains Mono',monospace}
.assembled-field{display:flex;justify-content:space-between;align-items:baseline;padding:8px 12px;border-radius:6px;margin-bottom:4px;opacity:0;transform:translateX(10px);transition:all .3s ease}
.assembled-field.visible{opacity:1;transform:translateX(0)}
.assembled-field:hover{background:rgba(255,255,255,.03)}
.assembled-field-name{font-size:13px;color:var(--slate-300)}
.assembled-field-value{font-size:13px;font-weight:500;font-family:'JetBrains Mono',monospace}
.assembly-controls{display:flex;gap:10px;margin-top:20px;justify-content:center;flex-wrap:wrap}
.assembly-annotation{text-align:center;margin-top:16px;padding:12px 20px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.15);border-radius:10px;font-size:14px;color:var(--slate-200);line-height:1.5;opacity:0;transition:opacity .4s}
.assembly-annotation.visible{opacity:1}
.calc-grid{display:grid;gap:14px}
.calc-card{background:var(--navy-800);border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;transition:all .3s}
.calc-card-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer}
.calc-card-header:hover{background:rgba(255,255,255,.02)}
.calc-field-name{font-size:15px;font-weight:600;color:var(--white);display:flex;align-items:center;gap:8px}
.calc-badge{font-size:10px;padding:2px 8px;border-radius:99px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;background:rgba(245,158,11,.15);color:var(--amber)}
.calc-result{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--white)}
.calc-explanation{font-size:14px;color:var(--slate-300);font-style:italic;padding:0 20px 12px}
.calc-breakdown{padding:16px 20px 20px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.15)}
.calc-formula-visual{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;padding:12px 0}
.calc-input-chip{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;border-radius:10px;border:1px solid;cursor:pointer;transition:all .2s}
.calc-input-chip:hover{transform:scale(1.05)}
.calc-input-value{font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--white)}
.calc-input-label{font-size:11px;font-weight:500}
.calc-operator{font-size:22px;font-weight:700;color:var(--slate-400)}
.calc-result-chip{padding:10px 20px;border-radius:10px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3)}
.calc-result-value{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--green)}
.final-toggle{display:flex;gap:2px;background:var(--navy-700);border-radius:8px;padding:3px;margin-bottom:24px;width:fit-content}
.final-toggle-btn{padding:8px 18px;border-radius:6px;border:none;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;color:var(--slate-400);background:transparent}
.final-toggle-btn.active{background:var(--blue);color:var(--white)}
.final-sections{display:grid;gap:16px}
.final-section{background:var(--navy-800);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden}
.final-section-header{padding:14px 20px;font-size:14px;font-weight:700;color:var(--white);background:rgba(255,255,255,.02);letter-spacing:.3px}
.final-fields{padding:4px 12px 12px}
.final-field{display:flex;justify-content:space-between;align-items:baseline;padding:10px 8px;border-radius:6px;transition:all .2s;cursor:default;position:relative}
.final-field:hover{background:rgba(255,255,255,.03)}
.final-field-name{font-size:14px;color:var(--slate-300);display:flex;align-items:center;gap:8px}
.final-field-value{font-size:14px;font-weight:500;font-family:'JetBrains Mono',monospace;color:var(--white)}
.final-field-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.final-field-badge{font-size:9px;padding:1px 6px;border-radius:99px;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
.badge-calculated{background:rgba(245,158,11,.15);color:var(--amber)}
.badge-direct{background:rgba(16,185,129,.12);color:var(--green)}
.final-tooltip{position:absolute;top:100%;left:20px;z-index:50;padding:12px 16px;background:var(--navy-700);border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:260px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.final-tooltip-row{display:flex;gap:8px;font-size:12px;margin-bottom:4px}
.final-tooltip-label{color:var(--slate-400);min-width:60px}
.final-tooltip-value{color:var(--white);font-weight:500}
.final-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:24px}
.final-stat-card{background:var(--navy-800);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:16px;text-align:center}
.final-stat-number{font-size:28px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--white)}
.final-stat-label{font-size:12px;color:var(--slate-400);margin-top:4px}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--slate-400)}
.legend-dot{width:10px;height:10px;border-radius:50%}
.btn{padding:10px 24px;border-radius:8px;border:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px}
.btn-primary{background:var(--blue);color:var(--white)}
.btn-primary:hover{background:#2563EB;transform:translateY(-1px)}
.btn-secondary{background:rgba(255,255,255,.06);color:var(--slate-300);border:1px solid rgba(255,255,255,.1)}
.btn-secondary:hover{background:rgba(255,255,255,.1)}
.btn-ghost{background:transparent;color:var(--slate-400)}
.btn-ghost:hover{color:var(--white)}
.nav-buttons{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,.06)}
`;

// Step Components
function SourceCard({ source, expanded, onToggle, delay, visible }: any) {
  return (
    <div
      className={`source-card ${visible ? "visible" : ""} ${expanded ? "expanded" : ""}`}
      style={{ transitionDelay: `${delay}ms`, borderColor: expanded ? source.color + "40" : undefined }}
      onClick={onToggle}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: source.color }} />
      <div className="source-card-header">
        <div className="source-icon" style={{ background: source.color + "18" }}>{source.icon}</div>
        <div>
          <div className="source-name">{source.name}</div>
          <div className="source-desc">{source.description}</div>
        </div>
      </div>
      <div
        className="source-fields"
        style={{
          maxHeight: expanded ? 500 : 0,
          overflow: "hidden",
          transition: "max-height .4s ease",
          paddingTop: expanded ? 14 : 0,
          marginTop: expanded ? 14 : 0,
          borderTop: expanded ? "1px solid rgba(255,255,255,.06)" : "none",
        }}
      >
        {source.fields.map((f: any, i: number) => (
          <div key={i} className="source-field">
            <span className="source-field-name">{f.name}</span>
            <span className="source-field-value" style={{ color: source.color }}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step1({ config }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 100); return () => clearTimeout(t); }, []);
  return (
    <div>
      <div className="step-title">Where the Data Lives</div>
      <div className="step-intro">
        The information you see on the dashboard doesn't live in one place. It comes from{" "}
        <strong style={{ color: "var(--white)" }}>{config.sources.length} different sources</strong>, each
        tracking a different part of this facility. Click any card to see the data it holds for{" "}
        <span className="mono" style={{ color: "var(--amber)" }}>{config.joinValue}</span>.
      </div>
      <div className="source-grid">
        {config.sources.map((s: any, i: number) => (
          <SourceCard
            key={s.id}
            source={s}
            expanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            delay={i * 120}
            visible={vis}
          />
        ))}
      </div>
    </div>
  );
}

function Step2({ config }: any) {
  const [barsVis, setBarsVis] = useState(false);
  const [evtsVis, setEvtsVis] = useState(false);
  const [hBar, setHBar] = useState<number | null>(null);
  useEffect(() => {
    const t1 = setTimeout(() => setBarsVis(true), 300);
    const t2 = setTimeout(() => setEvtsVis(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const { timeline } = config;
  const maxE = Math.max(...timeline.months.map((m: any) => m.exposure));
  const minE = Math.min(...timeline.months.map((m: any) => m.exposure));
  const amberSrc = config.sources.find((s: any) => s.id === "facility_exposure_snapshot");
  return (
    <div>
      <div className="step-title">Snapshots & Events</div>
      <div className="step-intro">
        Some information changes monthly — the bank captures these as{" "}
        <strong style={{ color: "var(--white)" }}>monthly readings</strong> (L2 snapshots). Other
        information only changes when something happens — captured as{" "}
        <strong style={{ color: "var(--white)" }}>events</strong> (L2 events like amendment_event and
        counterparty_rating_observation).
      </div>
      <div className="timeline-container">
        <div style={{ fontSize: 13, color: "var(--slate-400)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: amberSrc?.color, display: "inline-block" }} />
          gross_exposure_usd — Monthly Snapshots ($M)
        </div>
        <div className="snapshot-chart">
          {timeline.months.map((m: any, i: number) => {
            const pct = ((m.exposure - minE + 5) / (maxE - minE + 10)) * 100;
            const isCurr = i === timeline.months.length - 1;
            return (
              <div key={i} className="snapshot-bar-wrap" onMouseEnter={() => setHBar(i)} onMouseLeave={() => setHBar(null)}>
                {hBar === i && (
                  <div style={{ position: "absolute", top: -40, background: "var(--navy-700)", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "var(--white)", whiteSpace: "nowrap", zIndex: 10, border: "1px solid rgba(255,255,255,.1)", fontFamily: "'JetBrains Mono',monospace" }}>
                    ${m.exposure}M
                  </div>
                )}
                <div
                  className={`snapshot-bar ${barsVis ? "visible" : ""} ${isCurr ? "current" : ""}`}
                  style={{ height: `${pct}%`, background: isCurr ? amberSrc?.color : amberSrc?.color + "60", transitionDelay: `${i * 80}ms` }}
                />
                <div className="snapshot-bar-label">{m.month.split(" ")[0]}</div>
              </div>
            );
          })}
        </div>
        <div className="timeline-line"><div className="timeline-today-marker" title="Today" /></div>
        <div style={{ fontSize: 13, color: "var(--slate-400)", marginBottom: 12, marginTop: 8 }}>Key Events</div>
        <div className="events-row">
          {timeline.events.map((evt: any, i: number) => {
            const src = config.sources.find((s: any) => s.id === evt.source);
            return (
              <div key={i} className={`event-card ${evtsVis ? "visible" : ""}`} style={{ transitionDelay: `${i * 200}ms`, borderColor: src?.color + "30" }}>
                <div className="event-pin" style={{ background: src?.color }} />
                <div>
                  <div className="event-type">{evt.type}</div>
                  <div className="event-date">{evt.date} • {src?.name}</div>
                  <div className="event-detail">{evt.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step3({ config }: any) {
  const [ci, setCi] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<any>(null);
  const total = config.sources.length;
  const totalF = config.sources.reduce((s: number, src: any) => s + src.fields.length, 0);
  const connF = config.sources.slice(0, ci + 1).reduce((s: number, src: any) => s + src.fields.length, 0);
  const advance = useCallback(() => {
    setCi((prev) => { if (prev >= total - 1) { setPlaying(false); return prev; } return prev + 1; });
  }, [total]);
  useEffect(() => { if (playing) timerRef.current = setInterval(advance, 1400); return () => clearInterval(timerRef.current); }, [playing, advance]);
  const reset = () => { setCi(-1); setPlaying(false); clearInterval(timerRef.current); };
  const playAll = () => { reset(); setTimeout(() => { setPlaying(true); setCi(0); }, 100); };
  return (
    <div>
      <div className="step-title">Connecting the Pieces</div>
      <div className="step-intro">
        Each system knows about the same loan using:{" "}
        <span className="mono" style={{ color: "var(--amber)" }}>{config.joinValue}</span>. Watch how
        records are matched together across {total} sources.
      </div>
      <div className="assembly-controls">
        <button className="btn btn-primary" onClick={playAll}>▶ Play All</button>
        <button className="btn btn-secondary" onClick={advance} disabled={ci >= total - 1}>Next Source →</button>
        <button className="btn btn-ghost" onClick={reset}>↺ Reset</button>
      </div>
      <div className="assembly-container" style={{ marginTop: 24 }}>
        <div className="assembly-sources">
          {config.sources.map((src: any, i: number) => (
            <div
              key={src.id}
              className={`assembly-source-card ${i === ci ? "active" : ""} ${i < ci ? "connected" : ""}`}
              style={{ borderColor: i <= ci ? src.color + "40" : undefined }}
              onClick={() => { if (ci < i) setCi(i); }}
            >
              <div className="assembly-source-name" style={{ color: i <= ci ? src.color : undefined }}>
                <span>{src.icon}</span>{src.name}{i <= ci && <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>}
              </div>
              <div className="assembly-source-id" style={{ background: src.color + "15", color: src.color }}>
                {config.joinField}: {config.joinValue}
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: "0 0 60px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 3, background: `linear-gradient(180deg,${config.sources.slice(0, ci + 1).map((s: any) => s.color).join(",") || "transparent"})`, height: ci >= 0 ? "100%" : 0, transition: "height .6s", borderRadius: 2, position: "absolute", top: 0 }} />
          <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", fontSize: 24, opacity: ci >= 0 ? 1 : 0.3 }}>→</div>
        </div>
        <div className="assembly-result">
          <div className="assembly-result-title">Combined Record</div>
          <div className="assembly-result-counter">{connF} of {totalF} fields</div>
          {config.sources.map((src: any, si: number) =>
            si <= ci && (
              <div key={src.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: src.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, paddingLeft: 12 }}>
                  From {src.name}
                </div>
                {src.fields.map((f: any, fi: number) => (
                  <div key={fi} className={`assembled-field ${si <= ci ? "visible" : ""}`} style={{ transitionDelay: `${fi * 80}ms`, borderLeft: `3px solid ${src.color}` }}>
                    <span className="assembled-field-name">{f.name}</span>
                    <span className="assembled-field-value" style={{ color: src.color }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )
          )}
          {ci < 0 && <div style={{ color: "var(--slate-400)", fontSize: 14, textAlign: "center", padding: 40 }}>Click "Play All" or "Next Source" to begin.</div>}
        </div>
      </div>
      <div className={`assembly-annotation ${ci >= 0 ? "visible" : ""}`}>
        {ci >= 0 && ci < total && (
          <span>
            <strong style={{ color: config.sources[ci]?.color }}>{config.sources[ci]?.name}:</strong>{" "}
            {config.sources[ci]?.annotation}
          </span>
        )}
        {ci >= total - 1 && (
          <div style={{ marginTop: 8, color: "var(--amber)" }}>
            All {total} sources matched. Some fields still need to be <em>calculated</em> — particularly EAD (from position_detail) and limit_status (from limit_rule thresholds).
          </div>
        )}
      </div>
    </div>
  );
}

function Step4({ config }: any) {
  const [ei, setEi] = useState<number | null>(null);
  const gc = (sid: string) => config.sources.find((s: any) => s.id === sid)?.color || "var(--slate-400)";
  const gn = (sid: string) => config.sources.find((s: any) => s.id === sid)?.name || "System";
  return (
    <div>
      <div className="step-title">Calculations & Enrichment</div>
      <div className="step-intro">
        Some fields are <strong style={{ color: "var(--white)" }}>derived</strong> by combining values
        from different sources. In the updated model, some previously-derived fields (net_exposure_usd,
        coverage_ratio_pct) are now stored directly on L2 facility_exposure_snapshot, while others (EAD,
        expected_loss, limit_status) are still calculated. Click any to see the formula.
      </div>
      <div className="calc-grid">
        {config.calculations.map((c: any, i: number) => {
          const open = ei === i;
          return (
            <div key={i} className="calc-card" style={{ borderColor: open ? "rgba(245,158,11,.2)" : undefined }}>
              <div className="calc-card-header" onClick={() => setEi(open ? null : i)}>
                <div className="calc-field-name">
                  <span>🧮</span>{c.field}
                  <span className="calc-badge">
                    {c.field.includes("(derived)") || c.field.includes("derived") ? "Derived" : c.field.includes("net_exposure") || c.field.includes("coverage") ? "Now L2" : "Calculated"}
                  </span>
                </div>
                <div className="calc-result">{c.result}</div>
              </div>
              <div className="calc-explanation">"{c.explanation}"</div>
              {open && (
                <div className="calc-breakdown">
                  <div className="calc-formula-visual">
                    {c.inputs.map((inp: any, j: number) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="calc-operator">{c.operator}</span>}
                        <div className="calc-input-chip" style={{ borderColor: gc(inp.source) + "50", background: gc(inp.source) + "10" }}>
                          <span className="calc-input-value">{inp.value}</span>
                          <span className="calc-input-label" style={{ color: gc(inp.source) }}>
                            {inp.label}{inp.source && <span> • {gn(inp.source)}</span>}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                    <span className="calc-operator">=</span>
                    <div className="calc-result-chip">
                      <span className="calc-result-value">{c.result}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step5({ config, onRestart }: any) {
  const [vm, setVm] = useState("dashboard");
  const [tt, setTt] = useState<string | null>(null);
  const gc = (sid: string) => config.sources.find((s: any) => s.id === sid)?.color || "var(--slate-400)";
  const gn = (sid: string) => config.sources.find((s: any) => s.id === sid)?.name || "Calculated";
  const { finalView: fv } = config;
  return (
    <div>
      <div className="step-title">The Final View</div>
      <div className="step-intro">
        All the pieces come together into one combined row — exactly what the dashboard shows. The updated
        model draws from {fv.totalSources} sources, with {fv.directFields} direct fields and{" "}
        {fv.calculatedFields} calculated fields.
      </div>
      <div className="final-toggle">
        <button className={`final-toggle-btn ${vm === "dashboard" ? "active" : ""}`} onClick={() => setVm("dashboard")}>
          Dashboard View
        </button>
        <button className={`final-toggle-btn ${vm === "lineage" ? "active" : ""}`} onClick={() => setVm("lineage")}>
          Lineage View
        </button>
      </div>
      {vm === "lineage" && (
        <div className="legend">
          {config.sources.map((s: any) => (
            <div key={s.id} className="legend-item">
              <div className="legend-dot" style={{ background: s.color }} />{s.name}
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-dot" style={{ background: "var(--amber)" }} />Calculated
          </div>
        </div>
      )}
      <div className="final-sections">
        {fv.sections.map((sec: any, si: number) => (
          <div key={si} className="final-section">
            <div className="final-section-header">{sec.title}</div>
            <div className="final-fields">
              {sec.fields.map((f: any, fi: number) => (
                <div
                  key={fi}
                  className="final-field"
                  onMouseEnter={() => setTt(`${si}-${fi}`)}
                  onMouseLeave={() => setTt(null)}
                  style={vm === "lineage" ? { borderLeft: `3px solid ${f.type === "calculated" ? "var(--amber)" : gc(f.source)}`, paddingLeft: 16 } : {}}
                >
                  <span className="final-field-name">
                    {vm === "lineage" && <span className="final-field-dot" style={{ background: f.type === "calculated" ? "var(--amber)" : gc(f.source) }} />}
                    {f.name}
                    {vm === "lineage" && (
                      <span className={`final-field-badge ${f.type === "calculated" ? "badge-calculated" : "badge-direct"}`}>
                        {f.type === "calculated" ? "Calc" : "Direct"}
                      </span>
                    )}
                  </span>
                  <span className="final-field-value">{f.value}</span>
                  {tt === `${si}-${fi}` && (
                    <div className="final-tooltip">
                      <div className="final-tooltip-row">
                        <span className="final-tooltip-label">Source:</span>
                        <span className="final-tooltip-value" style={{ color: f.source ? gc(f.source) : "var(--amber)" }}>
                          {f.source ? gn(f.source) : "Calculated"}
                        </span>
                      </div>
                      <div className="final-tooltip-row">
                        <span className="final-tooltip-label">Type:</span>
                        <span className="final-tooltip-value">{f.type === "calculated" ? "Calculated" : "Stored directly"}</span>
                      </div>
                      {f.formula && (
                        <div className="final-tooltip-row">
                          <span className="final-tooltip-label">Formula:</span>
                          <span className="final-tooltip-value">{f.formula}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="final-stats">
        <div className="final-stat-card"><div className="final-stat-number">{fv.totalSources}</div><div className="final-stat-label">Sources</div></div>
        <div className="final-stat-card"><div className="final-stat-number">{fv.directFields}</div><div className="final-stat-label">Direct Fields</div></div>
        <div className="final-stat-card"><div className="final-stat-number">{fv.calculatedFields}</div><div className="final-stat-label">Calculated</div></div>
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn btn-primary" onClick={onRestart} style={{ fontSize: 16, padding: "12px 32px" }}>
          ↺ Restart Demo
        </button>
      </div>
    </div>
  );
}

export default function FacilitySummaryWalkthrough({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const goNext = () => setStep((p) => Math.min(p + 1, 5));
  const goPrev = () => setStep((p) => Math.max(p - 1, 1));
  const restart = () => setStep(1);

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 config={CONFIG} />;
      case 2: return <Step2 config={CONFIG} />;
      case 3: return <Step3 config={CONFIG} />;
      case 4: return <Step4 config={CONFIG} />;
      case 5: return <Step5 config={CONFIG} onRestart={restart} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app-root">
        {onClose && (
          <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ background: "rgba(255,255,255,.1)" }}>
              ✕ Close
            </button>
          </div>
        )}
        <div className="step-nav">
          <div className="step-nav-inner">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <div className={`step-connector ${step > s.num - 1 ? "done" : ""}`} />}
                <div
                  className={`step-item ${step === s.num ? "active" : ""} ${step > s.num ? "completed" : ""}`}
                  onClick={() => setStep(s.num)}
                >
                  <div className="step-circle">{step > s.num ? "✓" : s.num}</div>
                  <div className="step-label">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="main-content">
          {renderStep()}
          <div className="nav-buttons">
            <button className="btn btn-secondary" onClick={goPrev} disabled={step === 1} style={{ opacity: step === 1 ? 0.3 : 1 }}>
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: "var(--slate-400)" }}>Step {step} of 5</span>
            {step < 5 ? (
              <button className="btn btn-primary" onClick={goNext}>Next Step →</button>
            ) : (
              <button className="btn btn-primary" onClick={onClose || restart}>{onClose ? "← Back to Overview" : "↺ Restart"}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
