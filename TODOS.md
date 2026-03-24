# TODOS

## Build Now (from Eng Review 2026-03-20)

### 1. Regenerate DDL from Data Dictionary
**What:** Bring 3 DDL files (01-l1-ddl, 02-l2-ddl, 03-l3-ddl) into alignment with golden-source data dictionary.
**Why:** 9 orphaned tables cause confusion for offline users and make DDL files unreliable as fallback.
**Depends on:** Issue 2 (drop legacy FK) should complete first so the regenerated DDL doesn't include legacy columns.

### 2. Drop legacy 'parent' VARCHAR column from taxonomy tables
**What:** Write migration to remove VARCHAR 'parent' column and its FK from enterprise_business_taxonomy and enterprise_product_taxonomy.
**Why:** VARCHAR↔BIGINT FK type mismatch is a crash risk on the rollup backbone. All code uses parent_segment_id (BIGINT).
**Depends on:** Nothing.

### 3. Full migration framework
**What:** Adopt a migration runner with schema_migrations version tracking table. Catalogue all 59 existing migrations.
**Why:** No way to know which migrations have been applied. Manual psql -f is error-prone for team scaling.
**Depends on:** Nothing.
**Completed:** S3 session (2026-03-24) — Migration Manager agent with `audit.schema_migrations` tracking table, bootstrap logic for 68+ existing migrations, status reporting, ordering validation, apply/rollback workflows.

### 4. Remove modulo capping from load-gsib-export.ts
**What:** Delete ~140 lines of modulo arithmetic FK remapping. Fix L2 seed data to reference valid L1 IDs natively.
**Why:** Exact anti-pattern CLAUDE.md warns against ("The Modular Arithmetic Trap — NEVER DO THIS"). Silently destroys narrative coherence.
**Depends on:** May need L1 dim table expansion if L2 seed references IDs outside L1 range.

### 5. Document L3 FK-less design as ADR
**What:** Write Architecture Decision Record explaining why L3 uses formula-driven joins (not DDL FKs).
**Why:** 5 existing L3 FKs suggest partial intent that was never completed — confusing without documentation.
**Depends on:** Nothing.

### 6. GitHub Actions CI workflow
**What:** Create .github/workflows/ci.yml running typecheck, lint, test:metrics, test:calc-engine, validate on push/PR.
**Why:** No CI/CD exists. Validation scripts exist but only run when manually invoked.
**Depends on:** Nothing.

### 7. Extract shared sql-value-formatter.ts + PG reserved words
**What:** Consolidate 3 formatSqlValue() implementations (sql-emitter.ts, db-writer.ts, ddl-generator.ts) and 3 PG_RESERVED_WORDS copies into one module.
**Why:** DRY violation that can cause silent data corruption. db-writer missing exception IDs and count rounding.
**Depends on:** Nothing. Other items (4, 8, 9) benefit from this being done first.

### 8. Convert factory hard-coded SQL to structured data
**What:** Replace FACTORY_COUNTRY_SETUP and FACTORY_CURRENCY_SETUP raw SQL strings in sql-emitter.ts with structured objects validated by SchemaValidator.
**Why:** Hard-coded SQL bypasses schema validation. Schema changes would silently break these inserts.
**Depends on:** Issue 7 (shared formatter) for consistent type formatting.

### 9. Fix LOAD_ORDER schema labels
**What:** Change 'l2.counterparty' → 'l1.counterparty' (and credit_agreement_master, facility_master) in sql-emitter.ts LOAD_ORDER.
**Why:** Documentation bug — these are L1 tables labeled as L2. Would break schema-qualified lookups.
**Depends on:** Nothing. 3-line fix.

### 10. Add error logging to readDataDictionary
**What:** Log parse errors in lib/data-dictionary.ts before returning null. Distinguish ENOENT from corruption.
**Why:** Silent error swallowing masks DD file corruption. Downstream consumers operate on stale data with no diagnosis path.
**Depends on:** Nothing. 3-line fix.

