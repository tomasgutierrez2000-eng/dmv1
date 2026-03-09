#!/usr/bin/env python3
"""
Fix GSIB metric YAML files for correct rollup aggregation.

Issues fixed:
1. Ratio metrics: SUM(percentage) → SUM(numerator)/SUM(denominator) pattern
2. Weighted-avg metrics: SUM(rate) → SUM(rate*weight)/SUM(weight)
3. Text/ordinal/date metrics: SUM(text) → COUNT(DISTINCT facility_id)
4. Formula logic: COUNT(DISTINCT measure) → SUM, flag → percentage
5. Schema mismatches: wrong source tables/fields
"""

import os
import re
import yaml

BASE = os.path.join(os.path.dirname(__file__), "calc_engine", "metrics")

# ── HELPER: LoB hierarchy SQL fragments ──────────────────────

DESK_JOIN = """INNER JOIN l1.facility_master fm
  ON fm.facility_id = fac.facility_id
  AND fm.active_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id"""

PORTFOLIO_JOIN = """INNER JOIN l1.facility_master fm
  ON fm.facility_id = fac.facility_id
  AND fm.active_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id"""

BIZSEG_JOIN = """INNER JOIN l1.facility_master fm
  ON fm.facility_id = fac.facility_id
  AND fm.active_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id"""

# ── Desk/portfolio/bizseg with cp_id based join (for counterparty-sourced metrics)
DESK_JOIN_CP = """INNER JOIN l1.facility_master fm
  ON fm.counterparty_id = fac.counterparty_id
  AND fm.active_flag = 'Y'
INNER JOIN l2.facility_exposure_snapshot fes_w
  ON fes_w.facility_id = fm.facility_id
  AND fes_w.as_of_date = :as_of_date
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id"""

PORTFOLIO_JOIN_CP = """INNER JOIN l1.facility_master fm
  ON fm.counterparty_id = fac.counterparty_id
  AND fm.active_flag = 'Y'
INNER JOIN l2.facility_exposure_snapshot fes_w
  ON fes_w.facility_id = fm.facility_id
  AND fes_w.as_of_date = :as_of_date
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id"""

BIZSEG_JOIN_CP = """INNER JOIN l1.facility_master fm
  ON fm.counterparty_id = fac.counterparty_id
  AND fm.active_flag = 'Y'
INNER JOIN l2.facility_exposure_snapshot fes_w
  ON fes_w.facility_id = fm.facility_id
  AND fes_w.as_of_date = :as_of_date
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id"""


def make_sum_ratio_levels(subquery_sql, numerator_col, denominator_col, multiplier=100.0):
    """Generate rollup levels for ratio = SUM(num)/SUM(denom)*multiplier pattern."""
    mult_str = f" * {multiplier}" if multiplier != 1.0 else ""

    def make_agg_sql(dim_key, join_block):
        return f"""SELECT
  {dim_key} AS dimension_key,
  CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL
       ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val){mult_str}
  END AS metric_value
FROM (
{subquery_sql}
) fac
{join_block}
GROUP BY {dim_key}"""

    return {
        "counterparty": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"SUM({numerator_col}) / SUM({denominator_col}){mult_str} per counterparty.\n",
            "formula_sql": make_agg_sql("fm.counterparty_id",
                "INNER JOIN l1.facility_master fm\n  ON fm.facility_id = fac.facility_id\n  AND fm.active_flag = 'Y'"),
        },
        "desk": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"SUM({numerator_col}) / SUM({denominator_col}){mult_str} per L3 desk segment.\n",
            "formula_sql": make_agg_sql("ebt.managed_segment_id", DESK_JOIN),
        },
        "portfolio": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"SUM({numerator_col}) / SUM({denominator_col}){mult_str} per L2 portfolio segment.\n",
            "formula_sql": make_agg_sql("ebt_l2.managed_segment_id", PORTFOLIO_JOIN),
        },
        "business_segment": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"SUM({numerator_col}) / SUM({denominator_col}){mult_str} per L1 business segment.\n",
            "formula_sql": make_agg_sql("ebt_l1.managed_segment_id", BIZSEG_JOIN),
        },
    }


