# MVP Database — Upload Guide & Scenario Documentation

## Quick Start

### Files
| File | Size | Description |
|------|------|-------------|
| `sql/exports/mvp-dump.sql` | 39 MB | Full SQL dump (DDL + data) |
| `sql/exports/mvp-dump.sql.gz` | 1.5 MB | Gzipped version |

### Upload to a New GCP Cloud SQL PostgreSQL Instance

**Option A: From Cloud Shell (recommended)**
```bash
# 1. Upload the dump to Cloud Shell or a GCE VM with access
gcloud cloud-shell scp ~/mvp-dump.sql.gz :~/ --zone=us-central1-a

# 2. Connect to Cloud SQL (replace with your instance details)
#    - Go to GCP Console > SQL > your instance > Overview
#    - Copy the "Connection name" (e.g., project:region:instance)
gcloud sql connect YOUR_INSTANCE_NAME --user=postgres

# 3. Create the database
CREATE DATABASE credit_dw;
\q

# 4. Load the dump
gunzip mvp-dump.sql.gz
gcloud sql connect YOUR_INSTANCE_NAME --user=postgres --database=credit_dw < mvp-dump.sql
```

**Option B: Via Cloud SQL Auth Proxy (from local machine)**
```bash
# 1. Install Cloud SQL Auth Proxy
# https://cloud.google.com/sql/docs/postgres/connect-auth-proxy

# 2. Start the proxy
cloud-sql-proxy YOUR_PROJECT:YOUR_REGION:YOUR_INSTANCE --port=5433

# 3. In another terminal, create DB and load
psql "host=127.0.0.1 port=5433 user=postgres" -c "CREATE DATABASE credit_dw;"
gunzip -k sql/exports/mvp-dump.sql.gz
psql "host=127.0.0.1 port=5433 user=postgres dbname=credit_dw" -f sql/exports/mvp-dump.sql
```

**Option C: Direct connection (if public IP enabled)**
```bash
# 1. Whitelist your IP in GCP Console > SQL > Connections > Networking
# 2. Get the public IP from the instance overview

psql "host=YOUR_PUBLIC_IP user=postgres" -c "CREATE DATABASE credit_dw;"
gunzip -k sql/exports/mvp-dump.sql.gz
psql "host=YOUR_PUBLIC_IP user=postgres dbname=credit_dw" -f sql/exports/mvp-dump.sql
```

### Post-Upload Verification
```sql
-- Check schemas exist
SELECT schemaname, COUNT(*) FROM pg_tables WHERE schemaname IN ('l1','l2','l3') GROUP BY schemaname;
-- Expected: l1=61, l2=53, l3=56

-- Check key row counts
SELECT 'counterparty' as tbl, COUNT(*) FROM l2.counterparty
UNION ALL SELECT 'facility_master', COUNT(*) FROM l2.facility_master
UNION ALL SELECT 'facility_exposure_snapshot', COUNT(*) FROM l2.facility_exposure_snapshot
UNION ALL SELECT 'risk_flag', COUNT(*) FROM l2.risk_flag
UNION ALL SELECT 'metric_value_fact', COUNT(*) FROM l3.metric_value_fact;
-- Expected: 302, 806, 3082, 389, 58005

-- Verify FK chain integrity
SELECT COUNT(*) as broken_chains
FROM l2.facility_master fm
LEFT JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
LEFT JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
WHERE ca.credit_agreement_id IS NULL OR c.counterparty_id IS NULL;
-- Expected: 0
```

### App Configuration
Set the `DATABASE_URL` environment variable to point to the new instance:
```
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/credit_dw
```

Then run:
```bash
npm run db:introspect   # Sync data dictionary from new DB
npm run dev             # Start the app
```

---

## Database Overview

### Portfolio Summary (as of Jan 31, 2025)
| Metric | Value |
|--------|-------|
| Counterparties | 302 |
| Facilities | 806 |
| Credit Agreements | 306 |
| **Total Committed Exposure** | **USD 628.3B** |
| **Total Drawn Exposure** | **USD 335.4B** |
| **Utilization Rate** | **53.4%** |
| Risk Flags | 389 |
| Credit Events | 25 |
| Stress Test Breaches | 136 |
| Pre-computed L3 Metric Values | 58,005 |

