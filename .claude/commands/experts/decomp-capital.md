Capital Decomposition Expert — decomposes a capital adequacy metric into atomic ingredients, source tables, formulas, rollup architecture, and schema gaps.

Covers: CET1, Tier 1, Total Capital ratios, RWA (credit + market + operational), SLR, TLAC, capital buffers (CCB, G-SIB, CCyB), stress capital buffer (SCB), capital planning, binding constraint analysis.

Metric or capability to decompose: $ARGUMENTS

---

## 1. Invocation Modes

### Mode A: Direct (user-initiated)
User describes a metric need (e.g., "I need a CET1 ratio metric", "decompose TLAC").
- Run **Intake Questions** (Section 3)
- Load context (Section 2)
- Execute decomposition (Section 5)
- Present results and wait for confirmation (Section 6)

### Mode B: Orchestrator-invoked
```json
{
  "mode": "orchestrator",
  "metric_name": "CET1 Capital Ratio",
  "metric_id_hint": "CAP-001",
  "risk_stripe": "capital_risk",
  "capability": "regulatory_ratio",
  "dimensions": ["entity", "business_segment", "risk_type"],
  "requestor": "orchestrator-v1",
  "session_id": "uuid"
}
```

---

## 2. Context Loading (MANDATORY)

### Step 2a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```
Extract: `institution_tier` (GSIB — drives buffer requirements), `active_risk_stripes` (confirm capital_risk is live).

### Step 2b–2f: Same as decomp-credit-risk
Schema manifest, catalogue grep, YAML grep, source field validation, CLAUDE.md conventions.

**Additional for capital**: Check `sql/migrations/002-capital-metrics.sql` for existing capital-specific tables (from CLAUDE.md Capital Metrics Database section).

---

## 3. Intake Questions (Direct mode only)

**Q1. Risk stripe confirmation**
> This expert covers **capital adequacy**. If the metric is about credit risk RWA calculation methodology (PD, LGD, EAD), redirect to `decomp-credit-risk`. If it's about market risk capital (FRTB), redirect to `decomp-market-risk`. This expert handles the capital RATIO and BUFFER layer that sits on top of risk-type-specific RWA.

**Q2. Metric name and business concept**
> What is the metric? (e.g., "CET1 Ratio", "Supplementary Leverage Ratio", "TLAC Ratio", "G-SIB Surcharge Buffer", "Capital Consumption per Desk").

**Q3. Capital framework**
> Which framework?
> Options: `risk_based_capital` (CET1/T1/Total Capital ratios), `leverage` (SLR, Tier 1 Leverage), `tlac_resolution` (TLAC, long-term debt), `buffers` (CCB, G-SIB, CCyB, SCB), `capital_planning` (CCAR projections, stress buffers), `capital_allocation` (economic capital, RAROC)

**Q4. Approach**
> Which RWA approach for the denominator?
> Options: `standardized` (SA), `advanced` (A-IRB/F-IRB), `dual` (both SA and advanced), `not_applicable` (for leverage-based metrics)

**Q5. Capability being built**
> Options: `regulatory_ratio`, `buffer_monitoring`, `binding_constraint`, `capital_allocation`, `stress_capital`, `capital_planning`, `regulatory_reporting`

**Q6. Dimensions needed**
> Capital typically uses: `entity` (legal entity), `risk_type` (credit/market/operational), `business_segment`, `approach` (SA vs IRB). Confirm or narrow.

**Q7. Regulatory drivers**
> Specific requirements? (Basel III CAP 10-30, FR Y-9C HC-R, TLAC term sheet, Fed stress capital buffer rule, etc.)

---

## 4. Capital Knowledge Base

### 4A. Risk-Based Capital Ratios — Basel III

**Three-tiered structure:**
```
CET1 Ratio = CET1 Capital / Total RWA ≥ 4.5%
Tier 1 Ratio = Tier 1 Capital / Total RWA ≥ 6.0%
Total Capital Ratio = Total Capital / Total RWA ≥ 8.0%
```

#### CET1 Capital Components
| Component | Treatment |
|-----------|----------|
| Common stock (par + surplus) | +100% |
| Retained earnings | +100% |
| AOCI (Accumulated Other Comprehensive Income) | +/- (US: opt-out available for non-advanced) |
| Qualifying minority interest | Partial inclusion |
| **Deductions:** | |
| Goodwill & other intangibles | -100% |
| Deferred tax assets (net of DTLs) | -100% (above threshold) |
| Mortgage servicing assets | -100% (above threshold) |
| Investments in unconsolidated FIs | -100% (above threshold) |
| Threshold deductions (aggregate) | If >15% of CET1, deduct excess |

