import {
  AMENDMENT_STATUSES,
  EXTERNAL_RATINGS,
  FACILITY_TYPES,
  FR2590_CATEGORIES,
  INDUSTRIES,
  LEGAL_ENTITIES,
  LOB_HIERARCHY,
  PRODUCTS,
  REGIONS,
} from "../config/reference-data";
import { Counterparty } from "../schemas/l1/counterparty";
import { CounterpartyHierarchy } from "../schemas/l1/counterparty-hierarchy";
import { FacilityCounterpartyParticipation } from "../schemas/l1/facility-counterparty-participation";
import { FacilityLenderAllocation } from "../schemas/l1/facility-lender-allocation";
import { FacilityMaster } from "../schemas/l1/facility-master";
import { Fr2590CategoryDim } from "../schemas/l1/fr2590-category-dim";
import { IndustryDim } from "../schemas/l1/industry-dim";
import { LegalEntity } from "../schemas/l1/legal-entity";

const AS_OF_DATE = "2026-02-28";

const COMPANY_PREFIXES = [
  "Meridian",
  "Northbridge",
  "Blue Harbor",
  "Summit",
  "Apex",
  "Crescent",
  "Pinnacle",
  "Silvergate",
  "Redwood",
  "Evergreen",
  "Stonebrook",
  "Ironwood",
  "Windridge",
  "Oakline",
  "Riverstone",
];
const COMPANY_CORES = [
  "Industrial",
  "Capital",
  "Holdings",
  "Energy",
  "Logistics",
  "Healthcare",
  "Technology",
  "Manufacturing",
  "Infrastructure",
  "Financial",
  "Consumer",
  "Partners",
  "Resources",
  "Ventures",
];
const COMPANY_SUFFIXES = ["Inc.", "LLC", "Ltd.", "PLC", "Group", "Corp."];

const COUNTERPARTY_TYPES = ["CORPORATE", "CORPORATE", "BANK", "SOVEREIGN", "RETAIL"];

const INTEREST_RATE_REFERENCES = ["SOFR", "PRIME", "SOFR", "SOFR", "PRIME"];

const TODAY = "2026-02-12";

const roundTo = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const padId = (value: number, size: number) => String(value).padStart(size, "0");

