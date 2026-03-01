import {
  DELINQUENCY_BUCKET_CODES,
  DELINQUENCY_STATUS_CODES,
  FINANCIAL_METRIC_CODES,
  LIMIT_SCOPE,
  LIMIT_TYPES,
  RATE_INDEX_CODES,
  RATING_AGENCIES,
  RATING_TYPES,
  RISK_FLAG_CODES,
  RISK_FLAG_SCOPE,
  RISK_FLAG_SEVERITIES,
  RISK_TIERS,
  LOB_HIERARCHY,
} from "../config/reference-data";
import { CounterpartyRatingObservation } from "../schemas/l2/counterparty-rating-observation";
import { FacilityDelinquencySnapshot } from "../schemas/l2/facility-delinquency-snapshot";
import { FacilityPricingSnapshot } from "../schemas/l2/facility-pricing-snapshot";
import { FacilityProfitabilitySnapshot } from "../schemas/l2/facility-profitability-snapshot";
import { FinancialMetricObservation } from "../schemas/l2/financial-metric-observation";
import { LimitDefinition } from "../schemas/l2/limit-definition";
import { LimitUtilizationEvent } from "../schemas/l2/limit-utilization-event";
import { RiskFlag } from "../schemas/l2/risk-flag";
import { L1Data } from "./l1-generators";
import { L2Data } from "./l2-generators";

const SNAPSHOT_DATES = ["2025-12-31", "2026-01-31", "2026-02-28"];
const AS_OF_DATE = "2026-02-28";

const roundTo = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const padId = (value: number, size: number) => String(value).padStart(size, "0");

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pick = <T>(items: T[], index: number) => items[index % items.length];

export interface L2EnrichmentData {
  facilityPricingSnapshot: FacilityPricingSnapshot[];
  facilityDelinquencySnapshot: FacilityDelinquencySnapshot[];
  facilityProfitabilitySnapshot: FacilityProfitabilitySnapshot[];
  riskFlag: RiskFlag[];
  counterpartyRatingObservation: CounterpartyRatingObservation[];
  limitDefinition: LimitDefinition[];
  limitUtilizationEvent: LimitUtilizationEvent[];
  financialMetricObservation: FinancialMetricObservation[];
}