### Schema Statistics
| Schema | Tables | Total Rows | Purpose |
|--------|--------|-----------|---------|
| L1 | 61 | ~1,400 | Reference/dimension data |
| L2 | 53 | ~28,000 | Atomic snapshots & events |
| L3 | 56 | ~59,300 | Derived metrics & calculations |

### Exposure Distribution

**By Region:**
| Region | Counterparties | Committed | % of Total |
|--------|---------------|-----------|-----------|
| AMER | 192 | USD 429.0B | 68.3% |
| EMEA | 58 | USD 119.5B | 19.0% |
| APAC | 49 | USD 79.8B | 12.7% |

**By Rating:**
| Rating | Counterparties | Committed | Grade |
|--------|---------------|-----------|-------|
| AA | 9 | USD 114.2B | Investment |
| A+ | 28 | USD 110.7B | Investment |
| A | 68 | USD 224.2B | Investment |
| A- | 2 | USD 3.3B | Investment |
| BBB+ | 62 | USD 101.8B | Investment |
| BBB | 99 | USD 54.4B | Investment |
| BBB- | 1 | USD 0.6B | Investment |
| BB+ | 23 | USD 16.0B | Non-investment |
| BB | 5 | USD 2.1B | Non-investment |
| B+ | 1 | USD 0.6B | Non-investment |
| B | 1 | USD 0.6B | Non-investment |

### Date Coverage
| Date | Exposure Snapshots | Facilities |
|------|-------------------|------------|
| 2024-11-30 | 322 | 322 |
| 2024-12-31 | 324 | 324 |
| 2025-01-31 | 2,406 | 786 |
| 2025-02-28 | 10 | 10 |

312 facilities have full 3-month trend data (Nov → Dec → Jan).

---

## Visualizable Scenarios

### 1. CRO Executive Dashboard
**Data available:** Full portfolio exposure, risk flags, credit events, stress test results.

**What you can show:**
- Total committed/drawn exposure with utilization rate
- Exposure breakdown by region (AMER/EMEA/APAC)
- Rating distribution across the portfolio
- Top counterparty exposures (302 counterparties)
- Risk flag summary (389 flags across 69 flag types)
- 3-month exposure trend for 312 facilities

### 2. Stress Testing Scenarios
**10 stress scenarios with breach data (136 total breaches):**

| # | Scenario | Breaches | Counterparties | Total Breach Amount |
|---|----------|----------|---------------|-------------------|
| S1 | CCAR Baseline | 8 | 8 | USD 2.9B |
| S2 | CCAR Adverse | 15 | 14 | USD 5.4B |
| S3 | CCAR Severely Adverse | 25 | 24 | USD 7.2B |
| S4 | Custom Management | 10 | 10 | USD 0.5B |
| S5 | Historical GFC Replay | 20 | 18 | USD 6.1B |
| S6 | Historical COVID Replay | 18 | 16 | USD 5.7B |
| S7 | IR +300bp Shock | 12 | 12 | USD 2.2B |
| S8 | IR -200bp Shock | 8 | 7 | USD 1.7B |
| S9 | CRE Downturn | 14 | 11 | USD 2.8B |
| S10 | Idiosyncratic Single-Name | 6 | 6 | USD 0.4B |

**Visualization ideas:** Scenario comparison heatmaps, breach severity distribution, counterparty vulnerability across scenarios, 3-month breach progression.

### 3. Credit Events & Watch List
**25 credit events across Dec 2024 — Jan 2025:**

| Event Type | Count | Examples |
|-----------|-------|---------|
| Obligation Default (4) | 10 | Victoria Harbour Properties, NexGen Software, Emirates Tower |
| Rating Downgrade (10) | 6 | Deepwater Drilling, MedCore Health, Hanjin Semiconductor |
| Restructuring (5) | 4 | Permian Basin Resources, Nippon Express Railway |
| Cross Default (8) | 3 | Kowloon Land, Rheinische Landesbank, Great Plains Bank |
| Government Intervention (7) | 2 | Atlas Global Logistics, Harborview CRE Partners |

**Visualization ideas:** Event timeline, event type distribution, loss amount analysis, counterparty credit deterioration tracking.

