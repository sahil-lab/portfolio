import bpy
import bmesh
import math
import re
from mathutils import Matrix, Vector

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
PARTS = ['ButterflyBody', 'ButterflyWing', 'BirdBody', 'BirdWing', 'BirdTail', 'FireflyBody', 'ViolinBody', 'ViolinNeck', 'Bow', 'UnicycleWheel', 'Saddle', 'Easel', 'CanvasFrame', 'Palette', 'Brush', 'Ball']
NAME = 'Street Life Craft'


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def outlined(points, depth=.09, vertical=False):
    vertices = [(horizontal, offset if vertical else forward, forward if vertical else offset) for offset in [-depth / 2, depth / 2] for horizontal, forward in points]
    count = len(points)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces.extend((index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count))
    geometry = bpy.data.meshes.new('Life Outline')
    geometry.from_pydata(vertices, [], faces)
    shape = bmesh.new()
    shape.from_mesh(geometry)
    bpy.data.meshes.remove(geometry)
    return shape


def box_part(shape, center, dimensions, angle=0, axis='Y'):
    result = bmesh.ops.create_cube(shape, size=1)
    bmesh.ops.scale(shape, vec=Vector(dimensions), verts=result['verts'])
    if angle:
        bmesh.ops.transform(shape, matrix=Matrix.Rotation(angle, 4, axis), verts=result['verts'])
    bmesh.ops.translate(shape, vec=Vector(center), verts=result['verts'])


