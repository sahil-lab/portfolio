import bpy
import json
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
body=bpy.data.objects["ANI_Body"]
assert body.get("garment_clearance") and not body.get("final_face_smoothing")
before=[vertex.co.copy() for vertex in body.data.vertices]
backup=bpy.data.objects.new("ANI_Body_Before_WeightedSmoothing",body.data.copy())
bpy.data.collections["ANI_Source"].objects.link(backup)
backup.hide_render=True
backup.hide_set(True)

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

group=body.vertex_groups.new(name="Continuous_Face_Smoothing")
weighted=0
for vertex in body.data.vertices:
    point=vertex.co
    eyes=min(((point.x-sign*.034)/.024)**2+((point.z-1.491)/.023)**2 for sign in (-1,1))
    weight=smooth(1.38,1.43,point.z)*(1-smooth(1.55,1.61,point.z))*(1-smooth(-.083,-.03,point.y))*smooth(.78,2.1,eyes)
    mouth=math.exp(-((point.x/.025)**4+((point.z-1.412)/.010)**4))
    weight*=1-mouth*.94
    if weight>.001:
        group.add([vertex.index],weight,"REPLACE")
        weighted+=1
bpy.ops.object.select_all(action="DESELECT")
body.hide_set(False)
body.select_set(True)
bpy.context.view_layer.objects.active=body
modifier=body.modifiers.new("Smooth_Anime_Cheek_Transitions","SMOOTH")
modifier.vertex_group=group.name
modifier.factor=.56
modifier.iterations=20
while body.modifiers.find(modifier.name)>0:
    bpy.ops.object.modifier_move_up(modifier=modifier.name)
bpy.ops.object.modifier_apply(modifier=modifier.name)
assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in bpy.data.objects["ANI_Untouched_MakeHuman_Body"].data.polygons]
maximum=max((vertex.co-point).length for vertex,point in zip(body.data.vertices,before))
assert maximum<.020,maximum
assert all((vertex.co-point).length<1e-8 for vertex,point in zip(body.data.vertices,before) if point.z<1.37)
bpy.context.view_layer.update()
evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
surface=evaluated.to_mesh()
tree=BVHTree.FromPolygons([vertex.co.copy() for vertex in surface.vertices],[tuple(face.vertices) for face in surface.polygons])
for obj in bpy.data.collections["ANI_Face"].objects:
    if obj.type!="CURVE" or not obj.name.startswith(("ANI_Brow_","ANI_Soft_Smile")):
        continue
    for spline in obj.data.splines:
        for control in spline.points:
            point=Vector(control.co[:3])
            location,normal,index,distance=tree.ray_cast(Vector((point.x,-.35,point.z)),Vector((0,1,0)),.6)
            if location is not None:
                point.y=location.y-.0009
                control.co=(*point,1)
evaluated.to_mesh_clear()
body["final_face_smoothing"]=True
scene.camera=bpy.data.objects["ANI_Portrait_Camera"]
bpy.data.objects["ANI_Studio_Backdrop_NoExport"].rotation_euler.z=math.atan2(scene.camera.location.x,-scene.camera.location.y)
scene.render.resolution_x=900
scene.render.resolution_y=900
scene.cycles.samples=32
scene.render.filepath=OUT+"/review-portrait.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_08_face_smooth.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"body_connectivity_preserved":True,"weighted_face_vertices":weighted,"maximum_vertex_move_m":maximum,"lower_body_unchanged":True}))
