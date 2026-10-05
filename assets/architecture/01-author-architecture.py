import bpy
import bmesh
import math
from mathutils import Vector

if bpy.data.scenes.get('Kingdom Architecture Studio'):
    raise RuntimeError('The architecture studio exists; do not overwrite it.')
studio = bpy.data.scenes.new('Kingdom Architecture Studio')
bpy.context.window.scene = studio
collection = bpy.data.collections.new('Authored Architecture Library')
studio.collection.children.link(collection)
root = bpy.data.objects.new('Architecture_Library', None)
collection.objects.link(root)


def enum_value(owner, property_name, wanted):
    values = [item.identifier for item in owner.bl_rna.properties[property_name].enum_items]
    if wanted not in values:
        raise ValueError((property_name, wanted, values))
    return wanted


def finish(name, color, roughness=0.84, metallic=0.03):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    sockets = {socket.identifier: socket for socket in shader.inputs}
    sockets['Base Color'].default_value = color
    sockets['Roughness'].default_value = roughness
    sockets['Metallic'].default_value = metallic
    return material


stone = finish('Architecture Porcelain Stone', (0.54, 0.59, 0.56, 1))
timber = finish('Architecture Oiled Timber', (0.29, 0.22, 0.16, 1), 0.9)
metal = finish('Architecture Satin Roof', (0.2, 0.38, 0.35, 1), 0.55, 0.3)
terra = finish('Architecture Fired Ceramic', (0.52, 0.29, 0.24, 1))


def mesh_object(name, shape, material, position):
    bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
    if shape.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
    mesh = bpy.data.meshes.new(name + '_Mesh')
    shape.to_mesh(mesh)
    shape.free()
    mesh.update()
    part_object = bpy.data.objects.new(name, mesh)
    collection.objects.link(part_object)
    part_object.parent = root
    part_object.location = (position[0], -position[2], position[1])
    mesh.materials.append(material)
    part_object['architecturePart'] = name
    part_object['sourceUnits'] = 'normalized'
    return part_object


def block(name, position, material=stone):
    shape = bmesh.new()
    bmesh.ops.create_cube(shape, size=2)
    affect = next(item.identifier for item in bpy.ops.mesh.bevel.get_rna_type().properties['affect'].enum_items if item.identifier == 'EDGES')
    bmesh.ops.bevel(shape, geom=list(shape.edges), offset=0.12, segments=2, affect=affect)
    return mesh_object(name, shape, material, position)


def profile(name, outline, position, material=metal):
    shape = bmesh.new()
    front = [shape.verts.new((horizontal, -1, height)) for horizontal, height in outline]
    back = [shape.verts.new((horizontal, 1, height)) for horizontal, height in outline]
    shape.faces.new(front)
    shape.faces.new(list(reversed(back)))
    for index in range(len(front)):
        following = (index + 1) % len(front)
        shape.faces.new((front[index], back[index], back[following], front[following]))
    result = mesh_object(name, shape, material, position)
    return result


block('Architecture_Block', (-8, 1, 0))
profile('Architecture_ForgeRoof', [(-1, 0.65), (0, 0), (1, 0.65), (1, 0.8), (0, 0.18), (-1, 0.8)], (-4, 1, 0))
arch = [(math.cos(index / 16 * math.pi), math.sin(index / 16 * math.pi)) for index in range(17)]
arch += [(math.cos(index / 16 * math.pi) * 0.91, math.sin(index / 16 * math.pi) * 0.84) for index in range(16, -1, -1)]
profile('Architecture_ConservatoryRoof', arch, (0, 1, 0), stone)
profile('Architecture_PetalRoof', [(-1, 0.15), (-0.7, 0), (0, 0.8), (0.7, 0), (1, 0.15), (1, 0.3), (0.7, 0.16), (0, 1), (-0.7, 0.16), (-1, 0.3)], (4, 1, 0), terra)
profile('Architecture_ResearchRoof', [(-1, 0), (-0.24, 1), (0.44, 0.15), (1, 0.6), (1, 0.42), (0.44, 0), (-0.24, 0.8), (-1, -0.1)], (8, 1, 0), stone)
profile('Architecture_WorkshopRoof', [(-1, 0), (-1, 1), (0, 0.2), (0, 1), (1, 0.2), (1, 0)], (-8, 1, 4), terra)
profile('Architecture_GuildRoof', [(-1, 0), (0, 0.8), (1, 0), (1, 0.17), (0, 1), (-1, 0.17)], (-4, 1, 4), timber)
vault = [(-1 + index / 12, math.cos((-1 + index / 12) * math.pi / 2)) for index in range(25)]
vault += [(-1 + index / 12, math.cos((-1 + index / 12) * math.pi / 2) + 0.0673) for index in range(24, -1, -1)]
profile('Architecture_Vault', vault, (0, 1, 4), timber)

