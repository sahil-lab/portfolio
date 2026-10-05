import bpy
import bmesh
import math
import random
import re
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
STUDY = 'Collectible Copper Bakery Study'
scene = bpy.data.scenes.get(STUDY)
if scene:
    assert scene.get('collectibleOwner') == STUDY
    for obj in list(scene.objects):
        assert len(obj.users_scene) == 1
        bpy.data.objects.remove(obj, do_unlink=True)
else:
    scene = bpy.data.scenes.new(STUDY)
scene['collectibleOwner'] = STUDY
scene['status'] = 'imported-awaiting-remodel'
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=PROJECT + '/public/assets/copper-bakery.glb')
source = {}
for obj in list(scene.objects):
    name = re.sub(r'\.\d{3}$', '', obj.name)
    obj['collectibleRuntimeName'] = name
    obj.name = 'CollectibleBakery_' + name
    source[name] = obj
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_location = Vector((0, 0, 4))
            area.spaces.active.region_3d.view_distance = 22
            area.spaces.active.region_3d.view_rotation = Vector((8, -12, 8)).to_track_quat('Z', 'Y')
print('BAKERY_IMPORTED', len(scene.objects))


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def linear_color(color):
    channels = [int(color[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    return tuple(channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in channels)


materials = {re.sub(r'\.\d{3}$', '', mat.name): mat for obj in scene.objects if obj.type == 'MESH' for mat in obj.data.materials}
palette = {'Copper Jade Roof': '648ea5', 'Copper Plaster': '83b5c0',
           'Copper Interior Plaster': 'f0eee5', 'Copper Limestone': 'd8e2d6',
           'Copper Oiled Timber': '865448', 'Copper Cabinet Enamel': 'bd6574',
           'Copper Satin Metal': 'd7ac69', 'Copper Deep Ink': '293b42',
           'Copper Golden Crust': 'd59a48', 'Copper Soft Blossoms': 'f2bbc8'}
for name, mat in materials.items():
    mat['collectibleRuntimeName'] = name
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    if name in palette:
        shader.inputs['Base Color'].default_value = (*linear_color(palette[name]), 1)
    shader.inputs['Roughness'].default_value = .45 if name == 'Copper Satin Metal' else .63
    shader.inputs['Metallic'].default_value = .62 if name == 'Copper Satin Metal' else .01
    shader.inputs['Coat Weight'].default_value = .23 if name in ('Copper Jade Roof', 'Copper Plaster', 'Copper Cabinet Enamel') else .04
    shader.inputs['Coat Roughness'].default_value = .34
    mat['collectibleBaseColorLinear'] = list(shader.inputs['Base Color'].default_value)
porcelain = materials['Copper Interior Plaster'].copy()
porcelain.name = 'CollectibleBakery_Porcelain'
porcelain['collectibleRuntimeName'] = 'Copper Porcelain'
materials['Copper Porcelain'] = porcelain
architecture = source['Copper_Architecture']


def finish(obj, name, location, mat, owner=architecture):
    obj.name = 'CollectibleBakery_' + name
    obj['collectibleRuntimeName'] = name
    obj.location = location
    obj.parent = owner
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def box(name, location, dimensions, mat, radius=.09, owner=architecture):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.scale = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, location, mat, owner)
    modifier_type = bpy.ops.object.modifier_add.get_rna_type().properties
    bevel = obj.modifiers.new('Rounded collectible edges', enum_value(modifier_type, 'type', 'BEVEL'))
    bevel.width = min(radius, min(dimensions) * .4)
    bevel.segments = 1 if name.startswith('CollectibleBakery_Salt_') else 2
    bevel.harden_normals = True
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    normal = obj.modifiers.new('Corner normals', enum_value(modifier_type, 'type', 'WEIGHTED_NORMAL'))
    normal.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj


roof = source['Copper_ContinuousBarrelRoof']
vertices, faces = [], []
across, along = 48, 16
for layer in range(2):
    for depth in range(along + 1):
        forward = -2.12 + depth / along * 7.82
        for width in range(across + 1):
            angle = -math.pi / 2 + width / across * math.pi
            bulge = .055 * math.sin(width / across * math.pi * 12) ** 2
            vertices.append((5.46 * math.sin(angle), forward, 5.01 + 1.81 * math.cos(angle) + bulge - layer * .9))
layer_size = (across + 1) * (along + 1)
for layer in range(2):
    for depth in range(along):
        for width in range(across):
            corner = layer * layer_size + depth * (across + 1) + width
            face = (corner, corner + 1, corner + across + 2, corner + across + 1)
            faces.append(face if layer == 0 else tuple(reversed(face)))
for width in range(across):
    for depth in [0, along]:
        corner = depth * (across + 1) + width
        face = (corner, corner + layer_size, corner + layer_size + 1, corner + 1)
        faces.append(face if depth == 0 else tuple(reversed(face)))
for depth in range(along):
    for width in [0, across]:
        corner = depth * (across + 1) + width
        face = (corner, corner + across + 1, corner + across + 1 + layer_size, corner + layer_size)
        faces.append(face if width == 0 else tuple(reversed(face)))
mesh = bpy.data.meshes.new('Collectible Bakery Pillow Roof')
mesh.from_pydata(vertices, [], faces)
roof.data = mesh
roof.data.materials.append(materials['Copper Jade Roof'])
for polygon in roof.data.polygons:
    polygon.use_smooth = True
roof['collectibleShape'] = 'ribbed-pillow-roof'

facade = source['Copper_PiercedFacade']
shape = bmesh.new()
shape.from_mesh(facade.data)
bmesh.ops.remove_doubles(shape, verts=list(shape.verts), dist=.000001)
bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
shape.to_mesh(facade.data)
shape.free()
bpy.context.view_layer.objects.active = facade
bevel = facade.modifiers.new('Soft arch rims', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'BEVEL'))
bevel.width = .045
bevel.segments = 3
bevel.limit_method = enum_value(bevel.bl_rna.properties, 'limit_method', 'ANGLE')
bevel.angle_limit = .6
bpy.ops.object.modifier_apply(modifier=bevel.name)
for polygon in facade.data.polygons:
    polygon.use_smooth = False

for side in [-1, 1]:
    for stripe in range(9):
        horizontal = side * 2.82 + (stripe - 4) * .35
        mat = porcelain if stripe % 2 == 0 else materials['Copper Cabinet Enamel']
        awning = box('CollectibleBakery_Awning_' + str(side) + '_' + str(stripe), (horizontal, -1.73, 4.075), (.351, .73, .13), mat, .047)
        awning.rotation_euler.x = -.15
        box('CollectibleBakery_Scallop_' + str(side) + '_' + str(stripe), (horizontal, -2.075, 3.96), (.345, .13, .26), mat, .12)

hero = source['Shop_Rooftop_pretzel']
hero.location = (-.15, 1.85, 8.19)
old_loaf = source['Pretzel_BraidedLoaf']
bpy.data.objects.remove(old_loaf, do_unlink=True)
curve = bpy.data.curves.new('Collectible Braided Pretzel', enum_value(bpy.data.curves.bl_rna.functions['new'].parameters, 'type', 'CURVE'))
curve.dimensions = enum_value(curve.bl_rna.properties, 'dimensions', '3D')
curve.resolution_u = 12
curve.bevel_depth = .315
curve.bevel_resolution = 3
curve.use_fill_caps = True
spline = curve.splines.new(enum_value(curve.splines.bl_rna.functions['new'].parameters, 'type', 'BEZIER'))
points = [(-1.15, -.11, -.48), (-.15, -.15, .42), (1.05, 0, 1.05),
          (1.75, 0, .58), (1.52, 0, -.5), (0, 0, -1.0), (-1.52, 0, -.5),
          (-1.75, 0, .58), (-1.05, 0, 1.05), (.15, .16, .42), (1.15, .11, -.48)]
spline.bezier_points.add(len(points) - 1)
for point, coordinate in zip(spline.bezier_points, points):
    point.co = coordinate
    point.handle_left_type = enum_value(point.bl_rna.properties, 'handle_left_type', 'AUTO')
    point.handle_right_type = enum_value(point.bl_rna.properties, 'handle_right_type', 'AUTO')
loaf = bpy.data.objects.new('CollectibleBakery_Pretzel_BraidedLoaf', curve)
scene.collection.objects.link(loaf)
loaf.parent = hero
loaf['collectibleRuntimeName'] = 'Pretzel_BraidedLoaf'
loaf.data.materials.append(materials['Copper Golden Crust'])
for obj in scene.objects:
    obj.select_set(obj == loaf)
bpy.context.view_layer.objects.active = loaf
bpy.ops.object.convert(target=enum_value(bpy.ops.object.convert.get_rna_type().properties, 'target', 'MESH'))
loaf = bpy.context.object
loaf.data.update()
for polygon in loaf.data.polygons:
    polygon.use_smooth = True
front_vertices = [vertex for vertex in loaf.data.vertices if vertex.normal.y < -.75]
for index, vertex in enumerate(random.Random(31).sample(front_vertices, 36)):
    salt = box('CollectibleBakery_Salt_' + str(index), vertex.co + vertex.normal * .025, (.073, .035, .061), porcelain, .012, hero)
    salt.rotation_euler.y = index * .77
box('CollectibleBakery_RoofPlinth', (-.15, 1.85, 6.83), (2.86, 1.13, .24), materials['Copper Satin Metal'], .11)

interior = source['Copper_FurnishedInterior']
crust_index = list(interior.data.materials).index(materials['Copper Golden Crust'])
shape = bmesh.new()
shape.from_mesh(interior.data)
bmesh.ops.remove_doubles(shape, verts=list(shape.verts), dist=.000001)
visited = set()
for face in shape.faces:
    if face.material_index != crust_index:
        continue
    for seed in face.verts:
        if seed in visited:
            continue
        component, pending = [], [seed]
        while pending:
            vertex = pending.pop()
            if vertex in visited:
                continue
            visited.add(vertex)
            component.append(vertex)
            pending.extend(edge.other_vert(vertex) for edge in vertex.link_edges)
        center = sum((vertex.co for vertex in component), Vector()) / len(component)
        floor = min(vertex.co.z for vertex in component)
        for vertex in component:
            vertex.co.x = center.x + (vertex.co.x - center.x) * 1.12
            vertex.co.y = center.y + (vertex.co.y - center.y) * 1.12
            vertex.co.z = floor + (vertex.co.z - floor) * 1.6
shape.to_mesh(interior.data)
shape.free()

meshes = [obj for obj in scene.objects if obj.type == 'MESH']
for obj in meshes:
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name='ContactUV')
    obj.data.uv_layers.active_index = 0
    obj.data.uv_layers[0].name = 'ContactUV'
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'EDIT'))
bpy.ops.mesh.select_all(action=enum_value(bpy.ops.mesh.select_all.get_rna_type().properties, 'action', 'SELECT'))
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006)
bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'OBJECT'))
for obj in meshes:
    obj.data.calc_loop_triangles()
