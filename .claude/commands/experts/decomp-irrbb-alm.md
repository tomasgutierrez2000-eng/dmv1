IRRBB & ALM Decomposition Expert — decomposes an interest rate risk in the banking book or asset-liability management metric into atomic ingredients, source tables, formulas, rollup architecture, and schema gaps.

Covers: NII sensitivity, EVE sensitivity, repricing gap analysis, basis risk, optionality risk, Funds Transfer Pricing (FTP), duration gap, behavioral modeling (NMDs, prepayments), Basel III IRRBB standardized framework.

Metric or capability to decompose: $ARGUMENTS

---

## 1. Invocation Modes

### Mode A: Direct (user-initiated)
User describes a metric need (e.g., "I need NII sensitivity to +200bp", "decompose EVE change").
- Run **Intake Questions** (Section 3), load context (Section 2), execute (Section 5), confirm (Section 6).

### Mode B: Orchestrator-invoked
```json
{
  "mode": "orchestrator",
  "metric_name": "NII Sensitivity to +200bp Parallel Shift",
  "metric_id_hint": "IRR-001",
  "risk_stripe": "irrbb_alm",
  "capability": "earnings_sensitivity",
  "dimensions": ["entity", "currency", "repricing_bucket", "business_segment"],
  "requestor": "orchestrator-v1",
  "session_id": "uuid"
}
```

---

## 2. Context Loading (MANDATORY)

Same as decomp-credit-risk Steps 2a-2f. Additional: check for ALM-specific tables in schema manifest (repricing data, NMD behavioral models).

---

## 3. Intake Questions (Direct mode only)

**Q1. Risk stripe confirmation**
> This expert covers **IRRBB and ALM** (banking book interest rate risk). If the metric is about trading book interest rate risk (GIRR under FRTB), redirect to `decomp-market-risk`. If it's about liquidity/funding, redirect to `decomp-liquidity`.

**Q2. Metric name and business concept**
> What is the metric? (e.g., "NII Sensitivity", "EVE Change", "Repricing Gap", "Duration of Equity", "FTP Spread", "Basis Risk Exposure").

**Q3. IRRBB framework**
> Which framework?
> Options: `nii_sensitivity` (earnings at risk), `eve_sensitivity` (economic value of equity), `repricing_gap` (gap analysis), `ftp` (funds transfer pricing), `behavioral_modeling` (NMDs, prepayments), `standardized_framework` (Basel III IRRBB outlier test)

**Q4. Rate scenario**
> Which interest rate scenarios?
> Options: `parallel_shift` (+/-200bp), `steepener` (short -100, long +100), `flattener` (short +100, long -100), `short_rate_up`, `short_rate_down`, `all_six_prescribed` (Basel III IRRBB), `custom`

**Q5. Capability being built**
> Options: `earnings_sensitivity`, `economic_value_sensitivity`, `gap_analysis`, `transfer_pricing`, `behavioral_analysis`, `limit_monitoring`, `stress_testing`, `regulatory_reporting`

**Q6. Dimensions needed**
> IRRBB typically uses: `entity`, `currency`, `repricing_bucket`, `business_segment`, `product_type`. Confirm or narrow.

**Q7. Regulatory drivers**
> Specific requirements? (Basel III IRRBB standards, BCBS 368, SR 10-1, OCC 2010-1, Fed Reg YY, etc.)

---

## 4. IRRBB & ALM Knowledge Base

### 4A. NII Sensitivity (Earnings-at-Risk)

**Purpose**: Measure the impact of interest rate changes on net interest income over a defined horizon (typically 12 months).

**Formula**:
```
ΔNII = Σ_i (RSA_i - RSL_i) × Δr_i × (remaining_repricing_time_i / 12)
```
Where:
- RSA_i = Rate-Sensitive Assets repricing in bucket i
- RSL_i = Rate-Sensitive Liabilities repricing in bucket i
- Δr_i = Rate change applicable to bucket i
- remaining_repricing_time_i = time until next repricing within the NII horizon

**More precisely (cash-flow based):**
```
NII_base = Σ(asset_cf × rate_base) - Σ(liability_cf × rate_base)
NII_shocked = Σ(asset_cf × rate_shocked) - Σ(liability_cf × rate_shocked)
ΔNII = NII_shocked - NII_base
```

