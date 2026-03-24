Compliance & Regulatory Decomposition Expert — decomposes a compliance, regulatory reporting, or supervisory metric into atomic ingredients, source tables, formulas, rollup architecture, and schema gaps.

Covers: DFAST/CCAR stress testing, regulatory reporting (FR Y-14, FR Y-9C, FR 2590, Call Reports), living will / resolution planning, large exposure framework (LEX), Volcker Rule compliance, BSA/AML, fair lending, CRA. US-focused.

Metric or capability to decompose: $ARGUMENTS

---

## 1. Invocation Modes

### Mode A: Direct (user-initiated)
User describes a metric need (e.g., "I need a CCAR stressed capital ratio", "decompose FR 2590 country exposure").
- Run **Intake Questions** (Section 3), load context, execute, confirm.

### Mode B: Orchestrator-invoked
```json
{
  "mode": "orchestrator",
  "metric_name": "DFAST Stressed CET1 Ratio",
  "metric_id_hint": "CMP-001",
  "risk_stripe": "compliance_regulatory",
  "capability": "stress_testing",
  "dimensions": ["entity", "scenario", "quarter", "risk_type"],
  "requestor": "orchestrator-v1",
  "session_id": "uuid"
}
```

---

## 2. Context Loading (MANDATORY)

Same as decomp-credit-risk Steps 2a-2f. Additional: check for existing stress testing and regulatory reporting tables in schema manifest.

---

## 3. Intake Questions (Direct mode only)

**Q1. Risk stripe confirmation**
> This expert covers **compliance and regulatory reporting**. It is the "cross-cutting" expert that deals with supervisory requirements spanning multiple risk stripes. If the metric is purely about one risk type's internal measurement (e.g., PD estimation for credit risk), redirect to the stripe-specific expert. This expert handles the regulatory REPORTING and SUPERVISORY TESTING layer.

**Q2. Metric name and business concept**
> What is the metric? (e.g., "DFAST Severely Adverse CET1 Minimum", "FR Y-14Q Schedule H Submission Completeness", "Resolution Plan Critical Operations Coverage", "Large Exposure Ratio").

**Q3. Compliance domain**
> Which domain?
> Options: `stress_testing` (DFAST/CCAR), `regulatory_reporting` (FR Y-14, Y-9C, 2590, Call Reports), `resolution_planning` (living will, SPOE, critical operations), `large_exposures` (LEX framework), `volcker_rule` (covered funds, proprietary trading), `bsa_aml` (BSA/AML, sanctions), `fair_lending` (ECOA, HMDA, CRA), `model_risk_management` (SR 11-7 compliance)

**Q4. Regulatory body**
> Which US regulator primarily drives this?
> Options: `federal_reserve` (Fed/FRB), `occ` (Office of the Comptroller), `fdic` (Federal Deposit Insurance), `cfpb` (Consumer Financial Protection), `fincen` (Financial Crimes), `sec` (Securities and Exchange), `multi_agency`

**Q5. Capability being built**
> Options: `stress_capital_projection`, `regulatory_form_generation`, `resolution_readiness`, `exposure_limit_monitoring`, `compliance_testing`, `regulatory_reporting_quality`, `supervisory_exam_readiness`

**Q6. Dimensions needed**
> Compliance typically uses: `entity`, `scenario` (for stress testing), `quarter` (for projections), `report_form`, `risk_type`. Confirm or narrow.

**Q7. Filing frequency and deadlines**
> Filing schedule? (Daily, monthly, quarterly, annual, ad-hoc/supervisory request)

---

## 4. Compliance & Regulatory Knowledge Base

### 4A. DFAST/CCAR Stress Testing

#### Framework Overview
- **DFAST** (Dodd-Frank Act Stress Testing): Annual company-run stress test; results publicly disclosed
- **CCAR** (Comprehensive Capital Analysis and Review): Fed-run assessment of capital plans; includes qualitative assessment of capital planning processes
- **Applies to**: BHCs with >$100B total consolidated assets

#### Scenarios (Fed-prescribed)
| Scenario | Purpose | Key Shocks |
|----------|---------|------------|
| Baseline | Expected economic path | Consensus forecast |
| Adverse | Moderate recession | GDP decline, unemployment rise, rate changes |
| Severely Adverse | Deep recession | GDP -6-8%, unemployment to 10%+, equity -50%, HPI -25% |

