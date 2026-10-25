"""Executed only inside Blender after an actual textured MVS result exists."""
import sys
import bpy

source, target = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes or not any(len(obj.data.polygons) for obj in meshes):
    raise ValueError("Empty reconstructed mesh")
if not any(mat and mat.use_nodes and any(n.type == "TEX_IMAGE" and n.image for n in mat.node_tree.nodes)
           for obj in meshes for mat in obj.data.materials):
    raise ValueError("Missing reconstructed texture")
bpy.ops.export_scene.gltf(filepath=target, export_format="GLB", export_yup=True)
