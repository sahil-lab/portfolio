import bpy
import bmesh
import json
import math
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
assert scene.name=="Reference_Anime_Figure"
body=bpy.data.objects["ANI_Body"]
assert not body.get("outfit_refinement")
assembly=bpy.data.objects["ANI_Character"]
original=bpy.data.objects["ANI_Untouched_MakeHuman_Body"]
joints={name:Vector(point) for name,point in json.loads(bpy.data.scenes["Sah_Suited_Figure"]["makehuman_joint_locations"]).items()}

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

def arm_weight(point):
    threshold=.23-.083*smooth(1.20,1.41,point.z)
    return smooth(threshold,threshold+.085,abs(point.x))*smooth(.86,.96,point.z)*(1-smooth(1.43,1.50,point.z))

frames={}
for sign,label in ((1,"l"),(-1,"r")):
    shoulder=joints["joint-"+label+"-shoulder"]
    elbow=joints["joint-"+label+"-elbow"]
    wrist=joints["joint-"+label+"-hand"]
    new_shoulder=Vector((sign*.188,-.010,1.410))
    new_elbow=new_shoulder+Vector((sign*(.06 if sign>0 else .078),-.004,-.232)).normalized()*(elbow-shoulder).length
    new_wrist=new_elbow+Vector((sign*(.017 if sign>0 else .045),-.030,-.23)).normalized()*(wrist-elbow).length
    frames[sign]=(shoulder,elbow,wrist,new_shoulder,new_elbow,(elbow-shoulder).rotation_difference(new_elbow-new_shoulder),(wrist-elbow).rotation_difference(new_wrist-new_elbow))

def pose(point,reference):
    result=point.copy()
    if point.z<.94:
        result.x-=math.copysign(.126*(1-smooth(.09,.94,point.z)),point.x)
    if .96<point.z<1.40:
        result.x*=1.04
    weight=arm_weight(reference)
    if weight:
        start,hinge,wrist,new_start,new_hinge,upper,lower=frames[1 if reference.x>0 else -1]
        blend=smooth(-.04,.045,(point-hinge).dot((wrist-hinge).normalized()))
        rotated=(new_start+upper@(point-start)).lerp(new_hinge+lower@(point-hinge),blend)
        result=result.lerp(rotated,weight)
    return result*.90

rest=[original.matrix_world @ vertex.co for vertex in original.data.vertices]
for vertex,point in zip(body.data.vertices,rest):
    if point.z<=1.49:
        vertex.co=pose(point,point)
body.data.update()
helpers=[obj for obj in bpy.data.scenes["Sah_Suited_Figure"].objects if obj.get("makehuman_source_group","").startswith("helper-tights")]
outfit=bpy.data.collections["ANI_Outfit"]
old=bpy.data.objects["ANI_Tee"]
old.name="ANI_Tee_Blockout"
old.hide_render=True
old.hide_set(True)
vertices=[]
faces=[]
for helper in helpers:
    points=[helper.matrix_world @ vertex.co for vertex in helper.data.vertices]
    mapping={}
    for polygon in helper.data.polygons:
        center=sum((points[index] for index in polygon.vertices),Vector())/len(polygon.vertices)
        if not .975<center.z<1.486:
            continue
        if arm_weight(center)>.35:
            frame=frames[1 if center.x>0 else -1]
            if (center-frame[0]).dot((frame[1]-frame[0]).normalized())>.215:
                continue
        indices=[]
        for index in polygon.vertices:
            if index not in mapping:
                reference=points[index]
                normal=(helper.matrix_world.to_3x3() @ helper.data.vertices[index].normal).normalized()
                point=reference+normal*.022
                if arm_weight(reference)<.2 and reference.z<1.33:
                    angle=math.atan2((reference.y+.035)/.13,reference.x/.195)
                    tube=Vector((math.cos(angle)*.227,math.sin(angle)*.145-.035,point.z))
                    point=point.lerp(tube,1-smooth(1.22,1.33,reference.z))
                mapping[index]=len(vertices)
                vertices.append(tuple(pose(point,reference)))
            indices.append(mapping[index])
        faces.append(tuple(indices))
mesh=bpy.data.meshes.new("ANI_Refined_Cotton")
mesh.from_pydata(vertices,[],faces)
mesh.update()
editable=bmesh.new()
editable.from_mesh(mesh)
boundary=[edge for edge in editable.edges if edge.is_boundary and all(vertex.co.z<1.015 and abs(vertex.co.x)<.222 for vertex in edge.verts)]
degrees={}
for edge in boundary:
    for vertex in edge.verts:
        degrees[vertex]=degrees.get(vertex,0)+1
assert len(boundary)>25 and all(value==2 for value in degrees.values())
loop=[boundary[0].verts[0]]
while True:
    neighbors=[edge.other_vert(loop[-1]) for edge in boundary if loop[-1] in edge.verts]
    following=neighbors[0] if len(loop)==1 or neighbors[0]!=loop[-2] else neighbors[1]
    if following==loop[0]:
        break
    assert following not in loop
    loop.append(following)
