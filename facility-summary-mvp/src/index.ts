import fs from "fs";
import path from "path";
import { assembleFacilitySummary } from "./assembly/facility-summary-assembler";
import { assembleRollups } from "./assembly/rollup-assembler";
import { generateL1Data } from "./generators/l1-generators";
import { generateL2Data } from "./generators/l2-generators";
import { generateL2EnrichmentData } from "./generators/l2-generators-enrichment";
import { FacilitySummary } from "./types";

const OUTPUT_ROOT = path.resolve("output");

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeJson = (filePath: string, data: unknown) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const uniqueCount = (items: string[]) => new Set(items).size;

const validateSummaries = (
  summaries: FacilitySummary[],
  l1: ReturnType<typeof generateL1Data>,
  l2: ReturnType<typeof generateL2Data>
) => {
  const issues: string[] = [];
  const counterpartyIds = new Set(l1.counterparty.map((item) => item.counterparty_id));
  const facilityIds = new Set(l1.facilityMaster.map((item) => item.facility_id));
  const legalEntityIds = new Set(l1.legalEntity.map((item) => item.legal_entity_id));
  const amendmentsByFacility = new Map<string, number>();
  l2.amendmentEvent.forEach((event) => {
    if (!event.facility_id) return;
    amendmentsByFacility.set(
      event.facility_id,
      (amendmentsByFacility.get(event.facility_id) ?? 0) + 1
    );
  });

  summaries.forEach((row) => {
    if (!counterpartyIds.has(row.counterparty_id)) {
      issues.push(`Missing counterparty for ${row.counterparty_id}`);
    }
    if (!facilityIds.has(row.facility_id)) {
      issues.push(`Missing facility for ${row.facility_id}`);
    }
    if (!legalEntityIds.has(row.legal_entity_id)) {
      issues.push(`Missing legal entity for ${row.legal_entity_id}`);
    }
    const expectedUtilization =
      row.committed_amount_usd > 0
        ? row.utilized_amount_usd / row.committed_amount_usd
        : 0;
    if (Math.abs(expectedUtilization - row.utilization_pct) > 0.0001) {
      issues.push(`Utilization pct mismatch for ${row.facility_id}`);
    }
    const expectedCoverage =
      row.outstanding_exposure_usd > 0
        ? row.risk_mitigant_amount_usd / row.outstanding_exposure_usd
        : 0;
    if (Math.abs(expectedCoverage - row.coverage_ratio_pct) > 0.0001) {
      issues.push(`Coverage ratio mismatch for ${row.facility_id}`);
    }
    if (row.is_syndicated !== row.participating_counterparty_ids.length > 1) {
      issues.push(`Syndication flag mismatch for ${row.facility_id}`);
    }
    const hasAmendment = amendmentsByFacility.has(row.facility_id);
    if (row.has_amendment !== hasAmendment) {
      issues.push(`Amendment flag mismatch for ${row.facility_id}`);
    }
    const expectedChange =
      row.prior_month_exposure_usd > 0
        ? (row.outstanding_exposure_usd - row.prior_month_exposure_usd) /
          row.prior_month_exposure_usd
        : 0;
    if (Math.abs(expectedChange - row.exposure_change_pct) > 0.0001) {
      issues.push(`Exposure change mismatch for ${row.facility_id}`);
    }
    if (
      !row.facility_id ||
      !row.counterparty_name ||
      !row.legal_entity_name ||
      !row.fr2590_category ||
      !row.industry ||
      !row.as_of_date
    ) {
      issues.push(`Missing required fields for ${row.facility_id}`);
    }
  });

  if (summaries.filter((row) => row.is_syndicated).length < 8) {
    issues.push("Syndicated facilities count below 8");
  }
  if (summaries.filter((row) => row.has_cross_entity_exposure).length < 5) {
    issues.push("Cross-entity exposure count below 5");
  }
  if (summaries.filter((row) => row.has_amendment).length < 15) {
    issues.push("Amendment count below 15");
  }
  const activeCount = summaries.filter((row) => row.facility_status === "Active").length;
  const maturedCount = summaries.filter((row) => row.facility_status === "Matured").length;
  if (activeCount === 0 || maturedCount === 0) {
    issues.push("Missing mix of active and matured facilities");
  }

  const idChecks: Array<{ name: string; ids: string[] }> = [
    { name: "counterparty", ids: l1.counterparty.map((item) => item.counterparty_id) },
    { name: "facility_master", ids: l1.facilityMaster.map((item) => item.facility_id) },
    {
      name: "facility_counterparty_participation",
      ids: l1.facilityCounterpartyParticipation.map(
        (item) => item.facility_participation_id
      ),
    },
    {
      name: "facility_lender_allocation",
      ids: l1.facilityLenderAllocation.map(
        (item) => item.lender_allocation_id
      ),
    },
    { name: "facility_exposure_snapshot", ids: l2.facilityExposureSnapshot.map((item) => item.facility_exposure_id) },
    { name: "collateral_snapshot", ids: l2.collateralSnapshot.map((item) => item.collateral_snapshot_id) },
    { name: "amendment_event", ids: l2.amendmentEvent.map((item) => item.amendment_event_id) },
  ];
  idChecks.forEach((check) => {
    if (uniqueCount(check.ids) !== check.ids.length) {
      issues.push(`Duplicate IDs detected in ${check.name}`);
    }
  });

  return issues;
};