**Source tables**: `l2.capital_position_snapshot` (entity-level capital components), Y-9C/Call Report data
**FR Y-9C mapping**: Schedule HC-R Part I (capital components), HC-R Part II (RWA)

#### Tier 1 Capital = CET1 + Additional Tier 1 (AT1)
| AT1 Component | Criteria |
|---------------|---------|
| Non-cumulative perpetual preferred stock | Loss-absorbing, no maturity |
| Qualifying capital instruments | Write-down/conversion trigger at 5.125% CET1 |
| Minority interest (AT1 of subs) | Partial inclusion |

#### Tier 2 Capital
| Component | Criteria |
|-----------|---------|
| Subordinated debt (>5yr original maturity) | Amortized in final 5 years |
| General allowance for credit losses | Max 1.25% of credit RWA (SA) |
| Qualifying minority interest (T2 of subs) | Partial inclusion |

### 4B. Total RWA

```
Total RWA = Credit RWA + Market RWA + Operational RWA + CVA RWA
```

#### Credit RWA
**Standardized Approach (SA):**
```
Credit RWA = Σ(EAD_i × RW_i)
```
Risk weights by exposure class:
| Exposure Class | Risk Weight |
|---------------|-------------|
| Sovereign (AAA-AA) | 0% |
| Sovereign (A) | 20% |
| Bank (A+ rated, SCRA Grade A) | 30% |
| Corporate (unrated) | 100% |
| Corporate (rated AAA-AA) | 20% |
| Retail (regulatory) | 75% |
| Residential mortgage (LTV ≤80%) | 35% |
| CRE (LTV ≤60%) | Min(60%, counterparty RW) |
| Equity (listed) | 250% |
| Defaulted exposure | 150% |

**IRB Approach:**
```
Credit RWA = K(PD, LGD, M, ρ) × 12.5 × EAD
```
Where K = IRB capital requirement function incorporating maturity adjustment, correlation, and confidence interval.

**Source tables**: `l2.facility_risk_snapshot` (risk_weight_std_pct, risk_weight_erba_pct), `l3.facility_rwa_calc`, `l1.basel_exposure_type_dim`

#### Market RWA
- SA: FRTB SBM + DRC + RRAO (from decomp-market-risk)
- IMA: ES-based + DRC + SES (from decomp-market-risk)
- **Source tables**: Market risk capital charge × 12.5

#### Operational RWA
- SMA: Business Indicator Component × ILM (from decomp-oprisk)
- **Source tables**: Operational risk capital charge × 12.5

### 4C. Supplementary Leverage Ratio (SLR)

**Formula**:
```
SLR = Tier 1 Capital / Total Leverage Exposure ≥ 3% (5% for GSIB holding company)
```

**Total Leverage Exposure**:
```
TLE = On-balance sheet assets
    + Derivative exposures (SA-CCR based)
    + SFT exposures
    + Off-balance sheet exposures (notional × CCF)
```

**Key differences from RWA-based:**
- No risk weighting — every dollar of exposure counts equally
- Includes off-balance sheet at higher CCF than risk-based
- Derivative exposure uses SA-CCR (not CEM)
- SFT uses gross + add-on methodology

**Source tables**: Balance sheet total assets, SA-CCR derivative exposure, SFT exposure, off-balance sheet commitments
**FR Y-9C mapping**: Schedule HC-R Part I, line 44-48

### 4D. TLAC (Total Loss-Absorbing Capacity)

**Formula**:
```
TLAC Ratio = TLAC / Total RWA ≥ 18% (by 2022 for GSIBs)
TLAC Leverage = TLAC / Total Leverage Exposure ≥ 6.75%
```

**TLAC components**:
```
TLAC = CET1 + AT1 + Tier 2 + Eligible Long-Term Debt
```

**Eligible Long-Term Debt criteria:**
- Unsecured, issued by resolution entity (top-tier holding company)
- Residual maturity ≥ 1 year
- Not structured note, not redeemable within 1 year
- Governed by US law
- Contains contractual bail-in clause

**Source tables**: Capital components + eligible debt issuances, debt maturity schedule
**Fed rule**: 12 CFR 252.63 (external TLAC)

### 4E. Capital Buffers

| Buffer | Rate | Applies to | Trigger |
|--------|------|-----------|---------|
| Capital Conservation Buffer (CCB) | 2.5% | All banks | CET1 < 7% → dividend restrictions |
| G-SIB Surcharge | 1.0-3.5% | GSIBs only | Based on systemic importance score |
| Countercyclical Buffer (CCyB) | 0-2.5% | All banks | Macro-prudential, set by national authority |
| Stress Capital Buffer (SCB) | ≥2.5% | Large banks | Replaces CCB, based on CCAR stress losses |

