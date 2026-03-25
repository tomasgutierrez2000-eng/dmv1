from pydantic import BaseModel, Field
from typing import Optional
from .scenario import StoryArc, RatingTier, PD_RANGES

class StoryArcProfile(BaseModel):
    """Defines how a story arc drives facility state evolution."""
    arc: StoryArc
    pd_direction: float  # >0 = increasing, <0 = decreasing, 0 = flat
    utilization_direction: float
    spread_direction: float
    expects_events: bool = False
    expects_rating_change: bool = False

STORY_ARC_PROFILES: dict[str, StoryArcProfile] = {
    "DETERIORATING": StoryArcProfile(
        arc=StoryArc.DETERIORATING,
        pd_direction=1.0, utilization_direction=0.5, spread_direction=1.0,
        expects_events=True, expects_rating_change=True
    ),
    "RECOVERING": StoryArcProfile(
        arc=StoryArc.RECOVERING,
        pd_direction=-1.0, utilization_direction=-0.5, spread_direction=-0.5,
        expects_events=False
    ),
    "STABLE_IG": StoryArcProfile(
        arc=StoryArc.STABLE_IG,
        pd_direction=0.0, utilization_direction=0.0, spread_direction=0.0
    ),
    "STEADY_HY": StoryArcProfile(
        arc=StoryArc.STEADY_HY,
        pd_direction=0.0, utilization_direction=0.0, spread_direction=0.0
    ),
    "GROWING": StoryArcProfile(
        arc=StoryArc.GROWING,
        pd_direction=0.0, utilization_direction=0.3, spread_direction=0.0
    ),
    "NEW_RELATIONSHIP": StoryArcProfile(
        arc=StoryArc.NEW_RELATIONSHIP,
        pd_direction=0.0, utilization_direction=0.3, spread_direction=0.0
    ),
    "STRESSED_SECTOR": StoryArcProfile(
        arc=StoryArc.STRESSED_SECTOR,
        pd_direction=0.8, utilization_direction=0.3, spread_direction=1.0,
        expects_events=True
    ),
}

def clamp_pd_to_tier(pd: float, tier: RatingTier) -> float:
    """Clamp a PD value to the valid range for its rating tier."""
    lo, hi = PD_RANGES.get(tier.value, (0.0001, 0.15))
    return max(lo, min(hi, pd))
