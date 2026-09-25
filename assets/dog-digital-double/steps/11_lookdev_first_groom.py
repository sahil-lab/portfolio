import bpy
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
lighting = bpy.data.collections["07_LIGHTING"]
neutral = bpy.data.collections.new("LIGHTING_Neutral_Accuracy")
beauty = bpy.data.collections.new("LIGHTING_Beauty_Soft_Studio")
lighting.children.link(neutral)
lighting.children.link(beauty)
beauty.hide_render = True
beauty.hide_viewport = True

def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

def light(name, position, energy, size, tint, collection):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = tint
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.location = position
    point_at(obj, (0, -.03, .16))

light("NEUTRAL_Key", (-.65, -.85, 1.0), 38, .90, (1, .96, .91), neutral)
light("NEUTRAL_Fill", (.75, -.42, .60), 23, .85, (.94, .97, 1), neutral)
light("NEUTRAL_Top", (.1, .45, 1.05), 30, .80, (1, 1, 1), neutral)
light("BEAUTY_Key", (-.60, -.68, .86), 40, .65, (1, .91, .78), beauty)
light("BEAUTY_Fill", (.64, -.38, .50), 16, .60, (.86, .94, 1), beauty)
light("BEAUTY_Rim", (.45, .60, .85), 52, .55, (1, .94, .84), beauty)
world = bpy.data.worlds.new("DOG_Neutral_World")
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == "BACKGROUND")
background.inputs["Color"].default_value = (.69, .73, .74, 1)
background.inputs["Strength"].default_value = .22
scene.world = world
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.001))
ground = bpy.context.object
ground.name = "STUDIO_Ground_Not_For_Export"
for collection in list(ground.users_collection):
    collection.objects.unlink(ground)
lighting.objects.link(ground)
material = bpy.data.materials.new("STUDIO_Warm_Gray")
material.use_nodes = True
shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value = (.43, .48, .47, 1)
shader.inputs["Roughness"].default_value = .95
ground.data.materials.append(material)
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transparent_max_bounces = 12
scene.cycles.device = "CPU"
devices = ["CPU preview; global preferences unchanged"]
scene.view_settings.view_transform = "AgX"
scene.view_settings.exposure = -.5
scene.render.resolution_x = scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
for name in ("three_quarter", "close_face", "front", "left"):
    camera = bpy.data.objects["CAM_" + name]
    if name == "close_face":
        camera.location = (.003, -.71, .291)
        camera.data.lens = 72
        point_at(camera, (0, -.19, .260))
    elif name == "three_quarter":
        camera.location = (.60, -.77, .44)
        camera.data.lens = 55
        point_at(camera, (0, -.025, .172))
    scene.camera = camera
    scene.render.filepath = OUT + "/groom-round-0/" + name + ".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene["groom_correction_rounds_completed"] = 0
scene["lookdev_modes"] = "Neutral Accuracy and Beauty Soft Studio; toggle the corresponding lighting collection"
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_05_groom.blend")
print(json.dumps({"first_groom_renders": 4, "devices": devices, "hair_regions": 12, "correction_rounds": 0}))
