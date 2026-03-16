# L1/L2 Data Generation Plan — GSIB MVP

This plan defines a methodological approach to generating L1 and L2 PostgreSQL data that:

1. **Supports all scenarios** — Seed + S1–S18 (CRO) + S19–S56 (factory) in the same dashboards
2. **GSIB MVP scale** — Enough data for realistic demos without excessive volume
3. **Type-safe and FK-consistent** — Aligns with data dictionary and CLAUDE.md rules
4. **Maintainable** — Easy to fix, extend, and validate

---

## 1. Current State Summary

### Data Sources

| File | Scope | Entities |
|------|-------|----------|
| `03-l1-seed.sql` | L1 dimensions + masters | 100 counterparties, 410 facilities, dims |
| `04-l2-seed.sql` | L2 snapshots (seed facilities) | facility_id 1–405, as_of_date 2025-01-31 |
| `05-scenario-seed.sql` | S1–S18 CRO scenarios | counterparty 1001–1720, facility 5001–5720 |
| `06-factory-scenarios.sql` | S19–S56 factory | counterparty 1721+, facility 5721+ |

### ID Ranges (No Overlap)

| Entity | Seed | S1–S18 | S19–S56 |
|--------|------|--------|---------|
| counterparty_id | 1–100 | 1001–1720 | 1721+ (per id-registry.json) |
| facility_id | 1–410 | 5001–5720 | 5721+ |
| credit_agreement_id | 1–100 | 1001–1180 | 1181+ |

### Dashboard Compatibility

Dashboards filter by **counterparty_id** and **facility_id** ranges to isolate scenarios. No `scenario_id` column — scenario = ID range. All scenarios share the same tables; they coexist by using disjoint ID blocks.

---

## 2. Target Volumes (GSIB MVP)

### Principle: Enough to Tell the Story, Not More

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Total counterparties** | ~4,000 | Seed 100 + S1–18 ~720 + S19–56 ~3,200 |
| **Total facilities** | ~11,000 | Seed 410 + S1–18 ~720 + S19–56 ~9,900 |
| **Exposure snapshots per facility** | 3–5 as_of_dates | Nov, Dec, Jan (3-month trend) or scenario-specific |
| **L2 rows per scenario** | 50–200 | facility_exposure_snapshot + risk_flag + events |
| **L1 dimension rows** | Minimal expansion | Only add countries/currencies used by scenarios |

### Per-Scenario Guidelines

- **S1–S18**: Already fixed; 3–20 counterparties, 6–15 facilities each
- **S19–S56**: 3–8 counterparties, 5–16 facilities each (current factory output)
- **Time series**: At least 3 as_of_dates per facility for trend scenarios

---

## 3. Data Type Alignment

### Naming Convention (CLAUDE.md)

| Suffix | Type | Example |
|--------|------|---------|
| `_id` | BIGINT (unquoted) | `counterparty_id`, `facility_id` |
| `_code` | VARCHAR (quoted) | `country_code`, `currency_code`, `flag_code` |
| `_amt` | NUMERIC (unquoted) | `drawn_amount`, `committed_amount` |
| `_pct` | NUMERIC (unquoted) | `utilization_pct`, `ownership_pct` |
| `_date` | DATE (quoted) | `as_of_date`, `maturity_date` |
| `_flag` | BOOLEAN (Y/N quoted) | `is_active_flag` |
| `_ts` | TIMESTAMP (quoted or DEFAULT) | `created_ts` |

### Exception IDs (VARCHAR despite _id)

`metric_id`, `variant_id`, `source_metric_id`, `mdrm_id`, `mapped_line_id`, `mapped_column_id`

### Reference Data Constraints

- **country_code**: Must exist in `l1.country_dim` (seed + factory prerequisite)
- **currency_code**: Must exist in `l1.currency_dim`
- **industry_id**: 1–10 (from `l1.industry_dim` seed)
- **entity_type_code**: CORP, BANK, FI, RE, etc. (from `l1.entity_type_dim`)
- **flag_code**: Must be in validator allowlist
- **rating_value**: S&P/Moody's/Fitch pattern (e.g. A+, Baa1, BBB-)

### Cross-Check with Data Dictionary

Before emitting, verify column types against `facility-summary-mvp/output/data-dictionary/data-dictionary.json`. Use `formatSqlValue()` in `sql-emitter.ts` for all INSERT values.

---

## 4. FK Integrity Rules

### Load Order (Strict)

1. **L1 dims** — country_dim, currency_dim, industry_dim, entity_type_dim, regulatory_jurisdiction, etc.
2. **L1 masters** — counterparty → credit_agreement_master → facility_master
3. **L1 junctions** — counterparty_hierarchy, sccl_counterparty_group_member, facility_lender_allocation
4. **L2 snapshots** — facility_exposure_snapshot, facility_pricing_snapshot, etc.
5. **L2 events** — credit_event, risk_flag, amendment_event, etc.

### Complete Chain Rule

Every facility must have a valid path:

```
facility_id → facility_master.credit_agreement_id → credit_agreement_master.borrower_counterparty_id → counterparty_id
```

### No Modular Arithmetic

Never cap FK values with `(id - 1) % N + 1` to fit seed ranges. Either:
- Generate child data that references the correct parent IDs, or
- Ensure parent tables have enough rows to cover all child FK values.

### Factory Prerequisites (sql-emitter.ts)

The factory emits prerequisite INSERTs before scenario data:
- `regulatory_jurisdiction`: BR, IN, MX, AE, KR (jurisdiction_id 11–15)
- `country_dim`: BR, IN, MX, AE, KR, HK
- `currency_dim`: BRL, INR, MXN, AED, KRW
- `metric_threshold`: DSCR, LTV, ICR, LEVERAGE, CURRENT_RATIO

