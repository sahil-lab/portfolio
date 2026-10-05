import bpy
import json
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
body=bpy.data.objects["ANI_Body"]
assert body.get("character_finished") and not body.get("garment_clearance")
unchanged=[vertex.co.copy() for vertex in body.data.vertices]

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

def shirt_clearance(point):
    weight=(1-smooth(.90,1.14,point.z))*smooth(-.01,.055,point.y)
    point.y+=.030*weight
    point.x*=1+.025*weight

tee=bpy.data.objects["ANI_Tee"]
for vertex in tee.data.vertices:
    shirt_clearance(vertex.co)
tee.data.update()
shorts=bpy.data.objects["ANI_Shorts"]
for vertex in shorts.data.vertices:
    point=vertex.co
    weight=smooth(.748,.808,point.z)
    point.y=(point.y+.025)*(1-.14*weight)-.025
shorts.data.update()
hem=bpy.data.objects["ANI_Tee_Hem_Stitch"]
for spline in hem.data.splines:
    for control in spline.bezier_points:
        point=control.co.copy()
        shirt_clearance(point)
        control.co=point
for obj in bpy.data.collections["ANI_Hair"].objects:
    if obj.type=="MESH" and obj.name.startswith("ANI_Back_Lock_"):
        for vertex in obj.data.vertices:
            if vertex.co.z<1.14 and vertex.co.y>.03:
                vertex.co.y+=.012*(1-smooth(.95,1.14,vertex.co.z))
        obj.data.update()
bpy.context.view_layer.update()
graph=bpy.context.evaluated_depsgraph_get()
tee_evaluated=tee.evaluated_get(graph)
tee_surface=tee_evaluated.to_mesh()
tree=BVHTree.FromPolygons([vertex.co.copy() for vertex in tee_surface.vertices],[tuple(polygon.vertices) for polygon in tee_surface.polygons])
shorts_evaluated=shorts.evaluated_get(graph)
shorts_surface=shorts_evaluated.to_mesh()
gaps=[]
for vertex in shorts_surface.vertices:
    point=vertex.co
    if .79<point.z<.925 and point.y>.025:
        location,normal,index,distance=tree.ray_cast(Vector((point.x,.5,point.z)),Vector((0,-1,0)),1)
        if location is not None:
            gaps.append(location.y-point.y)
assert gaps and min(gaps)>.003,(len(gaps),min(gaps) if gaps else None)
tee_evaluated.to_mesh_clear()
shorts_evaluated.to_mesh_clear()
assert all((vertex.co-previous).length<1e-8 for vertex,previous in zip(body.data.vertices,unchanged))
body["garment_clearance"]=True
scene["garment_clearance_report"]=json.dumps({"back_waist_samples":len(gaps),"minimum_gap_m":min(gaps)})
scene.camera=bpy.data.objects["ANI_Camera"]
scene.camera.location=(1.3,4.0,1.65)
scene.camera.rotation_euler=(Vector((0,-.025,.865))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
bpy.data.objects["ANI_Studio_Backdrop_NoExport"].rotation_euler.z=math.atan2(scene.camera.location.x,-scene.camera.location.y)
scene.render.resolution_x=900
scene.render.resolution_y=1170
scene.cycles.samples=32
scene.render.filepath=OUT+"/review-back.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_07_garments_clear.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"body_unchanged":True,"back_waist_samples":len(gaps),"minimum_garment_gap_m":min(gaps)}))
