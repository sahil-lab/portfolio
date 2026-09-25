"""Measure the added profile pack locally and retain explicit annotation uncertainty."""
import hashlib
import json
from pathlib import Path

import mediapipe as mp
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/sah-face/profile-revision"
SOURCE = ROOT / "picsofSah"
PROFILES = {
    "IMG_8545.jpeg": {
        "side": "R", "role": "primary_right", "confidence": "clear profile, slight perspective and head tilt",
        "points": {"crown": [543, 413], "occiput": [292, 688], "forehead": [856, 588], "brow": [875, 668], "nasion": [848, 716], "nose_tip": [935, 812], "subnasale": [882, 865], "upper_lip": [908, 909], "mouth_corner": [860, 924], "lower_lip": [901, 955], "chin_front": [869, 1035], "chin_base": [805, 1083], "jaw_angle": [575, 1054], "eye_outer": [818, 716], "ear_tragus": [577, 790], "ear_top": [512, 690], "ear_lobe": [563, 886]},
    },
    "IMG_8546.jpeg": {
        "side": "R", "role": "right_oblique", "confidence": "secondary oblique view; use visible-side landmarks only",
        "points": {"crown": [584, 382], "occiput": [325, 652], "forehead": [906, 583], "brow": [908, 650], "nasion": [875, 711], "nose_tip": [978, 795], "subnasale": [923, 849], "upper_lip": [950, 897], "lower_lip": [932, 939], "chin_front": [905, 1003], "chin_base": [838, 1065], "jaw_angle": [610, 1048], "ear_tragus": [580, 777], "ear_top": [505, 673], "ear_lobe": [570, 872]},
    },
    "IMG_8549.jpeg": {
        "side": "L", "role": "primary_left", "confidence": "clear opposite profile; head pitched downward, edge mildly blurred",
        "points": {"crown": [603, 251], "occiput": [931, 615], "forehead": [213, 549], "brow": [215, 647], "nasion": [241, 733], "nose_tip": [175, 851], "subnasale": [227, 904], "upper_lip": [215, 957], "lower_lip": [246, 1011], "chin_front": [286, 1117], "chin_base": [375, 1153], "jaw_angle": [551, 1132], "ear_tragus": [588, 674], "ear_top": [578, 519], "ear_lobe": [603, 791]},
    },
    "IMG_8550.jpeg": {
        "side": "L", "role": "left_oblique", "confidence": "secondary opposite-side view, less frontal silhouette certainty",
        "points": {"crown": [724, 239], "occiput": [979, 572], "forehead": [272, 542], "brow": [270, 645], "nasion": [301, 722], "nose_tip": [239, 844], "subnasale": [286, 897], "upper_lip": [288, 939], "lower_lip": [310, 984], "chin_front": [358, 1095], "chin_base": [443, 1129], "jaw_angle": [604, 1118], "ear_tragus": [659, 668], "ear_top": [663, 502], "ear_lobe": [675, 778]},
    },
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "analysis").mkdir(exist_ok=True)
    seen = {}
    records = []
    for path in sorted(SOURCE.glob("*.jpeg")):
        fingerprint = hashlib.sha256(path.read_bytes()).hexdigest()
        record = {"file": path.name, "sha256": fingerprint, "duplicate_of": seen.get(fingerprint)}
        seen.setdefault(fingerprint, path.name)
        records.append(record)
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(ROOT / ".cache/sah-face/face_landmarker.task")),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=.25,
        min_face_presence_confidence=.25,
        output_facial_transformation_matrixes=True,
    )
    views = []
    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as detector:
        for filename, annotation in PROFILES.items():
            with Image.open(SOURCE / filename) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((1152, 1536), Image.Resampling.LANCZOS)
            assert image.size == (1152, 1536), "Profile annotations require the checked portrait dimensions"
            result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(image)))
            view = {"file": filename, "size": list(image.size), **annotation, "annotation_uncertainty_pixels": 8, "detected_landmarks": 0}
            if result.face_landmarks:
                view["landmarks"] = [[point.x, point.y, point.z] for point in result.face_landmarks[0]]
                view["detected_landmarks"] = len(view["landmarks"])
                view["face_transform"] = result.facial_transformation_matrixes[0].tolist()
            overlay = image.copy()
            draw = ImageDraw.Draw(overlay)
            for name, point in annotation["points"].items():
                horizontal, vertical = point
                assert 0 <= horizontal < image.width and 0 <= vertical < image.height
                draw.ellipse((horizontal-4, vertical-4, horizontal+4, vertical+4), fill="#12d5b6")
                draw.text((horizontal+5, vertical-12), name, fill="#ffffff", stroke_width=1, stroke_fill="#162926")
            if result.face_landmarks:
                for index in [1, 4, 6, 13, 14, 61, 291, 152, 168, 234, 454]:
                    point = result.face_landmarks[0][index]
                    horizontal, vertical = point.x*image.width, point.y*image.height
                    draw.ellipse((horizontal-2, vertical-2, horizontal+2, vertical+2), fill="#ffd54a")
            overlay.save(OUTPUT / "analysis" / (Path(filename).stem+"-annotated.jpg"), quality=94)
            image.save(OUTPUT / "analysis" / (Path(filename).stem+"-oriented.png"))
            views.append(view)
    assert len(views) == 4
    report = {"files": records, "reference_files": len(records), "unique_images": len(seen), "views": views, "annotation_method": "Manually located visible-side profile points plus optional local MediaPipe landmarks; points are approximate, not calibrated ground truth", "scope": "Continue existing head-only model; no torso or accessories"}
    (OUTPUT / "analysis/profile-references.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"files": len(records), "unique_images": len(seen), "duplicates": [record for record in records if record["duplicate_of"]], "views": [{"file": view["file"], "side": view["side"], "landmarks": view["detected_landmarks"]} for view in views]}, indent=2))


if __name__ == "__main__":
    main()