source['Copper_Crumb_Asset']['collectibleVersion'] = 1
scene['status'] = 'modeled-awaiting-export-check'
print('BAKERY_REMESHED', len(scene.objects), sum(len(obj.data.loop_triangles) for obj in meshes))

surface_images = {}
for obj in meshes:
    surface_uv = obj.data.uv_layers.get('SurfaceUV') or obj.data.uv_layers.new(name='SurfaceUV')
    for polygon in obj.data.polygons:
        normal_axes = [abs(value) for value in polygon.normal]
        axis = normal_axes.index(max(normal_axes))
        horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop in polygon.loop_indices:
            point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
            surface_uv.data[loop].uv = (point[horizontal] * .65, point[vertical] * .65)
    obj.data.uv_layers.active_index = 0
for name, mat in materials.items():
    family = 'timber' if 'Timber' in name else 'brushed' if name == 'Copper Satin Metal' else 'stone' if 'Limestone' in name or 'Crust' in name else 'ceramic'
    if any(token in name for token in ['Leaf', 'Soil', 'Blossoms', 'Ink', 'Diffusers']):
        continue
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'SurfaceUV'
    for channel in ['color', 'roughness', 'normal']:
        key = family + '-' + channel
        if key not in surface_images:
            image = bpy.data.images.load(PROJECT + '/public/assets/premium-v1/' + key + '.png', check_existing=False)
            if channel != 'color':
                image.colorspace_settings.name = enum_value(image.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
            image.pack()
            surface_images[key] = image
        texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = surface_images[key]
        mat.node_tree.links.new(uv.outputs['UV'], texture.inputs['Vector'])
        if channel == 'color':
            multiply = mat.node_tree.nodes.new('ShaderNodeMixRGB')
            multiply.blend_type = enum_value(multiply.bl_rna.properties, 'blend_type', 'MULTIPLY')
            multiply.inputs[0].default_value = 1
            multiply.inputs[2].default_value = tuple(mat['collectibleBaseColorLinear'])
            mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[1])
            mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Base Color'])
        elif channel == 'roughness':
            multiply = mat.node_tree.nodes.new('ShaderNodeMath')
            multiply.operation = enum_value(multiply.bl_rna.properties, 'operation', 'MULTIPLY')
            multiply.inputs[1].default_value = shader.inputs['Roughness'].default_value
            mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[0])
            mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Roughness'])
        else:
            normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
            normal.uv_map = 'SurfaceUV'
            normal.inputs['Strength'].default_value = .18 if 'Crust' in name else .3
            mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
            mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    mat['collectibleSurface'] = family

