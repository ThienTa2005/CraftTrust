"""Regression coverage for jobs created with the original ceramic-cpu DB default."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import shutil
import unittest
import uuid

from generate import parse_arguments
from test_pipeline import create_synthetic_ceramic_photos, validate_glb_structure


class EngineCompatibilityTests(unittest.TestCase):
    def test_engine_arguments(self):
        required = ["--image", "front.png", "--output", "model.glb",
                    "--height-cm", "28", "--width-cm", "16"]
        self.assertEqual(parse_arguments(required).engine, "auto")
        for engine in ["auto", "ceramic", "multiview", "ai", "ai-trellis", "ai-hunyuan", "ai-triposr", "ceramic-cpu"]:
            with self.subTest(engine=engine):
                actual = parse_arguments(required + ["--engine", engine]).engine
                self.assertEqual(actual, "ceramic" if engine == "ceramic-cpu" else engine)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            parse_arguments(required + ["--engine", "unknown-engine"])
        self.assertEqual(error.exception.code, 2)

    def test_legacy_engine_generates_valid_glb_via_cli(self):
        test_root = Path(__file__).resolve().parents[2] / "outputs"
        test_root.mkdir(exist_ok=True)
        folder = test_root / f"engine-compat-{uuid.uuid4().hex}"
        # Inherit workspace ACLs; Windows private tempfile ACLs exclude sandbox tokens.
        folder.mkdir()
        try:
            self.assertTrue(folder.resolve().is_relative_to(test_root.resolve()))
            front, _ = create_synthetic_ceramic_photos()
            image = folder / "front.png"
            output = folder / "model.glb"
            front.save(image)
            result = subprocess.run([
                sys.executable, "-X", "utf8", str(Path(__file__).with_name("generate.py")),
                "--image", str(image), "--output", str(output),
                "--height-cm", "28", "--width-cm", "16",
                "--shape-mode", "measured", "--engine", "ceramic-cpu",
            ], capture_output=True, text=True, encoding="utf-8", timeout=120)
            self.assertEqual(result.returncode, 0, result.stderr)
            document = validate_glb_structure(str(output))
            self.assertTrue(document.get("meshes"))
            report = json.loads(output.with_suffix(".json").read_text(encoding="utf-8"))
            self.assertEqual(report["requestedEngine"], "ceramic")
            self.assertEqual(report["assetBytes"], output.stat().st_size)
        finally:
            self.assertTrue(folder.resolve().is_relative_to(test_root.resolve()))
            shutil.rmtree(folder)


if __name__ == "__main__":
    unittest.main()