**Key assumptions:**
- Constant balance sheet (static) vs dynamic (includes new business)
- Non-maturity deposit (NMD) behavioral repricing — not contractual
- Prepayment modeling for fixed-rate loans and mortgages
- Caps/floors on floating-rate products (optionality)

**Source tables**: Loan portfolio (rates, repricing dates, balances), deposit portfolio (rates, behavioral assumptions), investment securities (rates, maturities)
**Rollup**: `direct-sum` per entity/currency (ΔNII is additive across products)
**Regulatory**: Basel III IRRBB prescribes 6 scenarios; banks must report ΔNII under each

### 4B. EVE Sensitivity (Economic Value of Equity)

**Purpose**: Measure the change in the present value of all banking book cash flows when rates shift.

**Formula**:
```
EVE = PV(Assets) - PV(Liabilities) - PV(Off-Balance Sheet)
ΔEVE = EVE_shocked - EVE_base
```

Where PV uses discounted cash flow:
```
PV = Σ_t CF_t / (1 + r_t)^t
```

**Basel III IRRBB Outlier Test:**
```
ΔEVE / Tier 1 Capital > 15% → Outlier bank (supervisory response)
```

**Six prescribed scenarios (BCBS 368):**
| Scenario | Short end | Long end |
|----------|-----------|----------|
| Parallel up | +200bp | +200bp |
| Parallel down | -200bp | -200bp |
| Steepener | -100bp | +100bp |
| Flattener | +100bp | -100bp |
| Short rate up | +300bp | +0bp (tapers) |
| Short rate down | -300bp | +0bp (tapers) |

**Key assumptions (same as NII plus):**
- Full term structure discount factors
- Behavioral cash flows for NMDs, prepayments, automatic options
- Commercial margins excluded (pure economic value)

**Source tables**: All banking book positions with contractual cash flows, yield curves, behavioral model parameters
**Rollup**: `direct-sum` per entity/currency (PV changes are additive)

### 4C. Repricing Gap Analysis

**Purpose**: Identify maturity/repricing mismatches between assets and liabilities.

**Formula**:
```
Gap_i = RSA_i - RSL_i (for each time bucket i)
Cumulative_Gap_i = Σ_{j≤i} Gap_j
```

**Standard time buckets:**
| Bucket | Range |
|--------|-------|
| Overnight | 0-1 day |
| 1 week | 2-7 days |
| 1 month | 8-30 days |
| 3 months | 31-90 days |
| 6 months | 91-180 days |
| 1 year | 181-365 days |
| 2 years | 1-2 years |
| 3 years | 2-3 years |
| 5 years | 3-5 years |
| 10 years | 5-10 years |
| 15 years | 10-15 years |
| 20+ years | >15 years |
| Non-sensitive | Non-interest-bearing |

**Gap ratio**: Gap_i / Total Assets (measures relative exposure per bucket)

**Source tables**: Asset/liability positions with repricing dates, notional amounts, product types
**Rollup**: `direct-sum` per bucket per entity

### 4D. Interest Rate Risk Components

#### Repricing Risk (Gap Risk)
- Mismatch in repricing timing between assets and liabilities
- Measured by gap analysis and NII/EVE sensitivity
- Primary IRRBB risk for most banks

#### Yield Curve Risk
- Non-parallel changes in the yield curve (steepening, flattening, inversion)
- Measured by NII/EVE under non-parallel scenarios
- Key exposure: short-funded long assets (borrow short, lend long)

#### Basis Risk
- Different reference rates reset at different times/amounts (e.g., SOFR vs Prime)
- **Formula**: Basis_exposure = Σ(SOFR-linked assets) - Σ(Prime-linked liabilities) × basis_spread_vol
- Measured by NII sensitivity to basis spread changes

#### Optionality Risk
- Embedded options in banking book products:
  - **Prepayment risk**: Fixed-rate borrowers refinance when rates fall
  - **Deposit withdrawal**: NMD balances decline when rates rise (seek higher yields)
  - **Cap/floor risk**: Floating rate products with rate limits
  - **Loan commitment risk**: Borrowers draw on commitments when rates are favorable
- Requires behavioral modeling (not just contractual terms)

### 4E. Non-Maturity Deposits (NMD) Behavioral Modeling

NMDs (checking, savings, money market) have no contractual maturity but exhibit predictable behavioral repricing.

