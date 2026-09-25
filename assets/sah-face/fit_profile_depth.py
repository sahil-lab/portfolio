"""Constrained profile-depth fitting with fixed front projection and visible landmark uncertainty."""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.optimize import least_squares
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/sah-face/profile-revision"
TARGET = np.array([0., .035, .165])
FOCAL = 1900.
FEATURE_IDS = {"forehead": 10, "brow": 9, "nasion": 168, "nose_tip": 4, "subnasale": 164, "upper_lip": 0, "lower_lip": 17, "chin_front": 199, "chin_base": 152}
DEPTH_FIELDS = [
    {"name": "chin", "center": [0., .057], "radii": [.052, .026]},
    {"name": "lips", "center": [0., .094], "radii": [.038, .020]},
    {"name": "nose_root", "center": [0., .170], "radii": [.035, .026]},
    {"name": "nose_tip", "center": [0., .133], "radii": [.026, .018]},
    {"name": "forehead", "center": [0., .221], "radii": [.075, .033]},
]


def camera_axes(parameters):
    yaw, pitch, roll = parameters[:3]
    right = np.array([math.cos(yaw), math.sin(yaw), 0.])
    backward = np.array([math.sin(yaw)*math.cos(pitch), -math.cos(yaw)*math.cos(pitch), math.sin(pitch)])
    up = np.cross(backward, right)
    return right*math.cos(roll)+up*math.sin(roll), up*math.cos(roll)-right*math.sin(roll), backward


def project(points, parameters):
    right, up, backward = camera_axes(parameters)
    offset = points-TARGET
    denominator = np.exp(parameters[3])-offset@backward
    return np.column_stack((parameters[4]+FOCAL*(offset@right)/denominator, parameters[5]-FOCAL*(offset@up)/denominator))


def front_preserving_depth(point, adjustment):
    result = point.copy()
    total = 0.
    for field, displacement in zip(DEPTH_FIELDS, adjustment):
        horizontal = (point[0]-field["center"][0])/field["radii"][0]
        vertical = (point[2]-field["center"][1])/field["radii"][1]
        front_mask = 1.-np.clip((point[1]-.015)/.075, 0., 1.)
        total += displacement*math.exp(-horizontal*horizontal-vertical*vertical)*front_mask
    result[1] += total
    ratio = (.70+result[1])/(.70+point[1])
    result[0] *= ratio
    result[2] = .165+(point[2]-.165)*ratio
    return result


