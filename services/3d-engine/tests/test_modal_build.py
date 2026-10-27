from __future__ import annotations

import ast
from pathlib import Path
import re


ENGINE = Path(__file__).parents[1]


def test_native_installs_cannot_resolve_dependencies_again():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    commands = (
        "cd /tmp/CuMesh && python -m pip install . --no-build-isolation --no-deps",
        "cd /tmp/FlexGEMM",
        "cd /opt/TRELLIS.2/o-voxel && python -m pip install . --no-build-isolation --no-deps",
        "natten==0.21.0 --no-build-isolation --no-deps",
    )
    for command in commands:
        assert command in source
    flex_command = next(line for line in source.splitlines() if "/tmp/FlexGEMM" in line)
    assert "pip install . --no-build-isolation --no-deps" in flex_command
    assert source.index("CUMESH_BUILD_COMMAND,") < source.index("cd /opt/TRELLIS.2/o-voxel")
    assert source.index("/tmp/FlexGEMM") < source.index("cd /opt/TRELLIS.2/o-voxel")
    assert "sed -i" not in source
    assert "force_build=True" not in source
    assert "click==8.3.1" in source
    assert "packaging==25.0" in source
    assert "wheel==0.45.1 cmake" not in source


def test_supabase_functions_share_secret_and_preflight_is_cpu_only():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    assert 'engine_secret = modal.Secret.from_name("crafttrust-3d")' in source
    for function_name in ("reap_stale_jobs", "dispatch_pending", "supabase_preflight"):
        decorator, function = source.split(f"def {function_name}()", 1)[0].rsplit("@app.function", 1)[1], source.split(f"def {function_name}()", 1)[1]
        assert "image=web_image" in decorator
        assert "secrets=[engine_secret]" in decorator
        assert "gpu=" not in decorator
        if function_name == "supabase_preflight":
            body = function.split("\n@app.", 1)[0]
            assert ".preflight(" in body
            assert ".rpc(" not in body


def test_scheduled_rpc_contract_is_defined_and_granted_by_one_migration():
    migration = Path(__file__).parents[3] / "supabase" / "migrations" / "202610260001_pixal3d_modal_engine.sql"
    sql = migration.read_text(encoding="utf-8").lower()
    signatures = {
        "begin_pixal3d_dispatch": "uuid",
        "mark_pixal3d_dispatched": "uuid,text",
        "record_pixal3d_result": "uuid,text,jsonb",
        "apply_pixal3d_result": "uuid",
        "reap_stale_pixal3d_jobs": "integer",
        "settle_pixal3d_call": "uuid,text",
    }
    for name, signature in signatures.items():
        assert f"create or replace function public.{name}" in sql
        assert f"grant execute on function public.{name}({signature}) to service_role" in sql


def test_model_downloads_are_pinned_and_allowlisted_without_ignore_rules():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    assert 'CHECKPOINT_REVISION = "b0cb2e1b794cab9aa0ac38a95d794a4d9337437f"' in source
    assert "revision=CHECKPOINT_REVISION" in source
    assert source.count("revision=") >= 4
    for pattern in (
        '"pipeline.json"',
        '"pipeline_mv.json"',
        '"ckpts/*.json"',
        '"ckpts/*.safetensors"',
        '"model.pt"',
        '"config.json"',
        '"model.safetensors"',
        '"BiRefNet_config.py"',
        '"birefnet.py"',
    ):
        assert pattern in source
    assert source.count("allow_patterns=") == 4
    assert source.count("ignore_patterns=None") == 4


def test_safetensors_complex64_support_is_pinned_after_native_build_layers():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    pin = '.pip_install("safetensors==0.7.0")'
    assert pin in source
    assert source.index(pin) > source.index("natten==0.21.0")

    audit = (ENGINE / "image_dependency_audit.py").read_text(encoding="utf-8")
    assert '"safetensors": {"0.7.0"}' in audit


def test_fast_simplification_pinned_and_audited():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    pin = '.pip_install("fast-simplification==0.2.0")'
    assert pin in source
    assert source.index(pin) > source.index("natten==0.21.0")
    assert source.index(pin) > source.index("safetensors==0.7.0")

    audit = (ENGINE / "image_dependency_audit.py").read_text(encoding="utf-8")
    assert '"fast-simplification": {"0.2.0"}' in audit
    assert '"fast_simplification"' in audit


def test_glb_postprocessing_preflight_is_cpu_only():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    tree = ast.parse(source, filename="modal_app.py")

    target_fn = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "glb_postprocessing_preflight"
        ),
        None,
    )
    assert target_fn is not None, "glb_postprocessing_preflight function not found"

    app_function_call = next(
        (
            dec
            for dec in target_fn.decorator_list
            if isinstance(dec, ast.Call)
            and isinstance(dec.func, ast.Attribute)
            and dec.func.attr == "function"
            and isinstance(dec.func.value, ast.Name)
            and dec.func.value.id == "app"
        ),
        None,
    )
    assert app_function_call is not None, "@app.function decorator not found on glb_postprocessing_preflight"

    keyword_map = {kw.arg: kw.value for kw in app_function_call.keywords if kw.arg is not None}
    assert "gpu" not in keyword_map, "glb_postprocessing_preflight must be CPU-only and not define gpu="
    assert (
        "image" in keyword_map
        and isinstance(keyword_map["image"], ast.Name)
        and keyword_map["image"].id == "gpu_image"
    )


