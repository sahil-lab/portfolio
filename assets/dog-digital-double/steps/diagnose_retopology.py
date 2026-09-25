import bpy
import bmesh
import json

results = []
for name in ("DOG_SCULPT_HIGH", "DOG_BODY_RETOPO"):
    obj = bpy.data.objects.get(name)
    if obj is None:
        continue
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    results.append({"name": name, "vertices": len(mesh.verts), "faces": len(mesh.faces), "boundary": sum(edge.is_boundary for edge in mesh.edges), "non_manifold": sum(not edge.is_manifold for edge in mesh.edges), "loose_vertices": sum(not vertex.link_faces for vertex in mesh.verts), "zero_area": sum(face.calc_area() < 1e-12 for face in mesh.faces), "selected": obj.select_get(), "active": bpy.context.view_layer.objects.active == obj})
    mesh.free()
obj = bpy.data.objects["DOG_BODY_RETOPO"]
before = len(obj.data.polygons)
window = bpy.context.window_manager.windows[0]
area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
region = next(region for region in area.regions if region.type == "WINDOW")
with bpy.context.temp_override(window=window, area=area, region=region):
    outcome = bpy.ops.object.quadriflow_remesh("EXEC_DEFAULT", use_mesh_symmetry=False, mode="FACES", target_faces=8500, seed=23)
obj["quad_remesh_last_result"] = str(outcome)
print(json.dumps({"mesh_diagnostics": results, "outcome": list(outcome), "faces_before": before, "faces_after": len(obj.data.polygons)}, indent=2))
