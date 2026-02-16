import {
  AMENDMENT_STATUSES,
  AMENDMENT_TYPES,
  MITIGANT_SUBTYPES,
  PRODUCT_TO_FR2590,
} from "../config/reference-data";
import { AmendmentChangeDetail } from "../schemas/l2/amendment-change-detail";
import { AmendmentEvent } from "../schemas/l2/amendment-event";
import { CollateralSnapshot } from "../schemas/l2/collateral-snapshot";
import { FacilityExposureSnapshot } from "../schemas/l2/facility-exposure-snapshot";
import { L1Data } from "./l1-generators";

const SNAPSHOT_DATES = ["2025-12-31", "2026-01-31", "2026-02-28"];
const AS_OF_DATE = "2026-02-28";

const roundTo = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const padId = (value: number, size: number) => String(value).padStart(size, "0");

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pick = <T>(items: T[], index: number) => items[index % items.length];

const haircutForSubtype = (subtype: string, index: number) => {
  if (subtype.includes("Cash")) return 0;
  if (subtype.includes("Sovereign")) return 0.02 + (index % 4) * 0.01;
  if (subtype.includes("Equity")) return 0.1 + (index % 4) * 0.05;
  return 0.05 + (index % 3) * 0.03;
};

export interface L2Data {
  facilityExposureSnapshot: FacilityExposureSnapshot[];
  collateralSnapshot: CollateralSnapshot[];
  amendmentEvent: AmendmentEvent[];
  amendmentChangeDetail: AmendmentChangeDetail[];
}

