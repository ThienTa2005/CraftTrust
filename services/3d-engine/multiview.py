from __future__ import annotations

import json
import math
from pathlib import Path

CARDINAL = {"FRONT": 0.0, "RIGHT": 90.0, "BACK": 180.0, "LEFT": 270.0}


def camera_to_world(azimuth_degrees: float, distance: float = 3.1192) -> list[list[float]]:
    angle = math.radians(azimuth_degrees)
    c, s = math.cos(angle), math.sin(angle)
    front = (
        (1.0, 0.0, 0.0, 0.0),
        (0.0, 0.0, -1.0, -distance),
        (0.0, 1.0, 0.0, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    )
    result = []
    for row in range(4):
        if row == 0:
            result.append([c * front[0][i] - s * front[1][i] for i in range(4)])
        elif row == 1:
            result.append([s * front[0][i] + c * front[1][i] for i in range(4)])
        else:
            result.append(list(front[row]))
    return [[0.0 if abs(value) < 1e-12 else value for value in row] for row in result]


def write_transforms(records: list[dict], directory: Path) -> Path:
    if not 2 <= len(records) <= 4:
        raise ValueError("Pixal3D multi-view requires 2-4 calibrated views.")
    directions = [str(record.get("direction", "")) for record in records]
    if "FRONT" not in directions or len(set(directions)) != len(directions):
        raise ValueError("Multi-view requires one FRONT view and unique directions.")
    if any(direction not in CARDINAL for direction in directions):
        raise ValueError("Only the calibrated FRONT/RIGHT/BACK/LEFT preset is accepted.")
    ordered = sorted(records, key=lambda item: (item["direction"] != "FRONT", item["ordinal"]))
    frames = []
    for index, record in enumerate(ordered):
        direction = record["direction"]
        declared = float(record["azimuth"])
        if abs(declared - CARDINAL[direction]) > 0.01:
            raise ValueError(f"{direction} azimuth does not match the calibrated preset.")
        target = directory / f"view{index:02d}_azim{int(declared):03d}{record['path'].suffix.lower()}"
        record["path"].replace(target)
        record["path"] = target
        frames.append({
            "file_path": target.name,
            "name": f"azim{int(declared):03d}",
            "camera_angle_x": math.radians(20.0),
            "transform_matrix": camera_to_world(declared),
        })
    output = directory / "transforms.json"
    output.write_text(json.dumps({
        "camera_angle_x": math.radians(20.0),
        "mesh_scale": 1.0,
        "cameraPreset": "crafttrust-cardinal-orbit-v1",
        "poseConfidence": "declared-preset-not-measured",
        "frames": frames,
    }, indent=2), encoding="utf-8")
    return output
