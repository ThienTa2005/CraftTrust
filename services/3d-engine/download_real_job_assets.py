import modal
from pathlib import Path

app = modal.App("download-real-job-assets")
ENGINE_DIR = Path(__file__).resolve().parent

web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("httpx>=0.28.1")
    .add_local_file(ENGINE_DIR / "storage_client.py", remote_path="/root/storage_client.py")
)
secret = modal.Secret.from_name("crafttrust-3d")

@app.function(image=web_image, secrets=[secret], timeout=120)
def fetch_storage_object(bucket: str, path: str) -> bytes:
    from storage_client import CraftTrustStorage
    storage = CraftTrustStorage.from_environment()
    url = f"{storage.base_url}/storage/v1/object/{bucket}/{path}"
    resp = storage.client.get(url, headers=storage.headers)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to fetch {bucket}/{path}: {resp.status_code} {resp.text}")
    return resp.content

@app.local_entrypoint()
def main():
    folder = "10000000-0000-0000-0000-000000000020/f57d000c-789c-45ad-b40c-50775260dd90/dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb"
    source_path = "10000000-0000-0000-0000-000000000020/f57d000c-789c-45ad-b40c-50775260dd90/source-0.jpg"
    
    out_dir = ENGINE_DIR / "artifacts_debug" / "dc2dfaf7-3b63-43f8-8a20-c1c7c722edeb"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print("Fetching pixal3d_master.glb...")
    master_bytes = fetch_storage_object.remote("product-models", f"{folder}/pixal3d_master.glb")
    (out_dir / "pixal3d_master.glb").write_bytes(master_bytes)
    print(f"Saved master.glb: {len(master_bytes)} bytes")
    
    print("Fetching pixal3d_web.glb...")
    web_bytes = fetch_storage_object.remote("product-models", f"{folder}/pixal3d_web.glb")
    (out_dir / "pixal3d_web.glb").write_bytes(web_bytes)
    print(f"Saved web.glb: {len(web_bytes)} bytes")

    print("Fetching source-0.jpg...")
    source_bytes = fetch_storage_object.remote("product-source", source_path)
    (out_dir / "source-0.jpg").write_bytes(source_bytes)
    print(f"Saved source-0.jpg: {len(source_bytes)} bytes")
    
    print("All assets successfully downloaded locally!")
