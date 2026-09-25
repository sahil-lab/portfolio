import bpy
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_BODY_RETOPO"]
assert body.get("topology_report")
surfaces = [body, bpy.data.objects["DOG_EAR_L"], bpy.data.objects["DOG_EAR_R"], bpy.data.objects["DOG_TAIL"]]
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
for obj in surfaces:
    obj.hide_set(False)
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=.018, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(margin=.012, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")

def smooth(minimum, maximum, value):
    amount = min(1, max(0, (value - minimum) / (maximum - minimum)))
    return amount * amount * (3 - 2 * amount)

def linear_hex(value):
    channels = [int(value[index:index+2], 16) / 255 for index in (0, 2, 4)]
    return tuple(channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in channels)

white = linear_hex("e4decb")
cream = linear_hex("c2b49a")
brown = linear_hex("674323")
light_brown = linear_hex("855d34")
dark = linear_hex("1d1510")

def blend(first, second, weight):
    return tuple(first[index] * (1 - weight) + second[index] * weight for index in range(3))

def coat_values(point, name):
    horizontal, depth, height = point
    if "EAR" in name:
        return blend(dark, brown, smooth(.185, .268, height)), .88, .060, .96
    if "TAIL" in name:
        return blend(brown, white, smooth(.229, .289, height)), .88, .095, 1.0
    tint = white
    length = .048
    density = 1.0
    if (depth < -.127 and height > .186) or (depth < -.106 and height > .265):
        tint = blend(brown, light_brown, .12 + .10 * math.sin(horizontal * 32 + height * 48))
        eye_left = ((horizontal - .0347) / .040) ** 2 + ((height - .2642) / .028) ** 2
        eye_right = ((horizontal + .0347) / .042) ** 2 + ((height - .2636) / .030) ** 2
        eye_mask = (1 - smooth(.55, 1.8, min(eye_left, eye_right))) * (1 - smooth(-.194, -.158, depth))
        tint = blend(tint, dark, eye_mask)
        center = .0015 + .0025 * math.sin((height - .246) * 40)
        width = .004 + max(0, height - .264) * .20
        border = abs(horizontal - center) + .0015 * math.sin(height * 115 + horizontal * 30)
        blaze = (1 - smooth(width, width + .006, border)) * smooth(.244, .269, height)
        tint = blend(tint, white, blaze)
        if height < .251 and depth < -.199:
            tint = blend(tint, blend(cream, white, 1 - smooth(.214, .252, height)), 1 - smooth(.239, .257, height))
        if depth > -.181 and height < .254:
            tint = blend(tint, white, smooth(-.189, -.145, depth) * (1 - smooth(.232, .267, height)))
        length = .031 if height > .25 else .047
        eye_distance = min(math.hypot(horizontal - .0347, height - .2642), math.hypot(horizontal + .0347, height - .2636))
        density *= smooth(.010, .017, eye_distance) if depth < -.204 else 1
        if depth < -.242 and abs(horizontal) < .016 and .229 < height < .253:
            density = 0
    else:
        boundary = .157 + .007 * math.sin(depth * 49 + horizontal * 21) + .004 * math.sin(depth * 103)
        saddle = smooth(boundary, boundary + .019, height) * smooth(-.082, -.035, depth)
        white_wisp = math.exp(-(((horizontal - .035) / .016) ** 2 + ((depth - .083) / .037) ** 2)) * .72
        tint = blend(white, brown, saddle * (1 - white_wisp))
        if height < .060:
            tint = blend(tint, cream, (1 - smooth(.015, .060, height)) * .17)
            length = .034
        if depth < -.045:
            length = .058
    if height < .006:
        density = 0
    return tint, .88, length, density

names = ["DOG_CoatColor", "DOG_FurRoughness", "DOG_FurLength", "DOG_FurDensity"]
for obj in surfaces:
    attributes = {name: obj.data.color_attributes.get(name) or obj.data.color_attributes.new(name=name, type="FLOAT_COLOR", domain="CORNER") for name in names}
    for loop in obj.data.loops:
        point = obj.matrix_world @ obj.data.vertices[loop.vertex_index].co
        tint, roughness, length, density = coat_values(point, obj.name)
        values = [(*tint, 1), (roughness, roughness, roughness, 1), (length/.12, length/.12, length/.12, 1), (density, density, density, 1)]
        for name, value in zip(names, values):
            attributes[name].data[loop.index].color = value
    obj["fur_length_map_scale_meters"] = .12

material = bpy.data.materials.get("DOG_Coat_Authored_Masks") or bpy.data.materials.new("DOG_Coat_Authored_Masks")
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
emission = nodes.new("ShaderNodeEmission")
attribute = nodes.new("ShaderNodeVertexColor")
attribute.layer_name = "DOG_CoatColor"
links.new(attribute.outputs["Color"], emission.inputs["Color"])
links.new(emission.outputs["Emission"], output.inputs["Surface"])
target = nodes.new("ShaderNodeTexImage")
target.name = "BAKE_TARGET"
for obj in surfaces:
    obj.data.materials.clear()
    obj.data.materials.append(material)
scene.render.engine = "CYCLES"
scene.cycles.samples = 1
scene.render.bake.use_selected_to_active = False
scene.render.bake.margin = 10
scene.render.bake.use_clear = True
image_names = ["dog_basecolor", "dog_roughness", "fur_length", "fur_density"]
images = {}
for name, attribute_name in zip(image_names, names):
    image = bpy.data.images.get(name) or bpy.data.images.new(name, width=2048, height=2048, alpha=True)
    image.colorspace_settings.name = "sRGB" if name == "dog_basecolor" else "Non-Color"
    attribute.layer_name = attribute_name
    target.image = image
    nodes.active = target
    target.select = True
    bpy.ops.object.bake(type="EMIT")
    image.filepath_raw = OUT + "/textures/" + name + ".png"
    image.file_format = "PNG"
    image.save()
    image.pack()
    images[name] = image
    print("BAKED", name)
links.remove(output.inputs["Surface"].links[0])
principled = nodes.new("ShaderNodeBsdfPrincipled")
principled.inputs["Roughness"].default_value = .88
color_node = nodes.new("ShaderNodeTexImage")
color_node.name = "DOG_CoatColor"
color_node.image = images["dog_basecolor"]
rough_node = nodes.new("ShaderNodeTexImage")
rough_node.name = "DOG_FurRoughness"
rough_node.image = images["dog_roughness"]
links.new(color_node.outputs["Color"], principled.inputs["Base Color"])
links.new(rough_node.outputs["Color"], principled.inputs["Roughness"])
links.new(principled.outputs["BSDF"], output.inputs["Surface"])
normal_image = bpy.data.images.get("dog_normal") or bpy.data.images.new("dog_normal", width=2048, height=2048, alpha=True)
normal_image.colorspace_settings.name = "Non-Color"
target.image = normal_image
nodes.active = target
scene.render.bake.normal_space = "TANGENT"
bpy.ops.object.bake(type="NORMAL")
normal_image.filepath_raw = OUT + "/textures/dog_normal.png"
normal_image.file_format = "PNG"
normal_image.save()
normal_image.pack()
normal_node = nodes.new("ShaderNodeTexImage")
normal_node.image = normal_image
normal_map = nodes.new("ShaderNodeNormalMap")
normal_map.inputs["Strength"].default_value = .25
links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
links.new(normal_map.outputs["Normal"], principled.inputs["Normal"])
material["color_provenance"] = "Multi-view authored intrinsic coat masks; not a single-photo projection. Facial boundaries are deliberately asymmetric."
checker = bpy.data.images.get("UV_Checker") or bpy.data.images.new("UV_Checker", width=1024, height=1024)
checker.generated_type = "COLOR_GRID"
checker.pack()
scene["coat_maps"] = json.dumps(image_names + ["dog_normal"])
scene["texture_stage"] = "Baked editable 2K maps; groom comparison and marking refinements pending"
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_04_texture.blend")
print(json.dumps({"phase": "texture_masks", "maps": image_names + ["dog_normal"], "resolution": 2048, "surfaces": [obj.name for obj in surfaces]}))
