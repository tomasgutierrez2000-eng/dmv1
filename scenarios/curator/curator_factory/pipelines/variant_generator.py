"""Variant generation: base scenario + modification prompt → N variants."""
import json
import yaml
from pathlib import Path
from typing import Optional

from bespokelabs import curator

from ..models.scenario import ScenarioConfig
from ..utils.yaml_emitter import emit_yaml
from ..utils.audit_bridge import CuratorAuditBridge


class VariantGeneratorPipeline:
    """Generate N variants of a base scenario with a modification prompt."""

    def __init__(self, model: str = "claude-opus-4-6"):
        self.model = model
        self.audit = CuratorAuditBridge("variant-generator")

    def run(
        self,
        base_yaml_path: Path,
        modification_prompt: str,
        count: int = 5,
        output_dir: Optional[Path] = None,
        dry_run: bool = False,
    ) -> list[ScenarioConfig]:
        """Generate N variants from a base scenario YAML."""
        base_config = yaml.safe_load(base_yaml_path.read_text())
        out_dir = output_dir or base_yaml_path.parent

        generator = curator.LLM(
            model_name=self.model,
            response_format=ScenarioConfig,
            batch=True,
        )

        inputs = [
            {
                "base": json.dumps(base_config, default=str),
                "mod": modification_prompt,
                "idx": i,
            }
            for i in range(count)
        ]

        try:
            results = generator(
                inputs,
                prompt_func=lambda row: self._variant_prompt(row["base"], row["mod"], row["idx"]),
            )
        except Exception as e:
            self.audit.log_error("VARIANT_GEN_FAILURE", str(e))
            return []

        # Diversity filter
        variants = self._ensure_diversity(results)

        if not dry_run:
            for v in variants:
                emit_yaml(v, out_dir)

        self.audit.finalize("completed", {
            "requested": count, "generated": len(results), "kept_after_diversity": len(variants)
        })
        return variants

    def _variant_prompt(self, base_json: str, modification: str, variant_index: int) -> str:
        return f"""You are generating variant #{variant_index + 1} of a GSIB banking scenario.

BASE SCENARIO:
{base_json[:3000]}

MODIFICATION:
{modification}

Create a new ScenarioConfig that applies the modification while maintaining:
- Valid GSIB domain values (country codes, industry IDs 1-10, rating tiers)
- Realistic PD ranges per rating tier
- Chronological timeline dates
- Coherent story arcs matching counterparty profiles

Make variant #{variant_index + 1} meaningfully different from the base — change counterparty names, countries, industries, or severity levels. Return valid JSON."""

    def _ensure_diversity(self, variants: list[ScenarioConfig]) -> list[ScenarioConfig]:
        """Reject variants too similar to each other (Jaccard > 0.85)."""
        kept: list[ScenarioConfig] = []
        for v in variants:
            if not any(self._similarity(v, k) > 0.85 for k in kept):
                kept.append(v)
        return kept

    def _similarity(self, a: ScenarioConfig, b: ScenarioConfig) -> float:
        """Set-Jaccard on counterparty attributes."""
        a_attrs = {(cp.country, cp.industry_id, cp.rating_tier.value)
                   for cp in a.counterparties}
        b_attrs = {(cp.country, cp.industry_id, cp.rating_tier.value)
                   for cp in b.counterparties}
        if not a_attrs and not b_attrs:
            return 1.0
        union = a_attrs | b_attrs
        return len(a_attrs & b_attrs) / len(union) if union else 1.0