### 11. Full Vitest framework migration
**What:** Add Vitest, convert existing test scripts to test suites, add new tests for untested flows.
**Why:** No test framework exists. Custom assert() scripts lack parallel execution, watch mode, coverage, test isolation.
**Depends on:** Nothing (can start immediately).

### 12. Comprehensive formatSqlValue test suite
**What:** Write 30+ test cases covering all suffix rules, edge cases, exception IDs, NaN/null handling, boolean coercion.
**Why:** formatSqlValue() is called for every INSERT row in the entire database pipeline. Zero tests today.
**Depends on:** Issues 7 (shared module) and 11 (Vitest).

### 13. Incremental introspection
**What:** Parse DDL commands to identify affected tables, only re-introspect those instead of all 211.
**Why:** db:introspect takes 10-30 seconds over GCP Cloud SQL network. PostToolUse hook blocks dev on every DDL change.
**Depends on:** Nothing.

---

## Build Now (from Full-Platform Eng Review 2026-03-20)

### Phase 1: Foundation (no dependencies)

### 14. Global error boundary
**What:** Add `app/error.tsx` + `app/global-error.tsx` (~30 LOC). Catches React render crashes, shows friendly error with retry button.
**Why:** Any component crash = white screen with no recovery. 125 components, 0 error boundaries.
**Depends on:** Nothing.

