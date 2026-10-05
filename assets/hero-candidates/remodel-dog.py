import bpy
import math
import re
import json
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
NAME = 'Collectible Hero Dog'
assert bpy.data.scenes.get(NAME) is None
scene = bpy.data.scenes.new(NAME)
scene['collectibleOwner'] = 'dog'
scene['status'] = 'imported-awaiting-remodel'
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=PROJECT + '/public/assets/roaming-dog.glb')
parts = {}
for obj in scene.objects:
    canonical = re.sub(r'\.\d{3}$', '', obj.name)
    obj['collectibleRuntimeName'] = canonical
    obj.name = 'CollectibleDog_' + canonical
    parts[canonical] = obj
bpy.context.view_layer.update()
body = next(obj for name, obj in parts.items() if 'DOG_BODY_RETOPO' in name)
corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
minimum = [min(point[axis] for point in corners) for axis in range(3)]
maximum = [max(point[axis] for point in corners) for axis in range(3)]
scene['originalBodyBounds'] = json.dumps([minimum, maximum])
print('DOG_BASELINE_IMPORTED', len(scene.objects), minimum, maximum)


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def render_review(filename):
    objects = [obj for obj in scene.objects if obj.type == 'MESH' and obj.get('collectibleRuntimeName')]
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center, extent = (low + high) * .5, max(high - low)
    camera = scene.objects.get('Dog_ReviewCamera')
    if camera is None:
        data = bpy.data.cameras.new('Dog Review Camera')
        camera = bpy.data.objects.new('Dog_ReviewCamera', data)
        scene.collection.objects.link(camera)
        data.type = enum_value(data.bl_rna.properties, 'type', 'ORTHO')
        data.ortho_scale = extent * 1.24
        camera.location = center + Vector((1.2, -2.8, 1.0)) * extent
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = camera
        for label, offset, energy in [('Key', (2, -3, 4), 350), ('Fill', (-3, -2, 2), 180), ('Rim', (1, 3, 3), 450)]:
            data = bpy.data.lights.new('Dog Review ' + label, enum_value(bpy.data.lights.bl_rna.functions['new'].parameters, 'type', 'AREA'))
            light = bpy.data.objects.new('Dog_Review' + label, data)
            scene.collection.objects.link(light)
            light.location = center + Vector(offset) * extent
            light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
            data.energy = energy * extent * extent
            data.size = extent * 3
        world = bpy.data.worlds.new('Dog Review World')
        world.use_nodes = True
        background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
        background.inputs['Color'].default_value = (.43, .49, .5, 1)
        background.inputs['Strength'].default_value = .45
        scene.world = world
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        raise RuntimeError('Cycles is required for the dog review')
    scene.cycles.samples = 24
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = enum_value(scene.render.image_settings.bl_rna.properties, 'file_format', 'PNG')
    scene.render.filepath = PROJECT + '/assets/hero-candidates/' + filename
    assert 'FINISHED' in bpy.ops.render.render(write_still=True)
    print('DOG_REVIEW_RENDERED', filename)


render_review('dog-before.png')
scene['status'] = 'remodeling-unverified'
width, depth, height = [maximum[axis] - minimum[axis] for axis in range(3)]
objects = [obj for obj in scene.objects if obj.type == 'MESH' and obj.get('collectibleRuntimeName')]
materials = {}
for obj in objects:
    for index, original in enumerate(obj.data.materials):
        if original not in materials:
            copied = original.copy()
            copied['collectibleMaterialName'] = re.sub(r'\.\d{3}$', '', original.name)
            materials[original] = copied
        obj.data.materials[index] = materials[original]
    inverse = obj.matrix_world.inverted()
    for vertex in obj.data.vertices:
        point = obj.matrix_world @ vertex.co
        horizontal = max(0, min(1, (point.x - minimum[0]) / width))
        forward = max(0, min(1, (maximum[1] - point.y) / depth))
        vertical = max(0, min(1, (point.z - minimum[2]) / height))
        head = max(0, min(1, (vertical - .53) / .22))
        head = head * head * (3 - 2 * head)
        front = max(0, min(1, (forward - .55) / .25))
        front = front * front * (3 - 2 * front)
        weight = head * front
        point.x -= width * .027 * math.sin(horizontal * math.tau) * weight
        point.z += height * .008 * math.sin(vertical * math.pi) * weight
        point.y -= depth * .009 * math.sin(forward * math.pi) * math.exp(-((vertical - .55) / .18) ** 2) * front
        vertex.co = inverse @ point
    obj.data.update()
    for mat in obj.data.materials:
        shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        name = mat['collectibleMaterialName']
        if 'Coat' in name or 'Fur' in name:
            shader.inputs['Coat Weight'].default_value = 0
            shader.inputs['Sheen Weight'].default_value = .14
            shader.inputs['Sheen Roughness'].default_value = .85
        elif 'Nose' in name:
            shader.inputs['Roughness'].default_value = .46
            shader.inputs['Coat Weight'].default_value = .12