def make_weighted_avg_levels(subquery_sql, rate_col, weight_col):
    """Generate rollup levels for weighted-avg = SUM(rate*weight)/SUM(weight) pattern."""

    def make_agg_sql(dim_key, join_block):
        return f"""SELECT
  {dim_key} AS dimension_key,
  CASE WHEN SUM(fac.weight_val) = 0 THEN NULL
       ELSE SUM(fac.rate_val * fac.weight_val) / SUM(fac.weight_val)
  END AS metric_value
FROM (
{subquery_sql}
) fac
{join_block}
GROUP BY {dim_key}"""

    return {
        "counterparty": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {rate_col} per counterparty.\n",
            "formula_sql": make_agg_sql("fm.counterparty_id",
                "INNER JOIN l1.facility_master fm\n  ON fm.facility_id = fac.facility_id\n  AND fm.active_flag = 'Y'"),
        },
        "desk": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {rate_col} per L3 desk segment.\n",
            "formula_sql": make_agg_sql("ebt.managed_segment_id", DESK_JOIN),
        },
        "portfolio": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {rate_col} per L2 portfolio segment.\n",
            "formula_sql": make_agg_sql("ebt_l2.managed_segment_id", PORTFOLIO_JOIN),
        },
        "business_segment": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {rate_col} per L1 business segment.\n",
            "formula_sql": make_agg_sql("ebt_l1.managed_segment_id", BIZSEG_JOIN),
        },
    }


def make_cp_sourced_wavg_levels(cp_subquery_sql, metric_label):
    """Generate rollup levels for counterparty-sourced metrics weighted by facility exposure."""

    def make_agg_sql(dim_key, join_block):
        return f"""SELECT
  {dim_key} AS dimension_key,
  CASE WHEN SUM(fes_w.gross_exposure_usd) = 0 THEN NULL
       ELSE SUM(fac.metric_value * fes_w.gross_exposure_usd)
            / SUM(fes_w.gross_exposure_usd)
  END AS metric_value
FROM (
{cp_subquery_sql}
) fac
{join_block}
GROUP BY {dim_key}"""

    return {
        "desk": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {metric_label} per L3 desk segment.\n",
            "formula_sql": make_agg_sql("ebt.managed_segment_id", DESK_JOIN_CP),
        },
        "portfolio": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {metric_label} per L2 portfolio segment.\n",
            "formula_sql": make_agg_sql("ebt_l2.managed_segment_id", PORTFOLIO_JOIN_CP),
        },
        "business_segment": {
            "aggregation_type": "WEIGHTED_AVG",
            "formula_text": f"Exposure-weighted average {metric_label} per L1 business segment.\n",
            "formula_sql": make_agg_sql("ebt_l1.managed_segment_id", BIZSEG_JOIN_CP),
        },
    }


def make_count_levels(facility_sql, field_label):
    """Generate rollup levels that COUNT facilities instead of SUMming text values."""

    def make_count_sql(dim_key, join_block):
        return f"""SELECT
  {dim_key} AS dimension_key,
  COUNT(DISTINCT fac.facility_id) AS metric_value
FROM (
{facility_sql}
) fac
{join_block}
GROUP BY {dim_key}"""

    return {
        "counterparty": {
            "aggregation_type": "COUNT",
            "formula_text": f"COUNT of facilities with {field_label} per counterparty.\n",
            "formula_sql": make_count_sql("fm.counterparty_id",
                "INNER JOIN l1.facility_master fm\n  ON fm.facility_id = fac.facility_id\n  AND fm.active_flag = 'Y'"),
        },
        "desk": {
            "aggregation_type": "COUNT",
            "formula_text": f"COUNT of facilities with {field_label} per L3 desk segment.\n",
            "formula_sql": make_count_sql("ebt.managed_segment_id", DESK_JOIN),
        },
        "portfolio": {
            "aggregation_type": "COUNT",
            "formula_text": f"COUNT of facilities with {field_label} per L2 portfolio segment.\n",
            "formula_sql": make_count_sql("ebt_l2.managed_segment_id", PORTFOLIO_JOIN),
        },
        "business_segment": {
            "aggregation_type": "COUNT",
            "formula_text": f"COUNT of facilities with {field_label} per L1 business segment.\n",
            "formula_sql": make_count_sql("ebt_l1.managed_segment_id", BIZSEG_JOIN),
        },
    }


