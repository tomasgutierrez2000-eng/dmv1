-- Migration 026: Drop legacy 'parent' VARCHAR column from taxonomy tables
--
-- Problem: enterprise_business_taxonomy and enterprise_product_taxonomy both have
-- a legacy "parent" VARCHAR(100) column with FK constraints referencing BIGINT PKs.
-- This is a VARCHAR↔BIGINT type mismatch — a crash risk on the rollup backbone.
--
-- All application code uses parent_segment_id (BIGINT) and parent_node_id (BIGINT)
-- for hierarchy traversal. The VARCHAR "parent" column is unused.
--
-- Changes:
--   1. Drop FK constraint fk_enterprise_business_taxonomy_parent
--   2. Drop column "parent" from enterprise_business_taxonomy
--   3. Drop FK constraint fk_enterprise_product_taxonomy_parent
--   4. Drop column "parent" from enterprise_product_taxonomy

SET search_path TO l1, public;

DO $$
BEGIN
  -- Step 1: Drop FK constraint on enterprise_business_taxonomy.parent
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_enterprise_business_taxonomy_parent'
      AND table_schema = 'l1'
  ) THEN
    ALTER TABLE l1.enterprise_business_taxonomy
      DROP CONSTRAINT fk_enterprise_business_taxonomy_parent;
    RAISE NOTICE 'Dropped FK constraint fk_enterprise_business_taxonomy_parent';
  ELSE
    RAISE NOTICE 'FK constraint fk_enterprise_business_taxonomy_parent does not exist, skipping';
  END IF;

  -- Step 2: Drop "parent" column from enterprise_business_taxonomy
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'l1' AND table_name = 'enterprise_business_taxonomy' AND column_name = 'parent'
  ) THEN
    ALTER TABLE l1.enterprise_business_taxonomy DROP COLUMN "parent";
    RAISE NOTICE 'Dropped column "parent" from enterprise_business_taxonomy';
  ELSE
    RAISE NOTICE 'Column "parent" does not exist on enterprise_business_taxonomy, skipping';
  END IF;

  -- Step 3: Drop FK constraint on enterprise_product_taxonomy.parent
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_enterprise_product_taxonomy_parent'
      AND table_schema = 'l1'
  ) THEN
    ALTER TABLE l1.enterprise_product_taxonomy
      DROP CONSTRAINT fk_enterprise_product_taxonomy_parent;
    RAISE NOTICE 'Dropped FK constraint fk_enterprise_product_taxonomy_parent';
  ELSE
    RAISE NOTICE 'FK constraint fk_enterprise_product_taxonomy_parent does not exist, skipping';
  END IF;

  -- Step 4: Drop "parent" column from enterprise_product_taxonomy
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'l1' AND table_name = 'enterprise_product_taxonomy' AND column_name = 'parent'
  ) THEN
    ALTER TABLE l1.enterprise_product_taxonomy DROP COLUMN "parent";
    RAISE NOTICE 'Dropped column "parent" from enterprise_product_taxonomy';
  ELSE
    RAISE NOTICE 'Column "parent" does not exist on enterprise_product_taxonomy, skipping';
  END IF;
END $$;
