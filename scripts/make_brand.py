"""Generate all brand assets for CraftTrust from official user-provided logo.
Outputs:
- apps/web/public/brand/source.png (original)
- apps/web/public/brand/full.png (full vertical lockup on transparent)
- apps/web/public/brand/horizontal.png (horizontal lockup for header/nav)
- apps/web/public/brand/icon-512.png (512x512 emblem icon)
- apps/web/public/brand/icon-192.png (192x192 emblem icon)
- apps/web/public/brand/icon-180.png (180x180 apple touch icon)
- apps/web/public/brand/icon-32.png (32x32 favicon icon)
- apps/web/public/favicon.ico
- apps/web/app/favicon.ico
"""

import os
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import numpy as np

USER_LOGO = r"C:\Users\Admin\.gemini\antigravity-ide\brain\ba558223-dbda-4fe3-bf42-f8dbd9b18118\.user_uploaded\media_1792873607243.jpg"
BRAND_DIR = Path("apps/web/public/brand")
BRAND_DIR.mkdir(parents=True, exist_ok=True)

def remove_white_bg(img: Image.Image, threshold: float = 248.0, ramp: float = 18.0) -> Image.Image:
    """Accurately keys out white background while maintaining anti-aliased edge fidelity."""
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.float32)
    # Brightness metric
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    min_channel = np.minimum(r, np.minimum(g, b))
    
    # Smooth alpha ramp
    alpha = np.clip((threshold - min_channel) * (255.0 / ramp), 0.0, 255.0).astype(np.uint8)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), mode="RGBA")

def main():
    src_img = Image.open(USER_LOGO)
    print(f"Loaded user logo: {src_img.size}")

    # 1. Save original source
    src_img.save(BRAND_DIR / "source.png")

    # 2. Transparent master
    trans = remove_white_bg(src_img)

    # Bounding box of content:
    # Emblem: y=[131, 659], x=[227, 809]
    # Text: y=[660, 908], x=[93, 934]
    emblem_crop = trans.crop((225, 128, 812, 660))
    text_crop = trans.crop((90, 660, 936, 915))

    # Clean trim emblem
    bbox_e = emblem_crop.getbbox()
    if bbox_e:
        emblem_tight = emblem_crop.crop(bbox_e)
    else:
        emblem_tight = emblem_crop

    # Clean trim text
    bbox_t = text_crop.getbbox()
    if bbox_t:
        text_tight = text_crop.crop(bbox_t)
    else:
        text_tight = text_crop

    print(f"Emblem tight: {emblem_tight.size}, Text tight: {text_tight.size}")

    # 3. Create full.png (Vertical lockup, 800x800 transparent with padded emblem + text)
    full_canvas = Image.new("RGBA", (800, 800), (0, 0, 0, 0))
    # Resize emblem to fit top
    e_w, e_h = emblem_tight.size
    scale_e = min(460 / e_w, 420 / e_h)
    new_e = emblem_tight.resize((int(e_w * scale_e), int(e_h * scale_e)), Image.Resampling.LANCZOS)
    full_canvas.paste(new_e, ((800 - new_e.width) // 2, 40), new_e)

    # Resize text to fit bottom
    t_w, t_h = text_tight.size
    scale_t = min(680 / t_w, 240 / t_h)
    new_t = text_tight.resize((int(t_w * scale_t), int(t_h * scale_t)), Image.Resampling.LANCZOS)
    full_canvas.paste(new_t, ((800 - new_t.width) // 2, 480 + (260 - new_t.height) // 2), new_t)
    full_canvas.save(BRAND_DIR / "full.png")
    print("Saved full.png")

    # 4. Create horizontal.png (Header / navbar lockup: e.g. 560 x 128)
    h_canvas = Image.new("RGBA", (560, 128), (0, 0, 0, 0))
    # Emblem height ~112
    scale_h_e = 112 / emblem_tight.height
    h_e = emblem_tight.resize((int(emblem_tight.width * scale_h_e), 112), Image.Resampling.LANCZOS)
    h_canvas.paste(h_e, (8, 8), h_e)

    # Text width ~400, height ~100
    scale_h_t = min(400 / text_tight.width, 96 / text_tight.height)
    h_t = text_tight.resize((int(text_tight.width * scale_h_t), int(text_tight.height * scale_h_t)), Image.Resampling.LANCZOS)
    h_canvas.paste(h_t, (140, (128 - h_t.height) // 2), h_t)
    h_canvas.save(BRAND_DIR / "horizontal.png")
    print("Saved horizontal.png")

    # 5. Icons: square canvas with centered emblem
    def make_icon(size: int) -> Image.Image:
        icon_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        pad = int(size * 0.08)
        avail = size - 2 * pad
        scale = min(avail / emblem_tight.width, avail / emblem_tight.height)
        scaled_e = emblem_tight.resize((int(emblem_tight.width * scale), int(emblem_tight.height * scale)), Image.Resampling.LANCZOS)
        offset = ((size - scaled_e.width) // 2, (size - scaled_e.height) // 2)
        icon_canvas.paste(scaled_e, offset, scaled_e)
        return icon_canvas

    icon512 = make_icon(512)
    icon512.save(BRAND_DIR / "icon-512.png")
    icon192 = make_icon(192)
    icon192.save(BRAND_DIR / "icon-192.png")
    icon180 = make_icon(180)
    icon180.save(BRAND_DIR / "icon-180.png")
    icon32 = make_icon(32)
    icon32.save(BRAND_DIR / "icon-32.png")
    print("Saved icon variants")

    # 6. Favicon
    icon32.save("apps/web/public/favicon.ico", format="ICO", sizes=[(32, 32), (16, 16)])
    icon32.save("apps/web/app/favicon.ico", format="ICO", sizes=[(32, 32), (16, 16)])
    print("Saved favicon.ico")

if __name__ == "__main__":
    main()
