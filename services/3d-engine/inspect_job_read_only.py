import json
import modal
from pathlib import Path

app = modal.App("inspect-job-read-only")
ENGINE_DIR = Path(__file__).resolve().parent
web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("httpx>=0.28.1")
    .add_local_file(ENGINE_DIR / "storage_client.py", remote_path="/root/storage_client.py")
)
secret = modal.Secret.from_name("crafttrust-3d")

@app.function(image=web_image, secrets=[secret], timeout=30)
def read_job_state(job_id: str):
    from storage_client import CraftTrustStorage
    storage = CraftTrustStorage.from_environment()
    out = {}
    
    # 1. model_jobs
    resp = storage.client.get(f"{storage.base_url}/rest/v1/model_jobs?id=eq.{job_id}", headers=storage.headers)
    out["job"] = resp.json() if resp.status_code == 200 else resp.text

    # 2. model_dispatch_outbox
    resp = storage.client.get(f"{storage.base_url}/rest/v1/model_dispatch_outbox?job_id=eq.{job_id}", headers=storage.headers)
    out["outbox"] = resp.json() if resp.status_code == 200 else resp.text

    # 3. Check storage for this job
    # We can inspect storage objects via storage API
    # Path pattern: <seller_id>/<product_id>/<job_id>/
    if isinstance(out["job"], list) and len(out["job"]) > 0:
        seller_id = out["job"][0].get("seller_id")
        product_id = out["job"][0].get("product_id")
        folder = f"{seller_id}/{product_id}/{job_id}"
        out["storage_folder"] = folder
        
        # List product-models bucket
        list_resp = storage.client.post(
            f"{storage.base_url}/storage/v1/object/list/product-models",
            headers={**storage.headers, "content-type": "application/json"},
            json={"prefix": folder, "limit": 100}
        )
        out["product_models"] = list_resp.json() if list_resp.status_code == 200 else list_resp.text

        # List product-source bucket
        source_folder = f"{seller_id}/{product_id}"
        src_resp = storage.client.post(
            f"{storage.base_url}/storage/v1/object/list/product-source",
            headers={**storage.headers, "content-type": "application/json"},
            json={"prefix": source_folder, "limit": 100}
        )
        out["product_source"] = src_resp.json() if src_resp.status_code == 200 else src_resp.text
        
    return out

@app.local_entrypoint()
def main():
    job_id = "dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb"
    result = read_job_state.remote(job_id)
    print(json.dumps(result, indent=2))