**Key parameters:**
| Parameter | Description | Typical Range |
|-----------|-------------|--------------|
| Pass-through rate | How much of market rate change reaches depositors | 20-80% (checking low, MMDA high) |
| Behavioral maturity | Effective repricing tenor of the deposit base | 1-5 years (checking long, MMDA short) |
| Core deposit ratio | Stable portion of NMD balance | 60-90% |
| Decay rate | Monthly runoff rate of non-core deposits | 1-5% per month |
| Rate sensitivity | Elasticity of balance to rate changes | -0.5 to -2.0 |

**Basel III IRRBB treatment**: Banks must model NMD behavioral repricing; maximum average behavioral maturity capped at 5 years, maximum for any individual NMD product capped at 10 years.

**Source tables**: Deposit balance history (monthly), market rate history, deposit rate history, customer segment data
**Model outputs**: Behavioral repricing schedule (replaces contractual "overnight" repricing)

### 4F. Funds Transfer Pricing (FTP)

**Purpose**: Internal pricing mechanism that charges/credits business units for the interest rate risk they create.

**Formula**:
```
FTP_rate = Risk-free curve rate (matched maturity) + Liquidity premium + Credit spread adjustment
```

**Components:**
| Component | Source | Description |
|-----------|--------|-------------|
| Base curve | Swap curve (SOFR) | Risk-free matched-maturity rate |
| Liquidity premium | Wholesale funding spread | Cost of term funding over risk-free |
| Credit spread | Internal transfer | Residual credit/basis adjustment |
| Optionality charge | Prepayment/NMD model | Cost of embedded options |

**FTP spread** = Actual product rate - FTP rate (positive = profit for business unit)

**Source tables**: Swap curve data, wholesale funding rates, product-level rates, FTP curve parameters
**Rollup**: `direct-sum` (FTP income/cost is additive across products and business lines)

### 4G. Duration Analysis

**Modified Duration**:
```
D_mod = -(1/P) × (dP/dr) = Σ(t × CF_t × DF_t) / Σ(CF_t × DF_t) / (1 + r)
```

**Duration of Equity (DoE)**:
```
DoE = (D_assets × Assets - D_liabilities × Liabilities) / Equity
```

**Duration Gap**:
```
D_gap = D_assets - (Liabilities / Assets) × D_liabilities
ΔEVE ≈ -D_gap × Assets × Δr
```

**Convexity** (second-order effect):
```
C = (1/P) × (d²P/dr²)
ΔP ≈ -D_mod × Δr + 0.5 × C × (Δr)²
```

**Source tables**: Position-level cash flows, yield curves for discounting
**Rollup**: Weighted average by market value (not additive)

### 4H. Rollup Architecture Reference

IRRBB/ALM metrics follow an entity and currency hierarchy:
```
Product/Position → Repricing Bucket → Currency → Entity → Consolidated
```

**Rollup strategy selection rules:**
| Metric type | Strategy | Formula pattern |
|------------|----------|-----------------|
| ΔNII ($ change) | `direct-sum` per entity/currency | Additive across products |
| ΔEVE ($ change) | `direct-sum` per entity/currency | Additive (PV changes are additive) |
| Gap amounts | `direct-sum` per bucket | RSA - RSL per time bucket |
| Duration | `weighted-avg` | Weighted by market value |
| Duration of Equity | `none` | Entity-level calculation |
| FTP income/cost | `direct-sum` | Additive across business lines |
| NII ratio (ΔNII/NII) | `sum-ratio` | SUM(ΔNII) / SUM(NII_base) |
| EVE ratio (ΔEVE/T1) | `sum-ratio` per entity | SUM(ΔEVE) / SUM(Tier1) |
| Basis exposure | `direct-sum` | Additive by reference rate |
| NMD behavioral maturity | `weighted-avg` | Weighted by deposit balance |

### 4I. Regulatory Framework Reference

| Framework | Scope | Key Sections |
|-----------|-------|-------------|
| BCBS 368 (Basel IRRBB) | IRRBB standardized framework | Prescribed scenarios, outlier test, disclosure |
| BCBS 319 | IRRBB principles | 12 principles for management and supervision |
| SR 10-1 | Fed IRRBB guidance | Interest rate risk management expectations |
| OCC 2010-1 | OCC IRRBB bulletin | Risk management and internal controls |
| Fed Reg YY | Enhanced prudential | Subpart F — risk management (includes IRRBB) |
| FR Y-14A | Annual reporting | Schedule B — NII projections under scenarios |
| FR Y-9C | Consolidated financial | HC (balance sheet), HC-R (capital for EVE context) |
| FASB ASC 815 | Hedge accounting | Fair value and cash flow hedges (ALM) |
| CCAR/DFAST | Stress testing | NII projections under stress scenarios |
| BCBS 239 | Risk data aggregation | IRRBB data quality |

