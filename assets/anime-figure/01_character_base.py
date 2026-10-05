import bpy
import bmesh
import json
import math
from mathutils import Matrix, Vector

ROOT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT=ROOT+"/outputs/anime-figure"
assert bpy.data.scenes.get("Reference_Anime_Figure") is None
previous=bpy.context.scene
source=bpy.data.objects["FIG_Source_Body_Topology"]
source_scene=bpy.data.scenes["Sah_Suited_Figure"]
joints={name:Vector(point) for name,point in json.loads(source_scene["makehuman_joint_locations"]).items()}
scene=bpy.data.scenes.new("Reference_Anime_Figure")
scene.render.engine=previous.render.engine
scene.view_settings.view_transform=previous.view_settings.view_transform
scene.view_settings.look=previous.view_settings.look
scene.render.image_settings.file_format="PNG"
bpy.context.window.scene=scene
collections={}
for title in ("Source","Body","Outfit","Face","Hair","Stage"):
    collection=bpy.data.collections.new("ANI_"+title)
    scene.collection.children.link(collection)
    collections[title]=collection
original=bpy.data.objects.new("ANI_Untouched_MakeHuman_Body",source.data.copy())
original.matrix_world=source.matrix_world.copy()
collections["Source"].objects.link(original)
original.hide_render=True
original.hide_set(True)
assembly=bpy.data.objects.new("ANI_Character",None)
collections["Body"].objects.link(assembly)
assembly.location.z=.055

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

def arm_weight(point):
    return smooth(.145,.235,abs(point.x))*smooth(.86,.96,point.z)*(1-smooth(1.43,1.50,point.z))

frames={}
for sign,label in ((1,"l"),(-1,"r")):
    shoulder=joints["joint-"+label+"-shoulder"]
    elbow=joints["joint-"+label+"-elbow"]
    wrist=joints["joint-"+label+"-hand"]
    new_shoulder=Vector((sign*.188,-.010,1.410))
    upper_direction=Vector((sign*(.06 if sign>0 else .078),-.004,-.232)).normalized()
    new_elbow=new_shoulder+upper_direction*(elbow-shoulder).length
    forearm_direction=Vector((sign*(.017 if sign>0 else .045),-.030,-.23)).normalized()
    new_wrist=new_elbow+forearm_direction*(wrist-elbow).length
    frames[sign]=(shoulder,elbow,wrist,new_shoulder,new_elbow,new_wrist,(elbow-shoulder).rotation_difference(new_elbow-new_shoulder),(wrist-elbow).rotation_difference(new_wrist-new_elbow))

def stylize(point):
    shaped=point.copy()
    if point.z<.94:
        shaped.x-=math.copysign(.126*(1-smooth(.09,.94,point.z)),point.x)
    if .96<point.z<1.40:
        shaped.x*=1.04
    influence=arm_weight(point)
    if influence:
        start,hinge,wrist,target_start,target_hinge,target_wrist,upper_rotation,lower_rotation=frames[1 if point.x>0 else -1]
        lower_weight=smooth(-.04,.045,(point-hinge).dot((wrist-hinge).normalized()))
        posed=(target_start+upper_rotation@(point-start)).lerp(target_hinge+lower_rotation@(point-hinge),lower_weight)
        shaped=shaped.lerp(posed,influence)
    if point.z>1.49:
        side=1 if point.x>=0 else -1
        eye_center=Vector((side*.033,-.132,1.635))
        difference=point-eye_center
        influence=math.exp(-((difference.x/.033)**4+(difference.z/.039)**4))*(1-smooth(-.105,-.065,point.y))
        shaped.x+=difference.x*.30*influence
        shaped.z+=difference.z*.49*influence
        nose=math.exp(-((point.x/.022)**2+((point.z-1.599)/.035)**2))*(1-smooth(-.150,-.120,point.y))
        shaped.y+=.015*nose
        lips=math.exp(-((point.x/.032)**4+((point.z-1.557)/.019)**4))*(1-smooth(-.13,-.08,point.y))
        shaped.z+=(1.557-point.z)*.32*lips
        shaped.y+=.004*lips
        head_blend=smooth(1.49,1.54,point.z)
        jaw=(1-smooth(1.54,1.60,point.z))*.075
        shaped.x*=1+(.12-jaw)*head_blend
        shaped.y=(shaped.y+.05)*(1-.10*head_blend)-.05
        shaped.z=1.49+(shaped.z-1.49)*(1+.18*head_blend)
    return shaped*.90

def linear_color(code):
    values=[int(code[index:index+2],16)/255 for index in (0,2,4)]
    return tuple(value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4 for value in values)

