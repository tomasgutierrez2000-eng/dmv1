"""Maps ScenarioType enum values to prompting context for LLM generation."""

SCENARIO_PROMPTS: dict[str, str] = {
    "EXPOSURE_BREACH": "Facility utilization exceeds approved limit thresholds, triggering breach notifications and corrective actions.",
    "DETERIORATION_TREND": "Multi-month credit quality decline across counterparties, with rising PD, widening spreads, and potential rating downgrades.",
    "RATING_DIVERGENCE": "Internal risk assessment diverges from external agency ratings, creating a gap that requires investigation.",
    "COLLATERAL_DECLINE": "Collateral values drop significantly, increasing LTV ratios and potentially triggering margin calls or covenant breaches.",
    "STRESS_TEST": "Stress scenario with multiple breaches across the portfolio, testing capital adequacy under adverse conditions.",
    "EVENT_CASCADE": "A credit event triggers a chain reaction: downgrade -> covenant review -> amendment -> exception.",
    "PIPELINE_SPIKE": "Surge in new facility originations overwhelming the pipeline, with concentration risk in specific sectors.",
    "DELINQUENCY_TREND": "Rising delinquency across multiple borrowers, with facilities moving through DPD buckets (1-29 -> 30-59 -> 60-89 -> 90+).",
    "SYNDICATED_FACILITY": "Multi-party syndicated deal with multiple lenders, requiring participation tracking and exposure attribution.",
    "BREACH_RESOLUTION": "Limit breach detected -> corrective action taken -> resolution confirmed, demonstrating the full remediation lifecycle.",
    "DATA_QUALITY": "Data quality scores deteriorating across dimensions (completeness, accuracy, timeliness), triggering DQ remediation.",
    "PRODUCT_MIX": "FR2590 product category composition shifts, with concentration building in specific product types.",
    "LEVERAGED_FINANCE": "High-yield, high-risk portfolio segment with elevated PD, aggressive leverage, and tight covenants.",
    "REGULATORY_NEAR_MISS": "Capital ratios approaching regulatory minimums, requiring proactive management and potential capital actions.",
    "MATURITY_WALL": "Concentration of upcoming maturities creating refinancing risk and potential liquidity pressure.",
}
