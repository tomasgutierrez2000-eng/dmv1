"""YAML metric definition loader for the Python calc-engine.

Mirrors the TS loader at scripts/calc_engine/loader/yaml-loader.ts.
Reads metrics/**/*.yaml, parses, and returns typed definitions keyed by metric_id.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

METRICS_DIR = Path(__file__).resolve().parent / "metrics"

# Module-level cache — parsed once per process
_CACHE: dict[str, MetricDefinitionYAML] | None = None


@dataclass
class SourceFieldDef:
    name: str
    role: str  # MEASURE | DIMENSION | FILTER | JOIN_KEY
    description: str = ""


@dataclass
class SourceTableDef:
    schema: str  # l1 | l2 | l3
    table: str
    alias: str
    join_type: str  # BASE | INNER | LEFT | CROSS
    join_on: str | None = None
    fields: list[SourceFieldDef] = field(default_factory=list)

    @property
    def layer(self) -> str:
        """Return schema as uppercase layer key (L1, L2, L3)."""
        return self.schema.upper()


@dataclass
class LevelFormula:
    aggregation_type: str  # RAW | SUM | WEIGHTED_AVG | COUNT | ...
    formula_text: str
    formula_sql: str
    weighting_field: str | None = None


@dataclass
class MetricDefinitionYAML:
    metric_id: str
    name: str
    version: str
    owner: str
    status: str
    effective_date: str
    domain: str
    sub_domain: str
    metric_class: str
    direction: str
    unit_type: str
    display_format: str
    description: str
    source_tables: list[SourceTableDef]
    levels: dict[str, LevelFormula]
    depends_on: list[str]
    validations: list[dict[str, Any]]
    tags: list[str]
    dashboard_pages: list[str]
    legacy_metric_ids: list[str]
    _file_path: str = ""

    def measure_fields(self) -> list[dict[str, str]]:
        """Extract fields with role=MEASURE from source_tables.

        Returns list of {"layer": "L2", "table": "...", "field": "..."}
        matching the format of BaseCalculator.ingredient_fields().
        """
        result: list[dict[str, str]] = []
        seen: set[str] = set()
        for st in self.source_tables:
            for f in st.fields:
                if f.role == "MEASURE":
                    key = f"{st.layer}.{st.table}.{f.name}"
                    if key not in seen:
                        seen.add(key)
                        result.append({
                            "layer": st.layer,
                            "table": st.table,
                            "field": f.name,
                        })
        return result

    def source_table_names(self) -> list[tuple[str, str]]:
        """Return [(layer, table_name)] for all source tables."""
        return [(st.layer, st.table) for st in self.source_tables]

    def get_level(self, level: str) -> LevelFormula | None:
        """Get a level formula. Maps 'lob' -> 'business_segment'."""
        level_map = {"lob": "business_segment"}
        return self.levels.get(level_map.get(level, level))


def _parse_source_table(raw: dict) -> SourceTableDef:
    fields = [
        SourceFieldDef(
            name=f["name"],
            role=f["role"],
            description=f.get("description", ""),
        )
        for f in raw.get("fields", [])
    ]
    return SourceTableDef(
        schema=raw["schema"],
        table=raw["table"],
        alias=raw["alias"],
        join_type=raw["join_type"],
        join_on=raw.get("join_on"),
        fields=fields,
    )


def _parse_level(raw: dict) -> LevelFormula:
    return LevelFormula(
        aggregation_type=raw["aggregation_type"],
        formula_text=raw["formula_text"],
        formula_sql=raw["formula_sql"],
        weighting_field=raw.get("weighting_field"),
    )


def _parse_metric(raw: dict, file_path: str) -> MetricDefinitionYAML:
    source_tables = [_parse_source_table(st) for st in raw.get("source_tables", [])]
    levels = {k: _parse_level(v) for k, v in raw.get("levels", {}).items()}

    return MetricDefinitionYAML(
        metric_id=raw["metric_id"],
        name=raw["name"],
        version=raw.get("version", "1.0.0"),
        owner=raw.get("owner", ""),
        status=raw.get("status", "DRAFT"),
        effective_date=raw.get("effective_date", ""),
        domain=raw.get("domain", ""),
        sub_domain=raw.get("sub_domain", ""),
        metric_class=raw.get("metric_class", "CALCULATED"),
        direction=raw.get("direction", "NEUTRAL"),
        unit_type=raw.get("unit_type", "CURRENCY"),
        display_format=raw.get("display_format", ""),
        description=raw.get("description", "").strip(),
        source_tables=source_tables,
        levels=levels,
        depends_on=raw.get("depends_on", []),
        validations=raw.get("validations", []),
        tags=raw.get("tags", []),
        dashboard_pages=raw.get("dashboard_pages", []),
        legacy_metric_ids=raw.get("legacy_metric_ids", []),
        _file_path=file_path,
    )


def load_metric_definitions(
    metrics_dir: Path | None = None,
    use_cache: bool = True,
) -> tuple[dict[str, MetricDefinitionYAML], list[str]]:
    """Load all YAML metric definitions.

    Returns (metrics_by_id, errors).
    Keyed by metric_id and also by each legacy_metric_id.
    """
    global _CACHE

    if use_cache and _CACHE is not None and metrics_dir is None:
        return _CACHE, []

    dir_ = metrics_dir or METRICS_DIR
    metrics: dict[str, MetricDefinitionYAML] = {}
    errors: list[str] = []

    if not dir_.exists():
        return metrics, [f"Metrics directory not found: {dir_}"]

    for root, _dirs, files in os.walk(dir_):
        for fname in sorted(files):
            if not fname.endswith(".yaml") or fname.startswith("_"):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath) as f:
                    raw = yaml.safe_load(f)
                metric = _parse_metric(raw, fpath)
                if metric.metric_id in metrics:
                    errors.append(f"{fpath}: duplicate metric_id {metric.metric_id}")
                    continue
                metrics[metric.metric_id] = metric
                # Also register under legacy IDs for lookup
                for legacy_id in metric.legacy_metric_ids:
                    if legacy_id not in metrics:
                        metrics[legacy_id] = metric
            except Exception as e:
                errors.append(f"{fpath}: {e}")

    if use_cache and metrics_dir is None:
        _CACHE = metrics

    return metrics, errors
