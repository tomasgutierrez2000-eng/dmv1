"""Metric-driven scenario generation: metric ID + desired behavior → YAML."""
from pathlib import Path
from typing import Optional

from bespokelabs import curator

from ..models.scenario import ScenarioConfig
from ..models.quality_report import MetricRequirement
from ..utils.catalogue_loader import CatalogueLoader
from ..utils.audit_bridge import CuratorAuditBridge
from .narrative_to_yaml import NarrativeToYamlPipeline


class MetricScenarioGenPipeline:
    """Generate a scenario that exercises a specific metric with desired behavior."""

    def __init__(self, model: str = "claude-opus-4-6", catalogue_path: Optional[Path] = None):
        self.model = model
        self.catalogue = CatalogueLoader(catalogue_path)
        self.narrative_pipeline = NarrativeToYamlPipeline(model=model)
        self.audit = CuratorAuditBridge("metric-scenario-gen")

    def run(self, metric_query: str, desired_behavior: str = "breach", dry_run: bool = False) -> Optional[ScenarioConfig]:
        """Generate a scenario targeting a specific metric behavior."""
        metric = self.catalogue.find_metric(metric_query)
        if not metric:
            self.audit.log_error("METRIC_NOT_FOUND", f"No metric matching '{metric_query}'")
            return None

        req = MetricRequirement(
            metric_id=metric.get("item_id", ""),
            metric_name=metric.get("item_name", ""),
            ingredient_fields=metric.get("ingredient_fields", []),
            required_l2_tables=self.catalogue.get_required_l2_tables(metric.get("item_id", "")),
            desired_behavior=desired_behavior,
        )

        # Generate a narrative that exercises this metric
        narrative = self._generate_narrative(req)
        if not narrative:
            return None

        # Feed into standard pipeline
        configs = self.narrative_pipeline.run([narrative], dry_run=dry_run)
        if not configs:
            return None

        config = configs[0]
        # Ensure required L2 tables are in the config
        if config.l2_tables is None:
            config.l2_tables = {}
        for table in req.required_l2_tables:
            if table not in config.l2_tables:
                config.l2_tables[table] = {"generate": True}

        self.audit.finalize("completed", {"metric_id": req.metric_id, "behavior": desired_behavior})
        return config

    def _generate_narrative(self, req: MetricRequirement) -> Optional[str]:
        """Use LLM to generate a narrative that would exercise the metric."""
        prompt = f"""Generate a one-paragraph English narrative describing a GSIB banking scenario that would exercise the metric "{req.metric_name}" (ID: {req.metric_id}) with desired behavior: {req.desired_behavior}.

The metric uses these source tables and fields:
{', '.join(f"{f.get('table', '')}.{f.get('field', '')}" for f in req.ingredient_fields[:10])}

For behavior "{req.desired_behavior}":
- "breach": values should cross a critical threshold
- "near-miss": values should approach but not cross the threshold
- "healthy": values should be well within acceptable ranges
- "deteriorating": values should show a clear worsening trend over 3 months

Write a realistic banking scenario with specific counterparties, amounts, and events that would naturally produce this metric behavior. Include industry, country, and rating details."""

        try:
            narrator = curator.LLM(model_name=self.model, response_format=str)
            result = narrator([{"prompt": prompt}], prompt_func=lambda row: row["prompt"])
            return result[0] if result else None
        except Exception as e:
            self.audit.log_error("NARRATIVE_GEN_FAILURE", str(e))
            return None
