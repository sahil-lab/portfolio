import bpy
import bmesh
import math
import json
from mathutils import Vector, Matrix

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene = bpy.context.scene
assert scene.name=="Sah_Face_Sculpt"
assert bpy.data.objects.get("SAH_Head_Sculpt") is None
base = bpy.data.objects["SAH_Head_Landmark_Cage"]
assert max(abs(value) for value in base.rotation_euler)<.0001
features = bpy.data.collections["SAH_03_FACE_FEATURES"]
sculpt_collection = bpy.data.collections["SAH_02_SCULPT"]

def move(obj,collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)

def material(name,color,roughness):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = (*color,1)
    shader = next(node for node in result.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color,1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Specular IOR Level"].default_value = .3
    return result,shader

sclera,sclera_shader = material("SAH_Eye_Sclera",(.46,.48,.43),.31)
sclera_shader.inputs["Coat Weight"].default_value = .12
iris,iris_shader = material("SAH_Iris_Deep_Brown",(.009,.006,.0035),.25)
iris_shader.inputs["Coat Weight"].default_value = .60
iris_shader.inputs["Coat Roughness"].default_value = .12
pupil,pupil_shader = material("SAH_Pupil",(.0008,.0007,.0006),.19)
pupil_shader.inputs["Coat Weight"].default_value = .45
ear_material,ear_shader = material("SAH_Ear_Skin",(.27,.125,.072),.54)
ear_shader.inputs["Subsurface Weight"].default_value = .08
ear_shader.inputs["Subsurface Scale"].default_value = .008
cavity,cavity_shader = material("SAH_Ear_Concha_Shadow",(.095,.030,.017),.69)

for suffix in ("R","L"):
    iris_point = Vector(REFERENCE_DATA["landmarks"]["iris_"+suffix])
    radius = .0133 if suffix=="R" else .0130
    eye_center = iris_point+Vector((0,radius-.0004,0))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,radius=radius,location=eye_center)
    eyeball = bpy.context.object
    eyeball.name = "SAH_EYE_"+suffix
    move(eyeball,features)
    eyeball.data.materials.append(sclera)
    for face in eyeball.data.polygons:
        face.use_smooth = True
    for name,disc_radius,disc_material,offset in (("IRIS",.00575,iris,.00013),("PUPIL",.0026,pupil,.00021)):
        vertices=[(eye_center.x,eye_center.y-radius-offset,eye_center.z)]
        faces=[]
        uv=[(.5,.5)]
        for ring in range(1,9):
            radial=disc_radius*ring/8
            for step in range(64):
                angle=step*math.tau/64
                vertices.append((eye_center.x+math.cos(angle)*radial,eye_center.y-math.sqrt(radius*radius-radial*radial)-offset,eye_center.z+math.sin(angle)*radial))
                uv.append((.5+math.cos(angle)*ring/16,.5+math.sin(angle)*ring/16))
        for step in range(64):
            faces.append((0,1+step,1+(step+1)%64))
        for ring in range(7):
            for step in range(64):
                first=1+ring*64+step
                second=1+ring*64+(step+1)%64
                faces.append((first,second,second+64,first+64))
        mesh=bpy.data.meshes.new("SAH_"+name+"_"+suffix)
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        texture=mesh.uv_layers.new(name="Eye_UV")
        for loop in mesh.loops:
            texture.data[loop.index].uv=uv[loop.vertex_index]
        obj=bpy.data.objects.new(mesh.name,mesh)
        features.objects.link(obj)
        mesh.materials.append(disc_material)
        for face in mesh.polygons:
            face.use_smooth=True
        if name=="IRIS":
            colors=mesh.color_attributes.new(name="Iris_Radial",type="FLOAT_COLOR",domain="CORNER")
            for loop in mesh.loops:
                point=Vector(vertices[loop.vertex_index])-eye_center
                angle=math.atan2(point.z,point.x)
                radial=math.hypot(point.x,point.z)/disc_radius
                streak=.65+.22*math.sin(angle*79)+.13*math.sin(angle*151+radial*18)
                band=.32+.68*math.sin(min(1,radial)*math.pi)
                colors.data[loop.index].color=(.027*streak*band,.020*streak*band,.009*streak*band,1)
            if not iris.node_tree.nodes.get("SAH_Iris_Attribute"):
                node=iris.node_tree.nodes.new("ShaderNodeVertexColor")
                node.name="SAH_Iris_Attribute"
                node.layer_name="Iris_Radial"
                iris.node_tree.links.new(node.outputs["Color"],iris_shader.inputs["Base Color"])

