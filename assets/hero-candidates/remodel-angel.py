import bpy
import math
import re
import json
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
NAME = 'Collectible Hero Angel'
assert bpy.data.scenes.get(NAME) is None
scene = bpy.data.scenes.new(NAME)
scene['collectibleOwner'] = 'angel'
scene['status'] = 'imported-awaiting-remodel'
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=PROJECT + '/public/assets/anime-angel.glb')
parts = {}
for obj in scene.objects:
    canonical = re.sub(r'\.\d{3}$', '', obj.name)
    obj['collectibleRuntimeName'] = canonical
    obj.name = 'CollectibleAngel_' + canonical
    parts[canonical] = obj
bpy.context.view_layer.update()
body = parts['ANGEL_Body']
body_corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
minimum = [min(point[axis] for point in body_corners) for axis in range(3)]
maximum = [max(point[axis] for point in body_corners) for axis in range(3)]
scene['originalBodyBounds'] = json.dumps([minimum, maximum])
assert parts.get('ANGEL_Wing_L') and parts.get('ANGEL_Wing_R')
print('ANGEL_BASELINE_IMPORTED', len(scene.objects), minimum, maximum)


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def render_review(filename):
    objects = [obj for obj in scene.objects if obj.type == 'MESH' and obj.get('collectibleRuntimeName')]
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center = (low + high) * .5
    camera = scene.objects.get('Angel_ReviewCamera')
    if camera is None:
        data = bpy.data.cameras.new('Angel Review Camera')
        camera = bpy.data.objects.new('Angel_ReviewCamera', data)
        scene.collection.objects.link(camera)
        camera.data.type = enum_value(camera.data.bl_rna.properties, 'type', 'ORTHO')
        camera.location = center + Vector((.6, -6, 1.1))
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = max(high.x - low.x, high.z - low.z) * 1.2
        scene.camera = camera
        for label, offset, energy, size in [('Key', (2, -3, 4), 350, 3), ('Fill', (-3, -2, 2), 180, 3), ('Rim', (1, 3, 3), 450, 2)]:
            data = bpy.data.lights.new('Angel Review ' + label, enum_value(bpy.data.lights.bl_rna.functions['new'].parameters, 'type', 'AREA'))
            light = bpy.data.objects.new('Angel_Review' + label, data)
            scene.collection.objects.link(light)
            light.location = center + Vector(offset)
            light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
            data.energy = energy
            data.shape = enum_value(data.bl_rna.properties, 'shape', 'DISK')
            data.size = size
        world = bpy.data.worlds.new('Angel Review World')
        world.use_nodes = True
        background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
        background.inputs['Color'].default_value = (.43, .49, .5, 1)
        background.inputs['Strength'].default_value = .45
        scene.world = world
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        raise RuntimeError('Cycles is required for the fixed review renders')
    scene.cycles.samples = 24
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = enum_value(scene.render.image_settings.bl_rna.properties, 'file_format', 'PNG')
    scene.render.filepath = PROJECT + '/assets/hero-candidates/' + filename
    result = bpy.ops.render.render(write_still=True)
    assert 'FINISHED' in result
    print('ANGEL_REVIEW_RENDERED', filename)


render_review('angel-before.png')

height = maximum[2] - minimum[2]
hinges = {name: parts[name].matrix_world.copy() for name in ['ANGEL_Wing_L', 'ANGEL_Wing_R']}
scene['status'] = 'remodeling-unverified'
materials = {}
meshes = [obj for obj in scene.objects if obj.type == 'MESH' and obj.get('collectibleRuntimeName')]
for obj in meshes:
    for index, original in enumerate(obj.data.materials):
        if original not in materials:
            copied = original.copy()
            copied['collectibleMaterialName'] = re.sub(r'\.\d{3}$', '', original.name)
            materials[original] = copied
        obj.data.materials[index] = materials[original]
    name = obj['collectibleRuntimeName']
    inverse = obj.matrix_world.inverted()
    wing = 'Feather' in name or 'Quill' in name
    span = max((abs(vertex.co.x) for vertex in obj.data.vertices), default=1)
    for vertex in obj.data.vertices:
        if wing:
            reach = min(1, abs(vertex.co.x) / max(span, .001))
            vertex.co.y += .022 * reach * reach
            vertex.co.z += .035 * math.sin(reach * math.pi / 2) ** 2
        elif not any(token in name for token in ['Tee', 'Short', 'Slide', 'Sleeve', 'Neck']):
            point = obj.matrix_world @ vertex.co
            blend = max(0, min(1, (point.z - height * .81) / (height * .065)))
            blend = blend * blend * (3 - 2 * blend)
            cheek = .035 * math.exp(-((point.z - height * .89) / (height * .035)) ** 2)
            point.x *= 1 + (.2 + cheek) * blend
            point.y = -.035 + (point.y + .035) * (1 + .1 * blend)
            vertex.co = inverse @ point
    if obj.data.has_custom_normals:
        obj.data.normals_split_custom_set([(0, 0, 0)] * len(obj.data.loops))
    obj.data.update()


