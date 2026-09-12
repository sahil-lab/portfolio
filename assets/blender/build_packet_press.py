"""Blender 5.2: blender --background --python assets/blender/build_packet_press.py
Meters; front is -Y in Blender / +Z in glTF. No external add-ons required.
"""
import bpy, math, random, pathlib, json
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets'
SOURCE = ROOT / 'assets/blender'
SEED = 271828
BEVEL = .09
SEGMENTS = 16
FPS = 24
DURATION = 3
random.seed(SEED)
OUT.mkdir(parents=True, exist_ok=True)
(SOURCE / 'textures').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = FPS
scene.frame_end = FPS * DURATION

def material(name, hexcolor, metal=0, emission=0):
    rgb = tuple(int(hexcolor[i:i+2], 16)/255 for i in (0,2,4))
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb,1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = .72
    p.inputs['Emission Color'].default_value = (*rgb,1)
    p.inputs['Emission Strength'].default_value = emission
    if not emission:
        # Original deterministic fine brush grain, intentionally subtle at gameplay distance.
        n = 128
        im = bpy.data.images.new(name+'_Brush', width=n, height=n)
        pixels=[]
        for y in range(n):
            for x in range(n):
                grain = 1 + .035*math.sin(x*.18+y*.61) + random.uniform(-.025,.025)
                pixels.extend([min(1,c*grain) for c in rgb]+[1])
        im.pixels=pixels
        im.filepath_raw=str(SOURCE/'textures'/f'{name}.png'); im.file_format='PNG'; im.save(); im.pack()
        t=m.node_tree.nodes.new('ShaderNodeTexImage'); t.image=im
        m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    return m

cream=material('Paint_WarmPlaster','eddfbf')
copper=material('Metal_BrushedCopper','b77c55',.3)
clay=material('Paint_Terracotta','b66f59')
sage=material('Paint_Sage','8fa68a')
navy=material('Rubber_DeepIndigo','293845')
blue=material('Paint_Periwinkle','979fe0')
light=material('Light_Amber','ffc778',emission=.8)
glass=material('Chamber_MilkyMint','a5d4ba',emission=.15)

def group(name, loc=(0,0,0), parent=None):
    o=bpy.data.objects.new(name,None); scene.collection.objects.link(o); o.parent=parent; o.location=loc; return o
root=group('PacketPress')
def finish(o,name,loc,scale,mat,parent):
    o.name=name; o.location=loc; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.parent=parent or root; o.data.materials.append(mat)
    return o
def box(name,loc,size,mat,parent=None,bevel=BEVEL):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o=finish(bpy.context.object,name,loc,size,mat,parent)
    if bevel:
        mod=o.modifiers.new('Soft painted edges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL'); mod.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def orb(name,loc,scale,mat,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=SEGMENTS,ring_count=8,radius=1)
    o=finish(bpy.context.object,name,loc,scale,mat,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cable(name,points,mat,r=.065):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'; curve.bevel_depth=r; curve.bevel_resolution=2;curve.resolution_u=8
    s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.parent=root;o.data.materials.append(mat)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

box('PacketPress_Base',(0,0,.45),(3.8,2.6,.7),clay)
for x in (-1.35,1.35):
    for y in (-.8,.8):box(f'PacketPress_Foot_{x}_{y}',(x,y,.12),(.55,.55,.24),navy)
box('PacketPress_Body',(0,.35,1.45),(3.2,1.7,1.5),cream)
box('PacketPress_FrontPanel',(0,-.55,1.48),(2.7,.15,.9),sage)
for x in (-1.5,1.5):box(f'PacketPress_Pillar_{x}',(x,0,2.45),(.34,.65,2.6),copper)
box('PacketPress_Crown',(0,0,3.8),(3.6,2,.5),cream)
box('PacketPress_CrownStripe',(0,-1.04,3.8),(3.15,.08,.23),clay)
orb('PacketPress_Chamber',(0,0,2.75),(.82,.65,.72),glass)
for z in (2.12,3.36):box('PacketPress_ChamberCollar_'+str(z),(0,0,z),(1.65,1.35,.17),copper)
ram=group('PacketPress_Ram',(0,0,3.3),root)
box('PacketPress_RamPlate',(0,0,0),(1.8,1.5,.18),copper,ram)
lever=group('PacketPress_Lever',(1.95,0,2),root)
box('PacketPress_LeverShaft',(0,0,.5),(.15,.18,1),copper,lever)
orb('PacketPress_LeverGrip',(0,0,1.05),(.26,.24,.24),blue,lever)
orb('PacketPress_LeverAxle',(1.95,0,2),(.24,.3,.24),copper)
tray=group('PacketPress_Tray',(0,-1.3,.95),root)
box('PacketPress_TrayDeck',(0,0,0),(2.7,1.25,.18),copper,tray)
for x in (-1.32,1.32):box('PacketPress_TrayLip_'+str(x),(x,0,.13),(.12,1.2,.25),cream,tray)
for i in range(4):
    x=-.9+i*.6
    box(f'PacketPress_RackSlot_{i}',(x,0,.14),(.47,.55,.13),navy,tray)
    cap=group(f'PacketPress_Capsule_{i}',(x,0,.48),tray)
    orb(f'PacketPress_CapsuleShell_{i}',(0,0,0),(.19,.19,.36),glass,cap)
    box(f'PacketPress_CapsuleBand_{i}',(0,0,-.12),(.39,.39,.09),copper,cap,.035)
    orb(f'PacketPress_CapsuleCore_{i}',(0,-.17,.04),(.09,.035,.17),light,cap)
    orb(f'PacketPress_Indicator_{i}',(x,-1.08,3.8),(.12,.055,.09),light)
for x in (-1.15,1.15):
    for z in (1.16,1.76):orb(f'PacketPress_Bolt_{x}_{z}',(x,-.66,z),(.065,.045,.065),copper)
cable('PacketPress_Cable_Power',[(-1.5,.5,3.6),(-2.2,.4,3),(-2.1,.4,.9),(-1.5,.4,.6)],navy)
cable('PacketPress_Cable_Coolant',[(1.3,.7,3.5),(1.7,1,3),(1.3,.8,1.6)],sage,.09)
collision=box('Collision_PacketPress',(0,-.8,2),(4.6,4.5,4),navy,bevel=0)
collision.hide_render=True;collision.display_type='WIRE';collision['collision']='box'

# All animated objects share one named NLA track, merged as a single glTF clip.
for obj,prop,values in [
    (lever,'rotation_euler',[(1,(0,0,0)),(20,(.85,0,0)),(42,(.85,0,0)),(72,(0,0,0))]),
    (tray,'location',[(1,(0,-1.3,.95)),(50,(0,-1.3,.95)),(72,(0,-2.1,.95))]),
    (ram,'location',[(1,(0,0,3.3)),(30,(0,0,2.8)),(50,(0,0,2.8)),(72,(0,0,3.3))])]:
    for frame,v in values:setattr(obj,prop,v);obj.keyframe_insert(data_path=prop,frame=frame)
    action=obj.animation_data.action;action.name=obj.name+'_Prepare'
    track=obj.animation_data.nla_tracks.new();track.name='PacketPress_Prepare'
    track.strips.new(action.name,1,action);obj.animation_data.action=None
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'PacketPress.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'packet-press.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_cameras=False,export_lights=False)
print('PACKET_PRESS_EXPORT_COMPLETE',str(OUT/'packet-press.glb'))
