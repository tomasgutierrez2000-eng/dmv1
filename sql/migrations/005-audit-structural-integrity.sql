-- Migration 005: Audit Structural Integrity Fixes
-- Date: 2026-03-12
-- Source: GSIB Data Model Audit — Structural Integrity domain
-- Changes:
--   1. Add UNIQUE constraint on facility_exposure_snapshot(facility_id, as_of_date)
--   2. Add UNIQUE constraint on counterparty_rating_observation(counterparty_id, rating_source_id, as_of_date)

SET search_path TO l1, l2, l3, public;

-- ============================================================
-- CHANGE 1: Temporal uniqueness on facility_exposure_snapshot
-- ============================================================
-- Current PK is surrogate facility_exposure_id only.
-- Without this constraint, duplicate snapshots for the same
-- facility on the same date are allowed, corrupting exposure
-- aggregation and all downstream L3 metrics.

-- First deduplicate if needed (keep lowest surrogate ID per natural key)
DELETE FROM l2.facility_exposure_snapshot
WHERE facility_exposure_id NOT IN (
    SELECT MIN(facility_exposure_id)
    FROM l2.facility_exposure_snapshot
    GROUP BY facility_id, as_of_date
);

ALTER TABLE l2.facility_exposure_snapshot
  ADD CONSTRAINT uq_fes_facility_date UNIQUE (facility_id, as_of_date);

-- ============================================================
-- CHANGE 2: Temporal uniqueness on counterparty_rating_observation
-- ============================================================
-- Current PK is surrogate observation_id only.
-- Without this constraint, duplicate ratings per counterparty
-- per source per date are allowed, corrupting PD estimation
-- and rating migration analysis.

-- First deduplicate if needed (keep lowest surrogate ID per natural key)
DELETE FROM l2.counterparty_rating_observation
WHERE observation_id NOT IN (
    SELECT MIN(observation_id)
    FROM l2.counterparty_rating_observation
    GROUP BY counterparty_id, rating_source_id, as_of_date
);

ALTER TABLE l2.counterparty_rating_observation
  ADD CONSTRAINT uq_cro_cp_source_date UNIQUE (counterparty_id, rating_source_id, as_of_date);
