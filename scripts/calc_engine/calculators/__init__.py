"""Calculator implementations — import all to auto-register."""

from . import (  # noqa: F401
    committed_exposure,
    dscr,
    interest_expense,
    interest_income,
    ltv,
    outstanding_exposure,
    undrawn_exposure,
)
from . import generic  # noqa: F401  — auto-registers all remaining YAML metrics
