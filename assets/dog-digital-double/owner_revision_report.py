"""Publish matching-camera revision evidence and encode the current web turntable."""
import hashlib
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/dog-digital-double"


def main():
    corrections = OUTPUT / "owner-corrections"
    panel = Image.new("RGB", (1600, 882), "#e0e5e2")
    draw = ImageDraw.Draw(panel)
    font = ImageFont.truetype("C:/Windows/Fonts/trebuc.ttf", 22)
    for index, (filename, label) in enumerate((("eyes-before.png", "BEFORE"), ("eyelid-aperture-after.png", "OWNER CORRECTION PASS"))):
        with Image.open(corrections / filename) as image:
            panel.paste(image.convert("RGB").resize((800, 800), Image.Resampling.LANCZOS), (index*800, 0))
        draw.text((index*800+24, 821), label, fill="#263d35", font=font)
    panel.save(corrections / "before-after.jpg", quality=95, subsampling=0)
    frames = sorted((OUTPUT / "turntable/web-frames").glob("*.png"))
    assert len(frames) == 144
    video = OUTPUT / "turntable/dog_turntable.mp4"
    encoder = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([encoder, "-hide_banner", "-loglevel", "error", "-y", "-framerate", "24", "-start_number", "0", "-i", str(OUTPUT / "turntable/web-frames/%04d.png"), "-frames:v", "144", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video)], check=True)
    subprocess.run([encoder, "-hide_banner", "-loglevel", "error", "-i", str(video), "-f", "null", "-"], check=True)
    images = []
    for filename in frames[::3]:
        with Image.open(filename) as image:
            images.append(image.convert("RGB").resize((400, 400), Image.Resampling.LANCZOS).quantize(colors=128))
    images[0].save(OUTPUT / "turntable/dog_turntable.gif", save_all=True, append_images=images[1:], duration=125, loop=0, optimize=False)
    for image in images:
        image.close()
    artifacts = []
    for filename in ("dog_master.blend", "dog_web.glb", "dog_web_lod1.glb", "dog_web_lod2.glb", "owner-corrections/before-after.jpg", "turntable/dog_turntable.mp4"):
        content = (OUTPUT / filename).read_bytes()
        artifacts.append({"file": filename, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
    for lod in range(3):
        report = json.loads((OUTPUT / ("glb-validation-lod%d.json" % lod)).read_text(encoding="utf-8"))
        filename = "dog_web.glb" if lod == 0 else "dog_web_lod%d.glb" % lod
        assert report["sha256"] == hashlib.sha256((OUTPUT / filename).read_bytes()).hexdigest()
        assert report["validation"]["issues"]["numErrors"] == 0
        assert report["validation"]["issues"]["numWarnings"] == 0
    browser = json.loads((OUTPUT / "web-browser-validation.json").read_text(encoding="utf-8"))
    assert browser["errors"] == [] and browser["turntable"]
    result = {"revision": "owner-corrections-2026-09-24", "status": "Corrections applied; likeness remains stylized and requires owner review", "comparison": "owner-corrections/before-after.jpg", "video_seconds": 6, "frames": 144, "video_decode_passed": True, "glb_errors": 0, "glb_warnings": 0, "artifacts": artifacts}
    (corrections / "revision-manifest.json").write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
