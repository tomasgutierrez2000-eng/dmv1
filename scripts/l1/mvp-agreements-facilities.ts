/**
 * MVP agreement → facility mapping for 100 agreements and 400 facilities.
 *
 * Produces deterministic, referentially consistent data:
 *   - Each agreement belongs to exactly one counterparty (1:1 for rows 0-99)
 *   - Each agreement has 1-8 facilities depending on agreement type
 *   - Facility types, amounts, and pricing are driven by counterparty profile
 *
 * Rows 0-9 are NOT handled here — they use existing handcrafted arrays.
 */

import {
  getCounterpartyStoryArc,
  getCounterpartySizeProfile,
  getCounterpartyRatingTier,
  getCounterpartyCountry,
} from './mvp-counterparties';
import { RATING_TIER_MAP } from '../shared/mvp-config';
import type { SizeProfile } from '../shared/mvp-config';

/* ────────────────────────── PRNG helpers ────────────────────────── */

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

function seededPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function seededInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

/* ────────────────────── agreement type distribution ────────────── */

/**
 * Determine the agreement type for agreements 10-99.
 * Distribution: 20% bilateral, 80% syndicated
 */
function getAgreementTypeForIndex(agreementIndex: number): 'BILATERAL' | 'SYNDICATED' {
  const rng = mulberry32(hashStr(`agrtype.${agreementIndex}`));
  return rng() < 0.2 ? 'BILATERAL' : 'SYNDICATED';
}

/* ────────────────────── facility-per-agreement mapping ────────── */

interface FacilitySlot {
  agreementIndex: number;     // 0-based agreement index (== counterparty index)
  facilityType: string;
  tranche: string;            // 'A', 'B', 'C', etc.
  commitmentFraction: number; // fraction of total agreement commitment
  isRevolving: boolean;
}

const FACILITY_TYPE_POOLS = {
  single: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', commitmentFraction: 1.0, isRevolving: true },
  ],
  dual: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', commitmentFraction: 0.40, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', commitmentFraction: 0.60, isRevolving: false },
  ],
  triple: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', commitmentFraction: 0.30, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', commitmentFraction: 0.45, isRevolving: false },
    { facilityType: 'LETTER_OF_CREDIT', tranche: 'C', commitmentFraction: 0.25, isRevolving: false },
  ],
  quad: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', commitmentFraction: 0.25, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', commitmentFraction: 0.35, isRevolving: false },
    { facilityType: 'TERM_LOAN_B', tranche: 'C', commitmentFraction: 0.25, isRevolving: false },
    { facilityType: 'LETTER_OF_CREDIT', tranche: 'D', commitmentFraction: 0.15, isRevolving: false },
  ],
  five: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', commitmentFraction: 0.20, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', commitmentFraction: 0.30, isRevolving: false },
    { facilityType: 'TERM_LOAN_B', tranche: 'C', commitmentFraction: 0.20, isRevolving: false },
    { facilityType: 'BRIDGE_LOAN', tranche: 'D', commitmentFraction: 0.15, isRevolving: false },
    { facilityType: 'LETTER_OF_CREDIT', tranche: 'E', commitmentFraction: 0.15, isRevolving: false },
  ],
  six: [
    { facilityType: 'REVOLVING_CREDIT', tranche: 'A', commitmentFraction: 0.18, isRevolving: true },
    { facilityType: 'TERM_LOAN', tranche: 'B', commitmentFraction: 0.22, isRevolving: false },
    { facilityType: 'TERM_LOAN_B', tranche: 'C', commitmentFraction: 0.18, isRevolving: false },
    { facilityType: 'BRIDGE_LOAN', tranche: 'D', commitmentFraction: 0.12, isRevolving: false },
    { facilityType: 'LETTER_OF_CREDIT', tranche: 'E', commitmentFraction: 0.15, isRevolving: false },
    { facilityType: 'REVOLVING_CREDIT', tranche: 'F', commitmentFraction: 0.15, isRevolving: true },
  ],
};