---

## 5. Decomposition Output Format

Identical structure to decomp-credit-risk Sections 5A-5I. Key differences:

### 5A. Metric Definition Block
- `"expert": "decomp-irrbb-alm"`
- `"domain": "irrbb_alm"`
- `"sub_domain"`: one of `nii_sensitivity`, `eve_sensitivity`, `repricing_gap`, `basis_risk`, `optionality`, `ftp`, `duration`, `behavioral_modeling`

### 5D. Rollup Architecture Block
```json
{
  "rollup_architecture": {
    "levels": {
      "product": { "grain_key": "product_id" },
      "repricing_bucket": { "grain_key": "repricing_bucket_code" },
      "currency": { "grain_key": "currency_code" },
      "entity": { "grain_key": "legal_entity_id" },
      "business_segment": { "grain_key": "ebt_l1.managed_segment_id", "ebt_hops": 3 },
      "consolidated": { "grain_key": "consolidated_entity_id" }
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
      "layer": "<L1|L2>",
      "schema": "<l1|l2>",
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
      "variant_name": "<e.g. ΔNII-Steepener, ΔEVE-Parallel-Down>",
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
      "name": "<e.g. ALM Dashboard, ALCO Report>",
      "team": "<Treasury, ALM, Risk Management>",
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
      "framework": "<BCBS 368|SR 10-1|FR Y-14A|etc.>",
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
**IRRBB framework:** [NII/EVE/gap/FTP/behavioral]
**Rate scenarios:** [parallel/steepener/flattener/all 6]
**Behavioral modeling required:** [Y/N — NMDs, prepayments]
```

---

## 7. Audit Logging

```
agent_name = "decomp-irrbb-alm"
```
Reasoning chain includes:
1. "IRRBB framework: [framework], rate scenarios: [scenarios]"
2. "Behavioral modeling: [NMD pass-through, prepayment CPR, cap/floor]"
3. "Optionality risk: [embedded options identified]"

All other patterns identical to decomp-credit-risk.

---

## 8. Duplicate Detection Algorithm

Same as decomp-credit-risk (Steps 1-4).

---

## 9. Error Handling

Standard errors plus:
```
WARNING: IRRBB requires position-level cash flow data, yield curve tables,
repricing schedules, and behavioral model parameters that likely don't exist
in the current credit-focused schema. Schema gaps will be BLOCKING.
Recommend adding: l1.repricing_bucket_dim, l2.position_cash_flow,
l2.yield_curve_snapshot, l2.nmd_behavioral_param, l1.ftp_curve.
```

---

## 10. Example: Decomposing "NII Sensitivity to +200bp"

**Expert reasoning chain:**
1. Metric: ΔNII under +200bp parallel shift — primary IRRBB earnings measure
2. Framework: NII sensitivity. Scenarios: parallel up (+200bp)
3. Duplicate check: No match. Proceed.
4. Classification: CALCULATED, NEUTRAL (could be positive or negative), CURRENCY
5. Formula: ΔNII = Σ(Gap_i × 200bp × time_weight_i) with NMD behavioral adjustments
6. Ingredients: asset balances by repricing bucket, liability balances by repricing bucket, NMD behavioral parameters, rate floors/caps
7. Schema gaps: BLOCKING — need repricing position tables, yield curve data, NMD parameters
8. Confidence: MEDIUM — formula well-established but schema entirely missing for IRRBB

---

## 11. Integration Points

### Upstream
- **User** via `/decomp-irrbb-alm <metric name>` (Mode A)
- **Master Orchestrator** (S8) via structured payload (Mode B)

### Downstream
- **Data Model Expert** (S2) — schema gaps (extensive: repricing, yield curve, NMD tables)
- **YAML Config Writer** (S5) — metric config
- **Risk Expert Reviewer** (S4) — BCBS 368/SR 10-1 regulatory accuracy
- **Data Factory Agent** (S3) — repricing position and yield curve seed data
- **decomp-liquidity** — NMD modeling overlaps with deposit stability analysis
- **decomp-capital** — EVE sensitivity feeds into capital planning (ΔEVE/T1 outlier test)

### Output handoff format
Same as decomp-credit-risk.
