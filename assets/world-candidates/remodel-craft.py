import bpy
import bmesh
import math
import re
from mathutils import Vector

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
NAME = 'Collectible Civic Craft'
PARTS = ['BenchSlat', 'BenchBack', 'BenchFoot', 'Lantern', 'LanternCap', 'Bin', 'BinLid', 'FlowerBedRim', 'PlaqueBacking']
assert bpy.data.scenes.get(NAME) is None
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def loft(profile, sides=24, power=.45):
    vertices, faces = [], []
    for ring, (radius, height) in enumerate(profile):
        for side in range(sides):
            angle = side * math.tau / sides
            horizontal, forward = math.cos(angle), math.sin(angle)
            ripple = 1 - .035 * math.sin(angle * 6) ** 2
            vertices.append((math.copysign(abs(horizontal) ** power, horizontal) * radius * ripple, math.copysign(abs(forward) ** power, forward) * radius * ripple, height))
            if ring:
                prior, following = (ring - 1) * sides + side, (ring - 1) * sides + (side + 1) % sides
                faces.append((prior, following, following + sides, prior + sides))
    faces.extend([tuple(reversed(range(sides))), tuple((len(profile) - 1) * sides + side for side in range(sides))])
    geometry = bpy.data.meshes.new('Craft Loft')
    geometry.from_pydata(vertices, [], faces)
    shape = bmesh.new()
    shape.from_mesh(geometry)
    bpy.data.meshes.remove(geometry)
    return shape