### 4. Risk Flag Analysis
**389 risk flags across 69 flag codes, covering 165 counterparties:**

**Top flag categories:**
| Flag Type | Top Codes | Count |
|-----------|----------|-------|
| WATCH_LIST | Stress Test Breach, Sector/Maturity/Country Concentration | 130 |
| CONCENTRATION | Maturity, Collateral Decline, Sector, Cross-Sector | 97 |
| WATCH_LIST | Climate Risk, Data Quality, Revolver Draw Spike | 80 |
| CONCENTRATION | Geographic, Syndicated, Rapid Onboarding | 40 |

**Severity distribution:** CRITICAL (17), HIGH (219), MEDIUM (137), LOW (16)

**Visualization ideas:** Flag heatmap by severity and type, concentration risk map, counterparty watch list, flag trend analysis.

### 5. Exposure Concentration Analysis
**Breakdowns available:**
- By counterparty (302 distinct, with legal names, industries, countries)
- By facility type (Term Loans, Revolvers, etc.)
- By region (AMER 68%, EMEA 19%, APAC 13%)
- By rating grade (90%+ investment grade)
- By currency
- By portfolio/LOB attribution (2,925 facility-LOB links)

### 6. Collateral & Coverage
**174 collateral assets with valuation snapshots, 200 collateral-facility links.**

**Visualization ideas:** Collateral coverage ratios, haircut analysis, collateral type distribution, coverage trends.

### 7. Payment & Delinquency Monitoring
**2,352 payment records (Nov 2024 — Feb 2025), 70 delinquency snapshots.**

**Payment status:** PAID (2,102), PARTIAL (93), DELINQUENT (86), PENDING (55), REVERSED (16)

**Visualization ideas:** Payment performance waterfall, delinquency rate trends, DPD bucket distribution.

### 8. Pricing & Profitability
**1,361 pricing snapshots, 813 profitability snapshots.**

**Visualization ideas:** Spread analysis by rating/region, RAROC distribution, fee income breakdown, pricing tier utilization.

### 9. Counterparty Financial Health
**69 financial snapshots across 23 counterparties (3 dates each).**

**Visualization ideas:** DSCR/leverage trends, revenue growth analysis, financial deterioration indicators.

### 10. Pre-Computed Metrics (L3)
**62 distinct metrics with 58,005 pre-computed values across 5 aggregation levels:**

| Level | Rows | Description |
|-------|------|-------------|
| Facility | 47,836 | Per-facility metric values |
| Counterparty | 12,366 | Per-counterparty rollups |
| Desk | 8,355 | Desk-level aggregations |
| Portfolio | 2,464 | Portfolio summaries |
| LOB | 422 | Business segment totals |

**Metric domains:** EXP (Exposure), PRC (Pricing), REF (Reference), RSK (Risk), CAP (Capital), AMD (Amendment), PROF (Profitability)

---

## Data Quality Notes

### Fixes Applied Before Dump
1. **Credit agreement borrower alignment** — 89 credit agreements updated to match facility counterparty_id (was randomized in seed data)
2. **Risk rating normalization** — All 302 counterparties now use letter-scale ratings (AA through B). Previously 230 used numeric 2-8 scale.
3. **Region code population** — All counterparties now have region_code (AMER/EMEA/APAC) derived from country_code. Previously 98% were NULL.
4. **Overdrawn facility fix** — Facility 9 corrected (drawn > committed by $20M)
5. **Orphan facility exposure** — 20 facilities (5701-5720) given exposure snapshots
6. **NULL metric cleanup** — 13,438 stub rows with NULL values removed from metric_value_fact

### Known Limitations
- **L3 summary tables are empty** — 51 of 56 L3 tables have no rows. The metric calculation engine computes on-the-fly from L2 data. Pre-computed L3 cubes are not yet populated.
- **Single-date metrics** — All L3 metric_value_fact data is for 2025-01-31 only. L2 has 3-month trend data but L3 aggregations haven't been run for historical dates.
- **Sparse financial data** — Only 23 of 302 counterparties have financial snapshot data (DSCR, leverage, etc.)
- **462 single-date facilities** — 59% of facilities only have Jan 2025 exposure data. 312 have full Nov/Dec/Jan trend coverage.
