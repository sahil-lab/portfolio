import bpy
import bmesh
import math
import json
import re
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
NAME = 'Collectible Portrait Monument'
assert bpy.data.scenes.get(NAME) is None
scene = bpy.data.scenes.new(NAME)
scene['collectibleOwner'] = 'monument'
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=PROJECT + '/public/assets/sah-suited-figure.glb')
parts = {}
for obj in scene.objects:
    name = re.sub(r'\.\d{3}$', '', obj.name)
    obj['collectibleRuntimeName'] = name
    obj.name = 'CollectiblePortrait_' + name
    parts[name] = obj
bpy.context.view_layer.update()
meshes = [obj for obj in scene.objects if obj.type == 'MESH']
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
scene['originalBounds'] = json.dumps([list(minimum), list(maximum)])


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def render_review(filename):
    center, extent = (minimum + maximum) * .5, max(maximum - minimum)
    camera = scene.objects.get('Portrait_ReviewCamera')
    if camera is None:
        data = bpy.data.cameras.new('Portrait Review Camera')
        camera = bpy.data.objects.new('Portrait_ReviewCamera', data)
        scene.collection.objects.link(camera)
        data.type = enum_value(data.bl_rna.properties, 'type', 'ORTHO')
        data.ortho_scale = extent * 1.16
        camera.location = center + Vector((.5, -3.2, .55)) * extent
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = camera
        for label, offset, energy in [('Key', (2, -3, 4), 350), ('Fill', (-3, -2, 2), 180), ('Rim', (1, 3, 3), 450)]:
            data = bpy.data.lights.new('Portrait ' + label, enum_value(bpy.data.lights.bl_rna.functions['new'].parameters, 'type', 'AREA'))
            light = bpy.data.objects.new('Portrait_Review' + label, data)
            scene.collection.objects.link(light)
            light.location = center + Vector(offset) * extent
            light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
            data.energy = energy * extent * extent
            data.size = extent * 3
        world = bpy.data.worlds.new('Portrait Review World')
        world.use_nodes = True
        background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
        background.inputs['Color'].default_value = (.43, .49, .5, 1)
        background.inputs['Strength'].default_value = .45
        scene.world = world
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        raise RuntimeError('Cycles is required for the portrait review')
    scene.cycles.samples = 24
    scene.render.resolution_x = scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = enum_value(scene.render.image_settings.bl_rna.properties, 'file_format', 'PNG')
    scene.render.filepath = PROJECT + '/assets/hero-candidates/' + filename
    assert 'FINISHED' in bpy.ops.render.render(write_still=True)


render_review('monument-before.png')
scene['status'] = 'remodeling-unverified'
materials, images = {}, {}
for obj in meshes:
    for index, original in enumerate(obj.data.materials):
        if original not in materials:
            copied = original.copy()
            copied['collectibleMaterialName'] = re.sub(r'\.\d{3}$', '', original.name)
            materials[original] = copied
        obj.data.materials[index] = materials[original]
    name = obj['collectibleRuntimeName']
    if 'Podium' in name:
        shape = bmesh.new()
        shape.from_mesh(obj.data)
        bmesh.ops.remove_doubles(shape, verts=list(shape.verts), dist=.000001)
        bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
        shape.to_mesh(obj.data)
        shape.free()
        bpy.context.view_layer.objects.active = obj
        bevel = obj.modifiers.new('Machined podium edges', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'BEVEL'))
        bevel.width = .006
        bevel.segments = 3
        bevel.limit_method = enum_value(bevel.bl_rna.properties, 'limit_method', 'ANGLE')
        bevel.angle_limit = .65
        bpy.ops.object.modifier_apply(modifier=bevel.name)
    elif 'Lapel' in name or 'Pocket' in name or 'Collar' in name:
        for vertex in obj.data.vertices:
            vertex.co += vertex.normal * .0015
    obj.data.update()

for mat in materials.values():
    name = mat['collectibleMaterialName']
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    stone = 'Stone' in name
    tailored = 'Tailoring' in name or 'Shirt' in name
    shader.inputs['Roughness'].default_value = .68 if stone else .54 if tailored else .28
    shader.inputs['Coat Weight'].default_value = .03 if stone or tailored else .18
    shader.inputs['Coat Roughness'].default_value = .3
    if not (stone or tailored or 'Lapel' in name):
        continue
    family = 'stone' if stone else 'brushed'
    uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'PortraitUV'
    for channel in ['normal', 'roughness']:
        key = family + '-' + channel
        if key not in images:
            image = bpy.data.images.load(PROJECT + '/public/assets/premium-v1/' + key + '.png', check_existing=False)
            image.colorspace_settings.name = enum_value(image.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
            image.pack()
            images[key] = image
        texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = images[key]
        mat.node_tree.links.new(uv.outputs['UV'], texture.inputs['Vector'])
        if channel == 'normal':
            normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
            normal.uv_map = 'PortraitUV'
            normal.inputs['Strength'].default_value = .24 if stone else .035
            mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
            mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
        else:
            multiply = mat.node_tree.nodes.new('ShaderNodeMath')
            multiply.operation = enum_value(multiply.bl_rna.properties, 'operation', 'MULTIPLY')
            multiply.inputs[1].default_value = shader.inputs['Roughness'].default_value
            mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[0])
            mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Roughness'])
    mat['collectibleSurface'] = family

lapel = parts['FIG_Curved_Notched_Lapel_1']
box = [lapel.matrix_world @ Vector(corner) for corner in lapel.bound_box]
height = max(point.z for point in box) - min(point.z for point in box)
origin = Vector((.075, -3, min(point.z for point in box) + height * .63))
inverse = lapel.matrix_world.inverted()
hit, point, normal, face = lapel.ray_cast(inverse @ origin, (inverse.to_3x3() @ Vector((0, 1, 0))).normalized())
assert hit, 'Lapel pin must meet the visible lapel surface'
point = lapel.matrix_world @ point
world_normal = (lapel.matrix_world.to_3x3().inverted().transposed() @ normal).normalized()
gold = next(mat for mat in materials.values() if mat['collectibleMaterialName'] == 'FIG_Gold_Lapels')
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
pin = bpy.context.object
pin['collectibleRuntimeName'] = 'FIG_Lapel_Pin'
pin.name = 'CollectiblePortrait_LapelPin'
pin.scale = (.013, .003, .018)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
pin.location = point + world_normal * .0025
pin.rotation_euler = Vector((0, -1, 0)).rotation_difference(world_normal).to_euler()
pin.data.materials.append(gold)
for polygon in pin.data.polygons:
    polygon.use_smooth = True
meshes.append(pin)

for obj in meshes:
    uv = obj.data.uv_layers.get('PortraitUV') or obj.data.uv_layers.new(name='PortraitUV')
    for polygon in obj.data.polygons:
        components = [abs(value) for value in polygon.normal]
        axis = components.index(max(components))
        horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop in polygon.loop_indices:
            point = obj.matrix_world @ obj.data.vertices[obj.data.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[horizontal] * 3, point[vertical] * 3)
    obj.data.update()
bpy.context.view_layer.update()
current = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
assert abs(min(point.z for point in current) - minimum.z) < .00001
assert abs(max(point.z for point in current) - maximum.z) < .00001
scene['status'] = 'modeled-awaiting-review'
render_review('monument-after.png')
for obj in scene.objects:
    obj.select_set(bool(obj.get('collectibleRuntimeName')))
properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=PROJECT + '/assets/hero-candidates/monument.raw.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
scene['status'] = 'exported-awaiting-runtime-review'
print('COLLECTIBLE_MONUMENT_EXPORTED')
