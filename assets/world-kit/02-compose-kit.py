import bpy
import math
from mathutils import Vector

studio = bpy.data.scenes['Kingdom Shared Asset Studio']
bpy.context.window.scene = studio
collection = bpy.data.collections['Kingdom Shared Assets']
asset = bpy.data.objects['Kingdom_WorldKit_Asset']
if asset.get('stage') != 'modeled':
    raise RuntimeError('Compose only the newly modeled kit.')


def game_point(horizontal_value, height_value, forward_value):
    return Vector((horizontal_value, -forward_value, height_value))


def branch_geometry(control_points, radius, ring_count, side_count):
    positions, faces = [], []
    control = [game_point(*point) for point in control_points]
    for ring in range(ring_count + 1):
        progress = ring / ring_count
        branch_center = sum((control[index] * ((1 - progress) ** (3 - index) * progress ** index * (3 if index in (1, 2) else 1)) for index in range(4)), Vector())
        tangent = ((control[1] - control[0]) * 3 * (1 - progress) ** 2 + (control[2] - control[1]) * 6 * (1 - progress) * progress + (control[3] - control[2]) * 3 * progress ** 2).normalized()
        across = tangent.cross(Vector((0, 1, 0))).normalized()
        if across.length < 0.1:
            across = tangent.cross(Vector((1, 0, 0))).normalized()
        along = tangent.cross(across).normalized()
        for ring_side in range(side_count):
            azimuth = ring_side / side_count * math.tau
            positions.append(tuple(branch_center + (across * math.cos(azimuth) + along * math.sin(azimuth)) * radius * (1 - progress * 0.8)))
            if ring < ring_count:
                current = ring * side_count + ring_side
                following = ring * side_count + (ring_side + 1) % side_count
                faces.append((current, following, following + side_count, current + side_count))
    faces.extend([tuple(reversed(range(side_count))), tuple(ring_count * side_count + ring_side for ring_side in range(side_count))])
    return positions, faces


def combined(name, mesh_parts, material, location):
    vertices, faces = [], []
    for part_vertices, polygons in mesh_parts:
        offset = len(vertices)
        vertices.extend(part_vertices)
        faces.extend(tuple(offset + vertex for vertex in face) for face in polygons)
    geometry = bpy.data.meshes.new(name + '_Mesh')
    geometry.from_pydata(vertices, [], faces)
    geometry.update()
    for polygon in geometry.polygons:
        polygon.use_smooth = True
    result = bpy.data.objects.new(name, geometry)
    collection.objects.link(result)
    result.parent = asset
    result.location = game_point(*location)
    geometry.materials.append(material)
    result['kitPart'] = name
    return result