**G-SIB Surcharge calculation (Method 2 — higher of two methods):**
```
G-SIB Score = 20% × Size + 20% × Interconnectedness + 20% × Substitutability + 20% × Complexity + 20% × Cross-jurisdictional Activity
```
Score buckets: 1 (130-229bp → 1%), 2 (230-329bp → 1.5%), ... up to bucket 5 (≥530bp → 3.5%)

**Stress Capital Buffer (SCB):**
```
SCB = max(2.5%, CCAR_stressed_capital_decline + planned_dividends_4Q)
```
Based on Federal Reserve's annual stress test results.

**Effective CET1 requirement for a GSIB:**
```
Minimum = 4.5%
+ CCB (or SCB) = 2.5%+
+ G-SIB surcharge = 1.0-3.5%
+ CCyB = 0-2.5%
= 8.0% - 13.0% effective CET1 requirement
```

### 4F. Binding Constraint Analysis

At any point in time, the **binding constraint** is whichever capital ratio is closest to its minimum requirement:

| Constraint | Metric | Minimum |
|-----------|--------|---------|
| CET1 risk-based | CET1 / RWA | 4.5% + buffers |
| Tier 1 risk-based | T1 / RWA | 6.0% + buffers |
| Total risk-based | TC / RWA | 8.0% + buffers |
| Tier 1 leverage | T1 / Avg assets | 4.0% |
| SLR | T1 / TLE | 3.0% (5.0% GSIB) |
| TLAC risk-based | TLAC / RWA | 18.0% |
| TLAC leverage | TLAC / TLE | 6.75% |

**Formula**: For each constraint, compute headroom:
```
Headroom_i = Actual_ratio_i - Required_minimum_i
Binding constraint = argmin(Headroom_i)
```

**Source tables**: All capital ratios (from above), `l3.capital_binding_constraint`
**Rollup**: Entity-level (each legal entity has its own binding constraint)

### 4G. Capital Allocation & Consumption

**Top-down allocation**: Binding constraint drives the "price" of capital:
```
Capital_consumed_per_facility = RWA_facility × (1 / Binding_ratio) × Required_ratio
```

**RAROC (Risk-Adjusted Return on Capital)**:
```
RAROC = (Revenue - Expected Loss - Operating Cost) / Economic Capital
```

**Source tables**: `l3.facility_capital_consumption`, `l3.portfolio_capital_consumption`
**Rollup**: direct-sum (capital consumption is additive: facility → counterparty → desk → segment)

### 4H. Rollup Architecture Reference

Capital metrics follow an entity-centric hierarchy:
```
Facility/Position → Business Line → Legal Entity → Consolidated
```

**Rollup strategy selection rules:**
| Metric type | Strategy | Formula pattern |
|------------|----------|-----------------|
| Capital amounts (CET1, T1) | `direct-sum` per entity | Entity-level components, consolidated with minority interest |
| RWA amounts | `direct-sum` | Additive across risk types and business lines |
| Capital ratios | `sum-ratio` per entity | SUM(capital) / SUM(RWA) — NOT average of sub-ratios |
| Leverage exposure | `direct-sum` | Additive |
| SLR | `sum-ratio` per entity | SUM(T1) / SUM(TLE) |
| Buffer amounts (bps) | `none` | Entity-specific, not aggregable |
| Capital consumption | `direct-sum` | Additive from facility up |
| RAROC | `sum-ratio` | SUM(risk-adjusted return) / SUM(economic capital) |
| Binding constraint | `none` | Entity-specific determination |

**Consolidation**: GSIB capital is computed at multiple levels:
- Solo entity (each bank subsidiary)
- Intermediate holding company
- Top-tier holding company (consolidated)
- Minority interest partial inclusion rules apply at consolidation

### 4I. Regulatory Framework Reference

| Framework | Scope | Key Sections |
|-----------|-------|-------------|
| Basel III CAP 10 | Capital definition | CET1, AT1, Tier 2 components |
| Basel III CAP 30 | Minimum requirements | 4.5% CET1, 6% T1, 8% Total |
| Basel III RBC 25 | Capital buffers | CCB, G-SIB, CCyB |
| Basel III LEV 10 | Leverage ratio | SLR framework |
| Fed TLAC Rule | Resolution capital | 12 CFR 252 Subpart G |
| FR Y-9C | Consolidated financial | HC-R Part I (capital), Part II (RWA) |
| Fed SCB Rule | Stress capital buffer | Annual CCAR-based buffer |
| 12 CFR 217 | US capital rules | Reg Q — risk-based and leverage |
| SR 15-18 | Capital planning guidance | CCAR expectations |
| BCBS 239 | Risk data aggregation | Capital data quality |
| CCAR/DFAST | Stress testing | 9-quarter capital projections |

