import bpy
import bmesh
import math
import re

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
PARTS = ['RoverBody', 'MetroBody', 'MetroRoof', 'Tyre', 'RocketHull', 'RocketFin']
scene = bpy.data.scenes['Collectible Civic Craft']
bpy.context.window.scene = scene
templates = {obj.get('craftPart'): obj for obj in scene.objects if obj.get('craftPart')}
assert len(templates) == 9 and not any(part in templates for part in PARTS)
finish = templates['BenchSlat'].data.materials[0]


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def lathe(profile, sides, closed=False, tip=None):
    vertices = [(radius * math.cos(side * math.tau / sides), radius * math.sin(side * math.tau / sides), height) for radius, height in profile for side in range(sides)]
    faces = []
    for ring in range(len(profile) if closed else len(profile) - 1):
        following = (ring + 1) % len(profile)
        for side in range(sides):
            faces.append((ring * sides + side, ring * sides + (side + 1) % sides, following * sides + (side + 1) % sides, following * sides + side))
    if not closed:
        faces.append(tuple(reversed(range(sides))))
        if tip is None:
            faces.append(tuple((len(profile) - 1) * sides + side for side in range(sides)))
        else:
            top = len(vertices)
            vertices.append((0, 0, tip))
            for side in range(sides):
                faces.append(((len(profile) - 1) * sides + side, (len(profile) - 1) * sides + (side + 1) % sides, top))
    data = bpy.data.meshes.new('Transport Lathe')
    data.from_pydata(vertices, [], faces)
    shape = bmesh.new()
    shape.from_mesh(data)
    bpy.data.meshes.remove(data)
    return shape


def build(part, index):
    if part == 'MetroRoof':
        geometry = templates['LanternCap'].data.copy()
    else:
        if part == 'Tyre':
            shape = lathe([(.42, -.5), (.48, -.44), (.5, -.28), (.5, .28), (.48, .44), (.42, .5), (.24, .5), (.24, -.5)], 24, True)
        elif part == 'RocketHull':
            shape = lathe([(.78, 0), (.98, .18), (1.15, .45), (1.2, .65), (1.2, 1.15), (1.19, 2.1), (1.2, 3.1), (1.15, 3.5), (1.05, 4.2), (.91, 4.7), (.63, 5.3), (.32, 5.78), (.04, 5.98)], 40, tip=6)
        elif part == 'RocketFin':
            profile = [(-.5, -.5), (.5, -.5), (.5, -.25), (.34, .1), (-.28, .5), (-.5, .5)]
            count = len(profile)
            vertices = [(side, -forward, height) for side in [-.5, .5] for forward, height in profile]
            faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))] + [(edge, (edge + 1) % count, (edge + 1) % count + count, edge + count) for edge in range(count)]
            data = bpy.data.meshes.new('Swept Rocket Fin')
            data.from_pydata(vertices, [], faces)
            shape = bmesh.new()
            shape.from_mesh(data)
            bpy.data.meshes.remove(data)
            bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.055, segments=2, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
        else:
            shape = bmesh.new()
            bmesh.ops.create_cube(shape, size=1)
            bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.13 if part == 'RoverBody' else .09, segments=3, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
            if part == 'RoverBody':
                for vertex in shape.verts:
                    vertex.co.z += .035 * math.cos(vertex.co.y * math.pi) * max(0, vertex.co.z)
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
        polygon.use_smooth = part not in ['RoverBody', 'MetroBody', 'RocketFin']
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
    obj.location = (12 + (index % 3) * 3, (index // 3) * 3, 0)
    obj['craftPart'], obj['craftVersion'] = part, 1
    obj.hide_render = True
    geometry.update()
    return obj


new_parts = [build(part, index) for index, part in enumerate(PARTS)]
hidden = {obj: obj.hide_render for obj in scene.objects}
for obj in scene.objects:
    obj.hide_render = True
bake = bpy.data.materials.new('Transport Contact Bake')
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
        ground_data = bpy.data.meshes.new('Transport Bake Ground')
        ground_data.from_pydata([(-2, -2, -.53), (2, -2, -.53), (2, 2, -.53), (-2, 2, -.53)], [], [(0, 1, 2, 3)])
        ground = bpy.data.objects.new('Transport Bake Ground', ground_data)
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
scene['vehicleCraftStatus'] = 'exported-awaiting-runtime-review'
print('TRANSPORT_CRAFT_EXPORTED', len(new_parts))
