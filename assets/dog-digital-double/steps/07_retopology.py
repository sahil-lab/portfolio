import bpy
import bmesh
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
high = bpy.data.objects["DOG_SCULPT_HIGH"]
assert high.get("facial_correction_complete")
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
body = bpy.data.objects.get("DOG_BODY_RETOPO")
if body is None:
    body = high.copy()
    body.data = high.data.copy()
    body.name = "DOG_BODY_RETOPO"
    bpy.data.collections["03_RETOPO"].objects.link(body)
body.select_set(True)
bpy.context.view_layer.objects.active = body
if len(body.data.polygons) > 20000:
    body.data = high.data.copy()
    body.data.remesh_voxel_size = .00213
    body.data.use_remesh_preserve_volume = True
    bpy.ops.object.voxel_remesh()
    prep = bmesh.new()
    prep.from_mesh(body.data)
    bmesh.ops.remove_doubles(prep, verts=list(prep.verts), dist=.000001)
    bmesh.ops.recalc_face_normals(prep, faces=list(prep.faces))
    input_report = {"non_manifold_vertices": sum(not vertex.is_manifold for vertex in prep.verts), "non_contiguous_edges": sum(not edge.is_contiguous for edge in prep.edges)}
    prep.to_mesh(body.data)
    prep.free()
    for vertex in body.data.vertices:
        vertex.co *= 100
    body.data.update()
    window = bpy.context.window_manager.windows[0]
    area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
    region = next(region for region in area.regions if region.type == "WINDOW")
    with bpy.context.temp_override(window=window, area=area, region=region):
        result = bpy.ops.object.quadriflow_remesh("EXEC_DEFAULT", use_mesh_symmetry=False, use_preserve_sharp=False, use_preserve_boundary=False, smooth_normals=True, mode="FACES", target_faces=8500, seed=23)
    for vertex in body.data.vertices:
        vertex.co /= 100
    body.data.update()
    body["quad_remesh_last_result"] = str(result)
    print("QUADRIFLOW_RESULT", result, "FACES", len(body.data.polygons))
assert len(body.data.polygons) < 20000, "Quad remesher did not produce the requested moderate cage: " + str(input_report) + " outcome=" + body.get("quad_remesh_last_result", "unknown")
wrap = body.modifiers.new("Project_Cage_To_High_Sculpt", "SHRINKWRAP")
wrap.target = high
wrap.wrap_method = "NEAREST_SURFACEPOINT"
wrap.offset = .00005
bpy.ops.object.modifier_apply(modifier=wrap.name)
mesh = bmesh.new()
mesh.from_mesh(body.data)
bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=.000001)
bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
report = {"vertices": len(mesh.verts), "faces": len(mesh.faces), "quads": sum(len(face.verts) == 4 for face in mesh.faces), "boundary_edges": sum(edge.is_boundary for edge in mesh.edges), "non_manifold_edges": sum(not edge.is_manifold for edge in mesh.edges), "zero_area_faces": sum(face.calc_area() < 1e-12 for face in mesh.faces)}
assert report["boundary_edges"] == 0 and report["non_manifold_edges"] == 0, "Cage is not closed/manifold"
assert report["zero_area_faces"] == 0
assert report["quads"] / report["faces"] > .95
mesh.to_mesh(body.data)
mesh.free()
high.hide_set(True)
high.hide_render = True
body["retopology_method"] = "User-approved native QuadriFlow, surface-projected and manifold-checked. Not hand-built Poly Build or deformation-certified."
body["topology_report"] = json.dumps(report)

for edge in body.data.edges:
    first, second = (body.data.vertices[index].co for index in edge.vertices)
    midpoint = (first + second) / 2
    neck = (first.y + .117) * (second.y + .117) < 0
    belly = first.x * second.x < 0 and midpoint.z < .159 and midpoint.y > -.11
    leg_root = (first.z - .093) * (second.z - .093) < 0 and abs(midpoint.x) > .040
    inner_leg = midpoint.z < .092 and (first.y + .105) * (second.y + .105) < 0
    rear_leg = midpoint.z < .092 and (first.y - .137) * (second.y - .137) < 0
    nape = first.x * second.x < 0 and midpoint.y > -.178 and midpoint.z > .239
    edge.use_seam = neck or belly or leg_root or inner_leg or rear_leg or nape
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.unwrap(method="ANGLE_BASED", margin=.015)
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(margin=.015, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")
body.data.uv_layers.active.name = "DOG_UV"
for suffix in ("L", "R"):
    ear = bpy.data.objects["DOG_EAR_" + suffix]
    for owner in list(ear.users_collection):
        owner.objects.unlink(ear)
    bpy.data.collections["03_RETOPO"].objects.link(ear)
    bpy.ops.object.select_all(action="DESELECT")
    ear.select_set(True)
    bpy.context.view_layer.objects.active = ear
    for modifier in list(ear.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(70), island_margin=.025)
    bpy.ops.object.mode_set(mode="OBJECT")
    ear.data.uv_layers.active.name = "DOG_UV"
tail = bpy.data.objects["DOG_TAIL"]
bpy.ops.object.select_all(action="DESELECT")
tail.select_set(True)
bpy.context.view_layer.objects.active = tail
bpy.ops.object.convert(target="MESH")
tail = bpy.context.object
for owner in list(tail.users_collection):
    owner.objects.unlink(tail)
bpy.data.collections["03_RETOPO"].objects.link(tail)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(70), island_margin=.025)
bpy.ops.object.mode_set(mode="OBJECT")
tail.data.uv_layers.active.name = "DOG_UV"
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
multires = body.modifiers.new("Multires_Editable_Detail", "MULTIRES")
bpy.ops.object.multires_subdivide(modifier=multires.name, mode="CATMULL_CLARK")
multires.levels = 1
multires.sculpt_levels = 1
multires.render_levels = 1
body["uv_method"] = "Seamed angle-based unwrap, normalized and packed; face is a separate head region"
scene["identity_gate"] = "Quad cage checked; texturing and groom pending"
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_03_retopo.blend")
body.show_wire = True
body.show_all_edges = True
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene.render.filepath = OUT + "/retopology/three_quarter.png"
bpy.ops.render.render(write_still=True)
body.show_wire = False
print(json.dumps({"phase": "retopology", "body": report, "body_uv_loops": len(body.data.uv_layers.active.data), "multires_levels": multires.total_levels, "method": body["retopology_method"]}))