def make_pct_rate_levels(flag_condition, source_table, source_alias, date_filter, metric_label):
    """Generate rollup levels for percentage = COUNT(flagged)/COUNT(total)*100."""
    base_from = f"""FROM {source_table} {source_alias}
INNER JOIN l1.facility_master fm
  ON fm.facility_id = {source_alias}.facility_id
  AND fm.active_flag = 'Y'
WHERE {date_filter}"""

    def make_pct_sql(dim_key, extra_join=""):
        return f"""SELECT
  {dim_key} AS dimension_key,
  CASE WHEN COUNT(*) = 0 THEN NULL
       ELSE SUM(CASE WHEN {flag_condition} THEN 1 ELSE 0 END)::FLOAT
            / COUNT(*) * 100.0
  END AS metric_value
{base_from}
{extra_join}
GROUP BY {dim_key}"""

    ebt_desk = """LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id"""
    ebt_port = """LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id"""
    ebt_biz = ebt_port + """
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id"""

    return {
        "facility": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"Binary flag: 1 if {metric_label}, 0 otherwise.\n",
            "formula_sql": f"""SELECT
  {source_alias}.facility_id AS dimension_key,
  CASE WHEN {flag_condition} THEN 1.0 ELSE 0.0 END AS metric_value
{base_from}""",
        },
        "counterparty": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"Percentage of facilities with {metric_label} per counterparty.\n",
            "formula_sql": make_pct_sql("fm.counterparty_id"),
        },
        "desk": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"Percentage of facilities with {metric_label} per L3 desk.\n",
            "formula_sql": make_pct_sql("ebt.managed_segment_id", ebt_desk),
        },
        "portfolio": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"Percentage of facilities with {metric_label} per L2 portfolio.\n",
            "formula_sql": make_pct_sql("ebt_l2.managed_segment_id", ebt_port),
        },
        "business_segment": {
            "aggregation_type": "CUSTOM",
            "formula_text": f"Percentage of facilities with {metric_label} per L1 business segment.\n",
            "formula_sql": make_pct_sql("ebt_l1.managed_segment_id", ebt_biz),
        },
    }


# ═══════════════════════════════════════════════════════════════
# METRIC FIXES
# ═══════════════════════════════════════════════════════════════

FIXES = {}

# ── CAP-001: Capital Adequacy Ratio ───────────────────────────
# Fix: SUM(ratio) → SUM(equity)/SUM(rwa)*100
FIXES["capital/CAP-001"] = make_sum_ratio_levels(
    subquery_sql="""  SELECT
    fprs.facility_id,
    fprs.allocated_equity_amt AS numerator_val,
    fes.rwa_amt AS denominator_val
  FROM l2.facility_profitability_snapshot fprs
  INNER JOIN l2.facility_exposure_snapshot fes
    ON fes.facility_id = fprs.facility_id
    AND fes.as_of_date = fprs.as_of_date
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fprs.facility_id
    AND fm.active_flag = 'Y'
  WHERE fprs.as_of_date = :as_of_date""",
    numerator_col="allocated_equity",
    denominator_col="rwa",
)

# ── CAP-002: Return on RWA ───────────────────────────────────
FIXES["capital/CAP-002"] = make_sum_ratio_levels(
    subquery_sql="""  SELECT
    ffs.facility_id,
    ffs.net_income_amt AS numerator_val,
    fes.rwa_amt AS denominator_val
  FROM l2.facility_financial_snapshot ffs
  INNER JOIN l2.facility_exposure_snapshot fes
    ON fes.facility_id = ffs.facility_id
    AND fes.as_of_date = ffs.as_of_date
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = ffs.facility_id
    AND fm.active_flag = 'Y'
  WHERE ffs.as_of_date = :as_of_date""",
    numerator_col="net_income",
    denominator_col="rwa",
)

# ── CAP-003: Risk Weight ─────────────────────────────────────
# Fix: SUM(risk_weight_pct) → Weighted avg by gross_exposure
FIXES["capital/CAP-003"] = make_weighted_avg_levels(
    subquery_sql="""  SELECT
    frs.facility_id,
    frs.risk_weight_pct AS rate_val,
    fes.gross_exposure_usd AS weight_val
  FROM l2.facility_risk_snapshot frs
  INNER JOIN l2.facility_exposure_snapshot fes
    ON fes.facility_id = frs.facility_id
    AND fes.as_of_date = frs.as_of_date
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = frs.facility_id
    AND fm.active_flag = 'Y'
  WHERE frs.as_of_date = :as_of_date""",
    rate_col="risk_weight_pct",
    weight_col="gross_exposure_usd",
)

# ── EXP-028: Net Interest Margin ─────────────────────────────
FIXES["exposure/EXP-028"] = make_sum_ratio_levels(
    subquery_sql="""  SELECT
    fprs.facility_id,
    COALESCE(fprs.interest_income_amt, 0) - COALESCE(fprs.interest_expense_amt, 0) AS numerator_val,
    fprs.avg_earning_assets_amt AS denominator_val
  FROM l2.facility_profitability_snapshot fprs
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fprs.facility_id
    AND fm.active_flag = 'Y'
  WHERE fprs.as_of_date = :as_of_date""",
    numerator_col="net_interest_income",
    denominator_col="avg_earning_assets",
)

