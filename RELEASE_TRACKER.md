# Release Tracker — Data Model Changes

Summarizes structural changes to the data model: tables and fields added, removed, or moved across layers, with rationale for each change.

> **Current totals:** L1: 79 tables | L2: 27 tables | L3: 50 tables | Metric Library: 12 parents, 27 variants

---

## 2026-02-25

### Metric library simplification (`c3cbbaf`)

**Removed from metric library schema:**
- Calculation authority tiers (T1/T2/T3 hierarchy)
- Sourcing levels, approval/deprecation workflows
- GSIB-specific seed scripts and migration tooling

**Rationale:** The multi-tier governance model added complexity without being used in practice. Consolidated to one canonical variant per parent metric with streamlined types and simpler import/export.

---

### Atomic metrics moved from L3 to L2 (`cfb326d`)

L3 should only contain *calculated/derived* values. Atomic (observed) values that come directly from source systems belong in L2.

**Added to L2 (observed values):**

| Table | New columns |
|-------|-------------|
| `facility_exposure_snapshot` | `number_of_loans`, `number_of_facilities`, `days_until_maturity`, `facility_utilization_status`, `limit_status_code`, `rwa_amt`, `internal_risk_rating_bucket_code` |
| `facility_financial_snapshot` | `dscr_value`, `ltv_pct`, `net_income_amt`, `interest_rate_sensitivity_pct` |
| `counterparty_rating_observation` | `risk_rating_status`, `risk_rating_change_steps` |

**Removed from L3 (were atomic, not calculated):**

| Table | Removed columns |
|-------|-----------------|
| `counterparty_exposure_summary` | `number_of_loans` |
| `lob_exposure_summary` | `number_of_loans` |
| `lob_profitability_summary` | `return_on_rwa_pct` |
| `facility_detail_snapshot` | `pricing_tier`, `pricing_exception_flag`, `number_of_loans` |
| `lob_risk_ratio_summary` | `dscr_value`, `ltv_pct`, `interest_rate_sensitivity_pct`, `return_on_rwa_pct` |
| `lob_rating_distribution` | `internal_risk_rating_bucket_code` |

**Rationale:** Enforces a clean separation — L2 holds what the source system tells us, L3 holds what we compute. Prevents confusion about whether a value is observed or derived.

---

## 2026-02-24

### New table: `facility_lender_allocation` (`54a096d`)

**Layer:** L1 (new table)

**Fields:** `lender_allocation_id` (PK), `facility_id` (FK), `legal_entity_id` (FK), `bank_share_pct`, `bank_commitment_amt`, `allocation_role`, `is_lead_flag`

**Rationale:** Separates issuer-side/lender-side share tracking from counterparty participation. Enables proper multi-bank syndicated deal modeling where multiple legal entities of the same bank can hold different shares of a facility.

---

### Missing data elements for full metric coverage (`ee7c7b7`)

Gap analysis revealed 33 data elements required by metrics but missing from the schema.

**New L1 reference tables:**
- `internal_risk_rating_bucket_dim` — Maps risk scores to buckets: Critical (15-16), High (10-14), Moderate (5-9), Non-High Risk (1-4)
- `pricing_tier_dim` — Ordinal pricing tiers

**New L2 columns:**

| Table | New columns |
|-------|-------------|
| `position_detail` | `delinquent_payment_flag`, `overdue_amt_0_30`, `overdue_amt_31_60`, `overdue_amt_61_90_plus` |
| `facility_delinquency_snapshot` | Same overdue bucket columns + flag |
| `facility_pricing_snapshot` | `pricing_tier`, `pricing_exception_flag`, `fee_rate_pct` |

**New L3 derived columns:** Various tables received calculated columns that depend on the new L2 atomic inputs.

**Rationale:** Every metric in the catalog (C001–C058) must trace to an explicit field. This commit closed the gaps identified in the PDF-based data element audit.

---

## 2026-02-23

### BigQuery DDL for 5 core L1 tables (`9259b7a`)

**Added:** `/sql/bigquery/l1_core_5_tables.sql` — BigQuery-compatible DDL for the five most-used L1 tables.

**Rationale:** Teams using GCP BigQuery needed a ready-to-deploy subset of the L1 schema without manually converting PostgreSQL syntax.

---

## 2026-02-21

### L2 DDL/seed generation and conventions (`ccf193b`)

**New L2 columns for L3 compatibility:**

| Table | New columns |
|-------|-------------|
| `position_detail` | `notional_amt`, `ccf_pct`, `lgd_pct` |
| `facility_exposure_snapshot` | `outstanding_balance_amt`, `undrawn_commitment_amt` |
| `netting_set_exposure_snapshot` | `netting_benefit_amt` |
| `facility_lob` (linkage) | `lob_node_id`, `hierarchy_id` |
| `financial_metric_observation` | `metric_code` (VARCHAR) |

