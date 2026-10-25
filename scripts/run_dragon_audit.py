"""Recreate local dragon artifacts without using credentials, cloud APIs or a job queue."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[1]
out = root / 'outputs/3d-audit'
front, back = [root.parent / n for n in ('t1-3-1024x1536.jpg','t2-3-1024x1536.jpg')]
sys.path.insert(0,str(root/'services/model-worker'))
from generate import run_pipeline
from ai_adapter import Hybrid3DManager

manifest = {'inputs':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (front,back)],
    'directions': {'t1':'FRONT 0 degrees','t2':'BACK 180 degrees (opposite-view assumption supplied by user; not calibrated)'},
    'dimensions': '100 cm height / 80 cm width from screenshot, unverified. Photo mode preserves apparent aspect ratio.',
    'hardware':Hybrid3DManager().detect_hardware(), 'baselineCommit':'80f2cfa',
    'currentCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()}
out.mkdir(parents=True,exist_ok=True)
(out/'input-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
reports={}
for label, back_path, shape in [('after',str(back),'photo'),('single',None,'photo'),('after-measured',str(back),'measured')]:
    reports[label]=run_pipeline(str(front),str(out/label/'model.glb'),100,80,back_path=back_path,
        back_azimuth=180 if back_path else None,shape_mode=shape)
(out/'comparison-metrics.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
