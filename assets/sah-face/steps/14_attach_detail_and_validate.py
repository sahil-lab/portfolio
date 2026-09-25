import bpy
import bmesh
import math
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("skin_transition_matched")
assert not head.get("detail_roots_attached")
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
surface=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
surface.calc_loop_triangles()
points=[vertex.co.copy() for vertex in surface.vertices]
tree=BVHTree.FromPolygons(points,[tuple(triangle.vertices) for triangle in surface.loop_triangles],all_triangles=True)
reports=[]
for obj in bpy.data.collections["SAH_04_HAIR"].objects:
    if obj.type!="CURVES" or obj.hide_render:
        continue
    positions=obj.data.attributes["position"]
    uv=obj.data.attributes["surface_uv_coordinate"]
    largest=0
    for index,curve in enumerate(obj.data.curves):
        start=curve.first_point_index
        root=positions.data[start].vector.copy()
        closest,normal,triangle_index,distance=tree.find_nearest(root)
        if closest is None:
            raise ValueError("Missing skin beneath hair root")
        correction=closest+normal*.000045-root
        largest=max(largest,correction.length)
        for point_index in range(len(curve.points)):
            positions.data[start+point_index].vector+=correction
        triangle=surface.loop_triangles[triangle_index]
        first,second,third=[points[value] for value in triangle.vertices]
        edge_a,edge_b,offset=second-first,third-first,closest-first
        aa,ab,bb=edge_a.dot(edge_a),edge_a.dot(edge_b),edge_b.dot(edge_b)
        determinant=aa*bb-ab*ab
        if abs(determinant)<1e-18:
            weights=(1.,0.,0.)
        else:
            second_weight=(bb*offset.dot(edge_a)-ab*offset.dot(edge_b))/determinant
            third_weight=(aa*offset.dot(edge_b)-ab*offset.dot(edge_a))/determinant
            weights=(1-second_weight-third_weight,second_weight,third_weight)
        uv.data[index].vector=sum((surface.uv_layers.active.data[loop].uv*weight for loop,weight in zip(triangle.loops,weights)),Vector((0,0)))
    obj.data.update_tag()
    maximum_root_gap=0
    for index in range(0,len(obj.data.curves),13):
        curve=obj.data.curves[index]
        closest,normal,face,distance=tree.find_nearest(positions.data[curve.first_point_index].vector)
        maximum_root_gap=max(maximum_root_gap,distance)
    assert maximum_root_gap<.00006,obj.name+" is detached from skin"
    reports.append({"name":obj.name,"curves":len(obj.data.curves),"max_root_correction_m":largest,"max_checked_gap_m":maximum_root_gap})
evaluated.to_mesh_clear()
mesh=bmesh.new()
mesh.from_mesh(head.data)
topology={"vertices":len(mesh.verts),"faces":len(mesh.faces),"open_edges":sum(edge.is_boundary for edge in mesh.edges),"non_manifold_edges":sum(not edge.is_manifold for edge in mesh.edges),"zero_area_faces":sum(face.calc_area()<1e-14 for face in mesh.faces)}
assert topology["open_edges"]==0 and topology["non_manifold_edges"]==0
assert topology["zero_area_faces"]==0
mesh.free()
head["detail_roots_attached"]=True
head["root_attachment_report"]=json.dumps(reports)
head["topology_report"]=json.dumps(topology)
scene["face_reconstruction_status"]="Reference-guided head study; facial depth and unseen sides are estimates, not an exact scan"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_12_detail_attached.blend")
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples=24
scene.render.resolution_x=900
scene.render.resolution_y=1100
scene.render.filepath=OUT+"/renders/detail-attached-front.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"skin_topology":topology,"native_hair":reports,"skin_uv_loops":len(head.data.uv_layers.active.data)},indent=2))
