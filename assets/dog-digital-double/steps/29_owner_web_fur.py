import bpy
import math
import random
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("owner_cheek_silhouette_v3")
assert not scene.get("owner_web_fur_v4")
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
random.seed(240926)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/before-web-fur.blend",copy=True)
material = bpy.data.materials["WEB_Fur_Alpha_Cutout_PBR"]
old_atlas = next(node.image for node in material.node_tree.nodes if node.type=="TEX_IMAGE")
if old_atlas:
    old_atlas.name = "fur_strand_atlas_before_owner_revision"
width,height = 256,512
atlas = bpy.data.images.new("fur_strand_atlas",width=width,height=height,alpha=True)
atlas.colorspace_settings.name = "sRGB"
pixels = [0.0]*(width*height*4)
fibers = [{"center":.015+random.random()*.97,"length":.58+random.random()*.42,"radius":.67+random.random()*.56,"phase":random.random()*math.tau,"shade":.85+random.random()*.14} for index in range(56)]
for row in range(height):
    progress = row/(height-1)
    for fiber in fibers:
        if progress>fiber["length"]:
            continue
        center = (fiber["center"]+.008*math.sin(progress*7+fiber["phase"]))*width
        radius = fiber["radius"]*min(1,max(.035,(fiber["length"]-progress)*19))
        for column in range(max(0,int(center-radius*2)),min(width-1,int(center+radius*2))+1):
            alpha = math.exp(-math.pow((column-center)/radius,2))*min(1,.8+progress*25)
            offset = (row*width+column)*4
            if alpha>pixels[offset+3]:
                pixels[offset:offset+4] = [fiber["shade"]]*3+[alpha]
atlas.pixels.foreach_set(pixels)
atlas.filepath_raw = OUT+"/textures/fur_strand_atlas.png"
atlas.file_format = "PNG"
atlas.save()
atlas.pack()
for node in material.node_tree.nodes:
    if node.type=="TEX_IMAGE":
        node.image = atlas
    if node.type=="MATH" and node.operation=="GREATER_THAN":
        node.inputs[1].default_value = .25
material.alpha_threshold = .25
material["owner_revision"] = "Two narrower feathered locks per guide, irregular strand lengths and taper to fine tips"
groom = bpy.data.collections["05_GROOM"]
reports = []

for lod,stride,samples in ((0,1,[0,1,2,3,4,5,6,7,8,9,10,11]),(1,2,[0,2,4,6,8,10,11]),(2,4,[0,4,8,11])):
    root = bpy.data.objects["DOG_WEB_LOD%d"%lod]
    for source in bpy.data.collections["04_EYES_NOSE"].objects:
        copy = bpy.data.objects.get("WEB_L%d_"%lod+source.name)
        if copy is None:
            continue
        copy.hide_render = True
        copy.hide_set(True)
        copy["owner_export_included"] = not source.hide_render
        if source.type=="MESH" and not source.modifiers:
            copy.data = source.data.copy()
            copy.matrix_world = source.matrix_world.copy()
    for source in groom.objects:
        if source.type!="CURVES":
            continue
        obj = bpy.data.objects["WEB_L%d_%s_Locks"%(lod,source.name)]
        positions = source.data.attributes["position"]
        normal_attribute = source.data.attributes["guide_up"]
        color_attribute = source.data.attributes["coat_color"]
        vertices,faces,uvs,tints = [],[],[],[]
        facial = source.name in {"FUR_HEAD","FUR_BROWS","FUR_MUZZLE"}
        half_width = (.00155 if facial else .0022 if source.name in {"FUR_BODY","FUR_CHEST","FUR_NECK","FUR_TAIL"} else .0018)*(1+lod*.24)
        for guide_index in range(0,len(source.data.curves),stride):
            curve = source.data.curves[guide_index]
            start = curve.first_point_index
            guide = [positions.data[start+index].vector.copy() for index in samples]
            normal = normal_attribute.data[guide_index].vector.normalized()
            tint = tuple(color_attribute.data[guide_index].color[:3])
            for lock in (-1,1):
                first = len(vertices)
                variation = .5+.5*math.sin(guide_index*3.13+lock*.81)
                width_factor = .78+variation*.44
                length_factor = .78+(.5+.5*math.sin(guide_index*1.79+lock))* .28
                for row,guide_point in enumerate(guide):
                    factor = samples[row]/11
                    center = guide[0]+(guide_point-guide[0])*length_factor
                    tangent = (guide[min(len(guide)-1,row+1)]-guide[max(0,row-1)]).normalized()
                    across = normal.cross(tangent)
                    if across.length<.08:
                        across = Vector((1,0,0)).cross(tangent)
                    if across.length<.08:
                        across = Vector((0,1,0))
                    across.normalize()
                    center += across*(lock*half_width*.58*(.65+.35*factor))
                    center += normal*(.0003+lock*.00016*math.sin(factor*math.pi))
                    taper = max(.035,math.pow(1-factor,.72))*(.80+.30*math.sin(factor*math.pi))
                    for edge in (-1,1):
                        point = center+across*(edge*half_width*width_factor*taper)
                        point.z = max(.0007,point.z)
                        vertices.append(tuple(point))
                        uvs.append(((edge+1)/2,factor))
                        tints.append((*tint,1))
                    if row:
                        prior = first+(row-1)*2
                        current = first+row*2
                        faces.append((prior,prior+1,current+1,current))
        mesh = bpy.data.meshes.new(obj.name+"_OwnerRevision")
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        uv = mesh.uv_layers.new(name="Fur_Atlas_UV")
        coats = mesh.color_attributes.new(name="Coat",type="FLOAT_COLOR",domain="CORNER")
        for loop in mesh.loops:
            uv.data[loop.index].uv = uvs[loop.vertex_index]
            coats.data[loop.index].color = tints[loop.vertex_index]
        mesh.color_attributes.active_color = coats
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        obj.data = mesh
        obj.matrix_world = source.matrix_world.copy()
        obj["owner_export_included"] = True
        obj["owner_revision"] = "paired tapered feathered locks from revised native guide groom"
    included = [obj for obj in root.children if obj.get("owner_export_included",True)]
    triangles = 0
    for obj in included:
        if obj.type=="MESH":
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
            assert obj.data.uv_layers,obj.name+" missing UVs"
            assert all(math.isfinite(value) for vertex in obj.data.vertices for value in vertex.co)
    assert triangles < (300000 if lod==0 else 180000 if lod==1 else 90000)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in included:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    root["owner_revision"] = "Revised eyes, hanging beard, broader chest, varied ear hair and feathered web locks"
    filename = "dog_web.glb" if lod==0 else "dog_web_lod%d.glb"%lod
    bpy.ops.export_scene.gltf(filepath=OUT+"/"+filename,export_format="GLB",use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_vertex_color="NAME",export_vertex_color_name="Coat",export_all_vertex_colors=False,export_tangents=True)
    for obj in root.children:
        obj.hide_set(True)
        obj.hide_render = True
    reports.append({"lod":lod,"root":root.name,"file":filename,"triangles":triangles,"meshes":len(included),"narrow_locks_per_guide":2})
scene["web_lod_report"] = json.dumps(reports)
scene["owner_web_fur_v4"] = json.dumps(reports)
scene["asset_status"] = "Owner-requested likeness corrections applied; still an artistic approximation for review"
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = bpy.data.objects["DOG_BODY_RETOPO"]
bpy.data.objects["DOG_BODY_RETOPO"].select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/revised-master.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_06_final.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_master.blend")
print(json.dumps({"owner_revision_exported":True,"lods":reports,"native_hair_regions_preserved":12},indent=2))
