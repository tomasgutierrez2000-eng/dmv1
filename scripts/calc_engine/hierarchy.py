"""Build desk/portfolio/LOB lookup from enterprise_business_taxonomy."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class HierarchyNode:
    segment_id: int
    segment_name: str
    tree_level: str  # "L3" (desk), "L2" (portfolio), "L1" (LOB)
    parent_segment_id: int | None


@dataclass
class HierarchyInfo:
    desk_name: str
    desk_segment_id: int | None
    portfolio_name: str
    portfolio_segment_id: int | None
    lob_name: str
    lob_segment_id: int | None


UNKNOWN = "Unknown"


def build_hierarchy_lookup(
    ebt: pd.DataFrame,
) -> dict[int, HierarchyInfo]:
    """Build a map from lob_segment_id → HierarchyInfo.

    The enterprise_business_taxonomy table has a self-referential tree:
      L3 (desk) → L2 (portfolio) → L1 (business segment)
    via parent_segment_id.

    facility_master.lob_segment_id points to an L3 leaf node.
    We walk up to resolve portfolio and LOB names.
    """
    # Determine column names (may vary between data sources)
    id_col = "managed_segment_id"
    name_col = "segment_name" if "segment_name" in ebt.columns else "description"
    parent_col = "parent_segment_id" if "parent_segment_id" in ebt.columns else "parent"
    level_col = "tree_level" if "tree_level" in ebt.columns else "level"

    # Build node map: segment_id → (name, parent_id, level)
    nodes: dict[int, HierarchyNode] = {}
    for _, row in ebt.iterrows():
        sid = _to_int(row.get(id_col))
        if sid is None:
            continue
        parent = _to_int(row.get(parent_col))
        nodes[sid] = HierarchyNode(
            segment_id=sid,
            segment_name=str(row.get(name_col, UNKNOWN)),
            tree_level=str(row.get(level_col, "")),
            parent_segment_id=parent,
        )

    # For each node, walk up to resolve desk/portfolio/lob
    lookup: dict[int, HierarchyInfo] = {}
    for sid, node in nodes.items():
        desk = portfolio = lob = UNKNOWN
        desk_id = portfolio_id = lob_id = None

        # Walk up the chain, assigning names by tree_level
        current: HierarchyNode | None = node
        visited: set[int] = set()
        while current and current.segment_id not in visited:
            visited.add(current.segment_id)
            lvl = current.tree_level
            if lvl in ("L3", "3"):
                desk = current.segment_name
                desk_id = current.segment_id
            elif lvl in ("L2", "2"):
                portfolio = current.segment_name
                portfolio_id = current.segment_id
            elif lvl in ("L1", "1"):
                lob = current.segment_name
                lob_id = current.segment_id
            # Walk up
            if current.parent_segment_id and current.parent_segment_id in nodes:
                current = nodes[current.parent_segment_id]
            else:
                current = None

        lookup[sid] = HierarchyInfo(
            desk_name=desk,
            desk_segment_id=desk_id,
            portfolio_name=portfolio,
            portfolio_segment_id=portfolio_id,
            lob_name=lob,
            lob_segment_id=lob_id,
        )

    return lookup


def _to_int(val) -> int | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None
