/** Static configuration data for the Facility Summary walkthrough. */

export const CONFIG = {
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
        "L1 reference table (34 fields). Core facility terms — type, committed amount, maturity, interest rate structure, amortization, Business Segment assignment (via lob_segment_id → enterprise_business_taxonomy), product classification (via product_node_id → enterprise_product_taxonomy), and the link to its credit agreement. Now carries rate terms and GL booking (ledger_account_id).",
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
        "L1 reference — the foundational facility record. Now 34 fields including full rate structure (interest_rate_type, spread_bps, rate_cap/floor, payment_frequency), amortization_type, and ledger_account_id for GL booking. Links to credit_agreement_master, enterprise_business_taxonomy (Business Segment), enterprise_product_taxonomy (product), portfolio_dim, interest_rate_index_dim, and counterparty.",
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
        { name: "industry_id", value: "51 → industry_dim (Information)" },
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
        "L2 snapshot — atomic exposure data. Monthly reading of gross exposure, drawn/undrawn amounts, and source-system fields. Derived fields (net_exposure_usd, coverage_ratio_pct, rwa_amt, days_until_maturity) live in L3.facility_exposure_calc. Also carries fr2590_category_code and product_node_id for reporting.",
      fields: [
        { name: "gross_exposure_usd", value: "$178.3M" },
        { name: "drawn_amount", value: "$162.5M" },
        { name: "undrawn_amount", value: "$87.5M" },
        { name: "committed_amount", value: "$250.0M" },
        { name: "fr2590_category_code", value: "→ fr2590_category_dim" },
        { name: "lob_segment_id", value: "→ enterprise_business_taxonomy" },
        { name: "as_of_date", value: "2026-02-28" },
      ],
      annotation:
        "L2 snapshot — atomic exposure fields only. Derived fields (net_exposure_usd, coverage_ratio_pct, rwa_amt, days_until_maturity) moved to L3.facility_exposure_calc. Carries its own lob_segment_id and product_node_id FKs for denormalized reporting. EAD is still derived from position_detail (funded + unfunded × CCF).",
    },
    {
      id: "position",
      name: "L2 · position + position_detail",
      icon: "📐",
      color: "#06B6D4",
      description:
        "L2 snapshot tables. position (24 fields) carries PD/LGD estimates, credit status, exposure type, and trading/banking book indicator. position_detail (25 fields) extends with product-specific attributes: funded/unfunded amounts, CCF, interest rate, days past due, derivative MTM/PFE, SFT terms.",
      fields: [
        { name: "product_code", value: "LOAN" },
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
        "L2 snapshot (7 fields). NEW TABLE. Handles split-Business Segment exposure attribution — one row per (facility, lob_segment) with attribution_pct, attribution_amount_usd, and attribution_type (PRIMARY/SECONDARY). Replaces old pattern of Business Segment splits via counterparty participation.",
      fields: [
        { name: "lob_segment_id", value: "SEG-TMT-003 → enterprise_business_taxonomy" },
        { name: "attribution_pct", value: "100%" },
        { name: "attribution_amount_usd", value: "$178.3M" },
        { name: "attribution_type", value: "PRIMARY" },
      ],
      annotation:
        "L2 snapshot — NEW dedicated Business Segment attribution table. For Meridian's facility, 100% to TMT. For split-exposure facilities like Silverline, two rows: TMT 60% ($91.7M) + Infrastructure 40% ($61.1M). attribution_pct must sum to 100%. Replaces reliance on facility_counterparty_participation for Business Segment splits.",
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
        "On L3 facility_exposure_calc: SUM(collateral_snapshot.allocated_amount_usd) ÷ gross_exposure_usd. Derived from L2 atomic inputs.",
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
        "On L3 facility_exposure_calc: gross_exposure_usd − SUM(collateral_snapshot.allocated_amount_usd). Derived from L2 atomic inputs.",
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
          { name: "industry_id → industry_dim", value: "51 (Information)", source: "counterparty", type: "direct" },
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
          { name: "drawn_amount", value: "$162.5M", source: "facility_exposure_snapshot", type: "direct" },
          { name: "undrawn_amount", value: "$87.5M", source: "facility_exposure_snapshot", type: "direct" },
        ],
      },
      {
        title: "L3 Derived — Exposure Calc (facility_exposure_calc)",
        fields: [
          { name: "net_exposure_usd", value: "$83.3M", source: "facility_exposure_calc", type: "derived" },
          { name: "coverage_ratio_pct", value: "53.3%", source: "facility_exposure_calc", type: "derived" },
        ],
      },
      {
        title: "L2 Snapshot — Position Risk (position + position_detail)",
        fields: [
          { name: "product_code", value: "LOAN", source: "position", type: "direct" },
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
        title: "L1/L2 — Participation & Business Segment Attribution",
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

export const STEPS = [
  { num: 1, label: "Where the Data Lives" },
  { num: 2, label: "Snapshots & Events" },
  { num: 3, label: "Connecting the Pieces" },
  { num: 4, label: "Calculations & Enrichment" },
  { num: 5, label: "The Final View" },
];

/** Lookup source color by id. */
export function getSourceColor(sources: typeof CONFIG.sources, id: string): string {
  return sources.find(s => s.id === id)?.color || "var(--slate-400)";
}

/** Lookup source name by id. */
export function getSourceName(sources: typeof CONFIG.sources, id: string): string {
  return sources.find(s => s.id === id)?.name || "System";
}