def build(part, index, scene, finish):
    shape = bmesh.new()
    if part in ['ButterflyBody', 'BirdBody', 'FireflyBody', 'Ball', 'Saddle']:
        bmesh.ops.create_uvsphere(shape, u_segments=20 if part == 'BirdBody' else 16, v_segments=10 if part == 'BirdBody' else 8, radius=.5)
        for vertex in shape.verts:
            if part == 'BirdBody':
                vertex.co.x *= .82 + .24 * (vertex.co.y + .5)
                vertex.co.z += .08 * math.sin((vertex.co.y + .5) * math.pi)
            elif part == 'Saddle':
                vertex.co.x *= .65 + .35 * math.cos(vertex.co.y * math.pi)
                vertex.co.z += .06 * math.cos(vertex.co.y * math.pi)
    elif part in ['ButterflyWing', 'BirdWing', 'BirdTail', 'Palette', 'ViolinBody']:
        shape.free()
        if part == 'ButterflyWing':
            points = [(-.45, -.07), (-.35, .28), (-.07, .5), (.24, .47), (.45, .26), (.36, .06), (.12, -.04), (.36, -.18), (.28, -.39), (.04, -.5), (-.2, -.37), (-.35, -.16)]
        elif part == 'BirdWing':
            points = [(-.5, -.3), (-.36, .17), (-.06, .39), (.34, .5), (.5, .35), (.35, .22), (.43, .09), (.24, .03), (.29, -.11), (.08, -.2), (-.2, -.42)]
        elif part == 'BirdTail':
            points = [(-.2, .5), (.2, .5), (.45, -.44), (.16, -.35), (0, -.5), (-.16, -.35), (-.45, -.44)]
        elif part == 'Palette':
            points = [(-.5, -.12), (-.38, .27), (-.12, .47), (.2, .48), (.45, .28), (.4, .1), (.15, .15), (.16, -.03), (.45, -.19), (.24, -.43), (-.12, -.47), (-.4, -.33)]
        else:
            points = [(-.1, -.5), (-.32, -.45), (-.43, -.26), (-.32, -.06), (-.19, .02), (-.3, .19), (-.25, .38), (-.1, .5), (.1, .5), (.25, .38), (.3, .19), (.19, .02), (.32, -.06), (.43, -.26), (.32, -.45), (.1, -.5)]
        shape = outlined(points, .14 if part == 'ViolinBody' else .08, part == 'ViolinBody')
        bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.018, segments=2, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
    elif part == 'UnicycleWheel':
        shape.free()
        vertices, faces = [], []
        for around in range(32):
            angle = around * math.tau / 32
            for cross in range(8):
                tube = cross * math.tau / 8
                radius = .42 + .08 * math.cos(tube)
                vertices.append((radius * math.cos(angle), .08 * math.sin(tube), radius * math.sin(angle)))
                corner = around * 8 + cross
                faces.append((corner, around * 8 + (cross + 1) % 8, ((around + 1) % 32) * 8 + (cross + 1) % 8, ((around + 1) % 32) * 8 + cross))
        geometry = bpy.data.meshes.new('Rounded Rubber Tyre')
        geometry.from_pydata(vertices, [], faces)
        shape = bmesh.new()
        shape.from_mesh(geometry)
        bpy.data.meshes.remove(geometry)
    elif part == 'Easel':
        for side in [-1, 1]:
            box_part(shape, (side * .24, 0, 0), (.075, .075, 1), side * .22)
        box_part(shape, (0, .19, 0), (.07, .07, 1), -.38, 'X')
        box_part(shape, (0, -.05, -.1), (.9, .2, .09))
        box_part(shape, (0, 0, .39), (.38, .1, .08))
    elif part == 'CanvasFrame':
        for side in [-1, 1]:
            box_part(shape, (side * .455, 0, 0), (.09, .15, 1))
            box_part(shape, (0, 0, side * .455), (.85, .15, .09))
    elif part == 'Bow':
        for side in [-1, 1]:
            box_part(shape, (side * .13, 0, 0), (.025, .03, 1))
        for end in [-1, 1]:
            box_part(shape, (0, 0, end * .48), (.28, .07, .045))
    elif part == 'ViolinNeck':
        box_part(shape, (0, 0, -.02), (.16, .13, .92))
        bmesh.ops.create_uvsphere(shape, u_segments=12, v_segments=6, radius=.16, matrix=Matrix.Translation((0, 0, .4)))
    else:
        bmesh.ops.create_cone(shape, cap_ends=True, cap_tris=False, segments=12, radius1=.09, radius2=.035, depth=1)
    if part in ['Easel', 'CanvasFrame', 'Bow', 'ViolinNeck']:
        bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.012, segments=2, affect=choice(bpy.ops.mesh.bevel.get_rna_type().properties, 'affect', 'EDGES'))
    bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
    if shape.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
    geometry = bpy.data.meshes.new('Life_' + part)
    shape.to_mesh(geometry)
    shape.free()
    lower = [min(vertex.co[axis] for vertex in geometry.vertices) for axis in range(3)]
    upper = [max(vertex.co[axis] for vertex in geometry.vertices) for axis in range(3)]
    for vertex in geometry.vertices:
        for axis in range(3):
            vertex.co[axis] = (vertex.co[axis] - lower[axis]) / (upper[axis] - lower[axis]) - .5
    uv = geometry.uv_layers.new(name='LifeUV')
    for polygon in geometry.polygons:
        polygon.use_smooth = part in ['BirdBody', 'ButterflyBody', 'FireflyBody', 'Ball', 'Saddle', 'UnicycleWheel']
        components = [abs(value) for value in polygon.normal]
        axis = components.index(max(components))
        horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
        for loop in polygon.loop_indices:
            point = geometry.vertices[geometry.loops[loop].vertex_index].co
            uv.data[loop].uv = (point[horizontal] + .5, point[vertical] + .5)
    options = geometry.color_attributes.bl_rna.functions['new'].parameters
    colors = geometry.color_attributes.new(name='LifeColor', type=choice(options, 'type', 'FLOAT_COLOR'), domain=choice(options, 'domain', 'CORNER'))
    geometry.color_attributes.active_color = colors
    for entry in colors.data:
        entry.color = (1, 1, 1, 1)
    obj = bpy.data.objects.new('Life_' + part, geometry)
    scene.collection.objects.link(obj)
    obj.location = ((index % 4) * 3, (index // 4) * 3, 0)
    obj['lifePart'], obj['lifeVersion'] = part, 1
    geometry.materials.append(finish)
    obj.hide_render = True
    geometry.update()
    return obj


def build_library():
    assert bpy.data.scenes.get(NAME) is None
    scene = bpy.data.scenes.new(NAME)
    bpy.context.window.scene = scene
    finish = bpy.data.materials.new('Life Baked Vertex Finish')
    finish.use_nodes = True
    shader = next(node for node in finish.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = .68
    color = finish.node_tree.nodes.new('ShaderNodeVertexColor')
    color.layer_name = 'LifeColor'
    finish.node_tree.links.new(color.outputs['Color'], shader.inputs['Base Color'])
    parts = [build(part, index, scene, finish) for index, part in enumerate(PARTS)]
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        raise RuntimeError('Cycles is required for the life kit')
    scene.cycles.samples = 16
    scene.render.bake.target = choice(scene.render.bake.bl_rna.properties, 'target', 'VERTEX_COLORS')
    scene.render.bake.use_selected_to_active = False
    bake = bpy.data.materials.new('Life Contact Bake')
    bake.use_nodes = True
    nodes, links = bake.node_tree.nodes, bake.node_tree.links
    nodes.clear()
    output, emission, occlusion = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion')
    occlusion.inputs['Distance'].default_value = .6
    occlusion.samples = 16
    links.new(occlusion.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    for obj in parts:
        obj.hide_render = False
        obj.data.materials.clear()
        obj.data.materials.append(bake)
        for other in scene.objects:
            other.select_set(other == obj)
        bpy.context.view_layer.objects.active = obj
        bpy.context.view_layer.update()
        assert 'FINISHED' in bpy.ops.object.bake(type=choice(bpy.ops.object.bake.get_rna_type().properties, 'type', 'EMIT'))
        for entry in obj.data.color_attributes.active_color.data:
            shade = .6 + .4 * max(0, min(1, entry.color[0]))
            entry.color = (shade, shade, shade, 1)
        obj.data.materials.clear()
        obj.data.materials.append(finish)
        obj.hide_render = True
    for obj in parts:
        obj.select_set(True)
    properties = bpy.ops.export_scene.gltf.get_rna_type().properties
    options = dict(filepath=ROOT + '/assets/street-life/life-kit.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False, export_vertex_color=choice(properties, 'export_vertex_color', 'NAME'), export_vertex_color_name='LifeColor', export_all_vertex_colors=False)
    try:
        bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
    except TypeError as error:
        match = re.search(r'not found in (\([^)]*\))', str(error))
        if not match:
            raise
        formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
        bpy.ops.export_scene.gltf(export_format=next(value for value in formats if value == 'GLB'), **options)
    scene['status'] = 'life-kit-baked-exported-awaiting-review'
    print('LIFE_KIT_EXPORTED', len(parts))


if __name__ == '__main__':
    build_library()
