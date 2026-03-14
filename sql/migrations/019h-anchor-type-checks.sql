-- Migration 019h: Add CHECK constraints on anchor_type columns
-- Finding: F-5.4 (MEDIUM) — Polymorphic anchor_type columns unconstrained
-- Remediation: GSIB Data Model Audit 2026-03
--
-- Constrains anchor_type to the allowed set of entity types
-- to prevent referential integrity drift.

SET search_path TO l1, l2, l3, public;

DO $$ BEGIN
  ALTER TABLE l2.netting_set_link
    ADD CONSTRAINT chk_netting_set_link_anchor_type
    CHECK (anchor_type IN ('FACILITY', 'INSTRUMENT', 'POSITION'));
  RAISE NOTICE 'Added CHECK on netting_set_link.anchor_type';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped netting_set_link.anchor_type CHECK: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE l2.collateral_link
    ADD CONSTRAINT chk_collateral_link_anchor_type
    CHECK (anchor_type IN ('FACILITY', 'INSTRUMENT', 'POSITION'));
  RAISE NOTICE 'Added CHECK on collateral_link.anchor_type';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped collateral_link.anchor_type CHECK: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE l2.protection_link
    ADD CONSTRAINT chk_protection_link_anchor_type
    CHECK (anchor_type IN ('FACILITY', 'INSTRUMENT', 'POSITION'));
  RAISE NOTICE 'Added CHECK on protection_link.anchor_type';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped protection_link.anchor_type CHECK: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE l2.risk_mitigant_link
    ADD CONSTRAINT chk_risk_mitigant_link_anchor_type
    CHECK (anchor_type IN ('FACILITY', 'INSTRUMENT', 'POSITION'));
  RAISE NOTICE 'Added CHECK on risk_mitigant_link.anchor_type';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped risk_mitigant_link.anchor_type CHECK: %', SQLERRM;
END $$;
