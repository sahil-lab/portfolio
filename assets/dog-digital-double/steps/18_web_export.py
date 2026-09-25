import bpy
import math
import random
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("groom_correction_rounds_completed", 0) >= 2
assert scene.get("eye_window_correction_applied")
assert bpy.data.objects.get("DOG_WEB_LOD0") is None, "Web assets already exist"
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
export_collection = bpy.data.collections["08_EXPORT"]
groom = bpy.data.collections["05_GROOM"]
random.seed(230923)

width, height = 256, 512
atlas = bpy.data.images.new("fur_strand_atlas", width=width, height=height, alpha=True)
atlas.colorspace_settings.name = "sRGB"
pixels = [0.0] * (width*height*4)
fibers = [{"center": .025+random.random()*.95, "length": .74+random.random()*.26, "width": .65+random.random()*.65, "phase": random.random()*math.tau, "shade": .77+random.random()*.20} for index in range(110)]
for row in range(height):
    progress = row/(height-1)
    for fiber in fibers:
        if progress > fiber["length"]:
            continue
        center = (fiber["center"]+.005*math.sin(progress*8+fiber["phase"]))*width
        radius = fiber["width"]*min(1, max(.03, (fiber["length"]-progress)*18))
        for column in range(max(0, int(center-radius*2)), min(width-1, int(center+radius*2))+1):
            opacity = math.exp(-math.pow((column-center)/radius, 2))*min(1, progress*35+.75)
            offset = (row*width+column)*4
            if opacity > pixels[offset+3]:
                pixels[offset:offset+4] = [fiber["shade"]]*3+[opacity]
atlas.pixels.foreach_set(pixels)
atlas.filepath_raw = OUT+"/textures/fur_strand_atlas.png"
atlas.file_format = "PNG"
atlas.save()
atlas.pack()
material = bpy.data.materials.new("WEB_Fur_Alpha_Cutout_PBR")
material.use_nodes = True
material.use_backface_culling = False
material.diffuse_color = (.75,.68,.55,1)
material.alpha_threshold = .32
if hasattr(material, "surface_render_method"):
    material.surface_render_method = "DITHERED"
nodes, links = material.node_tree.nodes, material.node_tree.links
shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
shader.inputs["Roughness"].default_value = .90
shader.inputs["Specular IOR Level"].default_value = .18
texture = nodes.new("ShaderNodeTexImage")
texture.image = atlas
color = nodes.new("ShaderNodeVertexColor")
color.layer_name = "Coat"
multiply = nodes.new("ShaderNodeMixRGB")
multiply.blend_type = "MULTIPLY"
multiply.inputs[0].default_value = 1
links.new(texture.outputs["Color"], multiply.inputs[1])
links.new(color.outputs["Color"], multiply.inputs[2])
links.new(multiply.outputs[0], shader.inputs["Base Color"])
threshold = nodes.new("ShaderNodeMath")
threshold.operation = "GREATER_THAN"
threshold.inputs[1].default_value = .32
links.new(texture.outputs["Alpha"], threshold.inputs[0])
links.new(threshold.outputs[0], shader.inputs["Alpha"])
material["web_fur"] = "Alpha-cutout locks derived from the corrected native Hair Curves guides; no simulated curves in GLB"

def web_body(root, lod):
    sources = [bpy.data.objects[name] for name in ("DOG_BODY_RETOPO", "DOG_EAR_L", "DOG_EAR_R", "DOG_TAIL")]
    sources += [obj for obj in bpy.data.collections["04_EYES_NOSE"].objects if not obj.hide_render]
    for original in sources:
        obj = original.copy()
        obj.data = original.data.copy()
        obj.name = "WEB_L%d_" % lod + original.name
        export_collection.objects.link(obj)
        obj.hide_set(False)
        obj.hide_render = False
        obj.parent = root
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            if modifier.type == "MULTIRES":
                obj.modifiers.remove(modifier)
            elif modifier.type == "SUBSURF":
                modifier.levels = modifier.render_levels = 1
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            else:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        if obj.type == "CURVE":
            bpy.ops.object.convert(target="MESH")
        if lod == 2 and original.name == "DOG_BODY_RETOPO":
            decimate = obj.modifiers.new("Distance_LOD_Reduction", "DECIMATE")
            decimate.ratio = .48
            bpy.ops.object.modifier_apply(modifier=decimate.name)
        if obj.type == "MESH":
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
            if not obj.data.uv_layers:
                bpy.ops.object.mode_set(mode="EDIT")
                bpy.ops.mesh.select_all(action="SELECT")
                bpy.ops.uv.smart_project(island_margin=.025)
                bpy.ops.object.mode_set(mode="OBJECT")

