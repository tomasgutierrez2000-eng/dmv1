import { L1Data } from "../generators/l1-generators";
import { L2Data } from "../generators/l2-generators";
import { L2EnrichmentData } from "../generators/l2-generators-enrichment";
import { FacilitySummary } from "../types";

const TODAY = "2026-02-12";
const AS_OF_DATE = "2026-02-28";

const roundTo = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const parseDate = (value: string) => new Date(`${value}T00:00:00Z`);

const daysBetween = (from: string, to: string) => {
  const start = parseDate(from);
  const end = parseDate(to);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const classifyPortfolio = (
  internalRating: number,
  product: string,
  region: string
) => {
  if (internalRating <= 2) return "Investment Grade";
  if (internalRating === 3) {
    return product === "Derivatives" || product === "SFT" ? "Leveraged" : "Commercial";
  }
  if (internalRating === 4) {
    return region === "APAC" || region === "LATAM" ? "Emerging Markets" : "High Yield";
  }
  return "Distressed";
};

export const assembleFacilitySummary = (
  l1: L1Data,
  l2: L2Data,
  l2Enrichment: L2EnrichmentData
): FacilitySummary[] => {
  const counterpartyById = new Map(
    l1.counterparty.map((counterparty) => [counterparty.counterparty_id, counterparty])
  );
  const legalEntityById = new Map(
    l1.legalEntity.map((entity) => [entity.legal_entity_id, entity])
  );
  const industryById = new Map(
    l1.industryDim.map((industry) => [industry.industry_id, industry])
  );
  const fr2590ByCode = new Map(
    l1.fr2590CategoryDim.map((fr) => [fr.fr2590_category_code, fr])
  );

  const participationByFacility = new Map<string, string[]>();
  l1.facilityCounterpartyParticipation.forEach((participation) => {
    const existing = participationByFacility.get(participation.facility_id) ?? [];
    existing.push(participation.counterparty_id);
    participationByFacility.set(participation.facility_id, existing);
  });

  const exposuresByFacility = new Map<string, typeof l2.facilityExposureSnapshot>();
  l2.facilityExposureSnapshot.forEach((snapshot) => {
    const list = exposuresByFacility.get(snapshot.facility_id) ?? [];
    list.push(snapshot);
    exposuresByFacility.set(snapshot.facility_id, list);
  });

  const collateralByFacility = new Map<string, typeof l2.collateralSnapshot>();
  l2.collateralSnapshot.forEach((snapshot) => {
    const list = collateralByFacility.get(snapshot.facility_id) ?? [];
    list.push(snapshot);
    collateralByFacility.set(snapshot.facility_id, list);
  });

  const amendmentsByFacility = new Map<string, typeof l2.amendmentEvent>();
  l2.amendmentEvent.forEach((event) => {
    if (!event.facility_id) return;
    const list = amendmentsByFacility.get(event.facility_id) ?? [];
    list.push(event);
    amendmentsByFacility.set(event.facility_id, list);
  });

  // Enrichment data maps
  const pricingByFacility = new Map<string, typeof l2Enrichment.facilityPricingSnapshot>();
  l2Enrichment.facilityPricingSnapshot.forEach((snapshot) => {
    const list = pricingByFacility.get(snapshot.facility_id) ?? [];
    list.push(snapshot);
    pricingByFacility.set(snapshot.facility_id, list);
  });

  const delinquencyByFacility = new Map<string, typeof l2Enrichment.facilityDelinquencySnapshot>();
  l2Enrichment.facilityDelinquencySnapshot.forEach((snapshot) => {
    const list = delinquencyByFacility.get(snapshot.facility_id) ?? [];
    list.push(snapshot);
    delinquencyByFacility.set(snapshot.facility_id, list);
  });

  const profitabilityByFacility = new Map<string, typeof l2Enrichment.facilityProfitabilitySnapshot>();
  l2Enrichment.facilityProfitabilitySnapshot.forEach((snapshot) => {
    const list = profitabilityByFacility.get(snapshot.facility_id) ?? [];
    list.push(snapshot);
    profitabilityByFacility.set(snapshot.facility_id, list);
  });

  const riskFlagsByFacility = new Map<string, typeof l2Enrichment.riskFlag>();
  const riskFlagsByCounterparty = new Map<string, typeof l2Enrichment.riskFlag>();
  l2Enrichment.riskFlag.forEach((flag) => {
    if (flag.flag_scope === "FACILITY" && flag.facility_id) {
      const list = riskFlagsByFacility.get(flag.facility_id) ?? [];
      list.push(flag);
      riskFlagsByFacility.set(flag.facility_id, list);
    } else if (flag.flag_scope === "COUNTERPARTY" && flag.counterparty_id) {
      const list = riskFlagsByCounterparty.get(flag.counterparty_id) ?? [];
      list.push(flag);
      riskFlagsByCounterparty.set(flag.counterparty_id, list);
    }
  });

  const ratingObsByCounterparty = new Map<string, typeof l2Enrichment.counterpartyRatingObservation>();
  l2Enrichment.counterpartyRatingObservation.forEach((obs) => {
    const list = ratingObsByCounterparty.get(obs.counterparty_id) ?? [];
    list.push(obs);
    ratingObsByCounterparty.set(obs.counterparty_id, list);
  });

  const metricsByFacility = new Map<string, typeof l2Enrichment.financialMetricObservation>();
  l2Enrichment.financialMetricObservation.forEach((obs) => {
    if (obs.facility_id) {
      const list = metricsByFacility.get(obs.facility_id) ?? [];
      list.push(obs);
      metricsByFacility.set(obs.facility_id, list);
    }
  });

  const limitDefByCounterparty = new Map<string, typeof l2Enrichment.limitDefinition[number]>();
  l2Enrichment.limitDefinition.forEach((limit) => {
    if (limit.limit_scope === "COUNTERPARTY" && limit.counterparty_id) {
      limitDefByCounterparty.set(limit.counterparty_id, limit);
    }
  });

  const limitUtilByLimit = new Map<string, typeof l2Enrichment.limitUtilizationEvent>();
  l2Enrichment.limitUtilizationEvent.forEach((event) => {
    const list = limitUtilByLimit.get(event.limit_definition_id) ?? [];
    list.push(event);
    limitUtilByLimit.set(event.limit_definition_id, list);
  });

  return l1.facilityMaster.map((facility) => {
    const exposures = exposuresByFacility.get(facility.facility_id) ?? [];
    const sortedExposures = exposures.sort((a, b) =>
      a.as_of_date < b.as_of_date ? 1 : -1
    );
    const latestExposure = sortedExposures[0];
    const priorExposure = sortedExposures[1] ?? sortedExposures[0];
    const exposureLegalEntityId = latestExposure?.legal_entity_id ?? "";

    const counterparty = counterpartyById.get(facility.counterparty_id);
    const legalEntity = legalEntityById.get(exposureLegalEntityId);
    const industry = industryById.get(facility.industry_code);
    const fr2590 = latestExposure
      ? fr2590ByCode.get(latestExposure.fr2590_category_code)
      : undefined;

    const participationIds = participationByFacility.get(facility.facility_id) ?? [];
    const uniqueParticipationIds = Array.from(new Set(participationIds));

    const collateral = collateralByFacility.get(facility.facility_id) ?? [];
    const totalMitigantAmount = collateral.reduce(
      (sum, item) => sum + item.allocated_amount_usd,
      0
    );
    const primaryCollateral = collateral.reduce((max, item) => {
      if (!max) return item;
      return item.allocated_amount_usd > max.allocated_amount_usd ? item : max;
    }, null as (typeof l2.collateralSnapshot)[number] | null);

    const amendments = amendmentsByFacility.get(facility.facility_id) ?? [];
    const latestAmendment = amendments.sort((a, b) =>
      a.identified_date < b.identified_date ? 1 : -1
    )[0];

    const distinctLegalEntities = new Set(exposures.map((exp) => exp.legal_entity_id));
    const crossEntityExposure = exposures
      .filter((exp) => exp.legal_entity_id !== exposureLegalEntityId)
      .reduce((sum, exp) => sum + exp.gross_exposure_usd, 0);

    const utilizationPct =
      facility.committed_facility_amt > 0 && latestExposure
        ? latestExposure.drawn_amount / facility.committed_facility_amt
        : 0;
    const exposureChangePct =
      priorExposure && priorExposure.gross_exposure_usd > 0 && latestExposure
        ? (latestExposure.gross_exposure_usd - priorExposure.gross_exposure_usd) /
          priorExposure.gross_exposure_usd
        : 0;
    const exposureTrend =
      exposureChangePct > 0.02 ? "UP" : exposureChangePct < -0.02 ? "DOWN" : "FLAT";

    const amendmentStartDate = latestAmendment?.identified_date ?? null;
    const amendmentAging =
      amendmentStartDate !== null ? daysBetween(amendmentStartDate, TODAY) : null;

    const isActive =
      facility.facility_status === "Active" &&
      facility.maturity_date >= TODAY;

    // Enrichment: Pricing
    const pricingSnapshots = pricingByFacility.get(facility.facility_id) ?? [];
    const sortedPricing = pricingSnapshots.sort((a, b) =>
      a.as_of_date < b.as_of_date ? 1 : -1
    );
    const latestPricing = sortedPricing.find((p) => p.as_of_date === AS_OF_DATE);
    const priorPricing = sortedPricing.find((p) => p.as_of_date === "2026-01-31");
    const spreadBps = latestPricing?.spread_bps ?? 0;
    const priorSpreadBps = priorPricing?.spread_bps ?? spreadBps;

    // Enrichment: Delinquency
    const delinquencySnapshots = delinquencyByFacility.get(facility.facility_id) ?? [];
    const latestDelinquency = delinquencySnapshots.find((d) => d.as_of_date === AS_OF_DATE);
    const isDelinquent = latestDelinquency?.delinquency_status_code !== "CURRENT";

    // Enrichment: Profitability
    const profitabilitySnapshots = profitabilityByFacility.get(facility.facility_id) ?? [];
    const latestProfitability = profitabilitySnapshots.find((p) => p.as_of_date === AS_OF_DATE);

    // Enrichment: Risk Flags
    const facilityFlags = riskFlagsByFacility.get(facility.facility_id) ?? [];
    const counterpartyFlags = riskFlagsByCounterparty.get(facility.counterparty_id) ?? [];
    const allFlags = [...facilityFlags, ...counterpartyFlags];
    const isDeteriorated = allFlags.some((f) => f.flag_code === "DETERIORATED");
    const isCriticized = allFlags.some((f) => f.flag_code === "CRITICIZED");
    const isWatchList = allFlags.some((f) => f.flag_code === "WATCH_LIST");
    const hasCovenantBreach = allFlags.some((f) => f.flag_code === "COVENANT_BREACH");
    const severities = allFlags.map((f) => f.flag_severity);
    const highestSeverity =
      severities.includes("CRITICAL")
        ? "CRITICAL"
        : severities.includes("HIGH")
        ? "HIGH"
        : severities.includes("MEDIUM")
        ? "MEDIUM"
        : severities.includes("LOW")
        ? "LOW"
        : null;

    // Enrichment: Rating Observations
    const ratingObs = ratingObsByCounterparty.get(facility.counterparty_id) ?? [];
    const internalObs = ratingObs.find(
      (obs) => obs.rating_type === "INTERNAL" && obs.as_of_date === AS_OF_DATE
    );
    const externalObs = ratingObs.find(
      (obs) => obs.rating_type === "EXTERNAL" && obs.as_of_date === AS_OF_DATE
    );
    const internalRatingPrior = internalObs?.prior_rating_value ?? null;
    const externalRatingPrior = externalObs?.prior_rating_value ?? null;
    const currentInternal = counterparty?.internal_risk_rating.toString() ?? "";
    const currentExternal = counterparty?.external_rating_sp ?? "";
    const hasInternalDowngrade =
      internalRatingPrior !== null &&
      parseInt(currentInternal) > parseInt(internalRatingPrior);
    const externalRatings = ["CCC", "B", "BB", "BBB", "A", "AA"];
    const currentExternalIdx = externalRatings.indexOf(currentExternal);
    const priorExternalIdx = externalRatingPrior
      ? externalRatings.indexOf(externalRatingPrior)
      : -1;
    const hasExternalDowngrade =
      priorExternalIdx >= 0 && currentExternalIdx < priorExternalIdx;
    const hasAnyDowngrade = hasInternalDowngrade || hasExternalDowngrade;

    // Enrichment: Financial Metrics
    const metrics = metricsByFacility.get(facility.facility_id) ?? [];
    const dscr = metrics.find((m) => m.metric_code === "DSCR")?.metric_value ?? null;
    const ltv = metrics.find((m) => m.metric_code === "LTV")?.metric_value ?? null;
    const fccr = metrics.find((m) => m.metric_code === "FCCR")?.metric_value ?? null;

    // Enrichment: Limits
    const counterpartyLimit = limitDefByCounterparty.get(facility.counterparty_id);
    const limitUtilEvents = counterpartyLimit
      ? limitUtilByLimit.get(counterpartyLimit.limit_definition_id) ?? []
      : [];
    const latestLimitUtil = limitUtilEvents
      .sort((a, b) => (a.as_of_date < b.as_of_date ? 1 : -1))
      .find((e) => e.as_of_date === AS_OF_DATE);
    const limitUtilized = latestLimitUtil?.utilized_amount_usd ?? null;
    const limitAmount = counterpartyLimit?.limit_amount_usd ?? null;
    let limitStatus: string | null = null;
    if (limitAmount && limitUtilized !== null && counterpartyLimit) {
      const utilPct = limitUtilized / limitAmount;
      if (utilPct >= (counterpartyLimit.outer_threshold_pct ?? 0.95)) {
        limitStatus = "Breach";
      } else if (utilPct >= (counterpartyLimit.inner_threshold_pct ?? 0.8)) {
        limitStatus = "Warning";
      } else {
        limitStatus = "No Breach";
      }
    }

    return {
      facility_id: facility.facility_id,
      credit_agreement_id: facility.credit_agreement_id,
      counterparty_id: facility.counterparty_id,
      facility_type: facility.facility_type,
      product: facility.product_id,
      lob_l1_name: facility.lob_l1_name,
      lob_l2_name: facility.lob_l2_name,
      lob_l3_name: facility.lob_l3_name,
      region: facility.region_code,
      committed_amount_usd: facility.committed_facility_amt,
      effective_date: facility.origination_date,
      maturity_date: facility.maturity_date,
      facility_status: facility.facility_status,
      utilized_amount_usd: latestExposure?.drawn_amount ?? 0,
      outstanding_exposure_usd: latestExposure?.gross_exposure_usd ?? 0,
      undrawn_amount_usd: latestExposure?.undrawn_amount ?? 0,
      prior_month_exposure_usd: priorExposure?.gross_exposure_usd ?? 0,
      as_of_date: latestExposure?.as_of_date ?? "",
      counterparty_name: counterparty?.legal_name ?? "",
      internal_risk_rating: counterparty?.internal_risk_rating ?? 0,
      external_risk_rating: counterparty?.external_rating_sp ?? "",
      legal_entity_id: exposureLegalEntityId,
      legal_entity_name: legalEntity?.legal_name ?? "",
      fr2590_category: fr2590?.category_name ?? "",
      industry: industry?.industry_name ?? "",
      amendment_type: latestAmendment?.amendment_type ?? null,
      amendment_subtype: latestAmendment?.amendment_subtype ?? null,
      amendment_status: latestAmendment?.amendment_status ?? null,
      amendment_start_date: amendmentStartDate,
      participating_counterparty_ids: uniqueParticipationIds,
      risk_mitigant_type: primaryCollateral?.mitigant_group_code ?? null,
      risk_mitigant_subtype: primaryCollateral?.mitigant_subtype ?? null,
      risk_mitigant_amount_usd: roundTo(totalMitigantAmount, 1),
      cross_entity_exposure_usd: roundTo(crossEntityExposure, 1),
      portfolio: classifyPortfolio(
        counterparty?.internal_risk_rating ?? 3,
        facility.product_id,
        facility.region_code
      ),
      is_syndicated: uniqueParticipationIds.length > 1,
      utilization_pct: roundTo(utilizationPct, 4),
      is_active: isActive,
      days_remaining: daysBetween(TODAY, facility.maturity_date),
      coverage_ratio_pct:
        latestExposure && latestExposure.gross_exposure_usd > 0
          ? roundTo(totalMitigantAmount / latestExposure.gross_exposure_usd, 4)
          : 0,
      has_amendment: amendments.length > 0,
      has_active_amendment: amendments.some(
        (event) =>
          event.amendment_status !== "Complete" && event.amendment_status !== "Rejected"
      ),
      amendment_aging_days: amendmentAging,
      has_cross_entity_exposure: distinctLegalEntities.size > 1,
      exposure_change_pct: roundTo(exposureChangePct, 4),
      exposure_trend_direction: exposureTrend,

      // Enrichment fields - Pricing
      spread_bps: latestPricing?.spread_bps ?? 0,
      base_rate_pct: latestPricing?.base_rate_pct ?? 0,
      all_in_rate_pct: latestPricing?.all_in_rate_pct ?? 0,
      rate_index_code: latestPricing?.rate_index_code ?? "",
      rate_cap_pct: latestPricing?.rate_cap_pct ?? null,
      below_threshold_flag: latestPricing?.below_threshold_flag ?? false,
      prior_month_spread_bps: priorSpreadBps,
      spread_change_bps: spreadBps - priorSpreadBps,

      // Enrichment fields - Delinquency
      total_overdue_amt: latestDelinquency?.total_overdue_amt ?? 0,
      days_past_due_max: latestDelinquency?.days_past_due_max ?? 0,
      delinquency_status_code: latestDelinquency?.delinquency_status_code ?? "CURRENT",
      delinquency_bucket_code: latestDelinquency?.delinquency_bucket_code ?? "0",
      is_delinquent: isDelinquent,

      // Enrichment fields - Pricing Exception
      pricing_exception_flag: latestPricing?.pricing_exception_flag ?? false,

      // Enrichment fields - Profitability
      net_interest_income_amt: latestProfitability?.net_interest_income_amt ?? 0,
      total_revenue_amt: latestProfitability?.total_revenue_amt ?? 0,
      nim_pct: latestProfitability?.nim_pct ?? 0,
      roa_pct: latestProfitability?.roa_pct ?? 0,
      roe_pct: latestProfitability?.roe_pct ?? 0,
      total_debt_service_amt: latestProfitability?.total_debt_service_amt ?? 0,
      interest_rate_sensitivity_pct: latestProfitability?.interest_rate_sensitivity_pct ?? 0,

      // Enrichment fields - RWA & Rating Bucket
      rwa_amt: latestExposure?.rwa_amt ?? 0,
      internal_risk_rating_bucket_code: latestExposure?.internal_risk_rating_bucket_code ?? "",
      return_on_rwa_pct: roundTo(
        (latestExposure?.rwa_amt ?? 0) > 0
          ? ((latestProfitability?.total_revenue_amt ?? 0) / (latestExposure?.rwa_amt ?? 1)) * 100
          : 0,
        2
      ),

      // Enrichment fields - Risk Flags
      is_deteriorated: isDeteriorated,
      is_criticized: isCriticized,
      is_watch_list: isWatchList,
      has_covenant_breach: hasCovenantBreach,
      risk_flag_count: allFlags.length,
      highest_flag_severity: highestSeverity,

      // Enrichment fields - Rating History
      internal_rating_prior: internalRatingPrior,
      external_rating_prior: externalRatingPrior,
      has_internal_downgrade: hasInternalDowngrade,
      has_external_downgrade: hasExternalDowngrade,
      has_any_downgrade: hasAnyDowngrade,

      // Enrichment fields - Financial Metrics
      dscr: dscr,
      ltv: ltv,
      fccr: fccr,

      // Enrichment fields - Limits
      counterparty_limit_usd: limitAmount,
      counterparty_limit_utilized_usd: limitUtilized,
      counterparty_limit_status: limitStatus,
    };
  });
};
