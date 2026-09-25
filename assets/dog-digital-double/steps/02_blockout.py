import bpy
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("reference_count") == 8
assert bpy.data.objects.get("DOG_BLOCKOUT") is None, "Blockout already exists"
sculpt = bpy.data.collections["02_SCULPT"]
base = bpy.data.collections.new("DOG_BASE")
sculpt.children.link(base)
anatomy_parts = []
clay = bpy.data.materials.new("MAT_Anatomy_Clay")
clay.diffuse_color = (.48, .47, .45, 1)
clay.use_nodes = True
shader = next(node for node in clay.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value = (.48, .47, .45, 1)
shader.inputs["Roughness"].default_value = .82

def move_collection(obj, owner):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    owner.objects.link(obj)

def mass(name, location, radii, main=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = radii
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_collection(obj, base)
    obj.data.materials.append(clay)
    for face in obj.data.polygons:
        face.use_smooth = True
    if main:
        anatomy_parts.append(obj)
    return obj

mass("BLOCK_Ribcage", (0, .008, .173), (.076, .129, .079))
mass("BLOCK_Pelvis", (0, .116, .162), (.067, .074, .071))
mass("BLOCK_Sternum", (0, -.083, .155), (.066, .069, .069))
mass("BLOCK_Neck", (0, -.113, .216), (.061, .057, .063))
mass("BLOCK_Cranium", (0, -.173, .279), (.075, .061, .063))
mass("BLOCK_Cheek_L", (.043, -.200, .262), (.034, .037, .042))
mass("BLOCK_Jaw", (0, -.209, .239), (.050, .032, .030))
mass("BLOCK_Muzzle_L", (.025, -.238, .253), (.027, .023, .021))
mass("BLOCK_Brow_L", (.034, -.216, .304), (.029, .025, .019))
mass("BLOCK_Shoulder_L", (.050, -.089, .161), (.030, .034, .051))
mass("BLOCK_UpperFore_L", (.056, -.088, .124), (.021, .022, .038))
mass("BLOCK_Forearm_L", (.057, -.108, .074), (.018, .021, .049))
mass("BLOCK_ForePaw_L", (.058, -.129, .018), (.027, .036, .018))
mass("BLOCK_Thigh_L", (.052, .116, .134), (.031, .039, .054))
mass("BLOCK_HindShin_L", (.056, .127, .089), (.020, .028, .037))
mass("BLOCK_Hock_L", (.056, .151, .055), (.017, .018, .033))
mass("BLOCK_HindPaw_L", (.058, .132, .017), (.026, .034, .017))
bpy.ops.object.select_all(action="DESELECT")
for obj in anatomy_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = anatomy_parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = "DOG_BLOCKOUT"
scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
mirror = body.modifiers.new("Early_Sagittal_Mirror", "MIRROR")
mirror.use_bisect_axis[0] = True
mirror.use_clip = True
mirror.use_mirror_merge = True
mirror.merge_threshold = .0002
body["stage"] = "Low-resolution masses, not a finished dog"

features = bpy.data.collections["04_EYES_NOSE"]
for side, suffix in ((1, "L"), (-1, "R")):
    eye = mass("DOG_EYE_" + suffix, (side * .034, -.233, .287), (.012, .012, .012), False)
    move_collection(eye, features)
    eye["stage"] = "Provisional anatomical eyeball, not exaggerated for cuteness"
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=5, y_subdivisions=8, size=2)
    ear = bpy.context.object
    ear.name = "DOG_EAR_" + suffix
    for vertex in ear.data.vertices:
        horizontal = vertex.co.x
        progress = (vertex.co.y + 1) / 2
        width = .010 + .014 * math.sin(progress * math.pi)
        vertex.co = (side * (.069 + .016 * math.sin(progress * math.pi * .7)) + horizontal * width, -.154 - .025 * progress + .005 * (horizontal * horizontal), .307 - .087 * progress)
    thickness = ear.modifiers.new("Ear_Cartilage_Thickness", "SOLIDIFY")
    thickness.thickness = .003
    subdivision = ear.modifiers.new("Ear_Soft_Fold", "SUBSURF")
    subdivision.levels = 2
    ear.data.materials.append(clay)
    move_collection(ear, base)
nose = mass("DOG_NOSE", (0, -.267, .264), (.017, .010, .011), False)
move_collection(nose, features)
curve = bpy.data.curves.new("Tail_Core_Curve", "CURVE")
curve.dimensions = "3D"
curve.resolution_u = 12
curve.bevel_depth = .008
curve.bevel_resolution = 3
spline = curve.splines.new("BEZIER")
tail_points = [(0, .166, .223), (.005, .209, .268), (.006, .205, .318), (.005, .158, .330), (.002, .125, .299)]
spline.bezier_points.add(len(tail_points) - 1)
for index, (point, coordinate) in enumerate(zip(spline.bezier_points, tail_points)):
    point.co = coordinate
    point.handle_left_type = point.handle_right_type = "AUTO"
    point.radius = 1 - index * .15
tail = bpy.data.objects.new("DOG_TAIL", curve)
base.objects.link(tail)
curve.materials.append(clay)

for obj in bpy.data.collections["REF_DOG"].objects:
    obj.hide_set(True)
camera_collection = bpy.data.collections["01_CAMERAS"]
view_positions = {
    "front": (0, -.92, .205), "left": (.88, -.01, .22), "right": (-.88, -.01, .22),
    "rear": (0, .89, .22), "top": (.001, -.015, 1.10), "three_quarter": (.59, -.75, .40), "close_face": (.005, -.72, .29),
}
for name, position in view_positions.items():
    data = bpy.data.cameras.new("CAM_" + name)
    camera = bpy.data.objects.new(data.name, data)
    camera_collection.objects.link(camera)
    camera.location = position
    target = Vector((0, -.19, .278) if name == "close_face" else (0, -.012, .173))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.lens = 65
    data.clip_start = .001
    data.clip_end = 100
    camera.hide_set(True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene.render.resolution_x = scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "SINGLE"
scene.display.shading.single_color = (.55, .55, .55)
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "BOTH"
scene.display.shading.background_type = "WORLD"
scene.world.color = (.16, .16, .16)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        space = area.spaces.active
        space.region_3d.view_rotation = scene.camera.rotation_euler.to_quaternion()
        space.region_3d.view_location = Vector((0, -.02, .173))
        space.region_3d.view_distance = .85
        space.lens = 65
        space.overlay.show_overlays = False
scene["identity_gate"] = "Bare blockout under review; no fur or materials used to conceal proportions"
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_01_blockout.blend")
for name in ("front", "left", "right", "rear", "top", "three_quarter"):
    scene.camera = bpy.data.objects["CAM_" + name]
    scene.render.filepath = OUT + "/blockout/" + name + ".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
print(json.dumps({"phase": "bare_blockout", "body_vertices": len(body.data.vertices), "early_mirror": True, "rendered_views": 6, "fur_objects": 0}))
