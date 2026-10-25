import json
import shutil
from pathlib import Path
root = Path(__file__).resolve().parents[1]
tools = {name:shutil.which(name) for name in ['colmap','InterfaceCOLMAP','DensifyPointCloud','ReconstructMesh','RefineMesh','TextureMesh','blender']}
target=root/'outputs/3d-audit/environment.json'
target.write_text(json.dumps(tools,indent=2),encoding='utf-8')
print(json.dumps(tools))