tips = [(-4.8, 6.4, 1.2), (-3.5, 8.2, -1.6), (-1.5, 9.5, 0.4), (2, 8.8, -1.9), (4.4, 7.8, 0.6), (3.3, 6.1, 2.4), (0.2, 7.6, 3)]
for tree_kind in ['Tree', 'Banyan']:
    banyan = tree_kind == 'Banyan'
    endpoints = [(horizontal * 1.48, height * 0.9 + 0.5, forward * 1.7) for horizontal, height, forward in tips] + [(0, 7.6, -6), (-3.6, 6.8, -4.9), (5.4, 7.1, -4.1)] if banyan else tips
    for detail in ['Full', 'Distant']:
        detailed = detail == 'Full'
        rings, sides, clumps = (10, 7, 6) if detailed else (5, 5, 4)
        wood = [branch_geometry([(0, -0.2, 0), (0.35, 2.2, 0.15), (-0.25, 4.5, 0), (0.2, 7, 0.2)], 0.74 if banyan else 0.39, rings, sides)]
        leaves = []
        prototype = bpy.data.objects['Kit_CanopyLobe_' + detail].data
        for branch_index, (horizontal, height, forward) in enumerate(endpoints):
            wood.append(branch_geometry([(-0.12, 3.4 + branch_index % 3 * 0.5, 0.12), (horizontal * 0.32, height * 0.74, forward * 0.25), (horizontal * 0.7, height - 0.45, forward * 0.8), (horizontal, height, forward)], 0.27 if banyan else 0.17, rings, sides))
            for leaf_index in range(clumps):
                angle = leaf_index * 2.3999632297 + branch_index
                spread = math.sqrt((leaf_index + 0.5) / clumps)
                center = game_point(horizontal + math.cos(angle) * spread * 1.8, height - spread * 0.35, forward + math.sin(angle) * spread * 1.3)
                size = (1.55 if detailed else 1.8) + leaf_index % 3 * 0.15
                points = []
                for vertex in prototype.vertices:
                    local = vertex.co.copy()
                    local.x *= size
                    local.y *= size
                    local.z = (local.z - 0.5) * size + 0.3
                    points.append(tuple(local + center))
                leaves.append((points, [tuple(polygon.vertices) for polygon in prototype.polygons]))
            if banyan:
                support = max(0.72, 2.25 / math.hypot(horizontal, forward))
                root_x, root_z, root_height = horizontal * support, forward * support, height - 0.65
                wood.append(branch_geometry([(root_x, -0.35, root_z), (root_x + 0.17, 1.5, root_z - 0.12), (root_x - 0.12, root_height * 0.65, root_z + 0.1), (root_x, root_height, root_z)], 0.22, rings, sides))
                wood.append(branch_geometry([(root_x * 0.22, -0.25, root_z * 0.22), (root_x * 0.16, 0.3, root_z * 0.16), (root_x * 0.1, 0.8, root_z * 0.1), (0, 1.9, 0)], 0.24, 6 if detailed else 3, sides))
                if detailed:
                    for strand in range(3):
                        start_x, start_z = horizontal * 0.89 + strand * 0.27, forward * 0.9
                        wood.append(branch_geometry([(start_x, height - 0.18, start_z), (start_x + 0.12, height - 1.2, start_z + 0.06), (start_x + 0.05, height * 0.55, start_z + 0.14), (start_x - 0.1, 1.8 + strand * 0.75, start_z + 0.2)], 0.04, 6, 4))
        origin = (-11 if not banyan else 9, 0, -8 if detailed else -28)
        for role, parts, finish in [('Wood', wood, 'Kit Warm Bark'), ('Crown', leaves, 'Kit Moss Foliage')]:
            combined('Kit_' + tree_kind + '_' + detail + '_' + role, parts, bpy.data.materials[finish], origin)

preview = bpy.data.collections.new('Shared Kit Courtyard Preview')
studio.collection.children.link(preview)


def preview_part(source_name, name, location, scale, finish_name=None):
    prototype_source = bpy.data.objects[source_name]
    result = bpy.data.objects.new(name, prototype_source.data)
    preview.objects.link(result)
    result.location = game_point(*location)
    result.scale = (scale[0], scale[2], scale[1])
    if finish_name:
        result.data = prototype_source.data.copy()
        result.data.materials.clear()
        result.data.materials.append(bpy.data.materials[finish_name])
    return result


for row in range(8):
    for column in range(14):
        preview_part('Kit_StonePaver', 'Courtyard_Paver', (-6.7 + column + (0.5 if row % 2 else 0), -0.08, 2 + row * 0.5), (0.97, 1, 0.96))
for column in range(14):
    preview_part('Kit_Kerb', 'Courtyard_Kerb', (-6.7 + column, 0, 1.6), (0.98, 1, 1))
for center_x in [-3, 1, 4]:
    preview_part('Kit_ResidentBody', 'Preview_ResidentBody', (center_x, 0.82, 4), (0.4, 0.55, 0.28))
    preview_part('Kit_ResidentHead', 'Preview_ResidentHead', (center_x, 1.58, 4), (0.43, 0.42, 0.37))
    for side in [-1, 1]:
        preview_part('Kit_Hand', 'Preview_ResidentHand', (center_x + side * 0.43, 0.6, 4), (0.11, 0.16, 0.13))
        preview_part('Kit_Boot', 'Preview_ResidentBoot', (center_x + side * 0.2, 0.15, 4.1), (0.18, 0.18, 0.28))
        preview_part('Kit_CourierHead', 'Preview_ResidentEye', (center_x + side * 0.14, 1.62, 4.35), (0.04, 0.065, 0.025), 'Kit Warm Bark')

for source in list(collection.objects):
    if source.name.startswith('Kit_') and not source.name.startswith(('Kit_Tree_', 'Kit_Banyan_')):
        source.location.y -= 32
studio.camera.location = (23, -39, 23)
studio.camera.rotation_euler = (Vector((0, 1, 4)) - studio.camera.location).to_track_quat('-Z', 'Y').to_euler()
studio.camera.data.ortho_scale = 34
asset['stage'] = 'composed'
bpy.context.view_layer.update()
for source in collection.objects:
    if source.type == 'MESH':
        source.data.calc_loop_triangles()
        print(source.name, len(source.data.loop_triangles))
