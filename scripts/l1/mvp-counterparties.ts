/**
 * MVP counterparty universe: 100 real-world-inspired counterparties.
 *
 * Covers rows 10-99 (rows 0-9 are the existing handcrafted Tier 1 data).
 * Each counterparty has a story arc, rating tier, and sector assignment
 * that drives coherent behavior across L1 master data and L2 time-series.
 *
 * Industry IDs reference l1.industry_dim rows 1-10:
 *   1=TMT, 2=HC, 3=FIN, 4=ENE, 5=IND, 6=CON, 7=RET, 8=UTL, 9=MAT, 10=CD
 */

import type { StoryArc, RatingTier, SizeProfile } from '../shared/mvp-config';
import { RATING_TIER_MAP } from '../shared/mvp-config';

/* ────────────────────────── mulberry32 PRNG ────────────────────────── */

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

function seededRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/* ────────────────────────── counterparty definition ────────────────── */

interface CounterpartyDef {
  legalName: string;
  counterpartyType: string;
  entityTypeCode: string;
  industryId: number;
  country: string;
  baselAssetClass: string;
  ratingTier: RatingTier;
  storyArc: StoryArc;
  sizeProfile: SizeProfile;
  fr2590Type: string;
  callReportType: string;
  y14Type: string;
  regType: string;
}

/* ──────────────────── the 90 MVP counterparties (rows 10-99) ──────── */

