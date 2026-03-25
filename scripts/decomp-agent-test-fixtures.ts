/**
 * Shared test fixtures for decomposition agent validation.
 *
 * Defines the authoritative reference data that tests validate against:
 * - Agent registry (all 8 decomp experts with domain-specific expectations)
 * - Rollup strategy rules (from CLAUDE.md conventions)
 * - Golden metric formulas (Basel III/IV regulatory references)
 * - Regulatory framework registry
 * - Non-additivity rules
 * - FX conversion rules
 * - Shared vocabulary enums
 */

// ============================================================================
// 1A. Agent Registry
// ============================================================================

export interface AgentSpec {
  name: string;
  file: string; // relative path from .claude/commands/
  domain: string;
  knowledgeBaseHeader: string; // e.g., "## 4. Credit Risk Knowledge Base"
  rollupHierarchy: string[];
  expectedSubDomains: string[];
  expectedMetricFamilies: string[];
  expectedRegulatoryFrameworks: string[];
  schemaMaturity: 'mature' | 'partial' | 'immature';
}

export const AGENT_REGISTRY: AgentSpec[] = [
  {
    name: 'decomp-credit-risk',
    file: 'experts/decomp-credit-risk.md',
    domain: 'credit_risk',
    knowledgeBaseHeader: '## 4. Credit Risk Knowledge Base',
    rollupHierarchy: ['Facility', 'Counterparty', 'Desk', 'Portfolio', 'Business Segment'],
    expectedSubDomains: [
      'PD', 'LGD', 'EAD', 'EL', 'DSCR', 'LTV', 'RWA', 'NPL',
      'concentration', 'provisioning',
    ],
    expectedMetricFamilies: [
      'Expected Loss', 'Probability of Default', 'Loss Given Default',
      'Exposure at Default', 'Debt Service Coverage Ratio',
      'Loan-to-Value', 'Risk-Weighted Assets',
    ],
    expectedRegulatoryFrameworks: ['Basel III CRE', 'FR Y-14Q'],
    schemaMaturity: 'mature',
  },
  {
    name: 'decomp-market-risk',
    file: 'experts/decomp-market-risk.md',
    domain: 'market_risk',
    knowledgeBaseHeader: '## 4. Market Risk Knowledge Base',
    rollupHierarchy: ['Position', 'Desk', 'Trading Unit', 'Business Line', 'Firm'],
    expectedSubDomains: [
      'FRTB IMA', 'FRTB SA', 'VaR', 'Greeks', 'P&L attribution', 'backtesting',
    ],
    expectedMetricFamilies: [
      'Value at Risk', 'Expected Shortfall', 'Sensitivities-Based Method',
      'Default Risk Charge', 'Residual Risk Add-On',
    ],
    expectedRegulatoryFrameworks: ['Basel III MAR', 'FRTB'],
    schemaMaturity: 'immature',
  },
  {
    name: 'decomp-ccr',
    file: 'experts/decomp-ccr.md',
    domain: 'counterparty_credit_risk',
    knowledgeBaseHeader: '## 4. Counterparty Credit Risk Knowledge Base',
    rollupHierarchy: ['Trade', 'Netting Set', 'Counterparty', 'Desk', 'Portfolio', 'Segment'],
    expectedSubDomains: [
      'SA-CCR', 'CVA', 'PFE', 'margin', 'collateral', 'wrong-way risk', 'CCP',
    ],
    expectedMetricFamilies: [
      'SA-CCR EAD', 'CVA Capital', 'Potential Future Exposure',
    ],
    expectedRegulatoryFrameworks: ['Basel III CRE', 'SA-CCR'],
    schemaMaturity: 'immature',
  },
  {
    name: 'decomp-liquidity',
    file: 'experts/decomp-liquidity.md',
    domain: 'liquidity',
    knowledgeBaseHeader: '## 4. Liquidity Risk Knowledge Base',
    rollupHierarchy: ['Product', 'Legal Entity', 'Currency', 'Segment', 'Consolidated'],
    expectedSubDomains: [
      'LCR', 'NSFR', 'HQLA', 'FR 2052a', 'intraday', 'funding concentration',
    ],
    expectedMetricFamilies: [
      'Liquidity Coverage Ratio', 'Net Stable Funding Ratio',
      'High-Quality Liquid Assets',
    ],
    expectedRegulatoryFrameworks: ['Basel III LCR', 'Basel III NSFR', 'FR 2052a'],
    schemaMaturity: 'immature',
  },
  {
    name: 'decomp-capital',
    file: 'experts/decomp-capital.md',
    domain: 'capital',
    knowledgeBaseHeader: '## 4. Capital Adequacy Knowledge Base',
    rollupHierarchy: ['Facility/Position', 'Business Line', 'Legal Entity', 'Consolidated'],
    expectedSubDomains: [
      'CET1', 'Tier 1', 'Total Capital', 'RWA', 'SLR', 'TLAC', 'buffers', 'binding constraint',
    ],
    expectedMetricFamilies: [
      'CET1 Ratio', 'Supplementary Leverage Ratio', 'Total Loss-Absorbing Capacity',
    ],
    expectedRegulatoryFrameworks: ['Basel III CAP', 'Basel III LEV'],
    schemaMaturity: 'partial',
  },
  {
    name: 'decomp-irrbb-alm',
    file: 'experts/decomp-irrbb-alm.md',
    domain: 'irrbb_alm',
    knowledgeBaseHeader: '## 4. IRRBB/ALM Knowledge Base',
    rollupHierarchy: ['Product/Position', 'Repricing Bucket', 'Currency', 'Entity', 'Consolidated'],
    expectedSubDomains: [
      'NII sensitivity', 'EVE sensitivity', 'repricing gap', 'basis risk',
      'optionality', 'FTP', 'duration',
    ],
    expectedMetricFamilies: [
      'NII Sensitivity', 'EVE Sensitivity', 'Duration Gap',
    ],
    expectedRegulatoryFrameworks: ['BCBS 368', 'IRRBB'],
    schemaMaturity: 'immature',
  },
  {
    name: 'decomp-oprisk',
    file: 'experts/decomp-oprisk.md',
    domain: 'operational_risk',
    knowledgeBaseHeader: '## 4. Operational Risk Knowledge Base',
    rollupHierarchy: ['Event', 'Process', 'Business Line', 'Entity', 'Consolidated'],
    expectedSubDomains: [
      'SMA', 'loss analysis', 'KRI', 'RCSA', 'scenario analysis',
    ],
    expectedMetricFamilies: [
      'SMA Capital', 'Business Indicator Component', 'Key Risk Indicators',
    ],
    expectedRegulatoryFrameworks: ['Basel III OPE', 'OPE 25'],
    schemaMaturity: 'immature',
  },
  {
    name: 'decomp-compliance',
    file: 'experts/decomp-compliance.md',
    domain: 'compliance',
    knowledgeBaseHeader: '## 4. Compliance Knowledge Base',
    rollupHierarchy: [], // varies by sub-domain
    expectedSubDomains: [
      'DFAST', 'CCAR', 'FR Y-14', 'Y-9C', 'resolution planning', 'LEX', 'BSA/AML',
    ],
    expectedMetricFamilies: [
      'Stress Capital Buffer', 'DFAST CET1 Trough',
    ],
    expectedRegulatoryFrameworks: ['12 CFR 252', 'Dodd-Frank'],
    schemaMaturity: 'immature',
  },
];

