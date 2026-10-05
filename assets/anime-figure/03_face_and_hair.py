import bpy
import json
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/anime-figure"
scene=bpy.context.scene
body=bpy.data.objects["ANI_Body"]
assert body.get("outfit_refinement") and not body.get("anime_face_hair")
assembly=bpy.data.objects["ANI_Character"]
face_collection=bpy.data.collections["ANI_Face"]
hair_collection=bpy.data.collections["ANI_Hair"]
backup=bpy.data.objects.new("ANI_Body_Before_AnimeEyes",body.data.copy())
bpy.data.collections["ANI_Source"].objects.link(backup)
backup.hide_render=True
backup.hide_set(True)

def smooth(lower,upper,value):
    amount=max(0,min(1,(value-lower)/(upper-lower)))
    return amount*amount*(3-2*amount)

def linear_color(code):
    values=[int(code[index:index+2],16)/255 for index in (0,2,4)]
    return tuple(value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4 for value in values)

def material(title,color,roughness=.6):
    result=bpy.data.materials.new("ANI_"+title)
    result.use_nodes=True
    shader=next(node for node in result.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value=(*linear_color(color),1)
    shader.inputs["Roughness"].default_value=roughness
    shader.inputs["Specular IOR Level"].default_value=.27
    result.diffuse_color=(*linear_color(color),1)
    return result

ink=bpy.data.materials["ANI_Ink"]
sclera=material("Eye_Ivory","F9F5E9",.40)
iris_dark=material("Iris_Outer","35251D",.48)
iris_brown=material("Iris_Chestnut","825734",.41)
iris_light=material("Iris_Lower_Gold","C39A60",.40)
pupil=material("Pupils","17131A",.5)
glint=material("Eye_Catchlight","FFFFFF",.32)
lip_material=material("Lip_Tint","9D625A",.8)
hair_material=material("Hair_Black","211E27",.39)
hair_light=material("Hair_Soft_Highlight","38323D",.46)
hair_dark=material("Hair_Shadow","15131C",.52)
for vertex in body.data.vertices:
    point=vertex.co.copy()
    if not 1.444<point.z<1.546 or point.y>-.074:
        continue
    sign=1 if point.x>=0 else -1
    horizontal=point.x-sign*.034
    vertical=point.z-1.492
    influence=math.exp(-((horizontal/.036)**4+(vertical/.035)**4))*(1-smooth(-.104,-.07,point.y))
    vertex.co.x+=horizontal*.13*influence
    vertex.co.z+=vertical*.92*influence
body.data.update()
skin=bpy.data.materials["ANI_Skin"]
shader=next(node for node in skin.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value=(*linear_color("C18A67"),1)
shader.inputs["Roughness"].default_value=.75
attribute=body.data.color_attributes.new(name="Anime_Skin_Tone",type="FLOAT_COLOR",domain="CORNER")
base_color=Vector(linear_color("C18A67"))
blush_color=Vector(linear_color("C67769"))
lip_color=Vector(linear_color("AB6F65"))
tones=[]
for vertex in body.data.vertices:
    point=vertex.co
    front=1-smooth(-.105,-.062,point.y)
    cheeks=math.exp(-(((abs(point.x)-.054)/.022)**2+((point.z-1.456)/.015)**2))*front
    nose=math.exp(-((point.x/.010)**2+((point.z-1.45)/.012)**2))*front
    lips=math.exp(-((point.x/.021)**4+((point.z-1.412)/.006)**4))*front
    color=base_color.lerp(blush_color,min(.55,cheeks*.46+nose*.18)).lerp(lip_color,lips*.50)
    tones.append((*color,1))
for loop in body.data.loops:
    attribute.data[loop.index].color=tones[loop.vertex_index]
color_node=skin.node_tree.nodes.new("ShaderNodeVertexColor")
color_node.layer_name=attribute.name
skin.node_tree.links.new(color_node.outputs["Color"],shader.inputs["Base Color"])
bpy.context.view_layer.update()
evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh=evaluated.to_mesh()
skin_tree=BVHTree.FromPolygons([vertex.co.copy() for vertex in mesh.vertices],[tuple(polygon.vertices) for polygon in mesh.polygons])

def skin_front(horizontal,vertical,fallback=-.119):
    location,normal,index,distance=skin_tree.ray_cast(Vector((horizontal,-.4,vertical)),Vector((0,1,0)),.6)
    return location.y if location is not None else fallback

def line(title,points,radius,finish,collection=face_collection,cyclic=False,radii=None):
    data=bpy.data.curves.new(title,"CURVE")
    data.dimensions="3D"
    data.bevel_depth=radius
    data.bevel_resolution=3
    spline=data.splines.new("POLY")
    spline.points.add(len(points)-1)
    for index,(control,point) in enumerate(zip(spline.points,points)):
        control.co=(*point,1)
        if radii:
            control.radius=radii[index]
    spline.use_cyclic_u=cyclic
    data.materials.append(finish)
    obj=bpy.data.objects.new(title,data)
    collection.objects.link(obj)
    obj.parent=assembly
    return obj

eye_centers={}
for sign,label in ((1,"L"),(-1,"R")):
    center=Vector((sign*.034,-.109,1.492))
    eye_centers[label]=list(center)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,radius=1)
    eye=bpy.context.object
    eye.name="ANI_Sclera_"+label
    for collection in list(eye.users_collection):
        collection.objects.unlink(eye)
    face_collection.objects.link(eye)
    eye.parent=assembly
    eye.location=center
    eye.scale=(.030,.018,.028)
    eye.data.materials.append(sclera)
    for polygon in eye.data.polygons:
        polygon.use_smooth=True
    def eye_front(horizontal,vertical,eye_center=center):
        distance=((horizontal-eye_center.x)/.030)**2+((vertical-eye_center.z)/.028)**2
        return eye_center.y-.018*math.sqrt(max(.025,1-distance))
    vertices=[(center.x,eye_front(center.x,center.z)-.0004,center.z)]
    faces=[]
    materials=[]
    rings=7
    segments=48
    for ring in range(1,rings+1):
        radius=ring/rings
        for index in range(segments):
            angle=index/segments*math.tau
            horizontal=center.x+math.cos(angle)*.0118*radius
            vertical=center.z+math.sin(angle)*.0173*radius
            vertices.append((horizontal,eye_front(horizontal,vertical)-.00045,vertical))
            current=1+(ring-1)*segments+index
            following=1+(ring-1)*segments+(index+1)%segments
            if ring==1:
                faces.append((0,current,following))
            else:
                faces.append((current-segments,current,following,following-segments))
            materials.append(0 if ring==rings else 2 if math.sin(angle)<-.1 and ring>3 else 1)
    iris_mesh=bpy.data.meshes.new("ANI_Painted_Iris_"+label)
    iris_mesh.from_pydata(vertices,[],faces)
    for finish in (iris_dark,iris_brown,iris_light):
        iris_mesh.materials.append(finish)
    for polygon,index in zip(iris_mesh.polygons,materials):
        polygon.material_index=index
        polygon.use_smooth=True
    iris=bpy.data.objects.new(iris_mesh.name,iris_mesh)
    face_collection.objects.link(iris)
    iris.parent=assembly
    for title,delta_x,delta_z,radius_x,radius_z,finish in (("Pupil",0,.001,.0058,.0117,pupil),("Main_Glint",-.0039,.0075,.0034,.0045,glint),("Small_Glint",.0040,-.006,.0015,.0020,glint)):
        points=[(center.x+delta_x,eye_front(center.x+delta_x,center.z+delta_z)-.0009,center.z+delta_z)]
        for index in range(40):
            angle=index/40*math.tau
            horizontal=center.x+delta_x+radius_x*math.cos(angle)
            vertical=center.z+delta_z+radius_z*math.sin(angle)
            points.append((horizontal,eye_front(horizontal,vertical)-(.0013 if title!="Pupil" else .0008),vertical))
        geometry=bpy.data.meshes.new("ANI_"+title+"_"+label)
        geometry.from_pydata(points,[],[(0,1+index,1+(index+1)%40) for index in range(40)])
        geometry.materials.append(finish)
        detail=bpy.data.objects.new(geometry.name,geometry)
        face_collection.objects.link(detail)
        detail.parent=assembly
    for upper in (True,False):
        points=[]
        radii=[]
        for index in range(41):
            angle=index/40*math.pi
            horizontal=sign*(.034-.024*math.cos(angle))
            vertical=1.491+(1 if upper else -1)*(.018 if upper else .013)*math.sin(angle)+.003*(index/40-.5)
            depth=min(skin_front(horizontal,vertical),eye_front(horizontal,vertical))-.0010
            points.append((horizontal,depth,vertical))
            radii.append(.36+.7*math.sin(index/40*math.pi*.8))
        line("ANI_"+("Upper_Lashes_" if upper else "Lower_Lid_")+label,points,.0017 if upper else .00065,ink,radii=radii)
    brow=[]
    for index in range(29):
        amount=index/28
        horizontal=sign*(.017+amount*.044)
        vertical=1.525+.006*math.sin(amount*math.pi)-.005*amount
        brow.append((horizontal,skin_front(horizontal,vertical)-.0010,vertical))
    line("ANI_Brow_"+label,brow,.0025,ink,radii=[.70+.25*math.sin(index/28*math.pi)-.42*(index/28)**3 for index in range(29)])
mouth=[]
for index in range(33):
    horizontal=-.018+index/32*.036
    vertical=1.410+.003*(abs(horizontal)/.018)**2
    mouth.append((horizontal,skin_front(horizontal,vertical)-.0008,vertical))
line("ANI_Soft_Smile",mouth,.00075,lip_material,radii=[max(.15,math.sin(index/32*math.pi)) for index in range(33)])
evaluated.to_mesh_clear()
cap_vertices=[]
cap_faces=[]
mapping={}
for polygon in body.data.polygons:
    center=polygon.center
    threshold=1.570 if center.y<-.055 else 1.433
    if abs(center.x)>.069 and center.y>-.078:
        threshold=1.471
    if center.z<threshold:
        continue
    indices=[]
    for index in polygon.vertices:
        if index not in mapping:
            vertex=body.data.vertices[index]
            mapping[index]=len(cap_vertices)
            cap_vertices.append(tuple(vertex.co+vertex.normal*.008))
        indices.append(mapping[index])
    cap_faces.append(tuple(indices))
cap_mesh=bpy.data.meshes.new("ANI_Scalp_Shell")
cap_mesh.from_pydata(cap_vertices,[],cap_faces)
cap_mesh.materials.append(hair_dark)
cap=bpy.data.objects.new("ANI_Scalp_Shell",cap_mesh)
hair_collection.objects.link(cap)
cap.parent=assembly
for polygon in cap_mesh.polygons:
    polygon.use_smooth=True
modifier=cap.modifiers.new("Soft_Scalp","SUBSURF")
modifier.levels=2
modifier.render_levels=2

def interpolate(points,amount):
    position=amount*(len(points)-1)
    index=min(len(points)-2,int(position))
    fraction=position-index
    first=Vector(points[max(0,index-1)])
    second=Vector(points[index])
    third=Vector(points[index+1])
    fourth=Vector(points[min(len(points)-1,index+2)])
    return .5*((2*second)+(-first+third)*fraction+(2*first-5*second+4*third-fourth)*fraction**2+(-first+3*second-3*third+fourth)*fraction**3)

def lock(title,path,width,tangent,outward,finish,highlight=False):
    broad=Vector(tangent).normalized()
    normal=Vector(outward).normalized()
    points=[]
    faces=[]
    rows=36
    sections=8
    centers=[]
    for row in range(rows+1):
        amount=row/rows
        center=interpolate(path,amount)
        taper=(.15+.85*min(1,amount/.10))*(1-amount**5)+.025
        half_width=width*.5*taper
        thickness=.0055*taper
        centers.append(tuple(center+normal*(thickness+.0007)))
        for section in range(sections):
            angle=section/sections*math.tau
            points.append(tuple(center+broad*math.cos(angle)*half_width+normal*math.sin(angle)*thickness))
            if row:
                current=row*sections+section
                following=row*sections+(section+1)%sections
                faces.append((current-sections,following-sections,following,current))
    faces.append(tuple(reversed(range(sections))))
    faces.append(tuple(rows*sections+section for section in range(sections)))
    mesh=bpy.data.meshes.new(title)
    mesh.from_pydata(points,[],faces)
    mesh.materials.append(finish)
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    obj=bpy.data.objects.new(title,mesh)
    hair_collection.objects.link(obj)
    obj.parent=assembly
    modifier=obj.modifiers.new("Sculpted_Hair_Lock","SUBSURF")
    modifier.levels=1
    modifier.render_levels=1
    if highlight:
        line(title+"_Sheen",centers[5:25],.00065,hair_light,hair_collection,radii=[.45+.35*math.sin(index/19*math.pi) for index in range(20)])
    return obj

for index in range(20):
    angle=.66+index/19*(math.tau-1.32)
    sine=math.sin(angle)
    cosine=math.cos(angle)
    length=.93+.055*math.sin(index*1.72)
    path=[(-.014+sine*.032,-.023+cosine*.016,1.645),(.096*sine,-.048-.091*cosine,1.584),(.113*sine,-.025-.116*cosine,1.441),(.126*sine,.050-.104*cosine,1.241),(.136*sine,.070-.091*cosine,1.074),(.120*sine+.010*math.sin(index),.071-.085*cosine,length)]
    lock("ANI_Back_Lock_"+str(index).zfill(2),path,.037,(cosine,sine,0),(sine,-cosine,0),hair_material if index%4 else hair_dark,index%3==1)
for sign,count in ((-1,6),(1,4)):
    for index in range(count):
        if sign<0:
            path=[(.020-index*.004,-.039,1.647),(-.013-index*.006,-.116,1.614-index*.002),(-.064-index*.005,-.134,1.563-index*.004),(-.106-index*.003,-.113,1.460),(-.130-index*.005,-.165,1.271),(-.124-index*.006,-.193,1.095+index*.026)]
        else:
            path=[(.023+index*.006,-.030,1.642),(.064+index*.005,-.093,1.604),(.099+index*.005,-.099,1.538),(.115+index*.003,-.099,1.394),(.142+index*.003,-.160,1.228),(.126+index*.004,-.184,1.056+index*.035)]
        lock("ANI_FaceFraming_"+str(sign)+"_"+str(index),path,.025 if sign<0 else .028,(1,0,0),(0,-1,0),hair_material,index in (1,4))
scene["anime_eye_centers"]=json.dumps(eye_centers)
scene["anime_stage"]="anime-face-and-long-parted-hair"
body["anime_face_hair"]=True
assert [tuple(polygon.vertices) for polygon in body.data.polygons]==[tuple(polygon.vertices) for polygon in bpy.data.objects["ANI_Untouched_MakeHuman_Body"].data.polygons]
scene.camera.location=(1.65,-3.9,1.92)
scene.camera.rotation_euler=(Vector((0,-.025,.89))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=OUT+"/03-anime-character.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/anime_03_face_hair.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"body_quads_unchanged":True,"hair_locks":30,"painted_eye_layers":True,"photograph_textures_used":False,"personal_reference_style":"long parted black hair, white tee, navy shorts, slides"}))