atlas_area = 0
for obj in meshes:
    obj.data.calc_loop_triangles()
    coordinates = obj.data.uv_layers['ContactUV'].data
    for triangle in obj.data.loop_triangles:
        first, second, third = [coordinates[index].uv for index in triangle.loops]
        atlas_area += abs((second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x)) * .5
assert .05 < atlas_area < 1, 'Contact atlas must be packed across all objects: ' + str(atlas_area)
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    raise RuntimeError('Cycles is required for the bakery contact bake')
scene.cycles.samples = 16
scene.render.bake.target = enum_value(scene.render.bake.bl_rna.properties, 'target', 'IMAGE_TEXTURES')
scene.render.bake.margin = 4
scene.render.bake.use_clear = True
occlusion = bpy.data.images.new('Collectible Bakery Contact AO', width=2048, height=2048, alpha=False)
occlusion.colorspace_settings.name = enum_value(occlusion.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
occlusion.generated_color = (1, 1, 1, 1)
occlusion.use_fake_user = True
bake_material = bpy.data.materials.new('Collectible Bakery Contact Baker')
bake_material.use_nodes = True
nodes, links = bake_material.node_tree.nodes, bake_material.node_tree.links
nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
emission = nodes.new('ShaderNodeEmission')
contact = nodes.new('ShaderNodeAmbientOcclusion')
contact.inputs['Distance'].default_value = 1.1
contact.samples = 16
links.new(contact.outputs['Color'], emission.inputs['Color'])
links.new(emission.outputs[0], output.inputs['Surface'])
target = nodes.new('ShaderNodeTexImage')
target.image = occlusion
nodes.active = target
original_materials = {}
for obj in meshes:
    original_materials[obj] = (list(obj.data.materials), [polygon.material_index for polygon in obj.data.polygons])
    obj.data.materials.clear()
    obj.data.materials.append(bake_material)
    for polygon in obj.data.polygons:
        polygon.material_index = 0
    obj.data.update()
    obj.update_tag()
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.context.view_layer.update()
scene['status'] = 'baking-unverified'
try:
    result = bpy.ops.object.bake(type=enum_value(bpy.ops.object.bake.get_rna_type().properties, 'type', 'EMIT'), uv_layer='ContactUV')
    assert 'FINISHED' in result
    occlusion.filepath_raw = PROJECT + '/assets/premium-candidates/copper-bakery-collectible-ao.png'
    occlusion.file_format = enum_value(occlusion.bl_rna.properties, 'file_format', 'PNG')
    occlusion.save()
    occlusion.pack()
finally:
    for obj, (finishes, indices) in original_materials.items():
        obj.data.materials.clear()
        for mat in finishes:
            obj.data.materials.append(mat)
        for polygon, index in zip(obj.data.polygons, indices):
            polygon.material_index = index
scene['status'] = 'baked-awaiting-independent-check'
print('BAKERY_CONTACT_BAKED', atlas_area, len(surface_images))

properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=PROJECT + '/assets/premium-candidates/copper-bakery-collectible.raw.glb',
               use_active_scene=True, use_selection=False, export_animations=False,
               export_extras=True, export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
scene['status'] = 'draft-exported-awaiting-independent-check'

native_images = {node.image for obj in scene.objects if obj.type == 'MESH'
                 for mat in obj.data.materials if mat and mat.use_nodes
                 for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image}
native_images.add(occlusion)
assert all(image.packed_file for image in native_images)
bpy.ops.wm.save_as_mainfile(filepath=PROJECT + '/assets/premium-candidates/collectible-bakery-study-20261003.blend', copy=True, compress=True)
print('BAKERY_NATIVE_SOURCE_SAVED', len(native_images))