# ── EXP-038: Utilization ─────────────────────────────────────
FIXES["exposure/EXP-038"] = make_sum_ratio_levels(
    subquery_sql="""  SELECT
    fes.facility_id,
    fes.drawn_amount AS numerator_val,
    fes.committed_amount AS denominator_val
  FROM l2.facility_exposure_snapshot fes
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fes.facility_id
    AND fm.active_flag = 'Y'
  WHERE fes.as_of_date = :as_of_date""",
    numerator_col="drawn_amount",
    denominator_col="committed_amount",
)

# ── EXP-045: RWA Density ─────────────────────────────────────
FIXES["exposure/EXP-045"] = make_sum_ratio_levels(
    subquery_sql="""  SELECT
    fes.facility_id,
    fes.rwa_amt AS numerator_val,
    fes.gross_exposure_usd AS denominator_val
  FROM l2.facility_exposure_snapshot fes
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fes.facility_id
    AND fm.active_flag = 'Y'
  WHERE fes.as_of_date = :as_of_date""",
    numerator_col="rwa",
    denominator_col="gross_exposure",
)
# Also fix aggregation_type consistency
FIXES["exposure/EXP-045"]["_meta"] = {"fix_agg_types": True}

# ── EXP-047: Fixed Cost Coverage Ratio ───────────────────────
FIXES["exposure/EXP-047"] = make_sum_ratio_levels(
    subquery_sql="""  SELECT
    ffs.facility_id,
    ffs.ebitda_amt AS numerator_val,
    ffs.total_debt_service_amt AS denominator_val
  FROM l2.facility_financial_snapshot ffs
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = ffs.facility_id
    AND fm.active_flag = 'Y'
  WHERE ffs.as_of_date = :as_of_date""",
    numerator_col="ebitda",
    denominator_col="total_debt_service",
    multiplier=1.0,  # FCCR is a ratio, not percentage
)

# ── EXP-035: Return on Assets (counterparty-sourced) ─────────
_roa_cp_sub = """  SELECT
    cfs.counterparty_id,
    cfs.net_income_amt / NULLIF(cfs.total_assets_amt, 0) * 100.0 AS metric_value
  FROM l2.counterparty_financial_snapshot cfs
  WHERE cfs.as_of_date = :as_of_date"""

FIXES["exposure/EXP-035"] = {
    "counterparty": {
        "aggregation_type": "CUSTOM",
        "formula_text": "Net Income / Total Assets * 100 per counterparty (direct from financials).\n",
        "formula_sql": f"""SELECT
  cfs.counterparty_id AS dimension_key,
  cfs.net_income_amt / NULLIF(cfs.total_assets_amt, 0) * 100.0 AS metric_value
FROM l2.counterparty_financial_snapshot cfs
WHERE cfs.as_of_date = :as_of_date""",
    },
    **make_cp_sourced_wavg_levels(_roa_cp_sub, "ROA"),
}

# ── EXP-036: Return on Equity (counterparty-sourced) ─────────
_roe_cp_sub = """  SELECT
    cfs.counterparty_id,
    cfs.net_income_amt / NULLIF(cfs.shareholders_equity_amt, 0) * 100.0 AS metric_value
  FROM l2.counterparty_financial_snapshot cfs
  WHERE cfs.as_of_date = :as_of_date"""

FIXES["exposure/EXP-036"] = {
    "counterparty": {
        "aggregation_type": "CUSTOM",
        "formula_text": "Net Income / Shareholders Equity * 100 per counterparty (direct from financials).\n",
        "formula_sql": f"""SELECT
  cfs.counterparty_id AS dimension_key,
  cfs.net_income_amt / NULLIF(cfs.shareholders_equity_amt, 0) * 100.0 AS metric_value
FROM l2.counterparty_financial_snapshot cfs
WHERE cfs.as_of_date = :as_of_date""",
    },
    **make_cp_sourced_wavg_levels(_roe_cp_sub, "ROE"),
}

