# CraftTrust Pixal3D / Modal worker

This service runs the official TencentARC Pixal3D code and checkpoint. It never
falls back to Ceramic, a sample GLB, or local developer GPU inference.

Pinned provenance:

- Pixal3D code: `f7cf38429b0bd264f1995f0f8743a88b1c728b94`
- Pixal3D checkpoint: `b0cb2e1b794cab9aa0ac38a95d794a4d9337437f`
- TRELLIS.2: `75fbf0183001ed9876c8dbb35de6b68552ee08bd`
- Default runtime: Modal L40S, one container and one input at a time, 1024 low-VRAM, SDPA.

# CraftTrust Pixal3D / Modal Worker

This service runs the official TencentARC Pixal3D code and checkpoint on Modal GPU Cloud. It never falls back to Ceramic, a sample GLB, or local developer GPU inference.

Pinned provenance:
- Pixal3D code: `f7cf38429b0bd264f1995f0f8743a88b1c728b94`
- Pixal3D checkpoint: `b0cb2e1b794cab9aa0ac38a95d794a4d9337437f`
- TRELLIS.2: `75fbf0183001ed9876c8dbb35de6b68552ee08bd`
- Default runtime: Modal L40S, 1 container globally, 1 input at a time, 1024 low-VRAM, SDPA.

---

## Deployment & Setup Guide (PowerShell on Windows)

### 1. Authenticate with Modal
Ensure the virtual environment dependencies are installed, then authenticate your Modal CLI:

```powershell
# From the repository root
services\3d-engine\.venv\Scripts\python.exe -m pip install -r services/3d-engine/requirements.txt
services\3d-engine\.venv\Scripts\modal.exe setup
```
This opens your browser to authenticate and creates token credentials in `%USERPROFILE%\.modal.toml`.

### 2. Generate Shared Secret
Create a strong random shared secret for HMAC authentication between Next.js and Modal:

```powershell
$SharedSecret = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
Write-Output "MODAL_3D_SHARED_SECRET: $SharedSecret"
```

### 3. Review GPU Pricing & Create Modal Secret
Check [Modal Pricing](https://modal.com/pricing) for the current L40S rate (approx. $0.000542/second, ~$1.95/hour):

```powershell
services\3d-engine\.venv\Scripts\modal.exe secret create crafttrust-3d `
  SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" `
  SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY" `
  MODAL_3D_SHARED_SECRET="$SharedSecret" `
  CRAFTTRUST_CALLBACK_URL="https://craft-trust.vercel.app/api/internal/3d-callback" `
  MODAL_GPU_USD_PER_SECOND="0.000542"
```

Replace every `YOUR_*` token before running this command. `SUPABASE_URL` must be
the project root in the exact form `https://<20-character-project-ref>.supabase.co`:
no dashboard URL, `/rest/v1`, port, query string, custom placeholder, or local URL.
Never paste or print the service-role key in logs or support output.

Read-only CPU preflight (no GPU, inference, job creation, or mutating RPC):

```powershell
services\3d-engine\.venv\Scripts\modal.exe run --env main services/3d-engine/modal_app.py::check_supabase
```

This reads PostgREST's OpenAPI document and reports only the public hostname,
authentication status, and presence of the tables/RPCs required by the scheduled
dispatcher and reaper. It uses `web_image`; CUDA extension layers are not invoked.

### 4. Deploy Modal Worker
Deploy the application to Modal (set UTF-8 encoding so progress bars stream cleanly on Windows PowerShell):

```powershell
$env:PYTHONIOENCODING="utf-8"; $env:PYTHONUTF8="1"
services\3d-engine\.venv\Scripts\modal.exe deploy services/3d-engine/modal_app.py
```
Modal will output the deployed web endpoint URL (e.g., `https://<workspace>--crafttrust-pixal3d-api.modal.run`).

Verify endpoint health:
```powershell
Invoke-RestMethod https://<workspace>--crafttrust-pixal3d-api.modal.run/health
```
Expected output:
```json
{"ok": true, "engine": "pixal3d", "engineCommit": "f7cf38429b0bd264f1995f0f8743a88b1c728b94"}
```

### 5. Configure Vercel / Environment
In your Vercel Project Settings (Environment Variables) or `.env.local`:
- `MODAL_3D_ENDPOINT`: `https://<workspace>--crafttrust-pixal3d-api.modal.run/submit`
- `MODAL_3D_SHARED_SECRET`: (the same `$SharedSecret` generated above)

### 6. Apply Supabase Migration
Open your Supabase Project Dashboard -> SQL Editor:
1. Run the contents of `supabase/migrations/202610260001_pixal3d_modal_engine.sql`.
2. Review and activate compute limits when you are ready to enable generation:

```sql
UPDATE public.model_compute_limits
SET enabled = true,
    provider_cap_reviewed = true,
    gpu_usd_per_second = 0.000542,
    billing_review_note = 'Reviewed Modal L40S Starter rate, 1 concurrent container, $1/day limit'
WHERE singleton = true;
```

### 7. End-to-End Test Workflow
1. **Seller Studio** (`/seller`): Upload 1 clear, well-lit FRONT photo of a craft product. Select `Pixal3D Cloud`. Submit.
2. **Modal GPU Processing**: The outbox dispatches to Modal. You can observe live worker logs:
   ```powershell
   services\3d-engine\.venv\Scripts\modal.exe app logs crafttrust-pixal3d
   ```
3. **Admin Review** (`/admin`): Inspect the generated GLB, source image, and evidence metrics. Approve the model.
4. **Buyer Viewer** (`/products/<slug>`): View the approved 3D model in the interactive 3D viewer.

### 8. Fail-Close Emergency Stop / Rollback
To instantly halt all GPU jobs and disallow new enqueues:
```sql
UPDATE public.model_compute_limits SET enabled = false WHERE singleton = true;
```
Existing model assets, audit records, and products are fully preserved.
