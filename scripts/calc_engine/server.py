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