---

## 5. Decomposition Output Format

Identical structure to decomp-credit-risk Sections 5A-5I. Key differences:

### 5A. Metric Definition Block
- `"expert": "decomp-capital"`
- `"domain": "capital"`
- `"sub_domain"`: one of `risk_based_ratio`, `leverage`, `tlac`, `buffers`, `capital_allocation`, `capital_planning`, `binding_constraint`

### 5D. Rollup Architecture Block
Entity-centric levels:
```json
{
  "rollup_architecture": {
    "levels": {
      "facility": { "grain_key": "facility_id", "notes": "RWA and capital consumption at facility level" },
      "business_line": { "grain_key": "ebt.managed_segment_id" },
      "entity": { "grain_key": "legal_entity_id", "notes": "Primary reporting level — solo capital ratios" },
      "consolidated": { "grain_key": "consolidated_entity_id", "minority_interest_rules": true }
    }
  }
}
```

### 5B. Ingredients Block

```json
{
  "ingredients": [
    {
      "ingredient_id": "<table.field>",
      "layer": "<L1|L2|L3>",
      "schema": "<l1|l2|l3>",
      "table": "<exact table name from DD>",
      "field": "<exact field name from DD>",
      "data_type": "<from DD>",
      "role": "<MEASURE|DIMENSION|FILTER|JOIN_KEY>",
      "description": "<business meaning>",
      "transformation": "<none|COALESCE|SUM|MAX|CASE WHEN|etc.>",
      "data_quality_tier": "<GOLD|SILVER|BRONZE>",
      "nullable": true,
      "default_if_null": "<value or null>",
      "validated_in_dd": true,
      "dd_table_match": "<exact table name found in DD>",
      "dd_field_match": "<exact field name found in DD>"
    }
  ]
}
```

**Data quality tiers:**
- **GOLD**: Always populated, well-governed, regulatory-grade
- **SILVER**: Usually populated, occasional NULLs acceptable with COALESCE
- **BRONZE**: Frequently sparse, metric should degrade gracefully

### 5C. Schema Gaps Block

```json
{
  "schema_gaps": [
    {
      "gap_id": "<GAP-NNN>",
      "gap_type": "<MISSING_TABLE|MISSING_FIELD|WRONG_TYPE|MISSING_FK>",
      "target_schema": "<l1|l2|l3>",
      "target_table": "<table that needs the change>",
      "proposed_change": {
        "action": "<ADD_TABLE|ADD_COLUMN|ALTER_COLUMN|ADD_FK>",
        "column_name": "<if ADD_COLUMN>",
        "column_type": "<proposed SQL type>",
        "nullable": true,
        "fk_references": "<schema.table.column if ADD_FK>",
        "rationale": "<why this change is needed>"
      },
      "severity": "<BLOCKING|RECOMMENDED|NICE_TO_HAVE>",
      "workaround": "<alternative if gap is not immediately filled, or null>"
    }
  ]
}
```

### 5E. Variants Block

```json
{
  "variants": [
    {
      "variant_name": "<e.g. Stressed-CET1, SA-RWA-only>",
      "description": "<how it differs from the base metric>",
      "formula_delta": "<what changes in the formula>",
      "additional_ingredients": ["<extra fields needed>"],
      "regulatory_driver": "<regulation requiring this variant, or null>"
    }
  ]
}
```

### 5F. Consumers Block

```json
{
  "consumers": [
    {
      "consumer_type": "<DASHBOARD|REPORT|MODEL|API|DOWNSTREAM_METRIC>",
      "name": "<e.g. Capital Planning Dashboard, FR Y-9C HC-R>",
      "team": "<Capital Planning, Finance, Regulatory Reporting>",
      "use_case": "<how they use this metric>",
      "frequency": "<REAL_TIME|DAILY|WEEKLY|MONTHLY|QUARTERLY>",
      "sla": "<response time requirement, or null>"
    }
  ]
}
```

### 5G. Regulatory Mapping Block

```json
{
  "regulatory_mapping": [
    {
      "framework": "<Basel III CAP|LEV|TLAC|etc.>",
      "section": "<specific section/schedule>",
      "requirement": "<what the regulation requires>",
      "compliance_status": "<COMPLIANT|GAP|PARTIAL>",
      "gap_detail": "<if not fully compliant, what's missing>"
    }
  ]
}
```

