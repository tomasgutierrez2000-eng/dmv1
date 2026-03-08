"""Configuration: DB connection + sample data paths."""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

DATABASE_URL = os.environ.get("DATABASE_URL")

SAMPLE_DATA_L1_PATH = Path(
    os.environ.get("SAMPLE_DATA_L1_PATH")
    or PROJECT_ROOT / "scripts" / "l1" / "output" / "sample-data.json"
)
SAMPLE_DATA_L2_PATH = Path(
    os.environ.get("SAMPLE_DATA_L2_PATH")
    or PROJECT_ROOT / "scripts" / "l2" / "output" / "sample-data.json"
)

CATALOGUE_PATH = Path(
    os.environ.get("CATALOGUE_PATH")
    or PROJECT_ROOT / "data" / "metric-library" / "catalogue.json"
)

METRICS_YAML_DIR = Path(
    os.environ.get("METRICS_YAML_DIR")
    or Path(__file__).resolve().parent / "metrics"
)

DEFAULT_AS_OF_DATE = os.environ.get("DEFAULT_AS_OF_DATE", "2025-01-31")
