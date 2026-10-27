import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent
CARD_DIR = BASE_DIR / "artifacts_debug" / "cardinal_comparison"
OUT_PATH = CARD_DIR / "cardinal_comparison_grid.png"

models = [
    ("Master GLB (Original Pixal3D, 989k faces, 37.5MB)", "master"),
    ("Current Production Web GLB (Crushed to 200k, Pitted & Torn, 6.78MB)", "web_current_flawed"),
    ("Proposed Safe Web GLB (Preserve Border, 374k faces, Solid, 7.8MB)", "web_safe_optimized"),
]

angles = ["FRONT", "RIGHT", "BACK", "LEFT"]

tile_w, tile_h = 512, 512
header_h = 50
label_w = 40
margin = 20

total_w = tile_w * len(angles) + margin * (len(angles) + 1)
total_h = (tile_h + header_h) * len(models) + margin * (len(models) + 1)

grid = Image.new("RGB", (total_w, total_h), color=(245, 247, 250))
draw = ImageDraw.Draw(grid)

try:
    font_title = ImageFont.truetype("arial.ttf", 24)
    font_col = ImageFont.truetype("arial.ttf", 20)
except Exception:
    font_title = ImageFont.load_default()
    font_col = font_title

for row_idx, (model_label, model_key) in enumerate(models):
    row_top = margin + row_idx * (tile_h + header_h + margin)
    
    # Draw Row Header Box
    draw.rectangle([margin, row_top, total_w - margin, row_top + header_h - 10], fill=(30, 41, 59))
    draw.text((margin + 20, row_top + 10), model_label, fill=(255, 255, 255), font=font_title)
    
    for col_idx, ang in enumerate(angles):
        col_left = margin + col_idx * (tile_w + margin)
        img_top = row_top + header_h
        
        img_file = CARD_DIR / f"{model_key}_{ang}.png"
        if img_file.exists():
            im = Image.open(img_file).convert("RGBA")
            im = im.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
            
            # Paste on white box with subtle border
            box = Image.new("RGBA", (tile_w, tile_h), color=(255, 255, 255, 255))
            box.paste(im, (0, 0), im)
            grid.paste(box.convert("RGB"), (col_left, img_top))
            draw.rectangle([col_left, img_top, col_left + tile_w, img_top + tile_h], outline=(203, 213, 225), width=2)
            
            # Badge for angle
            draw.rectangle([col_left + 15, img_top + 15, col_left + 110, img_top + 45], fill=(15, 23, 42))
            draw.text((col_left + 25, img_top + 20), ang, fill=(255, 255, 255), font=font_col)

grid.save(OUT_PATH, quality=95)
print(f"Comparison grid saved to: {OUT_PATH}")

# Also copy to Artifact directory so user can view directly
artifact_dir = Path("C:/Users/Admin/.gemini/antigravity-ide/brain/b2cb7f54-02e7-4d44-850f-d5d3c46998f1")
if artifact_dir.exists():
    import shutil
    shutil.copyfile(OUT_PATH, artifact_dir / "cardinal_comparison_grid.png")
    print(f"Copied to artifact dir: {artifact_dir / 'cardinal_comparison_grid.png'}")
