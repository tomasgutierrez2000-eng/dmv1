# Factory Scenarios (S19–S56) — Data Generation

This document describes the factory-generated scenario data (`sql/gsib-export/06-factory-scenarios.sql`) that extends the CRO dashboard scenarios (S1–S18) with additional CRO-relevant stories.

## Overview

The data factory (`scenarios/factory/`) generates scenario data from YAML narratives. Each scenario defines counterparties, facilities, timeline, events, and optional stress tests. The factory produces collision-free IDs via `scenarios/config/id-registry.json` and emits SQL in correct load order.

## Pipeline

1. **Generate**: `npm run factory:generate` — reads `scenarios/narratives/*.yaml`, allocates IDs, builds L1 chain + L2 data, validates, emits `06-factory-scenarios.sql`
2. **Load**: `npm run db:load-gsib` loads 01–06 in order (06 is factory scenarios)
3. **Verify**: `npm run db:verify-factory` — runs FK chain, drawn ≤ committed, exposure row checks per scenario

## Scenario Types

| Type | Description |
|------|-------------|
| `EXPOSURE_BREACH` | Limit utilization exceeds threshold |
| `DETERIORATION_TREND` | Multi-month credit quality decline |
| `RATING_DIVERGENCE` | Internal vs external rating gap |
| `COLLATERAL_DECLINE` | Collateral value drop triggers events |
| `STRESS_TEST` | Stress scenario with breaches |
| `EVENT_CASCADE` | Credit event → amendment → exception chain |
| `PIPELINE_SPIKE` | New facility onboarding surge |
| `DELINQUENCY_TREND` | Rising delinquency across borrowers |
| `SYNDICATED_FACILITY` | Multi-party syndicated deal |
| `BREACH_RESOLUTION` | Limit breach → corrective action → resolution |
| `DATA_QUALITY` | Data quality score deterioration |
| `PRODUCT_MIX` | FR2590 product category shift |
| `LEVERAGED_FINANCE` | High-yield high-risk portfolio |
| `REGULATORY_NEAR_MISS` | Capital ratio approaching minimum |
| `MATURITY_WALL` | Concentration of upcoming maturities |

## CRO-Relevant Scenarios (S51–S56)

| ID | Name | Story | Key Tables |
|----|------|-------|------------|
| **S51** | Oil Price Shock (War) | Geopolitical conflict drives oil +40%; 6 energy borrowers see utilization spike, covenant pressure | facility_exposure_snapshot, counterparty_rating_observation, risk_flag |
| **S52** | Currency Shock (EM) | EM currency crisis; 5 EM borrowers with USD debt face FX-amplified losses | facility_exposure_snapshot, stress_test_result, risk_flag |
| **S53** | Interest Rate Spike | Rapid Fed hikes; floating-rate portfolio utilization + drawdown; 3 borrowers breach DSCR | facility_financial_snapshot, facility_exposure_snapshot, risk_flag |
| **S54** | Supply Chain Disruption | Manufacturing sector stress; 4 counterparties with delayed shipments, covenant breaches | credit_event, facility_financial_snapshot, risk_flag |
| **S55** | CRE Refinancing Wall | 5 CRE facilities maturing in 90 days; 2 unable to refinance at current rates | facility_exposure_snapshot (days_until_maturity), risk_flag |
| **S56** | Bank Contagion (Regional) | Regional bank failure; 3 bank counterparties see funding stress, rating downgrades | counterparty_rating_observation, credit_event, risk_flag |

## ID Ranges

Factory scenarios (S19–S56) use IDs outside the seed and S1–S18 ranges:

| Entity | Seed | S1–S18 | S19–S56 |
|--------|------|--------|---------|
| counterparty_id | 1–100 | 1001–1720 | 1721+ (per registry) |
| facility_id | 1–410 | 5001–5720 | 5721+ (per registry) |
| credit_agreement_id | 1–100 | 1001–1180 | 1181+ (per registry) |

Exact ranges per scenario are in `scenarios/config/id-registry.json`.

## Factory Prerequisites

The factory SQL emits prerequisite INSERTs before scenario data:

- **regulatory_jurisdiction**: BR, IN, MX, AE, KR (jurisdiction_id 11–15)
- **country_dim**: BR, IN, MX, AE, KR, HK (HK uses existing jurisdiction_id 7)
- **currency_dim**: BRL, INR, MXN, AED, KRW
- **metric_threshold**: DSCR, LTV, ICR, LEVERAGE, CURRENT_RATIO thresholds

## Adding a New Scenario

1. Create `scenarios/narratives/S0XX-name.yaml` (e.g. `S057-turkey-fx-crisis.yaml`)
2. Use `country` from `COUNTRY_MAP` in `gsib-enrichment.ts` (US, GB, DE, FR, JP, CH, CA, AU, NL, SG, HK, KR, BR, IN, AE, MX)
3. Add new countries to `FACTORY_COUNTRY_SETUP` in `sql-emitter.ts` if needed
4. Run `npm run factory:generate`
5. Run `npm run db:load-gsib` (if DB available)
6. Run `npm run db:verify-factory` to confirm

## Validation

- **Pre-emit**: `validator.ts` checks FK chain, L2→L1 refs, financial consistency, PK uniqueness, reference data (country, currency, industry_id), risk flag codes, rating values
- **Post-load**: `scripts/verify-factory-scenarios.ts` runs FK chain join, drawn ≤ committed, exposure row counts per scenario

## Key Files

| File | Purpose |
|------|---------|
| `scenarios/factory/scenario-runner.ts` | CLI orchestrator |
| `scenarios/factory/chain-builder.ts` | L1 chain generation |
| `scenarios/factory/l2-generator.ts` | L2 data generation |
| `scenarios/factory/validator.ts` | Pre-emit validation |
| `scenarios/factory/sql-emitter.ts` | SQL emission, load order, prerequisites |
| `scenarios/factory/gsib-enrichment.ts` | COUNTRY_MAP, INDUSTRY_GSIB_MAP |
| `scenarios/config/id-registry.json` | ID allocation state |
| `scripts/verify-factory-scenarios.ts` | Post-load verification |
