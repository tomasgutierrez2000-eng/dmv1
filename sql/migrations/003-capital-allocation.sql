-- Migration 003: Capital Allocation Table
-- L1 reference table for capital and equity allocation targets across hierarchy nodes.
-- Polymorphic design: node_id + node_type allows allocation at any rollup level
-- (facility, counterparty, desk, portfolio, segment).
--
-- This file is idempotent: safe to re-run (uses IF NOT EXISTS).

SET client_min_messages TO WARNING;

-- Required for cross-schema FK references (legal_entity is in l2)
SET search_path TO l1, l2, l3, public;

-----------------------------------------------------------------------
-- L1: Capital Allocation Table
-----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS l1.capital_allocation (
    node_id                  BIGINT        NOT NULL,
    node_type                VARCHAR(30)   NOT NULL,  -- 'FACILITY','COUNTERPARTY','DESK','PORTFOLIO','SEGMENT'
    as_of_date               DATE          NOT NULL,
    legal_entity_id          BIGINT        NOT NULL,
    allocated_capital_amt    NUMERIC(20,4),           -- Allocated Capital ($)
    capital_allocation_pct   NUMERIC(10,6),           -- Capital Allocation %
    required_capital_pct     NUMERIC(10,6),           -- Required Capital %
    allocated_equity_amt     NUMERIC(20,4),           -- Allocated Equity ($)
    equity_allocation_pct    NUMERIC(10,6),           -- Equity Allocation %
    created_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_capital_allocation
        PRIMARY KEY (node_id, node_type, as_of_date, legal_entity_id),
    CONSTRAINT fk_ca_legal_entity
        FOREIGN KEY (legal_entity_id) REFERENCES l2.legal_entity (legal_entity_id),
    CONSTRAINT chk_ca_node_type
        CHECK (node_type IN ('FACILITY','COUNTERPARTY','DESK','PORTFOLIO','SEGMENT'))
);

COMMENT ON TABLE l1.capital_allocation IS 'Capital and equity allocation targets by hierarchy node';