# ── PRC-001: All-in Rate (weighted avg by committed amount) ──
FIXES["pricing/PRC-001"] = make_weighted_avg_levels(
    subquery_sql="""  SELECT
    fps.facility_id,
    fps.all_in_rate_pct AS rate_val,
    fes.committed_amount AS weight_val
  FROM l2.facility_pricing_snapshot fps
  INNER JOIN l2.facility_exposure_snapshot fes
    ON fes.facility_id = fps.facility_id
    AND fes.as_of_date = fps.as_of_date
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fps.facility_id
    AND fm.active_flag = 'Y'
  WHERE fps.as_of_date = :as_of_date""",
    rate_col="all_in_rate_pct",
    weight_col="committed_amount",
)
# Also fix facility level to RAW instead of SUM
FIXES["pricing/PRC-001"]["facility"] = {
    "aggregation_type": "RAW",
    "formula_text": "Read all_in_rate_pct from facility_pricing_snapshot for each facility.\n",
    "formula_sql": """SELECT
  fps.facility_id AS dimension_key,
  fps.all_in_rate_pct AS metric_value
FROM l2.facility_pricing_snapshot fps
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fps.facility_id
  AND fm.active_flag = 'Y'
WHERE fps.as_of_date = :as_of_date""",
}

# ── EXP-010: Delinquency Rate (flag → percentage) ────────────
FIXES["exposure/EXP-010"] = make_pct_rate_levels(
    flag_condition="fds.days_past_due > 0",
    source_table="l2.facility_delinquency_snapshot",
    source_alias="fds",
    date_filter="fds.as_of_date = :as_of_date",
    metric_label="delinquency (days_past_due > 0)",
)

# ── PRC-003: Exception Rate (flag → percentage) ──────────────
FIXES["pricing/PRC-003"] = make_pct_rate_levels(
    flag_condition="fps.pricing_exception_flag = 'Y'",
    source_table="l2.facility_pricing_snapshot",
    source_alias="fps",
    date_filter="fps.as_of_date = :as_of_date",
    metric_label="pricing exception",
)

# ── EXP-007: Criticized Portfolios (fix CASE codes) ──────────
# Fix: mixed numeric/text codes → use only numeric rating codes (6-10 = criticized)
FIXES["exposure/EXP-007"] = make_pct_rate_levels(
    flag_condition="CAST(frs.internal_risk_rating AS INTEGER) >= 6",
    source_table="l2.facility_risk_snapshot",
    source_alias="frs",
    date_filter="frs.as_of_date = :as_of_date",
    metric_label="criticized rating (internal_risk_rating >= 6)",
)

# ── REF-001: Number of Loans (COUNT DISTINCT → SUM) ──────────
FIXES["reference/REF-001"] = {
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read number_of_loans from facility_exposure_snapshot for each facility.\n",
        "formula_sql": """SELECT
  fes.facility_id AS dimension_key,
  COALESCE(fes.number_of_loans, 1) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.active_flag = 'Y'
WHERE fes.as_of_date = :as_of_date""",
    },
    "counterparty": {
        "aggregation_type": "SUM",
        "formula_text": "SUM of number_of_loans per counterparty.\n",
        "formula_sql": """SELECT
  fm.counterparty_id AS dimension_key,
  SUM(COALESCE(fes.number_of_loans, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.active_flag = 'Y'
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id""",
    },
    "desk": {
        "aggregation_type": "SUM",
        "formula_text": "SUM of number_of_loans per L3 desk segment.\n",
        "formula_sql": """SELECT
  ebt.managed_segment_id AS dimension_key,
  SUM(COALESCE(fes.number_of_loans, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.active_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id
WHERE fes.as_of_date = :as_of_date
GROUP BY ebt.managed_segment_id""",
    },
    "portfolio": {
        "aggregation_type": "SUM",
        "formula_text": "SUM of number_of_loans per L2 portfolio segment.\n",
        "formula_sql": """SELECT
  ebt_l2.managed_segment_id AS dimension_key,
  SUM(COALESCE(fes.number_of_loans, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.active_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
WHERE fes.as_of_date = :as_of_date
GROUP BY ebt_l2.managed_segment_id""",
    },
    "business_segment": {
        "aggregation_type": "SUM",
        "formula_text": "SUM of number_of_loans per L1 business segment.\n",
        "formula_sql": """SELECT
  ebt_l1.managed_segment_id AS dimension_key,
  SUM(COALESCE(fes.number_of_loans, 1)) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.active_flag = 'Y'
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id
WHERE fes.as_of_date = :as_of_date
GROUP BY ebt_l1.managed_segment_id""",
    },
}

# ── REF-005: Counterparty Name (text → COUNT) ────────────────
_ref005_fac_sql = """  SELECT
    fm.facility_id,
    cp.counterparty_id
  FROM l1.facility_master fm
  INNER JOIN l1.counterparty cp
    ON cp.counterparty_id = fm.counterparty_id
  WHERE fm.active_flag = 'Y'"""

