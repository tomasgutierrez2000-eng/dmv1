# ADR-001: L3 Tables Use Formula-Driven Joins, Not DDL Foreign Keys

**Status:** Accepted
**Date:** 2026-03-20
**Context:** Database engineering review

## Decision

L3 (derived/calculated) tables intentionally have minimal DDL-level FK constraints (5 FKs vs 76 for L1 and 170 for L2). Referential integrity for L3 is enforced through formula SQL at calculation time, not through PostgreSQL FK constraints.

## Context

The three-layer data model enforces:
- **L1 (Reference):** 76 FK constraints — static dimensions rarely change, FK enforcement is cheap
- **L2 (Atomic):** 170 FK constraints — snapshots reference L1 dimensions, FKs catch broken references at INSERT time
- **L3 (Derived):** 5 FK constraints — calculated from L1+L2 via SQL formulas, regenerated on demand

## Rationale

1. **L3 data is ephemeral.** It's regenerated from formulas, not loaded from source systems. Broken references are self-healing on recalculation.

2. **INSERT performance.** The data factory generates ~128K weekly time-series rows. FK checks on 79 L3 tables (each with 3-8 potential FK references) would add significant INSERT overhead for no practical safety benefit.

3. **Formula SQL is the contract.** Every L3 metric defines `formula_sql` with explicit JOINs to L1/L2 source tables. The formula IS the referential contract — if a source row doesn't exist, the formula returns NULL or 0, which is the correct behavior (not a constraint violation).

4. **Data factory validation covers it.** The `scenarios/factory/validator.ts` and `quality-controls.ts` (11 QC groups) validate FK integrity at the application level before SQL emission, catching the same errors DDL FKs would catch but with better error messages.

## Consequences

- L3 orphaned rows can exist if source L1/L2 data is deleted without recalculation
- No CASCADE protection on L1/L2 table changes affecting L3
- Data factory must validate L3 FK integrity in application code (already implemented)
- The 5 existing L3 FKs are intentional for the most critical relationships only

## Alternatives Considered

- **Full L3 FK enforcement:** Rejected — would add ~100+ constraints, slow INSERTs, and provide no practical safety beyond what formula validation already catches
- **FK enforcement on critical L3 tables only:** Viable but the selection criteria would be arbitrary. The 5 existing FKs cover the most critical cases already.
