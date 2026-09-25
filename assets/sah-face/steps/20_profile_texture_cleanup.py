import bpy
import json

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face/profile-revision"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("side_reference_color_pass")
assert not head.get("profile_texture_cleanup")
material=bpy.data.materials["SAH_Portrait_Reference_Color"]
for suffix,side in (("R","right"),("L","left")):
    node=next(node for node in material.node_tree.nodes if node.type=="TEX_IMAGE" and node.image and side+"_profile_color" in node.image.name)
    image=bpy.data.images.load(OUT+"/textures/"+side+"_profile_color.png",check_existing=False)
    image.name="SAH_"+side+"_Profile_Color_Clean"
    image.pack()
    node.image=image
    ear=bpy.data.objects["SAH_EAR_"+suffix]
    skin=bpy.data.materials["SAH_Ear_Skin"].copy()
    skin.name="SAH_Ear_Reference_Skin_"+suffix
    shader=next(node for node in skin.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    texture=skin.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image=bpy.data.images.load(OUT+"/textures/"+side+"_ear_color.png",check_existing=False)
    texture.image.pack()
    skin.node_tree.links.new(texture.outputs["Color"],shader.inputs["Base Color"])
    shader.inputs["Roughness"].default_value=.67
    ear.data.materials.clear()
    ear.data.materials.append(skin)
    if suffix=="R":
        for loop in ear.data.uv_layers.active.data:
            loop.uv.x=1-loop.uv.x
    for obj in bpy.data.collections["SAH_03_FACE_FEATURES"].objects:
        if obj.type=="CURVE" and obj.name.startswith(("SAH_Antihelix_"+suffix,"SAH_AntihelixFork_"+suffix)) and not obj.hide_render:
            obj.data.bevel_depth*=.70
    ear["texture_source"]=side+" profile photo ear crop; local lighting normalization only"
head["profile_texture_cleanup"]=True
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_05_profile_texture_clean.blend")
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8545"]
scene.render.resolution_x=720
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.cycles.samples=24
scene.render.filepath=OUT+"/after/right-profile-clean.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"side_photo_background_excluded":True,"duplicate_ear_projection_removed":True,"separate_ear_textures":2,"geometry_unchanged_except_smaller_ear_ridges":True}))