FIXES["reference/REF-005"] = {
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read legal_name from counterparty for each facility's counterparty.\n",
        "formula_sql": """SELECT
  fm.facility_id AS dimension_key,
  1 AS metric_value
FROM l1.facility_master fm
INNER JOIN l1.counterparty cp
  ON cp.counterparty_id = fm.counterparty_id
WHERE fm.active_flag = 'Y'""",
    },
    **make_count_levels(_ref005_fac_sql, "counterparty name"),
}
FIXES["reference/REF-005"]["_meta"] = {"unit_type": "COUNT", "display_format": ",.0f"}

# ── RSK-001: Risk Rating Tier (text → COUNT) ─────────────────
_rsk001_fac_sql = """  SELECT
    fm.facility_id
  FROM l2.counterparty_rating_observation cro
  INNER JOIN l1.facility_master fm
    ON fm.counterparty_id = cro.counterparty_id
    AND fm.active_flag = 'Y'
  WHERE cro.as_of_date = :as_of_date"""

FIXES["risk/RSK-001"] = {
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read risk_rating_status from counterparty_rating_observation for each facility.\n",
        "formula_sql": """SELECT
  fm.facility_id AS dimension_key,
  1 AS metric_value
FROM l2.counterparty_rating_observation cro
INNER JOIN l1.facility_master fm
  ON fm.counterparty_id = cro.counterparty_id
  AND fm.active_flag = 'Y'
WHERE cro.as_of_date = :as_of_date""",
    },
    **make_count_levels(_rsk001_fac_sql, "risk rating"),
}
FIXES["risk/RSK-001"]["_meta"] = {"unit_type": "COUNT", "display_format": ",.0f"}

# ── RSK-003: Internal Risk Rating (fix source table + COUNT) ─
# Fix: counterparty table has no facility_id; source from facility_risk_snapshot
_rsk003_fac_sql = """  SELECT
    frs.facility_id
  FROM l2.facility_risk_snapshot frs
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = frs.facility_id
    AND fm.active_flag = 'Y'
  WHERE frs.as_of_date = :as_of_date"""

FIXES["risk/RSK-003"] = {
    "_meta": {
        "unit_type": "COUNT",
        "display_format": ",.0f",
        "source_tables": [
            {
                "schema": "l2",
                "table": "facility_risk_snapshot",
                "alias": "frs",
                "join_type": "BASE",
                "fields": [
                    {"name": "facility_id", "role": "JOIN_KEY"},
                    {"name": "as_of_date", "role": "FILTER"},
                    {"name": "internal_risk_rating", "role": "MEASURE"},
                ],
            },
            {
                "schema": "l1",
                "table": "facility_master",
                "alias": "fm",
                "join_type": "INNER",
                "join_on": "fm.facility_id = frs.facility_id",
                "fields": [
                    {"name": "facility_id", "role": "JOIN_KEY"},
                    {"name": "counterparty_id", "role": "DIMENSION"},
                    {"name": "lob_segment_id", "role": "DIMENSION"},
                    {"name": "active_flag", "role": "FILTER"},
                ],
            },
            {
                "schema": "l1",
                "table": "enterprise_business_taxonomy",
                "alias": "ebt",
                "join_type": "LEFT",
                "join_on": "ebt.managed_segment_id = fm.lob_segment_id",
                "fields": [
                    {"name": "managed_segment_id", "role": "DIMENSION"},
                    {"name": "parent_segment_id", "role": "DIMENSION"},
                ],
            },
        ],
    },
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read internal_risk_rating from facility_risk_snapshot for each facility.\n",
        "formula_sql": """SELECT
  frs.facility_id AS dimension_key,
  1 AS metric_value
FROM l2.facility_risk_snapshot frs
INNER JOIN l1.facility_master fm
  ON fm.facility_id = frs.facility_id
  AND fm.active_flag = 'Y'
WHERE frs.as_of_date = :as_of_date""",
    },
    **make_count_levels(_rsk003_fac_sql, "internal risk rating"),
}

# ── RSK-008: Internal Risk Rating Bucket (ordinal → COUNT) ───
_rsk008_fac_sql = """  SELECT
    fes.facility_id
  FROM l2.facility_exposure_snapshot fes
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fes.facility_id
    AND fm.active_flag = 'Y'
  WHERE fes.as_of_date = :as_of_date"""

FIXES["risk/RSK-008"] = {
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read internal_risk_rating_bucket_code from facility_exposure_snapshot for each facility.\n",
        "formula_sql": """SELECT
  fes.facility_id AS dimension_key,
  1 AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fes.facility_id
  AND fm.active_flag = 'Y'
WHERE fes.as_of_date = :as_of_date""",
    },
    **make_count_levels(_rsk008_fac_sql, "risk rating bucket"),
}
FIXES["risk/RSK-008"]["_meta"] = {"unit_type": "COUNT", "display_format": ",.0f"}

