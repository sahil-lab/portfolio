import bpy
import math
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert not head.get("scalp_silhouette_fit")
if head.mode!="OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
camera=REFERENCE_DATA["camera"]
focal=camera["focal_pixels"]
principal=camera["principal_pixel"]
outline=[(136,550,588),(146,489,620),(178,423,689),(239,371,748),(324,338,785),(397,327,791),(430,337,782)]

def photo_width(row):
    if row<=outline[0][0]:
        return outline[0][1],outline[0][2]
    for first,second in zip(outline,outline[1:]):
        if row<=second[0]:
            amount=(row-first[0])/(second[0]-first[0])
            return first[1]+(second[1]-first[1])*amount,first[2]+(second[2]-first[2])*amount
    return outline[-1][1],outline[-1][2]

before=[vertex.co.copy() for vertex in head.data.vertices]
rows={}
for point in before:
    if point.z<.180:
        continue
    row=principal[1]-focal*(point.z-.165)/(point.y+.70)
    horizontal=principal[0]+focal*point.x/(point.y+.70)
    bucket=round(row/7)
    prior=rows.get(bucket,(principal[0],principal[0]))
    rows[bucket]=(min(prior[0],horizontal),max(prior[1],horizontal))
before_error=0
changed=0
for vertex,original in zip(head.data.vertices,before):
    if original.z<.181:
        continue
    depth=original.y+.70
    row=principal[1]-focal*(original.z-.165)/depth
    if row>400:
        continue
    bucket=round(row/7)
    nearest=[rows[value] for value in range(bucket-1,bucket+2) if value in rows]
    if not nearest:
        continue
    left=min(value[0] for value in nearest)
    right=max(value[1] for value in nearest)
    target_left,target_right=photo_width(row)
    horizontal=principal[0]+focal*original.x/depth
    span=(principal[0]-left) if original.x<0 else (right-principal[0])
    target_span=(principal[0]-target_left) if original.x<0 else (target_right-principal[0])
    if span<4:
        continue
    influence=min(1,max(0,(400-row)/50))
    influence=influence*influence*(3-2*influence)
    ratio=max(.65,min(1.20,target_span/span))
    vertex.co.x=original.x*(1+(ratio-1)*influence)
    if abs(horizontal-left)<5 or abs(horizontal-right)<5:
        before_error+=abs(span-target_span)
    if (vertex.co-original).length>1e-8:
        changed+=1
assert changed>100
assert max((vertex.co-original).length for vertex,original in zip(head.data.vertices,before) if original.z<.181)<1e-8
head.data.update()
uv=head.data.uv_layers.active
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    depth=point.y+.70
    uv.data[loop.index].uv=((principal[0]+focal*point.x/depth)/camera["image_width"],1-(principal[1]-focal*(point.z-.165)/depth)/camera["image_height"])
head["scalp_silhouette_fit"]=json.dumps({"source":"IMG_8520.jpeg","traced_rows":outline,"cage_vertices_changed":changed,"facial_vertices_below_z_181_unchanged":True})
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples=16
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.filepath=OUT+"/renders/scalp-outline-front.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_06_outline_fit.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"scalp_vertices_corrected":changed,"nose_mouth_eye_centers_unchanged":True,"reference_contour_used":True}))