**New infrastructure:**
- `scripts/l2/generate.ts` — Emits `ddl.sql` and `seed.sql` from L2 definitions
- `sql/SEED_CONVENTIONS.md` — Documents `run_version_id`, `as_of_date`, facility/counterparty ID ranges
- `scripts/populate-metric-value-fact.ts` — Batch script for L3 `metric_value_fact` population

**Rationale:** L2 tables needed additional columns so L3 calculations (which join across L2 tables) have all required inputs. The generation scripts ensure DDL and seed data stay in sync with TypeScript definitions.

---

### Metric library: calculation authority and source ingestion (`80e3861`)

**Added to metric variant schema:**
- Calculation authority tiers (T1/T2/T3)
- Source system and ingestion metadata

**Rationale:** Regulatory metrics require clear ownership of which system is authoritative for each calculation. *(Note: later simplified in `c3cbbaf` on 2026-02-25.)*

---

## 2026-02-20

### Align metric definitions to atomic calculations (`deb85b6`)

**Changed:** Rewrote metric formulas to reference lowest-level atomic fields rather than pre-aggregated values.

**Rationale:** Ensures lineage traces cleanly from L3 derived metrics down to L2 snapshots and L1 master tables, with no "black box" intermediate steps.

---

## 2026-02-17

### Add L1/L2 missing columns from PDF gap lists (`9a36eb8`)

**L1 additions (476 new lines of definitions):**
- Collateral/CRM fields
- Contract and facility attributes
- Counterparty enrichment fields
- Netting/margin columns
- Taxonomy dimensions
- Instrument detail fields
- Limits and ratings columns
- Regulatory/reporting attributes
- SCCL, scenario, rule registry, run control, validation check registry

**L2 additions (234 new lines of definitions):**
- `position`, `position_detail` enrichment
- Exposure and facility snapshot additions
- `collateral_snapshot`, `cash_flow` additions
- Facility delinquency/pricing/profitability fields
- Limit snapshot columns
- `amendment_event`, `amendment_detail` additions
- `credit_event`, `credit_event_facility_link` additions
- Stress test tables enrichment
- `deal_pipeline_fact`, `counterparty_rating_observation`, `financial_metric_observation`
- `metric_threshold`, `exception_event`, `risk_flag`, `data_quality_score_snapshot`

**Rationale:** Systematic gap analysis against PDF specifications identified columns present in the reference docs but absent from the schema. Bulk addition ensures schema completeness against the regulatory spec.

---

## 2026-02-16

### L2 layer introduced — 26 tables (`003ba4c`)

**New layer:** L2 (Simplified/Consolidated) with 26 tables across categories:
- Position & exposure snapshots
- Facility snapshots (exposure, financial, pricing, limit utilization, detail, delinquency, profitability)
- Counterparty snapshots (exposure, rating observation, financial, CDS)
- Netting set and instrument snapshots
- Credit event snapshots
- Regulatory and operational (report tracker, calculation run log, data quality metric)
- Correlation and market data

**New infrastructure:**
- `lib/dataModelUpdate.ts` — Impact analysis and referential integrity validation
- `DATA_MODEL_UPDATE.md` — Documentation for the update module

**Rationale:** L1 tables are normalized and atomic. A consolidated snapshot layer (L2) is needed so that L3 calculations can join against denormalized, date-partitioned snapshots rather than performing complex multi-table joins against L1.

---

### Initial commit — L1 schema (`78457f8`)

**Layer:** L1 (Core/Atomic) — ~60 tables at initial release.

**Categories:** Reference dimensions, core transaction masters, events and observations, regulatory lookups.

**Rationale:** Foundation layer modeling a GSIB credit/lending data warehouse with SCD Type 0/1/2 support.

---

## How to use this document

**When making data model changes**, add a new entry at the top of this file with:

1. **Date** and **commit hash**
2. **What changed** — tables/fields added, removed, renamed, or moved
3. **Rationale** — why the change was made
4. **Impact** — any downstream effects (broken FKs, L3 formulas needing updates, seed data regeneration)

After modifying table definitions, regenerate outputs:
```bash
npx tsx scripts/l1/generate.ts   # L1 DDL + seed
npx tsx scripts/l2/generate.ts   # L2 DDL + seed
```

To check for broken references after removals:
```ts
import { validateReferentialIntegrity } from '@/lib/dataModelUpdate';
const { valid, orphaned } = validateReferentialIntegrity(model);
```