### 15. Delete legacy l2-generator.ts
**What:** Remove `scenarios/factory/l2-generator.ts` (1,887 LOC) after verifying no imports. Pre-V2 monolithic generator replaced by v2/generators/*.
**Why:** Dead code creating confusion.
**Depends on:** Nothing.

### 16. Delete dead escape-hatch
**What:** Gut `lib/metrics-calculation/escape-hatch.ts`. Empty registry, dead code path. `metric.notes.includes('calcFnId=XXX')` never matches.
**Why:** Dead code that creates confusion about whether escape hatches are a real feature.
**Depends on:** Nothing.

### 17. Extract shared seed/validation modules
**What:** Create `scripts/shared/seed-config.ts` (BASE_DRAWN, COMMITTED, BASE_SPREADS, rating tier mappings) and `lib/validation-utils.ts` (shared formula checks). Update 6 consumers across l1/seed-data.ts, l2/seed-data.ts, facility-summary-mvp, scenarios/factory.
**Why:** DRY violations — seed data arrays, rating mappings, validation rules duplicated across 3 systems.
**Depends on:** Nothing.

### Phase 2: Security + Infrastructure

### 18. Full API security layer
**What:** Add Next.js `middleware.ts` with CSP headers, rate limiting on `/api/agent`, request logging for all routes, verify API keys aren't leaked in responses.
**Why:** No security layer exists. /api/agent is an LLM proxy with real cost. API keys in next.config.js env block.
**Depends on:** Nothing.

### 19. Full npm dependency upgrade
**What:** Upgrade next@14→16, recharts@2→3, zustand@4→5, fix 8 high-severity npm audit vulnerabilities (minimatch ReDoS, Next.js DoS, xlsx prototype pollution).
**Why:** Real CVEs. Next.js 16 has breaking changes requiring regression testing across 25 pages + 64 API routes.
**Depends on:** Phase 1 complete (error boundary provides safety net during upgrade).

### Phase 3: Test Framework

### 20. Full test suite (Vitest + testing-library + Playwright)
**What:** Set up Vitest for unit tests, @testing-library/react for component tests, Playwright for E2E. Priority: lib/ unit tests (config-builder, api-response, formula-resolver, sql-runner, upload-validator, metrics-store ~200 test cases) → component tests → E2E for critical flows (visualizer, calculator, upload).
**Why:** 0% coverage across components (125 files), API routes (64 routes), lib/ (69 files). 4 critical silent failure modes identified.
**Depends on:** Phase 2 (test against upgraded deps). Extends existing TODO #11.

### Phase 4: Major Refactors

### 21. YAML-only metric authority
**What:** Make YAML the single source of truth. Generate `l3-metrics.ts` and `catalogue.json` from YAML. Delete hardcoded metric objects. Rewrite `getMergedMetrics()`.
**Why:** Triple authority (L3Metric + catalogue.json + YAML) creates formula conflicts and merge chaos. catalogue.json is 3.2MB and merge-conflict-prone.
**Depends on:** Phase 3 (need tests to verify the migration doesn't break anything).

### 22. Split semantic-layer/registry.ts
**What:** Break `lib/semantic-layer/registry.ts` (809 LOC) into YamlReader, CatalogueLoader, Merger, Validator (~150 LOC each).
**Why:** Monolithic module doing YAML reading, catalogue merging, DD alignment, caching in one function.
**Depends on:** Phase 3.

### 23. Improve SQL adapter (CTE + window function support)
**What:** Add CTE (`WITH ... AS`) and window function (`ROW_NUMBER() OVER()`) support to `lib/metrics-calculation/sql-runner.ts`. Currently uses 80 lines of regex for PG→SQLite adaptation with no CTE support.
**Why:** Metric formulas using CTEs silently break. Per CLAUDE.md, CTEs are a known formula_sql limitation.
**Depends on:** Phase 3.

### 24. React Query migration
**What:** Replace 46 manual fetch+useState patterns with React Query. Request dedup, caching, refetch-on-focus, AbortController.
**Why:** Current pattern has race conditions, no cancellation, repeated 8-line boilerplate across 20+ components.
**Depends on:** Phase 2 (next@16 upgrade).

### Phase 4B: Design & UX (from Design Review 2026-03-20)

### 27. Unify to dark theme + add light/dark toggle
**What:** Convert Metrics Library, Data Elements, and DB Status from light to dark theme. Add a toggle in the persistent nav bar.
**Why:** Users experience jarring theme switches when navigating between sections — dark→light→dark feels like different tools, not one product.
**Pros:** Cohesive visual identity across the entire platform.
**Cons:** Significant — Data Elements and DB Status have extensive light-theme Tailwind classes. Need to audit all component colors.
**Context:** Dark theme is the majority (home, visualizer, architecture, taxonomy, agent, exec summary). Light pages are 3 of ~15 groups.
**Depends on:** TODO 1 from "Build Now" design items (persistent nav for toggle placement). Recommend running `/design-consultation` first to define color tokens.

### 28. Redesign home page with Spine + live stats
**What:** Replace generic hero text + 3 layer cards with a mini Spine visualization (the platform's best visual) and live stats (211 tables, 84 metrics, 253 relationships). Keep 6 nav buttons in persistent header.
**Why:** Home page undersells the platform with generic card layouts. The Spine shows what makes this tool distinctive.
**Pros:** First impression matches the quality of the rest of the platform.
**Cons:** Requires extracting/simplifying SpineView component for the home page.
**Context:** Spine exists in `components/architecture-overview/SpineView.tsx`. Stats from `/api/schema/bundle`.
**Depends on:** Persistent nav bar (nav buttons move to header, freeing home page space).

### Phase 5: Cleanup

### 25. Split mega-files
**What:** Split 5 monolithic files into focused sub-modules:
- `quality-controls.ts` (1,735 LOC) → 11 files by validation group
- `validate-data-model.ts` (1,647 LOC) → 9 files by validation topic
- `Canvas.tsx` (1,201 LOC) → extract drag/pan/zoom hooks + sub-components
- `template-upload.ts` (1,073 LOC) → separate UI from logic
- `sync-yaml-to-catalogue.ts` (867 LOC) → loader, matcher, level-generator, writer
**Why:** Hard to test, review, and maintain. Each file does 5-11 independent things.
**Depends on:** Phase 3 (tests verify splits don't break anything).

### 26. Performance fixes
**What:** Three sub-tasks:
1. Split `catalogue.json` (3.2MB) into `catalogue-core.json` + `catalogue-demo.json`
2. Add file-watch cache invalidation to `semantic-layer/registry.ts`
3. Refactor `scenarios/factory/validator.ts` from O(n²) FK checks to O(n) using Set/Map lookups
**Why:** 3.2MB JSON causes slow git + merge conflicts. Stale cache serves wrong data. O(n²) validator slow on 16K+ rows.
**Depends on:** TODO #21 (YAML consolidation) is complementary.

### 23. Deduplicate LineageExplorer.tsx vs LineageFlowView.tsx
**What:** Investigate whether `components/lineage/LineageExplorer.tsx` (35KB) is dead code or used elsewhere. If dead, delete it. If used, either merge with LineageFlowView or extract shared layout engine.
**Why:** Two lineage renderers with separate `computeLayout` functions will diverge after the Unified Lineage-Trace feature enhances LineageFlowView. Risk of stale/inconsistent rendering.
**Depends on:** Best done after or alongside the Unified Lineage-Trace implementation.

---

## Deferred (from Factory Eng Review 2026-03-23)

### 29. Extract CLAUDE.md lessons-learned into executable validation rules
**What:** The 50+ rows in CLAUDE.md's "Common YAML Formula Bugs" and "PostgreSQL Seed Data Quality Checklist" tables are unimplemented validation rules. Extract the automatable ones (e.g., "SUM of dates", "WHERE before JOIN", "Missing COALESCE") into programmatic checks in the calc-engine validator or a new SQL linter.
**Why:** Every new contributor will rediscover each bug independently. Prose documentation doesn't prevent recurrence. The outside voice flagged this as the review's biggest blind spot.
**Pros:** Systematic prevention. New metric authors get immediate feedback instead of debugging for hours.
**Cons:** Large scope — 50+ rules, each with different detection logic. Some are judgment calls ("wrong source layer") that can't be fully automated.
**Context:** Start with the 10 most common bugs from the table (SUM of dates, WHERE before JOIN, missing COALESCE, missing NULLIF, wrong boolean compare, PG-only casts, FX at facility level, CTE in formula_sql, wrong field name, wrong source layer). Each becomes a regex or AST check in a new `lib/sql-linter.ts`.
**Depends on:** Vitest migration (TODO #11) for test infrastructure.

### 30. Pipeline resumption / idempotency for scenario-runner
**What:** If `scenario-runner.ts` crashes mid-pipeline (e.g., scenario S35 of 38), add ability to resume from where it left off rather than re-generating all 38 scenarios.
**Why:** Crash mid-run produces partial SQL file with no recovery. Re-running all 38 scenarios wastes time.
**Pros:** Faster iteration when debugging single-scenario failures.
**Cons:** Adds checkpoint logic and state persistence. May not be worth it if pipeline completes in <5 minutes.
**Context:** Current mitigation: `--scenario S35` flag runs a single scenario. But doesn't help with partial SQL file from a crash. Approach: write per-scenario SQL files, then concatenate at the end. Crash = re-run only the missing scenario.
**Depends on:** Nothing.

### 31. Extend YAML metric schema for SR 11-7 documentation fields
**What:** Add `metadata.assumptions`, `metadata.limitations`, `metadata.owner` fields to the YAML metric config schema template.
**Why:** The SR 11-7 documentation checker (`reviewers/sr-11-7-checker.md`) references these fields in its 12-item compliance checklist (items 4-5, 10-11). Without them, every SR 11-7 review reports these items as MISSING — creating noise in validation output.
**Pros:** SR 11-7 checks produce actionable results instead of false-positive MISSING flags. Metrics gain structured documentation for model risk management compliance.
**Cons:** All existing YAML metrics need the new fields added (can be automated via script). Slightly increases YAML file size.
**Context:** Identified during S9 integration testing (cross-reference audit). The checker itself documents this as an expected gap (line 118). Fix: update `scripts/calc_engine/types/metric-definition.ts` and the YAML template, then backfill existing YAMLs.
**Depends on:** Nothing.
