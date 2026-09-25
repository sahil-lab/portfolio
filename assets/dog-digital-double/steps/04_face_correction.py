import bpy
import bmesh
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_SCULPT_HIGH"]
assert body.get("native_sculpt_vertices_changed", 0) > 0
assert not body.get("facial_correction_complete")
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
blend = body.modifiers.new("Sculpt_Mass_Continuity", "SMOOTH")
blend.factor = .85
blend.iterations = 60
bpy.ops.object.modifier_apply(modifier=blend.name)
window = bpy.context.window_manager.windows[0]
area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
region = next(region for region in area.regions if region.type == "WINDOW")

def proportional_move(target, delta, radius):
    center = Vector(target)
    closest = None
    distance = float("inf")
    for vertex in body.data.vertices:
        current = (vertex.co - center).length_squared
        if current < distance:
            distance = current
            closest = vertex.co.copy()
    anchor = next(vertex for vertex in body.data.vertices if vertex.co.y > .15)
    anchor_index = anchor.index
    anchor_position = anchor.co.copy()
    with bpy.context.temp_override(window=window, area=area, region=region):
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_mode(type="VERT")
        bpy.ops.mesh.select_all(action="DESELECT")
        mesh = bmesh.from_edit_mesh(body.data)
        for vertex in mesh.verts:
            vertex.select_set((vertex.co - closest).length < .004)
        bmesh.update_edit_mesh(body.data)
        bpy.ops.transform.translate(value=delta, use_proportional_edit=True, proportional_edit_falloff="SMOOTH", proportional_size=radius, use_proportional_connected=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    assert (body.data.vertices[anchor_index].co - anchor_position).length < 1e-7, "A face edit unexpectedly moved the rump"

proportional_move((.035, -.237, .279), (0, .014, -.001), .036)
proportional_move((-.035, -.237, .279), (0, .013, -.0015), .035)
proportional_move((.026, -.251, .230), (0, .008, 0), .025)
proportional_move((-.026, -.251, .230), (0, .0085, 0), .025)
proportional_move((.071, -.181, .269), (.003, -.001, 0), .036)
proportional_move((-.071, -.181, .269), (-.0025, -.001, 0), .036)
features = bpy.data.collections["04_EYES_NOSE"]

def assign_collection(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    features.objects.link(obj)

def surface(name, color, roughness, transmission=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1)
    shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Transmission Weight"].default_value = transmission
    return material, shader

eye_material, eye_shader = surface("DOG_Eye_Dark_Iris", (.010, .006, .003), .24)
eye_shader.inputs["Coat Weight"].default_value = .25
cornea_material, cornea_shader = surface("DOG_Eye_Clear_Cornea", (1, 1, 1), .065, 1)
cornea_shader.inputs["IOR"].default_value = 1.38
pupil_material, pupil_shader = surface("DOG_Pupil", (.001, .0007, .0005), .30)
lid_material, lid_shader = surface("DOG_Lid_Pigmented_Skin", (.024, .015, .009), .64)
nose_material, nose_shader = surface("DOG_Nose_Satin_Leather", (.011, .009, .007), .46)

for side, suffix in ((1, "L"), (-1, "R")):
    eye = bpy.data.objects["DOG_EYE_" + suffix]
    eye.location.y += .009
    eye.location.z += .001 if side == 1 else .0004
    eye.location.x += side * .0007
    eye.data.materials.clear()
    eye.data.materials.append(eye_material)
    cutter = eye.copy()
    cutter.data = eye.data.copy()
    cutter.name = "TEMP_Socket_Cutter_" + suffix
    features.objects.link(cutter)
    cutter.scale *= 1.09
    bpy.context.view_layer.objects.active = body
    socket = body.modifiers.new("Sculpt_Eye_Socket_" + suffix, "BOOLEAN")
    socket.operation = "DIFFERENCE"
    socket.solver = "EXACT"
    socket.object = cutter
    bpy.ops.object.modifier_apply(modifier=socket.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    cornea = eye.copy()
    cornea.data = eye.data.copy()
    cornea.name = "DOG_CORNEA_" + suffix
    features.objects.link(cornea)
    cornea.scale *= 1.012
    cornea.data.materials.clear()
    cornea.data.materials.append(cornea_material)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=1, location=eye.location + Vector((0, -.0105, 0)))
    pupil = bpy.context.object
    pupil.name = "DOG_PUPIL_" + suffix
    pupil.scale = (.0051, .0017, .0051)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    pupil.data.materials.append(pupil_material)
    assign_collection(pupil)
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=.0106, fill_type="NOTHING", location=eye.location + Vector((0, -.007, 0)), rotation=(math.pi/2, 0, 0))
    lid = bpy.context.object
    lid.name = "DOG_EYELID_" + suffix
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value": (0, .0013, 0)})
    bpy.ops.transform.resize(value=(1.18, 1, 1.06))
    bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value": (0, .004, 0)})
    bpy.ops.transform.resize(value=(1.25, 1, 1.30))
    bpy.ops.object.mode_set(mode="OBJECT")
    lid.data.materials.append(lid_material)
    thickness = lid.modifiers.new("Lid_Thickness", "SOLIDIFY")
    thickness.thickness = .0007
    subdivision = lid.modifiers.new("Lid_Anatomical_Wrap", "SUBSURF")
    subdivision.levels = 2
    assign_collection(lid)
    for polygon in lid.data.polygons:
        polygon.use_smooth = True

nose = bpy.data.objects["DOG_NOSE"]
nose.data.materials.clear()
nose.data.materials.append(nose_material)
for vertex in nose.data.vertices:
    height = (vertex.co.z + .011) / .022
    vertex.co.x *= .70 + .30 * min(1, max(0, height / .6))
for side in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1, location=nose.location + Vector((side*.0068, -.0075, -.0017)))
    cutter = bpy.context.object
    cutter.name = "TEMP_Nostril_Cutter"
    cutter.scale = (.0035, .005, .0034)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.context.view_layer.objects.active = nose
    cavity = nose.modifiers.new("Nostril_Cavity", "BOOLEAN")
    cavity.operation = "DIFFERENCE"
    cavity.object = cutter
    bpy.ops.object.modifier_apply(modifier=cavity.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
bevel = nose.modifiers.new("Nose_Rim_Softness", "BEVEL")
bevel.width = .00035
bevel.segments = 2
curve = bpy.data.curves.new("Mouth_Separation", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = .00065
curve.bevel_resolution = 2
spline = curve.splines.new("BEZIER")
spline.bezier_points.add(2)
for point, coordinate in zip(spline.bezier_points, [(-.020, -.238, .211), (0, -.244, .208), (.020, -.238, .211)]):
    point.co = coordinate
    point.handle_left_type = point.handle_right_type = "AUTO"
mouth = bpy.data.objects.new("DOG_MOUTH_INNER", curve)
features.objects.link(mouth)
curve.materials.append(lid_material)
for vertex in bpy.data.objects["DOG_EAR_R"].data.vertices:
    weight = min(1, max(0, (.285 - vertex.co.z) / .085))
    vertex.co.z += .0035 * weight
    vertex.co.y += .0025 * weight
bpy.context.view_layer.objects.active = body
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
body["facial_correction_complete"] = True
scene.display.shading.color_type = "MATERIAL"
scene["identity_gate"] = "Facial anatomy correction under review; no fur"
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_02_sculpt.blend")
for name in ("front", "left", "three_quarter", "close_face"):
    scene.camera = bpy.data.objects["CAM_" + name]
    scene.render.filepath = OUT + "/face-correction/" + name + ".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
print(json.dumps({"phase": "facial_correction", "eye_socket_booleans": 2, "wrapping_lids": 2, "nostril_cavities": 2, "fur_objects": 0}))