const main = () => {
  const l1 = generateL1Data();
  const l2 = generateL2Data(l1);
  const l2Enrichment = generateL2EnrichmentData(l1, l2);
  const facilitySummary = assembleFacilitySummary(l1, l2, l2Enrichment);
  const rollups = assembleRollups(facilitySummary, l2Enrichment);

  writeJson(path.join(OUTPUT_ROOT, "l1", "facility-master.json"), l1.facilityMaster);
  writeJson(path.join(OUTPUT_ROOT, "l1", "counterparty.json"), l1.counterparty);
  writeJson(
    path.join(OUTPUT_ROOT, "l1", "counterparty-hierarchy.json"),
    l1.counterpartyHierarchy
  );
  writeJson(path.join(OUTPUT_ROOT, "l1", "legal-entity.json"), l1.legalEntity);
  writeJson(
    path.join(OUTPUT_ROOT, "l1", "facility-counterparty-participation.json"),
    l1.facilityCounterpartyParticipation
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l1", "facility-lender-allocation.json"),
    l1.facilityLenderAllocation
  );
  writeJson(path.join(OUTPUT_ROOT, "l1", "fr2590-category-dim.json"), l1.fr2590CategoryDim);
  writeJson(path.join(OUTPUT_ROOT, "l1", "industry-dim.json"), l1.industryDim);
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "facility-exposure-snapshot.json"),
    l2.facilityExposureSnapshot
  );
  writeJson(path.join(OUTPUT_ROOT, "l2", "collateral-snapshot.json"), l2.collateralSnapshot);
  writeJson(path.join(OUTPUT_ROOT, "l2", "amendment-event.json"), l2.amendmentEvent);
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "amendment-change-detail.json"),
    l2.amendmentChangeDetail
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "facility-pricing-snapshot.json"),
    l2Enrichment.facilityPricingSnapshot
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "facility-delinquency-snapshot.json"),
    l2Enrichment.facilityDelinquencySnapshot
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "facility-profitability-snapshot.json"),
    l2Enrichment.facilityProfitabilitySnapshot
  );
  writeJson(path.join(OUTPUT_ROOT, "l2", "risk-flag.json"), l2Enrichment.riskFlag);
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "counterparty-rating-observation.json"),
    l2Enrichment.counterpartyRatingObservation
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "limit-definition.json"),
    l2Enrichment.limitDefinition
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "limit-utilization-event.json"),
    l2Enrichment.limitUtilizationEvent
  );
  writeJson(
    path.join(OUTPUT_ROOT, "l2", "financial-metric-observation.json"),
    l2Enrichment.financialMetricObservation
  );
  writeJson(path.join(OUTPUT_ROOT, "l3", "facility-summary.json"), facilitySummary);
  writeJson(path.join(OUTPUT_ROOT, "l3", "desk-summary.json"), rollups.deskSummary);
  writeJson(path.join(OUTPUT_ROOT, "l3", "lob-l2-summary.json"), rollups.lobL2Summary);
  writeJson(path.join(OUTPUT_ROOT, "l3", "lob-l1-summary.json"), rollups.lobL1Summary);

  const validations = validateSummaries(facilitySummary, l1, l2);
  const summaryCounts = {
    facility_master: l1.facilityMaster.length,
    counterparty: l1.counterparty.length,
    counterparty_hierarchy: l1.counterpartyHierarchy.length,
    legal_entity: l1.legalEntity.length,
    facility_counterparty_participation: l1.facilityCounterpartyParticipation.length,
    facility_lender_allocation: l1.facilityLenderAllocation.length,
    fr2590_category_dim: l1.fr2590CategoryDim.length,
    industry_dim: l1.industryDim.length,
    facility_exposure_snapshot: l2.facilityExposureSnapshot.length,
    collateral_snapshot: l2.collateralSnapshot.length,
    amendment_event: l2.amendmentEvent.length,
    amendment_change_detail: l2.amendmentChangeDetail.length,
    facility_pricing_snapshot: l2Enrichment.facilityPricingSnapshot.length,
    facility_delinquency_snapshot: l2Enrichment.facilityDelinquencySnapshot.length,
    facility_profitability_snapshot: l2Enrichment.facilityProfitabilitySnapshot.length,
    risk_flag: l2Enrichment.riskFlag.length,
    counterparty_rating_observation: l2Enrichment.counterpartyRatingObservation.length,
    limit_definition: l2Enrichment.limitDefinition.length,
    limit_utilization_event: l2Enrichment.limitUtilizationEvent.length,
    financial_metric_observation: l2Enrichment.financialMetricObservation.length,
    facility_summary: facilitySummary.length,
    desk_summary: rollups.deskSummary.length,
    lob_l2_summary: rollups.lobL2Summary.length,
    lob_l1_summary: rollups.lobL1Summary.length,
  };

  console.log("Generation summary:", summaryCounts);
  console.log("Sample facility_summary row:", facilitySummary[0]);
  if (validations.length > 0) {
    console.log("Validation issues:", validations);
  } else {
    console.log("All validations passed.");
  }
};

main();
