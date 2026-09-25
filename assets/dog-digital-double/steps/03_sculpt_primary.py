import bpy
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
original = bpy.data.objects["DOG_BLOCKOUT"]
body = bpy.data.objects.get("DOG_SCULPT_HIGH")
if body is None:
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    body = original.copy()
    body.data = original.data.copy()
    body.name = "DOG_SCULPT_HIGH"
    bpy.data.collections["02_SCULPT"].objects.link(body)
    original.hide_set(True)
    original.hide_render = True
    body.hide_set(False)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier="Early_Sagittal_Mirror")
    for vertex in body.data.vertices:
        coordinate = vertex.co
        coordinate.z = coordinate.z * .83 if coordinate.z < .14 else coordinate.z - .0238
        if coordinate.y < -.13:
            coordinate.x *= 1.045
        if coordinate.y < -.221 and coordinate.z > .268:
            weight = math.exp(-((coordinate.z - .281) / .020) ** 2)
            coordinate.y += .009 * weight
        if coordinate.y < -.24 and coordinate.z < .254:
            coordinate.y += .004
    for obj in list(bpy.data.collections["04_EYES_NOSE"].objects):
        obj.location.z -= .0238
        if obj.name == "DOG_NOSE":
            obj.location.y += .004
    for suffix in ("L", "R"):
        ear = bpy.data.objects["DOG_EAR_" + suffix]
        for vertex in ear.data.vertices:
            vertex.co.z -= .0238
    for point in bpy.data.objects["DOG_TAIL"].data.splines[0].bezier_points:
        point.co.z -= .0238
    for landmark in bpy.data.collections["REF_ANATOMICAL_LANDMARKS"].objects:
        height = landmark.location.z
        landmark.location.z = height * .83 if height < .14 else height - .0238
    body.data.remesh_voxel_size = .0015
    bpy.ops.object.voxel_remesh()
    transition = body.modifiers.new("Primary_Mass_Transition_Smoothing", "SMOOTH")
    transition.factor = .7
    transition.iterations = 9
    bpy.ops.object.modifier_apply(modifier=transition.name)
body.select_set(True)
bpy.context.view_layer.objects.active = body
for polygon in body.data.polygons:
    polygon.use_smooth = True
before = [vertex.co.copy() for vertex in body.data.vertices]
window = bpy.context.window_manager.windows[0]
area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
region = next(region for region in area.regions if region.type == "WINDOW")
with bpy.context.temp_override(window=window, area=area, region=region):
    if body.mode != "SCULPT":
        bpy.ops.object.mode_set(mode="SCULPT")
    bpy.ops.brush.asset_activate(asset_library_type="ESSENTIALS", relative_asset_identifier="brushes/essentials_brushes-mesh_sculpt.blend/Brush/Smooth")
    brush = scene.tool_settings.sculpt.brush
    assert brush is not None
    brush.size = 105
    brush.strength = .45
    scene.tool_settings.sculpt.unified_paint_settings.use_unified_size = False
    scene.tool_settings.sculpt.unified_paint_settings.use_unified_strength = False
    paths = [
        [(.034, -.235, .270), (.047, -.230, .262), (.055, -.219, .252)],
        [(-.034, -.235, .270), (-.047, -.230, .262), (-.055, -.219, .252)],
        [(.050, -.132, .194), (.059, -.116, .180), (.064, -.095, .171)],
        [(-.050, -.132, .194), (-.059, -.116, .180), (-.064, -.095, .171)],
    ]
    for path in paths:
        samples = []
        for index, coordinate in enumerate(path):
            def distance_to_target(vertex):
                return (vertex.co - Vector(coordinate)).length_squared
            point = min(body.data.vertices, key=distance_to_target).co.copy()
            screen_point = area.spaces.active.region_3d.perspective_matrix @ (body.matrix_world @ point).to_4d()
            mouse = ((screen_point.x / screen_point.w + 1) * region.width / 2, (screen_point.y / screen_point.w + 1) * region.height / 2)
            samples.append({"name": "SculptStroke", "location": tuple(point), "mouse": mouse, "mouse_event": mouse, "pressure": .7, "size": 105, "time": index * .08, "is_start": index == 0, "x_tilt": 0, "y_tilt": 0})
        bpy.ops.sculpt.brush_stroke(stroke=samples, mode="NORMAL", override_location=False)
    bpy.ops.object.mode_set(mode="OBJECT")
changed = sum((vertex.co - earlier).length > 1e-8 for vertex, earlier in zip(body.data.vertices, before))
body["native_sculpt_vertices_changed"] = changed
body["native_sculpt_brush"] = "Smooth"
body["stage"] = "Unified anatomical sculpt with verified native brush strokes; facial refinement pending"
assert changed > 0, "Native sculpt strokes did not change geometry"
for camera in bpy.data.collections["01_CAMERAS"].objects:
    if camera.name.startswith("CAM_") and not camera.name.startswith("CAM_REF_"):
        camera.data.lens = 50 if camera.name != "CAM_close_face" else 65
scene["identity_gate"] = "Primary sculpt under multi-view review; no fur"
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_02_sculpt.blend")
for name in ("front", "left", "right", "rear", "top", "three_quarter", "close_face"):
    scene.camera = bpy.data.objects["CAM_" + name]
    scene.render.filepath = OUT + "/sculpt/" + name + ".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
print(json.dumps({"phase": "primary_sculpt", "vertices": len(body.data.vertices), "native_sculpt_vertices_changed": changed, "mirror_applied": True, "fur_objects": 0}))