def test_model_cache_preflight_is_cpu_only_and_does_not_initialize_inference():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    tree = ast.parse(source, filename="modal_app.py")

    target_fn = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "model_cache_preflight"
        ),
        None,
    )
    assert target_fn is not None, "model_cache_preflight function not found"

    app_function_call = next(
        (
            dec
            for dec in target_fn.decorator_list
            if isinstance(dec, ast.Call)
            and isinstance(dec.func, ast.Attribute)
            and dec.func.attr == "function"
            and isinstance(dec.func.value, ast.Name)
            and dec.func.value.id == "app"
        ),
        None,
    )
    assert app_function_call is not None, "@app.function decorator not found on model_cache_preflight"

    keyword_map = {kw.arg: kw.value for kw in app_function_call.keywords if kw.arg is not None}
    assert "gpu" not in keyword_map, "model_cache_preflight must be CPU-only and not define gpu="
    assert (
        "image" in keyword_map
        and isinstance(keyword_map["image"], ast.Name)
        and keyword_map["image"].id == "gpu_image"
    )
    assert "volumes" in keyword_map

    fn_source = ast.get_source_segment(source, target_fn) or ""
    assert "_download_pinned_model_snapshots" in fn_source
    assert "model_volume.commit()" in fn_source
    assert "Pixal3DRunner" not in fn_source
    assert "runner.load" not in fn_source
    assert "Pixal3DWorker" not in fn_source
    assert "spawn" not in fn_source


def test_every_git_install_and_clone_is_pinned():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    direct_urls = re.findall(r"git\+https://[^\s\"']+", source)
    assert direct_urls
    assert all(re.search(r"@[0-9a-f]{40}$", url) for url in direct_urls)
    clones = {
        "microsoft/TRELLIS.2.git": ("75fbf0183001ed9876c8dbb35de6b68552ee08bd", "{TRELLIS_COMMIT}"),
        "TencentARC/Pixal3D.git": ("f7cf38429b0bd264f1995f0f8743a88b1c728b94", "{PIXAL3D_COMMIT}"),
        "valeoai/NAF.git": ("37f2dfc180f2de53d98bd601109c0da0dd6b0f43", "{NAF_COMMIT}"),
        "NVlabs/nvdiffrast.git": ("253ac4fcea7de5f396371124af597e6cc957bfae", "253ac4fcea7de5f396371124af597e6cc957bfae"),
        "JeffreyXiang/nvdiffrec.git": ("b296927cc7fd01c2ac1087c8065c4d7248f72da4", "b296927cc7fd01c2ac1087c8065c4d7248f72da4"),
        "JeffreyXiang/CuMesh.git": ("12289e1062f0603f2f0d0771b02e1395d247f26f", "12289e1062f0603f2f0d0771b02e1395d247f26f"),
        "JeffreyXiang/FlexGEMM.git": ("6dd94a859c26ee8246888502eada3dd8ad85532e", "6dd94a859c26ee8246888502eada3dd8ad85532e"),
    }
    for repository, (commit, checkout_token) in clones.items():
        assert f"git clone https://github.com/{repository}" in source
        assert f"git checkout {checkout_token}" in source
        assert commit in source


def test_naf_code_and_weights_are_pinned_and_loaded_locally():
    modal_source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    runner_source = (ENGINE / "pixal3d_runner.py").read_text(encoding="utf-8")
    assert 'NAF_COMMIT = "37f2dfc180f2de53d98bd601109c0da0dd6b0f43"' in modal_source
    assert 'NAF_CHECKPOINT_SHA256 = "c096c1ab2217a5c3ac136365f721685e2201379cb69d509cfb0261183847c98f"' in modal_source
    assert 'source="local"' in runner_source
    assert '"valeoai/NAF"' not in runner_source


def test_all_huggingface_runtime_models_use_pinned_local_snapshots():
    modal_source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    runner_source = (ENGINE / "pixal3d_runner.py").read_text(encoding="utf-8")
    expected = {
        "MOGE_MODEL_REVISION": "39c4d5e957afe587e04eec59dc2bcc3be5ecd968",
        "DINO_MODEL_REVISION": "3c276edd87d6f6e569ff0c4400e086807d0f3881",
        "BIREFNET_MODEL_REVISION": "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4",
    }
    for name, revision in expected.items():
        assert f'{name} = "{revision}"' in modal_source
        assert f"revision={name}" in modal_source
    assert 'config["model_name"] = str(self.dino_path)' in runner_source
    assert "model_name=dino_path" in runner_source
    assert "model_name=str(self.moge_checkpoint)" in runner_source
    assert "model_name=birefnet_path" in runner_source
    assert 'os.environ["HF_HUB_OFFLINE"] = "1"' in runner_source
    assert 'os.environ["TRANSFORMERS_OFFLINE"] = "1"' in runner_source
    assert "UNPINNED_MODEL_DOWNLOAD_BLOCKED" in runner_source


def test_cpu_image_audit_never_imports_gpu_packages():
    audit_path = ENGINE / "image_dependency_audit.py"
    tree = ast.parse(audit_path.read_text(encoding="utf-8"))
    imported = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    assert imported.isdisjoint({
        "torch", "torchvision", "triton", "flex_gemm", "cumesh",
        "nvdiffrast", "nvdiffrec_render", "o_voxel", "natten", "moge", "pixal3d",
    })
    source = audit_path.read_text(encoding="utf-8")
    assert "EXPECTED_MOGE_REQUIREMENTS" in source
    assert "EXPECTED_PIP_CHECK" in source
    assert "ALLOWED_PIP_CHECK" not in source


def test_gpu_workers_are_explicitly_scale_to_zero_and_bounded():
    source = (ENGINE / "modal_app.py").read_text(encoding="utf-8")
    assert source.count("min_containers=0") >= 3
    assert source.count("max_containers=1") >= 3
    assert source.count("retries=0") >= 3
    assert "@app.local_entrypoint()\ndef smoke_gpu" in source