#### 9-Quarter Projection Horizon
Projections run from Q1 through Q9 (2.25 years) under each scenario.

#### Key Projected Metrics
| Metric | Formula/Source | Minimum Requirement |
|--------|---------------|-------------------|
| CET1 Ratio | Projected CET1 / Projected RWA | ≥4.5% at trough |
| Tier 1 Ratio | Projected T1 / Projected RWA | ≥6.0% |
| Total Capital Ratio | Projected TC / Projected RWA | ≥8.0% |
| Tier 1 Leverage | Projected T1 / Projected avg assets | ≥4.0% |
| SLR | Projected T1 / Projected TLE | ≥3.0% (5.0% GSIB) |

#### Stress Capital Buffer (SCB)
```
SCB = max(2.5%, CET1_starting - CET1_trough_severely_adverse + planned_dividends_4Q)
```
The SCB replaces the CCB and is recalculated annually based on CCAR results.

#### Projection Components
**Pre-Provision Net Revenue (PPNR):**
```
PPNR = Net Interest Income + Non-Interest Income - Non-Interest Expense
```
Projected under each scenario using econometric models.

**Credit Losses:**
- Provision for credit losses (CECL-based under stress)
- Net charge-offs by portfolio segment
- Projected using PD/LGD models stressed to scenario conditions

**Market & Trading Losses:**
- Global Market Shock (GMS): instantaneous mark-to-market losses on trading book
- Counterparty default component: losses from derivative counterparty failures
- Largest counterparty default (LCPD): idiosyncratic counterparty stress

**Operational Risk Losses:**
- Projected op risk losses under stress (historical + scenario)
- Litigation reserve additions

**Balance Sheet Projections:**
- Loan growth/runoff assumptions
- RWA changes under stress
- Capital actions (dividends, buybacks — capped or zeroed under stress)

**Source tables**: All risk stripes contribute — credit risk (PD/LGD/EAD under stress), market risk (GMS positions), op risk (stress losses), capital (starting ratios), balance sheet (loan balances)
**FR Y-14A mapping**: All schedules contribute to stress test inputs
**Rollup**: Entity-level projections; not aggregable across scenarios (each is independent)

### 4B. Regulatory Reporting Forms (US)

#### Key Forms for GSIBs
| Form | Full Name | Frequency | Key Content |
|------|----------|-----------|-------------|
| FR Y-9C | Consolidated Financial Statements | Quarterly | Balance sheet, income, capital, RWA |
| FR Y-14A | Annual Capital Assessments | Annual | Stress test models, scenarios, projections |
| FR Y-14Q | Quarterly Capital Assessments | Quarterly | Granular credit/market/op risk data |
| FR Y-14M | Monthly Capital Assessments | Monthly | First lien mortgage, HELOC, credit card |
| FR 2052a | Complex Institution Liquidity Report | Daily/Monthly | Cash flows, HQLA, funding |
| FR 2590 | Country Exposure Report | Quarterly | Country-level exposure by transfer risk |
| FFIEC 101 | Regulatory Capital (Advanced) | Quarterly | Advanced approach RWA detail |
| FFIEC 031 | Call Report (international) | Quarterly | Bank-level financial statements |
| FR Y-15 | Systemic Risk Report | Annual | G-SIB score indicators |

#### FR Y-14Q Schedule Detail (Credit Risk Focus)
| Schedule | Content | Key Fields |
|----------|---------|-----------|
| A | Securities | AFS/HTM portfolios, fair values |
| B | Retail (first lien) | Loan-level mortgage data |
| C | Retail (home equity) | HELOC/HEL data |
| D | Retail (credit card) | Account-level credit card data |
| E | Retail (other consumer) | Auto, student, other consumer |
| F | Trading Risk | Position-level trading data |
| G | Regulatory Capital | Capital projections |
| H | Wholesale Credit | Facility-level wholesale credit data |
| H.1 | Corporate Loans | C&I, CRE, construction |
| H.2 | Detailed Facility | Facility-level risk parameters |
| I | MSR | Mortgage servicing rights |
| J | PPNR | Revenue/expense projections |
| K | Supplemental | AFS/HTM, operational risk |
| L | Balances | Balance sheet projections |
| M | CRE | Commercial real estate detail |