origins=[vertex.co.copy() for vertex in loop]
for row in range(1,6):
    amount=row/5
    ring=[]
    for point in origins:
        angle=math.atan2(point.y+.0315,point.x)
        position=point.copy()
        position.z=point.z*(1-amount)+(.775+.004*math.cos(angle*2))*amount
        position.x*=1+.025*amount
        ring.append(editable.verts.new(position))
    for index in range(len(loop)):
        following=(index+1)%len(loop)
        editable.faces.new((loop[index],loop[following],ring[following],ring[index]))
    loop=ring
bmesh.ops.recalc_face_normals(editable,faces=list(editable.faces))
editable.to_mesh(mesh)
editable.free()
mesh.materials.append(bpy.data.materials["ANI_Cotton"])
tee=bpy.data.objects.new("ANI_Tee",mesh)
outfit.objects.link(tee)
tee.parent=assembly
for polygon in mesh.polygons:
    polygon.use_smooth=True
modifier=tee.modifiers.new("Soft_Fabric","SUBSURF")
modifier.levels=1
modifier.render_levels=2
modifier=tee.modifiers.new("Cotton_Thickness","SOLIDIFY")
modifier.thickness=.003
shorts=bpy.data.objects["ANI_Shorts"]
for vertex in shorts.data.vertices:
    point=vertex.co
    if point.z>.72:
        point.x*=.93
        point.y=(point.y+.025)*.94-.025
editable=bmesh.new()
editable.from_mesh(shorts.data)
for vertex in editable.verts:
    if vertex.is_boundary and vertex.co.z<.68:
        vertex.co.z=.61+.003*math.cos(vertex.co.x*20)
editable.to_mesh(shorts.data)
editable.free()

def curve(name,points,radius,material_name,cyclic=False):
    data=bpy.data.curves.new(name,"CURVE")
    data.dimensions="3D"
    data.bevel_depth=radius
    data.bevel_resolution=3
    spline=data.splines.new("POLY")
    spline.points.add(len(points)-1)
    for control,point in zip(spline.points,points):
        control.co=(*point,1)
    spline.use_cyclic_u=cyclic
    data.materials.append(bpy.data.materials[material_name])
    obj=bpy.data.objects.new(name,data)
    outfit.objects.link(obj)
    obj.parent=assembly
    return obj

curve("ANI_Ribbed_Crew_Collar",[(.064*math.sin(index/72*math.tau),-.017+.065*math.cos(index/72*math.tau),1.337+.009*math.cos(index/72*math.tau)) for index in range(72)],.006,"ANI_Cotton_Seams",True)
for sign in (-1,1):
    foot=[vertex.co for vertex,reference in zip(body.data.vertices,rest) if reference.z<.12 and vertex.co.x*sign>0]
    minimum=Vector(tuple(min(point[axis] for point in foot) for axis in range(3)))
    maximum=Vector(tuple(max(point[axis] for point in foot) for axis in range(3)))
    center=(minimum+maximum)/2
    width=maximum.x-minimum.x+.023
    length=maximum.y-minimum.y+.020
    bpy.ops.mesh.primitive_cube_add(size=1)
    sole=bpy.context.object
    sole.name="ANI_Slide_Sole_"+str(sign)
    sole.parent=assembly
    sole.location=(center.x,center.y,.002)
    sole.dimensions=(width,length,.022)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    sole.data.materials.append(bpy.data.materials["ANI_Slide_Sole"])
    bevel=sole.modifiers.new("Rounded_Slide","BEVEL")
    bevel.width=.012
    bevel.segments=4
    points=[]
    polygons=[]
    for row in range(5):
        depth=minimum.y+length*(.20+row*.082)
        for column in range(17):
            angle=column/16*math.pi
            points.append((center.x+math.cos(angle)*width*.47,depth,.025+math.sin(angle)*.045))
            if row and column:
                index=row*17+column
                polygons.append((index-18,index-17,index,index-1))
    mesh=bpy.data.meshes.new("ANI_Slide_Band_"+str(sign))
    mesh.from_pydata(points,[],polygons)
    mesh.materials.append(bpy.data.materials["ANI_Stone_Slides"])
    strap=bpy.data.objects.new(mesh.name,mesh)
    outfit.objects.link(strap)
    strap.parent=assembly
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    modifier=strap.modifiers.new("Soft_Sandal_Band","SUBSURF")
    modifier.levels=1
    modifier.render_levels=2
    modifier=strap.modifiers.new("Padded_Sandal_Thickness","SOLIDIFY")
    modifier.thickness=.006
body["outfit_refinement"]=True
assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in original.data.polygons]
scene["anime_stage"]="refined-outfit-ready-for-face-and-hair"
scene.render.filepath=OUT+"/02-outfit.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_02_outfit.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"body_topology_preserved":True,"shirt_hem_closed":True,"slides_added":2,"previous_scene_untouched":True}))