def linear_color(color):
    channels = [int(color[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    return tuple(value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in channels)


images = {}
for mat in materials.values():
    name = mat['collectibleMaterialName']
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    cloth = any(token in name for token in ['Cotton', 'Shorts'])
    feather = 'Feather' in name
    skin = 'Skin' in name
    if name == 'ANI_Navy_Shorts':
        shader.inputs['Base Color'].default_value = (*linear_color('376e74'), 1)
    shader.inputs['Roughness'].default_value = .86 if cloth else .55 if feather or skin else .36
    shader.inputs['Coat Weight'].default_value = 0 if cloth else .14 if feather or skin else .24
    shader.inputs['Coat Roughness'].default_value = .42
    if 'Quill' in name:
        shader.inputs['Metallic'].default_value = .48
        shader.inputs['Roughness'].default_value = .42
    mat['collectibleBaseColorLinear'] = list(shader.inputs['Base Color'].default_value)
    if cloth or feather or skin or 'Slide' in name:
        uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
        uv.uv_map = 'HeroUV'
        for channel in ['normal', 'roughness']:
            if channel not in images:
                image = bpy.data.images.load(PROJECT + '/public/assets/premium-v1/ceramic-' + channel + '.png', check_existing=False)
                image.colorspace_settings.name = enum_value(image.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
                image.pack()
                images[channel] = image
            texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
            texture.image = images[channel]
            mat.node_tree.links.new(uv.outputs['UV'], texture.inputs['Vector'])
            if channel == 'normal':
                normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
                normal.uv_map = 'HeroUV'
                normal.inputs['Strength'].default_value = .045 if skin else .13
                mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
                mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
            else:
                multiply = mat.node_tree.nodes.new('ShaderNodeMath')
                multiply.operation = enum_value(multiply.bl_rna.properties, 'operation', 'MULTIPLY')
                multiply.inputs[1].default_value = shader.inputs['Roughness'].default_value
                mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[0])
                mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Roughness'])
        mat['collectibleSurface'] = 'fabric' if cloth else 'pearl' if feather else 'skin'

metal = next(mat for mat in materials.values() if 'Quill' in mat['collectibleMaterialName'])
parent = parts['ANGEL_Character']
bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=10, major_radius=.165, minor_radius=.012)
halo = bpy.context.object
halo.name = 'CollectibleAngel_Halo'
halo['collectibleRuntimeName'] = 'ANGEL_Halo'
halo.location = (0, -.02, maximum[2] + .18)
halo.parent = parent
halo.data.materials.append(metal)
for polygon in halo.data.polygons:
    polygon.use_smooth = True
meshes.append(halo)

shirt = parts['ANGEL_Tee']
origin = Vector((.068, -2, height * .735))
inverse = shirt.matrix_world.inverted()
hit, point, normal, face = shirt.ray_cast(inverse @ origin, (inverse.to_3x3() @ Vector((0, 1, 0))).normalized())
assert hit, 'The badge must attach to the shirt surface'
point = shirt.matrix_world @ point
vertices = [(point.x, point.y - .004, point.z)]
for index in range(10):
    angle = math.pi / 2 + index * math.pi / 5
    radius = .025 if index % 2 == 0 else .012
    vertices.append((point.x + math.cos(angle) * radius, point.y - .004, point.z + math.sin(angle) * radius))
data = bpy.data.meshes.new('Angel Fitted Badge')
data.from_pydata(vertices, [], [(0, 1 + index, 1 + (index + 1) % 10) for index in range(10)])
badge = bpy.data.objects.new('CollectibleAngel_Badge', data)
scene.collection.objects.link(badge)
badge['collectibleRuntimeName'] = 'ANGEL_Tee_StarBadge'
badge.parent = parent
badge.data.materials.append(metal)
meshes.append(badge)

for obj in meshes:
    uv = obj.data.uv_layers.get('HeroUV') or obj.data.uv_layers.new(name='HeroUV')
    for polygon in obj.data.polygons:
        components = [abs(value) for value in polygon.normal]
        axis = components.index(max(components))
        horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop in polygon.loop_indices:
            point = obj.matrix_world @ obj.data.vertices[obj.data.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[horizontal] * 4, point[vertical] * 4)
    obj.data.update()
bpy.context.view_layer.update()
current = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
assert abs(max(point.z for point in current) - maximum[2]) < .000001
assert abs(min(point.z for point in current) - minimum[2]) < .000001
for name, matrix in hinges.items():
    assert all(abs(parts[name].matrix_world[row][column] - matrix[row][column]) < .000001 for row in range(4) for column in range(4))
parent['collectibleHero'] = 'angel-v1'
scene['status'] = 'modeled-awaiting-rig-and-visual-review'
render_review('angel-after.png')

for obj in scene.objects:
    obj.select_set(bool(obj.get('collectibleRuntimeName')))
properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=PROJECT + '/assets/hero-candidates/angel.raw.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
scene['status'] = 'exported-awaiting-rig-and-visual-review'
print('COLLECTIBLE_ANGEL_EXPORTED')


