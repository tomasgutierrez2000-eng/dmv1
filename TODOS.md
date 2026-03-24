# TODOS

_Last reviewed: 2026-03-24. 13 items completed and removed, 2 downscoped, 2 marked partial._

---

## Phase 1: Quick Wins

### 1. Drop legacy `parent_leaf` VARCHAR column from taxonomy tables
**What:** Write migration to remove `parent_leaf` VARCHAR(64) column from `enterprise_business_taxonomy`. Check `enterprise_product_taxonomy` for same issue.
**Why:** VARCHAR↔BIGINT FK type mismatch is a crash risk on the rollup backbone. All code uses `parent_segment_id` (BIGINT).
**Effort:** Small. One ALTER TABLE + introspect.

### 2. Finish formatSqlValue consolidation
**What:** Replace the local `formatSqlValue()` duplicate in `scenarios/factory/seed-time-series.ts` with import from `lib/sql-value-formatter.ts`.
**Why:** Local copy lacks column-name-aware dispatch (suffix rules, exception IDs). Risk of silent data corruption.
**Status:** Partially done — `sql-emitter.ts` and `db-writer.ts` already use the shared module. Only `seed-time-series.ts` remains.
**Effort:** Small.

### ~~3. formatSqlValue test suite~~ DONE
45+ test cases already exist at `lib/__tests__/sql-value-formatter.test.ts`.

---

## Phase 2: Infrastructure

### 4. Regenerate DDL from Data Dictionary
**What:** Bring 3 DDL files (01-l1-ddl, 02-l2-ddl, 03-l3-ddl) into alignment with golden-source data dictionary.
**Why:** 9 orphaned tables cause confusion for offline users and make DDL files unreliable as fallback.
**Depends on:** Item 1 (drop legacy column first so regenerated DDL is clean).

### 5. Middleware security hardening
**What:** Add CORS headers, `Strict-Transport-Security`, tighten CSP (remove `unsafe-eval` if possible).
**Why:** `middleware.ts` exists with CSP + rate limiting + request logging, but missing CORS, HSTS.
**Status:** Partially done. Auth tokens and distributed rate limiting deferred (need architecture decisions).
**Effort:** Medium.

### 6. Incremental introspection
**What:** Parse DDL commands to identify affected tables, only re-introspect those instead of all 211. Fallback: add a `--table` flag for single-table introspection.
**Why:** `db:introspect` takes 10-30 seconds over GCP Cloud SQL network. PostToolUse hook blocks dev on every DDL change.
**Effort:** Medium.

---

## Phase 3: Test Coverage Expansion

### 7. Full test suite (Vitest + testing-library + Playwright)
**What:** Priority: `lib/` unit tests first (formula-resolver, sql-runner, config-builder, api-response ~200 cases) → component tests (@testing-library/react) → E2E for critical flows (Playwright).
**Why:** Low coverage across components (125 files), API routes (64 routes), lib/ (69 files).
**Effort:** Large. Vitest is set up, testing-library and Playwright need adding.

---

## Phase 4: Major Refactors

