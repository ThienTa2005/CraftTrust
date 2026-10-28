from __future__ import annotations

import argparse
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

ENGINE_DIR = Path(__file__).resolve().parent.parent
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

from software_render import CARDINAL_ANGLES, render_scene_triangles_cpu


def _card(image: Image.Image, label: str, size: int) -> Image.Image:
    header_height = 52
    canvas = Image.new("RGB", (size, size + header_height), (24, 27, 32))
    body = Image.new("RGB", (size, size), (238, 238, 235))
    contained = ImageOps.contain(image.convert("RGB"), (size, size), Image.Resampling.LANCZOS)
    body.paste(contained, ((size - contained.width) // 2, (size - contained.height) // 2))
    canvas.paste(body, (0, header_height))
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 17), label, fill=(245, 245, 245), font=ImageFont.load_default())
    return canvas


def build_comparison(
    front_photo: Path,
    back_photo: Path,
    old_master: Path,
    new_master: Path,
    fixed_web: Path,
    output_dir: Path,
    size: int = 640,
) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    photos = {
        "front": Image.open(front_photo),
        "back": Image.open(back_photo),
    }
    model_paths = {
        "Old Multi-View": old_master,
        "New Master": new_master,
        "Fixed Web 4K Q95": fixed_web,
    }
    result: dict[str, str] = {}
    grounded_rows: list[Image.Image] = []

    for view_name in ("front", "back"):
        angle = CARDINAL_ANGLES[view_name]
        reference_render, frame_bounds = render_scene_triangles_cpu(
            new_master,
            angle_degrees=angle,
            resolution=size,
        )
        render_cards: list[Image.Image] = [_card(photos[view_name], f"Original photo - {view_name}", size)]
        for label, path in model_paths.items():
            if path == new_master:
                render = reference_render
            else:
                render, _ = render_scene_triangles_cpu(
                    path,
                    angle_degrees=angle,
                    resolution=size,
                    frame_bounds=frame_bounds,
                )
            render_path = output_dir / f"{label.lower().replace(' ', '_')}_{view_name}.png"
            render.save(render_path)
            render_cards.append(_card(render, f"{label} - {view_name}", size))
        row = Image.new("RGB", (sum(card.width for card in render_cards), render_cards[0].height))
        x_offset = 0
        for card in render_cards:
            row.paste(card, (x_offset, 0))
            x_offset += card.width
        row_path = output_dir / f"comparison_{view_name}.png"
        row.save(row_path)
        result[view_name] = str(row_path)
        grounded_rows.append(row)

    grounded_grid = Image.new(
        "RGB",
        (grounded_rows[0].width, sum(row.height for row in grounded_rows)),
        (24, 27, 32),
    )
    y_offset = 0
    for row in grounded_rows:
        grounded_grid.paste(row, (0, y_offset))
        y_offset += row.height
    grounded_path = output_dir / "comparison_original_old_new_fixed.png"
    grounded_grid.save(grounded_path)
    result["groundedGrid"] = str(grounded_path)

    side_rows: list[Image.Image] = []
    for view_name in ("right", "left"):
        angle = CARDINAL_ANGLES[view_name]
        _, frame_bounds = render_scene_triangles_cpu(new_master, angle_degrees=angle, resolution=size)
        cards: list[Image.Image] = []
        for label, path in model_paths.items():
            render, _ = render_scene_triangles_cpu(
                path,
                angle_degrees=angle,
                resolution=size,
                frame_bounds=frame_bounds,
            )
            cards.append(_card(render, f"{label} - {view_name} (no source photo)", size))
        row = Image.new("RGB", (sum(card.width for card in cards), cards[0].height))
        x_offset = 0
        for card in cards:
            row.paste(card, (x_offset, 0))
            x_offset += card.width
        side_rows.append(row)
    side_grid = Image.new(
        "RGB",
        (side_rows[0].width, sum(row.height for row in side_rows)),
        (24, 27, 32),
    )
    y_offset = 0
    for row in side_rows:
        side_grid.paste(row, (0, y_offset))
        y_offset += row.height
    side_path = output_dir / "comparison_side_views_no_source_photo.png"
    side_grid.save(side_path)
    result["sideGrid"] = str(side_path)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic CPU comparison renders.")
    parser.add_argument("--front-photo", type=Path, required=True)
    parser.add_argument("--back-photo", type=Path, required=True)
    parser.add_argument("--old-master", type=Path, required=True)
    parser.add_argument("--new-master", type=Path, required=True)
    parser.add_argument("--fixed-web", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--size", type=int, default=640)
    args = parser.parse_args()
    for name, path in vars(args).items():
        if name not in {"output_dir", "size"} and not path.is_file():
            parser.error(f"{name} does not exist: {path}")
    results = build_comparison(
        args.front_photo,
        args.back_photo,
        args.old_master,
        args.new_master,
        args.fixed_web,
        args.output_dir,
        args.size,
    )
    for name, path in results.items():
        print(f"{name}: {path}")


if __name__ == "__main__":
    main()
