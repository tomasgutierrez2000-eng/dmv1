/**
 * GSIB Enrichment — auto-fills regulatory and banking fields from simple inputs.
 *
 * Takes layman's-terms scenario descriptions and enriches them with:
 *   - Basel III asset classes, risk grades, regulatory counterparty types
 *   - FR 2590 / Call Report / Y-14Q classification codes
 *   - PD, LGD, LEI codes, rating agency cross-mappings
 *   - Facility types, day-count conventions, amortization types
 *   - Realistic financial parameters driven by size profile + rating tier
 *
 * This module ensures that AI-crafted narrative YAML configs produce
 * GSIB-quality data without requiring banking expertise in the YAML.
 */

import {
  RATING_TIER_MAP,
  type RatingTier,
  type SizeProfile,
  type StoryArc,
} from '../../scripts/shared/mvp-config';
import type { CounterpartyProfile } from './scenario-config';

/* ────────────────── PRNG (deterministic) ────────────────── */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/* ────────────────── Industry Mapping ────────────────── */

/** Industry ID → GSIB-standard classification codes */
const INDUSTRY_GSIB_MAP: Record<number, {
  baselAssetClass: string;
  fr2590Type: string;
  callReportType: string;
  y14Type: string;
  regType: string;
  entityTypeCode: string;
}> = {
  1:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // TMT
  2:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Healthcare
  3:  { baselAssetClass: 'BANK',      fr2590Type: 'FI',   callReportType: 'DEPOSITORY',    y14Type: 'BANK',            regType: 'BANK',      entityTypeCode: 'BANK' },  // Financials
  4:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Energy
  5:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Industrials
  6:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Consumer Staples
  7:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Retail
  8:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Utilities
  9:  { baselAssetClass: 'CORPORATE', fr2590Type: 'C&I',  callReportType: 'C&I_DOMESTIC',  y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE', entityTypeCode: 'CORP' },  // Materials
  10: { baselAssetClass: 'CRE',       fr2590Type: 'CRE',  callReportType: 'CRE_NONFARM',   y14Type: 'CRE',             regType: 'CRE',       entityTypeCode: 'RE' },    // Real Estate / Consumer Disc.
};

/** Country → currency / region / call report suffix */
const COUNTRY_MAP: Record<string, { currency: string; region: string; callSuffix: string; leiPrefix: string }> = {
  US: { currency: 'USD', region: 'AMER', callSuffix: 'DOMESTIC', leiPrefix: '529900' },
  GB: { currency: 'GBP', region: 'EMEA', callSuffix: 'FOREIGN',  leiPrefix: '213800' },
  DE: { currency: 'EUR', region: 'EMEA', callSuffix: 'FOREIGN',  leiPrefix: '391200' },
  FR: { currency: 'EUR', region: 'EMEA', callSuffix: 'FOREIGN',  leiPrefix: '969500' },
  JP: { currency: 'JPY', region: 'APAC', callSuffix: 'FOREIGN',  leiPrefix: '353800' },
  CH: { currency: 'CHF', region: 'EMEA', callSuffix: 'FOREIGN',  leiPrefix: '506700' },
  CA: { currency: 'CAD', region: 'AMER', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  AU: { currency: 'AUD', region: 'APAC', callSuffix: 'FOREIGN',  leiPrefix: '969500' },
  NL: { currency: 'EUR', region: 'EMEA', callSuffix: 'FOREIGN',  leiPrefix: '724500' },
  SG: { currency: 'SGD', region: 'APAC', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  HK: { currency: 'HKD', region: 'APAC', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  KR: { currency: 'KRW', region: 'APAC', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  BR: { currency: 'BRL', region: 'AMER', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  IN: { currency: 'INR', region: 'APAC', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  AE: { currency: 'AED', region: 'EMEA', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
  MX: { currency: 'MXN', region: 'AMER', callSuffix: 'FOREIGN',  leiPrefix: '529900' },
};

/** Commitment amount ranges by size profile */
const COMMITMENT_RANGES: Record<SizeProfile, [number, number]> = {
  LARGE: [500_000_000, 5_000_000_000],
  MID:   [100_000_000, 500_000_000],
  SMALL: [20_000_000,  100_000_000],
};

/* ────────────────── Counterparty Enrichment ────────────────── */

export interface EnrichedCounterparty {
  // From profile
  counterparty_id: number;
  legal_name: string;
  counterparty_type: string;
  country_code: string;
  entity_type_code: string;
  industry_id: number;
  // Auto-enriched GSIB fields
  basel_asset_class: string;
  basel_risk_grade: string;
  call_report_counterparty_type: string;
  external_rating_fitch: string;
  external_rating_moodys: string;
  external_rating_sp: string;
  fr2590_counterparty_type: string;
  internal_risk_rating: string;
  is_affiliated_flag: string;
  is_central_counterparty_flag: string;
  is_financial_institution_flag: string;
  is_insider_flag: string;
  is_multilateral_dev_bank_flag: string;
  is_parent_flag: string;
  is_public_sector_entity_flag: string;
  is_regulated_entity_flag: string;
  is_sovereign_flag: string;
  lei_code: string;
  lgd_unsecured: number;
  pd_annual: number;
  regulatory_counterparty_type: string;
  y14_obligor_type: string;
  effective_start_date: string;
  effective_end_date: null;
  is_current_flag: string;
  record_source?: string;
  created_by?: string;
}

/**
 * Enrich a simple counterparty profile with GSIB-quality regulatory fields.
 * Takes layman's inputs (name, country, industry, rating tier) and outputs
 * a fully populated counterparty row with all Basel III / FR2590 / Y-14Q fields.
 */
export function enrichCounterparty(
  profile: CounterpartyProfile,
  counterpartyId: number,
): EnrichedCounterparty {
  const rng = mulberry32(hashStr(`cp.${counterpartyId}.${profile.legal_name}`));
  const tier = RATING_TIER_MAP[profile.rating_tier];
  const industryMap = INDUSTRY_GSIB_MAP[profile.industry_id] ?? INDUSTRY_GSIB_MAP[1];
  if (!INDUSTRY_GSIB_MAP[profile.industry_id]) {
    console.warn(`GSIB enrichment: unknown industry_id ${profile.industry_id} for ${profile.legal_name}, defaulting to TMT (1)`);
  }
  const countryMap = COUNTRY_MAP[profile.country] ?? COUNTRY_MAP['US'];
  if (!COUNTRY_MAP[profile.country]) {
    console.warn(`GSIB enrichment: unknown country '${profile.country}' for ${profile.legal_name}, defaulting to US`);
  }

  // Determine counterparty type
  const counterpartyType = profile.counterparty_type ??
    (profile.industry_id === 3 ? 'BANK' :
     profile.industry_id === 10 ? 'RE_TRUST' : 'CORPORATE');

  // Override call report type for foreign counterparties
  const callReportType = countryMap.callSuffix === 'FOREIGN' && industryMap.callReportType.startsWith('C&I')
    ? 'C&I_FOREIGN' : industryMap.callReportType;

  // Override Y-14 type for small companies
  const y14Type = profile.size === 'SMALL' ? 'MIDDLE_MARKET' : industryMap.y14Type;

  // Generate LEI code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let lei = countryMap.leiPrefix;
  for (let i = 0; i < 14; i++) {
    lei += chars[Math.floor(rng() * chars.length)];
  }

  return {
    counterparty_id: counterpartyId,
    legal_name: profile.legal_name,
    counterparty_type: counterpartyType,
    country_code: profile.country,
    entity_type_code: profile.entity_type_code ?? industryMap.entityTypeCode,
    industry_id: profile.industry_id,

    // GSIB regulatory fields
    basel_asset_class: profile.basel_asset_class ?? industryMap.baselAssetClass,
    basel_risk_grade: pick(rng, tier.baselGrades),
    call_report_counterparty_type: callReportType,
    external_rating_fitch: pick(rng, tier.fitchRatings),
    external_rating_moodys: profile.external_rating_moodys ?? pick(rng, tier.moodysRatings),
    external_rating_sp: profile.external_rating_sp ?? pick(rng, tier.spRatings),
    fr2590_counterparty_type: industryMap.fr2590Type === 'FI' ? 'FINANCIAL' : 'NON_FINANCIAL',
    internal_risk_rating: profile.internal_risk_rating ?? pick(rng, tier.internalGrades),
    is_affiliated_flag: 'N',
    is_central_counterparty_flag: 'N',
    is_financial_institution_flag: ['BANK', 'FI', 'INS', 'FUND'].includes(industryMap.entityTypeCode) ? 'Y' : 'N',
    is_insider_flag: 'N',
    is_multilateral_dev_bank_flag: 'N',
    is_parent_flag: rng() > 0.6 ? 'Y' : 'N',
    is_public_sector_entity_flag: 'N',
    is_regulated_entity_flag: ['BANK', 'FI', 'INS'].includes(industryMap.entityTypeCode) ? 'Y' : 'N',
    is_sovereign_flag: 'N',
    lei_code: lei,
    lgd_unsecured: profile.lgd_unsecured ?? tier.lgd,
    pd_annual: profile.pd_annual ?? Math.round((tier.pdLow + rng() * (tier.pdHigh - tier.pdLow)) * 10000) / 10000,
    regulatory_counterparty_type: industryMap.regType,
    y14_obligor_type: y14Type,
    effective_start_date: '2020-01-01',
    effective_end_date: null,
    is_current_flag: 'Y',
    record_source: 'DATA_FACTORY_V2',
    created_by: 'data-factory-v2',
  };
}

/* ────────────────── Facility Enrichment ────────────────── */

/** Facility type pools for different pool sizes (reused from mvp-agreements-facilities.ts) */
const FACILITY_TYPE_POOLS = {
  single: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', fraction: 1.0, isRevolving: true },
  ],
  dual: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', fraction: 0.40, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', fraction: 0.60, isRevolving: false },
  ],
  triple: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', fraction: 0.30, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', fraction: 0.45, isRevolving: false },
    { facilityType: 'LETTER_OF_CREDIT', tranche: 'C', fraction: 0.25, isRevolving: false },
  ],
  quad: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', fraction: 0.25, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', fraction: 0.35, isRevolving: false },
    { facilityType: 'TERM_LOAN_B', tranche: 'C', fraction: 0.25, isRevolving: false },
    { facilityType: 'LETTER_OF_CREDIT', tranche: 'D', fraction: 0.15, isRevolving: false },
  ],
};

/** Facility type display labels */
const TYPE_LABELS: Record<string, string> = {
  REVOLVING_CREDIT: 'Revolver',
  TERM_LOAN: 'Term Loan',
  TERM_LOAN_B: 'TL-B',
  BRIDGE_LOAN: 'Bridge',
  LETTER_OF_CREDIT: 'L/C',
};

export interface EnrichedFacility {
  facility_id: number;
  credit_agreement_id: number;
  counterparty_id: number;
  facility_name: string;
  facility_type: string;
  facility_status: string;
  committed_facility_amt: number;
  currency_code: string;
  origination_date: string;
  maturity_date: string;
  portfolio_id: number;
  industry_code: string;
  lob_segment_id: number;
  product_node_id: number;
  rate_index_id: number;
  ledger_account_id: number;
  product_id: number;
  region_code: string;
  interest_rate_type: string;
  interest_rate_reference: string;
  interest_rate_spread_bps: number;
  all_in_rate_pct: number;
  day_count_convention: string;
  amortization_type: string;
  is_revolving_flag: string;
  is_active_flag: string;
  facility_reference: string;
  payment_frequency: string;
  effective_start_date: string;
  effective_end_date: null;
  is_current_flag: string;
  record_source?: string;
  created_by?: string;
}

/**
 * Generate enriched facility entries for a counterparty.
 * Automatically selects facility pool based on size, assigns realistic financial parameters.
 */
export function enrichFacilities(
  counterparty: EnrichedCounterparty,
  agreementId: number,
  facilityIds: number[],
  sizeProfile: SizeProfile,
  ratingTier: RatingTier,
): EnrichedFacility[] {
  const rng = mulberry32(hashStr(`fac.${counterparty.counterparty_id}.${agreementId}`));
  const tier = RATING_TIER_MAP[ratingTier];
  const countryMap = COUNTRY_MAP[counterparty.country_code] ?? COUNTRY_MAP['US'];
  const count = facilityIds.length;

  // Select pool based on count
  const pool = count === 1 ? FACILITY_TYPE_POOLS.single
    : count === 2 ? FACILITY_TYPE_POOLS.dual
    : count === 3 ? FACILITY_TYPE_POOLS.triple
    : FACILITY_TYPE_POOLS.quad;

  // Total commitment based on size
  const [commitMin, commitMax] = COMMITMENT_RANGES[sizeProfile];
  const totalCommit = Math.round(commitMin + rng() * (commitMax - commitMin));

  // Origination date spread
  const originYear = 2020 + Math.floor(rng() * 5);
  const originMonth = Math.floor(rng() * 12) + 1;
  const originDay = Math.floor(rng() * 28) + 1;
  const originDate = `${originYear}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`;
  const tenorYears = 4 + Math.floor(rng() * 3);
  const maturityDate = `${originYear + tenorYears}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`;

  // Base spread from rating
  const baseSpreadBps = Math.round(80 + tier.pdHigh * 10000 * 3 + rng() * 50);

  // Rate references by currency
  const rateRefs: Record<string, string> = {
    USD: 'SOFR', EUR: 'EURIBOR', GBP: 'SONIA', JPY: 'TIBOR',
    CHF: 'SARON', CAD: 'CORRA', AUD: 'BBSW', SGD: 'SOR',
  };
  const rateRef = rateRefs[countryMap.currency] ?? 'SOFR';

  // Short name from company name (first word)
  const shortName = counterparty.legal_name.split(/\s+/)[0];

  return facilityIds.map((facId, i) => {
    const slot = pool[i % pool.length];
    const facilityCommit = Math.round(totalCommit * slot.fraction);
    const typeLabel = TYPE_LABELS[slot.facilityType] ?? slot.facilityType;

    // Industry code mapping for facility_master
    const industryCodes: Record<number, string> = {
      1: 'FIN', 2: 'TMT', 3: 'HC', 4: 'ENR', 5: 'IND',
      6: 'CS', 7: 'RET', 8: 'UTL', 9: 'MAT', 10: 'RE',
    };

    return {
      facility_id: facId,
      credit_agreement_id: agreementId,
      counterparty_id: counterparty.counterparty_id,
      facility_name: `${shortName} — ${countryMap.currency} ${typeLabel} ${originYear + tenorYears}-${slot.tranche}`,
      facility_type: slot.facilityType,
      facility_status: 'ACTIVE',
      committed_facility_amt: facilityCommit,
      currency_code: countryMap.currency,
      origination_date: originDate,
      maturity_date: maturityDate,
      portfolio_id: ratingTier.startsWith('IG') ? pick(rng, [810001, 810003, 810005, 810006]) : pick(rng, [810002, 810009, 810010]),
      industry_code: industryCodes[counterparty.industry_id] ?? 'IND',
      lob_segment_id: pick(rng, [400001, 400002, 400003, 400004, 400005, 400006, 400007, 400008, 400009, 400010]),
      product_node_id: pick(rng, [410001, 410002, 410003, 410004, 410005, 410006, 410007, 410008, 410009, 410010]),
      rate_index_id: pick(rng, [500001, 500002, 500003, 500004, 500005]),
      ledger_account_id: pick(rng, [510001, 510002, 510003, 510004, 510005, 510006, 510007, 510008]),
      product_id: pick(rng, [1, 2, 3, 4, 5]),
      region_code: countryMap.region,
      interest_rate_type: slot.isRevolving || rng() < 0.6 ? 'FLOATING' : 'FIXED',
      interest_rate_reference: rateRef,
      interest_rate_spread_bps: baseSpreadBps,
      all_in_rate_pct: Math.round((baseSpreadBps / 100 + 2.5 + rng() * 1.5) * 100) / 100,
      day_count_convention: rng() < 0.6 ? 'ACT/360' : 'ACT/365',
      amortization_type: slot.isRevolving ? 'BULLET' : pick(rng, ['AMORTIZING', 'BULLET']),
      is_revolving_flag: slot.isRevolving ? 'Y' : 'N',
      is_active_flag: 'Y',
      facility_reference: `FAC-${originYear}-${String(facId).padStart(5, '0')}-${slot.tranche}`,
      payment_frequency: pick(rng, ['QUARTERLY', 'MONTHLY', 'QUARTERLY']),
      effective_start_date: '2024-01-01',
      effective_end_date: null,
      is_current_flag: 'Y',
      record_source: 'DATA_FACTORY_V2',
      created_by: 'data-factory-v2',
    };
  });
}

/* ────────────────── Agreement Enrichment ────────────────── */

export interface EnrichedAgreement {
  credit_agreement_id: number;
  borrower_counterparty_id: number;
  lender_legal_entity_id: number;
  agreement_type: string;
  status_code: string;
  agreement_reference: string;
  currency_code: string;
  origination_date: string;
  maturity_date: string;
  effective_start_date: string;
  effective_end_date: null;
  is_current_flag: string;
  record_source?: string;
  created_by?: string;
}

export function enrichAgreement(
  agreementId: number,
  counterparty: EnrichedCounterparty,
  sizeProfile: SizeProfile,
): EnrichedAgreement {
  const rng = mulberry32(hashStr(`agr.${agreementId}.${counterparty.counterparty_id}`));
  const countryMap = COUNTRY_MAP[counterparty.country_code] ?? COUNTRY_MAP['US'];

  const originYear = 2020 + Math.floor(rng() * 5);
  const originMonth = Math.floor(rng() * 12) + 1;
  const originDay = Math.floor(rng() * 28) + 1;
  const tenorYears = 4 + Math.floor(rng() * 3);

  return {
    credit_agreement_id: agreementId,
    borrower_counterparty_id: counterparty.counterparty_id,
    lender_legal_entity_id: pick(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    agreement_type: sizeProfile === 'SMALL' ? (rng() < 0.4 ? 'BILATERAL' : 'SYNDICATED') : 'SYNDICATED',
    status_code: 'ACTIVE',
    agreement_reference: `CA-${originYear}-${String(agreementId).padStart(5, '0')}-${countryMap.currency}`,
    currency_code: countryMap.currency,
    origination_date: `${originYear}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`,
    maturity_date: `${originYear + tenorYears}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`,
    effective_start_date: '2024-01-01',
    effective_end_date: null,
    is_current_flag: 'Y',
    record_source: 'DATA_FACTORY_V2',
    created_by: 'data-factory-v2',
  };
}

/* ────────────────── Lender Allocation ────────────────── */

export interface EnrichedAllocation {
  lender_allocation_id: number;
  facility_id: number;
  legal_entity_id: number;
  allocation_role: string;
  bank_share_pct: number;
  is_current_flag: string;
  effective_start_date: string;
  effective_end_date: null;
  record_source?: string;
  created_by?: string;
}

/**
 * Build a lender allocation row for a facility.
 * @param facility  The enriched facility
 * @param allocationId  Pre-allocated ID from IDRegistry
 */
export function enrichLenderAllocation(facility: EnrichedFacility, allocationId: number): EnrichedAllocation {
  return {
    lender_allocation_id: allocationId,
    facility_id: facility.facility_id,
    legal_entity_id: facility.ledger_account_id <= 5 ? facility.ledger_account_id : 1,
    allocation_role: 'LEAD_ARRANGER',
    bank_share_pct: 1.0,
    is_current_flag: 'Y',
    effective_start_date: facility.origination_date,
    effective_end_date: null,
    record_source: 'DATA_FACTORY_V2',
    created_by: 'data-factory-v2',
  };
}