for side,suffix in ((-1,"R"),(1,"L")):
    center=Vector((side*.083,.041,.133 if side<0 else .131))
    vertices=[tuple(center+Vector((0,.003,0)))]
    faces=[]
    ring_count=8
    sections=64
    for ring in range(1,ring_count+1):
        fraction=ring/ring_count
        for step in range(sections):
            angle=step*math.tau/sections
            vertical=math.cos(angle)
            horizontal=math.sin(angle)
            ear_width=.012*(.9+.15*vertical)
            bulge=-.007*math.exp(-((fraction-.85)/.14)**2)+.004*math.exp(-((fraction-.33)/.24)**2)
            point=center+Vector((side*(horizontal*ear_width*fraction+.0025*vertical*fraction),bulge-.002*vertical*fraction,vertical*.028*fraction))
            vertices.append(tuple(point))
    for step in range(sections):
        faces.append((0,1+step,1+(step+1)%sections))
    for ring in range(ring_count-1):
        for step in range(sections):
            first=1+ring*sections+step
            second=1+ring*sections+(step+1)%sections
            faces.append((first,second,second+sections,first+sections))
    mesh=bpy.data.meshes.new("SAH_Ear_Anatomy_"+suffix)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    ear=bpy.data.objects.new("SAH_EAR_"+suffix,mesh)
    features.objects.link(ear)
    mesh.materials.append(ear_material)
    for face in mesh.polygons:
        face.use_smooth=True
    thickness=ear.modifiers.new("Cartilage_Thickness","SOLIDIFY")
    thickness.thickness=.0025
    smooth=ear.modifiers.new("Soft_Helix_Surface","SUBSURF")
    smooth.levels=2
    smooth.render_levels=2
    ridge=bpy.data.curves.new("SAH_Antihelix_"+suffix,"CURVE")
    ridge.dimensions="3D"
    ridge.bevel_depth=.00165
    ridge.bevel_resolution=3
    spline=ridge.splines.new("BEZIER")
    points=[center+Vector((side*horizontal,depth,vertical)) for horizontal,depth,vertical in ((-.002,-.001,-.014),(.002,-.002,-.002),(.006,-.002,.008),(.002,-.003,.018))]
    spline.bezier_points.add(len(points)-1)
    for point,position in zip(spline.bezier_points,points):
        point.co=position
        point.handle_left_type=point.handle_right_type="AUTO"
    ridge.materials.append(ear_material)
    obj=bpy.data.objects.new(ridge.name,ridge)
    features.objects.link(obj)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=1,location=center+Vector((-side*.003,-.001,-.004)))
    concha=bpy.context.object
    concha.name="SAH_Concha_Recess_"+suffix
    concha.scale=(.0035,.0012,.006)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    concha.data.materials.append(cavity)
    move(concha,features)

bpy.ops.object.select_all(action="DESELECT")
head=base.copy()
head.data=base.data.copy()
head.name="SAH_Head_Sculpt"
sculpt_collection.objects.link(head)
head.hide_render=False
head.hide_viewport=False
head.select_set(True)
bpy.context.view_layer.objects.active=head
for modifier in list(head.modifiers):
    bpy.ops.object.modifier_apply(modifier=modifier.name)
base.hide_render=True
base.hide_set(True)
image=bpy.data.images.load(OUT+"/textures/face_reference_color.png",check_existing=True)
image.pack()
portrait_material=bpy.data.materials["SAH_Portrait_Reference_Color"]
for node in portrait_material.node_tree.nodes:
    if node.type=="TEX_IMAGE":
        node.image=image
camera=REFERENCE_DATA["camera"]
uv=head.data.uv_layers.active
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    depth=point.y-camera["position"][1]
    horizontal=camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth
    vertical=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth
    uv.data[loop.index].uv=(horizontal/camera["image_width"],1-vertical/camera["image_height"])
for face in head.data.polygons:
    if face.material_index==1 and face.center.y<.09 and face.normal.y<-.15:
        face.material_index=0
for owner in (portrait_material,bpy.data.materials["SAH_Skin_Base"]):
    nodes=owner.node_tree.nodes
    links=owner.node_tree.links
    shader=next(node for node in nodes if node.type=="BSDF_PRINCIPLED")
    texture=nodes.new("ShaderNodeTexNoise")
    texture.name="Skin_Microstructure"
    texture.inputs["Scale"].default_value=2100
    texture.inputs["Detail"].default_value=2
    texture.inputs["Roughness"].default_value=.63
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.13
    bump.inputs["Distance"].default_value=.000065
    links.new(texture.outputs["Fac"],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],shader.inputs["Normal"])
multires=head.modifiers.new("SAH_Multires_Sculpt_Detail","MULTIRES")
for subdivision in range(2):
    bpy.ops.object.multires_subdivide(modifier=multires.name,mode="CATMULL_CLARK")
multires.levels=2
multires.sculpt_levels=2
multires.render_levels=2
head["anatomy_stage"]="Measured face with separate anatomical eyes, ears and editable Multires; sculpt correction follows"
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples=16
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.filepath=OUT+"/renders/anatomy-color-front.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_02_anatomy.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"sculpt_mesh_vertices":len(head.data.vertices),"multires_levels":multires.total_levels,"eyes":2,"ears":2,"portrait_uv_reprojected":True}))
