import bpy
import bmesh
import json

head = bpy.data.objects["SAH_Head_Landmark_Cage"]
mesh = bmesh.new()
mesh.from_mesh(head.data)
counts = {"vertices":len(mesh.verts),"faces":len(mesh.faces),"boundary_edges":sum(edge.is_boundary for edge in mesh.edges),"non_manifold_edges":sum(not edge.is_manifold for edge in mesh.edges),"loose_vertices":sum(not vertex.link_faces for vertex in mesh.verts),"bounds_min":[min(vertex.co[index] for vertex in mesh.verts) for index in range(3)],"bounds_max":[max(vertex.co[index] for vertex in mesh.verts) for index in range(3)],"materials":[slot.material.name for slot in head.material_slots]}
counts["rotation"] = list(head.rotation_euler)
counts["matrix"] = [list(row) for row in head.matrix_world]
counts["material_faces"] = {slot.material.name:sum(face.material_index==index for face in mesh.faces) for index,slot in enumerate(head.material_slots)}
counts["camera"] = {"location":list(bpy.context.scene.camera.location),"rotation":list(bpy.context.scene.camera.rotation_euler)}
mesh.free()
print(json.dumps(counts,indent=2))
