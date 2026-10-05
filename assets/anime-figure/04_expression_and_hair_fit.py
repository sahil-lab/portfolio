import bpy
import bmesh
import json
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
body=bpy.data.objects["ANI_Body"]
assert body.get("anime_face_hair") and not body.get("expression_hair_fit")
assembly=bpy.data.objects["ANI_Character"]

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

for vertex in body.data.vertices:
    point=vertex.co
    if 1.496<point.z<1.532 and point.y<-.077:
        horizontal=abs(point.x)-.034
        weight=math.exp(-((horizontal/.021)**4+((point.z-1.508)/.020)**4))
        point.z-=.0038*weight
for obj in bpy.data.collections["ANI_Face"].objects:
    if obj.name.startswith(("ANI_Sclera_","ANI_Painted_Iris_","ANI_Pupil_","ANI_Main_Glint_","ANI_Small_Glint_")):
        obj.location.y+=.0022
    if obj.name.startswith(("ANI_Main_Glint_","ANI_Small_Glint_")):
        center=sum((vertex.co for vertex in obj.data.vertices),Vector())/len(obj.data.vertices)
        for vertex in obj.data.vertices:
            vertex.co=center+(vertex.co-center)*.72
body.data.update()
bpy.context.view_layer.update()
body_evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
body_mesh=body_evaluated.to_mesh()
skin=BVHTree.FromPolygons([vertex.co.copy() for vertex in body_mesh.vertices],[tuple(polygon.vertices) for polygon in body_mesh.polygons])
for obj in bpy.data.collections["ANI_Face"].objects:
    if obj.type!="CURVE" or not obj.name.startswith(("ANI_Upper_Lashes_","ANI_Lower_Lid_","ANI_Brow_")):
        continue
    for spline in obj.data.splines:
        total=len(spline.points)
        for index,control in enumerate(spline.points):
            point=Vector(control.co[:3])
            if obj.name.startswith("ANI_Upper"):
                point.z-=.0038*math.sin(index/(total-1)*math.pi)
            elif obj.name.startswith("ANI_Brow"):
                point.z-=.001
            point.y+=.0012
            location,normal,face,distance=skin.ray_cast(Vector((point.x,-.35,point.z)),Vector((0,1,0)),.5)
            if location is not None:
                point.y=min(point.y,location.y-.001)
            control.co=(*point,1)
body_evaluated.to_mesh_clear()
tee=bpy.data.objects["ANI_Tee"]
tee_evaluated=tee.evaluated_get(bpy.context.evaluated_depsgraph_get())
tee_mesh=tee_evaluated.to_mesh()
cloth=BVHTree.FromPolygons([vertex.co.copy() for vertex in tee_mesh.vertices],[tuple(polygon.vertices) for polygon in tee_mesh.polygons])
clearance=[]
for obj in bpy.data.collections["ANI_Hair"].objects:
    if obj.type!="MESH" or not obj.name.startswith(("ANI_Back_Lock_","ANI_FaceFraming_")):
        continue
    front=obj.name.startswith("ANI_FaceFraming_")
    assert len(obj.data.vertices)%8==0
    for start in range(0,len(obj.data.vertices),8):
        center=sum((vertex.co for vertex in obj.data.vertices[start:start+8]),Vector())/8
        if center.z>1.43:
            continue
        origin=Vector((center.x,-.6 if front else .6,center.z))
        direction=Vector((0,1 if front else -1,0))
        location,normal,index,distance=cloth.ray_cast(origin,direction,1.2)
        if location is None:
            continue
        target=location.y+(-.015 if front else .016)
        shift=min(0,target-center.y) if front else max(0,target-center.y)
        shift*=1-smooth(1.37,1.43,center.z)
        for offset in range(8):
            obj.data.vertices[start+offset].co.y+=shift
        clearance.append(abs(shift))
    obj.data.update()
for obj in bpy.data.collections["ANI_Hair"].objects:
    if obj.type=="CURVE" and obj.name.endswith("_Sheen"):
        for spline in obj.data.splines:
            for control in spline.points:
                point=Vector(control.co[:3])
                if point.z>1.43:
                    continue
                front=obj.name.startswith("ANI_FaceFraming_")
                location,normal,index,distance=cloth.ray_cast(Vector((point.x,-.6 if front else .6,point.z)),Vector((0,1 if front else -1,0)),1.2)
                if location is not None:
                    point.y=min(point.y,location.y-.021) if front else max(point.y,location.y+.022)
                    control.co=(*point,1)
tee_evaluated.to_mesh_clear()
cap=bpy.data.objects["ANI_Scalp_Shell"]
editable=bmesh.new()
editable.from_mesh(cap.data)
bmesh.ops.delete(editable,geom=[face for face in editable.faces if face.calc_center_median().z<1.488],context="FACES")
editable.to_mesh(cap.data)
editable.free()
for name in ("ANI_Hair_Black","ANI_Hair_Shadow","ANI_Hair_Soft_Highlight"):
    shader=next(node for node in bpy.data.materials[name].node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Specular IOR Level"].default_value=.16
    shader.inputs["Roughness"].default_value=.52
camera_data=bpy.data.cameras.new("ANI_Portrait_Camera")
camera=bpy.data.objects.new("ANI_Portrait_Camera",camera_data)
bpy.data.collections["ANI_Stage"].objects.link(camera)
camera.location=(.36,-1.05,1.66)
camera.rotation_euler=(Vector((0,-.03,1.52))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.lens=66
camera_data.clip_start=.01
body["expression_hair_fit"]=True
scene.camera=camera
scene.render.resolution_x=1000
scene.render.resolution_y=1000
scene.cycles.samples=32
scene.render.filepath=OUT+"/04-face-detail.png"
assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in bpy.data.objects["ANI_Untouched_MakeHuman_Body"].data.polygons]
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_04_expression_hair_fit.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"topology_preserved":True,"hair_rows_repositioned":len(clearance),"maximum_hair_clearance_move_m":max(clearance),"calmer_lid_shape":True,"previous_figure_untouched":True}))