// ============================================================================
// 1B. Rollup Strategy Rules
// ============================================================================

export interface RollupRule {
  strategy: string;
  pattern: string;
  antiPattern?: string;
}

export const ROLLUP_RULES: Record<string, RollupRule> = {
  dollar_amounts: {
    strategy: 'direct-sum',
    pattern: 'SUM(value)',
    antiPattern: 'AVG',
  },
  ratios_rates: {
    strategy: 'sum-ratio',
    pattern: 'SUM(num)/SUM(denom)',
    antiPattern: 'AVG(ratio)',
  },
  percentage_of_count: {
    strategy: 'count-ratio',
    pattern: 'SUM(CASE)/COUNT(*)',
  },
  weighted_average: {
    strategy: 'weighted-avg',
    pattern: 'SUM(v*w)/SUM(w)',
  },
  non_aggregable: {
    strategy: 'none',
    pattern: 'recomputed',
  },
};

export const VALID_ROLLUP_STRATEGIES = [
  'direct-sum', 'sum-ratio', 'count-ratio', 'weighted-avg', 'none',
];

// ============================================================================
// 1C. Golden Metric Formulas
// ============================================================================

export interface GoldenMetric {
  domain: string;
  agent: string;
  metricName: string;
  formulaPattern: RegExp; // regex to find in agent knowledge base
  formulaDescription: string;
  regulatorySource: string;
  expectedRollup: string;
  antiPattern?: string; // rollup anti-pattern to catch
  direction: 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
  unitType: string;
  isNonAdditive: boolean;
  nonAdditivityReason?: string;
}