### 5H. GSIB Considerations Block

```json
{
  "gsib_considerations": {
    "systemic_importance": "<how this metric relates to GSIB systemic risk indicators>",
    "cross_jurisdictional_notes": "<jurisdiction-specific calculation differences>",
    "data_aggregation_bcbs239": {
      "accuracy": "<BCBS 239 accuracy compliance note>",
      "completeness": "<BCBS 239 completeness note>",
      "timeliness": "<BCBS 239 timeliness note>",
      "adaptability": "<BCBS 239 adaptability note>"
    },
    "stress_testing_relevance": "<how this metric is used in CCAR/DFAST>",
    "recovery_resolution_relevance": "<living will / resolution planning use>"
  }
}
```

### 5I. Confidence Assessment

```json
{
  "confidence": {
    "overall": "<HIGH|MEDIUM|LOW>",
    "reasoning": "<2-3 sentences explaining confidence level>",
    "high_confidence_areas": ["<list>"],
    "uncertainty_areas": ["<list>"],
    "requires_human_review": ["<specific items needing SME input>"]
  }
}
```

**Confidence thresholds (from bank-profile.yaml):**
- **HIGH** (>90%): Formula is well-established, all source fields exist in DD
- **MEDIUM** (70-90%): Formula is standard but some fields missing or need schema changes
- **LOW** (<70%): Novel metric, significant schema gaps — MUST flag for human review

---

## 6. Confirmation Gate

Same as decomp-credit-risk. Summary includes:
```
**Capital framework:** [risk-based/leverage/TLAC/buffers]
**Approach:** [SA/IRB/dual]
**Binding constraint relevance:** [Y/N]
```

---

## 7. Audit Logging

```
agent_name = "decomp-capital"
```
Reasoning chain includes capital-specific steps:
1. "Capital framework: [framework], approach: [SA/IRB/dual]"
2. "Buffer stack: [CCB + G-SIB + CCyB + SCB = X%]"
3. "Binding constraint identification: [which ratio binds]"

All other audit patterns identical to decomp-credit-risk.

---

## 8. Duplicate Detection Algorithm

Same as decomp-credit-risk (Steps 1-4). **Additional**: Check existing capital metrics in `sql/migrations/002-capital-metrics.sql` and `l3.facility_rwa_calc`, `l3.capital_binding_constraint`, `l3.facility_capital_consumption` tables.

---

## 9. Error Handling

Standard errors plus:
```
NOTE: Capital metrics database (postgres_capital) exists with pre-built capital tables.
Check sql/migrations/002-capital-metrics.sql for existing schema before proposing gaps.
Existing tables: facility_rwa_calc, capital_binding_constraint, facility/counterparty/desk/
portfolio/segment_capital_consumption, capital_position_snapshot, regulatory_capital_requirement.
```

---

## 10. Example: Decomposing "CET1 Capital Ratio"

**Expert reasoning chain:**
1. Metric: CET1 Capital Ratio — the primary Basel III capital adequacy measure
2. Framework: risk-based capital. Approach: dual (SA + IRB)
3. Duplicate check: Check existing capital metrics. Proceed.
4. Classification: CALCULATED, HIGHER_BETTER, PERCENTAGE
5. Formula: CET1 Ratio = CET1 Capital / Total RWA
   - CET1 = Common stock + Retained earnings + AOCI - Deductions
   - RWA = Credit RWA + Market RWA + Op Risk RWA + CVA RWA
6. Ingredients: capital_position_snapshot (CET1 components), facility_rwa_calc (credit RWA), regulatory_capital_requirement (minimums)
7. Schema gaps: Minimal — capital tables already exist in postgres_capital migration
8. Confidence: HIGH — well-defined regulatory formula, existing schema support

---

## 11. Integration Points

### Upstream
- **User** via `/decomp-capital <metric name>` (Mode A)
- **Master Orchestrator** (S8) via structured payload (Mode B)

### Downstream
- **Data Model Expert** (S2) — schema gaps (likely minimal given existing capital tables)
- **YAML Config Writer** (S5) — metric config
- **Risk Expert Reviewer** (S4) — Basel III CAP/LEV regulatory accuracy
- **Data Factory Agent** (S3) — capital position seed data
- **decomp-credit-risk** — Credit RWA feeds into Total RWA denominator
- **decomp-market-risk** — Market RWA feeds into Total RWA
- **decomp-oprisk** — Op Risk RWA feeds into Total RWA
- **decomp-liquidity** — HQLA overlaps with capital-eligible securities

### Output handoff format
Same as decomp-credit-risk.
