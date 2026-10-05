import bpy
import bmesh
import math
import json
import re

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
PARTS = ['FountainBasin', 'FountainColumn', 'FountainFinial', 'ClockDrum', 'SorterHousing', 'TurbineBlade']
BASIN = [[0, 0, 0], [.84, 0, 0], [.84, 0, .075], [.935, 0, .075], [.965, 0, .16], [.958, 0, .3], [1, 0, .49], [1, 0, .65], [1, .08, .76], [1, .25, .76], [1, .34, .63], [1, .39, .34], [0, 0, .34]]
scene = bpy.data.scenes['Collectible Civic Craft']
bpy.context.window.scene = scene
templates = {obj.get('craftPart'): obj for obj in scene.objects if obj.get('craftPart')}
assert len(templates) == 22 and not any(part in templates for part in PARTS)
finish = templates['BenchSlat'].data.materials[0]


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def revolve(profile, sides, flutes=0, strength=0, inner_start=None):
    vertices, faces, rings, rows = [], [], [], []
    for row, (radius, height) in enumerate(profile):
        ring = []
        for side in range(sides if radius > 0 else 1):
            angle = side * math.tau / sides
            modulation = 1 - strength * math.sin(angle * flutes) ** 2
            if row in [0, len(profile) - 1] or radius > max(value[0] for value in profile) * .98 or (inner_start is not None and row >= inner_start):
                modulation = 1
            ring.append(len(vertices))
            vertices.append((radius * math.cos(angle) * modulation, radius * math.sin(angle) * modulation, height))
            rows.append(row)
        rings.append(ring)
    for first, second in zip(rings, rings[1:]):
        for side in range(sides):
            following = (side + 1) % sides
            if len(first) == 1:
                faces.append((first[0], second[following], second[side]))
            elif len(second) == 1:
                faces.append((first[side], first[following], second[0]))
            else:
                faces.append((first[side], first[following], second[following], second[side]))
    if len(rings[0]) > 1:
        faces.append(tuple(reversed(rings[0])))
    if len(rings[-1]) > 1:
        faces.append(tuple(rings[-1]))
    return vertices, faces, rows


def build(part, index):
    shape = bmesh.new()
    if part == 'TurbineBlade':
        bmesh.ops.create_uvsphere(shape, u_segments=12, v_segments=8, radius=.5)
        for vertex in shape.verts:
            horizontal, forward, height = vertex.co
            vertex.co.x = horizontal * (.72 - height * .3) + .15 * math.sin((height + .5) * math.pi)
            vertex.co.y = forward * (.72 - height * .25)
    else:
        if part == 'FountainBasin':
            profile = [(row[0] * 6.4 - row[1], row[2]) for row in BASIN]
            sides, flutes, strength = 32, 8, .012
        elif part == 'FountainColumn':
            profile = [(.42, -.5), (.5, -.46), (.5, -.4), (.31, -.32), (.25, -.27), (.2, .26), (.25, .32), (.4, .42), (.43, .5)]
            sides, flutes, strength = 36, 6, .14
        elif part == 'FountainFinial':
            profile = [(.05, -.5), (.18, -.42), (.34, -.22), (.5, -.04), (.46, .18), (.31, .38), (.08, .49), (.015, .5)]
            sides, flutes, strength = 24, 4, .12
        elif part == 'ClockDrum':
            profile = [(.25, -.5), (.34, -.47), (.43, -.38), (.49, -.26), (.5, -.19), (.485, .18), (.5, .24), (.43, .38), (.34, .47), (.25, .5)]
            sides, flutes, strength = 40, 10, .035
        else:
            profile = [(.42, -.5), (.49, -.47), (.5, -.38), (.46, -.3), (.39, -.25), (.4, -.18), (.39, -.12), (.39, .32), (.35, .38), (.38, .42), (.38, .48), (.3, .5)]
            sides, flutes, strength = 32, 8, .025
        vertices, faces, rows = revolve(profile, sides, flutes, strength, 8 if part == 'FountainBasin' else None)
        data = bpy.data.meshes.new('Landmark Profile')
        data.from_pydata(vertices, [], faces)
        if part == 'FountainBasin':
            uv = data.uv_layers.new(name='CraftUV')
            for polygon in data.polygons:
                for loop in polygon.loop_indices:
                    vertex = data.loops[loop].vertex_index
                    position = data.vertices[vertex].co
                    uv.data[loop].uv = ((math.atan2(position.y, position.x) / math.tau) % 1, rows[vertex] / (len(profile) - 1))
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
        polygon.use_smooth = True
    uv = geometry.uv_layers.get('CraftUV') or geometry.uv_layers.new(name='CraftUV')
    if part != 'FountainBasin':
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
    geometry.materials.append(finish)
    obj = bpy.data.objects.new('Craft_' + part, geometry)
    scene.collection.objects.link(obj)
    obj.location = (36 + index % 3 * 3, index // 3 * 3, 0)
    obj['craftPart'], obj['craftVersion'] = part, 1
    if part == 'FountainBasin':
        obj['basinProfile'] = json.dumps(BASIN)
        obj['basinReferenceRadius'] = 6.4
    obj.hide_render = True
    geometry.update()
    return obj


new_parts = [build(part, index) for index, part in enumerate(PARTS)]
hidden = {obj: obj.hide_render for obj in scene.objects}
for obj in scene.objects:
    obj.hide_render = True
bake = bpy.data.materials.new('Landmark Contact Bake')
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
        ground_data = bpy.data.meshes.new('Landmark Bake Ground')
        ground_data.from_pydata([(-2, -2, -.53), (2, -2, -.53), (2, 2, -.53), (-2, 2, -.53)], [], [(0, 1, 2, 3)])
        ground = bpy.data.objects.new('Landmark Bake Ground', ground_data)
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
scene['landmarkCraftStatus'] = 'exported-awaiting-runtime-review'
print('LANDMARK_CRAFT_EXPORTED', len(new_parts))
