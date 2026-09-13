"""Reproducible actual-game cinematic. Blender 5.2: --background --python this.py.
Environment: KINGDOM_FRAMES='1,337,649' for preview stills; otherwise render 720 PNGs.
"""
import bpy,json,math,os
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'outputs'/'cinematic';OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((ROOT/'assets/cinematic/scene.json').read_text(encoding='utf-8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.cycles.samples=12
if hasattr(scene,'eevee') and hasattr(scene.eevee,'taa_render_samples'):scene.eevee.taa_render_samples=16
scene.cycles.use_denoising=True
# CPU rendering is universally reproducible. GPU selected only when discovered by Blender.
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for device in pref.devices: device.use=device.type!='CPU'
 if any(d.use for d in pref.devices):scene.cycles.device='GPU'
except Exception:pass
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.fps=24;scene.frame_start=1;scene.frame_end=720;scene.frame_step=2
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.color=(.13,.19,.21)
scene.view_settings.view_transform='AgX'
# Three Y-up -> Blender Z-up; all source transforms and geometry preserved.
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def matrix(a):return Matrix([a[i:i+4] for i in range(0,16,4)]).transposed()
meshes={};objects={}
for key,g in data['geometries'].items():
 m=bpy.data.meshes.new(key);v=g['v'];ix=g['i'];m.from_pydata([v[i:i+3] for i in range(0,len(v),3)],[],[ix[i:i+3] for i in range(0,len(ix),3)]);m.update();meshes[key]=m
 for p in m.polygons:p.use_smooth=True
materials={}
for item in data['objects']:
 ob=bpy.data.objects.new(item['name'],meshes[item['geo']]);scene.collection.objects.link(ob);ob.matrix_world=C@matrix(item['matrix']);objects[item['id']]=ob
 key=tuple(item['color'])+(item['emission'],)
 if key not in materials:
  mat=bpy.data.materials.new('Game paint');mat.diffuse_color=(*item['color'],1);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Roughness'].default_value=.82;bs.inputs['Emission Color'].default_value=mat.diffuse_color;bs.inputs['Emission Strength'].default_value=min(item['emission'],1.2);materials[key]=mat
 # Object-linked slots preserve geometry reuse without overwriting per-object material.
 if not ob.data.materials:ob.data.materials.append(materials[key])
 ob.material_slots[0].link='OBJECT';ob.material_slots[0].material=materials[key]
for frame,changes in enumerate(data['frames'],1):
 for change in changes:
  ob=objects[change['id']];ob.matrix_world=C@matrix(change['m']);ob.keyframe_insert('location',frame=frame);ob.keyframe_insert('rotation_euler',frame=frame);ob.keyframe_insert('scale',frame=frame)
  ob.hide_render=not change['v'];ob.keyframe_insert('hide_render',frame=frame)
color_tracks={}
for frame,changes in enumerate(data['frames'],1):
 for change in changes:
  if change.get('c'):
   track=color_tracks.setdefault(change['id'],[])
   if not track or track[-1][1]!=change['c']:track.append((frame,change['c']))
# Sampled runtime transforms must hold between sparse updates, especially at shot cuts.
# Blender's default Bezier interpolation would make stationary feet/trays drift toward
# the next shot while the continuously sampled body remained in place.
for ob in objects.values():
 if ob.animation_data and ob.animation_data.action:
  for layer in ob.animation_data.action.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for curve in bag.fcurves:
      for keyframe in curve.keyframe_points:keyframe.interpolation='CONSTANT'
for key,track in color_tracks.items():
 if len(track)<2:continue
 ob=objects[key];mat=ob.material_slots[0].material.copy();ob.material_slots[0].material=mat;bs=mat.node_tree.nodes.get('Principled BSDF')
 for frame,color in track:
  if frame>1:bs.inputs['Base Color'].keyframe_insert('default_value',frame=frame-1)
  bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Base Color'].keyframe_insert('default_value',frame=frame)
# Import the shipped hero GLB, including authored lever/tray animation and textures.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/packet-press.glb'))
for ob in set(bpy.data.objects)-before:
 if ob.parent is None:ob.location+=Vector((1,-17,.65))
 if ob.name.startswith('Collision_'):ob.hide_render=True
for i,pickup_frame in enumerate([79,87,95,103]):
 parent=bpy.data.objects.get(f'PacketPress_Capsule_{i}')
 if parent:
  for ob in parent.children_recursive:
   for f,hidden in [(1,True),(72,True),(73,False),(pickup_frame-1,False),(pickup_frame,True)]:ob.hide_render=hidden;ob.keyframe_insert('hide_render',frame=f)
# The original workshop mural, mapped to its actual back-wall location.
bpy.ops.mesh.primitive_plane_add(size=8,location=(0,-14,4.8),rotation=(math.pi/2,0,0));mural=bpy.context.object;mural.name='Workshop original mural'
mat=bpy.data.materials.new('Original gouache mural');mat.use_nodes=True;nodes=mat.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'assets/art/workshop-mural-source.png'));mat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);mural.data.materials.append(mat)
def light(name,kind,position,energy,color,size=10):
 d=bpy.data.lights.new(name,kind);d.energy=energy;d.color=color
 if kind=='AREA':d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();return o
light('Morning key','AREA',(-15,-15,45),14000,(1,.83,.63),35);light('Soft chassis fill','AREA',(30,10,35),9000,(.64,.77,1),45)
sun=light('Amber daylight','SUN',(-25,-20,40),2,(1,.9,.76));sun.data.angle=.2
for shot in data['shots']:
 d=bpy.data.cameras.new(shot['label']);d.lens=shot.get('lens',36);cam=bpy.data.objects.new(shot['label'],d);scene.collection.objects.link(cam)
 for t,p in [(shot['start'],shot['from']),(shot['end']-1/24,shot['to'])]:
  cam.location=C@Vector(p);target=C@Vector(shot['look']);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();f=round(t*24)+1;cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
 marker=scene.timeline_markers.new(shot['label'],frame=round(shot['start']*24)+1);marker.camera=cam
scene.camera=bpy.data.objects.get(data['shots'][0]['label']);scene.render.filepath=str(OUT/'frames'/'frame_');(OUT/'frames').mkdir(exist_ok=True)
for image in bpy.data.images:
 if image.filepath: image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/cinematic/KingdomTrailer.blend'))
selection=os.environ.get('KINGDOM_FRAMES')
if selection:
 for f in selection.split(','):scene.frame_set(int(f));scene.render.filepath=str(OUT/f'preview-{f}.png');bpy.ops.render.render(write_still=True)
else:
 if os.environ.get('KINGDOM_RANGE'):scene.frame_start,scene.frame_end=map(int,os.environ['KINGDOM_RANGE'].split(':'))
 bpy.ops.render.render(animation=True)
