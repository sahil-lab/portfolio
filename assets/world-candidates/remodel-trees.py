import bpy
import bmesh
import math
import json
import re
from mathutils import Vector

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
NAME = 'Collectible Botanical Study'
assert bpy.data.scenes.get(NAME) is None
scene = bpy.data.scenes.new(NAME)
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=ROOT + '/public/assets/premium-v1/kingdom-world-kit.glb')
parts = {obj.get('kitPart'): obj for obj in scene.objects if obj.type == 'MESH'}
assert len(parts) == 21
trees = [obj for name, obj in parts.items() if name.startswith(('Kit_Tree_', 'Kit_Banyan_'))]
bounds = {}
for name, obj in parts.items():
    obj.name = 'Botanical_' + name
    obj.hide_render = obj not in trees or 'Distant' in name
    if obj in trees:
        bounds[name] = [[min(vertex.co[axis] for vertex in obj.data.vertices) for axis in range(3)], [max(vertex.co[axis] for vertex in obj.data.vertices) for axis in range(3)]]
        obj.location = (-11 if 'Tree' in name else 11, 0 if 'Full' in name else 24, 0)


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def point(horizontal, height, forward):
    return Vector((horizontal, -forward, height))


def tube(control_points, radius, rings, sides):
    control = [point(*item) for item in control_points]
    vertices, faces = [], []
    for ring in range(rings + 1):
        progress = ring / rings
        center = sum((control[index] * (1 - progress) ** (3 - index) * progress ** index * (3 if index in (1, 2) else 1) for index in range(4)), Vector())
        tangent = ((control[1] - control[0]) * (1 - progress) ** 2 + (control[2] - control[1]) * 2 * (1 - progress) * progress + (control[3] - control[2]) * progress ** 2).normalized()
        across = tangent.cross(Vector((0, 1, 0))).normalized()
        if across.length < .1:
            across = tangent.cross(Vector((1, 0, 0))).normalized()
        along = tangent.cross(across).normalized()
        for side in range(sides):
            angle = side / sides * math.tau
            ridge = .93 + .07 * math.cos(angle * 3 + progress * 4)
            width = radius * (1 - progress * .78) * ridge
            vertices.append(tuple(center + (across * math.cos(angle) + along * math.sin(angle)) * width))
            if ring < rings:
                current, following = ring * sides + side, ring * sides + (side + 1) % sides
                faces.append((current, following, following + sides, current + sides))
    faces.extend([tuple(reversed(range(sides))), tuple(rings * sides + side for side in range(sides))])
    return vertices, faces


def lobe(center, size, angle, detailed):
    shape = bmesh.new()
    bmesh.ops.create_uvsphere(shape, u_segments=10 if detailed else 6, v_segments=5 if detailed else 3, radius=1)
    for vertex in shape.verts:
        horizontal, forward, height = vertex.co
        contour = 1 + .12 * math.cos(math.atan2(forward, horizontal) * 3 + angle) * (1 - height * height)
        horizontal *= 1.02 * size * contour
        forward *= .66 * size * contour
        height = math.copysign(abs(height) ** .85, height) * .45 * size
        vertex.co = (horizontal * math.cos(angle) - forward * math.sin(angle), horizontal * math.sin(angle) + forward * math.cos(angle), height + horizontal * .13)
        vertex.co += center
    shape.verts.ensure_lookup_table()
    shape.verts.index_update()
    result = ([tuple(vertex.co) for vertex in shape.verts], [tuple(vertex.index for vertex in face.verts) for face in shape.faces])
    shape.free()
    return result