def solid_material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    channels = [int(color[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    tint = tuple(value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in channels)
    shader.inputs['Base Color'].default_value = (*tint, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    mat['collectibleMaterialName'] = name
    return mat


teal = solid_material('Dog_Woven_Collar', '4b9294', .03, .7)
gold = solid_material('Dog_Satin_Tag', 'dcb56d', .65, .4)
curve = bpy.data.curves.new('Dog Fitted Collar', enum_value(bpy.data.curves.bl_rna.functions['new'].parameters, 'type', 'CURVE'))
curve.dimensions = enum_value(curve.bl_rna.properties, 'dimensions', '3D')
curve.resolution_u = 8
curve.bevel_depth = .007
curve.bevel_resolution = 3
spline = curve.splines.new(enum_value(curve.splines.bl_rna.functions['new'].parameters, 'type', 'BEZIER'))
spline.bezier_points.add(15)
spline.use_cyclic_u = True
for index, point in enumerate(spline.bezier_points):
    angle = index / 16 * math.tau
    point.co = (.073 * math.cos(angle), -.113 + .069 * math.sin(angle), height * .61 + .014 * math.sin(angle))
    point.handle_left_type = enum_value(point.bl_rna.properties, 'handle_left_type', 'AUTO')
    point.handle_right_type = enum_value(point.bl_rna.properties, 'handle_right_type', 'AUTO')
collar = bpy.data.objects.new('CollectibleDog_Collar', curve)
scene.collection.objects.link(collar)
collar['collectibleRuntimeName'] = 'WEB_L1_DOG_COLLAR'
collar.data.materials.append(teal)
for obj in scene.objects:
    obj.select_set(False)
collar.select_set(True)
bpy.context.view_layer.objects.active = collar
bpy.ops.object.convert(target=enum_value(bpy.ops.object.convert.get_rna_type().properties, 'target', 'MESH'))
collar = bpy.context.object
for polygon in collar.data.polygons:
    polygon.use_smooth = True

bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=1)
tag = bpy.context.object
tag.name = 'CollectibleDog_Tag'
tag['collectibleRuntimeName'] = 'WEB_L1_DOG_COLLAR_TAG'
tag.scale = (.018, .004, .021)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
tag.location = (0, -.203, height * .49)
tag.data.materials.append(gold)
for polygon in tag.data.polygons:
    polygon.use_smooth = True
root = bpy.data.objects.new('CollectibleDog_Root', None)
scene.collection.objects.link(root)
root['collectibleRuntimeName'] = 'DOG_CollectibleRoot'
root['collectibleHero'] = 'dog-v1'
bpy.context.view_layer.update()
for obj in [*objects, collar, tag]:
    matrix = obj.matrix_world.copy()
    obj.parent = root
    obj.matrix_world = matrix
bpy.context.view_layer.update()
corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
for axis in range(3):
    assert abs(min(point[axis] for point in corners) - minimum[axis]) < .000001
    assert abs(max(point[axis] for point in corners) - maximum[axis]) < .000001
scene['status'] = 'modeled-awaiting-rig-and-visual-review'
render_review('dog-after.png')
for obj in scene.objects:
    obj.select_set(bool(obj.get('collectibleRuntimeName')))
properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=PROJECT + '/assets/hero-candidates/dog.raw.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
scene['status'] = 'exported-awaiting-rig-and-visual-review'
print('COLLECTIBLE_DOG_EXPORTED')

images = {node.image for obj in scene.objects if obj.type == 'MESH' and obj.get('collectibleRuntimeName') for mat in obj.data.materials if mat and mat.use_nodes for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image}
for image in images:
    if not image.packed_file:
        if not image.has_data:
            image.reload()
        image.pack()
assert all(image.packed_file for image in images)
bpy.ops.wm.save_as_mainfile(filepath=PROJECT + '/assets/hero-candidates/dog-study-20261003.blend', copy=True, compress=True)
print('DOG_NATIVE_STUDY_SAVED', len(images))


