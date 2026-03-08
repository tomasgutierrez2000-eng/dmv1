"""Dual-mode data loader: PostgreSQL (if DATABASE_URL set) or sample JSON files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from .config import DATABASE_URL, SAMPLE_DATA_L1_PATH, SAMPLE_DATA_L2_PATH


class DataLoader:
    """Load L1/L2 tables from PostgreSQL or sample JSON files.

    Tries PostgreSQL first (if DATABASE_URL is set), falls back to sample JSON.
    Caches loaded data for the lifetime of the loader instance.
    """

    def __init__(self, *, force_json: bool = False):
        self._use_db = bool(DATABASE_URL) and not force_json
        self._cache: dict[str, pd.DataFrame] = {}
        self._json_l1: dict[str, Any] | None = None
        self._json_l2: dict[str, Any] | None = None
        self._conn = None

    # ── Public API ──────────────────────────────────────────────

    def load_table(self, layer: str, table: str) -> pd.DataFrame:
        """Load a single table. Layer is 'L1' or 'L2', table is the bare name."""
        cache_key = f"{layer}.{table}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        if self._use_db:
            df = self._load_from_db(layer, table)
        else:
            df = self._load_from_json(layer, table)

        self._cache[cache_key] = df
        return df

    def available_tables(self) -> list[str]:
        """Return all table keys available in the data source."""
        if self._use_db:
            return self._list_db_tables()
        return self._list_json_tables()

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None

    # ── PostgreSQL ──────────────────────────────────────────────

    def _get_conn(self):
        if self._conn is None:
            import psycopg2
            self._conn = psycopg2.connect(DATABASE_URL)
        return self._conn

    def _load_from_db(self, layer: str, table: str) -> pd.DataFrame:
        schema = layer.lower()  # l1 or l2
        conn = self._get_conn()
        query = f"SELECT * FROM {schema}.{table}"
        return pd.read_sql(query, conn)

    def _list_db_tables(self) -> list[str]:
        conn = self._get_conn()
        query = """
            SELECT table_schema || '.' || table_name
            FROM information_schema.tables
            WHERE table_schema IN ('l1', 'l2')
            ORDER BY table_schema, table_name
        """
        df = pd.read_sql(query, conn)
        return df.iloc[:, 0].tolist()

    # ── Sample JSON ─────────────────────────────────────────────

    def _ensure_json_loaded(self, layer: str) -> dict[str, Any]:
        if layer == "L1":
            if self._json_l1 is None:
                self._json_l1 = _read_json(SAMPLE_DATA_L1_PATH)
            return self._json_l1
        else:
            if self._json_l2 is None:
                self._json_l2 = _read_json(SAMPLE_DATA_L2_PATH)
            return self._json_l2

    def _load_from_json(self, layer: str, table: str) -> pd.DataFrame:
        data = self._ensure_json_loaded(layer)
        key = f"{layer}.{table}"
        entry = data.get(key)
        if not entry or "columns" not in entry or "rows" not in entry:
            raise KeyError(f"Table not found in sample data: {key}")
        return pd.DataFrame(entry["rows"], columns=entry["columns"])

    def _list_json_tables(self) -> list[str]:
        tables: list[str] = []
        for layer, path in [("L1", SAMPLE_DATA_L1_PATH), ("L2", SAMPLE_DATA_L2_PATH)]:
            if path.exists():
                data = self._ensure_json_loaded(layer)
                tables.extend(data.keys())
        return sorted(tables)


def _read_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(
            f"Sample data not found: {path}\n"
            f"Run: npx tsx scripts/{path.parent.name}/generate.ts"
        )
    with open(path) as f:
        return json.load(f)
