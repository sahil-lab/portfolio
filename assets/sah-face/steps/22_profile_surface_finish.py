import bpy
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face/profile-revision"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("profile_ear_alignment")
assert not head.get("profile_surface_finish")
material=bpy.data.materials["SAH_Portrait_Reference_Color"]
report=[]
for suffix,side,direction in (("R","right",-1),("L","left",1)):
    node=next(node for node in material.node_tree.nodes if node.type=="TEX_IMAGE" and node.image and side in node.image.name.lower() and "profile" in node.image.name.lower())
    image=bpy.data.images.load(OUT+"/textures/"+side+"_profile_color.png",check_existing=False)
    image.name="SAH_"+side+"_Profile_Color_Final"
    image.pack()
    node.image=image
    ear=bpy.data.objects["SAH_EAR_"+suffix]
    evaluated=ear.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=evaluated.to_mesh()
    tree=BVHTree.FromPolygons([ear.matrix_world @ vertex.co for vertex in mesh.vertices],[tuple(face.vertices) for face in mesh.polygons])
    attached=0
    for obj in bpy.data.collections["SAH_03_FACE_FEATURES"].objects:
        if obj.type!="CURVE" or obj.hide_render or not obj.name.startswith(("SAH_Antihelix_"+suffix,"SAH_AntihelixFork_"+suffix)):
            continue
        obj.data.bevel_depth=.00082 if obj.name.startswith("SAH_Antihelix_"+suffix) else .00060
        inverse=obj.matrix_world.inverted()
        for spline in obj.data.splines:
            for point in spline.bezier_points:
                current=obj.matrix_world @ point.co
                origin=Vector((direction*.16,current.y,current.z))
                location,normal,index,distance=tree.ray_cast(origin,Vector((-direction,0,0)),.15)
                assert location is not None, (obj.name,list(current))
                point.co=inverse @ (location-Vector((direction*obj.data.bevel_depth*.45,0,0)))
                attached+=1
    evaluated.to_mesh_clear()
    assert attached==8, attached
    report.append({"side":suffix,"fold_control_points_attached":attached,"fresh_texture_packed":bool(image.packed_file)})
head["profile_surface_finish"]=True
head["profile_surface_finish_report"]=json.dumps(report)
scene["profile_revision_status"]="Both supplied profile pairs reviewed; revised depth, ear placement, side color, and attached native hair. Approximate likeness, not a scan."
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8549"]
scene.render.resolution_x=720
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.cycles.samples=24
scene.render.filepath=OUT+"/review/IMG_8549-color.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_07_surface_finished.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"surface_finish":report,"head_geometry_unchanged":True},indent=2))
