import bpy
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
assert scene.name=="Sah_Face_Sculpt"
view=RENDER_VIEW.upper()
folder=RENDER_FOLDER
assert folder.replace("-","").replace("_","").isalnum()
assert view in {"FRONT","THREE_QUARTER","PROFILE","BACK","TOP","UNDERSIDE","REFERENCE_FRONT"}
scene.camera=bpy.data.objects["SAH_CAM_"+view]
scene.render.engine="CYCLES"
scene.cycles.samples=int(RENDER_SAMPLES)
scene.render.resolution_percentage=100
scene.render.resolution_x=int(RENDER_SIZE)
scene.render.resolution_y=round(int(RENDER_SIZE)*(4/3 if view=="REFERENCE_FRONT" else 1.2))
scene.render.image_settings.file_format="PNG"
camera=scene.camera
if view!="REFERENCE_FRONT":
    bpy.context.view_layer.update()
    depsgraph=bpy.context.evaluated_depsgraph_get()
    lower=Vector((float("inf"),float("inf"),float("inf")))
    upper=-lower
    for obj in scene.objects:
        if obj.type not in {"MESH","CURVE","CURVES"} or obj.hide_render:
            continue
        evaluated=obj.evaluated_get(depsgraph)
        for coordinate in evaluated.bound_box:
            point=evaluated.matrix_world@Vector(coordinate)
            for axis in range(3):
                lower[axis]=min(lower[axis],point[axis])
                upper[axis]=max(upper[axis],point[axis])
    target=(lower+upper)/2
    direction=(camera.location-target).normalized()
    distance=(camera.location-target).length
    extent=0
    for attempt in range(6):
        camera.location=target+direction*distance
        camera.rotation_euler=(target-camera.location).to_track_quat("-Z","Y").to_euler()
        bpy.context.view_layer.update()
        projection=camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(),x=scene.render.resolution_x,y=scene.render.resolution_y)
        extent=0
        for horizontal in (lower.x,upper.x):
            for depth in (lower.y,upper.y):
                for vertical in (lower.z,upper.z):
                    clip=projection@camera.matrix_world.inverted()@Vector((horizontal,depth,vertical,1))
                    extent=max(extent,abs(clip.x/clip.w),abs(clip.y/clip.w))
        if extent<.91:
            break
        distance*=extent/.90
    assert extent<.92,"Review camera clips the head"
    camera["review_frame_extent"]=extent
prior=bpy.context.view_layer.material_override
visibility=[]
if RENDER_LOOK=="clay":
    bpy.context.view_layer.material_override=bpy.data.materials["SAH_Neutral_Clay"]
    for obj in bpy.data.collections["SAH_04_HAIR"].objects:
        visibility.append((obj,obj.hide_render))
        obj.hide_render=True
scene.render.filepath=OUT+"/"+folder+"/"+view.lower()+".png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override=prior
    for obj,hidden in visibility:
        obj.hide_render=hidden
print(json.dumps({"view":view,"look":RENDER_LOOK,"file":scene.render.filepath,"source":"actual Blender geometry and native hair"}))
