"""Metric calculator registry — maps metric/catalogue IDs to calculator instances."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .calculators.base import BaseCalculator

_REGISTRY: dict[str, type[BaseCalculator]] = {}


def register(cls: type[BaseCalculator]) -> type[BaseCalculator]:
    """Class decorator to register a calculator."""
    _REGISTRY[cls.metric_id] = cls
    _REGISTRY[cls.catalogue_id] = cls
    for legacy_id in getattr(cls, "_legacy_ids", []):
        _REGISTRY[legacy_id] = cls
    return cls


def get_calculator(metric_or_catalogue_id: str) -> BaseCalculator | None:
    """Look up a calculator by metric ID (e.g. 'C003') or catalogue ID (e.g. 'DSCR')."""
    cls = _REGISTRY.get(metric_or_catalogue_id)
    if cls is None:
        return None
    return cls()


def list_calculators() -> list[dict[str, str]]:
    """Return all registered calculators."""
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for cls in _REGISTRY.values():
        if cls.metric_id not in seen:
            seen.add(cls.metric_id)
            result.append({
                "metric_id": cls.metric_id,
                "catalogue_id": cls.catalogue_id,
                "name": cls.name,
            })
    return result
