import { DeskSummary, FacilitySummary, LobL1Summary, LobL2Summary } from "../types";
import { L2EnrichmentData } from "../generators/l2-generators-enrichment";

const AS_OF_DATE = "2026-02-28";
const PRIOR_MONTH_DATE = "2026-01-31";

const roundTo = (value: number, decimals = 4) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const weightedAverage = (
  values: number[],
  weights: number[]
): number => {
  if (values.length === 0 || weights.length === 0) return 0;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = values.reduce(
    (sum, val, idx) => sum + val * (weights[idx] || 0),
    0
  );
  return weightedSum / totalWeight;
};

const calculateLimitStatus = (
  utilized: number,
  limit: number,
  innerThreshold: number,
  outerThreshold: number
): string => {
  const utilPct = utilized / limit;
  if (utilPct >= outerThreshold) return "Breach";
  if (utilPct >= innerThreshold) return "Warning";
  return "No Breach";
};

export const assembleRollups = (
  facilitySummaries: FacilitySummary[],
  l2Enrichment: L2EnrichmentData
): {
  deskSummary: DeskSummary[];
  lobL2Summary: LobL2Summary[];
  lobL1Summary: LobL1Summary[];
} => {
  // Group by desk (l1 + l2 + l3)
  const byDesk = new Map<string, FacilitySummary[]>();
  facilitySummaries.forEach((facility) => {
    const key = `${facility.lob_l1_name}|${facility.lob_l2_name}|${facility.lob_l3_name}`;
    const list = byDesk.get(key) ?? [];
    list.push(facility);
    byDesk.set(key, list);
  });

  // Group by L2 LoB (l1 + l2)
  const byL2Lob = new Map<string, FacilitySummary[]>();
  facilitySummaries.forEach((facility) => {
    const key = `${facility.lob_l1_name}|${facility.lob_l2_name}`;
    const list = byL2Lob.get(key) ?? [];
    list.push(facility);
    byL2Lob.set(key, list);
  });

  // Group by L1 LoB
  const byL1Lob = new Map<string, FacilitySummary[]>();
  facilitySummaries.forEach((facility) => {
    const list = byL1Lob.get(facility.lob_l1_name) ?? [];
    list.push(facility);
    byL1Lob.set(facility.lob_l1_name, list);
  });

  // Limit definitions by L2 LoB
  const limitByL2Lob = new Map<string, typeof l2Enrichment.limitDefinition[number]>();
  l2Enrichment.limitDefinition.forEach((limit) => {
    if (limit.limit_scope === "LOB_L2" && limit.lob_l2_name) {
      limitByL2Lob.set(limit.lob_l2_name, limit);
    }
  });

  // Limit utilization by limit ID
  const limitUtilByLimitId = new Map<string, typeof l2Enrichment.limitUtilizationEvent[number]>();
  l2Enrichment.limitUtilizationEvent.forEach((event) => {
    const existing = limitUtilByLimitId.get(event.limit_definition_id);
    if (!existing || event.as_of_date > existing.as_of_date) {
      limitUtilByLimitId.set(event.limit_definition_id, event);
    }
  });

  // Calculate DOI: counterparties appearing in 2+ L2 LoBs
  const counterpartyByL2Lob = new Map<string, Set<string>>();
  facilitySummaries.forEach((facility) => {
    const key = `${facility.lob_l1_name}|${facility.lob_l2_name}`;
    const set = counterpartyByL2Lob.get(key) ?? new Set();
    set.add(facility.counterparty_id);
    counterpartyByL2Lob.set(key, set);
  });
  const counterpartyL2LobCount = new Map<string, number>();
  counterpartyByL2Lob.forEach((counterparties) => {
    counterparties.forEach((cpId) => {
      counterpartyL2LobCount.set(cpId, (counterpartyL2LobCount.get(cpId) ?? 0) + 1);
    });
  });
  const interconnectedCounterparties = new Set(
    Array.from(counterpartyL2LobCount.entries())
      .filter(([_, count]) => count > 1)
      .map(([cpId]) => cpId)
  );

  // Helper to aggregate facility data
  const aggregateFacilities = (
    facilities: FacilitySummary[],
    includePriorMonth = false
  ) => {
    const exposures = facilities.map((f) => f.outstanding_exposure_usd);
    const totalExposure = facilities.reduce(
      (sum, f) => sum + f.outstanding_exposure_usd,
      0
    );
    const totalCommitted = facilities.reduce(
      (sum, f) => sum + f.committed_amount_usd,
      0
    );
    const totalUtilized = facilities.reduce(
      (sum, f) => sum + f.utilized_amount_usd,
      0
    );
    const utilizationPct =
      totalCommitted > 0 ? totalUtilized / totalCommitted : 0;

    const priorMonthExposure = includePriorMonth
      ? facilities.reduce((sum, f) => sum + f.prior_month_exposure_usd, 0)
      : 0;
    const exposureChangePct =
      priorMonthExposure > 0
        ? (totalExposure - priorMonthExposure) / priorMonthExposure
        : 0;

    const spreads = facilities.map((f) => f.spread_bps);
    const baseRates = facilities.map((f) => f.base_rate_pct);
    const allInRates = facilities.map((f) => f.all_in_rate_pct);
    const coverageRatios = facilities.map((f) => f.coverage_ratio_pct);
    const riskRatings = facilities.map((f) => f.internal_risk_rating);

    const avgSpread = weightedAverage(spreads, exposures);
    const avgBaseRate = weightedAverage(baseRates, exposures);
    const avgAllInRate = weightedAverage(allInRates, exposures);
    const avgCoverageRatio = weightedAverage(coverageRatios, exposures);
    const avgRiskRating = weightedAverage(riskRatings, exposures);

    const exceptionCount = facilities.filter((f) => f.below_threshold_flag).length;
    const delinquentCount = facilities.filter((f) => f.is_delinquent).length;
    const delinquencyRate =
      facilities.length > 0 ? delinquentCount / facilities.length : 0;
    const deterioratedCount = facilities.filter((f) => f.is_deteriorated).length;
    const criticizedCount = facilities.filter((f) => f.is_criticized).length;
    const downgradeCount = facilities.filter((f) => f.has_any_downgrade).length;

    const dscrs = facilities
      .map((f) => f.dscr)
      .filter((d): d is number => d !== null);
    const ltvs = facilities
      .map((f) => f.ltv)
      .filter((l): l is number => l !== null);
    const fccrs = facilities
      .map((f) => f.fccr)
      .filter((v): v is number => v !== null);
    const tnws = facilities
      .map((f) => f.tangible_net_worth_usd)
      .filter((v): v is number => v !== null);
    const avgDscr =
      dscrs.length > 0
        ? weightedAverage(dscrs, dscrs.map((_, i) => exposures[i]))
        : null;
    const avgLtv =
      ltvs.length > 0
        ? weightedAverage(ltvs, ltvs.map((_, i) => exposures[i]))
        : null;
    const avgFccr =
      fccrs.length > 0
        ? weightedAverage(fccrs, fccrs.map((_, i) => exposures[i]))
        : null;
    const avgTnw =
      tnws.length > 0
        ? weightedAverage(tnws, tnws.map((_, i) => exposures[i]))
        : null;

    // EAD & Expected Loss
    const totalEad = facilities.reduce((sum, f) => sum + f.ead_usd, 0);
    const totalExpectedLoss = facilities.reduce(
      (sum, f) => sum + f.expected_loss_usd,
      0
    );
    const avgExpectedLossRate =
      totalExposure > 0 ? totalExpectedLoss / totalExposure : 0;

    // Cross-entity exposure
    const totalCrossEntityExposure = facilities.reduce(
      (sum, f) => sum + f.cross_entity_exposure_usd,
      0
    );
    const crossEntityFacilityCount = facilities.filter(
      (f) => f.has_cross_entity_exposure
    ).length;

    // Active count
    const activeFacilityCount = facilities.filter((f) => f.is_active).length;

    // Profitability
    const totalNii = facilities.reduce(
      (sum, f) => sum + f.net_interest_income_amt,
      0
    );
    const totalRevenue = facilities.reduce(
      (sum, f) => sum + f.total_revenue_amt,
      0
    );
    const nims = facilities.map((f) => f.nim_pct);
    const roas = facilities.map((f) => f.roa_pct);
    const avgNim = weightedAverage(nims, exposures);
    const avgRoa = weightedAverage(roas, exposures);

    // Concentration
    const byIndustry = new Map<string, number>();
    const byRegion = new Map<string, number>();
    facilities.forEach((f) => {
      byIndustry.set(
        f.industry,
        (byIndustry.get(f.industry) ?? 0) + f.outstanding_exposure_usd
      );
      byRegion.set(
        f.region,
        (byRegion.get(f.region) ?? 0) + f.outstanding_exposure_usd
      );
    });
    const topSector = Array.from(byIndustry.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topRegion = Array.from(byRegion.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topSectorPct =
      totalExposure > 0 ? (topSector?.[1] ?? 0) / totalExposure : 0;
    const topRegionPct =
      totalExposure > 0 ? (topRegion?.[1] ?? 0) / totalExposure : 0;

    const uniqueCounterparties = new Set(
      facilities.map((f) => f.counterparty_id)
    );
    const interconnectedInGroup = Array.from(uniqueCounterparties).filter(
      (cpId) => interconnectedCounterparties.has(cpId)
    );
    const doiPct =
      uniqueCounterparties.size > 0
        ? interconnectedInGroup.length / uniqueCounterparties.size
        : 0;

    return {
      facility_count: facilities.length,
      total_exposure_usd: roundTo(totalExposure, 1),
      total_committed_usd: roundTo(totalCommitted, 1),
      total_utilized_usd: roundTo(totalUtilized, 1),
      utilization_pct: roundTo(utilizationPct, 4),
      exposure_change_pct: roundTo(exposureChangePct, 4),
      avg_spread_bps: roundTo(avgSpread, 1),
      avg_base_rate_pct: roundTo(avgBaseRate, 2),
      avg_all_in_rate_pct: roundTo(avgAllInRate, 2),
      exception_count: exceptionCount,
      avg_coverage_ratio_pct: roundTo(avgCoverageRatio, 4),
      delinquent_facility_count: delinquentCount,
      delinquency_rate_pct: roundTo(delinquencyRate, 4),
      deteriorated_count: deterioratedCount,
      criticized_count: criticizedCount,
      downgrade_count: downgradeCount,
      avg_dscr: avgDscr !== null ? roundTo(avgDscr, 2) : null,
      avg_ltv: avgLtv !== null ? roundTo(avgLtv, 2) : null,
      avg_fccr: avgFccr !== null ? roundTo(avgFccr, 2) : null,
      avg_internal_risk_rating: roundTo(avgRiskRating, 2),
      total_ead_usd: roundTo(totalEad, 1),
      total_expected_loss_usd: roundTo(totalExpectedLoss, 2),
      avg_expected_loss_rate_pct: roundTo(avgExpectedLossRate, 6),
      total_cross_entity_exposure_usd: roundTo(totalCrossEntityExposure, 1),
      cross_entity_facility_count: crossEntityFacilityCount,
      active_facility_count: activeFacilityCount,
      avg_tangible_net_worth_usd: avgTnw !== null ? roundTo(avgTnw, 1) : null,
      prior_month_exposure_usd: roundTo(priorMonthExposure, 1),
      total_nii_amt: roundTo(totalNii, 2),
      total_revenue_amt: roundTo(totalRevenue, 2),
      avg_nim_pct: roundTo(avgNim, 2),
      avg_roa_pct: roundTo(avgRoa, 2),
      top_sector: topSector?.[0] ?? "",
      top_sector_pct: roundTo(topSectorPct, 4),
      top_region: topRegion?.[0] ?? "",
      top_region_pct: roundTo(topRegionPct, 4),
      unique_counterparty_count: uniqueCounterparties.size,
      doi_pct: roundTo(doiPct, 4),
    };
  };

  // Desk summaries
  const deskSummary: DeskSummary[] = Array.from(byDesk.entries()).map(
    ([key, facilities]) => {
      const [l1, l2, l3] = key.split("|");
      const agg = aggregateFacilities(facilities);

      // Prior month metrics
      const priorMonthPricing = facilities.map((f) => {
        const pricing = l2Enrichment.facilityPricingSnapshot.find(
          (p) =>
            p.facility_id === f.facility_id && p.as_of_date === PRIOR_MONTH_DATE
        );
        return pricing?.spread_bps ?? f.spread_bps;
      });
      const priorMonthAvgSpread =
        priorMonthPricing.length > 0
          ? weightedAverage(
              priorMonthPricing,
              facilities.map((f) => f.prior_month_exposure_usd)
            )
          : agg.avg_spread_bps;

      const priorMonthCoverage = facilities.map((f) => f.coverage_ratio_pct);
      const priorMonthAvgCoverage = weightedAverage(
        priorMonthCoverage,
        facilities.map((f) => f.prior_month_exposure_usd)
      );

      return {
        lob_l1_name: l1,
        lob_l2_name: l2,
        lob_l3_name: l3,
        as_of_date: AS_OF_DATE,
        ...agg,
      };
    }
  );

  // L2 LoB summaries
  const lobL2Summary: LobL2Summary[] = Array.from(byL2Lob.entries()).map(
    ([key, facilities]) => {
      const [l1, l2] = key.split("|");
      const agg = aggregateFacilities(facilities, true);

      // Desk breakdown
      const byDeskInL2 = new Map<string, FacilitySummary[]>();
      facilities.forEach((f) => {
        const deskKey = f.lob_l3_name;
        const list = byDeskInL2.get(deskKey) ?? [];
        list.push(f);
        byDeskInL2.set(deskKey, list);
      });
      const deskExposures = Array.from(byDeskInL2.entries()).map(([desk, fs]) => ({
        desk,
        exposure: fs.reduce((sum, f) => sum + f.outstanding_exposure_usd, 0),
      }));
      const topDesk = deskExposures.sort((a, b) => b.exposure - a.exposure)[0];
      const bottomDesk = deskExposures.sort((a, b) => a.exposure - b.exposure)[0];

      // Limit monitoring
      const limit = limitByL2Lob.get(l2);
      const limitUtil = limit
        ? limitUtilByLimitId.get(limit.limit_definition_id)
        : undefined;
      const limitUtilized = limitUtil?.utilized_amount_usd ?? null;
      const limitAmount = limit?.limit_amount_usd ?? null;
      const limitStatus =
        limit && limitUtilized !== null && limitAmount
          ? calculateLimitStatus(
              limitUtilized,
              limitAmount,
              limit.inner_threshold_pct,
              limit.outer_threshold_pct
            )
          : null;

      // Prior month metrics
      const priorMonthPricing = facilities.map((f) => {
        const pricing = l2Enrichment.facilityPricingSnapshot.find(
          (p) =>
            p.facility_id === f.facility_id && p.as_of_date === PRIOR_MONTH_DATE
        );
        return pricing?.spread_bps ?? f.spread_bps;
      });
      const priorMonthAvgSpread =
        priorMonthPricing.length > 0
          ? weightedAverage(
              priorMonthPricing,
              facilities.map((f) => f.prior_month_exposure_usd)
            )
          : agg.avg_spread_bps;

      const priorMonthCoverage = facilities.map((f) => f.coverage_ratio_pct);
      const priorMonthAvgCoverage = weightedAverage(
        priorMonthCoverage,
        facilities.map((f) => f.prior_month_exposure_usd)
      );

      return {
        lob_l1_name: l1,
        lob_l2_name: l2,
        lob_l3_name: "", // Not applicable at L2 level
        as_of_date: AS_OF_DATE,
        ...agg,
        lob_limit_usd: limitAmount,
        lob_limit_utilized_usd: limitUtilized,
        lob_headroom_usd:
          limitAmount && limitUtilized !== null
            ? roundTo(limitAmount - limitUtilized, 1)
            : null,
        lob_utilization_pct:
          limitAmount && limitUtilized !== null
            ? roundTo(limitUtilized / limitAmount, 4)
            : null,
        lob_limit_status: limitStatus,
        desk_count: byDeskInL2.size,
        top_desk_by_exposure: topDesk?.desk ?? null,
        bottom_desk_by_exposure: bottomDesk?.desk ?? null,
        prior_month_avg_spread_bps: roundTo(priorMonthAvgSpread, 1),
        prior_month_coverage_ratio_pct: roundTo(priorMonthAvgCoverage, 4),
      };
    }
  );

  // L1 LoB summaries
  const lobL1Summary: LobL1Summary[] = Array.from(byL1Lob.entries()).map(
    ([l1, facilities]) => {
      const agg = aggregateFacilities(facilities, true);

      // L2 breakdown
      const byL2InL1 = new Map<string, FacilitySummary[]>();
      facilities.forEach((f) => {
        const l2Key = f.lob_l2_name;
        const list = byL2InL1.get(l2Key) ?? [];
        list.push(f);
        byL2InL1.set(l2Key, list);
      });

      // Desk breakdown (across all L2s in this L1)
      const byDeskInL1 = new Map<string, FacilitySummary[]>();
      facilities.forEach((f) => {
        const deskKey = f.lob_l3_name;
        const list = byDeskInL1.get(deskKey) ?? [];
        list.push(f);
        byDeskInL1.set(deskKey, list);
      });
      const deskExposures = Array.from(byDeskInL1.entries()).map(([desk, fs]) => ({
        desk,
        exposure: fs.reduce((sum, f) => sum + f.outstanding_exposure_usd, 0),
      }));
      const topDesk = deskExposures.sort((a, b) => b.exposure - a.exposure)[0];
      const bottomDesk = deskExposures.sort((a, b) => a.exposure - b.exposure)[0];

      // Prior month metrics
      const priorMonthPricing = facilities.map((f) => {
        const pricing = l2Enrichment.facilityPricingSnapshot.find(
          (p) =>
            p.facility_id === f.facility_id && p.as_of_date === PRIOR_MONTH_DATE
        );
        return pricing?.spread_bps ?? f.spread_bps;
      });
      const priorMonthAvgSpread =
        priorMonthPricing.length > 0
          ? weightedAverage(
              priorMonthPricing,
              facilities.map((f) => f.prior_month_exposure_usd)
            )
          : agg.avg_spread_bps;

      const priorMonthCoverage = facilities.map((f) => f.coverage_ratio_pct);
      const priorMonthAvgCoverage = weightedAverage(
        priorMonthCoverage,
        facilities.map((f) => f.prior_month_exposure_usd)
      );

      return {
        lob_l1_name: l1,
        as_of_date: AS_OF_DATE,
        l2_lob_count: byL2InL1.size,
        ...agg,
        desk_count: byDeskInL1.size,
        top_desk_by_exposure: topDesk?.desk ?? null,
        bottom_desk_by_exposure: bottomDesk?.desk ?? null,
        prior_month_avg_spread_bps: roundTo(priorMonthAvgSpread, 1),
        prior_month_coverage_ratio_pct: roundTo(priorMonthAvgCoverage, 4),
      };
    }
  );

  return {
    deskSummary,
    lobL2Summary,
    lobL1Summary,
  };
};