def replace(obj, fragments):
    vertices, faces = [], []
    for coordinates, polygons in fragments:
        offset = len(vertices)
        vertices.extend(coordinates)
        faces.extend(tuple(offset + index for index in polygon) for polygon in polygons)
    geometry = bpy.data.meshes.new(obj.name + '_Remodeled')
    geometry.from_pydata(vertices, [], faces)
    shape = bmesh.new()
    shape.from_mesh(geometry)
    bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
    if shape.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
    shape.to_mesh(geometry)
    shape.free()
    obj.data = geometry
    if 'Crown' in obj['kitPart']:
        lower, upper = bounds[obj['kitPart']]
        current_lower = [min(vertex.co[axis] for vertex in geometry.vertices) for axis in range(3)]
        current_upper = [max(vertex.co[axis] for vertex in geometry.vertices) for axis in range(3)]
        for vertex in geometry.vertices:
            for axis in range(3):
                vertex.co[axis] = lower[axis] + (vertex.co[axis] - current_lower[axis]) * (upper[axis] - lower[axis]) / (current_upper[axis] - current_lower[axis])
    for polygon in geometry.polygons:
        polygon.use_smooth = True
    attribute_options = geometry.color_attributes.bl_rna.functions['new'].parameters
    colors = geometry.color_attributes.new(name='KitRenderColor', type=choice(attribute_options, 'type', 'FLOAT_COLOR'), domain=choice(attribute_options, 'domain', 'CORNER'))
    geometry.color_attributes.active_color = colors
    tint = obj['kitTint']
    for entry in colors.data:
        entry.color = (*tint, 1)
    material = bpy.data.materials.new(obj['kitPart'] + '_Botanical')
    material.use_nodes = True
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = .87 if 'Wood' in obj['kitPart'] else .78
    color = material.node_tree.nodes.new('ShaderNodeVertexColor')
    color.layer_name = 'KitRenderColor'
    material.node_tree.links.new(color.outputs['Color'], shader.inputs['Base Color'])
    geometry.materials.append(material)
    obj['collectibleTreeStyle'] = 'carved-botanical-v1'
    geometry.update()


