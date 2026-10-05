import bpy
import json
import math
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
assert scene.name=="Reference_Anime_Figure"
assert bpy.data.objects["ANI_Body"].get("character_finished")
view=RENDER_VIEW
assert view in {"front","back","side","three_quarter","portrait"}
positions={"front":(0,-4.15,1.57),"back":(1.3,4.0,1.65),"side":(4.2,-.30,1.60),"three_quarter":(1.65,-3.9,1.78)}
camera=bpy.data.objects["ANI_Portrait_Camera" if view=="portrait" else "ANI_Camera"]
if view!="portrait":
    camera.location=positions[view]
    camera.rotation_euler=(Vector((0,-.025,.865))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=70
scene.camera=camera
bpy.data.objects["ANI_Studio_Backdrop_NoExport"].rotation_euler.z=math.atan2(camera.location.x,-camera.location.y)
scene.render.resolution_x=int(RENDER_SIZE)
scene.render.resolution_y=int(RENDER_SIZE) if view=="portrait" else round(int(RENDER_SIZE)*1.30)
scene.cycles.samples=int(RENDER_SAMPLES)
scene.render.filepath=OUT+"/review-"+view+".png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"view":view,"render":scene.render.filepath}))
