-- Migration 019a: Create missing l2.cash_flow table
-- Finding: F-3.2 (CRITICAL) — table seeded in 06-factory-scenarios.sql but never created
-- Remediation: GSIB Data Model Audit 2026-03

SET search_path TO l1, l2, public;

CREATE TABLE IF NOT EXISTS l2.cash_flow (
    cash_flow_id   BIGINT NOT NULL,
    facility_id    BIGINT,
    counterparty_id BIGINT,
    cash_flow_date DATE,
    cash_flow_type VARCHAR(30),
    amount         NUMERIC(20,4),
    currency_code  VARCHAR(20),
    as_of_date     DATE,
    flow_direction VARCHAR(20),
    flow_type      VARCHAR(30),
    created_ts     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ts     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cash_flow_id)
);

-- FK constraints (applied idempotently)
DO $$ BEGIN
  ALTER TABLE l2.cash_flow
    ADD CONSTRAINT fk_cash_flow_facility_id
    FOREIGN KEY (facility_id) REFERENCES l2.facility_master (facility_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK cash_flow.facility_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE l2.cash_flow
    ADD CONSTRAINT fk_cash_flow_counterparty_id
    FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty (counterparty_id);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK cash_flow.counterparty_id: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE l2.cash_flow
    ADD CONSTRAINT fk_cash_flow_currency_code
    FOREIGN KEY (currency_code) REFERENCES l1.currency_dim (currency_code);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipped FK cash_flow.currency_code: %', SQLERRM;
END $$;
