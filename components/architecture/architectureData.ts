import {
  Database,
  Building2,
  Landmark,
  Briefcase,
  ShieldCheck,
  BookOpen,
  TrendingUp,
  BarChart3,
  Upload,
  SearchCheck,
  GitMerge,
  Link2,
  Layers,
  Camera,
  Cog,
  ArrowDownUp,
  Calculator,
  CheckCircle2,
  Table2,
  PieChart,
  Activity,
  FileText,
  LayoutDashboard,
  Library,
  Network,
  BookOpenCheck,
  Route,
  type LucideIcon,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ArchNodeItem {
  name: string;
  note?: string;
}

export interface ArchNodeStat {
  label: string;
  value: string;
}

export interface ArchNode {
  id: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  accentColor: string;
  detail: {
    description: string;
    items?: ArchNodeItem[];
    stats?: ArchNodeStat[];
    link?: string;
  };
}

export interface ArchStage {
  id: string;
  title: string;
  subtitle?: string;
  color: string;
  borderColor: string;
  bgColor: string;
  nodes: ArchNode[];
  internalFlow?: boolean;
}

export interface StageConnection {
  from: string;
  to: string;
  label?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage 1: Data Sources
 * ═══════════════════════════════════════════════════════════════════════════ */

const dataSources: ArchStage = {
  id: 'sources',
  title: 'Data Sources',
  subtitle: 'Upstream systems',
  color: '#94a3b8',
  borderColor: '#475569',
  bgColor: 'rgba(51, 65, 85, 0.3)',
  nodes: [
    {
      id: 'src-core-banking',
      label: 'Core Banking',
      subtitle: 'Loans & Deposits',
      icon: Building2,
      accentColor: '#94a3b8',
      detail: {
        description:
          'Loan origination and servicing systems. Primary source for facility records, drawn/undrawn balances, interest rates, and maturity dates.',
        items: [
          { name: 'Facility records', note: 'origination + servicing' },
          { name: 'Drawn / undrawn balances' },
          { name: 'Interest rates & terms' },
          { name: 'Payment schedules' },
        ],
      },
    },
    {
      id: 'src-treasury',
      label: 'Treasury / Funding',
      subtitle: 'Borrowings & Lines',
      icon: Landmark,
      accentColor: '#94a3b8',
      detail: {
        description:
          'Interbank funding, wholesale borrowings, and internal transfer pricing. Feeds funding-related exposure and cost-of-funds data.',
        items: [
          { name: 'Wholesale borrowings' },
          { name: 'Internal transfer pricing' },
          { name: 'Funding facilities' },
        ],
      },
    },
    {
      id: 'src-securities',
      label: 'Securities / Investment',
      subtitle: 'HQLA, AFS, HTM',
      icon: TrendingUp,
      accentColor: '#94a3b8',
      detail: {
        description:
          'Investment portfolio holdings — high-quality liquid assets (HQLA), available-for-sale (AFS), and held-to-maturity (HTM) securities.',
        items: [
          { name: 'HQLA classification' },
          { name: 'AFS / HTM portfolios' },
          { name: 'Market values & ratings' },
        ],
      },
    },
    {
      id: 'src-derivatives',
      label: 'Derivatives & SFTs',
      subtitle: 'Repo, SBL, Margin',
      icon: ArrowDownUp,
      accentColor: '#94a3b8',
      detail: {
        description:
          'OTC and cleared derivatives, securities financing transactions (repos, securities borrowing/lending), and margin flows.',
        items: [
          { name: 'Repo / reverse repo' },
          { name: 'Securities lending' },
          { name: 'Margin requirements' },
          { name: 'Derivative exposures' },
        ],
      },
    },
    {
      id: 'src-collateral',
      label: 'Collateral Systems',
      subtitle: 'Valuations & Liens',
      icon: ShieldCheck,
      accentColor: '#94a3b8',
      detail: {
        description:
          'Collateral management systems providing asset valuations, lien positions, haircut schedules, and encumbrance status.',
        items: [
          { name: 'Asset valuations (appraisals)' },
          { name: 'Lien positions & priority' },
          { name: 'Encumbrance tracking' },
          { name: 'Haircut schedules' },
        ],
      },
    },
    {
      id: 'src-gl',
      label: 'GL / Finance',
      subtitle: 'Reconciliation anchor',
      icon: BookOpen,
      accentColor: '#94a3b8',
      detail: {
        description:
          'General ledger and sub-ledger systems. Provides the financial reconciliation anchor for all exposure and balance data.',
        items: [
          { name: 'GL balances' },
          { name: 'Sub-ledger detail' },
          { name: 'Recon tie-out points' },
        ],
      },
    },
    {
      id: 'src-market-data',
      label: 'Market Data',
      subtitle: 'Pricing & Rates',
      icon: BarChart3,
      accentColor: '#94a3b8',
      detail: {
        description:
          'External market data feeds for FX rates, interest rate curves, credit spreads, and asset prices used in valuations and haircuts.',
        items: [
          { name: 'FX rates' },
          { name: 'Interest rate curves' },
          { name: 'Credit spreads' },
          { name: 'Asset prices' },
        ],
      },
    },
    {
      id: 'src-risk-ratings',
      label: 'Risk Rating Systems',
      subtitle: 'PD, LGD, Grades',
      icon: Activity,
      accentColor: '#94a3b8',
      detail: {
        description:
          'Internal and external risk rating models providing probability of default (PD), loss given default (LGD), and internal risk grades.',
        items: [
          { name: 'Internal risk grades' },
          { name: 'PD / LGD estimates' },
          { name: 'External agency ratings' },
        ],
      },
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage 2: Ingestion + Controls
 * ═══════════════════════════════════════════════════════════════════════════ */

const ingestion: ArchStage = {
  id: 'ingestion',
  title: 'Ingestion + Controls',
  subtitle: 'Data pipeline',
  color: '#60a5fa',
  borderColor: '#3b82f6',
  bgColor: 'rgba(59, 130, 246, 0.08)',
  internalFlow: true,
  nodes: [
    {
      id: 'ing-landing',
      label: 'Landing / Staging',
      subtitle: 'Files, APIs, ETL loads',
      icon: Upload,
      accentColor: '#60a5fa',
      detail: {
        description:
          'Raw data lands here from source systems via file drops, API pulls, or ETL jobs. Data is staged in its original format before any transformation.',
        items: [
          { name: 'File-based ingestion', note: 'CSV, Parquet, Excel' },
          { name: 'API-based pulls', note: 'REST, SFTP' },
          { name: 'ETL batch loads', note: 'scheduled nightly' },
        ],
      },
    },
    {
      id: 'ing-dq',
      label: 'Data Quality Checks',
      subtitle: 'Completeness, duplicates',
      icon: SearchCheck,
      accentColor: '#60a5fa',
      detail: {
        description:
          'Automated validation rules check for completeness, duplicates, referential integrity, and reasonableness. Failed records are quarantined.',
        items: [
          { name: 'Completeness checks', note: 'required fields present' },
          { name: 'Duplicate detection' },
          { name: 'Referential integrity', note: 'FK lookups' },
          { name: 'Reasonableness', note: 'range & outlier checks' },
        ],
      },
    },
    {
      id: 'ing-standardize',
      label: 'Standardization & Mapping',
      subtitle: 'Entity, product, currency',
      icon: GitMerge,
      accentColor: '#60a5fa',
      detail: {
        description:
          'Maps source-specific codes to canonical identifiers. Normalizes entity names, product types, currency codes, and tenor buckets to the enterprise standard.',
        items: [
          { name: 'Entity resolution', note: 'counterparty matching' },
          { name: 'Product type mapping' },
          { name: 'Currency normalization' },
          { name: 'Tenor bucketing' },
        ],
      },
    },
    {
      id: 'ing-lineage',
      label: 'Lineage & Run Control',
      subtitle: 'run_version_id, timestamps',
      icon: Link2,
      accentColor: '#60a5fa',
      detail: {
        description:
          'Each processing run is tagged with a run_version_id, as_of_date, and source timestamps. This enables full auditability and point-in-time reconstruction.',
        items: [
          { name: 'run_version_id', note: 'UUID per run' },
          { name: 'as_of_date', note: 'reporting date' },
          { name: 'Source tags', note: 'file/API origin' },
          { name: 'Timestamps', note: 'ingestion time' },
        ],
      },
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage 3: Canonical Model (L1 + L2)
 * ═══════════════════════════════════════════════════════════════════════════ */

const canonicalModel: ArchStage = {
  id: 'canonical',
  title: 'Canonical Model',
  subtitle: 'L1 + L2 (Read-only)',
  color: '#D04A02',
  borderColor: '#D04A02',
  bgColor: 'rgba(208, 74, 2, 0.06)',
  nodes: [
    {
      id: 'can-l1',
      label: 'L1 — Reference Data',
      subtitle: '78 master tables',
      icon: Layers,
      accentColor: '#D04A02',
      detail: {
        description:
          'Slowly-changing reference and master data. These tables define the "nouns" of the data model — facilities, counterparties, collateral assets, organizational hierarchy, and business rules.',
        items: [
          { name: 'facility_master', note: 'loan identity & terms' },
          { name: 'counterparty', note: 'borrower / issuer' },
          { name: 'collateral_asset_master', note: 'collateral identity' },
          { name: 'enterprise_business_taxonomy', note: 'org hierarchy' },
          { name: 'limit_rule', note: 'concentration limits' },
          { name: 'product_type', note: 'product classification' },
          { name: 'currency', note: 'ISO currency codes' },
          { name: '+ 71 more tables' },
        ],
        stats: [
          { label: 'Tables', value: '78' },
          { label: 'Type', value: 'Read-only' },
          { label: 'Change freq', value: 'Slow (days–months)' },
        ],
        link: '/data-model',
      },
    },
    {
      id: 'can-l2',
      label: 'L2 — Snapshots & Events',
      subtitle: '26 time-series tables',
      icon: Camera,
      accentColor: '#E87722',
      detail: {
        description:
          'Point-in-time snapshots and event records. These tables capture "what happened" — daily exposure readings, collateral valuations, credit events, and risk observations keyed by as_of_date.',
        items: [
          { name: 'facility_exposure_snapshot', note: 'daily exposure' },
          { name: 'collateral_snapshot', note: 'daily valuations' },
          { name: 'credit_event', note: 'defaults, downgrades' },
          { name: 'financial_metric_observation', note: 'PD, LGD readings' },
          { name: 'limit_utilization_event', note: 'limit usage' },
          { name: 'fx_rate_snapshot', note: 'daily FX rates' },
          { name: '+ 20 more tables' },
        ],
        stats: [
          { label: 'Tables', value: '26' },
          { label: 'Type', value: 'Read-only' },
          { label: 'Grain', value: 'as_of_date' },
        ],
        link: '/data-model',
      },
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage 4: Processing Engine (L3)
 * ═══════════════════════════════════════════════════════════════════════════ */

const processingEngine: ArchStage = {
  id: 'engine',
  title: 'Processing Engine',
  subtitle: 'L3 Population (4 tiers)',
  color: '#a78bfa',
  borderColor: '#8b5cf6',
  bgColor: 'rgba(139, 92, 246, 0.08)',
  internalFlow: true,
  nodes: [
    {
      id: 'eng-tier1',
      label: 'Tier 1',
      subtitle: 'L1 + L2 → L3 base tables',
      icon: Cog,
      accentColor: '#a78bfa',
      detail: {
        description:
          'First processing pass. Reads only from L1 and L2 tables to produce foundational L3 reporting tables. No L3-to-L3 dependencies at this tier.',
        items: [
          { name: 'exposure_metric_cube', note: 'facility-level metrics' },
          { name: 'collateral_coverage_summary' },
          { name: 'counterparty_exposure_summary' },
        ],
        stats: [{ label: 'Reads from', value: 'L1 + L2 only' }],
      },
    },
    {
      id: 'eng-tier2',
      label: 'Tier 2',
      subtitle: 'Reads Tier 1 L3',
      icon: Cog,
      accentColor: '#a78bfa',
      detail: {
        description:
          'Second pass. Can read L1, L2, and Tier 1 L3 tables. Produces cross-entity and aggregated views that depend on Tier 1 outputs.',
        items: [
          { name: 'risk_metric_cube', note: 'risk-adjusted views' },
          { name: 'portfolio_concentration' },
          { name: 'lob_exposure_rollup' },
        ],
        stats: [{ label: 'Reads from', value: 'L1 + L2 + Tier 1 L3' }],
      },
    },
    {
      id: 'eng-tier3',
      label: 'Tier 3',
      subtitle: 'Reads Tier 1–2 L3',
      icon: Cog,
      accentColor: '#a78bfa',
      detail: {
        description:
          'Third pass. Can read everything from Tiers 1–2. Produces variance analysis, period-over-period comparisons, and distribution buckets.',
        items: [
          { name: 'Period-over-period changes' },
          { name: 'Distribution buckets' },
          { name: 'Variance analysis' },
        ],
        stats: [{ label: 'Reads from', value: 'L1 + L2 + Tier 1-2 L3' }],
      },
    },
    {
      id: 'eng-tier4',
      label: 'Tier 4',
      subtitle: 'Reads all tiers',
      icon: Cog,
      accentColor: '#a78bfa',
      detail: {
        description:
          'Final pass. Full access to all prior tiers. Produces top-level summary tables, cross-domain joins, and final reconciliation inputs.',
        items: [
          { name: 'Executive summary tables' },
          { name: 'Cross-domain aggregations' },
          { name: 'Final reconciliation inputs' },
        ],
        stats: [{ label: 'Reads from', value: 'All L1 + L2 + L3' }],
      },
    },
    {
      id: 'eng-metrics',
      label: 'Metric Derivation',
      subtitle: '27 variants, 8 domains',
      icon: Calculator,
      accentColor: '#c084fc',
      detail: {
        description:
          'The metric engine computes 27 metric variants across 8 domains (Credit Quality, Exposure, Profitability, Collateral, etc.). Each variant has a formula, rollup logic, and weighting strategy.',
        items: [
          { name: 'LTV', note: 'Loan-to-Value ratio' },
          { name: 'DSCR', note: 'Debt Service Coverage' },
          { name: 'PD', note: 'Probability of Default' },
          { name: 'LGD', note: 'Loss Given Default' },
          { name: 'WABR', note: 'Weighted Avg Borrower Rating' },
          { name: '+ 22 more variants' },
        ],
        stats: [
          { label: 'Domains', value: '8' },
          { label: 'Parent metrics', value: '12' },
          { label: 'Variants', value: '27' },
        ],
        link: '/metrics/library',
      },
    },
    {
      id: 'eng-recon',
      label: 'Reconciliation',
      subtitle: 'Post-run validation',
      icon: CheckCircle2,
      accentColor: '#34d399',
      detail: {
        description:
          'Automated post-run validation checks. Row counts, balance tie-outs to GL, NULL rate monitoring, and cross-tier consistency checks.',
        items: [
          { name: 'Row count validation' },
          { name: 'Balance tie-out to GL' },
          { name: 'NULL rate checks' },
          { name: 'Cross-tier consistency' },
        ],
      },
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage 5: Outputs
 * ═══════════════════════════════════════════════════════════════════════════ */

const outputs: ArchStage = {
  id: 'outputs',
  title: 'Outputs',
  subtitle: 'L3 tables + metrics',
  color: '#2dd4bf',
  borderColor: '#14b8a6',
  bgColor: 'rgba(20, 184, 166, 0.08)',
  nodes: [
    {
      id: 'out-l3-tables',
      label: 'L3 Reporting Tables',
      subtitle: '49 analytics tables',
      icon: Table2,
      accentColor: '#2dd4bf',
      detail: {
        description:
          'The 49 L3 tables form the reporting and analytics layer. Pre-joined, pre-aggregated, and ready for direct consumption by dashboards and downstream systems.',
        items: [
          { name: 'exposure_metric_cube' },
          { name: 'risk_metric_cube' },
          { name: 'collateral_coverage_summary' },
          { name: 'counterparty_exposure_summary' },
          { name: 'portfolio_concentration' },
          { name: '+ 44 more tables' },
        ],
        stats: [
          { label: 'Tables', value: '49' },
          { label: 'Type', value: 'Write target' },
        ],
        link: '/data-model',
      },
    },
    {
      id: 'out-metric-values',
      label: 'Metric Values',
      subtitle: 'LTV, DSCR, PD, LGD...',
      icon: PieChart,
      accentColor: '#2dd4bf',
      detail: {
        description:
          'Computed metric values at every rollup level: facility, counterparty, desk, portfolio, and business segment. Weighted averages using committed facility amount.',
        items: [
          { name: 'Facility-level metrics' },
          { name: 'Counterparty rollup' },
          { name: 'Desk / Portfolio / Business Segment rollup' },
          { name: 'Distribution buckets' },
        ],
        stats: [
          { label: 'Rollup levels', value: '5' },
          { label: 'Weighting', value: 'Committed amount' },
        ],
      },
    },
    {
      id: 'out-lineage',
      label: 'Audit / Lineage Trail',
      subtitle: 'Full traceability',
      icon: Route,
      accentColor: '#2dd4bf',
      detail: {
        description:
          'Every computed value traces back through the lineage to its source tables and fields. Run metadata (run_version_id, as_of_date) enables point-in-time audit.',
        items: [
          { name: 'Source field lineage', note: 'grouped by table' },
          { name: 'Run metadata' },
          { name: 'Formula documentation' },
          { name: 'Assumptions used' },
        ],
      },
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage 6: Consumption / Reporting
 * ═══════════════════════════════════════════════════════════════════════════ */

const consumption: ArchStage = {
  id: 'consumption',
  title: 'Consumption',
  subtitle: 'Reporting & exploration',
  color: '#f472b6',
  borderColor: '#ec4899',
  bgColor: 'rgba(236, 72, 153, 0.08)',
  nodes: [
    {
      id: 'con-dashboard',
      label: 'Dashboard',
      subtitle: 'Credit risk overview',
      icon: LayoutDashboard,
      accentColor: '#f472b6',
      detail: {
        description:
          'Interactive credit risk dashboard with portfolio-level KPIs, trend charts, distribution views, and drill-down to individual facilities.',
        stats: [
          { label: 'Views', value: 'Summary + Detail' },
          { label: 'Refresh', value: 'Daily' },
        ],
        link: '/dashboard',
      },
    },
    {
      id: 'con-metric-lib',
      label: 'Metric Library',
      subtitle: 'Interactive metric explorer',
      icon: Library,
      accentColor: '#f472b6',
      detail: {
        description:
          'Browse all 27 metric variants with formulas, lineage diagrams, guided demos, and rollup hierarchy visualization. Includes interactive walkthroughs for LTV, DSCR, and more.',
        stats: [
          { label: 'Metrics', value: '27 variants' },
          { label: 'Demos', value: 'LTV, DSCR, Table Traversal' },
        ],
        link: '/metrics/library',
      },
    },
    {
      id: 'con-visualizer',
      label: 'Schema Visualizer',
      subtitle: 'Interactive data model',
      icon: Network,
      accentColor: '#f472b6',
      detail: {
        description:
          'Canvas-based interactive visualization of all 153 tables across L1/L2/L3. Shows relationships, foreign keys, and impact analysis.',
        stats: [
          { label: 'Tables', value: '153' },
          { label: 'Relationships', value: 'FK graph' },
        ],
        link: '/visualizer',
      },
    },
    {
      id: 'con-data-dict',
      label: 'Data Dictionary',
      subtitle: 'Field-level docs',
      icon: BookOpenCheck,
      accentColor: '#f472b6',
      detail: {
        description:
          'Searchable data dictionary with field-level documentation, data types, PK/FK relationships, formulas, and source tables for every field in the model.',
        link: '/data-model',
      },
    },
    {
      id: 'con-lineage',
      label: 'Lineage Explorer',
      subtitle: 'Metric derivation paths',
      icon: FileText,
      accentColor: '#f472b6',
      detail: {
        description:
          'Visual lineage diagrams showing how each metric traces from source fields through joins, formulas, and rollup logic. Available for LTV, DSCR, WABR, Interest Income, and Committed Amount.',
        link: '/metrics/LTV/lineage',
      },
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Exports
 * ═══════════════════════════════════════════════════════════════════════════ */

export const STAGES: ArchStage[] = [
  dataSources,
  ingestion,
  canonicalModel,
  processingEngine,
  outputs,
  consumption,
];

export const STAGE_CONNECTIONS: StageConnection[] = [
  { from: 'sources', to: 'ingestion', label: 'Raw feeds' },
  { from: 'ingestion', to: 'canonical', label: 'Validated & mapped' },
  { from: 'canonical', to: 'engine', label: 'L1 + L2 inputs' },
  { from: 'engine', to: 'outputs', label: 'Computed results' },
  { from: 'outputs', to: 'consumption', label: 'Ready to consume' },
];
