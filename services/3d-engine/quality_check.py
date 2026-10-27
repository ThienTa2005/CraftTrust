from __future__ import annotations

import struct
from pathlib import Path

import trimesh


def validate_glb(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError("Output is not a GLB file.")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2 or declared_length != len(data):
        raise ValueError("GLB version or declared byte length is invalid.")
    loaded = trimesh.load(path, force="scene", process=False)
    geometries = list(loaded.geometry.values())
    if not geometries:
        raise ValueError("GLB contains no mesh geometry.")
    vertices = sum(len(mesh.vertices) for mesh in geometries)
    faces = sum(len(mesh.faces) for mesh in geometries)
    if vertices < 100 or faces < 100:
        raise ValueError("GLB geometry is unexpectedly empty.")
    return {
        "glbValid": True,
        "assetBytes": len(data),
        "geometryCount": len(geometries),
        "vertexCount": vertices,
        "faceCount": faces,
        "watertightGeometryCount": sum(bool(mesh.is_watertight) for mesh in geometries),
    }