const formatDate = (year: number, month: number, day: number) => {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const pick = <T>(items: T[], index: number) => items[index % items.length];

const buildLobPairs = () => {
  const pairs: Array<{ l1: string; l2: string }> = [];
  LOB_HIERARCHY.forEach((entry) => {
    entry.l2.forEach((l2) => pairs.push({ l1: entry.l1, l2 }));
  });
  return pairs;
};

const LOB_PAIRS = buildLobPairs();
const L3_SUFFIXES = ["Desk Alpha", "Desk Beta", "Desk Gamma"];

export interface L1Data {
  facilityMaster: FacilityMaster[];
  counterparty: Counterparty[];
  counterpartyHierarchy: CounterpartyHierarchy[];
  legalEntity: LegalEntity[];
  facilityCounterpartyParticipation: FacilityCounterpartyParticipation[];
  facilityLenderAllocation: FacilityLenderAllocation[];
  fr2590CategoryDim: Fr2590CategoryDim[];
  industryDim: IndustryDim[];
}

const ratingToExternal = (rating: number, index: number) => {
  if (rating <= 2) {
    return index % 2 === 0 ? "A" : "AA";
  }
  if (rating === 3) {
    return "BBB";
  }
  if (rating === 4) {
    return index % 2 === 0 ? "BB" : "B";
  }
  return "CCC";
};

const ratingToPd = (rating: number) => {
  if (rating === 1) return 0.005;
  if (rating === 2) return 0.01;
  if (rating === 3) return 0.02;
  if (rating === 4) return 0.05;
  return 0.12;
};

const ratingToLgd = (rating: number) => {
  if (rating === 1) return 0.35;
  if (rating === 2) return 0.4;
  if (rating === 3) return 0.45;
  if (rating === 4) return 0.55;
  return 0.6;
};

export const generateL1Data = (): L1Data => {
  const counterparties: Counterparty[] = [];
  const parentCount = 10;
  const totalCount = 30;
  const ratingPattern = [
    2, 3, 2, 2, 3, 2, 3, 2, 4, 5, 2, 3, 2, 3, 2, 3, 2, 4, 3, 2, 3, 2, 4,
    5, 2, 3, 2, 3, 2, 4,
  ];

  for (let i = 0; i < totalCount; i += 1) {
    const id = `CP-${padId(i + 1, 5)}`;
    const isParent = i < parentCount;
    const prefix = pick(COMPANY_PREFIXES, i);
    const core = pick(COMPANY_CORES, i + 2);
    const suffix = pick(COMPANY_SUFFIXES, i + 1);
    const legalName = isParent
      ? `${prefix} ${core} Holdings ${suffix}`
      : `${prefix} ${core} ${suffix}`;
    const rating = ratingPattern[i % ratingPattern.length];
    const counterparty: Counterparty = {
      counterparty_id: id,
      legal_name: legalName,
      counterparty_type: pick(COUNTERPARTY_TYPES, i),
      internal_risk_rating: rating,
      external_rating_sp: ratingToExternal(rating, i),
      industry_id: pick(INDUSTRIES, i).id,
      country_code: i % 6 === 0 ? "GB" : "US",
      is_parent_flag: isParent,
      pd_annual: ratingToPd(rating),
      lgd_unsecured: ratingToLgd(rating),
    };
    counterparties.push(counterparty);
  }

  const counterpartyHierarchy: CounterpartyHierarchy[] = [];
  const parents = counterparties.slice(0, parentCount);
  const children = counterparties.slice(parentCount);

  parents.forEach((parent) => {
    counterpartyHierarchy.push({
      counterparty_id: parent.counterparty_id,
      as_of_date: AS_OF_DATE,
      immediate_parent_id: null,
      ultimate_parent_id: parent.counterparty_id,
      ownership_pct: 100,
    });
  });

  children.forEach((child, index) => {
    const parent = parents[index % parents.length];
    const ownership = 60 + (index % 5) * 10;
    counterpartyHierarchy.push({
      counterparty_id: child.counterparty_id,
      as_of_date: AS_OF_DATE,
      immediate_parent_id: parent.counterparty_id,
      ultimate_parent_id: parent.counterparty_id,
      ownership_pct: ownership,
    });
  });

  const legalEntity: LegalEntity[] = LEGAL_ENTITIES.map((entity, index) => ({
    legal_entity_id: entity.id,
    legal_name: entity.name,
    short_name: entity.shortName,
    entity_type_code: entity.type,
    country_code: index % 2 === 0 ? "US" : "GB",
    active_flag: true,
  }));

  const industryDim: IndustryDim[] = INDUSTRIES.map((industry) => ({
    industry_id: industry.id,
    industry_name: industry.name,
    industry_code: industry.code,
  }));

  const fr2590CategoryDim: Fr2590CategoryDim[] = FR2590_CATEGORIES.map((item) => ({
    fr2590_category_code: item.code,
    category_name: item.name,
  }));

  const facilityMaster: FacilityMaster[] = [];
  for (let i = 0; i < 50; i += 1) {
    const facilityId = `FAC-2024-${padId(i + 1, 5)}`;
    const creditAgreementId = `CA-2024-${padId(Math.ceil((i + 1) / 2), 5)}`;
    const lobPair = pick(LOB_PAIRS, i);
    const lobL3 = `${lobPair.l2} ${pick(L3_SUFFIXES, i)}`;
    const isActive = i < 35;
    const originationYear = 2018 + (i % 7);
    const originationDate = formatDate(
      originationYear,
      (i % 12) + 1,
      (i % 28) + 1
    );
    const maturityYear = isActive ? 2026 + (i % 6) : 2024 + (i % 2);
    const maturityDate = formatDate(
      maturityYear,
      ((i + 5) % 12) + 1,
      ((i + 10) % 28) + 1
    );
    const largeFacility = (i + 1) % 10 === 0;
    const committedBase = largeFacility
      ? 800 + ((i * 13) % 700)
      : 50 + ((i * 37) % 450);
    facilityMaster.push({
      facility_id: facilityId,
      credit_agreement_id: creditAgreementId,
      counterparty_id: pick(counterparties, i).counterparty_id,
      facility_type: pick(FACILITY_TYPES, i),
      product_id: pick(PRODUCTS, i),
      facility_status: isActive ? "Active" : "Matured",
      committed_facility_amt: roundTo(committedBase, 1),
      origination_date: originationDate,
      maturity_date: maturityDate,
      interest_rate_reference: pick(INTEREST_RATE_REFERENCES, i),
      revolving_flag:
        pick(FACILITY_TYPES, i).includes("Revolving") ||
        pick(PRODUCTS, i).includes("Commitments"),
      currency_code: "USD",
      lob_l1_name: lobPair.l1,
      lob_l2_name: lobPair.l2,
      lob_l3_name: lobL3,
      region_code: pick(REGIONS, i),
      industry_code: pick(INDUSTRIES, i + 3).id,
    });
  }

  const facilityCounterpartyParticipation: FacilityCounterpartyParticipation[] = [];
  const syndicatedFacilities = facilityMaster.slice(0, 10);
  let participationSeq = 1;

  syndicatedFacilities.forEach((facility, index) => {
    const primaryCounterparty = facility.counterparty_id;
    const counterpartyIds = [
      primaryCounterparty,
      pick(counterparties, index + 7).counterparty_id,
      pick(counterparties, index + 13).counterparty_id,
    ];
    const participationPcts = [50, 30, 20];
    const roles = ["BORROWER", "CO_LENDER", "AGENT"];
    counterpartyIds.forEach((counterpartyId, roleIndex) => {
      facilityCounterpartyParticipation.push({
        facility_participation_id: `FCP-${padId(participationSeq, 4)}`,
        facility_id: facility.facility_id,
        counterparty_id: counterpartyId,
        counterparty_role_code: roles[roleIndex],
        participation_pct: participationPcts[roleIndex],
        is_primary_flag: roleIndex === 0,
      });
      participationSeq += 1;
    });
  });

  facilityMaster.slice(10).forEach((facility) => {
    facilityCounterpartyParticipation.push({
      facility_participation_id: `FCP-${padId(participationSeq, 4)}`,
      facility_id: facility.facility_id,
      counterparty_id: facility.counterparty_id,
      counterparty_role_code: "BORROWER",
      participation_pct: 100,
      is_primary_flag: true,
    });
    participationSeq += 1;
  });

  // --- facility_lender_allocation: issuer-side bank share per facility ---
  const facilityLenderAllocation: FacilityLenderAllocation[] = [];
  let allocationSeq = 1;

  // Syndicated share splits for first 10 facilities (two legal entities each)
  const syndicatedSplits: Array<{
    pcts: [number, number];
    roles: [string, string];
    leads: [boolean, boolean];
    leIndices: [number, number];
  }> = [
    { pcts: [60, 40], roles: ["LEAD_ARRANGER", "CO_LENDER"], leads: [true, false], leIndices: [0, 1] },
    { pcts: [55, 45], roles: ["LEAD_ARRANGER", "PARTICIPANT"], leads: [true, false], leIndices: [0, 2] },
    { pcts: [45, 55], roles: ["CO_LENDER", "LEAD_ARRANGER"], leads: [false, true], leIndices: [1, 0] },
    { pcts: [70, 30], roles: ["LEAD_ARRANGER", "PARTICIPANT"], leads: [true, false], leIndices: [0, 3] },
    { pcts: [50, 50], roles: ["CO_LENDER", "CO_LENDER"], leads: [false, false], leIndices: [0, 1] },
    { pcts: [80, 20], roles: ["LEAD_ARRANGER", "PARTICIPANT"], leads: [true, false], leIndices: [0, 2] },
    { pcts: [65, 35], roles: ["LEAD_ARRANGER", "CO_LENDER"], leads: [true, false], leIndices: [1, 0] },
    { pcts: [40, 60], roles: ["PARTICIPANT", "LEAD_ARRANGER"], leads: [false, true], leIndices: [0, 1] },
    { pcts: [75, 25], roles: ["LEAD_ARRANGER", "PARTICIPANT"], leads: [true, false], leIndices: [0, 2] },
    { pcts: [55, 45], roles: ["LEAD_ARRANGER", "CO_LENDER"], leads: [true, false], leIndices: [1, 0] },
  ];

  syndicatedFacilities.forEach((facility, index) => {
    const split = syndicatedSplits[index % syndicatedSplits.length];
    split.pcts.forEach((pct, slotIndex) => {
      const le = legalEntity[split.leIndices[slotIndex] % legalEntity.length];
      facilityLenderAllocation.push({
        lender_allocation_id: `FLA-${padId(allocationSeq, 4)}`,
        facility_id: facility.facility_id,
        legal_entity_id: le.legal_entity_id,
        bank_share_pct: pct,
        bank_commitment_amt: Math.round(facility.committed_facility_amt * pct / 100),
        allocation_role: split.roles[slotIndex],
        is_lead_flag: split.leads[slotIndex],
      });
      allocationSeq += 1;
    });
  });

  // Bilateral facilities: 100% to a single rotating legal entity
  facilityMaster.slice(10).forEach((facility, index) => {
    const le = legalEntity[index % legalEntity.length];
    facilityLenderAllocation.push({
      lender_allocation_id: `FLA-${padId(allocationSeq, 4)}`,
      facility_id: facility.facility_id,
      legal_entity_id: le.legal_entity_id,
      bank_share_pct: 100,
      bank_commitment_amt: facility.committed_facility_amt,
      allocation_role: "SOLE_LENDER",
      is_lead_flag: true,
    });
    allocationSeq += 1;
  });

  return {
    facilityMaster,
    counterparty: counterparties,
    counterpartyHierarchy,
    legalEntity,
    facilityCounterpartyParticipation,
    facilityLenderAllocation,
    fr2590CategoryDim,
    industryDim,
  };
};

export const L1_REFERENCE_METADATA = {
  asOfDate: AS_OF_DATE,
  today: TODAY,
  amendmentStatuses: AMENDMENT_STATUSES,
  externalRatings: EXTERNAL_RATINGS,
};
