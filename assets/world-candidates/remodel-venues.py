import bpy
import bmesh
import math
import re

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
PARTS = ['PlayRoof', 'MarketCanopy', 'MallCanopy', 'TableTop', 'ShelfCarcass', 'TicketBooth', 'Bell']
scene = bpy.data.scenes['Collectible Civic Craft']
bpy.context.window.scene = scene
templates = {obj.get('craftPart'): obj for obj in scene.objects if obj.get('craftPart')}
assert len(templates) == 15 and not any(part in templates for part in PARTS)
finish = templates['BenchSlat'].data.materials[0]


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def revolve(profile, sides=24, closed=False, petals=False):
    vertices, faces = [], []
    for radius, height in profile:
        for side in range(sides):
            angle = side * math.tau / sides
            scale = .96 + .04 * math.cos(angle * 6) if petals else 1
            vertices.append((radius * math.cos(angle) * scale, radius * math.sin(angle) * scale, height))
    for ring in range(len(profile) if closed else len(profile) - 1):
        following = (ring + 1) % len(profile)
        for side in range(sides):
            faces.append((ring * sides + side, ring * sides + (side + 1) % sides, following * sides + (side + 1) % sides, following * sides + side))
    if not closed:
        faces.extend([tuple(reversed(range(sides))), tuple((len(profile) - 1) * sides + side for side in range(sides))])
    return vertices, faces


def canopy(thin):
    segments, rows = 24, 6
    vertices, faces = [], []
    for layer in range(2):
        for row in range(rows + 1):
            for column in range(segments + 1):
                angle = column / segments * math.pi
                height = math.sin(angle) - .5 + .03 * math.sin(angle * 2)
                height = height if layer == 0 else height - .018 if thin else -.54
                vertices.append((math.cos(angle) * .5, row / rows - .5, height))
    count = (segments + 1) * (rows + 1)
    for row in range(rows):
        for column in range(segments):
            first = row * (segments + 1) + column
            corners = (first, first + 1, first + segments + 2, first + segments + 1)
            faces.extend([corners, tuple(index + count for index in reversed(corners))])
    for row in range(rows):
        for column in [0, segments]:
            first, second = row * (segments + 1) + column, (row + 1) * (segments + 1) + column
            faces.append((first, second, second + count, first + count))
    for column in range(segments):
        for row in [0, rows]:
            first = row * (segments + 1) + column
            faces.append((first, first + count, first + count + 1, first + 1))
    return vertices, faces


def build(part, index):
    shape = bmesh.new()
    if part == 'ShelfCarcass':
        boards = [((-.465, 0, 0), (.07, 1, 1)), ((.465, 0, 0), (.07, 1, 1)), ((0, 0, -.465), (.93, 1, .07)), ((0, 0, .465), (.93, 1, .07)), ((0, .46, 0), (.86, .08, .86))]
        boards.extend([((0, -.025, height), (.86, .95, .024)) for height in [-.392, -.12, .152]])
        for center, size in boards:
            for vertex in bmesh.ops.create_cube(shape, size=1)['verts']:
                vertex.co = tuple(vertex.co[axis] * size[axis] + center[axis] for axis in range(3))
        bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.006, segments=1, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
    elif part == 'TicketBooth':
        shape.from_mesh(templates['RoverBody'].data)
    else:
        if part == 'PlayRoof':
            vertices, faces = revolve([(.49, -.5), (.5, -.43), (.48, -.3), (.38, -.04), (.26, .23), (.11, .46), (.025, .5)], 24, petals=True)
        elif part in ['MarketCanopy', 'MallCanopy']:
            vertices, faces = canopy(part == 'MallCanopy')
        elif part == 'TableTop':
            vertices, faces = revolve([(.44, -.5), (.49, -.28), (.5, .02), (.48, .32), (.43, .5)], 24)
        else:
            vertices, faces = revolve([(.5, -.5), (.47, -.34), (.3, -.01), (.22, .4), (.12, .5), (.075, .48), (.16, .36), (.24, -.01), (.39, -.38), (.41, -.5)], 24, True)
        data = bpy.data.meshes.new('Venue Profile')
        data.from_pydata(vertices, [], faces)
        shape.from_mesh(data)
        bpy.data.meshes.remove(data)
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
        polygon.use_smooth = part not in ['ShelfCarcass', 'TicketBooth']
    uv = geometry.uv_layers.get('CraftUV') or geometry.uv_layers.new(name='CraftUV')
    for polygon in geometry.polygons:
        components = [abs(value) for value in polygon.normal]
        axis = components.index(max(components))
        horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop in polygon.loop_indices:
            point = geometry.vertices[geometry.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[horizontal] + .5, point[vertical] + .5)
    options = geometry.color_attributes.bl_rna.functions['new'].parameters
    colors = geometry.color_attributes.get('CraftColor') or geometry.color_attributes.new(name='CraftColor', type=choice(options, 'type', 'FLOAT_COLOR'), domain=choice(options, 'domain', 'CORNER'))
    geometry.color_attributes.active_color = colors
    for entry in colors.data:
        entry.color = (1, 1, 1, 1)
    geometry.materials.clear()
    geometry.materials.append(finish)
    obj = bpy.data.objects.new('Craft_' + part, geometry)
    scene.collection.objects.link(obj)
    obj.location = (24 + (index % 4) * 3, (index // 4) * 3, 0)
    obj['craftPart'], obj['craftVersion'] = part, 1
    obj.hide_render = True
    geometry.update()
    return obj


new_parts = [build(part, index) for index, part in enumerate(PARTS)]
hidden = {obj: obj.hide_render for obj in scene.objects}
for obj in scene.objects:
    obj.hide_render = True
bake = bpy.data.materials.new('Venue Contact Bake')
bake.use_nodes = True
nodes, links = bake.node_tree.nodes, bake.node_tree.links
nodes.clear()
output, emission, occlusion = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion')
occlusion.inputs['Distance'].default_value = .6
occlusion.samples = 16
links.new(occlusion.outputs['Color'], emission.inputs['Color'])
links.new(emission.outputs[0], output.inputs['Surface'])
scene.render.bake.target = choice(scene.render.bake.bl_rna.properties, 'target', 'VERTEX_COLORS')
scene.render.bake.use_selected_to_active = False
scene.cycles.samples = 16
try:
    for obj in new_parts:
        obj.hide_render = False
        ground_data = bpy.data.meshes.new('Venue Bake Ground')
        ground_data.from_pydata([(-2, -2, -.53), (2, -2, -.53), (2, 2, -.53), (-2, 2, -.53)], [], [(0, 1, 2, 3)])
        ground = bpy.data.objects.new('Venue Bake Ground', ground_data)
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
finally:
    for obj, value in hidden.items():
        obj.hide_render = value
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
scene['venueCraftStatus'] = 'exported-awaiting-runtime-review'
print('VENUE_CRAFT_EXPORTED', len(new_parts))
