import bpy
import json
import math
from mathutils import Vector, Quaternion

ROOT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT = ROOT + "/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.name == "Dog_Digital_Double_MCP", "Use the dedicated MCP scene"

def group(name, parent=None):
    result = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    owner = parent or scene.collection
    if result.name not in owner.children:
        owner.children.link(result)
    return result

startup = group("99_STARTUP_PRESERVED")
for obj in list(scene.objects):
    if obj.name in {"Cube", "Camera", "Light"}:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        obj.name = "STARTUP_" + obj.name
        startup.objects.link(obj)
startup.hide_viewport = True
startup.hide_render = True
collections = {name: group(name) for name in ("00_REFERENCE", "01_CAMERAS", "02_SCULPT", "03_RETOPO", "04_EYES_NOSE", "05_GROOM", "06_RIG", "07_LIGHTING", "08_EXPORT")}
references = group("REF_DOG", collections["00_REFERENCE"])
landmarks = group("REF_ANATOMICAL_LANDMARKS", collections["00_REFERENCE"])
references.hide_render = True
landmarks.hide_render = True
scene.unit_settings.system = "METRIC"
scene.unit_settings.length_unit = "CENTIMETERS"

views = [
    ("front", "36", (.016, -.91, .44), (0, -.105, .18), 52, "Facial landmarks and broad chest; slight head tilt."),
    ("front_close", "40", (0, -.69, .30), (0, -.18, .19), 48, "Nose, moustache and chin; close perspective magnifies muzzle."),
    ("front_34", "52", (-.13, -.91, .44), (0, -.12, .18), 52, "Head width, low muzzle, brow and asymmetric ear silhouette."),
    ("top_standing", "44", (-.30, -.58, 1.08), (0, -.015, .15), 50, "Compact torso, brown saddle, curled white plume."),
    ("rear_top", "31", (.07, .83, .70), (0, .04, .17), 48, "Rear markings and tail base; held tail is not the neutral tail pose."),
    ("upright", "48", (0, -.95, .54), (0, -.10, .24), 50, "White chest and short limb proportions; posed upright, not a whole-body silhouette target."),
    ("belly_01", "56", (.20, -.23, -.78), (0, -.015, .15), 48, "White belly and limb feathering; supine pose, compare intrinsic dimensions only."),
    ("belly_02", "00", (.08, -.12, -.86), (0, -.015, .15), 48, "Second underside confirmation; limbs are flexed and partly occluded."),
]
manifest = []
for index, (role, stamp, position, target, lens, note) in enumerate(views):
    minute = "08" if stamp == "00" else "07"
    path = ROOT + "/picsFOR3dModler/ChatGPT Image Sep 23, 2026, 06_" + minute + "_" + stamp + " PM.jpg"
    image = bpy.data.images.load(path, check_existing=True)
    image.pack()
    reference = bpy.data.objects.new("REF_" + role, None)
    references.objects.link(reference)
    reference.empty_display_type = "IMAGE"
    reference.data = image
    reference.empty_display_size = .40
    reference.color[3] = .55
    reference.empty_image_depth = "FRONT"
    reference.location = ((index % 4 - 1.5) * .46, .8, .65 - (index // 4) * .57)
    reference.rotation_euler = (math.pi / 2, 0, 0)
    reference.lock_location = reference.lock_rotation = reference.lock_scale = (True, True, True)
    reference.hide_select = True
    reference["Evidence"] = note
    data = bpy.data.cameras.new("CAM_REF_%02d" % (index + 1))
    camera = bpy.data.objects.new(data.name, data)
    collections["01_CAMERAS"].objects.link(camera)
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.type = "PERSP"
    data.lens = lens
    data.sensor_fit = "HORIZONTAL"
    data.clip_start = .003
    data.clip_end = 100
    data.show_background_images = True
    background = data.background_images.new()
    background.image = image
    background.alpha = .38
    background.display_depth = "FRONT"
    background.frame_method = "FIT"
    camera["source_width"] = image.size[0]
    camera["source_height"] = image.size[1]
    camera["reference_role"] = role
    camera["comparison_limit"] = note
    camera["fit_status"] = "Perspective starting estimate; not yet landmark-fitted"
    camera.hide_set(True)
    manifest.append({"reference": reference.name, "camera": camera.name, "size": list(image.size), "lens_estimate": lens, "note": note})

points = {
    "skull_top": (0, -.170, .344), "skull_left": (-.078, -.175, .285), "skull_right": (.078, -.175, .285),
    "chin": (0, -.223, .219), "nose_tip": (0, -.269, .263), "nose_left": (-.017, -.263, .264), "nose_right": (.017, -.263, .264),
    "eye_L": (.034, -.234, .287), "eye_R": (-.034, -.234, .286),
    "eye_inner_L": (.022, -.242, .286), "eye_outer_L": (.047, -.234, .287), "eye_inner_R": (-.022, -.242, .285), "eye_outer_R": (-.047, -.234, .286),
    "brow_L": (.036, -.223, .307), "brow_R": (-.035, -.224, .308),
    "blaze_crown": (.003, -.175, .344), "blaze_forehead": (-.002, -.231, .317), "blaze_bridge": (0, -.250, .278),
    "muzzle_left": (-.048, -.244, .247), "muzzle_right": (.048, -.244, .247),
    "ear_root_L": (.068, -.156, .307), "ear_root_R": (-.068, -.153, .309),
    "ear_tip_L": (.086, -.181, .215), "ear_tip_R": (-.084, -.178, .220),
    "neck_base": (0, -.085, .207), "withers": (0, -.064, .254),
    "shoulder_L": (.057, -.097, .191), "shoulder_R": (-.057, -.097, .191),
    "sternum": (0, -.136, .151), "ribcage_left": (-.080, -.015, .187), "ribcage_right": (.080, -.015, .187),
    "belly": (0, .042, .102), "hip_L": (.055, .116, .180), "hip_R": (-.055, .116, .180),
    "rump": (0, .181, .188), "tail_root": (0, .168, .238),
    "elbow_L": (.057, -.078, .119), "elbow_R": (-.057, -.078, .119),
    "wrist_L": (.057, -.114, .049), "wrist_R": (-.057, -.114, .049),
    "fore_paw_L": (.058, -.128, .016), "fore_paw_R": (-.058, -.128, .016),
    "knee_L": (.056, .095, .122), "knee_R": (-.056, .095, .122),
    "hock_L": (.056, .149, .064), "hock_R": (-.056, .149, .064),
    "rear_paw_L": (.058, .133, .016), "rear_paw_R": (-.058, .133, .016),
    "ground": (0, 0, 0), "tail_bend": (.007, .213, .304), "tail_tip": (.004, .110, .302),
    "plume_top": (.01, .166, .365),
}
for name, position in points.items():
    obj = bpy.data.objects.new("LM_" + name, None)
    landmarks.objects.link(obj)
    obj.empty_display_type = "SPHERE"
    obj.empty_display_size = .002
    obj.location = position
    obj.show_in_front = True
    obj["confidence"] = "high relative facial ratio" if any(token in name for token in ("eye", "nose", "blaze", "muzzle")) else "inferred beneath fur; provisional"
    obj.hide_set(True)
scene["reference_analysis"] = json.dumps({"views": manifest, "provisional_landmarks_meters": points, "limits": "No calibrated side view or physical measurement. Facial ratios carry more confidence than occluded joints. The posed views are not neutral-pose silhouettes."}, indent=2)
scene["reference_count"] = len(manifest)
scene["landmark_count"] = len(points)
scene["identity_gate"] = "Reference setup; anatomy not started"
scene.camera = bpy.data.objects["CAM_REF_01"]
scene.render.resolution_x = 1152
scene.render.resolution_y = 1536
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        area.spaces.active.region_3d.view_rotation = Quaternion((1, 0, 0), math.pi / 2)
        area.spaces.active.region_3d.view_location = Vector((0, .8, .36))
        area.spaces.active.region_3d.view_distance = 2.65
        area.spaces.active.clip_start = .001
        area.spaces.active.overlay.show_floor = False
        area.spaces.active.overlay.show_axis_x = False
        area.spaces.active.overlay.show_axis_y = False
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_00_reference.blend")
assert len(references.objects) == 8
assert len([obj for obj in collections["01_CAMERAS"].objects if obj.type == "CAMERA"]) == 8
print(json.dumps({"phase": "references", "images": len(references.objects), "landmarks": len(points), "perspective_cameras": 8}))
