"""Narrative → YAML pipeline: English text → validated ScenarioConfig YAML."""
import json
import subprocess
from pathlib import Path
from typing import Optional

from bespokelabs import curator

from ..models.scenario import (
    ScenarioConfig, CounterpartyProfile, NarrativeAnalysis,
    ScenarioType, RatingTier, StoryArc, SizeProfile,
    PD_RANGES, VALID_COUNTRIES,
)
from ..models.story_arc import clamp_pd_to_tier, STORY_ARC_PROFILES
from ..domain_knowledge.gsib_constants import (
    COMMITMENT_RANGES, DSCR_THRESHOLDS, LTV_THRESHOLDS,
    INDUSTRY_MAP, COUNTRY_MAP,
)
from ..domain_knowledge.scenario_taxonomy import SCENARIO_PROMPTS
from ..utils.yaml_emitter import emit_yaml, _next_scenario_id
from ..utils.audit_bridge import CuratorAuditBridge


# Few-shot example loader
def _load_few_shot_examples(narratives_dir: Path, scenario_type: Optional[str] = None, max_examples: int = 3) -> list[str]:
    """Load existing YAML scenario files as few-shot examples."""
    yamls = sorted(narratives_dir.glob("*.yaml"))
    if not yamls:
        return []
    # If scenario_type provided, prefer matching types
    examples = []
    for yf in yamls:
        content = yf.read_text()
        if scenario_type and scenario_type in content:
            examples.append(content)
        if len(examples) >= max_examples:
            break
    # Fill remaining slots with any examples
    if len(examples) < max_examples:
        for yf in yamls:
            content = yf.read_text()
            if content not in examples:
                examples.append(content)
            if len(examples) >= max_examples:
                break
    return examples


def _build_analysis_prompt(narrative: str) -> str:
    """Build the system + user prompt for Block 1 (NarrativeAnalyzer)."""
    return f"""You are a GSIB credit risk analyst extracting structured information from a scenario description.

Extract the following from this narrative:
- scenario_type: one of {list(ScenarioType.__members__.keys())}
- industry_sector: the primary industry affected
- country_exposure: list of ISO 2-letter country codes involved
- counterparty_count: how many counterparties are described (1-20)
- total_exposure_usd: estimated total exposure in USD (if mentioned)
- key_risk_driver: the main risk factor driving this scenario
- expected_events: list of credit events that should occur
- target_metrics: list of metrics this scenario should exercise
- severity: LOW, MEDIUM, HIGH, or CRITICAL

NARRATIVE:
{narrative}"""


def _build_structurer_prompt(analysis: dict, few_shot_examples: list[str], scenario_id: str) -> str:
    """Build the prompt for Block 2 (ScenarioStructurer)."""
    domain_context = f"""GSIB Domain Knowledge:
- PD Ranges: IG_HIGH: 0.01-0.04%, IG_MID: 0.04-0.15%, IG_LOW: 0.15-0.40%, HY_HIGH: 0.40-2.0%, HY_MID: 2.0-5.0%, HY_LOW: 5.0-15.0%
- Commitment Ranges: LARGE: $500M-$5B, MID: $100M-$500M, SMALL: $20M-$100M
- Valid Countries: {sorted(VALID_COUNTRIES)}
- Industry IDs: 1=TMT, 2=Healthcare, 3=Financials, 4=Energy, 5=Industrials, 6=Consumer, 7=Retail, 8=Utilities, 9=Materials, 10=Real Estate
- Story Arcs: STABLE_IG, GROWING, STEADY_HY, DETERIORATING, RECOVERING, STRESSED_SECTOR, NEW_RELATIONSHIP
- Rating Tiers: IG_HIGH, IG_MID, IG_LOW, HY_HIGH, HY_MID, HY_LOW
- Size Profiles: LARGE, MID, SMALL
- DSCR: healthy>1.25, watch>1.0, critical<0.8
- LTV: healthy<65%, elevated<80%, critical>80%"""

    examples_text = ""
    if few_shot_examples:
        examples_text = "\n\nEXAMPLE YAML SCENARIOS (match this format exactly):\n"
        for i, ex in enumerate(few_shot_examples[:3], 1):
            examples_text += f"\n--- Example {i} ---\n{ex[:2000]}\n"

    return f"""You are a GSIB scenario designer. Generate a complete ScenarioConfig YAML from the structured analysis.

{domain_context}
{examples_text}

ANALYSIS:
{json.dumps(analysis, indent=2)}

Generate a ScenarioConfig with:
- scenario_id: "{scenario_id}"
- name: descriptive title
- type: matching ScenarioType enum
- narrative: one-line summary
- counterparties: list of CounterpartyProfile objects (legal_name, country, industry_id, rating_tier, story_arc, size)
- facilities: per_counterparty count
- timeline: as_of_dates (3 monthly dates)
- events: credit_events and risk_flags appropriate for the scenario
- l2_tables: which L2 snapshot tables should be generated

Return valid JSON matching the ScenarioConfig schema."""


