-- Add 4 tables from loading stage to PostgreSQL
-- L1: exception_status_dim, limit_status_dim, rating_change_status_dim
-- L2: limit_assignment_snapshot

-- L1 Tables
CREATE TABLE IF NOT EXISTS "l1"."limit_status_dim" (
    "limit_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "severity_ordinal" INTEGER,
    "display_order" INTEGER,
    "active_flag" BOOLEAN,
    PRIMARY KEY ("limit_status_code")
);

CREATE TABLE IF NOT EXISTS "l1"."exception_status_dim" (
    "exception_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "requires_approval_flag" BOOLEAN,
    "display_order" INTEGER,
    "active_flag" BOOLEAN,
    PRIMARY KEY ("exception_status_code")
);

CREATE TABLE IF NOT EXISTS "l1"."rating_change_status_dim" (
    "rating_change_status_code" VARCHAR(20) NOT NULL,
    "status_name" VARCHAR(200),
    "description" VARCHAR(500),
    "direction" VARCHAR(20),
    "display_order" INTEGER,
    "active_flag" BOOLEAN,
    PRIMARY KEY ("rating_change_status_code")
);

-- L2 Table (needs search_path for FK resolution)
SET search_path TO l1, l2, public;

CREATE TABLE IF NOT EXISTS "l2"."limit_assignment_snapshot" (
    "facility_id" BIGINT NOT NULL,
    "limit_rule_id" BIGINT NOT NULL,
    "as_of_date" DATE NOT NULL,
    "limit_amt" NUMERIC(20,4),
    "assigned_date" DATE,
    "expiry_date" DATE,
    "status_code" VARCHAR(20),
    "currency_code" VARCHAR(20),
    "created_ts" TIMESTAMP,
    "updated_ts" TIMESTAMP,
    PRIMARY KEY ("facility_id", "limit_rule_id", "as_of_date")
);