/** Total commitment by size profile (in USD) */
const COMMITMENT_RANGES: Record<SizeProfile, [number, number]> = {
  LARGE: [500_000_000, 5_000_000_000],
  MID:   [100_000_000, 500_000_000],
  SMALL: [20_000_000, 100_000_000],
};

/** Currency by country */
const COUNTRY_CURRENCIES: Record<string, string> = {
  US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', JP: 'JPY',
  CH: 'CHF', CA: 'CAD', AU: 'AUD', NL: 'EUR', SG: 'SGD',
};

/** Region by country */
const COUNTRY_REGIONS: Record<string, string> = {
  US: 'AMER', GB: 'EMEA', DE: 'EMEA', FR: 'EMEA', JP: 'APAC',
  CH: 'EMEA', CA: 'AMER', AU: 'APAC', NL: 'EMEA', SG: 'APAC',
};

/* ────────────────── build the facility map (memoized) ──────────── */

interface FacilityEntry {
  facilityId: number;         // 1-based
  agreementIndex: number;     // 0-based (== counterparty_id - 1)
  counterpartyId: number;     // 1-based
  agreementId: number;        // 1-based
  facilityType: string;
  tranche: string;
  commitmentFraction: number;
  isRevolving: boolean;
}

let _facilityMap: FacilityEntry[] | null = null;

function buildFacilityMap(): FacilityEntry[] {
  if (_facilityMap) return _facilityMap;

  const map: FacilityEntry[] = [];

  // Rows 0-9: 1:1 facility per agreement (matches existing handcrafted data)
  for (let i = 0; i < 10; i++) {
    map.push({
      facilityId: i + 1,
      agreementIndex: i,
      counterpartyId: i + 1,
      agreementId: i + 1,
      facilityType: '', // not used — rows 0-9 use existing seed data
      tranche: 'A',
      commitmentFraction: 1.0,
      isRevolving: false,
    });
  }

  // Rows 10-99: distribute facilities across agreements to reach ~400 total
  // Target: 400 - 10 = 390 facilities across 90 agreements = avg 4.33 per agreement
  let facilityId = 11;

  for (let agrIdx = 10; agrIdx < 100; agrIdx++) {
    const agrType = getAgreementTypeForIndex(agrIdx);
    const sizeProfile = getCounterpartySizeProfile(agrIdx);
    const rng = mulberry32(hashStr(`faccount.${agrIdx}`));

    let poolKey: keyof typeof FACILITY_TYPE_POOLS;

    if (agrType === 'BILATERAL') {
      // Bilateral: 1-2 facilities
      poolKey = rng() < 0.6 ? 'single' : 'dual';
    } else if (sizeProfile === 'SMALL') {
      // Small syndicated: 3-5 facilities
      const r = rng();
      poolKey = r < 0.3 ? 'triple' : r < 0.6 ? 'quad' : 'five';
    } else if (sizeProfile === 'MID') {
      // Mid syndicated: 4-6 facilities
      const r = rng();
      poolKey = r < 0.25 ? 'quad' : r < 0.55 ? 'five' : 'six';
    } else {
      // Large syndicated: 5-6 facilities
      poolKey = rng() < 0.4 ? 'five' : 'six';
    }

    const pool = FACILITY_TYPE_POOLS[poolKey];
    for (const slot of pool) {
      map.push({
        facilityId,
        agreementIndex: agrIdx,
        counterpartyId: agrIdx + 1,
        agreementId: agrIdx + 1,
        facilityType: slot.facilityType,
        tranche: slot.tranche,
        commitmentFraction: slot.commitmentFraction,
        isRevolving: slot.isRevolving,
      });
      facilityId++;
    }
  }

  _facilityMap = map;
  return map;
}

/* ────────────────── public API for agreement fields ────────────── */

/**
 * Get a credit_agreement_master field value for rows 10-99.
 * Returns null if the column is not handled (fallback to generate.ts PRNG).
 */