---

## 5. Validation Pipeline

### Pre-Emit (validator.ts)

- L1 chain completeness (facility → agreement → counterparty)
- L2→L1 FK references
- Financial: drawn ≤ committed, undrawn = committed − drawn
- PK uniqueness (no composite PK collisions)
- Reference data: country_code, currency_code, industry_id
- Risk flag codes in allowlist
- Rating value pattern

### Post-Load (verify-factory-scenarios.ts)

- FK chain join (facility → agreement → counterparty)
- drawn ≤ committed per exposure row
- Exposure row counts per scenario

### Optional: Schema Validation

- Compare emitted column names against DDL
- Compare value types against data dictionary

---

## 6. Generation Methodology

### Step 1: Define Scenario Narrative (YAML)

For each scenario:
- **Who**: counterparties (industry, size, rating, country)
- **What**: facilities (type, amount, status)
- **When**: as_of_dates (3-month trend or single date)
- **Why**: story arc (deterioration, breach, event cascade)
- **Risk flags**: flag_code, severity, description

### Step 2: Allocate IDs (id-registry.json)

- Use `IDRegistry.allocate()` — no overlap
- One allocation block per scenario per table
- Document ranges in id-registry.json allocations

### Step 3: Build L1 Chain (chain-builder.ts)

- counterparty → agreement → facility
- Enrich with gsib-enrichment.ts (COUNTRY_MAP, INDUSTRY_GSIB_MAP)
- Use only industry_id 1–10, country_code from COUNTRY_MAP

### Step 4: Generate L2 Data (l2-generator.ts)

- facility_exposure_snapshot for each facility × as_of_date
- risk_flag, credit_event, etc. per narrative
- Use story arc curves (STORY_UTILIZATION, STORY_PD_MULTIPLIERS) for consistency

### Step 5: Validate (validator.ts)

- Run validateScenario() before SQL emission
- Fix any errors; do not emit invalid data

### Step 6: Emit SQL (sql-emitter.ts)

- LOAD_ORDER for correct parent-before-child
- formatSqlValue() for type-correct values
- Prerequisite INSERTs for new countries/currencies

### Step 7: Load and Verify

- `npm run db:load-gsib`
- `npm run db:verify-factory`

---

## 7. Load Script Considerations

### FK Capping in load-gsib-export.ts

Currently, **only 04-l2-seed.sql** receives FK capping (exposure_type_id, source_system_id, etc.) because it was designed for a smaller L1 seed. The factory output (06-factory-scenarios.sql) does **not** get capping — it must emit FK values that already exist.

### Recommendation

- **Option A**: Ensure factory emits only FK values that exist in 03-l1-seed + prerequisites (current approach)
- **Option B**: Add a "factory FK capping" pass for 06-factory-scenarios if L1 dims have limited rows (e.g. exposure_type_id 1–20, source_system_id 1–100)

For MVP, **Option A** is preferred — factory already uses valid dim IDs. If new scenarios need exposure_type_id or source_system_id outside seed range, add those to 03-l1-seed or factory prerequisites.

---

## 8. Industry ID Alignment

**Issue**: 04-l2-seed uses industry_id 21, 31, 44, 51, 52, 62, 71. Validator and factory use industry_id 1–10. industry_dim seed may have 1–10 only.

**Recommendation**:
- Audit `l1.industry_dim` in 03-l1-seed — what IDs exist?
- If seed has 1–10 only: either expand industry_dim seed to include 21–71, or cap 04-l2-seed industry_id to 1–10 when loading
- Factory must use 1–10 (INDUSTRY_GSIB_MAP)

---

## 9. Adding New Scenarios

1. Create `scenarios/narratives/S0XX-name.yaml`
2. Use country from COUNTRY_MAP (US, GB, DE, FR, JP, CH, CA, AU, NL, SG, HK, KR, BR, IN, AE, MX)
3. Add new countries to FACTORY_COUNTRY_SETUP in sql-emitter.ts if needed
4. Run `npm run factory:generate`
5. Run `npm run db:load-gsib`
6. Run `npm run db:verify-factory`

---

## 10. Checklist Before Each Release

- [ ] All scenarios pass validator (pre-emit)
- [ ] All scenarios pass verify-factory (post-load)
- [ ] No ID overlap in id-registry.json
- [ ] industry_id, country_code, currency_code all valid
- [ ] drawn ≤ committed for all exposure rows
- [ ] Complete FK chain for every facility
- [ ] as_of_dates align with scenario narrative (3-month trend where needed)
- [ ] README.md and docs reflect 6 files (01–06)

---

## 11. File Manifest

| File | Purpose |
|------|---------|
| `scenarios/factory/chain-builder.ts` | L1 chain generation |
| `scenarios/factory/l2-generator.ts` | L2 data generation |
| `scenarios/factory/validator.ts` | Pre-emit validation |
| `scenarios/factory/sql-emitter.ts` | SQL emission, load order |
| `scenarios/factory/gsib-enrichment.ts` | COUNTRY_MAP, INDUSTRY_GSIB_MAP |
| `scenarios/config/id-registry.json` | ID allocation |
| `scripts/load-gsib-export.ts` | Load 01–06 into PostgreSQL |
| `scripts/verify-factory-scenarios.ts` | Post-load verification |
| `docs/FACTORY_SCENARIOS.md` | Factory pipeline docs |
| `docs/CRO_SCENARIOS_DATA_CONFIRMATION.md` | S1–S18 story mapping |