# ── PRC-005: Pricing Exception Status (ordinal → COUNT) ──────
_prc005_fac_sql = """  SELECT
    fm.facility_id
  FROM l2.facility_pricing_snapshot fps
  INNER JOIN l1.facility_master fm
    ON fm.facility_id = fps.facility_id
    AND fm.active_flag = 'Y'
  WHERE fps.as_of_date = :as_of_date
    AND fps.pricing_exception_flag = 'Y'"""

FIXES["pricing/PRC-005"] = {
    "_meta": {
        "unit_type": "COUNT",
        "display_format": ",.0f",
        "source_tables": [
            {
                "schema": "l2",
                "table": "facility_pricing_snapshot",
                "alias": "fps",
                "join_type": "BASE",
                "fields": [
                    {"name": "facility_id", "role": "JOIN_KEY"},
                    {"name": "as_of_date", "role": "FILTER"},
                    {"name": "pricing_exception_flag", "role": "FILTER"},
                    {"name": "pricing_exception_status", "role": "MEASURE"},
                ],
            },
            {
                "schema": "l1",
                "table": "facility_master",
                "alias": "fm",
                "join_type": "INNER",
                "join_on": "fm.facility_id = fps.facility_id",
                "fields": [
                    {"name": "facility_id", "role": "JOIN_KEY"},
                    {"name": "counterparty_id", "role": "DIMENSION"},
                    {"name": "lob_segment_id", "role": "DIMENSION"},
                    {"name": "active_flag", "role": "FILTER"},
                ],
            },
            {
                "schema": "l1",
                "table": "enterprise_business_taxonomy",
                "alias": "ebt",
                "join_type": "LEFT",
                "join_on": "ebt.managed_segment_id = fm.lob_segment_id",
                "fields": [
                    {"name": "managed_segment_id", "role": "DIMENSION"},
                    {"name": "parent_segment_id", "role": "DIMENSION"},
                ],
            },
        ],
    },
    "facility": {
        "aggregation_type": "CUSTOM",
        "formula_text": "Binary flag: 1 if pricing exception exists, 0 otherwise.\n",
        "formula_sql": """SELECT
  fps.facility_id AS dimension_key,
  CASE WHEN fps.pricing_exception_flag = 'Y' THEN 1.0 ELSE 0.0 END AS metric_value
FROM l2.facility_pricing_snapshot fps
INNER JOIN l1.facility_master fm
  ON fm.facility_id = fps.facility_id
  AND fm.active_flag = 'Y'
WHERE fps.as_of_date = :as_of_date""",
    },
    **make_count_levels(_prc005_fac_sql, "pricing exception"),
}

# ── AMD-001: Amendment Start Date (date → MAX) ───────────────
FIXES["amendments/AMD-001"] = {
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read effective_date from facility_master for each facility.\n",
        "formula_sql": """SELECT
  fm.facility_id AS dimension_key,
  EXTRACT(EPOCH FROM fm.effective_date)::BIGINT AS metric_value
FROM l1.facility_master fm
WHERE fm.active_flag = 'Y'""",
    },
    "counterparty": {
        "aggregation_type": "MAX",
        "formula_text": "Latest (MAX) effective_date per counterparty.\n",
        "formula_sql": """SELECT
  fm.counterparty_id AS dimension_key,
  MAX(EXTRACT(EPOCH FROM fm.effective_date)::BIGINT) AS metric_value
FROM l1.facility_master fm
WHERE fm.active_flag = 'Y'
GROUP BY fm.counterparty_id""",
    },
    "desk": {
        "aggregation_type": "MAX",
        "formula_text": "Latest (MAX) effective_date per L3 desk segment.\n",
        "formula_sql": """SELECT
  ebt.managed_segment_id AS dimension_key,
  MAX(EXTRACT(EPOCH FROM fm.effective_date)::BIGINT) AS metric_value
FROM l1.facility_master fm
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id
WHERE fm.active_flag = 'Y'
GROUP BY ebt.managed_segment_id""",
    },
    "portfolio": {
        "aggregation_type": "MAX",
        "formula_text": "Latest (MAX) effective_date per L2 portfolio segment.\n",
        "formula_sql": """SELECT
  ebt_l2.managed_segment_id AS dimension_key,
  MAX(EXTRACT(EPOCH FROM fm.effective_date)::BIGINT) AS metric_value
FROM l1.facility_master fm
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
WHERE fm.active_flag = 'Y'
GROUP BY ebt_l2.managed_segment_id""",
    },
    "business_segment": {
        "aggregation_type": "MAX",
        "formula_text": "Latest (MAX) effective_date per L1 business segment.\n",
        "formula_sql": """SELECT
  ebt_l1.managed_segment_id AS dimension_key,
  MAX(EXTRACT(EPOCH FROM fm.effective_date)::BIGINT) AS metric_value
FROM l1.facility_master fm
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id
WHERE fm.active_flag = 'Y'
GROUP BY ebt_l1.managed_segment_id""",
    },
}
FIXES["amendments/AMD-001"]["_meta"] = {"unit_type": "DAYS", "display_format": "s"}