export function getMvpAgreementField(
  rowIndex: number,
  columnName: string,
): string | number | null {
  if (rowIndex < 10) return null; // Tier 1 handles rows 0-9

  const agrIdx = rowIndex;
  const agrType = getAgreementTypeForIndex(agrIdx);
  const country = getCounterpartyCountry(agrIdx);
  const currency = COUNTRY_CURRENCIES[country] ?? 'USD';
  const rng = mulberry32(hashStr(`agr.${columnName}.${rowIndex}`));

  // Origination dates spread across 2020-2024
  const originYear = 2020 + (rowIndex % 5);
  const originMonth = ((rowIndex * 3) % 12) + 1;
  const originDay = ((rowIndex * 7) % 28) + 1;
  const originDate = `${originYear}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`;
  // Maturity 4-6 years after origination
  const tenorYears = 4 + (rowIndex % 3);
  const maturityDate = `${originYear + tenorYears}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`;

  switch (columnName) {
    case 'agreement_type': return agrType;
    case 'status_code': return rng() < 0.92 ? 'ACTIVE' : 'PENDING';
    case 'agreement_reference': return `CA-${originYear}-${String(rowIndex + 1).padStart(3, '0')}-${currency}`;
    case 'currency_code': return currency;
    case 'origination_date': return originDate;
    case 'maturity_date': return maturityDate;
    default: return null;
  }
}

/* ────────────────── public API for facility fields ──────────────── */

/**
 * Get a facility_master field value for rows 10-399.
 * Returns null if the column is not handled (fallback to generate.ts PRNG).
 */
