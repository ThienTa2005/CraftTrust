from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path

import cv2
from PIL import Image, ImageOps


@dataclass(frozen=True)
class ImageEvidence:
    width: int
    height: int
    format: str
    sharpness: float
    has_alpha_mask: bool

    def as_dict(self) -> dict:
        return asdict(self)


def validate_image(path: Path, expected_mime: str, expected_bytes: int) -> ImageEvidence:
    if not path.is_file() or path.stat().st_size != expected_bytes:
        raise ValueError("Downloaded source size does not match the database manifest.")
    if path.stat().st_size < 200 or path.stat().st_size > 7_000_000:
        raise ValueError("Source image must be between 200 bytes and 7 MB.")
    try:
        with Image.open(path) as raw:
            raw.verify()
        with Image.open(path) as raw:
            image = ImageOps.exif_transpose(raw)
            width, height = image.size
            fmt = (raw.format or "").upper()
            alpha = image.mode in {"RGBA", "LA"} and image.getextrema()[-1][0] < 255
    except Exception as exc:
        raise ValueError("Source image is corrupt or unsupported.") from exc
    allowed = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
    if allowed.get(expected_mime) != fmt:
        raise ValueError("Decoded image format does not match its declared MIME type.")
    if min(width, height) < 512 or max(width, height) > 8192:
        raise ValueError("Source image dimensions must be between 512 and 8192 pixels.")
    pixels = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if pixels is None:
        raise ValueError("OpenCV could not decode the source image.")
    sharpness = float(cv2.Laplacian(pixels, cv2.CV_64F).var())
    if sharpness < 18:
        raise ValueError("Source image is too blurred for reliable 3D generation.")
    return ImageEvidence(width, height, fmt, round(sharpness, 2), alpha)
