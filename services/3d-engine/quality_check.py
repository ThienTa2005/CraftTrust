from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any

import trimesh


def inspect_glb(source: Path | str | bytes) -> dict[str, Any]:
    """Inspect GLB file integrity, geometry, UV coordinates, materials, and textures.

    Accurately detects embedded WebP textures, basisu, and PBR texture slots.
    """
    if isinstance(source, bytes):
        data = source
    else:
        path = Path(source)
        if not path.is_file():
            raise FileNotFoundError(f"GLB file not found: {path}")
        data = path.read_bytes()

    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError("Output file is not a valid GLB binary: missing 'glTF' header.")

    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2:
        raise ValueError(f"Unsupported GLB version {version}; version 2 expected.")
    if declared_length != len(data):
        raise ValueError(
            f"GLB declared length ({declared_length}) does not match actual byte size ({len(data)})."
        )

    # Parse Chunk 0 (JSON)
    chunk0_len, chunk0_type = struct.unpack_from("<II", data, 12)
    if chunk0_type != 0x4E4F534A:  # ASCII for 'JSON'
        raise ValueError("GLB chunk 0 is not of type JSON.")

    json_raw = data[20 : 20 + chunk0_len].decode("utf-8")
    gltf: dict[str, Any] = json.loads(json_raw)

    extensions_used: list[str] = gltf.get("extensionsUsed", [])
    extensions_required: list[str] = gltf.get("extensionsRequired", [])
    gltf_images: list[dict[str, Any]] = gltf.get("images", [])
    gltf_textures: list[dict[str, Any]] = gltf.get("textures", [])
    gltf_materials: list[dict[str, Any]] = gltf.get("materials", [])

    # Inspect glTF texture slots
    texture_slots: list[str] = []
    for mat in gltf_materials:
        pbr = mat.get("pbrMetallicRoughness", {})
        for slot in ("baseColorTexture", "metallicRoughnessTexture"):
            if slot in pbr:
                texture_slots.append(slot)
        for slot in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            if slot in mat:
                texture_slots.append(slot)

    texture_slots = sorted(list(set(texture_slots)))

    # Inspect MIME types & embedded formats
    texture_mime_types_set: set[str] = set()
    embedded_formats_set: set[str] = set()

    for img in gltf_images:
        mime = img.get("mimeType")
        if mime:
            texture_mime_types_set.add(mime)
            subtype = mime.split("/")[-1].upper()
            embedded_formats_set.add(subtype)

    for ext in extensions_used:
        if ext == "EXT_texture_webp":
            embedded_formats_set.add("WEBP")
            texture_mime_types_set.add("image/webp")
        elif ext == "KHR_texture_basisu":
            embedded_formats_set.add("BASISU")
            texture_mime_types_set.add("image/ktx2")

    # Load geometry with Trimesh
    loaded = trimesh.load(
        trimesh.util.wrap_as_stream(data) if isinstance(source, bytes) else Path(source),
        file_type="glb",
        force="scene",
        process=False,
    )
    geometries = list(loaded.geometry.values())
    if not geometries:
        raise ValueError("GLB scene contains no mesh geometry.")

    vertices = sum(len(mesh.vertices) for mesh in geometries)
    faces = sum(len(mesh.faces) for mesh in geometries)
    if vertices == 0 or faces == 0:
        raise ValueError("GLB geometry has zero vertices or faces.")

    has_uvs = any(
        getattr(mesh.visual, "uv", None) is not None and len(mesh.visual.uv) > 0
        for mesh in geometries
    )
    has_material = bool(gltf_materials) or any(
        getattr(mesh.visual, "material", None) is not None for mesh in geometries
    )

    # Check trimesh materials directly for any texture instances
    for mesh in geometries:
        mat = getattr(mesh.visual, "material", None)
        if mat is not None:
            for attr in (
                "baseColorTexture",
                "metallicRoughnessTexture",
                "normalTexture",
                "occlusionTexture",
                "emissiveTexture",
                "image",
            ):
                val = getattr(mat, attr, None)
                if val is not None:
                    if attr not in texture_slots:
                        texture_slots.append(attr)
                    if hasattr(val, "format") and val.format:
                        embedded_formats_set.add(val.format.upper())

    texture_slots = sorted(list(set(texture_slots)))
    texture_mime_types = sorted(list(texture_mime_types_set))
    embedded_texture_formats = sorted(list(embedded_formats_set))

    # Texture count: count of glTF images, or fall back to textures / slots
    texture_image_count = max(len(gltf_images), len(gltf_textures), len(texture_slots))

    # Definitive Has Texture rule:
    # Requires UV coordinates + Material + at least one valid texture image or slot
    has_texture = bool(has_uvs and has_material and (texture_image_count > 0 or len(texture_slots) > 0))

    watertight_count = sum(bool(mesh.is_watertight) for mesh in geometries)
    is_watertight = watertight_count == len(geometries)

    advisories: list[str] = []
    if not has_uvs:
        advisories.append("MISSING_UVS: Mesh lacks UV coordinates; texturing will fail.")
    if not has_material:
        advisories.append("MISSING_MATERIAL: Mesh has no material definition.")
    if has_uvs and has_material and not has_texture:
        advisories.append("UNTEXTURED: Material has no texture image map.")
    if not is_watertight:
        advisories.append("NON_WATERTIGHT: Mesh geometry contains open boundaries or holes.")
    if faces > 300000:
        advisories.append("HIGH_POLY_COUNT: Face count exceeds 300,000; decimation recommended for web.")
    if len(data) > 15 * 1024 * 1024:
        advisories.append("LARGE_FILE_SIZE: GLB exceeds 15 MB; web viewer performance may degrade on mobile.")

    file_size_mb = round(len(data) / (1024 * 1024), 2)
    web_viewer_ready = len(data) <= 15 * 1024 * 1024 and faces <= 250000 and has_texture

    return {
        "glbValid": True,
        "fileSizeBytes": len(data),
        "geometryCount": len(geometries),
        "vertexCount": vertices,
        "faceCount": faces,
        "watertight": is_watertight,
        "watertightGeometryCount": watertight_count,
        "hasUvs": has_uvs,
        "hasMaterial": has_material,
        "hasTexture": has_texture,
        "textureSlots": texture_slots,
        "textureImageCount": texture_image_count,
        "textureMimeTypes": texture_mime_types,
        "embeddedTextureFormats": embedded_texture_formats,
        "extensionsUsed": extensions_used,
        "extensionsRequired": extensions_required,
        "advisories": advisories,
        "qualityAdvisory": {
            "isWatertight": is_watertight,
            "faceDensityCategory": (
                "high" if faces >= 30000 else "medium" if faces >= 5000 else "low"
            ),
            "fileSizeMb": file_size_mb,
            "webViewerReady": web_viewer_ready,
        },
    }


def validate_glb(path: Path | str | bytes) -> dict[str, Any]:
    """Backward-compatible validation wrapper returning structural and texture metrics."""
    result = inspect_glb(path)
    if result["vertexCount"] < 100 or result["faceCount"] < 100:
        raise ValueError("GLB geometry is unexpectedly empty.")
    result["assetBytes"] = result["fileSizeBytes"]
    result["hasUvCoordinates"] = result["hasUvs"]
    result["hasEmbeddedTexture"] = result["hasTexture"]
    return result