for part_name, location, subdivisions in [('Architecture_Sphere', (4, 1, 4), 2), ('Architecture_Dome', (8, 1, 4), 3)]:
    primitive = bmesh.new()
    bmesh.ops.create_icosphere(primitive, subdivisions=subdivisions, radius=1)
    if part_name.endswith('Dome'):
        lower = [vertex for vertex in primitive.verts if vertex.co.z < -0.00001]
        for vertex in lower:
            primitive.verts.remove(vertex)
    source = mesh_object(part_name, primitive, stone, location)
    for polygon in source.data.polygons:
        polygon.use_smooth = True

cylinder = bmesh.new()
bmesh.ops.create_cone(cylinder, cap_ends=True, cap_tris=False, segments=16, radius1=1, radius2=1, depth=2)
source = mesh_object('Architecture_Cylinder', cylinder, stone, (-8, 1, 8))
for polygon in source.data.polygons:
    polygon.use_smooth = len(polygon.vertices) == 4

high_cylinder = bmesh.new()
bmesh.ops.create_cone(high_cylinder, cap_ends=True, cap_tris=False, segments=64, radius1=1, radius2=1, depth=2)
source = mesh_object('Architecture_CylinderHigh', high_cylinder, stone, (4, 1, 8))
for polygon in source.data.polygons:
    polygon.use_smooth = len(polygon.vertices) == 4

torus = bmesh.new()
torus_rings = []
for ring_index in range(24):
    angle = ring_index / 24 * math.tau
    torus_rings.append([torus.verts.new(((1 + 0.2 * math.cos(side_index / 8 * math.tau)) * math.cos(angle), (1 + 0.2 * math.cos(side_index / 8 * math.tau)) * math.sin(angle), 0.2 * math.sin(side_index / 8 * math.tau))) for side_index in range(8)])
for ring_index in range(24):
    for side_index in range(8):
        torus.faces.new((torus_rings[ring_index][side_index], torus_rings[(ring_index + 1) % 24][side_index], torus_rings[(ring_index + 1) % 24][(side_index + 1) % 8], torus_rings[ring_index][(side_index + 1) % 8]))
source = mesh_object('Architecture_Torus', torus, metal, (-4, 1, 8))
for polygon in source.data.polygons:
    polygon.use_smooth = True

world = bpy.data.worlds.new('Architecture Studio World')
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs[0].default_value = (0.27, 0.34, 0.34, 1)
background.inputs[1].default_value = 0.45
studio.world = world
for light_name, location, energy in [('Key', (-8, -12, 15), 1800), ('Fill', (11, -3, 11), 1200), ('Rim', (0, 12, 10), 1600)]:
    light = bpy.data.lights.new('Architecture ' + light_name, enum_value(bpy.types.Light, 'type', 'AREA'))
    light.energy = energy
    light.size = 8
    source = bpy.data.objects.new(light.name, light)
    studio.collection.objects.link(source)
    source.location = location
    source.rotation_euler = (Vector((0, -3, 1)) - source.location).to_track_quat('-Z', 'Y').to_euler()
camera_data = bpy.data.cameras.new('Architecture Camera')
camera = bpy.data.objects.new('Architecture Camera', camera_data)
studio.collection.objects.link(camera)
camera.location = (18, -27, 20)
camera.rotation_euler = (Vector((0, -3, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = enum_value(camera_data, 'type', 'ORTHO')
camera_data.ortho_scale = 25
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
root['stage'] = 'modeled'
print('Architecture parts:', len(root.children))
