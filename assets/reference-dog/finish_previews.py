"""Encode the actual GLB turntable frames and assemble a labeled preview sheet."""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs" / "reference-dog"
PREVIEWS = OUTPUT / "previews"


def main():
    frames = sorted((OUTPUT / "turntable-frames").glob("*.png"))
    assert len(frames) == 120, "Expected the complete 120-frame GLB turntable"
    video = OUTPUT / "reference-dog-turntable.mp4"
    subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "24", "-start_number", "0", "-i", str(OUTPUT / "turntable-frames" / "%04d.png"),
        "-frames:v", "120", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video),
    ], check=True)
    animated = []
    for filename in frames[::2]:
        with Image.open(filename) as source:
            animated.append(source.convert("RGB").resize((400, 400), Image.Resampling.LANCZOS).quantize(colors=128))
    animated[0].save(OUTPUT / "reference-dog-turntable.gif", save_all=True, append_images=animated[1:], duration=83, loop=0, optimize=False)
    for image in animated:
        image.close()
    views = [("three-quarter", "THREE-QUARTER"), ("front", "FRONT"), ("side", "SIDE"), ("rear", "REAR"), ("above", "COAT PATTERN"), ("face", "FACE DETAIL")]
    sheet = Image.new("RGB", (1920, 1392), "#c9cecf")
    draw = ImageDraw.Draw(sheet)
    font_path = Path("C:/Windows/Fonts/trebuc.ttf")
    font = ImageFont.truetype(str(font_path), 20) if font_path.exists() else ImageFont.load_default()
    for index, (filename, label) in enumerate(views):
        column, row = index % 3, index // 3
        with Image.open(PREVIEWS / (filename + ".png")) as source:
            panel = source.convert("RGB").resize((640, 640), Image.Resampling.LANCZOS)
            sheet.paste(panel, (column * 640, row * 696))
        draw.text((column * 640 + 24, row * 696 + 654), label, fill="#344947", font=font)
    sheet.save(PREVIEWS / "contact-sheet.jpg", quality=95, subsampling=0)
    report = {"frames": len(frames), "fps": 24, "duration_seconds": 5, "resolution": [800, 800], "mp4_bytes": video.stat().st_size, "preview_views": len(views)}
    (OUTPUT / "turntable-info.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
