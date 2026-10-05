import bpy
import bmesh
import math
from mathutils import Vector


def enum_value(owner, property_name, wanted):
    values = [item.identifier for item in owner.bl_rna.properties[property_name].enum_items]
    if wanted not in values:
        raise ValueError((property_name, wanted, values))
    return wanted


def linear_color(value):
    channels = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    return tuple(channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in channels) + (1.0,)


if bpy.data.scenes.get('Kingdom Shared Asset Studio'):
    raise RuntimeError('The authored studio already exists; do not overwrite it.')

studio = bpy.data.scenes.new('Kingdom Shared Asset Studio')
bpy.context.window.scene = studio
collection = bpy.data.collections.new('Kingdom Shared Assets')
studio.collection.children.link(collection)
asset = bpy.data.objects.new('Kingdom_WorldKit_Asset', None)
collection.objects.link(asset)
asset['authoredIn'] = 'Blender 5.2.2'
asset['stage'] = 'modeled'


def material(name, color, roughness=0.8, metallic=0.0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = next(node for node in result.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    sockets = {socket.identifier: socket for socket in shader.inputs}
    sockets['Base Color'].default_value = linear_color(color)
    sockets['Roughness'].default_value = roughness
    sockets['Metallic'].default_value = metallic
    return result


leaf = material('Kit Moss Foliage', '#72956d', 0.88)
bark = material('Kit Warm Bark', '#756e5b', 0.94)
blossom = material('Kit Soft Blossom', '#d7a0b1', 0.85)
ceramic = material('Kit Courier Enamel', '#7d9ea9', 0.48, 0.025)
coat = material('Kit Resident Cloth', '#be8588', 0.91)
ivory = material('Kit Ivory Rubber', '#d8dccb', 0.78)
stone = material('Kit Honed Stone', '#b4c2ba', 0.9)
brick = material('Kit Rose Stone', '#ac9893', 0.94)


def object_from_bmesh(name, shape, finish, location=(0, 0, 0)):
    bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
    if shape.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
    geometry = bpy.data.meshes.new(name + '_Mesh')
    shape.to_mesh(geometry)
    shape.free()
    result = bpy.data.objects.new(name, geometry)
    collection.objects.link(result)
    result.parent = asset
    result.location = Vector((location[0], -location[2], location[1]))
    result.data.materials.append(finish)
    result['kitPart'] = name
    for polygon in geometry.polygons:
        polygon.use_smooth = True
    return result


def organic(name, subdivisions, finish, dimensions, location, phase=0, base=0):
    shape = bmesh.new()
    bmesh.ops.create_icosphere(shape, subdivisions=subdivisions, radius=1)
    for vertex in shape.verts:
        horizontal, forward, height = vertex.co
        variation = 1 + 0.065 * math.sin(horizontal * 5 + phase) * math.cos(height * 4 - forward * 3)
        vertex.co = (horizontal * dimensions[0] * variation, forward * dimensions[2] * variation, height * dimensions[1] * variation + base)
    return object_from_bmesh(name, shape, finish, location)


organic('Kit_CanopyLobe_Full', 2, leaf, (0.68, 0.45, 0.56), (-5, 0.8, 0), base=0.5)
organic('Kit_CanopyLobe_Distant', 1, leaf, (0.68, 0.45, 0.56), (-3, 0.8, 0), base=0.5)
organic('Kit_Shrub', 2, leaf, (1, 0.8, 0.9), (-5, 0.8, 3), phase=2)
organic('Kit_Blossom', 1, blossom, (1, 0.52, 0.9), (-3, 0.8, 3), phase=4)


def soft_part(name, finish, location, kind):
    shape = bmesh.new()
    bmesh.ops.create_uvsphere(shape, u_segments=16, v_segments=10, radius=1)
    for vertex in shape.verts:
        horizontal, forward, height = vertex.co
        if kind == 'head':
            power = 0.79
            horizontal = math.copysign(abs(horizontal) ** power, horizontal)
            forward = math.copysign(abs(forward) ** power, forward)
            height = math.copysign(abs(height) ** power, height)
        elif kind == 'body':
            horizontal *= 0.95 - height * 0.13
            forward *= 0.96 - height * 0.1
        elif kind == 'boot':
            height = max(-0.68, height)
            forward *= 1.04 - height * 0.12
            horizontal *= 0.92 + forward * 0.045
        elif kind == 'hand':
            horizontal *= 0.9 + height * 0.06
            forward *= 0.94
        vertex.co = (horizontal, -forward, height)
    return object_from_bmesh(name, shape, finish, location)


soft_part('Kit_CourierHead', ceramic, (0, 1.4, 0), 'head')
soft_part('Kit_CourierBody', ceramic, (3, 1.4, 0), 'body')
soft_part('Kit_Boot', ivory, (0, 1.2, 3.3), 'boot')
soft_part('Kit_Hand', ivory, (3, 1.2, 3.3), 'hand')
soft_part('Kit_ResidentHead', ivory, (6, 1.4, 0), 'head')
soft_part('Kit_ResidentBody', coat, (6, 1.2, 3.3), 'body')


def block(name, dimensions, finish, location, bevel=0.04):
    shape = bmesh.new()
    bmesh.ops.create_cube(shape, size=1)
    for vertex in shape.verts:
        vertex.co.x *= dimensions[0]
        vertex.co.y *= dimensions[2]
        vertex.co.z *= dimensions[1]
    if bevel:
        affect = next(item.identifier for item in bpy.ops.mesh.bevel.get_rna_type().properties['affect'].enum_items if item.identifier == 'EDGES')
        bmesh.ops.bevel(shape, geom=list(shape.edges), offset=bevel, segments=2, affect=affect)
    result = object_from_bmesh(name, shape, finish, location)
    for polygon in result.data.polygons:
        polygon.use_smooth = False
    return result


block('Kit_StonePaver', (1, 0.14, 0.5), stone, (-4.5, 0.4, 6), 0.025)
block('Kit_SquarePaver', (0.75, 0.14, 0.75), brick, (-2.5, 0.4, 6), 0.025)
block('Kit_Kerb', (1, 0.3, 0.32), stone, (-0.5, 0.4, 6), 0.035)

world = bpy.data.worlds.new('Shared Kit Studio World')
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs[0].default_value = linear_color('#899d9c')
background.inputs[1].default_value = 0.45
studio.world = world

for light_name, light_location, light_energy, light_size in [('Key', (-8, -10, 12), 1700, 8), ('Fill', (9, -5, 9), 1000, 7), ('Rim', (1, 7, 10), 1400, 6)]:
    light = bpy.data.lights.new('Kit Studio ' + light_name, enum_value(bpy.types.Light, 'type', 'AREA'))
    light.energy = light_energy
    light.shape = enum_value(light, 'shape', 'DISK')
    light.size = light_size
    source = bpy.data.objects.new(light.name, light)
    studio.collection.objects.link(source)
    source.location = light_location
    source.rotation_euler = (Vector((0, -3, 1)) - source.location).to_track_quat('-Z', 'Y').to_euler()

camera_data = bpy.data.cameras.new('Kit Studio Camera')
camera = bpy.data.objects.new('Kit Studio Camera', camera_data)
studio.collection.objects.link(camera)
camera.location = (15, -22, 17)
camera.rotation_euler = (Vector((0, -3, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = enum_value(camera_data, 'type', 'ORTHO')
camera_data.ortho_scale = 20
studio.camera = camera
studio.render.resolution_x = 1600
studio.render.resolution_y = 1100
studio.render.resolution_percentage = 100
try:
    studio.render.engine = 'CYCLES'
except TypeError as error:
    raise RuntimeError(str(error)) from error
studio.cycles.samples = 32
studio.cycles.use_denoising = True
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_location = (0, -3, 1)
        area.spaces.active.region_3d.view_distance = 26
        area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_perspective = enum_value(area.spaces.active.region_3d, 'view_perspective', 'CAMERA')
        area.spaces.active.shading.type = enum_value(area.spaces.active.shading, 'type', 'RENDERED')

for source in collection.objects:
    if source.type == 'MESH':
        source.data.calc_loop_triangles()
        print(source.name, len(source.data.loop_triangles))
