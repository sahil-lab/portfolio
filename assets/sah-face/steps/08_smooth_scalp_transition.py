import bpy
import math
import json

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert not head.get("scalp_transition_smoothed")
if head.mode!="OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active=head
before=[vertex.co.copy() for vertex in head.data.vertices]
group=head.vertex_groups.new(name="Scalp_Transition_Only")
for vertex in head.data.vertices:
    point=vertex.co
    factor=min(1,max(0,(point.z-.181)/.040))
    factor=factor*factor*(3-2*factor)
    if factor>0:
        group.add([vertex.index],factor,"REPLACE")
smooth=head.modifiers.new("Scalp_Form_Continuity","SMOOTH")
smooth.factor=.78
smooth.iterations=65
smooth.vertex_group=group.name
while head.modifiers.find(smooth.name)>0:
    bpy.ops.object.modifier_move_up(modifier=smooth.name)
bpy.ops.object.modifier_apply(modifier=smooth.name)
assert max((vertex.co-prior).length for vertex,prior in zip(head.data.vertices,before) if prior.z<.180)<1e-8
camera=REFERENCE_DATA["camera"]
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    depth=point.y+.70
    head.data.uv_layers.active.data[loop.index].uv=((camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth)/camera["image_width"],1-(camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth)/camera["image_height"])
head["scalp_transition_smoothed"]=True
head["scalp_transition_changed"]=sum((vertex.co-prior).length>1e-8 for vertex,prior in zip(head.data.vertices,before))
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.render.resolution_x=700
scene.render.resolution_y=875
scene.cycles.samples=12
scene.render.filepath=OUT+"/renders/scalp-smoothed-front.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_07_shape_refined.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"scalp_vertices_smoothed":head["scalp_transition_changed"],"lower_face_unchanged":True}))