def material(name,code,roughness=.65,metallic=0):
    result=bpy.data.materials.new("ANI_"+name)
    result.use_nodes=True
    shader=next(node for node in result.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    color=linear_color(code)
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Roughness"].default_value=roughness
    shader.inputs["Metallic"].default_value=metallic
    shader.inputs["Specular IOR Level"].default_value=.28
    result.diffuse_color=(*color,1)
    return result

finishes={"Skin":material("Skin","D29A78"),"Cotton":material("Cotton","F8F8F2",.86),"Seam":material("Cotton_Seams","C7D2D0",.84),"Shorts":material("Navy_Shorts","28344B",.79),"Cuff":material("Shorts_Seams","3B4A61",.76),"Slides":material("Stone_Slides","9C9690",.77),"Sole":material("Slide_Sole","716D68",.85),"Ink":material("Ink","211B22",.68),"Stage":material("Stage","739E99",.74)}
body=bpy.data.objects.new("ANI_Body",source.data.copy())
collections["Body"].objects.link(body)
body.parent=assembly
rest=[source.matrix_world @ vertex.co for vertex in source.data.vertices]
for vertex,point in zip(body.data.vertices,rest):
    vertex.co=stylize(point)
body.data.update()
body.data.materials.clear()
body.data.materials.append(finishes["Skin"])
for face in body.data.polygons:
    face.use_smooth=True
    face.material_index=0
subsurf=body.modifiers.new("Editable_Anime_Surface","SUBSURF")
subsurf.levels=1
subsurf.render_levels=2
group=body.vertex_groups.new(name="Visible_Skin")
visible=[]
for vertex,point in zip(body.data.vertices,rest):
    visible_skin=point.z>1.466 or point.z<.745
    if arm_weight(point)>.55:
        frame=frames[1 if point.x>0 else -1]
        along=(point-frame[0]).dot((frame[1]-frame[0]).normalized())
        visible_skin=along>.18
    if visible_skin:
        visible.append(vertex.index)
group.add(visible,1,"REPLACE")
mask=body.modifiers.new("Covered_Skin_Keep_Topology","MASK")
mask.vertex_group=group.name
mask.use_smooth=True
helpers=[obj for obj in source_scene.objects if obj.get("makehuman_source_group","").startswith("helper-tights")]

def garment(kind):
    vertices=[]
    faces=[]
    for helper in helpers:
        points=[helper.matrix_world @ vertex.co for vertex in helper.data.vertices]
        mapping={}
        for polygon in helper.data.polygons:
            center=sum((points[index] for index in polygon.vertices),Vector())/len(polygon.vertices)
            arm=arm_weight(center)
            if kind=="Tee":
                use=.94<center.z<1.486
                if arm>.38:
                    frame=frames[1 if center.x>0 else -1]
                    use=use and (center-frame[0]).dot((frame[1]-frame[0]).normalized())<.215
            else:
                use=.675<center.z<1.016 and arm<.45
            if not use:
                continue
            indices=[]
            for index in polygon.vertices:
                if index not in mapping:
                    point=points[index].copy()
                    normal=(helper.matrix_world.to_3x3() @ helper.data.vertices[index].normal).normalized()
                    point+=normal*(.022 if kind=="Tee" else .012)
                    if kind=="Tee" and arm_weight(point)<.30 and point.z<1.34:
                        angle=math.atan2((point.y+.035)/.13,point.x/.195)
                        radius_x=.213+.010*(1-smooth(1.0,1.34,point.z))
                        radius_y=.140
                        shaped=Vector((math.cos(angle)*radius_x,math.sin(angle)*radius_y-.035,point.z))
                        point=point.lerp(shaped,1-smooth(1.27,1.37,point.z))
                    if kind=="Shorts":
                        point.x*=1.045
                        point.y=(point.y+.02)*1.045-.02
                    mapping[index]=len(vertices)
                    vertices.append(tuple(stylize(point)))
                indices.append(mapping[index])
            faces.append(tuple(indices))
    mesh=bpy.data.meshes.new("ANI_"+kind+"_SourcePanels")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    if kind=="Tee":
        editable=bmesh.new()
        editable.from_mesh(mesh)
        boundary=[edge for edge in editable.edges if edge.is_boundary and all(vertex.co.z<.94 and abs(vertex.co.x)<.215 for vertex in edge.verts)]
        degrees={}
        for edge in boundary:
            for vertex in edge.verts:
                degrees[vertex]=degrees.get(vertex,0)+1
        assert len(boundary)>20 and all(degree==2 for degree in degrees.values()),"T-shirt hem must be separate from cuffs"
        loop=[boundary[0].verts[0]]
        while True:
            neighbors=[edge.other_vert(loop[-1]) for edge in boundary if loop[-1] in edge.verts]
            following=neighbors[0] if len(loop)==1 or neighbors[0]!=loop[-2] else neighbors[1]
            if following==loop[0]:
                break
            assert following not in loop
            loop.append(following)
        origins=[vertex.co.copy() for vertex in loop]
        for row in range(1,5):
            fraction=row/4
            ring=[]
            for point in origins:
                angle=math.atan2(point.y+.032,point.x)
                target_z=.767+.007*math.cos(angle*2)+.003*math.sin(angle*5)
                position=point.copy()
                position.z=point.z*(1-fraction)+target_z*fraction
                position.x*=1+.018*fraction
                ring.append(editable.verts.new(position))
            for index in range(len(loop)):
                following=(index+1)%len(loop)
                editable.faces.new((loop[index],loop[following],ring[following],ring[index]))
            loop=ring
        bmesh.ops.recalc_face_normals(editable,faces=list(editable.faces))
        editable.to_mesh(mesh)
        editable.free()
    obj=bpy.data.objects.new("ANI_"+kind,mesh)
    collections["Outfit"].objects.link(obj)
    obj.parent=assembly
    mesh.materials.append(finishes["Cotton" if kind=="Tee" else "Shorts"])
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    modifier=obj.modifiers.new("Soft_Fabric_Surface","SUBSURF")
    modifier.levels=1
    modifier.render_levels=2
    thickness=obj.modifiers.new("Fabric_Edge_Thickness","SOLIDIFY")
    thickness.thickness=.003
    obj["provenance"]="Separate garment based on CC0 MakeHuman clothing helper; personal photo guides silhouette"
    return obj

tee=garment("Tee")
shorts=garment("Shorts")
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.43,depth=.05,location=(0,0,.025))
stand=bpy.context.object
stand.name="ANI_Display_Base"
stand.scale.y=.80
stand.data.materials.append(finishes["Stage"])
bevel=stand.modifiers.new("Rounded_Collector_Base","BEVEL")
bevel.width=.014
bevel.segments=3
for polygon in stand.data.polygons:
    polygon.use_smooth=True
