"""Tests for YAML emission — ScenarioConfig → YAML file matching TS parseScenarioYaml format."""
import pytest
import sys
import tempfile
import yaml
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from curator_factory.models.scenario import (
    ScenarioConfig, CounterpartyProfile, ScenarioType,
    RatingTier, StoryArc, SizeProfile, TimelineConfig,
)
from curator_factory.utils.yaml_emitter import emit_yaml, _next_scenario_id, _slugify


def _make_config(**overrides) -> ScenarioConfig:
    defaults = dict(
        scenario_id="S099",
        name="Test Oil Crash",
        type=ScenarioType.DETERIORATION_TREND,
        narrative="Oil prices crash, energy sector deteriorates",
        counterparties=[
            CounterpartyProfile(
                legal_name="Test Energy Corp",
                country="US",
                industry_id=4,
                rating_tier=RatingTier.HY_HIGH,
                story_arc=StoryArc.DETERIORATING,
                size=SizeProfile.MID,
            )
        ],
    )
    defaults.update(overrides)
    return ScenarioConfig(**defaults)


def test_emit_yaml_creates_file():
    config = _make_config()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = emit_yaml(config, Path(tmpdir))
        assert path.exists()
        assert path.suffix == ".yaml"
        assert "S099" in path.name


def test_emit_yaml_content_parseable():
    config = _make_config()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = emit_yaml(config, Path(tmpdir))
        content = yaml.safe_load(path.read_text())
        assert content["scenario_id"] == "S099"
        assert content["name"] == "Test Oil Crash"
        assert content["type"] == "DETERIORATION_TREND"
        assert len(content["counterparties"]) == 1
        assert content["counterparties"][0]["legal_name"] == "Test Energy Corp"


def test_emit_yaml_header_comment():
    config = _make_config()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = emit_yaml(config, Path(tmpdir))
        raw = path.read_text()
        assert raw.startswith("# S099: Test Oil Crash")
        assert "Oil prices crash" in raw


def test_emit_yaml_excludes_none():
    config = _make_config()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = emit_yaml(config, Path(tmpdir))
        content = yaml.safe_load(path.read_text())
        # Optional fields that are None should not appear
        assert "stress_test" not in content
        assert "limit" not in content


def test_next_scenario_id_empty_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        sid = _next_scenario_id(Path(tmpdir))
        assert sid == "S001"


def test_next_scenario_id_with_existing():
    with tempfile.TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "S019-test.yaml").write_text("test: true")
        (Path(tmpdir) / "S020-test.yaml").write_text("test: true")
        sid = _next_scenario_id(Path(tmpdir))
        assert sid == "S021"


def test_slugify():
    assert _slugify("Oil & Gas Sector Downgrade") == "oil-and-gas-sector-downgrade"
    assert _slugify("Test/Slash") == "test-slash"


def test_emit_yaml_roundtrip():
    """Config → YAML → parse back → verify key fields match."""
    config = _make_config()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = emit_yaml(config, Path(tmpdir))
        parsed = yaml.safe_load(path.read_text())
        assert parsed["scenario_id"] == config.scenario_id
        assert parsed["type"] == config.type.value
        assert parsed["counterparties"][0]["country"] == "US"
        assert parsed["counterparties"][0]["industry_id"] == 4
        assert parsed["counterparties"][0]["rating_tier"] == "HY_HIGH"