camera_data = bpy.data.cameras.new('Botanical Review Camera')
camera = bpy.data.objects.new('Botanical_ReviewCamera', camera_data)
scene.collection.objects.link(camera)
camera.location = (24, -42, 24)
camera.rotation_euler = (Vector((0, 0, 4.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = choice(camera_data.bl_rna.properties, 'type', 'ORTHO')
camera_data.ortho_scale = 39
scene.camera = camera
for label, location, energy, size in [('Key', (-12, -14, 22), 4500, 12), ('Fill', (18, -4, 16), 2600, 10), ('Rim', (0, 16, 23), 5000, 10)]:
    data = bpy.data.lights.new('Botanical ' + label, choice(bpy.data.lights.bl_rna.functions['new'].parameters, 'type', 'AREA'))
    light = bpy.data.objects.new('Botanical_Review' + label, data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 5)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    data.energy, data.size = energy, size
world = bpy.data.worlds.new('Botanical Review World')
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.28, .34, .33, 1)
background.inputs['Strength'].default_value = .6
scene.world = world
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    raise RuntimeError('Cycles is required for this study')
scene.cycles.samples = 20
scene.render.resolution_x, scene.render.resolution_y = 1200, 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = choice(scene.render.image_settings.bl_rna.properties, 'file_format', 'PNG')
scene.render.filepath = ROOT + '/assets/world-candidates/trees-before.png'
assert 'FINISHED' in bpy.ops.render.render(write_still=True)

tips = [(-4.8, 6.4, 1.2), (-3.5, 8.2, -1.6), (-1.5, 9.5, .4), (2, 8.8, -1.9), (4.4, 7.8, .6), (3.3, 6.1, 2.4), (.2, 7.6, 3)]
for kind in ['Tree', 'Banyan']:
    banyan = kind == 'Banyan'
    endpoints = [(horizontal * 1.48, height * .9 + .5, forward * 1.7) for horizontal, height, forward in tips] + [(0, 7.6, -6), (-3.6, 6.8, -4.9), (5.4, 7.1, -4.1)] if banyan else tips
    for detail in ['Full', 'Distant']:
        detailed = detail == 'Full'
        rings, sides, clumps = (10, 8, 6) if detailed else (4, 5, 4)
        wood = [tube([(0, -.2, 0), (-.16, 2.2, .1), (.28, 4.5, -.18), (.12, 7, .1)], .74 if banyan else .39, rings, sides)]
        crown = []
        for branch_index, (horizontal, height, forward) in enumerate(endpoints):
            wood.append(tube([(-.1, 3.4 + branch_index % 3 * .5, .1), (horizontal * .26, height * .8, forward * .18), (horizontal * .83, height - .95, forward * .88), (horizontal, height, forward)], .29 if banyan else .19, rings, sides))
            for leaf_index in range(clumps):
                angle = leaf_index * 2.3999632297 + branch_index
                spread = math.sqrt((leaf_index + .5) / clumps)
                center = point(horizontal + math.cos(angle) * spread * 1.5, height - spread * .45 + .2 * math.cos(angle), forward + math.sin(angle) * spread * 1.12)
                crown.append(lobe(center, (1.45 if detailed else 1.65) + leaf_index % 3 * .12, angle, detailed))
            if banyan:
                support = max(.72, 2.25 / math.hypot(horizontal, forward))
                root_x, root_z, root_height = horizontal * support, forward * support, height - .65
                wood.append(tube([(root_x, -.35, root_z), (root_x - .05, 1.5, root_z + .04), (root_x + .18, root_height * .68, root_z - .12), (root_x, root_height, root_z)], .22, rings, sides))
                wood.append(tube([(root_x * .17, -.25, root_z * .17), (root_x * .13, .3, root_z * .13), (root_x * .05, 1.1, root_z * .05), (0, 1.9, 0)], .24, 6 if detailed else 3, sides))
                if detailed:
                    for strand in range(3):
                        start_x, start_z = horizontal * .89 + strand * .27, forward * .9
                        wood.append(tube([(start_x, height - .18, start_z), (start_x + .2, height - 1.2, start_z + .12), (start_x - .1, height * .55, start_z - .08), (start_x - .1, 1.8 + strand * .75, start_z + .2)], .045, 6, 4))
        for role, fragments in [('Wood', wood), ('Crown', crown)]:
            replace(parts['Kit_' + kind + '_' + detail + '_' + role], fragments)

scene['status'] = 'modeled-awaiting-contact-bake'
scene['originalBounds'] = json.dumps(bounds)
bpy.context.view_layer.update()
print('BOTANICAL_MODELED', len(trees))

counts = {}
for obj in trees:
    obj.data.calc_loop_triangles()
    counts[obj['kitPart']] = len(obj.data.loop_triangles)
for kind, budget in [('Tree', 5000), ('Banyan', 12000)]:
    full = sum(counts['Kit_' + kind + '_Full_' + role] for role in ['Wood', 'Crown'])
    distant = sum(counts['Kit_' + kind + '_Distant_' + role] for role in ['Wood', 'Crown'])
    assert full < budget and distant < full * .3
scene.render.bake.target = choice(scene.render.bake.bl_rna.properties, 'target', 'VERTEX_COLORS')
scene.render.bake.use_selected_to_active = False
scene.cycles.samples = 16
bake_material = bpy.data.materials.new('Botanical Contact Bake')
bake_material.use_nodes = True
nodes, links = bake_material.node_tree.nodes, bake_material.node_tree.links
nodes.clear()
output, emission, occlusion = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion')
occlusion.inputs['Distance'].default_value = 1.2
occlusion.samples = 16
links.new(occlusion.outputs['Color'], emission.inputs['Color'])
links.new(emission.outputs[0], output.inputs['Surface'])
scene['status'] = 'baking-unverified'
for obj in trees:
    obj.hide_render = False
for obj in trees:
    finishes = list(obj.data.materials)
    obj.data.materials.clear()
    obj.data.materials.append(bake_material)
    for other in scene.objects:
        other.select_set(other == obj)
    bpy.context.view_layer.objects.active = obj
    bpy.context.view_layer.update()
    try:
        kind = choice(bpy.ops.object.bake.get_rna_type().properties, 'type', 'EMIT')
        assert 'FINISHED' in bpy.ops.object.bake(type=kind)
        tint = obj['kitTint']
        for entry in obj.data.color_attributes.active_color.data:
            shade = .58 + .42 * max(0, min(1, entry.color[0]))
            entry.color = (tint[0] * shade, tint[1] * shade, tint[2] * shade, 1)
    finally:
        obj.data.materials.clear()
        for finish in finishes:
            obj.data.materials.append(finish)
for obj in trees:
    obj.hide_render = 'Distant' in obj['kitPart']
scene.render.filepath = ROOT + '/assets/world-candidates/trees-after.png'
assert 'FINISHED' in bpy.ops.render.render(write_still=True)
for obj in scene.objects:
    obj.select_set(obj in trees)
properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=ROOT + '/assets/world-candidates/trees.raw.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False, export_vertex_color=choice(properties, 'export_vertex_color', 'NAME'), export_vertex_color_name='KitRenderColor', export_all_vertex_colors=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
scene['status'] = 'exported-awaiting-runtime-review'
scene['geometryCounts'] = json.dumps(counts)
print('BOTANICAL_EXPORTED', counts)
