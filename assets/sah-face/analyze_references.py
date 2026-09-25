"""Fit local portrait landmarks and prepare an editable anatomical starting surface."""
import hashlib
import json
import math
import urllib.request
from pathlib import Path

import mediapipe as mp
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "picsofSah"
OUTPUT = ROOT / "outputs/sah-face"
TOOLS = ROOT / ".cache/sah-face"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
TOPOLOGY_URL = "https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj"


def acquire(url, target):
    if not target.exists():
        urllib.request.urlretrieve(url, target)
    assert target.stat().st_size > 1000


def boundaries(faces):
    edges = {}
    for face in faces:
        for first, second in zip(face, face[1:] + face[:1]):
            key = tuple(sorted((first, second)))
            edges.setdefault(key, []).append((first, second))
    remaining = {pair[0] for pair in edges.values() if len(pair) == 1}
    loops = []
    while remaining:
        first, second = remaining.pop()
        loop = [first, second]
        while loop[-1] != loop[0]:
            next_edge = next((edge for edge in remaining if edge[0] == loop[-1]), None)
            if next_edge is None:
                reverse = next((edge for edge in remaining if edge[1] == loop[-1]), None)
                if reverse is None:
                    raise ValueError("Open topology boundary chain")
                remaining.remove(reverse)
                loop.append(reverse[0])
            else:
                remaining.remove(next_edge)
                loop.append(next_edge[1])
        loops.append(loop[:-1])
    return loops


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    TOOLS.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "analysis").mkdir(exist_ok=True)
    (OUTPUT / "textures").mkdir(exist_ok=True)
    acquire(MODEL_URL, TOOLS / "face_landmarker.task")
    acquire(TOPOLOGY_URL, TOOLS / "canonical_face_model.obj")
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(TOOLS / "face_landmarker.task")),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=.35,
        min_face_presence_confidence=.35,
        output_facial_transformation_matrixes=True,
    )
    records = []
    fits = {}
    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as landmarker:
        for filename in sorted(SOURCE.glob("*.jpeg")):
            image = ImageOps.exif_transpose(Image.open(filename)).convert("RGB")
            image.thumbnail((1536, 1536), Image.Resampling.LANCZOS)
            array = np.asarray(image)
            result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=array))
            record = {"source": filename.name, "size": list(image.size), "sha256": hashlib.sha256(filename.read_bytes()).hexdigest(), "faces_detected": len(result.face_landmarks)}
            if result.face_landmarks:
                coordinates = [[point.x, point.y, point.z] for point in result.face_landmarks[0]]
                fits[filename.name] = {"landmarks": coordinates, "size": list(image.size)}
                record["landmarks"] = len(coordinates)
                overlay = image.copy()
                draw = ImageDraw.Draw(overlay)
                for index in [10, 152, 1, 4, 5, 6, 33, 133, 362, 263, 61, 291, 13, 14, 234, 454, 168, 70, 300, 468, 473]:
                    horizontal, vertical, depth = coordinates[index]
                    point = (horizontal*image.width, vertical*image.height)
                    draw.ellipse((point[0]-3, point[1]-3, point[0]+3, point[1]+3), fill="#44e2cd")
                    draw.text((point[0]+4, point[1]+2), str(index), fill="#ffffca")
                overlay.save(OUTPUT / "analysis" / (filename.stem + "-landmarks.jpg"), quality=94)
            records.append(record)
    assert "IMG_8520.jpeg" in fits, "The primary close portrait must provide a valid face fit"
    primary = fits["IMG_8520.jpeg"]
    landmarks = np.array(primary["landmarks"])
    width, height = primary["size"]
    pixels = landmarks[:, :2] * [width, height]
    left_eye, right_eye = pixels[468], pixels[473]
    ipd_pixels = float(np.linalg.norm(left_eye-right_eye))
    metric_per_pixel = .064 / ipd_pixels
    eye_center = (left_eye+right_eye)/2
    distance = .70
    focal_pixels = distance / metric_per_pixel
    reference_depth = (landmarks[468, 2]+landmarks[473, 2])/2
    mesh_points = []
    for index, landmark in enumerate(landmarks):
        depth = float((landmark[2]-reference_depth)*width*metric_per_pixel)
        depth = max(-.045, min(.065, depth))
        camera_depth = distance + depth
        horizontal = (pixels[index, 0]-eye_center[0]) * camera_depth/focal_pixels
        vertical = .165 + (eye_center[1]-pixels[index, 1]) * camera_depth/focal_pixels
        mesh_points.append([float(horizontal), float(depth), float(vertical)])
    vertices = mesh_points[:468]
    faces = []
    for line in (TOOLS / "canonical_face_model.obj").read_text(encoding="utf-8").splitlines():
        if line.startswith("f "):
            faces.append([int(token.split("/")[0])-1 for token in line.split()[1:]])
    assert len(vertices) == 468 and len(faces) > 800
    apertures = [
        {33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246},
        {263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466},
        {78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191},
    ]
    faces = [face for face in faces if not any(set(face).issubset(aperture) for aperture in apertures)]
    loops = boundaries(faces)
    outer = max(loops, key=len)
    regions = [0] * len(faces)
    uv = [[float(landmarks[index, 0]), float(1-landmarks[index, 1])] for index in range(468)]
    center_height = .183
    original = np.array(vertices)
    previous = outer
    for ring in range(1, 17):
        progress = ring/17
        current = []
        for index in outer:
            horizontal, depth, vertical = original[index]
            shrink = math.cos(progress*math.pi/2)
            upper = max(0, min(1, (vertical-.170)/.070))
            lower = max(0, min(1, (.110-vertical)/.060))
            skull_x = horizontal * shrink * (1+.11*math.sin(progress*math.pi))
            skull_z = center_height + (vertical-center_height)*shrink + upper*.055*math.sin(progress*math.pi) - lower*.016*math.sin(progress*math.pi)
            skull_y = depth*(1-progress)+.143*math.sin(progress*math.pi/2)
            current.append(len(vertices))
            vertices.append([float(skull_x),float(skull_y),float(skull_z)])
            uv.append([float((math.atan2(skull_x,skull_y-.02)+math.pi)/math.tau),float((skull_z-.035)/.27)])
        for index in range(len(outer)):
            faces.append([previous[(index+1)%len(outer)],previous[index],current[index],current[(index+1)%len(outer)]])
            regions.append(1)
        previous = current
    cap = len(vertices)
    vertices.append([0,.143,center_height])
    uv.append([.5,.5])
    for index in range(len(previous)):
        faces.append([previous[(index+1)%len(previous)],previous[index],cap])
        regions.append(1)
    facial_boundaries = []
    for loop in loops:
        if loop is outer:
            continue
        center = np.mean(original[loop], axis=0)
        role = "mouth" if center[2] < .13 else "eye"
        facial_boundaries.append({"role":role,"indices":loop,"center":center.tolist()})
        current = []
        for index in loop:
            point = original[index].copy()
            point[1] += .008 if role == "eye" else .014
            current.append(len(vertices))
            vertices.append(point.tolist())
            uv.append(uv[index])
        for index in range(len(loop)):
            faces.append([loop[(index+1)%len(loop)],loop[index],current[index],current[(index+1)%len(loop)]])
            regions.append(2)
        cap = len(vertices)
        center[1] += .018
        vertices.append(center.tolist())
        uv.append([.5,.5])
        for index in range(len(current)):
            faces.append([current[(index+1)%len(current)],current[index],cap])
            regions.append(2)
    source_image = ImageOps.exif_transpose(Image.open(SOURCE / "IMG_8520.jpeg")).convert("RGB")
    source_image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    source_image.save(OUTPUT / "textures/portrait_reference_color.png")
    lines = ["mtllib landmark-head.mtl", "o SAH_LandmarkFitted_Head"]
    lines.extend("v %.9f %.9f %.9f" % tuple(point) for point in vertices)
    lines.extend("vt %.9f %.9f" % tuple(point) for point in uv)
    current_region = None
    for face, region in zip(faces, regions):
        if region != current_region:
            lines.append("usemtl " + ["Face_Reference_Color", "Skull_Base", "Cavity_Base"][region])
            current_region = region
        lines.append("f " + " ".join("%d/%d" % (index+1,index+1) for index in face))
    (OUTPUT / "analysis/landmark-head.obj").write_text("\n".join(lines)+"\n", encoding="ascii")
    (OUTPUT / "analysis/landmark-head.mtl").write_text("newmtl Face_Reference_Color\nKd 0.55 0.35 0.24\n\nnewmtl Skull_Base\nKd 0.55 0.35 0.24\n\nnewmtl Cavity_Base\nKd 0.09 0.04 0.035\n",encoding="ascii")
    landmark_names = {"chin":152,"forehead":10,"nose_tip":1,"nose_bridge":6,"nose_root":168,"mouth_upper":13,"mouth_lower":14,"mouth_corner_R":61,"mouth_corner_L":291,"eye_inner_R":133,"eye_outer_R":33,"eye_inner_L":362,"eye_outer_L":263,"iris_R":468,"iris_L":473,"cheek_R":234,"cheek_L":454}
    data = {"reference_count":len(records),"references":records,"primary":"IMG_8520.jpeg","all_detected_fits":fits,"face_vertices":mesh_points,"landmarks":{name:mesh_points[index] for name,index in landmark_names.items()},"facial_boundaries":facial_boundaries,"camera":{"position":[0,-distance,.165],"target":[0,0,.165],"focal_pixels":focal_pixels,"focal_mm":focal_pixels/width*36,"sensor_width":36,"image_width":width,"image_height":height,"principal_pixel":eye_center.tolist()},"metric_scale":"Assumed 64 mm interpupillary distance; no physical measurement supplied","depth_limit":"MediaPipe z is a monocular learned estimate; side profile is not validated","topology_source":TOPOLOGY_URL,"topology_license":"MediaPipe, Apache-2.0; topology only, not a stock identity"}
    (OUTPUT / "analysis/reference-analysis.json").write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"references":records,"mesh_vertices":len(vertices),"mesh_faces":len(faces),"boundary_loops":[len(loop) for loop in loops],"iris_distance_px":ipd_pixels,"landmarks":data["landmarks"],"camera":data["camera"]},indent=2))


if __name__ == "__main__":
    main()