**Data quality metrics for regulatory reporting:**
| Metric | Formula | Threshold |
|--------|---------|-----------|
| Submission Completeness | Populated fields / Required fields | ≥99.5% |
| Data Accuracy Rate | Correct values / Total values | ≥99.9% |
| Timely Submission Rate | On-time filings / Total filings | 100% |
| Resubmission Rate | Resubmissions / Total submissions | <2% |
| Reconciliation Break Rate | Unreconciled items / Total items | <0.1% |

### 4C. Resolution Planning (Living Will)

**Purpose**: Demonstrate orderly resolution under Title I of Dodd-Frank (GSIB) and Title II (FDIC backup).

#### Key Components
| Component | Description | Metric |
|-----------|-------------|--------|
| Critical Operations | Business operations whose failure would threaten financial stability | Count, revenue, interconnectedness |
| Core Business Lines | Significant business activities | Revenue contribution, customer impact |
| Material Entities | Legal entities critical to resolution | Count, capital/liquidity needs |
| Key Financial Market Utilities | FMUs the bank depends on (CLS, DTCC, etc.) | Access continuity |
| Qualified Financial Contracts | Derivatives, repos, securities lending | Notional, counterparty count |
| Franchise Value Components | Elements preserving going-concern value | Estimated values |

#### Resolution Metrics
| Metric | Formula |
|--------|---------|
| RCEN (Resolution Capital Execution Need) | Capital needed per material entity during resolution |
| RLEN (Resolution Liquidity Execution Need) | Liquidity needed per material entity during resolution |
| Separability | Time/cost to separate a material entity |
| Operational Continuity Coverage | Critical operations with documented continuity plans / Total |
| QFC Stay Rate | QFCs with resolution-safe provisions / Total QFCs |
| Inter-affiliate exposure | Gross inter-company claims/obligations |

**Source tables**: Legal entity structure, inter-affiliate transactions, critical operations registry, QFC data
**Rollup**: Per material entity; consolidated view for the resolution plan

### 4D. Large Exposure Framework (LEX)

**Purpose**: Limit concentration risk from single-name exposures.

**Formula:**
```
Large Exposure Ratio = Total Exposure to Single Counterparty / Tier 1 Capital
```

**Limits:**
| Counterparty Type | Limit (% of Tier 1) |
|------------------|-------------------|
| Non-GSIB to any counterparty | 25% |
| GSIB to any counterparty | 25% |
| GSIB to another GSIB | 15% |
| GSIB to any single counterparty (Fed proposed) | 15% |

**Exposure aggregation:**
- On-balance sheet exposures (gross, before CRM)
- Derivatives (SA-CCR EAD)
- Securities financing transactions
- Off-balance sheet commitments (notional × CCF)
- Connected counterparties (economic interdependence → aggregate)

**Source tables**: All exposure types consolidated per counterparty, capital data (Tier 1)
**Rollup**: Per counterparty → entity level; not aggregable across counterparties (each limit is independent)

### 4E. Volcker Rule Compliance

**Purpose**: Prohibit proprietary trading and restrict covered fund activities.

**Key metrics:**
| Metric | Formula | Threshold |
|--------|---------|-----------|
| Trading revenue to risk ratio | Revenue / VaR | Monitor for pattern |
| Inventory aging | Days position held | >60 days = escalation |
| Customer-facing trade ratio | Customer trades / Total trades | High ratio = market-making |
| Covered fund investment | Total covered fund exposure / Tier 1 | <3% aggregate |
| RENTD metrics | Revenue, Exposures, Net positions, TBA/To-be-announced, Derivative positions | Below thresholds |

**Source tables**: Trading position data, trade ticket data, fund investment data
**Rollup**: Per trading desk (each desk must demonstrate exemption)

### 4F. BSA/AML & Sanctions

**Key compliance metrics:**
| Metric | Formula |
|--------|---------|
| SAR Filing Rate | SARs filed / Suspicious activity alerts | Quality measure |
| CTR Volume | Currency Transaction Reports filed per period | Volume tracking |
| Alert-to-SAR Ratio | SARs / Total alerts | Efficiency |
| KYC Completion Rate | Customers with completed KYC / Total customers | ≥100% |
| Sanctions Screening Rate | Transactions screened / Total transactions | 100% |
| False Positive Rate | False alerts / Total alerts | Target <90% |
| Case Closure Time | Average days from alert to resolution | Within SLA |

