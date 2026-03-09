"""Calculator implementations — import all to auto-register."""

from . import dscr, interest_expense, ltv, undrawn_exposure  # noqa: F401
from . import generic  # noqa: F401  — auto-registers all remaining YAML metrics
