import bpy
import math
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("native_face_sculpt_complete")
assert not head.get("cranium_round_two")
if head.mode!="OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_before_cranium_refinement.blend",copy=True)
before=[vertex.co.copy() for vertex in head.data.vertices]
camera=REFERENCE_DATA["camera"]

for vertex in head.data.vertices:
    point=vertex.co
    if point.z<.199 or point.y<-.012:
        continue
    amount=min(1,max(0,(point.z-.199)/.029))
    amount=amount*amount*(3-2*amount)
    angle=math.atan2(point.z-.188,point.x)
    cross_radius=math.sqrt((point.x/.083)**2+((point.z-.188)/.085)**2)
    depth_radius=max(.05,math.sqrt(max(0,1-((point.y-.060)/.105)**2)))
    desired_radius=min(cross_radius,depth_radius)
    target_x=math.cos(angle)*.083*desired_radius
    target_z=.188+math.sin(angle)*.085*desired_radius
    point.x=point.x*(1-amount)+target_x*amount
    point.z=point.z*(1-amount)+target_z*amount
protected=max((vertex.co-prior).length for vertex,prior in zip(head.data.vertices,before) if prior.z<.195)
assert protected<1e-8,"Facial landmarks moved during skull-only edit"
head.data.update()
bpy.context.view_layer.update()
evaluated=head.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh=evaluated.to_mesh()
tree=BVHTree.FromPolygons([vertex.co.copy() for vertex in mesh.vertices],[tuple(face.vertices) for face in mesh.polygons])

for suffix in ("R","L"):
    lid=bpy.data.objects["SAH_Eyelid_Anatomical_Wrap_"+suffix]
    count=len(lid.data.vertices)//5
    for index,vertex in enumerate(lid.data.vertices):
        ring=index//count
        progress=ring/4
        hit=tree.ray_cast(Vector((vertex.co.x,-.35,vertex.co.z)),Vector((0,1,0)))[0]
        if hit is not None and progress>.20:
            amount=((progress-.20)/.80)**.65
            vertex.co.y=vertex.co.y*(1-amount)+(hit.y-.00012)*amount
    for modifier in lid.modifiers:
        if modifier.type=="SOLIDIFY":
            modifier.thickness=.00025
    lid.data.update()
evaluated.to_mesh_clear()
for obj in (head,bpy.data.objects["SAH_Eyelid_Anatomical_Wrap_R"],bpy.data.objects["SAH_Eyelid_Anatomical_Wrap_L"]):
    uv=obj.data.uv_layers.active
    for loop in obj.data.loops:
        point=obj.data.vertices[loop.vertex_index].co
        depth=point.y+.70
        pixel_x=camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth
        pixel_y=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth
        uv.data[loop.index].uv=(pixel_x/camera["image_width"],1-pixel_y/camera["image_height"])
head["cranium_round_two"]=True
head["cranium_edit_note"]="Rounded upper-head cross sections from the visible front/top skull contour; all vertices below z=.195 unchanged"
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.cycles.samples=16
scene.render.filepath=OUT+"/renders/cranium-refined-front.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_05_cranium_refined.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"cranium_refined":True,"protected_face_displacement_m":protected,"eyelid_outer_rims_blended":True,"changed_cage_vertices":sum((vertex.co-prior).length>1e-8 for vertex,prior in zip(head.data.vertices,before))}))