reports = []
for lod, stride, point_indices in ((0,1,[0,1,2,3,4,5,6,7,8,9,10,11]),(1,2,[0,2,4,6,8,10,11]),(2,4,[0,4,8,11])):
    root = bpy.data.objects.new("DOG_WEB_LOD%d" % lod, None)
    export_collection.objects.link(root)
    root["source"] = "Native Blender MCP groom with stationary surface roots and two reviewed correction rounds plus eye-window refinement"
    root["lod"] = lod
    root["units"] = "meters"
    root["rigged"] = False
    web_body(root, lod)
    for original in groom.objects:
        if original.type != "CURVES":
            continue
        positions = original.data.attributes["position"]
        root_colors = original.data.attributes["coat_color"]
        normals = original.data.attributes["guide_up"]
        vertices, faces, texture_coords, colors = [], [], [], []
        zone = original.name
        half_width = .0062 if zone in {"FUR_BODY", "FUR_CHEST", "FUR_NECK"} else .0040
        if zone.startswith("FUR_EAR") or zone == "FUR_TAIL":
            half_width = .0060
        if zone in {"FUR_HEAD", "FUR_BROWS", "FUR_MUZZLE"}:
            half_width = .0035
        half_width *= 1 + lod*.30
        for curve_index in range(0, len(original.data.curves), stride):
            curve = original.data.curves[curve_index]
            start = curve.first_point_index
            guide = [positions.data[start+index].vector.copy() for index in point_indices]
            normal = normals.data[curve_index].vector.normalized()
            tint = tuple(root_colors.data[curve_index].color[:3])
            first_vertex = len(vertices)
            for row, center in enumerate(guide):
                factor = point_indices[row]/11
                tangent = (guide[min(len(guide)-1,row+1)]-guide[max(0,row-1)]).normalized()
                across = normal.cross(tangent)
                if across.length < .08:
                    across = Vector((1,0,0)).cross(tangent)
                if across.length < .08:
                    across = Vector((0,1,0))
                across.normalize()
                for column in range(3):
                    point = center + across * ((column-1)*half_width*(1-.46*factor))
                    point += normal * (half_width*.10 if column == 1 else 0)
                    point.z = max(.0007,point.z)
                    vertices.append(tuple(point))
                    texture_coords.append((column/2,factor))
                    colors.append((*tint,1))
                if row:
                    prior = first_vertex+(row-1)*3
                    current = first_vertex+row*3
                    for column in range(2):
                        faces.append((prior+column,prior+column+1,current+column+1,current+column))
        mesh = bpy.data.meshes.new("WEB_L%d_%s_Locks" % (lod,zone))
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        uv = mesh.uv_layers.new(name="Fur_Atlas_UV")
        color_attribute = mesh.color_attributes.new(name="Coat",type="FLOAT_COLOR",domain="CORNER")
        for loop in mesh.loops:
            uv.data[loop.index].uv = texture_coords[loop.vertex_index]
            color_attribute.data[loop.index].color = colors[loop.vertex_index]
        mesh.color_attributes.active_color = color_attribute
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        obj = bpy.data.objects.new(mesh.name,mesh)
        export_collection.objects.link(obj)
        obj.matrix_world = original.matrix_world.copy()
        obj.parent = root
        obj["guide_source"] = original.name
        obj["guide_stride"] = stride
    members = list(root.children)
    triangles = 0
    for obj in members:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
            assert obj.data.uv_layers, obj.name+" missing UVs"
            assert all(math.isfinite(value) for vertex in obj.data.vertices for value in vertex.co), obj.name+" invalid geometry"
    assert triangles < (300000 if lod==0 else 180000 if lod==1 else 90000)
    for obj in members:
        obj.hide_set(True)
        obj.hide_render = True
    reports.append({"lod":lod,"root":root.name,"meshes":len(members),"triangles":triangles})

for report in reports:
    root = bpy.data.objects[report["root"]]
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    filename = "dog_web.glb" if report["lod"]==0 else "dog_web_lod%d.glb" % report["lod"]
    bpy.ops.export_scene.gltf(filepath=OUT+"/"+filename,export_format="GLB",use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
    for obj in root.children:
        obj.hide_set(True)
        obj.hide_render = True
    report["file"] = filename
scene["web_lod_report"] = json.dumps(reports)
scene["web_conversion"] = "Guide-derived alpha-cutout mesh locks plus optimized body. Native Hair Curves remain in the master."
bpy.ops.object.select_all(action="DESELECT")
body = bpy.data.objects["DOG_BODY_RETOPO"]
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_master.blend")
print(json.dumps({"web_lods":reports,"native_hair_regions_preserved":12,"master":OUT+"/dog_master.blend"}))
