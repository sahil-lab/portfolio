"""Assemble uncropped review evidence and verify the face-only Blender deliverable."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/sah-face"


def digest(filename):
    return hashlib.sha256(filename.read_bytes()).hexdigest()


def reference_crop(image):
    left, top, right, bottom = 260 / 1152, 95 / 1536, 835 / 1152, 850 / 1536
    return image.crop((round(left * image.width), round(top * image.height), round(right * image.width), round(bottom * image.height)))


def main():
    status = json.loads((OUTPUT / "package-status.json").read_text(encoding="utf-8"))
    assert status["stage"] == "complete" and status["reopened"]
    master = OUTPUT / "sah_face_master.blend"
    assert digest(master) == status["sha256"], "The packaged Blender file changed after reopening validation"
    report = status["report"]
    assert report["scenes"] == 1 and report["packed_references"] == 6
    assert report["topology"]["non_manifold_edges"] == report["topology"]["boundary_edges"] == 0
    assert report["multires_levels"] == 2 and len(report["native_hair"]) == 5
    font = ImageFont.truetype("C:/Windows/Fonts/trebuc.ttf", 23)
    small = ImageFont.truetype("C:/Windows/Fonts/trebuc.ttf", 18)
    comparison = Image.new("RGB", (1800, 900), "#e8ebe9")
    draw = ImageDraw.Draw(comparison)
    sources = [
        (ROOT / "picsofSah/IMG_8520.jpeg", "REFERENCE PHOTOGRAPH"),
        (OUTPUT / "review/reference_front.png", "MODEL / REFERENCE-DERIVED COLOR"),
        (OUTPUT / "clay/reference_front.png", "MODEL / GEOMETRY ONLY"),
    ]
    for index, (filename, label) in enumerate(sources):
        with Image.open(filename) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            panel = ImageOps.contain(reference_crop(image), (580, 770), Image.Resampling.LANCZOS)
            comparison.paste(panel, (index * 600 + (600 - panel.width) // 2, 28 + (770 - panel.height) // 2))
        draw.text((index * 600 + 18, 823), label, fill="#253b36", font=small)
    draw.text((18, 864), "Same source-camera crop. Monocular depth and unseen profiles are estimates; not an exact scan.", fill="#53615a", font=small)
    comparison.save(OUTPUT / "comparison.jpg", quality=95, subsampling=0)

    views = [
        ("review/front.png", "FRONT"),
        ("review/three_quarter.png", "THREE-QUARTER"),
        ("review/profile.png", "PROFILE / ESTIMATED DEPTH"),
        ("review/top.png", "TOP / SHORT SCALP HAIR"),
        ("clay/front.png", "CLAY FRONT"),
        ("clay/three_quarter.png", "CLAY THREE-QUARTER"),
    ]
    sheet = Image.new("RGB", (1800, 1570), "#e8ebe9")
    draw = ImageDraw.Draw(sheet)
    image_checks = []
    for index, (relative, label) in enumerate(views):
        filename = OUTPUT / relative
        with Image.open(filename) as source:
            source.verify()
        with Image.open(filename) as source:
            image = source.convert("RGB")
            colors = len(image.resize((96, 96)).quantize(colors=64).getcolors())
            assert colors > 24, relative + " is blank"
            panel = ImageOps.contain(image, (590, 706), Image.Resampling.LANCZOS)
            left, top = index % 3 * 600, index // 3 * 785
            sheet.paste(panel, (left + (600 - panel.width) // 2, top + 12 + (706 - panel.height) // 2))
            draw.text((left + 20, top + 740), label, fill="#253b36", font=font)
            image_checks.append({"file": relative, "size": list(image.size), "color_bins": colors, "sha256": digest(filename)})
    sheet.save(OUTPUT / "preview-sheet.jpg", quality=95, subsampling=0)
    result = {
        "status": "Face-only likeness study completed for review; exact likeness is not established",
        "master": {"file": master.name, "bytes": master.stat().st_size, "sha256": digest(master), "reopened_in_blender": True},
        "reference_photos": 6,
        "face_landmarks": 478,
        "scope": "Head/face only, no body or rig",
        "comparison": "comparison.jpg",
        "preview_sheet": "preview-sheet.jpg",
        "geometry_only_previews": True,
        "images": image_checks,
        "limitations": ["No clear side-profile photo", "Monocular depth and assumed 64 mm eye spacing", "Portrait-derived color retains some original illumination", "Estimated ear and rear-head anatomy", "Not deformation-certified or owner-approved"],
    }
    (OUTPUT / "delivery-manifest.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"master": result["master"], "review_images": len(image_checks), "references": 6, "comparison": result["comparison"], "status": result["status"]}, indent=2))


if __name__ == "__main__":
    main()