export const generateL2Data = (l1: L1Data): L2Data => {
  const facilityExposureSnapshot: FacilityExposureSnapshot[] = [];
  const facilityIdsWithCrossEntity = new Set(
    l1.facilityMaster.slice(0, 5).map((facility) => facility.facility_id)
  );

  let exposureSeq = 1;
  l1.facilityMaster.forEach((facility, index) => {
    const committed = facility.committed_facility_amt;
    const baseUtil = clamp(0.25 + ((index * 13) % 60) / 100, 0.25, 0.85);
    const delta = ((index % 14) - 5) / 100;
    const delta2 = ((index % 9) - 4) / 100;

    const currentDrawn = committed * baseUtil;
    const priorDrawn = clamp(currentDrawn / (1 + delta), committed * 0.2, committed * 0.9);
    const earlierDrawn = clamp(priorDrawn / (1 + delta2), committed * 0.2, committed * 0.9);

    const drawnByMonth = [earlierDrawn, priorDrawn, currentDrawn];
    const primaryLegalEntity = pick(l1.legalEntity, index).legal_entity_id;
    const secondaryLegalEntity = pick(l1.legalEntity, index + 2).legal_entity_id;

    SNAPSHOT_DATES.forEach((asOfDate, monthIndex) => {
      const drawn = drawnByMonth[monthIndex];
      const grossExposure = drawn * 1.03;
      const undrawn = committed - drawn;
      const ead = grossExposure * 1.02;
      const legalEntityId =
        facilityIdsWithCrossEntity.has(facility.facility_id) && monthIndex === 0
          ? secondaryLegalEntity
          : primaryLegalEntity;

      facilityExposureSnapshot.push({
        facility_exposure_id: `FES-${padId(exposureSeq, 6)}`,
        facility_id: facility.facility_id,
        counterparty_id: facility.counterparty_id,
        legal_entity_id: legalEntityId,
        gross_exposure_usd: roundTo(grossExposure, 1),
        drawn_amount: roundTo(drawn, 1),
        undrawn_amount: roundTo(undrawn, 1),
        ead_amount: roundTo(ead, 1),
        currency_code: "USD",
        fr2590_category_code: PRODUCT_TO_FR2590[facility.product_id],
        as_of_date: asOfDate,
      });
      exposureSeq += 1;
    });
  });

  const latestExposureByFacility = new Map<string, FacilityExposureSnapshot>();
  facilityExposureSnapshot.forEach((snapshot) => {
    if (snapshot.as_of_date === AS_OF_DATE) {
      latestExposureByFacility.set(snapshot.facility_id, snapshot);
    }
  });

  const collateralSnapshot: CollateralSnapshot[] = [];
  let collateralSeq = 1;

  l1.facilityMaster.forEach((facility, index) => {
    let collateralCount = 0;
    if (index < 10) collateralCount = 2;
    else if (index < 40) collateralCount = 1;
    else collateralCount = 0;

    const exposure = latestExposureByFacility.get(facility.facility_id);
    if (!exposure) return;

    for (let i = 0; i < collateralCount; i += 1) {
      const groupCode = (index + i) % 2 === 0 ? "M-1" : "M-2";
      const subtype = pick(MITIGANT_SUBTYPES[groupCode], index + i);
      const haircut = haircutForSubtype(subtype, index + i);
      const allocPct = 0.3 + ((index * 7 + i * 9) % 50) / 100;
      const allocated = exposure.gross_exposure_usd * allocPct;
      const currentValuation = allocated / (1 - haircut);
      collateralSnapshot.push({
        collateral_snapshot_id: `CS-${padId(collateralSeq, 6)}`,
        facility_id: facility.facility_id,
        counterparty_id: facility.counterparty_id,
        mitigant_group_code: groupCode,
        mitigant_subtype: subtype,
        original_valuation_usd: roundTo(currentValuation * 1.05, 1),
        current_valuation_usd: roundTo(currentValuation, 1),
        haircut_pct: roundTo(haircut, 2),
        eligible_value_usd: roundTo(currentValuation * (1 - haircut), 1),
        allocated_amount_usd: roundTo(allocated, 1),
        as_of_date: AS_OF_DATE,
      });
      collateralSeq += 1;
    }
  });

  const amendmentEvent: AmendmentEvent[] = [];
  const amendmentChangeDetail: AmendmentChangeDetail[] = [];
  const facilitiesWithAmendments = l1.facilityMaster.slice(0, 20);
  const statusDistribution = [
    "Complete",
    "Complete",
    "Complete",
    "Complete",
    "Rejected",
    "Rejected",
    "Rejected",
    "Pending Approval",
    "Pending Approval",
    "Pending Approval",
    "Pending Approval",
    "Pending Approval",
    "In Underwriting",
    "In Underwriting",
    "In Underwriting",
    "In Underwriting",
    "Under Credit Review",
    "Under Credit Review",
    "Prospect Identified",
    "Prospect Identified",
  ];

  const amendmentTypes = Object.keys(AMENDMENT_TYPES);
  let amendmentSeq = 1;

  facilitiesWithAmendments.forEach((facility, index) => {
    const amendmentType = pick(amendmentTypes, index);
    const subtypeOptions = AMENDMENT_TYPES[amendmentType];
    const status = pick(statusDistribution, index);
    const identifiedDate = `2025-${padId((index % 6) + 5, 2)}-${padId(
      (index % 20) + 5,
      2
    )}`;
    const effectiveDate = status === "Complete" ? "2025-12-15" : null;
    const completedDate =
      status === "Complete" || status === "Rejected" ? "2026-01-20" : null;

    amendmentEvent.push({
      amendment_event_id: `AMD-${padId(amendmentSeq, 4)}`,
      credit_agreement_id: facility.credit_agreement_id,
      facility_id: facility.facility_id,
      amendment_type: amendmentType,
      amendment_subtype: pick(subtypeOptions, index),
      amendment_status: status,
      counterparty_id: facility.counterparty_id,
      identified_date: identifiedDate,
      effective_date: effectiveDate,
      completed_date: completedDate,
      amendment_description: `Amendment to ${facility.facility_type} terms reflecting ${pick(
        subtypeOptions,
        index
      ).toLowerCase()}.`,
      as_of_date: AS_OF_DATE,
    });

    const changesForAmendment = index < 10 ? 2 : 1;
    const changeFields = [
      "committed_facility_amt",
      "maturity_date",
      "spread_bps",
      "interest_rate_reference",
      "facility_status",
    ];

    for (let i = 0; i < changesForAmendment; i += 1) {
      const fieldName = pick(changeFields, index + i);
      amendmentChangeDetail.push({
        amendment_event_id: `AMD-${padId(amendmentSeq, 4)}`,
        change_seq: i + 1,
        change_field_name: fieldName,
        old_value:
          fieldName === "committed_facility_amt"
            ? `${roundTo(facility.committed_facility_amt * 0.9, 1)}`
            : fieldName === "maturity_date"
            ? facility.maturity_date
            : fieldName === "spread_bps"
            ? `${120 + index * 3}`
            : fieldName === "interest_rate_reference"
            ? facility.interest_rate_reference
            : facility.facility_status,
        new_value:
          fieldName === "committed_facility_amt"
            ? `${roundTo(facility.committed_facility_amt, 1)}`
            : fieldName === "maturity_date"
            ? "2027-12-15"
            : fieldName === "spread_bps"
            ? `${100 + index * 2}`
            : fieldName === "interest_rate_reference"
            ? "SOFR"
            : "Active",
      });
    }

    amendmentSeq += 1;
  });

  return {
    facilityExposureSnapshot,
    collateralSnapshot,
    amendmentEvent,
    amendmentChangeDetail,
  };
};
