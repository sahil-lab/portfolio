import bpy
import bmesh
import math
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face/profile-revision"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert scene.name=="Sah_Face_Sculpt"
assert scene.get("profile_fit_parameters")
assert not head.get("side_reference_depth_pass")
fit=PROFILE_FIT
before=[vertex.co.copy() for vertex in head.data.vertices]
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/before-depth-pass.blend",copy=True)

def smooth(minimum,maximum,value):
    fraction=min(1,max(0,(value-minimum)/(maximum-minimum)))
    return fraction*fraction*(3-2*fraction)

def warp(point):
    result=point.copy()
    displacement=0
    for field,amount in zip(fit["fields"],fit["depth_offsets_m"]):
        horizontal=(point.x-field["center"][0])/field["radii"][0]
        vertical=(point.z-field["center"][1])/field["radii"][1]
        front_mask=1-min(1,max(0,(point.y-.015)/.075))
        displacement+=amount*math.exp(-horizontal*horizontal-vertical*vertical)*front_mask
    rear=smooth(.018,.143,point.y)*fit["rear_skull_backward_m"]
    ear_influence=smooth(.040,.070,abs(point.x))*math.exp(-((point.z-.148)/.067)**2-((point.y-.063)/.095)**2)
    result.y+=displacement+rear*(1-ear_influence)+fit["ear_backward_m"]*ear_influence
    result.z+=fit["ear_upward_m"]*ear_influence
    preserve=1-smooth(.032,.058,point.y)
    ratio=(.70+result.y)/(.70+point.y)
    result.x=point.x*(1+(ratio-1)*preserve)
    result.z=.165+(result.z-.165)*(1+(ratio-1)*preserve)
    return result

def project_front(point):
    return Vector((point.x/(point.y+.70),(point.z-.165)/(point.y+.70)))

for vertex in head.data.vertices:
    vertex.co=warp(vertex.co)
head.data.update()
protected=[]
for vertex,original in zip(head.data.vertices,before):
    if original.y<.025 and abs(original.x)<.035 and .080<original.z<.196:
        protected.append((project_front(vertex.co)-project_front(original)).length*2063.43)
assert max(protected)<.6,"Depth edit drifted the protected frontal features"
for obj in bpy.data.collections["SAH_03_FACE_FEATURES"].objects:
    is_ear=any(token in obj.name for token in ("EAR_","Antihelix_","Concha_Recess_"))
    if is_ear:
        obj.location.y+=fit["ear_backward_m"]
        obj.location.z+=fit["ear_upward_m"]
        continue
    matrix=obj.matrix_world.copy()
    inverse=matrix.inverted()
    if obj.type=="MESH":
        for vertex in obj.data.vertices:
            vertex.co=inverse@warp(matrix@vertex.co)
        obj.data.update()
    elif obj.type=="CURVE":
        for spline in obj.data.splines:
            for point in spline.bezier_points:
                point.co=inverse@warp(matrix@point.co)
                point.handle_left=inverse@warp(matrix@point.handle_left)
                point.handle_right=inverse@warp(matrix@point.handle_right)

hair_report=[]
for obj in bpy.data.collections["SAH_04_HAIR"].objects:
    if obj.type!="CURVES" or obj.hide_render:
        continue
    inverse=obj.matrix_world.inverted()
    for point in obj.data.attributes["position"].data:
        point.vector=inverse@warp(obj.matrix_world@point.vector)
    obj.data.update_tag()
    hair_report.append({"name":obj.name,"curves":len(obj.data.curves)})

mesh=bmesh.new()
mesh.from_mesh(head.data)
bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces))
report={"vertices":len(mesh.verts),"faces":len(mesh.faces),"boundary_edges":sum(edge.is_boundary for edge in mesh.edges),"non_manifold_edges":sum(not edge.is_manifold for edge in mesh.edges),"degenerate_faces":sum(face.calc_area()<1e-14 for face in mesh.faces)}
assert report["boundary_edges"]==report["non_manifold_edges"]==report["degenerate_faces"]==0
mesh.to_mesh(head.data)
mesh.free()
head["side_reference_depth_pass"]=True
head["profile_depth_changes"]=json.dumps(fit)
head["front_preservation_error_px"]=max(protected)
scene["profile_revision_status"]="Depth pass based on left/right side references; before/after review pending"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_02_depth_corrected.blend")
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8545"]
scene.render.resolution_x=576
scene.render.resolution_y=768
scene.render.resolution_percentage=100
scene.cycles.samples=16
prior=bpy.context.view_layer.material_override
visibility=[(obj,obj.hide_render) for obj in bpy.data.collections["SAH_04_HAIR"].objects]
for obj,hidden in visibility:
    obj.hide_render=True
bpy.context.view_layer.material_override=bpy.data.materials["SAH_Neutral_Clay"]
scene.render.filepath=OUT+"/after/right-clay.png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override=prior
    for obj,hidden in visibility:
        obj.hide_render=hidden
print(json.dumps({"front_projection_error_px":max(protected),"topology":report,"hair_moved_with_skin":hair_report,"ear_backward_mm":fit["ear_backward_m"]*1000,"ear_upward_mm":fit["ear_upward_m"]*1000},indent=2))
