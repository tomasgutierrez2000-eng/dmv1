-- Migration 019g: Add org_unit_id to l2.facility_master for desk attribution
-- Finding: F-5.1 (HIGH) — Facility → Desk path broken; no org_unit_id on facility_master
-- Remediation: GSIB Data Model Audit 2026-03
--
-- Enables the Facility → Counterparty → Desk → Portfolio → Segment referential chain.

SET search_path TO l1, l2, l3, public;

DO $$ BEGIN
  ALTER TABLE l2.facility_master ADD COLUMN org_unit_id BIGINT;
  RAISE NOTICE 'Added org_unit_id to l2.facility_master';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'org_unit_id already exists on l2.facility_master';
END $$;

DO $$ BEGIN
  ALTER TABLE l2.facility_master
    ADD CONSTRAINT fk_facility_master_org_unit
    FOREIGN KEY (org_unit_id) REFERENCES l1.org_unit_dim (org_unit_id);
  RAISE NOTICE 'Added FK facility_master.org_unit_id → org_unit_dim.org_unit_id';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped FK facility_master.org_unit_id: %', SQLERRM;
END $$;
