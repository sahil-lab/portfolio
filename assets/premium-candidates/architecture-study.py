import bpy
import bmesh
import math
import json
from mathutils import Vector


def enum_value(owner, field, preferred):
    return next(item.identifier for item in owner.bl_rna.properties[field].enum_items if item.identifier == preferred)


def shape_bounds(mesh):
    return [min(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)], [max(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]


def fit_bounds(mesh, minimum, maximum):
    current_minimum, current_maximum = shape_bounds(mesh)
    for vertex in mesh.vertices:
        for axis in range(3):
            span = current_maximum[axis] - current_minimum[axis]
            vertex.co[axis] = minimum[axis] + (vertex.co[axis] - current_minimum[axis]) * (maximum[axis] - minimum[axis]) / max(span, .000001)
    mesh.update()


def make_architecture_study(source_file):
    if bpy.data.scenes.get('Premium Architecture Candidate'):
        raise RuntimeError('Candidate scene already exists; inspect it before rebuilding.')
    scene = bpy.data.scenes.new('Premium Architecture Candidate')
    bpy.context.window.scene = scene
    bpy.ops.import_scene.gltf(filepath=source_file, import_pack_images=True, import_select_created_objects=True)
    parts = [obj for obj in scene.objects if obj.type == 'MESH' and obj.get('architecturePart')]
    if len(parts) != 14:
        raise RuntimeError('The architecture import did not contain all 14 verified parts.')
    sphere = next(obj for obj in parts if obj.get('architecturePart') == 'Architecture_Sphere')
    detail = sphere.copy()
    detail.data = sphere.data.copy()
    detail.name = 'Architecture_DetailSphere'
    detail['architecturePart'] = 'Architecture_DetailSphere'
    scene.collection.objects.link(detail)
    parts.append(detail)
    edge_mode = next(item.identifier for item in bpy.ops.mesh.bevel.get_rna_type().properties['affect'].enum_items if item.identifier == 'EDGES')
    weighted_type = enum_value(bpy.types.Modifier, 'type', 'WEIGHTED_NORMAL')
    report = []
    for obj in parts:
        original_minimum, original_maximum = shape_bounds(obj.data)
        source_name = obj.get('architecturePart')
        if source_name == 'Architecture_Block':
            shape = bmesh.new()
            bmesh.ops.create_cube(shape, size=2)
            bmesh.ops.bevel(shape, geom=list(shape.edges), offset=.12, segments=3, affect=edge_mode, clamp_overlap=True)
            shape.to_mesh(obj.data)
            shape.free()
        elif source_name in ('Architecture_Dome', 'Architecture_DetailSphere'):
            shape = bmesh.new()
            bmesh.ops.create_uvsphere(shape, u_segments=32 if source_name == 'Architecture_Dome' else 24, v_segments=16 if source_name == 'Architecture_Dome' else 12, radius=1)
            if source_name == 'Architecture_Dome':
                for vertex in [vertex for vertex in shape.verts if vertex.co.z < -.000001]:
                    shape.verts.remove(vertex)
            shape.to_mesh(obj.data)
            shape.free()
        if source_name == 'Architecture_Dome':
            minimum, maximum = shape_bounds(obj.data)
            height = max(maximum[2] - minimum[2], .000001)
            for vertex in obj.data.vertices:
                fraction = max(0, min(1, (vertex.co.z - minimum[2]) / height))
                vertex.co.z = minimum[2] + fraction ** .9 * height
        fit_bounds(obj.data, original_minimum, original_maximum)
        remodeled = source_name in ('Architecture_Block', 'Architecture_Dome', 'Architecture_DetailSphere')
        if remodeled and hasattr(obj.data, 'normals_split_custom_set'):
            obj.data.normals_split_custom_set([(0, 0, 0)] * len(obj.data.loops))
        if remodeled:
            for polygon in obj.data.polygons:
                polygon.use_smooth = abs(polygon.normal.z) < .9 if 'Cylinder' in source_name else True
            if source_name not in ('Architecture_Sphere', 'Architecture_DetailSphere'):
                modifier = obj.modifiers.new('Crafted surface normals', weighted_type)
                modifier.keep_sharp = True
                modifier.weight = 50
        obj['premiumCandidate'] = 'rounded-architecture-v1'
        obj['normalPolicy'] = 'preserve-authored'
        obj['originalBounds'] = json.dumps([original_minimum, original_maximum])
        if obj.data.color_attributes:
            for attribute in list(obj.data.color_attributes):
                obj.data.color_attributes.remove(attribute)
        data_types = bpy.types.AttributeGroupMesh.bl_rna.functions['new'].parameters['type'].enum_items
        domains = bpy.types.AttributeGroupMesh.bl_rna.functions['new'].parameters['domain'].enum_items
        colors = obj.data.color_attributes.new(name='Architecture_Color', type=next(item.identifier for item in data_types if item.identifier == 'FLOAT_COLOR'), domain=next(item.identifier for item in domains if item.identifier == 'CORNER'))
        tint = obj.get('bakedTint', [1, 1, 1, 1])
        for item in colors.data:
            item.color = (tint[0], tint[1], tint[2], 1)
        obj.data.color_attributes.active_color = colors
        for index, material in enumerate(obj.data.materials):
            material = material.copy()
            obj.data.materials[index] = material
            for node in material.node_tree.nodes:
                if node.type == 'VERTEX_COLOR':
                    node.layer_name = colors.name
        obj.data.update()
        obj.data.calc_loop_triangles()
        minimum, maximum = shape_bounds(obj.data)
        error = max(abs(minimum[axis] - original_minimum[axis]) for axis in range(3))
        error = max(error, max(abs(maximum[axis] - original_maximum[axis]) for axis in range(3)))
        if error > .00001:
            raise RuntimeError('Candidate changed the placement bounds: ' + source_name)
        report.append({'name': source_name, 'triangles': len(obj.data.loop_triangles), 'boundsError': error})
    scene['candidateStatus'] = 'modeled-unpublished'
    scene['candidateReport'] = json.dumps(report)
    return scene, parts, report


def bake_and_export_study(scene, parts, filepath):
    previous = bpy.context.window.scene
    bpy.context.window.scene = scene
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        bpy.context.window.scene = previous
        raise
    scene.cycles.samples = 16
    scene.render.bake.target = enum_value(scene.render.bake, 'target', 'VERTEX_COLORS')
    bake = bpy.data.materials.new('Candidate Local Occlusion')
    bake.use_nodes = True
    nodes, links = bake.node_tree.nodes, bake.node_tree.links
    nodes.clear()
    output, emission, occlusion = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion')
    occlusion.only_local = True
    occlusion.inputs['Distance'].default_value = .4
    occlusion.samples = 16
    links.new(occlusion.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'EMIT')
    scene['candidateStatus'] = 'baking-unverified'
    try:
        for obj in parts:
            materials = list(obj.data.materials)
            obj.data.materials.clear()
            obj.data.materials.append(bake)
            for other in scene.objects:
                other.select_set(other == obj)
            bpy.context.view_layer.objects.active = obj
            bpy.context.view_layer.update()
            try:
                bpy.ops.object.bake(type=bake_type)
                tint = obj.get('bakedTint', [1, 1, 1, 1])
                for item in obj.data.color_attributes.active_color.data:
                    shade = .65 + .35 * max(0, min(1, item.color[0]))
                    item.color = (tint[0] * shade, tint[1] * shade, tint[2] * shade, 1)
            finally:
                obj.data.materials.clear()
                for material in materials:
                    obj.data.materials.append(material)
        for obj in scene.objects:
            obj.select_set(obj in parts)
        options = bpy.ops.export_scene.gltf.get_rna_type().properties
        colors = next(item.identifier for item in options['export_vertex_color'].enum_items if item.identifier == 'NAME')
        formats = options['export_format']
        format_id = next((item.identifier for item in formats.enum_items if item.identifier == 'GLB'), formats.default)
        settings = dict(filepath=filepath, use_selection=True, use_active_scene=True, export_apply=True, export_extras=True, export_vertex_color=colors, export_vertex_color_name='Architecture_Color', export_all_vertex_colors=False)
        scene['candidateStatus'] = 'exporting-unverified'
        try:
            result = bpy.ops.export_scene.gltf(export_format=format_id, **settings)
        except TypeError as error:
            if format_id or "'GLB'" not in str(error):
                raise
            result = bpy.ops.export_scene.gltf(export_format='GLB', **settings)
        if 'FINISHED' not in result:
            raise RuntimeError('Candidate export did not finish: ' + str(result))
        scene['candidateStatus'] = 'exported-awaiting-roundtrip'
    except Exception:
        scene['candidateStatus'] = 'failed-unverified'
        raise
    finally:
        bpy.context.window.scene = previous