### 8. YAML-only metric authority
**What:** Make YAML the single source of truth. Remove Excel/JSON merge fallbacks from `getMergedMetrics()`. Generate `catalogue.json` from YAML only.
**Why:** Current merge chain (Excel > JSON > seeds) is tech debt. YAML→catalogue sync already works.
**Depends on:** Phase 3 (need tests to verify migration doesn't break anything).
**Effort:** Large.

### 9. SQL adapter CTE + window function support
**What:** Add CTE (`WITH ... AS`) and window function (`ROW_NUMBER() OVER()`) support to `lib/metrics-calculation/sql-runner.ts`.
**Why:** Metric formulas using CTEs silently break. Known limitation per CLAUDE.md.
**Depends on:** Phase 3.
**Effort:** Medium.

### 10. React Query migration
**What:** Add `@tanstack/react-query`, create QueryProvider wrapper, migrate 46 manual fetch+useState patterns incrementally.
**Why:** Current pattern has race conditions, no cancellation, repeated boilerplate across 20+ components.
**Effort:** Large. Can be done component-by-component.

### 11. Split remaining mega-files
**What:** Split 3 monolithic files into focused sub-modules:
- `scripts/validate-data-model.ts` (1,684 LOC) → 9 files by validation topic
- `components/visualizer/Canvas.tsx` (1,201 LOC) → extract drag/pan/zoom hooks + sub-components
- `scripts/calc_engine/sync-yaml-to-catalogue.ts` (867 LOC) → loader, matcher, level-generator, writer
**Why:** Hard to test, review, and maintain.
**Depends on:** Phase 3 (tests verify splits don't break anything).

### 12. Performance fixes
**What:** Three sub-tasks:
1. Split `catalogue.json` (3.2MB) into `catalogue-core.json` + `catalogue-demo.json`
2. Add file-watch cache invalidation to `semantic-layer/registry.ts`
3. Refactor `scenarios/factory/validator.ts` from O(n²) FK checks to O(n) using Set/Map lookups
**Why:** 3.2MB JSON causes slow git + merge conflicts. Stale cache serves wrong data.
**Depends on:** Item 8 (YAML consolidation) is complementary.

---

## Phase 5: Design & UX

### 13. Unify to dark theme + add light/dark toggle
**What:** Convert Metrics Library, Data Elements, and DB Status from light to dark theme. Add toggle in persistent nav bar.
**Why:** Users experience jarring theme switches between sections. Dark theme is the majority (home, visualizer, architecture, taxonomy, agent, exec summary).
**Depends on:** Recommend running `/design-consultation` first to define color tokens.
**Effort:** Large.

### 14. Redesign home page with Spine + live stats
**What:** Replace generic hero text + 3 layer cards with a mini Spine visualization and live stats (tables, metrics, relationships).
**Why:** Home page undersells the platform. The Spine shows what makes this tool distinctive.
**Depends on:** Persistent nav bar (nav buttons move to header, freeing home page space).
**Effort:** Medium.

---

## Deferred (no timeline)

### 15. Extract CLAUDE.md lessons-learned into executable SQL linter
**What:** Convert the 50+ rows in CLAUDE.md's "Common YAML Formula Bugs" table into programmatic checks in a new `lib/sql-linter.ts`.
**Why:** Every new contributor rediscovers each bug independently. Start with 10 most common: SUM of dates, WHERE before JOIN, missing COALESCE/NULLIF, wrong boolean compare, PG-only casts, FX at facility level, CTE in formula_sql.
**Effort:** Large.

### 16. Pipeline resumption / idempotency for scenario-runner
**What:** Write per-scenario SQL files, then concatenate at the end. Crash = re-run only the missing scenario.
**Why:** Crash mid-run produces partial SQL file with no recovery.
**Effort:** Small-Medium.

### 17. Extend YAML metric schema for SR 11-7 documentation fields
**What:** Add `metadata.assumptions`, `metadata.limitations`, `metadata.owner` fields to the YAML metric config schema. Backfill existing YAMLs.
**Why:** Without them, every SR 11-7 review reports these items as MISSING — false-positive noise.
**Effort:** Small.

---

## Completed (removed 2026-03-24)
Items verified done and removed: Migration framework (S3), Remove modulo capping, L3 FK-less ADR, GitHub Actions CI, Convert factory hard-coded SQL, Fix LOAD_ORDER labels, Error logging in readDataDictionary, Vitest framework, npm dependency upgrade (next@15, recharts@3, zustand@5), Global error boundary, Delete l2-generator.ts, Delete escape-hatch.ts, Extract shared seed/validation modules. Also removed: Split registry.ts (now 119 LOC, no longer a problem), Deduplicate LineageExplorer.tsx (dead code — deleting instead).
