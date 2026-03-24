# CRO Dashboard Scenarios — End-to-End Data Confirmation

This document confirms that the GSIB scenario seed data (`sql/gsib-export/05-scenario-seed.sql`) supports all 18 CRO dashboard scenarios. The data can tell each story on a dashboard when loaded into PostgreSQL and queried via the reference SQL.

## Verification

Run the verification script against a loaded database:

```bash
npm run db:verify-scenarios
```

Requires `DATABASE_URL` in `.env` and a database loaded with:

```bash
npm run db:load-gsib
```

## Scenario-to-Story Mapping

| ID | Scenario | Story the Data Tells | Key Tables |
|----|----------|----------------------|------------|
| **S1** | Large Exposure Breach | Single-name concentration $2.5B drawn vs $2B limit (125% breach) | facility_exposure_snapshot, limit_utilization_event, risk_flag, exception_event |
| **S2** | Gradual Deterioration | 3-month utilization trend 82%→88%→93% with rating downgrade A→A- | facility_exposure_snapshot, counterparty_rating_observation, risk_flag |
| **S3** | Rating Divergence | External BBB vs internal BB+ — 2-notch divergence | counterparty_rating_observation, risk_flag |
| **S4** | Cross-Entity Exposure | SCCL group aggregate $3.13B exceeds $3B limit across 5 entities | limit_contribution_snapshot, limit_utilization_event, risk_flag |
| **S5** | Stress Test Failure | CRE stress test $850M loss, 3 counterparties breach | stress_test_result, stress_test_breach, risk_flag |
| **S6** | Collateral Value Decline | 8 CRE properties declined 15%, triggering credit event | collateral_snapshot, credit_event, credit_event_facility_link, risk_flag |
| **S7** | Syndicated Facility | $2.1B syndicated facility with borrower + 3 participants/guarantors | exposure_counterparty_attribution, amendment_event |
| **S8** | Breach Resolution | Limit breach Dec→Jan resolved (105%→88%), exception closed | limit_utilization_event, exception_event, risk_flag |
| **S9** | New Facility Onboarding Spike | 12 new facilities ($3.4B) onboarded Jan 2025 | deal_pipeline_fact, facility_master |
| **S10** | Maturity Wall | 15 facilities ($4.8B) maturing Feb–Apr 2025, 1–90 days | facility_exposure_snapshot (days_until_maturity), risk_flag |
| **S11** | Data Quality Crisis | Low DQ scores: PD 78%, LGD 72%, Collateral 65% | data_quality_score_snapshot, risk_flag |
| **S12** | Product Mix Shift | 3-month FR 2590 trend by category | facility_exposure_snapshot (fr2590_category_code) |
| **S13** | Leveraged Finance | High NII yield (4.5%) but B-rated — risk-return tradeoff | facility_profitability_snapshot, counterparty_rating_observation, risk_flag |
| **S14** | Regulatory Compliance Near-Miss | Tier 1 10.8% (min 10.5%), Leverage 3.1% (min 3.0%) | financial_metric_observation, metric_threshold, risk_flag |
| **S15** | Credit Event Cascade | BBB→BB downgrade → credit event → waiver → exception across 5 facilities | credit_event, amendment_event, exception_event, counterparty_rating_observation |
| **S16** | Benchmark Transition | 8 facilities LIBOR→SOFR: 4 effective, 2 approved, 2 pending | amendment_event, amendment_change_detail, facility_pricing_snapshot |
| **S17** | Region Concentration | 5 APAC counterparties (JP, SG), 31% exposure growth over 3 months | facility_exposure_snapshot, counterparty (country_code), risk_flag |
| **S18** | Delinquency Spike | 20 retail borrowers, delinquency rate increasing over 2 months | facility_delinquency_snapshot, risk_flag |

## ID Ranges (Scenario Data)

| Entity | Range |
|--------|-------|
| counterparty_id | 1001–1720 |
| facility_id | 5001–5720 |
| credit_agreement_id | 1001–1135 |
| risk_flag_id | 5001–5054 |
| amendment_id | 5001–5011 |
| exception_id | 5001–5004 |
| credit_event_id | 5001–5002 |

## Data Pipeline

1. **Load**: `npm run db:load-gsib` loads 01-l1-ddl → 02-l2-ddl → 03-l1-seed → 04-l2-seed → 05-scenario-seed
2. **Verify**: `npm run db:verify-scenarios` runs reference queries and validates story logic
3. **Dashboard**: Queries PostgreSQL (DATABASE_URL) for scenario-specific views; filters by counterparty_id, facility_id, as_of_date, flag_code, etc.

## DDL Additions for Full Coverage

The following tables were added to `02-l2-ddl.sql` so the scenario seed loads without errors:

- `l2.data_quality_score_snapshot` — S11 Data Quality Crisis
- `l1.metric_threshold` — S14 Regulatory Compliance Near-Miss

**After adding these tables, reload the database from scratch** so the new DDL is applied and scenario seed inserts succeed.

## Names and Basic Info

Per requirements: *"It doesn't need to have the same Names or basic information."* The scenario seed uses different entity names (e.g., Meridian Energy Holdings, Apex Manufacturing, Pacific Rim Shipping) than any reference document. The **data relationships and numeric story** (exposure amounts, utilization %, ratings, dates) are what matter for dashboard confirmation.