const MVP_COUNTERPARTIES: CounterpartyDef[] = [
  // ─── TMT (12 names, indices 10-21) ───
  { legalName: 'Apex Cloud Technologies Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Quantum Signal Communications Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Cobalt Semiconductor Holdings Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Stratos Media Entertainment Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'DETERIORATING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Orion Data Systems GmbH', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'DE', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Vertex Telecom Networks SA', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'FR', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Helix Software Solutions Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Cypher Networking Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'RECOVERING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Nexus Digital Platforms Pte. Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'SG', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'NEW_RELATIONSHIP', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Polaris Broadband Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Cascade AI Ventures Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'GROWING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Titan Cybersecurity Group Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 1, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },

  // ─── Healthcare / Life Sciences (10 names, indices 22-31) ───
  { legalName: 'Vanguard Biosciences Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Evergreen Therapeutics Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Meridian Medical Devices AG', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'CH', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Solaris Genomics Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'RECOVERING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Harborview Hospital Group LLC', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Alpine Pharma Distribution Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'CH', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Nova Clinical Research Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Clearpath Diagnostics Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'BioHaven Labs Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'NEW_RELATIONSHIP', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Zenith Health Systems KK', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 2, country: 'JP', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },

  // ─── Energy (10 names, indices 32-41) ───
  { legalName: 'Cascade Energy Partners LP', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STRESSED_SECTOR', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Ridgeline Petroleum Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'DETERIORATING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Aurora Renewable Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Boreal LNG Shipping Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Sunstone Solar Power Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Continental Pipeline Holdings LLC', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Tasman Offshore Resources Pty Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'AU', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'STRESSED_SECTOR', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Nordic Wind Energy AS', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'NL', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Shale Basin Resources Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_LOW', storyArc: 'DETERIORATING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Emerald Hydrogen Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 4, country: 'CA', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'NEW_RELATIONSHIP', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },

  // ─── Financials / Banks / Insurance (8 names, indices 42-49) ───
  { legalName: 'Continental Commercial Bank AG', counterpartyType: 'BANK', entityTypeCode: 'BANK', industryId: 3, country: 'DE', baselAssetClass: 'BANK', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'BANK' },
  { legalName: 'Pacific Rim Banking Corporation', counterpartyType: 'BANK', entityTypeCode: 'BANK', industryId: 3, country: 'JP', baselAssetClass: 'BANK', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'BANK' },
  { legalName: 'Heritage Mutual Insurance Co.', counterpartyType: 'CORPORATE', entityTypeCode: 'INS', industryId: 3, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'INSURANCE' },
  { legalName: 'Summit Capital Markets LLC', counterpartyType: 'CORPORATE', entityTypeCode: 'FI', industryId: 3, country: 'US', baselAssetClass: 'BANK', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'BANK' },
  { legalName: 'Clearwater Savings Bank', counterpartyType: 'BANK', entityTypeCode: 'BANK', industryId: 3, country: 'US', baselAssetClass: 'BANK', ratingTier: 'IG_LOW', storyArc: 'STRESSED_SECTOR', sizeProfile: 'SMALL', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'BANK' },
  { legalName: 'Northern Trust Reinsurance Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'INS', industryId: 3, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'INSURANCE' },
  { legalName: 'Maple Leaf Financial Group Inc.', counterpartyType: 'BANK', entityTypeCode: 'FI', industryId: 3, country: 'CA', baselAssetClass: 'BANK', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'BANK' },
  { legalName: 'Regent Asset Management Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'FI', industryId: 3, country: 'US', baselAssetClass: 'BANK', ratingTier: 'IG_LOW', storyArc: 'RECOVERING', sizeProfile: 'SMALL', fr2590Type: 'FI', callReportType: 'DEPOSITORY', y14Type: 'BANK', regType: 'BANK' },

  // ─── Industrials / Manufacturing (10 names, indices 50-59) ───
  { legalName: 'Falcon Heavy Industries Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Precision Machining Holdings GmbH', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'DE', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Pinnacle Aerospace Components Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'GROWING', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Stonebridge Construction LLC', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'RECOVERING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Pacific Marine Services Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'AU', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Ironworks Steel Manufacturing Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'DETERIORATING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Global Logistics Partners SA', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'FR', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Summit Defense Systems Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Keystone Industrial Equipment Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Dragonfly Automation KK', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'JP', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },

  // ─── Consumer Staples + Discretionary + Retail (10 names, indices 60-69) ───
  { legalName: 'Harvestfield Foods Corporation', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 6, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Brightstar Beverage Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 6, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Luxe Brands International SA', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 10, country: 'FR', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'GROWING', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Beacon Retail Group Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 7, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'STRESSED_SECTOR', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Crossroads Department Stores LLC', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 7, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'DETERIORATING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Verdant Organic Products Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 6, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Summit Apparel & Sportswear Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 10, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Pacific Coast Grocery Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 6, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Horizon Home Furnishings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 10, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'STRESSED_SECTOR', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Golden Leaf Agriculture Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 6, country: 'CA', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },

  // ─── Real Estate (10 names, indices 70-79) ───
  { legalName: 'Metropolitan Office Properties REIT', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'IG_LOW', storyArc: 'STRESSED_SECTOR', sizeProfile: 'LARGE', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Bayshore Multifamily Holdings LP', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Gateway Industrial REIT Inc.', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Cornerstone Retail Centers LLC', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'HY_HIGH', storyArc: 'STRESSED_SECTOR', sizeProfile: 'MID', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Sapphire Tower Development Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'HY_MID', storyArc: 'DETERIORATING', sizeProfile: 'SMALL', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Canary Wharf Properties Ltd.', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'GB', baselAssetClass: 'CRE', ratingTier: 'IG_LOW', storyArc: 'STRESSED_SECTOR', sizeProfile: 'LARGE', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Sunbelt Logistics Warehouse REIT', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Grandview Senior Living REIT', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Harbor Point Mixed-Use LP', counterpartyType: 'CORPORATE', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'HY_HIGH', storyArc: 'RECOVERING', sizeProfile: 'SMALL', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },
  { legalName: 'Redwood Data Center Properties Inc.', counterpartyType: 'RE_TRUST', entityTypeCode: 'RE', industryId: 10, country: 'US', baselAssetClass: 'CRE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'CRE', callReportType: 'CRE_NONFARM', y14Type: 'CRE', regType: 'CRE' },

  // ─── Infrastructure / Transportation (8 names, indices 80-87) ───
  { legalName: 'Transcontinental Rail Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Blue Horizon Aviation Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'RECOVERING', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Portside Maritime Logistics Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'SG', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Alpine Tunnel Infrastructure AG', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'CH', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Midwest Freight Services Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Delta Bridge Concessions LP', counterpartyType: 'CORPORATE', entityTypeCode: 'SPE', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Skyport Airport Holdings Pte. Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'SG', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'GROWING', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Great Plains Trucking Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 5, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'STEADY_HY', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },

  // ─── Materials / Mining / Chemicals (7 names, indices 88-94) ───
  { legalName: 'Granite Peak Mining Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'CA', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Catalyst Chemical Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Orinoco Copper & Gold Ltd.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'AU', baselAssetClass: 'CORPORATE', ratingTier: 'HY_HIGH', storyArc: 'STRESSED_SECTOR', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Nordic Pulp & Paper AB', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'NL', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'DETERIORATING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Prairie Phosphate Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'HY_MID', storyArc: 'RECOVERING', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
  { legalName: 'Silica Advanced Materials GmbH', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'DE', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'GROWING', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Ridgemont Timber Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 9, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },

  // ─── Utilities (5 names, indices 95-99) ───
  { legalName: 'Great Lakes Power & Light Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 8, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_HIGH', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Southern Grid Energy Holdings Inc.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 8, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'LARGE', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Pacific Water Infrastructure Corp.', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 8, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'STEADY_HY', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Thames Valley Utilities PLC', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 8, country: 'GB', baselAssetClass: 'CORPORATE', ratingTier: 'IG_MID', storyArc: 'STABLE_IG', sizeProfile: 'MID', fr2590Type: 'C&I', callReportType: 'C&I_FOREIGN', y14Type: 'LARGE_CORPORATE', regType: 'CORPORATE' },
  { legalName: 'Mountain State Natural Gas LLC', counterpartyType: 'CORPORATE', entityTypeCode: 'CORP', industryId: 8, country: 'US', baselAssetClass: 'CORPORATE', ratingTier: 'IG_LOW', storyArc: 'NEW_RELATIONSHIP', sizeProfile: 'SMALL', fr2590Type: 'C&I', callReportType: 'C&I_DOMESTIC', y14Type: 'MIDDLE_MARKET', regType: 'CORPORATE' },
];

/* ────────────────────── derived fields from rating tier ────────────── */

const COUNTRY_LEI_PREFIXES: Record<string, string> = {
  US: '529900', GB: '213800', DE: '391200', FR: '969500',
  JP: '353800', CH: '506700', CA: '529900', AU: '969500',
  NL: '724500', SG: '529900',
};

/**
 * Get a counterparty field value for rows 10-99.
 * Returns null if the column is not handled here (fallback to generate.ts PRNG).
 */
export function getMvpCounterpartyField(
  rowIndex: number,
  columnName: string,
): string | number | null {
  const mvpIdx = rowIndex - 10;
  if (mvpIdx < 0 || mvpIdx >= MVP_COUNTERPARTIES.length) return null;

  const cp = MVP_COUNTERPARTIES[mvpIdx];
  const tier = RATING_TIER_MAP[cp.ratingTier];
  const rng = mulberry32(hashStr(`cpty.${columnName}.${rowIndex}`));

  switch (columnName) {
    case 'legal_name': return cp.legalName;
    case 'counterparty_type': return cp.counterpartyType;
    case 'country_code': return cp.country;
    case 'entity_type_code': return cp.entityTypeCode;
    case 'industry_id': return cp.industryId;
    case 'basel_asset_class': return cp.baselAssetClass;
    case 'basel_risk_grade': return seededPick(rng, tier.baselGrades);
    case 'call_report_counterparty_type': return cp.callReportType;
    case 'country_of_domicile':
    case 'country_of_incorporation':
    case 'country_of_risk': {
      const countries = ['US', 'GB', 'DE', 'FR', 'JP', 'CH', 'CA', 'AU', 'NL', 'SG'];
      return countries.indexOf(cp.country) + 1;
    }
    case 'external_rating_sp': return seededPick(rng, tier.spRatings);
    case 'external_rating_moodys': return seededPick(rng, tier.moodysRatings);
    case 'external_rating_fitch': return seededPick(rng, tier.fitchRatings);
    case 'fr2590_counterparty_type': return cp.fr2590Type;
    case 'internal_risk_rating': return seededPick(rng, tier.internalGrades);
    case 'is_affiliated': return 'N';
    case 'is_central_counterparty': return 'N';
    case 'is_financial_institution':
      return ['BANK', 'FI', 'INS', 'FUND'].includes(cp.entityTypeCode) ? 'Y' : 'N';
    case 'is_insider': return 'N';
    case 'is_multilateral_dev_bank': return 'N';
    case 'is_parent_flag': return rng() > 0.6 ? 'Y' : 'N';
    case 'is_public_sector_entity': return 'N';
    case 'is_regulated_entity':
      return ['BANK', 'FI', 'INS'].includes(cp.entityTypeCode) ? 'Y' : 'N';
    case 'is_sovereign': return 'N';
    case 'lei_code': {
      const prefix = COUNTRY_LEI_PREFIXES[cp.country] ?? '529900';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let lei = prefix;
      for (let i = 0; i < 14; i++) {
        lei += chars[Math.floor(rng() * chars.length)];
      }
      return lei;
    }
    case 'lgd_unsecured': return tier.lgd;
    case 'pd_annual': {
      return Math.round(seededRange(rng, tier.pdLow, tier.pdHigh) * 10000) / 10000;
    }
    case 'regulatory_counterparty_type': return cp.regType;
    case 'y14_obligor_type': return cp.y14Type;
    default: return null;
  }
}

/** Get the story arc for a counterparty by its 0-based index (0-99). */
export function getCounterpartyStoryArc(counterpartyIndex: number): StoryArc {
  if (counterpartyIndex < 10) {
    // Tier 1 defaults — match the existing L2 story patterns
    const tier1Arcs: StoryArc[] = [
      'STABLE_IG', 'STABLE_IG', 'STABLE_IG', 'STABLE_IG',
      'DETERIORATING', 'STABLE_IG', 'STABLE_IG', 'STRESSED_SECTOR',
      'STABLE_IG', 'STABLE_IG',
    ];
    return tier1Arcs[counterpartyIndex];
  }
  const mvpIdx = counterpartyIndex - 10;
  if (mvpIdx >= 0 && mvpIdx < MVP_COUNTERPARTIES.length) {
    return MVP_COUNTERPARTIES[mvpIdx].storyArc;
  }
  return 'STABLE_IG';
}

/** Get the size profile for a counterparty by its 0-based index. */
export function getCounterpartySizeProfile(counterpartyIndex: number): SizeProfile {
  if (counterpartyIndex < 10) return 'LARGE';
  const mvpIdx = counterpartyIndex - 10;
  if (mvpIdx >= 0 && mvpIdx < MVP_COUNTERPARTIES.length) {
    return MVP_COUNTERPARTIES[mvpIdx].sizeProfile;
  }
  return 'MID';
}

/** Get the rating tier for a counterparty by its 0-based index. */
export function getCounterpartyRatingTier(counterpartyIndex: number): RatingTier {
  if (counterpartyIndex < 10) {
    const tier1Ratings: RatingTier[] = [
      'IG_MID', 'IG_LOW', 'HY_HIGH', 'IG_HIGH', 'IG_LOW',
      'IG_MID', 'HY_HIGH', 'HY_HIGH', 'HY_HIGH', 'IG_LOW',
    ];
    return tier1Ratings[counterpartyIndex];
  }
  const mvpIdx = counterpartyIndex - 10;
  if (mvpIdx >= 0 && mvpIdx < MVP_COUNTERPARTIES.length) {
    return MVP_COUNTERPARTIES[mvpIdx].ratingTier;
  }
  return 'IG_LOW';
}

/** Get the country for a counterparty by its 0-based index. */
export function getCounterpartyCountry(counterpartyIndex: number): string {
  if (counterpartyIndex < 10) {
    return ['US', 'US', 'US', 'GB', 'DE', 'US', 'US', 'AU', 'CA', 'US'][counterpartyIndex];
  }
  const mvpIdx = counterpartyIndex - 10;
  if (mvpIdx >= 0 && mvpIdx < MVP_COUNTERPARTIES.length) {
    return MVP_COUNTERPARTIES[mvpIdx].country;
  }
  return 'US';
}
