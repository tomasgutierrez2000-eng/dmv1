"""FastAPI server for the metric calculation engine.

Deployed to Google Cloud Run. Exposes the same interface as the CLI
(run_metric.py) over HTTP so Vercel-hosted Next.js can call it.

Usage (local):
  uvicorn scripts.calc_engine.server:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import json
import math
import os
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import DEFAULT_AS_OF_DATE
from .data_loader import DataLoader
from .registry import get_calculator, list_calculators

# Import calculators to trigger registration
from . import calculators as _  # noqa: F401

app = FastAPI(title="Calc Engine", docs_url="/docs")

VALID_DIMENSIONS = {"facility", "counterparty", "desk", "portfolio", "lob"}


class RunRequest(BaseModel):
    metric_id: str
    dimension: str = Field(default="facility")
    as_of_date: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/list")
def list_metrics():
    return list_calculators()


@app.post("/run")
def run_metric(req: RunRequest):
    if req.dimension not in VALID_DIMENSIONS:
        raise HTTPException(400, f"dimension must be one of: {', '.join(sorted(VALID_DIMENSIONS))}")

    calc = get_calculator(req.metric_id)
    if calc is None:
        available = list_calculators()
        raise HTTPException(
            422,
            detail={
                "error": f"No calculator found for: {req.metric_id}",
                "available": available,
            },
        )

    as_of_date = req.as_of_date or DEFAULT_AS_OF_DATE
    loader = DataLoader()
    try:
        result = calc.run(loader, as_of_date, req.dimension)
        # Replace NaN/Inf with None for JSON compatibility
        result = result.where(result.notna(), None)
        rows = _sanitize_floats(result.to_dict(orient="records"))
        return JSONResponse({
            "ok": True,
            "metric_id": req.metric_id,
            "dimension": req.dimension,
            "row_count": len(rows),
            "rows": rows,
        })
    except Exception as e:
        raise HTTPException(500, detail={"error": str(e)})
    finally:
        loader.close()


class PopulateRequest(BaseModel):
    as_of_date: Optional[str] = None
    run_version: str = Field(default="RUN_MVP_001")
    metric_id: Optional[str] = None
    dimension: Optional[str] = None


@app.post("/populate")
def populate_l3(req: PopulateRequest):
    """Run calculators and INSERT results into l3.metric_value_fact."""
    from .populate_l3 import _build_rows, DIMENSIONS, DIMENSION_MAP

    if req.dimension and req.dimension not in VALID_DIMENSIONS:
        raise HTTPException(400, f"dimension must be one of: {', '.join(sorted(VALID_DIMENSIONS))}")

    as_of_date = req.as_of_date or DEFAULT_AS_OF_DATE
    dims = [req.dimension] if req.dimension else list(DIMENSIONS)

    # Determine calculators to run
    if req.metric_id:
        calc = get_calculator(req.metric_id)
        if calc is None:
            raise HTTPException(422, detail={"error": f"No calculator found for: {req.metric_id}"})
        calcs = [{"metric_id": calc.metric_id, "calculator": calc}]
    else:
        calcs = []
        for entry in list_calculators():
            calc = get_calculator(entry["metric_id"])
            if calc:
                calcs.append({"metric_id": entry["metric_id"], "calculator": calc})

    loader = DataLoader()
    all_rows: list[tuple] = []
    errors: list[dict] = []
    calc_count = 0

    try:
        for entry in calcs:
            calc = entry["calculator"]
            mid = entry["metric_id"]
            for dim in dims:
                try:
                    result = calc.run(loader, as_of_date, dim)
                    if result.empty:
                        continue
                    rows = _build_rows(mid, dim, as_of_date, req.run_version, result)
                    all_rows.extend(rows)
                    calc_count += 1
                except Exception as e:
                    errors.append({"metric_id": mid, "dimension": dim, "error": str(e)})
    finally:
        loader.close()

    # Write to PostgreSQL
    from .config import DATABASE_URL
    if not DATABASE_URL:
        return JSONResponse({
            "ok": True,
            "dry_run": True,
            "row_count": len(all_rows),
            "calc_count": calc_count,
            "error_count": len(errors),
            "errors": errors[:10],
        })

    import psycopg2
    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor()
        cur.execute("CREATE SCHEMA IF NOT EXISTS l3;")
        cur.execute(
            "DELETE FROM l3.metric_value_fact WHERE run_version_id = %s AND as_of_date = %s",
            (req.run_version, as_of_date),
        )
        deleted = cur.rowcount

        insert_sql = """
            INSERT INTO l3.metric_value_fact (
                run_version_id, as_of_date, metric_id, variant_id, aggregation_level,
                facility_id, counterparty_id, desk_id, portfolio_id, lob_id,
                "value", unit, display_format
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.executemany(insert_sql, all_rows)
        conn.commit()

        return JSONResponse({
            "ok": True,
            "inserted": len(all_rows),
            "deleted": deleted,
            "calc_count": calc_count,
            "error_count": len(errors),
            "run_version": req.run_version,
            "as_of_date": as_of_date,
            "errors": errors[:10],
        })
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _sanitize_floats(obj: Any) -> Any:
    """Replace NaN/Inf float values with None for JSON serialization."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _sanitize_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_floats(v) for v in obj]
    return obj


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
