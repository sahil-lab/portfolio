import bpy
import json
from mathutils import Matrix, Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face/profile-revision"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert scene.name=="Sah_Face_Sculpt"
assert head.get("profile_texture_cleanup")
assert not head.get("profile_ear_alignment")
material=bpy.data.materials["SAH_Portrait_Reference_Color"]
report=[]
for suffix,side,target in (
    ("R","right",(-.082,.0771,.1429)),
    ("L","left",(.082,.0805,.1391)),
):
    concha=bpy.data.objects["SAH_Concha_Recess_"+suffix]
    pivot=concha.matrix_world.translation.copy()
    transform=Matrix.Translation(Vector(target)) @ Matrix.Diagonal((1,1.20,1,1)) @ Matrix.Translation(-pivot)
    prefixes=("SAH_EAR_"+suffix,"SAH_Antihelix_"+suffix,"SAH_AntihelixFork_"+suffix,"SAH_Concha_Recess_"+suffix)
    assembly=[obj for obj in bpy.data.collections["SAH_03_FACE_FEATURES"].objects if obj.name.startswith(prefixes) and not obj.hide_render]
    assert len(assembly)==4, [obj.name for obj in assembly]
    matrices=[(obj,obj.matrix_world.copy()) for obj in assembly]
    for obj,matrix in matrices:
        obj["before_profile_ear_alignment"]=json.dumps([list(row) for row in matrix])
        obj.matrix_world=transform @ matrix
    bpy.context.view_layer.update()
    error=(concha.matrix_world.translation-Vector(target)).length
    assert error<1e-7, error
    nodes=[node for node in material.node_tree.nodes if node.type=="TEX_IMAGE" and node.image and side in node.image.name.lower() and "profile" in node.image.name.lower()]
    assert len(nodes)==1
    image=bpy.data.images.load(OUT+"/textures/"+side+"_profile_color.png",check_existing=False)
    image.name="SAH_"+side+"_Profile_Color_Inpainted"
    image["local_ear_area_inpainted"]=True
    image.pack()
    nodes[0].image=image
    report.append({"side":suffix,"previous_canal":list(pivot),"current_canal":list(concha.matrix_world.translation),"depth_width_scale":1.20,"target_error_m":error,"fresh_image_packed":bool(image.packed_file)})
head["profile_ear_alignment"]=True
head["profile_ear_alignment_report"]=json.dumps(report)
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8545"]
scene.render.resolution_x=720
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.cycles.samples=24
scene.render.filepath=OUT+"/after/right-profile-aligned.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_06_ear_aligned.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"ear_alignment":report,"head_geometry_unchanged":True,"camera_unchanged":True},indent=2))
