"""Render one Blender view per MCP request, sequentially and with saved evidence."""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs/dog-digital-double"


def main(arguments):
    views = ["REF_%02d" % index for index in range(1, 9)] if arguments.references else arguments.views.split(",")
    folder = "reference-final" if arguments.references else arguments.folder
    size = 540 if arguments.references else arguments.size
    samples = 16 if arguments.references else arguments.samples
    report = []
    logs = OUTPUT / "mcp-evidence"
    logs.mkdir(parents=True, exist_ok=True)
    for view in views:
        filename = OUTPUT / folder / (view + ".png")
        if arguments.skip_existing and filename.exists():
            report.append({"view": view, "path": str(filename.relative_to(OUTPUT)), "bytes": filename.stat().st_size, "already_rendered": True})
            continue
        command = [sys.executable, str(ROOT / "scripts/blender_mcp_client.py"), "run", str(ROOT / "assets/dog-digital-double/steps/render_single_view.py"), "--param", "RENDER_VIEW=" + view, "--param", "RENDER_FOLDER=" + folder, "--param", "RENDER_SIZE=" + str(size), "--param", "RENDER_SAMPLES=" + str(samples), "--param", "RENDER_LOOK=" + arguments.look, "--label", folder + "-" + view]
        started = time.time()
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
        (logs / (folder + "-" + view + ".log")).write_text(result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            print(result.stdout[-2000:] + result.stderr[-2000:], flush=True)
            raise RuntimeError("MCP render failed: " + view + "; do not blindly replay model edits")
        assert filename.exists() and filename.stat().st_mtime >= started - 2
        with filename.open("rb") as stream:
            assert stream.read(8) == b"\x89PNG\r\n\x1a\n"
        report.append({"view": view, "path": str(filename.relative_to(OUTPUT)), "bytes": filename.stat().st_size, "seconds": round(time.time()-started, 2)})
        print(json.dumps(report[-1]), flush=True)
    (OUTPUT / (folder + "-manifest.json")).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("MCP_RENDER_SET_COMPLETE", folder, len(report), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--views", default="front,left,right,rear,top,three_quarter,close_face")
    parser.add_argument("--folder", default="renders")
    parser.add_argument("--size", type=int, default=900)
    parser.add_argument("--samples", type=int, default=24)
    parser.add_argument("--look", choices=("neutral", "beauty", "silhouette"), default="neutral")
    parser.add_argument("--references", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    main(parser.parse_args())