export function getMvpFacilityField(
  rowIndex: number,
  columnName: string,
): string | number | null {
  if (rowIndex < 10) return null; // Tier 1 handles rows 0-9

  const map = buildFacilityMap();
  if (rowIndex >= map.length) return null;

  const entry = map[rowIndex];
  const agrIdx = entry.agreementIndex;
  const country = getCounterpartyCountry(agrIdx);
  const currency = COUNTRY_CURRENCIES[country] ?? 'USD';
  const region = COUNTRY_REGIONS[country] ?? 'AMER';
  const sizeProfile = getCounterpartySizeProfile(agrIdx);
  const ratingTier = getCounterpartyRatingTier(agrIdx);
  const tier = RATING_TIER_MAP[ratingTier];
  const rng = mulberry32(hashStr(`fac.${columnName}.${rowIndex}`));

  // Committed amount: total agreement amount × this facility's fraction
  const [commitMin, commitMax] = COMMITMENT_RANGES[sizeProfile];
  const totalCommit = Math.round(commitMin + (commitMax - commitMin) * mulberry32(hashStr(`commit.${agrIdx}`))());
  const facilityCommit = Math.round(totalCommit * entry.commitmentFraction);

  // Origination/maturity from agreement
  const originYear = 2020 + (agrIdx % 5);
  const originMonth = ((agrIdx * 3) % 12) + 1;
  const originDay = ((agrIdx * 7) % 28) + 1;
  const originDate = `${originYear}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`;
  const tenorYears = 4 + (agrIdx % 3);
  const maturityYear = originYear + tenorYears;
  const maturityDate = `${maturityYear}-${String(originMonth).padStart(2, '0')}-${String(originDay).padStart(2, '0')}`;

  // Base spread depends on rating tier
  const baseSpreadBps = Math.round(80 + (tier.pdHigh * 10000) * 3 + rng() * 50);

  // Short name for facility naming (first word of counterparty)
  const shortNames = [
    '', '', '', '', '', '', '', '', '', '', // 0-9 not used
    'Apex', 'Quantum', 'Cobalt', 'Stratos', 'Orion', 'Vertex', 'Helix', 'Cypher', 'Nexus', 'Polaris',
    'Cascade AI', 'Titan', 'Vanguard', 'Evergreen', 'Meridian Med', 'Solaris', 'Harborview', 'Alpine Pharma',
    'Nova Clin', 'Clearpath', 'BioHaven', 'Zenith', 'Cascade Ene', 'Ridgeline', 'Aurora Ren', 'Boreal',
    'Sunstone', 'Continental Pipe', 'Tasman', 'Nordic Wind', 'Shale Basin', 'Emerald H2',
    'Continental Bank', 'Pacific Rim Bank', 'Heritage Mutual', 'Summit Capital', 'Clearwater Savings',
    'Northern Trust Re', 'Maple Leaf Fin', 'Regent Asset',
    'Falcon', 'Precision Mach', 'Pinnacle Aero', 'Stonebridge', 'Pacific Marine',
    'Ironworks', 'Global Logistics', 'Summit Defense', 'Keystone', 'Dragonfly',
    'Harvestfield', 'Brightstar', 'Luxe Brands', 'Beacon Retail', 'Crossroads',
    'Verdant', 'Summit Apparel', 'Pacific Grocery', 'Horizon Home', 'Golden Leaf',
    'Metro Office', 'Bayshore', 'Gateway Ind', 'Cornerstone Ret', 'Sapphire Tower',
    'Canary Wharf', 'Sunbelt Log', 'Grandview', 'Harbor Point', 'Redwood DC',
    'Transcon Rail', 'Blue Horizon', 'Portside', 'Alpine Tunnel', 'Midwest Freight',
    'Delta Bridge', 'Skyport', 'Great Plains',
    'Granite Peak', 'Catalyst Chem', 'Orinoco', 'Nordic P&P', 'Prairie Phos',
    'Silica Adv', 'Ridgemont',
    'Great Lakes PL', 'Southern Grid', 'Pacific Water', 'Thames Valley', 'Mountain State',
  ];
  const shortName = agrIdx < shortNames.length ? shortNames[agrIdx] : `Cpty${agrIdx}`;

  const facilityTypeLabel: Record<string, string> = {
    REVOLVING_CREDIT: 'Revolver',
    TERM_LOAN: 'Term Loan',
    TERM_LOAN_B: 'TL-B',
    BRIDGE_LOAN: 'Bridge',
    LETTER_OF_CREDIT: 'L/C',
  };
  const typeLabel = facilityTypeLabel[entry.facilityType] ?? entry.facilityType;

  // LOB segment: distribute across the 249 EBT nodes deterministically
  const lobSegmentId = (rowIndex % 249) + 1;
  // Product node: distribute across 10 product nodes
  const productNodeId = (rowIndex % 10) + 1;
  // Rate index: distribute across 10 rate indices
  const rateIndexId = (rowIndex % 10) + 1;
  // Ledger account: distribute across 10 ledger accounts
  const ledgerAccountId = (rowIndex % 10) + 1;

  switch (columnName) {
    case 'credit_agreement_id': return entry.agreementId;
    case 'counterparty_id': return entry.counterpartyId;
    case 'currency_code': return currency;
    case 'facility_name':
      return `${shortName} — ${currency} ${typeLabel} ${maturityYear}-${entry.tranche}`;
    case 'facility_type': return entry.facilityType;
    case 'facility_status': return rng() < 0.90 ? 'ACTIVE' : (rng() < 0.5 ? 'PENDING' : 'MATURED');
    case 'committed_facility_amt': return facilityCommit;
    case 'origination_date': return originDate;
    case 'maturity_date': return maturityDate;
    case 'portfolio_id': {
      // Map rating tier to portfolio: IG → IG-CORP(1), HY → LEV-FIN(2)
      if (ratingTier.startsWith('IG')) return seededPick(rng, [1, 3, 5, 6, 7, 8]);
      return seededPick(rng, [2, 9, 10]);
    }
    case 'industry_code': {
      const industryCodes = ['51', '62', '52', '21', '31', '44', '45', '22', '32', '71'];
      const storyArc = getCounterpartyStoryArc(agrIdx);
      // Use consistent industry based on counterparty
      const cpRng = mulberry32(hashStr(`cpind.${agrIdx}`));
      return seededPick(cpRng, industryCodes);
    }
    case 'lob_segment_id': return lobSegmentId;
    case 'product_node_id': return productNodeId;
    case 'rate_index_id': return rateIndexId;
    case 'ledger_account_id': return ledgerAccountId;
    case 'all_in_rate_pct':
      return Math.round((baseSpreadBps / 100 + 2.5 + rng() * 1.5) * 100) / 100;
    case 'amortization_type':
      return entry.isRevolving ? 'BULLET' : seededPick(rng, ['AMORTIZING', 'BULLET']);
    case 'created_by': return 'SYSTEM';
    case 'day_count_convention': return rng() < 0.6 ? 'ACT/360' : 'ACT/365';
    case 'facility_reference':
      return `FAC-${originYear}-${String(rowIndex + 1).padStart(3, '0')}-${entry.tranche}`;
    case 'interest_rate_spread_bps': return baseSpreadBps;
    case 'interest_rate_reference': {
      const refs = ['SOFR', 'SOFR', 'EURIBOR', 'SONIA', 'SOFR', 'PRIME', 'CDOR', 'BBSW', 'HIBOR', 'SOR'];
      return refs[rowIndex % refs.length];
    }
    case 'interest_rate_type':
      return entry.isRevolving || rng() < 0.6 ? 'FLOATING' : 'FIXED';
    case 'next_repricing_date':
      return entry.isRevolving || rng() < 0.6 ? '2025-04-30' : '9999-12-31';
    case 'payment_frequency':
      return seededPick(rng, ['QUARTERLY', 'MONTHLY', 'QUARTERLY']);
    case 'prepayment_penalty_flag': return rng() < 0.3 ? 'Y' : 'N';
    case 'product_id': return productNodeId;
    case 'rate_cap_pct': return Math.round((7 + rng() * 3) * 100) / 100;
    case 'rate_floor_pct': return Math.round((0.5 + rng() * 1.5) * 100) / 100;
    case 'region_code': return region;
    case 'revolving_flag': return entry.isRevolving ? 'Y' : 'N';
    default: return null;
  }
}