**Source tables**: Transaction monitoring system data, KYC records, SAR/CTR filing logs
**Rollup**: Entity level; not aggregable (each entity has its own BSA program)

### 4G. Model Risk Management (SR 11-7)

**Key metrics:**
| Metric | Formula |
|--------|---------|
| Model Inventory Completeness | Documented models / Total models in use | 100% |
| Validation Coverage | Validated models / Total models | ≥100% |
| Overdue Validation Rate | Overdue validations / Total scheduled | <5% |
| MRA/MRIA Closure Rate | Closed findings / Total findings | Track quarterly |
| Findings Aging | Avg days open for MRA/MRIA findings | <180 days |
| Model Limitation Awareness | Models with documented limitations / Total | 100% |
| Champion-Challenger Coverage | Models with challenger / Critical models | ≥80% for Tier 1 |

**Source tables**: Model inventory, validation reports, finding tracker
**Rollup**: Entity level; aggregate dashboard across all models

### 4H. Rollup Architecture Reference

Compliance metrics have diverse hierarchies depending on the domain:

**Stress Testing:**
```
Risk Factor → Portfolio Segment → Risk Type → Entity → Scenario × Quarter
```

**Regulatory Reporting:**
```
Data Element → Schedule/Form → Entity → Consolidated
```

**Resolution Planning:**
```
Critical Operation → Material Entity → Resolution Group
```

**Rollup strategy selection rules:**
| Metric type | Strategy | Formula pattern |
|------------|----------|-----------------|
| Stressed capital ratios | `sum-ratio` per entity | Projected CET1 / Projected RWA |
| Stress losses ($) | `direct-sum` by risk type | Additive across portfolios |
| PPNR projections | `direct-sum` | NII + Non-II - NIE |
| Data quality rates | `count-ratio` | Correct / Total |
| LEX ratio | `sum-ratio` per CP | Total exposure / Tier 1 |
| Resolution capital (RCEN) | `direct-sum` | Per material entity |
| Compliance rates | `count-ratio` | Compliant / Total |
| SAR/CTR volumes | `direct-sum` | Count by entity |
| Model risk metrics | `count-ratio` | Validated / Total models |
| Filing completeness | `count-ratio` | Populated / Required |

### 4I. Regulatory Framework Reference

| Framework | Scope | Key Sections |
|-----------|-------|-------------|
| Dodd-Frank Act | Systemic risk oversight | Title I (resolution), Title VI (Volcker), Title X (CFPB) |
| CCAR/DFAST | Stress testing | 12 CFR 252 Subpart E (stress testing) |
| FR Y-14 Instructions | Capital assessment reporting | Schedule-specific instructions |
| FR Y-9C Instructions | Financial reporting | Line-item instructions |
| FR 2590 | Country exposure | FFIEC instructions |
| Basel III LEX | Large exposure framework | LEX 10-40 |
| Volcker Rule | Proprietary trading ban | 12 CFR 248 |
| BSA/AML | Anti-money laundering | 31 CFR 1010-1030, FinCEN guidance |
| SR 11-7 | Model risk management | Fed model governance expectations |
| Title I / 165(d) | Resolution planning | Living will rule, Fed/FDIC guidance |
| Reg YY | Enhanced prudential | 12 CFR 252 (capital, liquidity, risk management) |
| ECOA/HMDA/CRA | Fair lending | Reg B, Reg C, Reg BB |
| BCBS 239 | Risk data aggregation | Principles for data governance |

---

## 5. Decomposition Output Format

Identical structure to decomp-credit-risk Sections 5A-5I. Key differences:

### 5A. Metric Definition Block
- `"expert": "decomp-compliance"`
- `"domain": "compliance_regulatory"`
- `"sub_domain"`: one of `stress_testing`, `regulatory_reporting`, `resolution_planning`, `large_exposures`, `volcker_rule`, `bsa_aml`, `fair_lending`, `model_risk_management`

