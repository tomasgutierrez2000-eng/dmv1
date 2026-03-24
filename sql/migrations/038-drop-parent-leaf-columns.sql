-- Migration 038: Drop legacy parent_leaf VARCHAR columns from taxonomy tables
--
-- Both enterprise_business_taxonomy and enterprise_product_taxonomy have a
-- legacy 'parent_leaf' VARCHAR(64) column alongside the correct BIGINT
-- parent FK columns (parent_segment_id and parent_node_id respectively).
-- The VARCHAR column is unused by all code and creates FK type mismatch risk.

ALTER TABLE l1.enterprise_business_taxonomy
  DROP COLUMN IF EXISTS parent_leaf;

ALTER TABLE l1.enterprise_product_taxonomy
  DROP COLUMN IF EXISTS parent_leaf;
