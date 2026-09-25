import bpy
import math
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT=ROOT+"/outputs/sah-face/profile-revision"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("side_reference_depth_pass")
assert not head.get("profile_surface_refined")
if bpy.context.object and bpy.context.object.mode!="OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active=head
before=[vertex.co.copy() for vertex in head.data.vertices]
group=head.vertex_groups.new(name="Profile_Transition_Refinement")

def smooth(minimum,maximum,value):
    fraction=min(1,max(0,(value-minimum)/(maximum-minimum)))
    return fraction*fraction*(3-2*fraction)

for vertex in head.data.vertices:
    point=vertex.co
    weight=smooth(.020,.063,point.y)*(.45+.55*smooth(.040,.070,abs(point.x)))
    if weight>.001:
        group.add([vertex.index],weight,"REPLACE")
modifier=head.modifiers.new("Soften_Profile_Depth_Transitions","SMOOTH")
modifier.vertex_group=group.name
modifier.factor=.72
modifier.iterations=48
while head.modifiers.find(modifier.name)>0:
    bpy.ops.object.modifier_move_up(modifier=modifier.name)
bpy.ops.object.modifier_apply(modifier=modifier.name)
assert max((vertex.co-original).length for vertex,original in zip(head.data.vertices,before) if original.y<.018)<1e-8

head.data.update()
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
surface=evaluated.to_mesh()
tree=BVHTree.FromPolygons([vertex.co.copy() for vertex in surface.vertices],[tuple(face.vertices) for face in surface.polygons])
features=bpy.data.collections["SAH_03_FACE_FEATURES"]
outline=[(-.006,.030),(.004,.031),(.013,.026),(.018,.016),(.019,.005),(.017,-.007),(.011,-.021),(.003,-.029),(-.005,-.027),(-.011,-.015),(-.012,-.004),(-.010,.009),(-.010,.022)]
ear_reports=[]

def outline_at(fraction):
    count=len(outline)
    location=fraction*count
    index=int(location)%count
    amount=location-int(location)
    first=Vector(outline[(index-1)%count])
    second=Vector(outline[index])
    third=Vector(outline[(index+1)%count])
    fourth=Vector(outline[(index+2)%count])
    return .5*((2*second)+(-first+third)*amount+(2*first-5*second+4*third-fourth)*amount**2+(-first+3*second-3*third+fourth)*amount**3)

for suffix,side in (("R",-1),("L",1)):
    for prefix in ("SAH_EAR_","SAH_Antihelix_","SAH_Concha_Recess_"):
        previous=bpy.data.objects[prefix+suffix]
        previous.name+="_BeforeSideReferences"
        previous.hide_render=True
        previous.hide_set(True)
    center=Vector((side*.087,.089,.153 if side<0 else .154))
    vertices=[tuple(center+Vector((-side*.002,-.0005,0)))]
    uv=[(.5,.5)]
    faces=[]
    rings=10
    sections=80
    for ring in range(1,rings+1):
        fraction=ring/rings
        for index in range(sections):
            horizontal,vertical=outline_at(index/sections)
            rim=.0052*math.exp(-((fraction-.88)/.13)**2)
            bowl=-.0030*math.exp(-((fraction-.32)/.24)**2)
            side_plane=side*(rim+bowl+.0015*vertical/.03)
            point=center+Vector((side_plane,horizontal*fraction,vertical*fraction))
            point.y-=.004*(1-fraction)
            vertices.append(tuple(point))
            uv.append((.5+.5*fraction*math.sin(index/sections*math.tau),.5+.5*fraction*math.cos(index/sections*math.tau)))
    for index in range(sections):
        faces.append((0,1+index,1+(index+1)%sections))
    for ring in range(rings-1):
        for index in range(sections):
            first=1+ring*sections+index
            second=1+ring*sections+(index+1)%sections
            faces.append((first,second,second+sections,first+sections))
    if side>0:
        faces=[tuple(reversed(face)) for face in faces]
    mesh=bpy.data.meshes.new("SAH_ProfileEar_"+suffix)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    texture=mesh.uv_layers.new(name="ProfileEar_UV")
    for loop in mesh.loops:
        texture.data[loop.index].uv=uv[loop.vertex_index]
    mesh.materials.append(bpy.data.materials["SAH_Ear_Skin"])
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    ear=bpy.data.objects.new("SAH_EAR_"+suffix,mesh)
    features.objects.link(ear)
    modifier=ear.modifiers.new("Profile_Ear_Cartilage_Thickness","SOLIDIFY")
    modifier.thickness=.002
    modifier=ear.modifiers.new("Profile_Ear_Soft_Contours","SUBSURF")
    modifier.levels=2
    modifier.render_levels=2
    ear["reference_shape"]="Outline and conchal proportions revised from both supplied side photographs; cartilage depth remains inferred"
    ridges=[("Antihelix",[(-.004,-.020),(.002,-.010),(.006,.004),(.003,.018),(-.003,.023)],.0018), ("AntihelixFork",[(.006,.004),(.010,.014),(.010,.020)],.0013)]
    for name,curve_points,width in ridges:
        curve=bpy.data.curves.new("SAH_"+name+"_"+suffix,"CURVE")
        curve.dimensions="3D"
        curve.bevel_depth=width
        curve.bevel_resolution=3
        spline=curve.splines.new("BEZIER")
        spline.bezier_points.add(len(curve_points)-1)
        for point,(depth,vertical) in zip(spline.bezier_points,curve_points):
            point.co=center+Vector((side*.004,depth,vertical))
            point.handle_left_type=point.handle_right_type="AUTO"
        curve.materials.append(bpy.data.materials["SAH_Ear_Skin"])
        ridge=bpy.data.objects.new(curve.name,curve)
        features.objects.link(ridge)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,radius=1,location=center+Vector((side*.001,-.007,-.001)))
    concha=bpy.context.object
    concha.name="SAH_Concha_Recess_"+suffix
    concha.scale=(.0016,.0039,.0067)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for collection in list(concha.users_collection):
        collection.objects.unlink(concha)
    features.objects.link(concha)
    concha.data.materials.append(bpy.data.materials["SAH_Ear_Concha_Shadow"])
    for polygon in concha.data.polygons:
        polygon.use_smooth=True
    ear_reports.append({"side":suffix,"center":list(center),"height_m":.06,"cartilage":True})
evaluated.to_mesh_clear()
head["profile_surface_refined"]=True
scene["profile_revision_status"]="Depth pass and side-reference ear forms; appearance review pending"
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active=head
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_03_surface_and_ears.blend")
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8545"]
scene.cycles.samples=16
scene.render.resolution_x=690
scene.render.resolution_y=920
scene.render.resolution_percentage=100
prior=bpy.context.view_layer.material_override
visibility=[(obj,obj.hide_render) for obj in bpy.data.collections["SAH_04_HAIR"].objects]
for obj,hidden in visibility:
    obj.hide_render=True
bpy.context.view_layer.material_override=bpy.data.materials["SAH_Neutral_Clay"]
scene.render.filepath=OUT+"/after/right-ear-clay.png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override=prior
    for obj,hidden in visibility:
        obj.hide_render=hidden
print(json.dumps({"protected_front_unchanged":True,"native_transition_smoothing":True,"ears":ear_reports}))