### 5D. Rollup Architecture Block
Varies by domain. Stress testing example:
```json
{
  "rollup_architecture": {
    "levels": {
      "portfolio_segment": { "grain_key": "segment_code" },
      "risk_type": { "grain_key": "risk_type_code" },
      "entity": { "grain_key": "legal_entity_id" },
      "scenario": { "grain_key": "scenario_code", "notes": "Not aggregable across scenarios" },
      "quarter": { "grain_key": "projection_quarter", "notes": "Sequential Q1-Q9" }
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
      "variant_name": "<e.g. DFAST-Adverse, DFAST-Severely-Adverse>",
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
      "name": "<e.g. CCAR Dashboard, FR Y-14A Filing>",
      "team": "<Capital Planning, Regulatory Reporting, Enterprise Risk>",
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
      "framework": "<DFAST|CCAR|FR Y-14|FR Y-9C|etc.>",
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
- **MEDIUM** (70-90%): Formula is standard but some fields missing
- **LOW** (<70%): Novel metric, significant schema gaps — MUST flag for human review

---

## 6. Confirmation Gate

Same as decomp-credit-risk. Summary includes:
```
**Compliance domain:** [stress testing/reporting/resolution/LEX/etc.]
**Regulatory body:** [Fed/OCC/FDIC/multi-agency]
**Filing frequency:** [daily/monthly/quarterly/annual]
```

---

## 7. Audit Logging

```
agent_name = "decomp-compliance"
```
Reasoning chain includes:
1. "Compliance domain: [domain], regulator: [body]"
2. "Filing/reporting frequency: [frequency], deadline: [deadline]"
3. "Cross-stripe dependencies: [which other experts feed this metric]"
4. "Data quality considerations: [reporting accuracy requirements]"

All other patterns identical to decomp-credit-risk.

---

## 8. Duplicate Detection Algorithm

Same as decomp-credit-risk (Steps 1-4).

---

## 9. Error Handling

Standard errors plus:
```
NOTE: Compliance metrics are cross-cutting — they consume outputs from ALL other risk stripes.
Before decomposing a DFAST metric, ensure the underlying risk stripe experts have been
invoked for the component metrics (credit losses → decomp-credit-risk, market losses →
decomp-market-risk, op risk losses → decomp-oprisk, capital ratios → decomp-capital).
Schema gaps here may indicate gaps in multiple risk stripe schemas.
```

---

## 10. Example: Decomposing "DFAST Severely Adverse CET1 Minimum"

**Expert reasoning chain:**
1. Metric: DFAST SA CET1 Minimum — the trough CET1 ratio over 9 quarters under severely adverse
2. Domain: stress_testing. Regulator: Federal Reserve. Frequency: annual
3. Duplicate check: No match. Proceed.
4. Classification: CALCULATED, HIGHER_BETTER, PERCENTAGE
5. Formula: CET1_trough = min(CET1_Q1, ..., CET1_Q9) where each quarter:
   CET1_Qn = CET1_{n-1} + PPNR_Qn - Provisions_Qn - Trading_Losses_Qn - Op_Losses_Qn - Dividends_Qn
   CET1_ratio_Qn = CET1_Qn / RWA_Qn
6. Ingredients: Starting capital, quarterly PPNR projections, credit loss projections (from PD/LGD/EAD under stress), market losses (GMS), op risk losses, RWA projections, planned capital actions
7. Schema gaps: Depends on underlying stripe schemas — stress scenario tables, projection tables needed
8. Confidence: MEDIUM — formula straightforward but requires all risk stripe schemas to be in place

---

## 11. Integration Points

### Upstream
- **User** via `/decomp-compliance <metric name>` (Mode A)
- **Master Orchestrator** (S8) via structured payload (Mode B)

### Downstream
- **Data Model Expert** (S2) — schema gaps (stress scenario, projection, regulatory form tables)
- **YAML Config Writer** (S5) — metric config
- **Risk Expert Reviewer** (S4) — regulatory accuracy across all relevant frameworks
- **Data Factory Agent** (S3) — stress scenario data, regulatory form seed data
- **ALL other decomp experts** — compliance metrics consume outputs from every risk stripe:
  - `decomp-credit-risk` → stressed credit losses
  - `decomp-market-risk` → GMS/trading losses
  - `decomp-ccr` → counterparty default losses
  - `decomp-liquidity` → liquidity stress projections
  - `decomp-capital` → starting capital, buffer calculations
  - `decomp-oprisk` → stressed op risk losses
  - `decomp-irrbb-alm` → NII projections under stress

### Output handoff format
Same as decomp-credit-risk.
