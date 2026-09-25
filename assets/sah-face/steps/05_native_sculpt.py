import bpy
import json
from mathutils import Vector
from mathutils.kdtree import KDTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert not head.get("native_face_sculpt_complete")
if head.mode!="OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active=head
for vertex in head.data.vertices:
    point=vertex.co
    if point.z<=.213 or point.y<-.010:
        continue
    amount=min(1,max(0,(point.z-.213)/.030))
    amount=amount*amount*(3-2*amount)
    direction=Vector((point.x/.083,(point.y-.062)/.091,(point.z-.202)/.073))
    if direction.length<.001:
        continue
    direction.normalize()
    target=Vector((direction.x*.083,.062+direction.y*.091,.202+direction.z*.073))
    vertex.co=point.lerp(target,amount*.88)
camera=REFERENCE_DATA["camera"]
uv=head.data.uv_layers.active
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    depth=point.y+.70
    horizontal=camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth
    vertical=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth
    uv.data[loop.index].uv=(horizontal/camera["image_width"],1-vertical/camera["image_height"])
head.data.update()
window=bpy.context.window_manager.windows[0]
area=next(area for area in window.screen.areas if area.type=="VIEW_3D")
region=next(region for region in area.regions if region.type=="WINDOW")
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
mesh=evaluated.to_mesh()
before=[vertex.co.copy() for vertex in mesh.vertices]
tree=KDTree(len(before))
for index,point in enumerate(before):
    tree.insert(point,index)
tree.balance()
evaluated.to_mesh_clear()
operations=[
    ("SMOOTH",.16,46,[(-.045,.014,.137),(-.043,.012,.130),(-.040,.010,.123)]),
    ("SMOOTH",.15,46,[(.045,.014,.137),(.043,.012,.130),(.040,.010,.123)]),
    ("INFLATE",.035,26,[(-.014,-.018,.128),(-.016,-.015,.123),(-.018,-.011,.120)]),
    ("INFLATE",.030,26,[(.014,-.018,.128),(.016,-.015,.123),(.018,-.011,.120)]),
    ("DRAW_SHARP",.018,15,[(-.012,-.011,.096),(-.006,-.014,.095),(0,-.016,.095),(.008,-.013,.095),(.016,-.007,.094)]),
]
with bpy.context.temp_override(window=window,area=area,region=region):
    bpy.ops.object.mode_set(mode="SCULPT")
    bpy.ops.brush.asset_activate(asset_library_type="ESSENTIALS",relative_asset_identifier="brushes/essentials_brushes-mesh_sculpt.blend/Brush/Smooth")
    paint=scene.tool_settings.sculpt
    paint.unified_paint_settings.use_unified_size=False
    paint.unified_paint_settings.use_unified_strength=False
    brush=paint.brush
    valid=[item.identifier for item in brush.bl_rna.properties["sculpt_brush_type"].enum_items]
    for kind,strength,size,path in operations:
        assert kind in valid
        brush.sculpt_brush_type=kind
        brush.strength=strength
        brush.size=size
        strokes=[]
        for index,coordinate in enumerate(path):
            point,vertex_index,distance=tree.find(Vector(coordinate))
            clip=area.spaces.active.region_3d.perspective_matrix@(head.matrix_world@point).to_4d()
            mouse=((clip.x/clip.w+1)*region.width/2,(clip.y/clip.w+1)*region.height/2)
            strokes.append({"name":"AnatomicalFaceRefinement","location":tuple(point),"mouse":mouse,"mouse_event":mouse,"pressure":.5,"size":size,"time":index*.08,"is_start":index==0,"x_tilt":0,"y_tilt":0})
        assert bpy.ops.sculpt.brush_stroke.poll()
        bpy.ops.sculpt.brush_stroke(stroke=strokes,mode="NORMAL",override_location=False)
    brush.sculpt_brush_type="SMOOTH"
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()
evaluated=head.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh=evaluated.to_mesh()
assert len(mesh.vertices)==len(before)
changed=0
maximum=0
for vertex,previous in zip(mesh.vertices,before):
    displacement=(vertex.co-previous).length
    if displacement>1e-8:
        changed+=1
    maximum=max(maximum,displacement)
evaluated.to_mesh_clear()
assert changed>0,"Sculpt calls did not change the Multires surface"
assert maximum<.004,"A subtle refinement moved the face too far"
head["native_face_sculpt_complete"]=True
head["native_sculpt_report"]=json.dumps({"brushes":[entry[0] for entry in operations],"changed_evaluated_vertices":changed,"maximum_displacement_m":maximum})
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.cycles.samples=16
bpy.context.view_layer.material_override=bpy.data.materials["SAH_Neutral_Clay"]
scene.render.filepath=OUT+"/renders/sculpt-clay-front.png"
bpy.ops.render.render(write_still=True)
bpy.context.view_layer.material_override=None
scene.render.filepath=OUT+"/renders/sculpt-color-front.png"
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_04_sculpted.blend")
print(json.dumps({"native_sculpt_verified":True,"evaluated_vertices_changed":changed,"maximum_displacement_m":maximum,"skull_profile_corrected":True,"checkpoint":"face_04_sculpted.blend"}))