def build(part, index):
    if part in ['LanternCap', 'BinLid']:
        shape = loft([(.4, -.5), (.5, -.28), (.5, -.05), (.42, .36), (.28, .5)], 20)
    elif part == 'Bin':
        shape = loft([(.41, -.5), (.46, -.36), (.49, .24), (.5, .45), (.46, .5)], 24, .38)
    elif part == 'FlowerBedRim':
        shape = loft([(.42, -.5), (.48, .32), (.5, .42), (.5, .5), (.39, .5), (.37, .4), (.32, -.3)], 24, .3)
    elif part == 'Lantern':
        shape = bmesh.new()
        bmesh.ops.create_uvsphere(shape, u_segments=16, v_segments=8, radius=.5)
        for vertex in shape.verts:
            vertex.co = tuple(math.copysign(abs(value * 2) ** .6, value) * .5 for value in vertex.co)
    elif part == 'BenchFoot':
        profile = [(-.5, -.5), (-.5, -.34), (-.22, -.19), (-.27, .26), (-.43, .4), (-.34, .5), (.34, .5), (.43, .4), (.18, .21), (.2, -.2), (.5, -.37), (.5, -.5)]
        vertices = [(side, -forward, height) for side in [-.5, .5] for forward, height in profile]
        count = len(profile)
        faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))] + [(index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count)]
        geometry = bpy.data.meshes.new('Craft Cast Support')
        geometry.from_pydata(vertices, [], faces)
        shape = bmesh.new()
        shape.from_mesh(geometry)
        bpy.data.meshes.remove(geometry)
        bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.045, segments=2, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
    else:
        shape = bmesh.new()
        bmesh.ops.create_cube(shape, size=1)
        bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.11 if part == 'PlaqueBacking' else .085, segments=2, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
        for vertex in shape.verts:
            if part == 'BenchSlat':
                vertex.co.z -= .055 * (1 - (vertex.co.x * 2) ** 2) * (vertex.co.z + .5)
            elif part == 'BenchBack':
                vertex.co.y += .055 * (1 - (vertex.co.x * 2) ** 2)
    bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
    if shape.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
    geometry = bpy.data.meshes.new('Craft_' + part)
    shape.to_mesh(geometry)
    shape.free()
    lower = [min(vertex.co[axis] for vertex in geometry.vertices) for axis in range(3)]
    upper = [max(vertex.co[axis] for vertex in geometry.vertices) for axis in range(3)]
    for vertex in geometry.vertices:
        for axis in range(3):
            vertex.co[axis] = (vertex.co[axis] - lower[axis]) / (upper[axis] - lower[axis]) - .5
    for polygon in geometry.polygons:
        polygon.use_smooth = part not in ['BenchSlat', 'BenchBack', 'PlaqueBacking', 'BenchFoot']
    uv = geometry.uv_layers.new(name='CraftUV')
    for polygon in geometry.polygons:
        components = [abs(value) for value in polygon.normal]
        axis = components.index(max(components))
        horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop in polygon.loop_indices:
            point = geometry.vertices[geometry.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[horizontal] + .5, point[vertical] + .5)
    options = geometry.color_attributes.bl_rna.functions['new'].parameters
    colors = geometry.color_attributes.new(name='CraftColor', type=choice(options, 'type', 'FLOAT_COLOR'), domain=choice(options, 'domain', 'CORNER'))
    geometry.color_attributes.active_color = colors
    for entry in colors.data:
        entry.color = (1, 1, 1, 1)
    obj = bpy.data.objects.new('Craft_' + part, geometry)
    scene.collection.objects.link(obj)
    obj.location = ((index % 3) * 3, (index // 3) * 3, 0)
    obj['craftPart'] = part
    obj['craftVersion'] = 1
    geometry.materials.append(finish)
    obj.hide_render = True
    geometry.update()
    return obj


finish = bpy.data.materials.new('Craft Neutral Vertex Finish')
finish.use_nodes = True
shader = next(node for node in finish.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
shader.inputs['Roughness'].default_value = .74
color = finish.node_tree.nodes.new('ShaderNodeVertexColor')
color.layer_name = 'CraftColor'
finish.node_tree.links.new(color.outputs['Color'], shader.inputs['Base Color'])
templates = {part: build(part, index) for index, part in enumerate(PARTS)}
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    raise RuntimeError('Cycles is required for the craft study')
scene.cycles.samples = 16
scene.render.bake.target = choice(scene.render.bake.bl_rna.properties, 'target', 'VERTEX_COLORS')
scene.render.bake.use_selected_to_active = False
bake = bpy.data.materials.new('Craft Contact Bake')
bake.use_nodes = True
nodes, links = bake.node_tree.nodes, bake.node_tree.links
nodes.clear()
output, emission, occlusion = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion')
occlusion.inputs['Distance'].default_value = .6
occlusion.samples = 16
links.new(occlusion.outputs['Color'], emission.inputs['Color'])
links.new(emission.outputs[0], output.inputs['Surface'])
for obj in templates.values():
    obj.hide_render = False
    ground_data = bpy.data.meshes.new('Craft Bake Ground')
    ground_data.from_pydata([(-2, -2, -.53), (2, -2, -.53), (2, 2, -.53), (-2, 2, -.53)], [], [(0, 1, 2, 3)])
    ground = bpy.data.objects.new('Craft Bake Ground', ground_data)
    scene.collection.objects.link(ground)
    ground.location = obj.location
    obj.data.materials.clear()
    obj.data.materials.append(bake)
    for other in scene.objects:
        other.select_set(other == obj)
    bpy.context.view_layer.objects.active = obj
    bpy.context.view_layer.update()
    try:
        assert 'FINISHED' in bpy.ops.object.bake(type=choice(bpy.ops.object.bake.get_rna_type().properties, 'type', 'EMIT'))
        for entry in obj.data.color_attributes.active_color.data:
            shade = .62 + .38 * max(0, min(1, entry.color[0]))
            entry.color = (shade, shade, shade, 1)
    finally:
        obj.data.materials.clear()
        obj.data.materials.append(finish)
        obj.hide_render = True
        bpy.data.objects.remove(ground, do_unlink=True)
        bpy.data.meshes.remove(ground_data)
for obj in scene.objects:
    obj.select_set(bool(obj.get('craftPart')))
properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=ROOT + '/assets/world-candidates/craft-kit.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False, export_vertex_color=choice(properties, 'export_vertex_color', 'NAME'), export_vertex_color_name='CraftColor', export_all_vertex_colors=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
scene['status'] = 'exported-awaiting-assembly-review'
print('CIVIC_CRAFT_EXPORTED', len(templates))

preview_materials = {}
for role, color in [('wood', (.33, .19, .11, 1)), ('ink', (.025, .05, .064, 1)), ('brass', (.43, .31, .12, 1)), ('stone', (.6, .66, .61, 1)), ('leaf', (.065, .21, .12, 1)), ('warm', (.92, .77, .51, 1)), ('soil', (.09, .055, .027, 1)), ('petal', (.71, .35, .42, 1))]:
    material = bpy.data.materials.new('Craft Review ' + role)
    material.use_nodes = True
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = .48 if role == 'brass' else .75
    shader.inputs['Metallic'].default_value = .65 if role == 'brass' else .05
    preview_materials[role] = material


def preview(part, location, size, role):
    geometry = templates[part].data.copy()
    geometry.materials.clear()
    geometry.materials.append(preview_materials[role])
    obj = bpy.data.objects.new('Review_' + part, geometry)
    scene.collection.objects.link(obj)
    obj.location = (location[0], -location[2], location[1])
    obj.scale = (size[0], size[2], size[1])
    obj['craftPreview'] = True
    return obj


for slat in range(4):
    preview('BenchSlat', (-2.7, .74, -.3 + slat * .18), (2.9, .09, .14), 'wood')
for slat in range(3):
    preview('BenchBack', (-2.7, 1.03 + slat * .17, -.42), (2.9, .1, .09), 'wood')
for side in [-1, 1]:
    preview('BenchFoot', (-2.7 + side * 1.05, .35, 0), (.13, .7, .61), 'ink')
    preview('BenchBack', (-2.7 + side * 1.05, 1.065, -.455), (.12, .85, .08), 'ink')
    preview('BenchSlat', (-2.7 + side * 1.05, .67, -.235), (.12, .08, .4), 'ink')
    preview('Bin', (2.6 + side * .5, .65, 0), (.65, 1.2, .62), 'leaf' if side < 0 else 'ink')
    preview('BinLid', (2.6 + side * .5, 1.29, 0), (.72, .12, .68), 'brass')
    preview('LanternCap', (.4, 4.2 + side * .4, 1.5), (.7, .1, .7), 'brass')
preview('Lantern', (.4, 4.2, 1.5), (.48, .7, .48), 'warm')
preview('LanternCap', (.4, 4.69, 1.5), (.72, .24, .72), 'stone')
for side in [-1, 1]:
    for start, end, radius in [((side * 1.38, 1.03, -.37), (side * 1.38, 1.03, .38), .035), ((side * 1.38, .74, .24), (side * 1.38, 1.03, .24), .03)]:
        first, second = Vector((start[0] - 2.7, -start[2], start[1])), Vector((end[0] - 2.7, -end[2], end[1]))
        shape = bmesh.new()
        bmesh.ops.create_cone(shape, cap_ends=True, cap_tris=False, segments=8, radius1=radius, radius2=radius, depth=(second - first).length)
        geometry = bpy.data.meshes.new('Review Bench Arm')
        shape.to_mesh(geometry)
        shape.free()
        geometry.materials.append(preview_materials['brass'])
        arm = bpy.data.objects.new('Review_BenchArm', geometry)
        scene.collection.objects.link(arm)
        arm.location = (first + second) * .5
        arm.rotation_euler = (second - first).to_track_quat('Z', 'Y').to_euler()
shape = bmesh.new()
bmesh.ops.create_cone(shape, cap_ends=True, cap_tris=False, segments=12, radius1=.105, radius2=.065, depth=4.2)
geometry = bpy.data.meshes.new('Review Lamp Mast')
shape.to_mesh(geometry)
shape.free()
geometry.materials.append(preview_materials['ink'])
mast = bpy.data.objects.new('Review_LampMast', geometry)
scene.collection.objects.link(mast)
mast.location = (.4, -1.5, 2.1)
preview('FlowerBedRim', (-1.6, .16, 2.6), (3.5, .32, 1.3), 'stone')
preview('BenchSlat', (-1.6, .28, 2.6), (3.5 * .73, .035, 1.3 * .73), 'soil')
for flower in range(12):
    preview('Lantern', (-2.65 + flower % 6 * .42, .48, 2.42 + flower // 6 * .32), (.18, .12, .18), 'petal')
preview('PlaqueBacking', (2.5, 2, 2.5), (3.3, .95, .22), 'ink')
preview('BenchSlat', (0, -.055, 1), (13, .1, 8), 'stone')
world = bpy.data.worlds.new('Craft Assembly World')
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.34, .4, .39, 1)
background.inputs['Strength'].default_value = .6
scene.world = world
for label, location, power in [('Key', (-6, -8, 11), 1800), ('Fill', (8, -4, 7), 1100), ('Rim', (0, 8, 11), 2100)]:
    data = bpy.data.lights.new('Craft Review ' + label, choice(bpy.data.lights.bl_rna.functions['new'].parameters, 'type', 'AREA'))
    data.energy, data.size = power, 7
    light = bpy.data.objects.new('Craft_Review' + label, data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, -1, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
data = bpy.data.cameras.new('Craft Review Camera')
camera = bpy.data.objects.new('Craft_ReviewCamera', data)
scene.collection.objects.link(camera)
data.type = choice(data.bl_rna.properties, 'type', 'ORTHO')
data.ortho_scale = 12
camera.location = (10, -15, 10)
camera.rotation_euler = (Vector((0, -.7, 1.4)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera
scene.render.resolution_x, scene.render.resolution_y = 1200, 840
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = choice(scene.render.image_settings.bl_rna.properties, 'file_format', 'PNG')
scene.render.filepath = ROOT + '/assets/world-candidates/craft-assembly.png'
assert 'FINISHED' in bpy.ops.render.render(write_still=True)
scene['status'] = 'assembled-awaiting-runtime-review'
