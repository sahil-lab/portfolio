import bpy
import bmesh
import json
import math
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("groom_correction_rounds_completed", 0) >= 2
assert scene.get("eye_window_correction_applied")
body = bpy.data.objects["DOG_BODY_RETOPO"]
groom = [obj for obj in bpy.data.collections["05_GROOM"].objects if obj.type == "CURVES"]
assert len(groom) == 12
assert len(bpy.data.collections["REF_DOG"].objects) == 8
mesh = bmesh.new()
mesh.from_mesh(body.data)
topology = {"vertices": len(mesh.verts), "faces": len(mesh.faces), "quads": sum(len(face.verts)==4 for face in mesh.faces), "boundary_edges": sum(edge.is_boundary for edge in mesh.edges), "non_manifold_edges": sum(not edge.is_manifold for edge in mesh.edges), "zero_area_faces": sum(face.calc_area()<1e-12 for face in mesh.faces)}
mesh.free()
assert topology["boundary_edges"] == topology["non_manifold_edges"] == topology["zero_area_faces"] == 0
native = []
for obj in groom:
    assert obj.data.surface is not None
    assert obj.data.surface_uv_map == "DOG_UV"
    assert obj.data.attributes.get("surface_uv_coordinate")
    assert obj.data.attributes.get("coat_color")
    assert all(math.isfinite(value) for point in obj.data.attributes["position"].data for value in point.vector)
    native.append({"name": obj.name, "guides": len(obj.data.curves), "surface": obj.data.surface.name, "geometry_nodes": any(modifier.type == "NODES" for modifier in obj.modifiers)})
before = set(bpy.data.objects)
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.import_scene.gltf(filepath=OUT+"/dog_web.glb")
imported = [obj for obj in bpy.data.objects if obj not in before]
imported_meshes = [obj for obj in imported if obj.type == "MESH"]
assert len(imported_meshes) == 24
fur_meshes = [obj for obj in imported_meshes if "FUR_" in obj.name]
assert len(fur_meshes) == 12
for obj in imported_meshes:
    assert obj.data.uv_layers, obj.name+" has no imported UVs"
for obj in fur_meshes:
    assert obj.data.color_attributes, obj.name+" has no imported coat colors"
    assert all(math.isfinite(value) for vertex in obj.data.vertices for value in vertex.co)
reimport = {"objects":len(imported),"meshes":len(imported_meshes),"fur_regions":len(fur_meshes),"uvs_and_colors_present":True}
for obj in imported:
    bpy.data.objects.remove(obj, do_unlink=True)
for camera in bpy.data.collections["01_CAMERAS"].objects:
    if camera.type == "CAMERA":
        camera.data.clip_end = 1000
for obj in bpy.data.collections["08_EXPORT"].objects:
    obj.hide_render = True
    obj.hide_set(True)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
multires = next(modifier for modifier in body.modifiers if modifier.type == "MULTIRES")
level = multires.levels
multires.levels = 0
bpy.ops.wm.obj_export(filepath=OUT+"/dog_body_low.obj",export_selected_objects=True,apply_modifiers=False,export_materials=False)
multires.levels = level
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene.render.resolution_x = scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.cycles.samples = 48
scene["asset_status"] = "Reference-guided reconstruction for owner review. Not scan-calibrated and not likeness-certified."
scene["workflow_exceptions_approved"] = "Native QuadriFlow with projected cleanup instead of hand-built Poly Build; native Edit Mode guide corrections after MCP Comb replay was verified ineffective."
scene["rig_status"] = "Neutral standing pose. No armature or deformation certification requested."
scene["remaining_visual_limits"] = "Full groom is softer and more regularly grouped than the photographed coat; face blaze/eye fringe and hidden anatomy remain approximations."
report = {"blender":bpy.app.version_string,"reference_photos":8,"reference_perspective_cameras":8,"landmarks":scene.get("landmark_count"),"topology":topology,"native_groom":native,"guide_count":sum(item["guides"] for item in native),"groom_correction_rounds":scene["groom_correction_rounds_completed"],"eye_window_refinement":True,"web_reimport":reimport,"web_lods":json.loads(scene["web_lod_report"]),"maps":json.loads(scene["coat_maps"]),"likeness_status":"Owner review required; artistic reconstruction, not calibrated scan"}
scene["final_validation_report"] = json.dumps(report)
for image in bpy.data.images:
    if image.type == "IMAGE" and image.size[0] > 0 and not image.packed_file:
        image.pack()
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        area.spaces.active.region_3d.view_rotation = scene.camera.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_location = Vector((0,-.025,.17))
        area.spaces.active.region_3d.view_distance = .90
        area.spaces.active.overlay.show_overlays = False
        area.spaces.active.shading.type = "MATERIAL"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_06_final.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_master.blend")
print(json.dumps(report,indent=2))
