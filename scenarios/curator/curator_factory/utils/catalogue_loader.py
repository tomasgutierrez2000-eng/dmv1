"""Load and query the metric catalogue (data/metric-library/catalogue.json)."""
import json
from pathlib import Path
from typing import Optional


# Default catalogue path relative to repo root
_DEFAULT_CATALOGUE = Path(__file__).resolve().parents[4] / "data" / "metric-library" / "catalogue.json"


class CatalogueLoader:
    def __init__(self, catalogue_path: Optional[Path] = None):
        path = catalogue_path or _DEFAULT_CATALOGUE
        if not path.exists():
            raise FileNotFoundError(f"Catalogue not found at {path}")
        raw = json.loads(path.read_text())
        # Handle both list format and dict-with-items format
        self.items: list[dict] = raw if isinstance(raw, list) else raw.get("items", [])
        self._by_id: dict[str, dict] = {item["item_id"]: item for item in self.items if "item_id" in item}
        self._by_name: dict[str, dict] = {}
        for item in self.items:
            name = item.get("item_name", "").lower()
            if name:
                self._by_name[name] = item
            abbr = item.get("abbreviation", "").lower()
            if abbr:
                self._by_name[abbr] = item

    def find_metric(self, query: str) -> Optional[dict]:
        """Find a metric by exact ID (MET-029) or fuzzy name match."""
        if query in self._by_id:
            return self._by_id[query]
        query_lower = query.lower()
        # Exact name match
        if query_lower in self._by_name:
            return self._by_name[query_lower]
        # Substring match
        for name, item in self._by_name.items():
            if query_lower in name:
                return item
        return None

    def get_required_tables(self, metric_id: str) -> list[dict]:
        """Extract ingredient_fields for a metric (table + field pairs)."""
        item = self._by_id.get(metric_id)
        if not item:
            return []
        return item.get("ingredient_fields", [])

    def get_required_l2_tables(self, metric_id: str) -> list[str]:
        """Get unique L2 table names required by a metric."""
        fields = self.get_required_tables(metric_id)
        return list(set(f.get("table", "") for f in fields if f.get("table")))