/* ────────────────── lookup helpers for L2 ──────────────────────── */

/** Get the counterparty ID (1-based) for a given facility ID (1-based). */
export function getFacilityCounterpartyId(facilityId: number): number {
  const map = buildFacilityMap();
  const idx = facilityId - 1;
  if (idx >= 0 && idx < map.length) return map[idx].counterpartyId;
  return 1;
}

/** Get the agreement ID (1-based) for a given facility ID (1-based). */
export function getFacilityAgreementId(facilityId: number): number {
  const map = buildFacilityMap();
  const idx = facilityId - 1;
  if (idx >= 0 && idx < map.length) return map[idx].agreementId;
  return 1;
}

/** Get the committed amount for a facility by its 1-based ID. */
export function getFacilityCommittedAmount(facilityId: number): number {
  const map = buildFacilityMap();
  const idx = facilityId - 1;
  if (idx < 0 || idx >= map.length) return 250_000_000;

  const entry = map[idx];
  if (idx < 10) {
    // Tier 1: use hardcoded amounts
    const tier1Amounts = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000];
    return tier1Amounts[idx];
  }

  const agrIdx = entry.agreementIndex;
  const sizeProfile = getCounterpartySizeProfile(agrIdx);
  const [commitMin, commitMax] = COMMITMENT_RANGES[sizeProfile];
  const totalCommit = Math.round(commitMin + (commitMax - commitMin) * mulberry32(hashStr(`commit.${agrIdx}`))());
  return Math.round(totalCommit * entry.commitmentFraction);
}

/** Get the total number of facilities in the MVP map. */
export function getMvpFacilityCount(): number {
  return buildFacilityMap().length;
}

/** Get whether the facility is revolving by its 1-based ID. */
export function getFacilityIsRevolving(facilityId: number): boolean {
  const map = buildFacilityMap();
  const idx = facilityId - 1;
  if (idx >= 0 && idx < map.length) return map[idx].isRevolving;
  return false;
}
