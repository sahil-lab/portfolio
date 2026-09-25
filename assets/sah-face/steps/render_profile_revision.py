import bpy
import json

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face/profile-revision"
scene=bpy.context.scene
assert scene.name=="Sah_Face_Sculpt"
view=RENDER_VIEW
assert view in {"IMG_8545","IMG_8546","IMG_8549","IMG_8550","front","three_quarter","profile","reference_front"}
folder=RENDER_FOLDER
assert folder.replace("-","").replace("_","").isalnum()
camera_name="SAH_CAM_SIDE_"+view if view.startswith("IMG_") else "SAH_CAM_"+view.upper()
scene.camera=bpy.data.objects[camera_name]
scene.render.resolution_x=int(RENDER_SIZE)
scene.render.resolution_y=round(int(RENDER_SIZE)*(4/3 if view.startswith("IMG_") or view=="reference_front" else 1.2))
scene.render.resolution_percentage=100
scene.cycles.samples=int(RENDER_SAMPLES)
scene.cycles.use_denoising=True
prior=bpy.context.view_layer.material_override
visibility=[]
if RENDER_LOOK=="clay":
    bpy.context.view_layer.material_override=bpy.data.materials["SAH_Neutral_Clay"]
    for obj in bpy.data.collections["SAH_04_HAIR"].objects:
        visibility.append((obj,obj.hide_render))
        obj.hide_render=True
suffix="-clay" if RENDER_LOOK=="clay" else "-color"
scene.render.filepath=OUT+"/"+folder+"/"+view+suffix+".png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override=prior
    for obj,hidden in visibility:
        obj.hide_render=hidden
print(json.dumps({"camera":camera_name,"path":scene.render.filepath,"look":RENDER_LOOK,"fixed_camera":view.startswith("IMG_")}))
