import bpy
import bmesh
import json
import math
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
body=bpy.data.objects["ANI_Body"]
assert body.get("surface_polish") and not body.get("character_finished")
assembly=bpy.data.objects["ANI_Character"]
tee=bpy.data.objects["ANI_Tee"]
previous=bpy.data.objects["ANI_Ribbed_Crew_Collar"]
previous.hide_render=True
previous.hide_set(True)
mesh=bmesh.new()
mesh.from_mesh(tee.data)
remaining={edge for edge in mesh.edges if edge.is_boundary}
loops=[]
while remaining:
    pending=[remaining.pop()]
    connected=[]
    while pending:
        edge=pending.pop()
        connected.append(edge)
        for vertex in edge.verts:
            for neighbor in vertex.link_edges:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    pending.append(neighbor)
    points={vertex for edge in connected for vertex in edge.verts}
    assert all(sum(vertex in edge.verts for edge in connected)==2 for vertex in points)
    ordered=[connected[0].verts[0]]
    while True:
        neighbors=[edge.other_vert(ordered[-1]) for edge in connected if ordered[-1] in edge.verts]
        following=neighbors[0] if len(ordered)==1 or neighbors[0]!=ordered[-2] else neighbors[1]
        if following==ordered[0]:
            break
        assert following not in ordered
        ordered.append(following)
    loops.append([vertex.co.copy() for vertex in ordered])
for index,points in enumerate(loops):
    neck=min(point.z for point in points)>1.30
    hem=max(point.z for point in points)<.82
    name="ANI_Fitted_Crew_Neck" if neck else "ANI_Tee_Hem_Stitch" if hem else "ANI_Sleeve_Cuff_"+str(index)
    data=bpy.data.curves.new(name,"CURVE")
    data.dimensions="3D"
    data.bevel_depth=.0042 if neck else .0016 if hem else .0024
    data.bevel_resolution=3
    spline=data.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    center=sum(points,Vector())/len(points)
    for control,point in zip(spline.bezier_points,points):
        offset=point-center
        if offset.length:
            offset.normalize()
        control.co=point+offset*.0006
        control.handle_left_type=control.handle_right_type="AUTO"
    spline.use_cyclic_u=True
    data.materials.append(bpy.data.materials["ANI_Cotton"] if neck else bpy.data.materials["ANI_Cotton_Seams"])
    obj=bpy.data.objects.new(name,data)
    bpy.data.collections["ANI_Outfit"].objects.link(obj)
    obj.parent=assembly
mesh.free()
for obj in bpy.data.collections["ANI_Face"].objects:
    if obj.name.startswith("ANI_Lower_Lid_"):
        obj.data.bevel_depth=.00038
    if obj.name.startswith("ANI_Upper_Lashes_"):
        obj.data.bevel_depth=.0019
body["character_finished"]=True
scene["anime_stage"]="finished-character-review"
scene["likeness_status"]="Anime-style interpretation of supplied reference photos, not an exact scan or identity-verified reconstruction"
scene["privacy"]="Photos remain local in ignored pics/. No photo textures or external photo uploads. This scene is separate from the portfolio's existing suited figure."
scene["reference_files"]=json.dumps({"front_body":"184bd782-f07c-4546-8768-bd0c0280a7a6.jpg","back_body":"0f9a5249-c806-46b5-a3ca-cd9519e2885d.jpg","relaxed_front":"5863eb29-2af3-48d6-80b1-e7015c843f1d.jpg","profile_a":"0969bb58-a9e8-4e1d-b4d0-9d930d548140.jpg","profile_b":"e95adf89-8dc6-4f2f-a1d3-badeb883846d.jpg","top":"a4bc752f-b804-466b-b20f-b45df0367eb1.jpg"})
assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in bpy.data.objects["ANI_Untouched_MakeHuman_Body"].data.polygons]
scene.camera=bpy.data.objects["ANI_Camera"]
scene.camera.location=(1.65,-3.9,1.78)
scene.camera.rotation_euler=(Vector((0,-.025,.865))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.lens=70
bpy.data.objects["ANI_Studio_Backdrop_NoExport"].rotation_euler.z=math.atan2(scene.camera.location.x,-scene.camera.location.y)
scene.render.resolution_x=1000
scene.render.resolution_y=1300
scene.cycles.samples=40
scene.render.filepath=OUT+"/anime-preview.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_06_finished.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"source_body_topology_preserved":True,"garment_edge_loops":len(loops),"separate_character_scene":scene.name,"reference_photos_embedded":0,"character_finished":True}))
