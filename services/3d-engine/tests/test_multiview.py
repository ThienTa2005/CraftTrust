from __future__ import annotations

import json
import sys
from pathlib import Path
import pytest

ENGINE_DIR = Path(__file__).resolve().parent.parent
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

from multiview import (
    auto_assign_cardinal_roles,
    compute_view_coverage_advisory,
    resolve_generation_mode,
    write_transforms,
)


def test_auto_assign_cardinal_roles():
    assert auto_assign_cardinal_roles(1) == ["FRONT"]
    assert auto_assign_cardinal_roles(2) == ["FRONT", "BACK"]
    assert auto_assign_cardinal_roles(3) == ["FRONT", "BACK", "LEFT"]
    assert auto_assign_cardinal_roles(4) == ["FRONT", "BACK", "LEFT", "RIGHT"]
    with pytest.raises(ValueError):
        auto_assign_cardinal_roles(0)
    with pytest.raises(ValueError):
        auto_assign_cardinal_roles(5)


def test_resolve_generation_mode():
    assert resolve_generation_mode([{"direction": "FRONT"}]) == "single"
    assert resolve_generation_mode([{"direction": "FRONT"}, {"direction": "BACK"}]) == "two_view"
    assert resolve_generation_mode([
        {"direction": "FRONT"}, {"direction": "BACK"}, {"direction": "LEFT"}
    ]) == "multiview"
    assert resolve_generation_mode([
        {"direction": "FRONT"}, {"direction": "RIGHT"}, {"direction": "BACK"}, {"direction": "LEFT"}
    ]) == "multiview"


def test_compute_view_coverage_advisory_single():
    records = [{"direction": "FRONT"}]
    adv = compute_view_coverage_advisory(records)
    assert adv["mode"] == "single"
    assert adv["front_supported"] is True
    assert adv["back_supported"] is False
    assert adv["speculative_regions_percent"] == 75.0
    assert adv["confidence_score"] == 0.25


def test_compute_view_coverage_advisory_two_view():
    records = [
        {"direction": "FRONT", "azimuth": 0.0},
        {"direction": "BACK", "azimuth": 180.0},
    ]
    adv = compute_view_coverage_advisory(records)
    assert adv["mode"] == "two_view"
    assert adv["front_supported"] is True
    assert adv["back_supported"] is True
    assert adv["left_supported"] is False
    assert adv["supported_views"] == ["FRONT", "BACK"]
    assert adv["cardinal_coverage_ratio"] == 0.50
    assert adv["confidence_score"] == 0.50
    assert "họa tiết lưng" in adv["engine_actual_strategy"]
    assert "coverage_limitations" in adv
    assert adv["pose_estimation_type"] == "approximate-cardinal-assumption"


def test_compute_view_coverage_advisory_four_view():
    records = [
        {"direction": "FRONT", "azimuth": 0.0},
        {"direction": "RIGHT", "azimuth": 90.0},
        {"direction": "BACK", "azimuth": 180.0},
        {"direction": "LEFT", "azimuth": 270.0},
    ]
    adv = compute_view_coverage_advisory(records)
    assert adv["mode"] == "multiview"
    assert adv["front_supported"] is True
    assert adv["back_supported"] is True
    assert adv["left_supported"] is True
    assert adv["right_supported"] is True
    assert set(adv["supported_views"]) == {"FRONT", "BACK", "LEFT", "RIGHT"}
    assert adv["cardinal_coverage_ratio"] == 1.0
    assert "không triệt tiêu hoàn toàn vùng suy đoán" in adv["coverage_limitations"]


def test_write_transforms_two_and_four_views(tmp_path: Path):
    d2 = tmp_path / "two_views"
    d2.mkdir()
    f1 = d2 / "front.png"
    f1.write_bytes(b"dummy")
    f2 = d2 / "back.png"
    f2.write_bytes(b"dummy")

    records2 = [
        {"path": f1, "direction": "FRONT", "azimuth": 0.0, "ordinal": 0},
        {"path": f2, "direction": "BACK", "azimuth": 180.0, "ordinal": 1},
    ]
    t2 = write_transforms(records2, d2)
    assert t2.is_file()
    data2 = json.loads(t2.read_text(encoding="utf-8"))
    assert len(data2["frames"]) == 2
    assert data2["frames"][0]["direction"] == "FRONT"
    assert data2["frames"][1]["direction"] == "BACK"
    assert data2["viewCoverage"]["mode"] == "two_view"
    assert data2["viewCoverage"]["back_supported"] is True