world=bpy.data.worlds.new("ANI_Studio_World")
world.use_nodes=True
background=next(node for node in world.node_tree.nodes if node.type=="BACKGROUND")
background.inputs["Color"].default_value=(*linear_color("CBDAD7"),1)
background.inputs["Strength"].default_value=.65
scene.world=world
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002))
floor=bpy.context.object
floor.name="ANI_Studio_Floor_NoExport"
floor.data.materials.append(material("Studio_Floor","DCE7E4",.94))
camera_data=bpy.data.cameras.new("ANI_Camera")
camera=bpy.data.objects.new("ANI_Camera",camera_data)
collections["Stage"].objects.link(camera)
camera.location=(2.0,-4.0,2.0)
camera.rotation_euler=(Vector((0,-.025,.87))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.lens=70
camera_data.clip_start=.01
scene.camera=camera
for label,position,power,size in (("Key",(-3,-4,5),500,3.7),("Fill",(3,-2,2.8),230,3),("Hair_Rim",(1.8,2.5,3.6),650,2.4)):
    data=bpy.data.lights.new("ANI_"+label,"AREA")
    light=bpy.data.objects.new("ANI_"+label,data)
    collections["Stage"].objects.link(light)
    light.location=position
    light.rotation_euler=(Vector((0,0,.95))-light.location).to_track_quat('-Z','Y').to_euler()
    data.energy=power
    data.size=size
scene["reference_scope"]="Six supplied pics/*.jpg photographs, local-only; long side-part hair, oversized white tee, navy shorts, neutral slides. Anime interpretation, not exact likeness."
scene["human_base_license"]="Existing MakeHuman hm08 body, CC0 graphical asset; copied from retained untouched source, not prior individualized figure"
scene["source_body_counts"]="13380 vertices, 13378 original quads"
scene["anime_scale"]="Approximately six-head-tall stylized figure; artistic scale, not a measured physical height"
scene["posed_arm_joints"]=json.dumps({str(sign):[list(stylize(point)) for point in frame[3:6]] for sign,frame in frames.items()})
scene["anime_stage"]="body-and-outfit-blockout"
body["original_topology"]=original.name
assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in original.data.polygons]
scene.render.resolution_x=840
scene.render.resolution_y=1100
scene.render.resolution_percentage=100
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.filepath=OUT+"/01-silhouette.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_01_character_base.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"scene":scene.name,"body_vertices":len(body.data.vertices),"body_quads":len(body.data.polygons),"original_connectivity_preserved":True,"clothes":[tee.name,shorts.name],"existing_scenes_preserved":True},indent=2))