export const GOLDEN_METRICS: GoldenMetric[] = [
  // Credit Risk
  {
    domain: 'credit_risk',
    agent: 'decomp-credit-risk',
    metricName: 'Expected Loss',
    formulaPattern: /PD\s*[×x*]\s*LGD\s*[×x*]\s*EAD/i,
    formulaDescription: 'PD × LGD × EAD',
    regulatorySource: 'Basel III CRE 31',
    expectedRollup: 'direct-sum',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: false,
  },
  {
    domain: 'credit_risk',
    agent: 'decomp-credit-risk',
    metricName: 'Expected Loss Rate',
    formulaPattern: /PD\s*[×x*]\s*LGD/i,
    formulaDescription: 'PD × LGD (weighted by exposure)',
    regulatorySource: 'Basel III CRE 31',
    expectedRollup: 'sum-ratio',
    antiPattern: 'AVG(EL_rate)',
    direction: 'LOWER_BETTER',
    unitType: 'PERCENTAGE',
    isNonAdditive: false,
  },
  {
    domain: 'credit_risk',
    agent: 'decomp-credit-risk',
    metricName: 'RWA (SA)',
    formulaPattern: /EAD\s*[×x*]\s*(?:RW|Risk\s*Weight)/i,
    formulaDescription: 'EAD × Risk Weight',
    regulatorySource: 'Basel III CRE 20',
    expectedRollup: 'direct-sum',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: false,
  },
  {
    domain: 'credit_risk',
    agent: 'decomp-credit-risk',
    metricName: 'DSCR',
    formulaPattern: /Net\s*Operating\s*Income.*(?:Total\s*)?Debt\s*Service/i,
    formulaDescription: 'Net Operating Income / Total Debt Service',
    regulatorySource: 'OCC guidance',
    expectedRollup: 'weighted-avg',
    direction: 'HIGHER_BETTER',
    unitType: 'RATIO',
    isNonAdditive: false,
  },
  {
    domain: 'credit_risk',
    agent: 'decomp-credit-risk',
    metricName: 'HHI',
    formulaPattern: /HHI|Herfindahl/i,
    formulaDescription: 'Sum of squared market shares',
    regulatorySource: 'Concentration risk',
    expectedRollup: 'none',
    direction: 'LOWER_BETTER',
    unitType: 'COUNT',
    isNonAdditive: true,
    nonAdditivityReason: 'Recomputed from underlying distribution',
  },
  // Market Risk
  {
    domain: 'market_risk',
    agent: 'decomp-market-risk',
    metricName: 'Expected Shortfall',
    formulaPattern: /ES.*(?:correlation|sqrt|ES_RS)/i,
    formulaDescription: 'ES_RS + correlation adjustment',
    regulatorySource: 'MAR 33',
    expectedRollup: 'none',
    antiPattern: 'SUM(ES)',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: true,
    nonAdditivityReason: 'Diversification/correlation effects',
  },
  {
    domain: 'market_risk',
    agent: 'decomp-market-risk',
    metricName: 'SBM Capital',
    formulaPattern: /Delta.*Vega.*Curvature|SBM/i,
    formulaDescription: 'Delta + Vega + Curvature',
    regulatorySource: 'FRTB SA',
    expectedRollup: 'none',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: true,
    nonAdditivityReason: 'Correlation effects across risk classes',
  },
  {
    domain: 'market_risk',
    agent: 'decomp-market-risk',
    metricName: 'Value at Risk',
    formulaPattern: /VaR|Value.at.Risk/i,
    formulaDescription: '99% VaR, 10-day',
    regulatorySource: 'MAR 30',
    expectedRollup: 'none',
    antiPattern: 'SUM(VaR)',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: true,
    nonAdditivityReason: 'Diversification/correlation effects',
  },
  // CCR
  {
    domain: 'counterparty_credit_risk',
    agent: 'decomp-ccr',
    metricName: 'SA-CCR EAD',
    formulaPattern: /1\.4\s*[×x*]\s*\(\s*RC\s*\+\s*PFE\s*\)|alpha.*RC.*PFE/i,
    formulaDescription: '1.4 × (RC + PFE)',
    regulatorySource: 'CRE 52',
    expectedRollup: 'direct-sum',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: false,
  },
  {
    domain: 'counterparty_credit_risk',
    agent: 'decomp-ccr',
    metricName: 'BA-CVA Capital',
    formulaPattern: /beta.*K_reduced|CVA.*BA|BA.CVA/i,
    formulaDescription: 'beta × K_reduced + (1-beta) × K_hedged',
    regulatorySource: 'MAR 50',
    expectedRollup: 'none',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: true,
    nonAdditivityReason: 'Netting effects, correlation',
  },
  // Liquidity
  {
    domain: 'liquidity',
    agent: 'decomp-liquidity',
    metricName: 'LCR',
    formulaPattern: /HQLA\s*\/\s*(?:Net\s*)?(?:Cash\s*)?Outflows|LCR/i,
    formulaDescription: 'HQLA / Net Outflows (30d) >= 100%',
    regulatorySource: 'LCR 30',
    expectedRollup: 'sum-ratio',
    antiPattern: 'AVG(LCR)',
    direction: 'HIGHER_BETTER',
    unitType: 'PERCENTAGE',
    isNonAdditive: false,
  },
  {
    domain: 'liquidity',
    agent: 'decomp-liquidity',
    metricName: 'NSFR',
    formulaPattern: /ASF\s*\/\s*RSF|NSFR/i,
    formulaDescription: 'ASF / RSF >= 100%',
    regulatorySource: 'NSFR 40',
    expectedRollup: 'sum-ratio',
    antiPattern: 'AVG(NSFR)',
    direction: 'HIGHER_BETTER',
    unitType: 'PERCENTAGE',
    isNonAdditive: false,
  },
  // Capital
  {
    domain: 'capital',
    agent: 'decomp-capital',
    metricName: 'CET1 Ratio',
    formulaPattern: /CET1\s*\/\s*(?:Total\s*)?RWA|CET1.*ratio/i,
    formulaDescription: 'CET1 / Total RWA >= 4.5%',
    regulatorySource: 'CAP 10',
    expectedRollup: 'sum-ratio',
    antiPattern: 'AVG(CET1_ratio)',
    direction: 'HIGHER_BETTER',
    unitType: 'PERCENTAGE',
    isNonAdditive: false,
  },
  {
    domain: 'capital',
    agent: 'decomp-capital',
    metricName: 'Supplementary Leverage Ratio',
    formulaPattern: /T(?:ier)?\s*1\s*\/\s*(?:TLE|Total\s*Leverage\s*Exposure)|SLR/i,
    formulaDescription: 'T1 / TLE >= 3% (5% GSIB)',
    regulatorySource: 'LEV 10',
    expectedRollup: 'sum-ratio',
    direction: 'HIGHER_BETTER',
    unitType: 'PERCENTAGE',
    isNonAdditive: false,
  },
  // IRRBB
  {
    domain: 'irrbb_alm',
    agent: 'decomp-irrbb-alm',
    metricName: 'NII Sensitivity',
    formulaPattern: /(?:Gap|gap).*(?:delta|Δ).*(?:rate|r)|NII.*sensitiv/i,
    formulaDescription: 'sum(Gap_i × delta_r_i × time_weight_i)',
    regulatorySource: 'BCBS 368',
    expectedRollup: 'direct-sum',
    direction: 'NEUTRAL',
    unitType: 'CURRENCY',
    isNonAdditive: false,
  },
  {
    domain: 'irrbb_alm',
    agent: 'decomp-irrbb-alm',
    metricName: 'EVE Sensitivity',
    formulaPattern: /EVE.*shock|EVE.*sensitiv/i,
    formulaDescription: 'EVE_shocked - EVE_base',
    regulatorySource: 'BCBS 368',
    expectedRollup: 'direct-sum',
    direction: 'NEUTRAL',
    unitType: 'CURRENCY',
    isNonAdditive: false,
  },
  // Op Risk
  {
    domain: 'operational_risk',
    agent: 'decomp-oprisk',
    metricName: 'SMA Capital',
    formulaPattern: /BIC\s*[×x*]\s*ILM|SMA.*capital/i,
    formulaDescription: 'BIC × ILM',
    regulatorySource: 'OPE 25',
    expectedRollup: 'none',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: true,
    nonAdditivityReason: 'Entity-level calculation',
  },
  {
    domain: 'operational_risk',
    agent: 'decomp-oprisk',
    metricName: 'Business Indicator Component',
    formulaPattern: /(?:marginal|Marginal)\s*coefficients?\s*[×x*]\s*BI|BIC/i,
    formulaDescription: 'Marginal coefficients × BI',
    regulatorySource: 'OPE 25',
    expectedRollup: 'none',
    direction: 'LOWER_BETTER',
    unitType: 'CURRENCY',
    isNonAdditive: true,
    nonAdditivityReason: 'Entity-level, non-linear marginal coefficients',
  },
  // Compliance
  {
    domain: 'compliance',
    agent: 'decomp-compliance',
    metricName: 'Stress Capital Buffer',
    formulaPattern: /max\s*\(\s*2\.5%.*CET1.*trough|SCB/i,
    formulaDescription: 'max(2.5%, CET1_start - CET1_trough + dividends)',
    regulatorySource: '12 CFR 252',
    expectedRollup: 'none',
    direction: 'LOWER_BETTER',
    unitType: 'PERCENTAGE',
    isNonAdditive: true,
    nonAdditivityReason: 'Entity-specific determination',
  },
];

// ============================================================================
// 1D. Regulatory Framework Registry
// ============================================================================

export interface RegulatoryFramework {
  fullName: string;
  sectionPattern: RegExp;
}

export const REGULATORY_FRAMEWORKS: Record<string, RegulatoryFramework> = {
  'Basel III CRE': { fullName: 'Basel III Credit Risk', sectionPattern: /CRE\s*\d+/ },
  'Basel III MAR': { fullName: 'Basel III Market Risk', sectionPattern: /MAR\s*\d+/ },
  'Basel III OPE': { fullName: 'Basel III Operational Risk', sectionPattern: /OPE\s*\d+/ },
  'Basel III CAP': { fullName: 'Basel III Capital', sectionPattern: /CAP\s*\d+/ },
  'Basel III LEV': { fullName: 'Basel III Leverage', sectionPattern: /LEV\s*\d+/ },
  'Basel III LCR': { fullName: 'Basel III Liquidity Coverage', sectionPattern: /LCR\s*\d+/ },
  'Basel III NSFR': { fullName: 'Basel III Net Stable Funding', sectionPattern: /NSFR\s*\d+/ },
  'FRTB': { fullName: 'Fundamental Review of the Trading Book', sectionPattern: /MAR\s*\d+/ },
  'SA-CCR': { fullName: 'Standardized Approach for CCR', sectionPattern: /CRE\s*5[0-9]/ },
  'FR Y-14Q': { fullName: 'Federal Reserve Y-14Q', sectionPattern: /Schedule\s*[A-Z]/ },
  'FR Y-9C': { fullName: 'Consolidated Financial Statement', sectionPattern: /HC-[A-Z]/ },
  'FR 2052a': { fullName: 'Complex Institution Liquidity Monitoring', sectionPattern: /FR\s*2052a/ },
  'BCBS 368': { fullName: 'Interest Rate Risk in the Banking Book', sectionPattern: /BCBS\s*368/ },
  'OPE 25': { fullName: 'Basel III Operational Risk OPE 25', sectionPattern: /OPE\s*25/ },
  '12 CFR 252': { fullName: 'Prudential Standards for Large BHCs', sectionPattern: /12\s*CFR\s*252/ },
  'Dodd-Frank': { fullName: 'Dodd-Frank Wall Street Reform', sectionPattern: /(?:Section|§)\s*\d+/ },
  'OCC 2011-12': { fullName: 'OCC Supervisory Guidance on Model Risk', sectionPattern: /SR\s*11-7|OCC\s*2011-12/ },
};

// ============================================================================
// 1E. Non-Additivity Rules
// ============================================================================

export interface NonAdditivityRule {
  agent: string;
  metrics: string[];
  reason: string;
}

export const NON_ADDITIVE_RULES: NonAdditivityRule[] = [
  { agent: 'decomp-credit-risk', metrics: ['HHI', 'migration matrix'], reason: 'Recomputed from underlying distribution' },
  { agent: 'decomp-market-risk', metrics: ['VaR', 'ES', 'DRC', 'SBM capital'], reason: 'Diversification/correlation effects' },
  { agent: 'decomp-ccr', metrics: ['PFE', 'CVA capital'], reason: 'Netting effects, correlation' },
  { agent: 'decomp-liquidity', metrics: ['Survival horizon', 'intraday'], reason: 'Entity-specific, non-fungible' },
  { agent: 'decomp-capital', metrics: ['Binding constraint', 'buffers'], reason: 'Entity-specific determination' },
  { agent: 'decomp-irrbb-alm', metrics: ['Duration of equity'], reason: 'Entity-level ratio' },
  { agent: 'decomp-oprisk', metrics: ['KRI', 'SMA capital', 'scenario losses'], reason: 'Entity-level, Monte Carlo' },
  { agent: 'decomp-compliance', metrics: ['Stress capital projections'], reason: '9-quarter path-dependent' },
];

// ============================================================================
// 1F. FX Conversion Rules
// ============================================================================

export interface FxRule {
  agent: string;
  rule: string;
  pattern: RegExp;
}

export const FX_RULES: FxRule[] = [
  { agent: 'decomp-credit-risk', rule: 'FX at aggregate levels (counterparty+), facility stays local currency', pattern: /(?:FX|fx|currency).*(?:aggregate|counterparty|portfolio)/i },
  { agent: 'decomp-market-risk', rule: 'FX at desk+ level', pattern: /(?:FX|fx|currency).*(?:desk|trading)/i },
  { agent: 'decomp-ccr', rule: 'FX at counterparty+ level', pattern: /(?:FX|fx|currency).*(?:counterparty|netting)/i },
  { agent: 'decomp-liquidity', rule: 'Limited — entity and currency are separate dimensions', pattern: /(?:currency|FX).*(?:dimension|separate|entity)/i },
  { agent: 'decomp-capital', rule: 'FX at entity+ level', pattern: /(?:FX|fx|currency).*(?:entity|consolidated)/i },
  { agent: 'decomp-irrbb-alm', rule: 'Currency is a native dimension — no conversion within currency', pattern: /(?:currency|FX).*(?:dimension|native|within)/i },
  { agent: 'decomp-oprisk', rule: 'Event-level (no FX)', pattern: /(?:event|local|report)/i },
  { agent: 'decomp-compliance', rule: 'Depends on sub-domain', pattern: /(?:report|entity|jurisdiction)/i },
];

// ============================================================================
// 1G. Shared Vocabulary Enums
// ============================================================================

export const SHARED_VOCABULARY = {
  metric_class: ['SOURCED', 'CALCULATED', 'HYBRID'],
  direction: ['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'],
  unit_type: ['CURRENCY', 'PERCENTAGE', 'RATIO', 'COUNT', 'DAYS', 'ORDINAL', 'RATE', 'BPS', 'MULTIPLIER'],
  data_quality_tier: ['GOLD', 'SILVER', 'BRONZE'],
  confidence: ['HIGH', 'MEDIUM', 'LOW'],
};

// ============================================================================
// 1H. Required Section Headers (generalized across all 8 agents)
// ============================================================================

/** Sections every decomp agent must have. Section 4 varies by domain — use AgentSpec.knowledgeBaseHeader */
export const REQUIRED_SECTION_PREFIXES = [
  '## 1. Invocation Modes',
  '## 2. Context Loading',
  '## 3. Intake Questions',
  // Section 4 varies — checked via AgentSpec.knowledgeBaseHeader
  '## 5. Decomposition Output Format',
  '## 6. Confirmation Gate',
  '## 7. Audit Logging',
  '## 8. Duplicate Detection',
  '## 9. Error Handling',
];

/** Output format blocks that every agent must define */
export const OUTPUT_BLOCKS = ['5A', '5B', '5C', '5D', '5E', '5F', '5G', '5H', '5I'];

// ============================================================================
// 1I. Required Variant Awareness
// ============================================================================

export interface VariantRequirement {
  agent: string;
  requiredVariants: string[];
}

export const VARIANT_REQUIREMENTS: VariantRequirement[] = [
  { agent: 'decomp-credit-risk', requiredVariants: ['Stressed', 'PIT', 'TTC', 'SA', 'IRB', 'CECL'] },
  { agent: 'decomp-market-risk', requiredVariants: ['IMA', 'SA', 'VaR', 'ES', 'stressed'] },
  { agent: 'decomp-ccr', requiredVariants: ['margined', 'unmargined', 'SA-CCR', 'IMM', 'BA-CVA', 'SA-CVA'] },
  { agent: 'decomp-liquidity', requiredVariants: ['solo', 'consolidated', 'stressed', 'BAU'] },
  { agent: 'decomp-capital', requiredVariants: ['SA', 'IRB', 'CET1', 'Tier 1', 'SLR'] },
  { agent: 'decomp-irrbb-alm', requiredVariants: ['shock', 'static', 'dynamic'] },
  { agent: 'decomp-oprisk', requiredVariants: ['SMA', 'ILM', 'event type', 'business line'] },
  { agent: 'decomp-compliance', requiredVariants: ['Baseline', 'Adverse', 'Severely Adverse'] },
];

// ============================================================================
// 1J. Compliance Agent Upstream References
// ============================================================================

export const COMPLIANCE_UPSTREAM_AGENTS = [
  { agent: 'decomp-credit-risk', reference: 'stressed credit losses' },
  { agent: 'decomp-market-risk', reference: 'GMS|trading losses' },
  { agent: 'decomp-ccr', reference: 'counterparty default losses' },
  { agent: 'decomp-liquidity', reference: 'liquidity stress projections' },
  { agent: 'decomp-capital', reference: 'starting capital|buffers' },
  { agent: 'decomp-oprisk', reference: 'stressed op risk losses' },
  { agent: 'decomp-irrbb-alm', reference: 'NII projections' },
];

// ============================================================================
// 1K. Canonical Audit Methods
// ============================================================================

export const CANONICAL_AUDIT_METHODS = [
  'write_reasoning_step',
  'write_action',
  'write_schema_change',
  'write_finding',
  'finalize_session',
];

export const DEPRECATED_AUDIT_ALIASES = [
  'log_agent_run',
  'log_action',
  'log_schema_change',
  'log_session_complete',
];