def main():
    profiles = json.loads((OUTPUT / "analysis/profile-references.json").read_text(encoding="utf-8"))["views"]
    front = json.loads((ROOT / "outputs/sah-face/analysis/reference-analysis.json").read_text(encoding="utf-8"))
    raw = np.array([[float(value) for value in line.split()[1:4]] for line in (OUTPUT / "analysis/baseline-head.obj").read_text().splitlines() if line.startswith("v ")])
    vertices = np.column_stack((raw[:, 0], -raw[:, 2], raw[:, 1]))
    assert vertices[:, 2].max() > .25 and vertices[:, 1].min() < -.03
    tree = cKDTree(vertices)
    base = {name: vertices[tree.query(front["face_vertices"][index])[1]] for name, index in FEATURE_IDS.items()}
    cameras = []
    fits = []
    for view in profiles:
        side = -1 if view["side"] == "R" else 1
        yaw = math.radians(side*(88 if "primary" in view["role"] else 80))
        points = dict(base)
        points["ear_tragus"] = np.array([side*.075770564, .047992606, .131 if side < 0 else .129])
        points["ear_top"] = np.array([side*.084, .057, .164])
        points["ear_lobe"] = np.array([side*.083, .054, .106])
        points["crown"] = vertices[vertices[:, 2].argmax()]
        points["occiput"] = vertices[vertices[:, 1].argmax()]
        if "eye_outer" in view["points"]:
            points["eye_outer"] = vertices[tree.query(front["landmarks"]["eye_outer_"+view["side"]])[1]]
        names = [name for name in points if name in view["points"] and name != "occiput"]
        observed = np.array([view["points"][name] for name in names])
        source = np.array([points[name].copy() for name in names])
        for index, name in enumerate(names):
            if name.startswith("ear_"):
                source[index, 1] += .028
                source[index, 2] += .010
            elif name == "crown":
                source[index, 1] += .012
        initial = np.array([yaw, 0., math.radians(5 if side < 0 else -12), math.log(.66), 650., 740.])
        lower = np.array([yaw-.23, -.60, -.55, math.log(.40), 100., 250.])
        upper = np.array([yaw+.23, .40, .55, math.log(1.10), 1000., 1150.])

        def residual(parameters, names=names, source=source, observed=observed, yaw=yaw):
            weights = np.array([.45 if name == "crown" else .60 if name.startswith("ear_") else 1. for name in names])
            position = ((project(source, parameters)-observed)*weights[:,None]).ravel()/8.
            prior = [(parameters[0]-yaw)/.11, parameters[1]/.35]
            return np.concatenate((position, prior))

        fit = least_squares(residual, initial, bounds=(lower, upper), loss="soft_l1", max_nfev=300)
        cameras.append(fit.x)
        fits.append({"view": view, "points": points, "names": names, "observed": observed})

    prior = np.array([-.006, -.004, .003, 0., 0., .028, .022, .010])
    lower = np.array([-.020, -.012, -.010, -.008, -.010, .005, 0., -.004])
    upper = np.array([.010, .012, .016, .010, .016, .047, .040, .022])

    def transformed(points, adjustment):
        result = {}
        for name, point in points.items():
            if name.startswith("ear_"):
                target = point.copy()
                target[1] += adjustment[5]
                target[2] += adjustment[7]
            elif name == "occiput":
                target = point.copy()
                target[1] += adjustment[6]
            elif name == "crown":
                target = point.copy()
                target[1] += adjustment[6]*.55
            else:
                target = front_preserving_depth(point, adjustment)
            result[name] = target
        return result

    def depth_residual(adjustment):
        values = []
        for item, camera in zip(fits, cameras):
            if "primary" not in item["view"]["role"]:
                continue
            changed = transformed(item["points"], adjustment)
            for name in item["points"]:
                if name not in item["view"]["points"]:
                    continue
                weight = .6 if name in {"crown", "occiput"} else .75 if name.startswith("ear_") else 1.
                values.extend((project(np.array([changed[name]]), camera)[0]-item["view"]["points"][name])/10.*weight)
        values.extend((adjustment-prior)/np.array([.012,.009,.009,.007,.010,.015,.012,.008]))
        return np.array(values)

    solution = least_squares(depth_residual, prior, bounds=(lower, upper), loss="soft_l1", max_nfev=200)
    result = {"fields": DEPTH_FIELDS, "depth_offsets_m": solution.x[:5].tolist(), "ear_backward_m": float(solution.x[5]), "ear_upward_m": float(solution.x[7]), "rear_skull_backward_m": float(solution.x[6]), "front_projection_preserved": True, "cameras": [], "assumptions": "Visible side annotations are approximate; camera pose estimated with bounded ear/skull priors. Secondary oblique views withheld from the depth fit. No metric calibration."}
    for item, camera in zip(fits, cameras):
        view, points = item["view"], item["points"]
        changed = transformed(points, solution.x)
        names = [name for name in points if name in view["points"]]
        observed = np.array([view["points"][name] for name in names])
        before = project(np.array([points[name] for name in names]), camera)
        after = project(np.array([changed[name] for name in names]), camera)
        right, up, backward = camera_axes(camera)
        entry = {"file": view["file"], "side": view["side"], "role": view["role"], "camera_parameters": camera.tolist(), "location": (TARGET+backward*np.exp(camera[3])).tolist(), "right": right.tolist(), "up": up.tolist(), "backward": backward.tolist(), "focal_mm": FOCAL/1152*36, "shift_x": (.5-camera[4]/1152), "shift_y": (camera[5]-768)/1152, "mean_annotation_error_before_px": float(np.mean(np.linalg.norm(before-observed, axis=1))), "mean_annotation_error_after_px": float(np.mean(np.linalg.norm(after-observed, axis=1))), "points": {name: {"before": points[name].tolist(), "after": changed[name].tolist(), "reference_pixel": view["points"][name], "before_pixel": before[index].tolist(), "after_pixel": after[index].tolist()} for index, name in enumerate(names)}}
        result["cameras"].append(entry)
        with Image.open(OUTPUT / "analysis" / (Path(view["file"]).stem+"-oriented.png")) as source_image:
            image = source_image.convert("RGB")
        draw = ImageDraw.Draw(image)
        for name, reference, old, new in zip(names, observed, before, after):
            draw.ellipse((reference[0]-4,reference[1]-4,reference[0]+4,reference[1]+4),fill="#00e9b5")
            draw.line((tuple(old),tuple(new)),fill="#ffffff",width=2)
            draw.ellipse((old[0]-3,old[1]-3,old[0]+3,old[1]+3),fill="#f47a56")
            draw.ellipse((new[0]-3,new[1]-3,new[0]+3,new[1]+3),fill="#3ba7ff")
        image.save(OUTPUT / "analysis" / (Path(view["file"]).stem+"-depth-fit.jpg"),quality=94)
    assert all(np.isfinite(solution.x))
    primary = [view for view in result["cameras"] if "primary" in view["role"]]
    assert sum(view["mean_annotation_error_after_px"] for view in primary) < sum(view["mean_annotation_error_before_px"] for view in primary)
    (OUTPUT / "analysis/profile-fit.json").write_text(json.dumps(result, indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"depth_offsets_mm": dict(zip([field["name"] for field in DEPTH_FIELDS], (solution.x[:5]*1000).tolist())), "ear_backward_mm":solution.x[5]*1000,"ear_upward_mm":solution.x[7]*1000,"rear_skull_backward_mm":solution.x[6]*1000,"camera_fits":[{key:entry[key] for key in ("file","mean_annotation_error_before_px","mean_annotation_error_after_px")} for entry in result["cameras"]]},indent=2))


if __name__ == "__main__":
    main()
