"""Run in Blender against KingdomTrailer.blend; protects sparse animation at cuts."""
import bpy,json
from pathlib import Path
s=bpy.context.scene;body=bpy.data.objects['Courier_Body'];foot=bpy.data.objects['Courier_Foot_L'];tray=bpy.data.objects['tray base']
maximum=0
for frame in range(1,721,2):
 s.frame_set(frame);gap=(body.matrix_world.translation-tray.matrix_world.translation).length;maximum=max(maximum,gap)
 assert gap<2.5,(frame,'tray drift',gap)
 assert (body.matrix_world.translation-foot.matrix_world.translation).length<2.5,(frame,'foot drift')
assert len([m for m in s.timeline_markers if m.camera])==9
assert s.render.resolution_x==1920 and s.render.resolution_y==1080
result={'framesChecked':360,'cameraShots':9,'maximumTrayBodyDistance':maximum,'resolution':[1920,1080],'result':'PASS'}
Path(__file__).resolve().parents[2].joinpath('outputs/cinematic/scene-check.json').write_text(json.dumps(result,indent=2));print(result)