def _apply_gsib_sanity_checks(config: ScenarioConfig) -> tuple[ScenarioConfig, list[str]]:
    """Block 3: Deterministic post-processor — clamp values to GSIB-realistic ranges."""
    fixes: list[str] = []

    for i, cp in enumerate(config.counterparties):
        # Clamp PD to tier range
        if cp.pd_annual is not None:
            pd_range = PD_RANGES.get(cp.rating_tier.value)
            if pd_range:
                lo, hi = pd_range
                if cp.pd_annual < lo:
                    config.counterparties[i].pd_annual = lo
                    fixes.append(f"Clamped {cp.legal_name} PD from {cp.pd_annual} to {lo} (min for {cp.rating_tier.value})")
                elif cp.pd_annual > hi:
                    config.counterparties[i].pd_annual = hi
                    fixes.append(f"Clamped {cp.legal_name} PD from {cp.pd_annual} to {hi} (max for {cp.rating_tier.value})")

        # Validate country
        if cp.country.upper() not in VALID_COUNTRIES:
            config.counterparties[i].country = "US"
            fixes.append(f"Fixed {cp.legal_name} country from {cp.country} to US (not in VALID_COUNTRIES)")

        # Validate industry_id
        if cp.industry_id < 1 or cp.industry_id > 10:
            config.counterparties[i].industry_id = 1
            fixes.append(f"Fixed {cp.legal_name} industry_id from {cp.industry_id} to 1 (out of range)")

        # Validate entity_type consistency
        if cp.entity_type_code:
            if cp.industry_id == 3 and cp.entity_type_code not in ("BANK", "FI"):
                config.counterparties[i].entity_type_code = "BANK"
                fixes.append(f"Fixed {cp.legal_name} entity_type to BANK (industry 3 = Financials)")
            elif cp.industry_id == 10 and cp.entity_type_code != "RE":
                config.counterparties[i].entity_type_code = "RE"
                fixes.append(f"Fixed {cp.legal_name} entity_type to RE (industry 10 = Real Estate)")

    # Validate timeline chronological order
    if config.timeline.as_of_dates:
        dates = config.timeline.as_of_dates
        for j in range(1, len(dates)):
            if dates[j] <= dates[j-1]:
                # Fix: generate 3 monthly dates ending at last date
                last = dates[-1] if dates[-1] > "2024-01-01" else "2025-01-31"
                config.timeline.as_of_dates = [
                    "2024-11-30", "2024-12-31", "2025-01-31"
                ]
                fixes.append("Fixed non-chronological timeline dates to default 3-month range")
                break

    return config, fixes


class NarrativeToYamlPipeline:
    """3-block pipeline: English narrative → validated ScenarioConfig YAML."""

    def __init__(
        self,
        model: str = "claude-opus-4-6",
        batch: bool = False,
        narratives_dir: Optional[Path] = None,
        output_dir: Optional[Path] = None,
        max_retries: int = 3,
    ):
        self.model = model
        self.batch = batch
        self.narratives_dir = narratives_dir or Path("scenarios/narratives")
        self.output_dir = output_dir or self.narratives_dir
        self.max_retries = max_retries
        self.audit = CuratorAuditBridge("narrative-to-yaml")

    def run(self, narratives: list[str], dry_run: bool = False) -> list[ScenarioConfig]:
        """Generate ScenarioConfig YAMLs from English narratives."""
        results: list[ScenarioConfig] = []

        for narrative in narratives:
            try:
                config = self._process_single(narrative)
                if config:
                    if not dry_run:
                        path = emit_yaml(config, self.output_dir)
                        self.audit.log_scenario_generated(config.scenario_id, "SUCCESS")
                    results.append(config)
            except Exception as e:
                self.audit.log_error("PIPELINE_ERROR", str(e))

        self.audit.finalize("completed", {"scenarios_generated": len(results)})
        return results

    def _process_single(self, narrative: str) -> Optional[ScenarioConfig]:
        """Process a single narrative through all 3 blocks."""
        # Block 1: Extract structure
        analyzer = curator.LLM(
            model_name=self.model,
            response_format=NarrativeAnalysis,
        )
        try:
            analysis_result = analyzer([{"narrative": narrative}],
                                        prompt_func=lambda row: _build_analysis_prompt(row["narrative"]))
            if not analysis_result:
                self.audit.log_error("BLOCK1_EMPTY", "NarrativeAnalyzer returned empty result")
                return None
            analysis = analysis_result[0]
        except Exception as e:
            self.audit.log_error("BLOCK1_FAILURE", str(e))
            return None

        # Load few-shot examples
        few_shot = _load_few_shot_examples(
            self.narratives_dir,
            scenario_type=analysis.scenario_type.value if hasattr(analysis, 'scenario_type') else None,
        )

        # Block 2: Build full ScenarioConfig (with retries)
        scenario_id = _next_scenario_id(self.output_dir)
        analysis_dict = analysis.model_dump() if hasattr(analysis, 'model_dump') else dict(analysis)

        last_error = None
        for attempt in range(self.max_retries):
            structurer = curator.LLM(
                model_name=self.model,
                response_format=ScenarioConfig,
            )
            try:
                prompt = _build_structurer_prompt(analysis_dict, few_shot, scenario_id)
                if last_error and attempt > 0:
                    prompt += f"\n\nPREVIOUS ATTEMPT FAILED WITH ERROR:\n{last_error}\nPlease fix the issue and try again."
                if attempt == 2:
                    prompt += "\n\nSIMPLIFY: Use only 3 counterparties, minimal events, default timeline."

                config_result = structurer([{"prompt": prompt}],
                                            prompt_func=lambda row: row["prompt"])
                if config_result:
                    config = config_result[0]
                    # Block 3: Deterministic sanity check
                    config, fixes = _apply_gsib_sanity_checks(config)
                    if fixes:
                        for fix in fixes:
                            self.audit.log_error("SANITY_FIX", fix)
                    return config
            except Exception as e:
                last_error = str(e)
                self.audit.log_error(f"BLOCK2_ATTEMPT_{attempt+1}", str(e))

        self.audit.log_error("BLOCK2_ALL_RETRIES_FAILED", f"After {self.max_retries} attempts: {last_error}")
        return None