export const generateL2EnrichmentData = (
  l1: L1Data,
  l2: L2Data
): L2EnrichmentData => {
  // 1. Facility Pricing Snapshots (150 records: 50 facilities × 3 months)
  const facilityPricingSnapshot: FacilityPricingSnapshot[] = [];
  let pricingSeq = 1;

  l1.facilityMaster.forEach((facility, index) => {
    const counterparty = l1.counterparty.find(
      (cp) => cp.counterparty_id === facility.counterparty_id
    );
    const riskRating = counterparty?.internal_risk_rating || 3;

    // Spread inversely correlates with risk rating
    const baseSpread =
      riskRating <= 2
        ? 100 + (index % 100) // Investment grade: 100-200 bps
        : riskRating === 3
        ? 150 + (index % 100) // BBB: 150-250 bps
        : 250 + (index % 100); // Speculative: 250-350 bps

    const minThreshold = baseSpread - 20;
    const rateIndex = pick(RATE_INDEX_CODES, index);
    const baseRate = rateIndex === "FIXED" ? 5.5 : 4.5 + (index % 20) / 100;

    SNAPSHOT_DATES.forEach((asOfDate, monthIndex) => {
      const spreadChange = monthIndex === 0 ? 0 : (index % 25) - 10; // -10 to +15 bps
      const spread = clamp(baseSpread + spreadChange, 100, 350);
      const allInRate = baseRate + spread / 100;
      const belowThreshold = spread < minThreshold;

      facilityPricingSnapshot.push({
        facility_pricing_id: `FPS-${padId(pricingSeq, 6)}`,
        facility_id: facility.facility_id,
        as_of_date: asOfDate,
        base_rate_pct: roundTo(baseRate, 2),
        spread_bps: spread,
        all_in_rate_pct: roundTo(allInRate, 2),
        rate_index_code: rateIndex,
        rate_cap_pct: rateIndex === "FIXED" ? null : roundTo(allInRate + 2.5, 2),
        min_spread_threshold_bps: minThreshold,
        below_threshold_flag: belowThreshold,
        pricing_exception_flag: index % 8 === 0,
      });
      pricingSeq += 1;
    });
  });

  // 2. Facility Delinquency Snapshots (150 records: 50 facilities × 3 months)
  const facilityDelinquencySnapshot: FacilityDelinquencySnapshot[] = [];
  let delinquencySeq = 1;

  // Mark ~7 facilities as delinquent, ~3 as NPL
  const delinquentFacilityIndices = [5, 12, 18, 25, 32, 38, 44];
  const nplFacilityIndices = [12, 25, 38];

  l1.facilityMaster.forEach((facility, index) => {
    const isNPL = nplFacilityIndices.includes(index);
    const isDelinquent = delinquentFacilityIndices.includes(index) || isNPL;
    const exposure = l2.facilityExposureSnapshot.find(
      (e) =>
        e.facility_id === facility.facility_id && e.as_of_date === AS_OF_DATE
    );

    SNAPSHOT_DATES.forEach((asOfDate) => {
      let daysPastDue = 0;
      let status = "CURRENT";
      let bucket = "0";

      if (isDelinquent && asOfDate === AS_OF_DATE) {
        if (isNPL) {
          daysPastDue = 90 + (index % 20);
          status = "NPL";
          bucket = "90+";
        } else {
          daysPastDue = 15 + (index % 60);
          status = "DELINQUENT";
          if (daysPastDue < 30) bucket = "1-29";
          else if (daysPastDue < 60) bucket = "30-59";
          else bucket = "60-89";
        }
      }

      const overduePct = isDelinquent ? 0.05 + (index % 20) / 100 : 0;
      const overduePrincipal =
        exposure && isDelinquent
          ? exposure.gross_exposure_usd * overduePct * 0.6
          : 0;
      const overdueInterest =
        exposure && isDelinquent
          ? exposure.gross_exposure_usd * overduePct * 0.4
          : 0;

      facilityDelinquencySnapshot.push({
        delinquency_snapshot_id: `FDS-${padId(delinquencySeq, 6)}`,
        facility_id: facility.facility_id,
        counterparty_id: facility.counterparty_id,
        as_of_date: asOfDate,
        overdue_principal_amt: roundTo(overduePrincipal, 1),
        overdue_interest_amt: roundTo(overdueInterest, 1),
        total_overdue_amt: roundTo(overduePrincipal + overdueInterest, 1),
        days_past_due_max: daysPastDue,
        delinquency_status_code: status,
        delinquency_bucket_code: bucket,
      });
      delinquencySeq += 1;
    });
  });

  // 3. Facility Profitability Snapshots (150 records: 50 facilities × 3 months)
  const facilityProfitabilitySnapshot: FacilityProfitabilitySnapshot[] = [];
  let profitabilitySeq = 1;

  l1.facilityMaster.forEach((facility, index) => {
    const exposure = l2.facilityExposureSnapshot.find(
      (e) =>
        e.facility_id === facility.facility_id && e.as_of_date === AS_OF_DATE
    );
    const pricing = facilityPricingSnapshot.find(
      (p) =>
        p.facility_id === facility.facility_id && p.as_of_date === AS_OF_DATE
    );

    SNAPSHOT_DATES.forEach((asOfDate) => {
      const outstanding = exposure?.gross_exposure_usd || 0;
      const spread = pricing?.spread_bps || 200;
      const nim = clamp(1.5 + (spread / 100) * 0.5 + (index % 15) / 100, 1.5, 4.0);
      const nii = (outstanding * nim) / 100 / 12; // Monthly NII
      const totalRevenue = nii * 1.15; // Add fees
      const operatingExpense = totalRevenue * (0.4 + (index % 20) / 100); // 40-60% of revenue
      const roa = clamp(nim * 0.4 + (index % 10) / 100, 0.8, 1.5);
      const roe = clamp(roa * 10 + (index % 5), 8, 15);

      const debtService = nii * 0.6 + (outstanding * 0.02 / 12);
      const irSensitivity = clamp(spread / 100 * 0.3 + (index % 10) / 100, 0.1, 2.5);

      facilityProfitabilitySnapshot.push({
        profitability_snapshot_id: `FPS-${padId(profitabilitySeq, 6)}`,
        facility_id: facility.facility_id,
        as_of_date: asOfDate,
        net_interest_income_amt: roundTo(nii, 2),
        total_revenue_amt: roundTo(totalRevenue, 2),
        operating_expense_amt: roundTo(operatingExpense, 2),
        nim_pct: roundTo(nim, 2),
        roa_pct: roundTo(roa, 2),
        roe_pct: roundTo(roe, 2),
        total_debt_service_amt: roundTo(debtService, 2),
        interest_rate_sensitivity_pct: roundTo(irSensitivity, 2),
      });
      profitabilitySeq += 1;
    });
  });

  // 4. Risk Flags (25 records: ~12 FACILITY, ~13 COUNTERPARTY)
  const riskFlag: RiskFlag[] = [];
  let riskFlagSeq = 1;

  const flagDistribution = [
    "DETERIORATED",
    "DETERIORATED",
    "DETERIORATED",
    "DETERIORATED",
    "DETERIORATED",
    "DETERIORATED",
    "DETERIORATED",
    "DETERIORATED",
    "CRITICIZED",
    "CRITICIZED",
    "CRITICIZED",
    "CRITICIZED",
    "CRITICIZED",
    "CRITICIZED",
    "WATCH_LIST",
    "WATCH_LIST",
    "WATCH_LIST",
    "WATCH_LIST",
    "WATCH_LIST",
    "COVENANT_BREACH",
    "COVENANT_BREACH",
    "COVENANT_BREACH",
    "COVENANT_BREACH",
    "BELOW_THRESHOLD_SPREAD",
    "BELOW_THRESHOLD_SPREAD",
  ];

  // Facility-scoped flags (12)
  const facilitiesWithFlags = l1.facilityMaster.slice(0, 12);
  facilitiesWithFlags.forEach((facility, index) => {
    const flagCode = pick(flagDistribution, index);
    const severity =
      flagCode === "CRITICIZED"
        ? "CRITICAL"
        : flagCode === "DETERIORATED"
        ? pick(["HIGH", "MEDIUM"], index)
        : pick(["MEDIUM", "LOW"], index);

    riskFlag.push({
      risk_flag_id: `RF-${padId(riskFlagSeq, 6)}`,
      flag_scope: "FACILITY",
      facility_id: facility.facility_id,
      counterparty_id: null,
      flag_code: flagCode,
      flag_severity: severity,
      flag_description: `${flagCode} flag: ${facility.facility_type} showing signs of ${flagCode.toLowerCase()}.`,
      as_of_date: AS_OF_DATE,
    });
    riskFlagSeq += 1;
  });

  // Counterparty-scoped flags (13)
  const counterpartiesWithFlags = l1.counterparty.slice(0, 13);
  counterpartiesWithFlags.forEach((counterparty, index) => {
    const flagCode = pick(flagDistribution, index + 12);
    const severity =
      flagCode === "CRITICIZED"
        ? "CRITICAL"
        : flagCode === "DETERIORATED"
        ? pick(["HIGH", "MEDIUM"], index)
        : pick(["MEDIUM", "LOW"], index);

    riskFlag.push({
      risk_flag_id: `RF-${padId(riskFlagSeq, 6)}`,
      flag_scope: "COUNTERPARTY",
      facility_id: null,
      counterparty_id: counterparty.counterparty_id,
      flag_code: flagCode,
      flag_severity: severity,
      flag_description: `${flagCode} flag: ${counterparty.legal_name} showing signs of ${flagCode.toLowerCase()}.`,
      as_of_date: AS_OF_DATE,
    });
    riskFlagSeq += 1;
  });

  // 5. Counterparty Rating Observations (40 records)
  const counterpartyRatingObservation: CounterpartyRatingObservation[] = [];
  let ratingObsSeq = 1;

  l1.counterparty.forEach((counterparty, index) => {
    const currentInternal = counterparty.internal_risk_rating.toString();
    const currentExternal = counterparty.external_rating_sp;

    // Most are stable, ~5 downgrades, ~3 upgrades
    const isDowngrade = [3, 8, 15, 22, 28].includes(index);
    const isUpgrade = [5, 12, 20].includes(index);

    // Internal rating observation
    const priorInternal = isDowngrade
      ? String(Math.max(1, parseInt(currentInternal) - 1))
      : isUpgrade
      ? String(Math.min(5, parseInt(currentInternal) + 1))
      : currentInternal;

    counterpartyRatingObservation.push({
      observation_id: `CRO-${padId(ratingObsSeq, 6)}`,
      counterparty_id: counterparty.counterparty_id,
      rating_type: "INTERNAL",
      rating_agency: "Internal",
      rating_value: currentInternal,
      prior_rating_value: priorInternal,
      rating_date: `2025-${padId((index % 6) + 6, 2)}-${padId((index % 20) + 10, 2)}`,
      as_of_date: AS_OF_DATE,
    });
    ratingObsSeq += 1;

    // External rating observation (only for ~30 counterparties)
    if (index < 30) {
      const externalRatings = ["CCC", "B", "BB", "BBB", "A", "AA"];
      const currentIdx = externalRatings.indexOf(currentExternal);
      const priorExternal = isDowngrade && currentIdx > 0
        ? externalRatings[currentIdx - 1]
        : isUpgrade && currentIdx < externalRatings.length - 1
        ? externalRatings[currentIdx + 1]
        : currentExternal;

      counterpartyRatingObservation.push({
        observation_id: `CRO-${padId(ratingObsSeq, 6)}`,
        counterparty_id: counterparty.counterparty_id,
        rating_type: "EXTERNAL",
        rating_agency: pick(RATING_AGENCIES.slice(1), index), // Skip "Internal"
        rating_value: currentExternal,
        prior_rating_value: priorExternal,
        rating_date: `2025-${padId((index % 6) + 6, 2)}-${padId((index % 20) + 10, 2)}`,
        as_of_date: AS_OF_DATE,
      });
      ratingObsSeq += 1;
    }
  });

  // 6. Limit Definitions (20 records: ~12 LOB_L2, ~8 COUNTERPARTY)
  const limitDefinition: LimitDefinition[] = [];
  let limitDefSeq = 1;

  // LOB_L2 limits (one per active L2 LoB)
  const activeL2Lobs = LOB_HIERARCHY.flatMap((l1) =>
    l1.l2.map((l2) => ({ l1: l1.l1, l2 }))
  ).slice(0, 12);

  activeL2Lobs.forEach((lob, index) => {
    const limitAmount =
      lob.l1 === "Corporate Banking" || lob.l1 === "Commercial Real Estate"
        ? 2000 + (index % 6) * 1000 // $2B-$8B
        : 500 + (index % 3) * 500; // $500M-$2B

    limitDefinition.push({
      limit_definition_id: `LIM-${padId(limitDefSeq, 3)}`,
      limit_scope: "LOB_L2",
      counterparty_id: null,
      lob_l2_name: lob.l2,
      limit_type: pick(LIMIT_TYPES, index),
      risk_tier: pick(RISK_TIERS, index),
      limit_amount_usd: limitAmount,
      inner_threshold_pct: roundTo(0.75 + (index % 10) / 100, 2), // 75%-85%
      outer_threshold_pct: roundTo(0.9 + (index % 10) / 100, 2), // 90%-100%
      as_of_date: AS_OF_DATE,
    });
    limitDefSeq += 1;
  });

  // COUNTERPARTY limits (8 largest counterparties)
  const largestCounterparties = l1.counterparty
    .slice()
    .sort((a, b) => {
      const aExposure = l2.facilityExposureSnapshot
        .filter((e) => e.counterparty_id === a.counterparty_id)
        .reduce((sum, e) => sum + e.gross_exposure_usd, 0);
      const bExposure = l2.facilityExposureSnapshot
        .filter((e) => e.counterparty_id === b.counterparty_id)
        .reduce((sum, e) => sum + e.gross_exposure_usd, 0);
      return bExposure - aExposure;
    })
    .slice(0, 8);

  largestCounterparties.forEach((counterparty, index) => {
    const exposure = l2.facilityExposureSnapshot
      .filter((e) => e.counterparty_id === counterparty.counterparty_id)
      .reduce((sum, e) => sum + e.gross_exposure_usd, 0);
    const limitAmount = exposure * (1.2 + (index % 5) * 0.1); // 120%-170% of exposure

    limitDefinition.push({
      limit_definition_id: `LIM-${padId(limitDefSeq, 3)}`,
      limit_scope: "COUNTERPARTY",
      counterparty_id: counterparty.counterparty_id,
      lob_l2_name: null,
      limit_type: "Single Counterparty",
      risk_tier: pick(RISK_TIERS, index),
      limit_amount_usd: roundTo(limitAmount, 1),
      inner_threshold_pct: roundTo(0.75 + (index % 10) / 100, 2),
      outer_threshold_pct: roundTo(0.9 + (index % 10) / 100, 2),
      as_of_date: AS_OF_DATE,
    });
    limitDefSeq += 1;
  });

  // 7. Limit Utilization Events (60 records: 20 limits × 3 months)
  const limitUtilizationEvent: LimitUtilizationEvent[] = [];
  let utilizationEventSeq = 1;

  limitDefinition.forEach((limit, limitIndex) => {
    SNAPSHOT_DATES.forEach((asOfDate, monthIndex) => {
      const utilizationPct = clamp(
        0.4 + (limitIndex * 3 + monthIndex * 2) / 100,
        0.4,
        0.98
      );
      const utilized = limit.limit_amount_usd * utilizationPct;

      limitUtilizationEvent.push({
        utilization_event_id: `LUE-${padId(utilizationEventSeq, 6)}`,
        limit_definition_id: limit.limit_definition_id,
        utilized_amount_usd: roundTo(utilized, 1),
        as_of_date: asOfDate,
      });
      utilizationEventSeq += 1;
    });
  });

  // 8. Financial Metric Observations (facility-level: DSCR, LTV, FCCR)
  const financialMetricObservation: FinancialMetricObservation[] = [];
  let metricObsSeq = 1;

  l1.facilityMaster.forEach((facility, index) => {
    // DSCR
    const dscr = clamp(0.8 + (index % 22) / 10, 0.8, 3.0);
    financialMetricObservation.push({
      observation_id: `FMO-${padId(metricObsSeq, 6)}`,
      metric_code: "DSCR",
      metric_name: "Debt Service Coverage Ratio",
      facility_id: facility.facility_id,
      counterparty_id: null,
      metric_value: roundTo(dscr, 2),
      as_of_date: AS_OF_DATE,
    });
    metricObsSeq += 1;

    // LTV (only for CRE facilities)
    if (facility.lob_l1_name === "Commercial Real Estate") {
      const ltv = clamp(0.4 + (index % 55) / 100, 0.4, 0.95);
      financialMetricObservation.push({
        observation_id: `FMO-${padId(metricObsSeq, 6)}`,
        metric_code: "LTV",
        metric_name: "Loan-to-Value",
        facility_id: facility.facility_id,
        counterparty_id: null,
        metric_value: roundTo(ltv, 2),
        as_of_date: AS_OF_DATE,
      });
      metricObsSeq += 1;
    }

    // FCCR - Fixed Charge Coverage Ratio: (EBITDA - Capex) / (Interest + Lease)
    // Generate for ~70% of facilities (those with sufficient financial data)
    if (index % 10 < 7) {
      const fccr = clamp(0.9 + (index % 30) / 10, 0.9, 3.5);
      financialMetricObservation.push({
        observation_id: `FMO-${padId(metricObsSeq, 6)}`,
        metric_code: "FCCR",
        metric_name: "Fixed Charge Coverage Ratio",
        facility_id: facility.facility_id,
        counterparty_id: null,
        metric_value: roundTo(fccr, 2),
        as_of_date: AS_OF_DATE,
      });
      metricObsSeq += 1;
    }
  });

  // 9. Counterparty-level Financial Metrics: Tangible Net Worth (TNW)
  // TNW = Total Equity - Intangible Assets (Goodwill, Patents, etc.)
  // Stored as counterparty-level observation, attributed to each facility via counterparty_id
  const counterpartiesWithTnw = l1.counterparty.slice(0, Math.ceil(l1.counterparty.length * 0.8));
  counterpartiesWithTnw.forEach((counterparty, index) => {
    // TNW scales with counterparty size; GSIB counterparties range from $50M to $5B
    const riskRating = counterparty.internal_risk_rating;
    const baseTnw = riskRating <= 2
      ? 500 + (index % 20) * 100   // Investment grade: $500M-$2.5B
      : riskRating <= 4
      ? 100 + (index % 15) * 50    // BBB/BB: $100M-$850M
      : 20 + (index % 10) * 10;    // Speculative: $20M-$120M
    const tnw = roundTo(baseTnw, 1);

    financialMetricObservation.push({
      observation_id: `FMO-${padId(metricObsSeq, 6)}`,
      metric_code: "TNW",
      metric_name: "Tangible Net Worth",
      facility_id: null,
      counterparty_id: counterparty.counterparty_id,
      metric_value: tnw,
      as_of_date: AS_OF_DATE,
    });
    metricObsSeq += 1;
  });

  return {
    facilityPricingSnapshot,
    facilityDelinquencySnapshot,
    facilityProfitabilitySnapshot,
    riskFlag,
    counterpartyRatingObservation,
    limitDefinition,
    limitUtilizationEvent,
    financialMetricObservation,
  };
};