# ── AMD-002: Amendment Status (fix source table + COUNT) ──────
_amd002_fac_sql = """  SELECT
    fm.facility_id
  FROM l1.facility_master fm
  WHERE fm.active_flag = 'Y'"""

FIXES["amendments/AMD-002"] = {
    "_meta": {
        "unit_type": "COUNT",
        "display_format": ",.0f",
        "source_tables": [
            {
                "schema": "l1",
                "table": "facility_master",
                "alias": "fm",
                "join_type": "BASE",
                "fields": [
                    {"name": "facility_id", "role": "JOIN_KEY"},
                    {"name": "counterparty_id", "role": "DIMENSION"},
                    {"name": "lob_segment_id", "role": "DIMENSION"},
                    {"name": "active_flag", "role": "FILTER"},
                ],
            },
            {
                "schema": "l1",
                "table": "enterprise_business_taxonomy",
                "alias": "ebt",
                "join_type": "LEFT",
                "join_on": "ebt.managed_segment_id = fm.lob_segment_id",
                "fields": [
                    {"name": "managed_segment_id", "role": "DIMENSION"},
                    {"name": "parent_segment_id", "role": "DIMENSION"},
                ],
            },
        ],
    },
    "facility": {
        "aggregation_type": "RAW",
        "formula_text": "Read amendment status flag for each active facility.\n",
        "formula_sql": """SELECT
  fm.facility_id AS dimension_key,
  1 AS metric_value
FROM l1.facility_master fm
WHERE fm.active_flag = 'Y'""",
    },
    **make_count_levels(_amd002_fac_sql, "amendment status"),
}


# ═══════════════════════════════════════════════════════════════
# APPLY FIXES
# ═══════════════════════════════════════════════════════════════

def apply_fix(path_key, level_fixes):
    """Read YAML, apply level fixes, write back."""
    filepath = os.path.join(BASE, f"{path_key}.yaml")
    if not os.path.exists(filepath):
        print(f"  SKIP {path_key} — file not found")
        return False

    with open(filepath, "r") as f:
        content = f.read()

    data = yaml.safe_load(content)

    meta = level_fixes.get("_meta", {})

    # Apply metadata fixes
    if "unit_type" in meta:
        data["unit_type"] = meta["unit_type"]
    if "display_format" in meta:
        data["display_format"] = meta["display_format"]
    if "source_tables" in meta:
        data["source_tables"] = meta["source_tables"]

    # Apply level fixes
    for level_name in ["facility", "counterparty", "desk", "portfolio", "business_segment"]:
        if level_name in level_fixes:
            fix = level_fixes[level_name]
            data["levels"][level_name]["aggregation_type"] = fix["aggregation_type"]
            data["levels"][level_name]["formula_text"] = fix["formula_text"]
            data["levels"][level_name]["formula_sql"] = fix["formula_sql"]

    # Write back
    write_yaml_file(filepath, data)
    return True


def write_yaml_file(filepath, data):
    """Write YAML with proper formatting matching existing style."""
    # Use yaml.dump but with specific settings
    class Dumper(yaml.SafeDumper):
        pass

    # Represent multiline strings with | style
    def str_representer(dumper, data):
        if "\n" in data:
            return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
        return dumper.represent_scalar("tag:yaml.org,2002:str", data)

    Dumper.add_representer(str, str_representer)

    with open(filepath, "w") as f:
        yaml.dump(data, f, Dumper=Dumper, default_flow_style=False, sort_keys=False, width=120, allow_unicode=True)


def main():
    print("=" * 60)
    print("GSIB Metric Rollup Fix Script")
    print("=" * 60)

    fixed = 0
    failed = 0

    for path_key, level_fixes in sorted(FIXES.items()):
        metric_id = path_key.split("/")[-1]
        print(f"\n  Fixing {metric_id}...", end=" ")
        try:
            if apply_fix(path_key, level_fixes):
                print("OK")
                fixed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"ERROR: {e}")
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"Fixed: {fixed}  |  Failed: {failed}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
