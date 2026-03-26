"""Load data dictionary for field/table validation."""
import json
from pathlib import Path
from typing import Optional

_DEFAULT_DD = Path(__file__).resolve().parents[4] / "facility-summary-mvp" / "output" / "data-dictionary" / "data-dictionary.json"


class DataDictionaryLoader:
    def __init__(self, dd_path: Optional[Path] = None):
        path = dd_path or _DEFAULT_DD
        if not path.exists():
            raise FileNotFoundError(f"Data dictionary not found at {path}")
        self.dd = json.loads(path.read_text())
        self._l2_tables: set[str] = set()
        for table in self.dd.get("l2", []):
            name = table.get("table_name", "")
            if name:
                self._l2_tables.add(name)

    @property
    def l2_table_names(self) -> set[str]:
        return self._l2_tables

    def table_exists(self, schema: str, table_name: str) -> bool:
        key = schema.lower()
        for table in self.dd.get(key, []):
            if table.get("table_name") == table_name:
                return True
        return False

    def get_fields(self, schema: str, table_name: str) -> list[str]:
        key = schema.lower()
        for table in self.dd.get(key, []):
            if table.get("table_name") == table_name:
                return [f.get("field_name", "") for f in table.get("fields", [])]
        return []
