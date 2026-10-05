import bpy
import bmesh
import json
import math
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
body=bpy.data.objects["ANI_Body"]
assert body.get("expression_hair_fit") and not body.get("surface_polish")
original=bpy.data.objects["ANI_Untouched_MakeHuman_Body"]
source_faces=[tuple(face.vertices) for face in original.data.polygons]
before=[vertex.co.copy() for vertex in body.data.vertices]
backup=bpy.data.objects.new("ANI_Body_Before_Soft_Face",body.data.copy())
bpy.data.collections["ANI_Source"].objects.link(backup)
backup.hide_render=True
backup.hide_set(True)

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

for vertex in body.data.vertices:
    point=vertex.co
    if point.z<1.37:
        continue
    cheek=math.exp(-((point.z-1.441)/.035)**2)*(1-smooth(-.040,.018,point.y))
    point.x*=1+.11*cheek
    point.y-=.0025*cheek*smooth(.025,.061,abs(point.x))
    nose=math.exp(-((point.x/.023)**4+((point.z-1.474)/.039)**4))*(1-smooth(-.103,-.075,point.y))
    point.y+=.0028*nose
body.data.update()
working=bmesh.new()
working.from_mesh(body.data)
selected=[]
for vertex in working.verts:
    point=vertex.co
    eye_distance=min(((point.x-sign*.034)/.028)**2+((point.z-1.492)/.030)**2 for sign in (-1,1))
    if 1.382<point.z<1.575 and point.y<-.085 and eye_distance>1.08:
        selected.append(vertex)
for iteration in range(7):
    bmesh.ops.smooth_vert(working,verts=selected,factor=.23,use_axis_x=True,use_axis_y=True,use_axis_z=True)
working.to_mesh(body.data)
working.free()
assert [tuple(face.vertices) for face in body.data.polygons]==source_faces
assert all((vertex.co-point).length<1e-8 for vertex,point in zip(body.data.vertices,before) if point.z<1.37)
hair=bpy.data.collections["ANI_Hair"]
for obj in hair.objects:
    if obj.type!="MESH" or not obj.name.startswith("ANI_Back_Lock_"):
        continue
    for row in range(len(obj.data.vertices)//8):
        start=row*8
        center=sum((vertex.co for vertex in obj.data.vertices[start:start+8]),Vector())/8
        if center.y<-.005 and center.z<1.59:
            influence=1-smooth(1.49,1.59,center.z)
            target_x=math.copysign(max(abs(center.x),.116),center.x)
            delta=Vector(((target_x-center.x)*influence,(max(center.y,.037)-center.y)*influence,0))
            for offset in range(8):
                obj.data.vertices[start+offset].co+=delta
    obj.data.update()
for obj in hair.objects:
    if obj.type=="CURVE" and obj.name.startswith("ANI_Back_Lock_"):
        obj.hide_render=True
        obj.hide_set(True)
for name in ("ANI_Hair_Black","ANI_Hair_Shadow","ANI_Hair_Soft_Highlight"):
    material=bpy.data.materials[name]
    shader=next(node for node in material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Specular IOR Level"].default_value=.11
    shader.inputs["Roughness"].default_value=.59
for name,color in (("ANI_Iris_Chestnut",(.135,.070,.032,1)),("ANI_Iris_Lower_Gold",(.31,.182,.081,1))):
    shader=next(node for node in bpy.data.materials[name].node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value=color
for obj in bpy.data.collections["ANI_Face"].objects:
    if obj.name.startswith("ANI_Brow_"):
        obj.data.bevel_depth=.0017
        for spline in obj.data.splines:
            for point in spline.points:
                point.co.z-=.003
tee=bpy.data.objects["ANI_Tee"]
for vertex in tee.data.vertices:
    point=vertex.co
    if point.z<.82 or point.z>1.18 or point.y>-.085:
        continue
    lower=1-smooth(.90,1.18,point.z)
    folds=(math.sin(point.x*76+point.z*9)+.32*math.sin(point.x*145-point.z*6))
    point.y+=.0021*lower*folds
tee.data.update()
profile=[(-5,0),(1.8,0)]
for index in range(1,25):
    angle=index/24*math.pi/2
    profile.append((1.8+1.4*math.sin(angle),1.4-1.4*math.cos(angle)))
profile.append((3.2,6))
vertices=[]
faces=[]
for depth,height in profile:
    vertices.extend(((-8,depth,height-.006),(8,depth,height-.006)))
    if len(vertices)>2:
        current=len(vertices)-2
        faces.append((current-2,current-1,current+1,current))
mesh=bpy.data.meshes.new("ANI_Seamless_Studio_Backdrop")
mesh.from_pydata(vertices,[],faces)
mesh.materials.append(bpy.data.materials["ANI_Studio_Floor"])
for polygon in mesh.polygons:
    polygon.use_smooth=True
backdrop=bpy.data.objects.new("ANI_Studio_Backdrop_NoExport",mesh)
bpy.data.collections["ANI_Stage"].objects.link(backdrop)
floor=bpy.data.objects["ANI_Studio_Floor_NoExport"]
floor.hide_render=True
floor.hide_set(True)
body["surface_polish"]=True
scene["anime_stage"]="soft-face-and-hair-silhouette-review"
scene.render.filepath=OUT+"/05-face-polish.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_05_surface_polish.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"body_faces_preserved":True,"cheek_smoothing_vertices":len(selected),"lower_body_unchanged":True,"back_hair_repositioned":True,"studio_horizon_removed":True}))
