"""Package the inspected native stills and actual exported-GLB turntable."""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/dog-digital-double"


def main():
    turntable = OUTPUT / "turntable"
    frames = sorted((turntable / "web-frames").glob("*.png"))
    assert len(frames) == 144, "The complete six-second GLB rotation is required"
    video = turntable / "dog_turntable.mp4"
    subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "24", "-start_number", "0", "-i", str(turntable / "web-frames/%04d.png"),
        "-frames:v", "144", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video),
    ], check=True)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-i", str(video), "-f", "null", "-"], check=True)
    images = []
    for filename in frames[::3]:
        with Image.open(filename) as image:
            images.append(image.convert("RGB").resize((400, 400), Image.Resampling.LANCZOS).quantize(colors=128))
    images[0].save(turntable / "dog_turntable.gif", save_all=True, append_images=images[1:], duration=125, loop=0, optimize=False)
    for image in images:
        image.close()
    views = [("three_quarter", "THREE-QUARTER"), ("front", "FRONT"), ("left", "LEFT"), ("right", "RIGHT"), ("rear", "REAR"), ("top", "TOP"), ("close_face", "FACE DETAIL")]
    sheet = Image.new("RGB", (1920, 1060), "#e3e5e2")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("C:/Windows/Fonts/trebuc.ttf", 19)
    heading = ImageFont.truetype("C:/Windows/Fonts/trebuc.ttf", 26)
    for index, (name, label) in enumerate(views):
        left, top = index % 4 * 480, index // 4 * 530
        with Image.open(OUTPUT / "renders" / (name + ".png")) as image:
            panel = ImageOps.contain(image.convert("RGB"), (480, 480), Image.Resampling.LANCZOS)
            sheet.paste(panel, (left + (480-panel.width)//2, top + (480-panel.height)//2))
        draw.text((left+18, top+490), label, fill="#273d35", font=font)
    draw.text((1460, 594), "REFERENCE DOG", fill="#273d35", font=heading)
    draw.multiline_text((1460, 646), "Blender 5.2 / Native Hair Curves\n\nEight-photo reconstruction\nNeutral standing pose\n\nOwner likeness review required", fill="#4d6057", font=font, spacing=8)
    sheet.save(OUTPUT / "renders/contact-sheet.jpg", quality=95, subsampling=0)
    report = {"video": "turntable/dog_turntable.mp4", "source": "Actual exported dog_web.glb, rendered in Three.js; cinematic native-hair stills are separate", "frames": 144, "fps": 24, "duration_seconds": 6, "resolution": [900, 900], "mp4_bytes": video.stat().st_size, "decoded_without_errors": True, "native_still_views": len(views)}
    (OUTPUT / "media-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
