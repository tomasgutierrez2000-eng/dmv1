"""Emit ScenarioConfig Pydantic models as YAML files matching TS parseScenarioYaml() format."""
import textwrap
from pathlib import Path
from typing import Optional
import yaml

from ..models.scenario import ScenarioConfig


def _next_scenario_id(output_dir: Path) -> str:
    """Scan existing YAML files and allocate the next sequential scenario ID."""
    existing_ids: set[int] = set()
    for f in output_dir.glob("*.yaml"):
        name = f.stem
        # Extract numeric ID from filenames like "S019-oil-gas-sector-downgrade"
        if name.startswith("S") and "-" in name:
            try:
                num = int(name.split("-")[0][1:])
                existing_ids.add(num)
            except ValueError:
                continue
    next_num = max(existing_ids, default=0) + 1
    return f"S{next_num:03d}"


def _slugify(name: str) -> str:
    """Convert a scenario name to a filename-safe slug."""
    return name.lower().replace(" ", "-").replace("&", "and").replace("/", "-")[:50]


def emit_yaml(
    config: ScenarioConfig,
    output_dir: Path,
    scenario_id: Optional[str] = None,
) -> Path:
    """Write a ScenarioConfig to a YAML file matching TS parseScenarioYaml() format.

    Returns the path to the written file.
    """
    if scenario_id:
        config.scenario_id = scenario_id
    elif not config.scenario_id or config.scenario_id == "AUTO":
        config.scenario_id = _next_scenario_id(output_dir)

    filename = f"{config.scenario_id}-{_slugify(config.name)}.yaml"
    filepath = output_dir / filename

    # Build header comment from narrative
    header_lines = [f"# {config.scenario_id}: {config.name}"]
    header_lines.append("#")
    if config.narrative:
        for line in textwrap.wrap(config.narrative, 70):
            header_lines.append(f"# {line}")
    header = "\n".join(header_lines) + "\n"

    # Serialize to dict, excluding None values. mode="json" converts enums to strings.
    data = config.model_dump(exclude_none=True, by_alias=True, mode="json")

    # YAML formatting to match existing scenario files
    yaml_str = yaml.dump(
        data,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
        width=120,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    filepath.write_text(header + "\n" + yaml_str)
    return filepath
