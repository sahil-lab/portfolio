import bpy
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
assert scene.name=="Sah_Face_Sculpt"
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("hairline_round_two")
camera=REFERENCE_DATA["camera"]
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
mesh=evaluated.to_mesh()
minimum_row=10000
maximum_height=-1000
for vertex in mesh.vertices:
    point=evaluated.matrix_world@vertex.co
    row=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/(point.y+.70)
    minimum_row=min(minimum_row,row)
    maximum_height=max(maximum_height,point.z)
front_normals=[vertex.normal.y for vertex in mesh.vertices if vertex.co.y<.025 and vertex.co.z>.205]
evaluated.to_mesh_clear()
scalp=bpy.data.objects["SAH_HAIR_Scalp"]
points=scalp.data.attributes["position"]
roots=[points.data[curve.first_point_index].vector for curve in scalp.data.curves]
tips=[points.data[curve.first_point_index+len(curve.points)-1].vector for curve in scalp.data.curves]
report={"reference_top_pixel_y":134,"current_projected_top_y":minimum_row,"maximum_head_height_m":maximum_height,"front_scalp_average_normal_y":sum(front_normals)/len(front_normals),"hair_roots":len(roots),"hair_front_roots":sum(point.y<.025 for point in roots),"hair_roots_above_250mm":sum(point.z>.25 for point in roots),"root_bounds":[[min(point[index] for point in roots) for index in range(3)],[max(point[index] for point in roots) for index in range(3)]],"tip_bounds":[[min(point[index] for point in tips) for index in range(3)],[max(point[index] for point in tips) for index in range(3)]],"hair_hidden":scalp.hide_render,"materials":[item.name for item in scalp.data.materials]}
scene["scalp_projection_diagnostic"]=json.dumps(report)
scene.camera=bpy.data.objects["SAH_CAM_THREE_QUARTER"]
scene.cycles.samples=16
scene.render.resolution_x=850
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.filepath=OUT+"/renders/three-quarter-before-scalp-fit.png"
bpy.ops.render.render(write_still=True)
print(json.dumps(report,indent=2))
