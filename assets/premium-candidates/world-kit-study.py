import bpy
import bmesh
import math
import json


def fit_original_bounds(mesh, minimum, maximum):
    current_minimum = [min(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]
    current_maximum = [max(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]
    for vertex in mesh.vertices:
        for axis in range(3):
            vertex.co[axis] = minimum[axis] + (vertex.co[axis] - current_minimum[axis]) * (maximum[axis] - minimum[axis]) / max(current_maximum[axis] - current_minimum[axis], .000001)
    mesh.update()


def make_world_kit_study(source_file):
    if bpy.data.scenes.get('Premium Character Foliage Candidate'):
        raise RuntimeError('Candidate scene already exists; inspect before rebuilding.')
    scene = bpy.data.scenes.new('Premium Character Foliage Candidate')
    bpy.context.window.scene = scene
    result = bpy.ops.import_scene.gltf(filepath=source_file, import_pack_images=True)
    if 'FINISHED' not in result:
        raise RuntimeError('World kit import did not finish.')
    parts = [obj for obj in scene.objects if obj.type == 'MESH' and str(obj.get('kitPart', '')).startswith('Kit_')]
    if len(parts) != 21:
        raise RuntimeError('World kit is incomplete.')
    color_type = next(item.identifier for item in bpy.types.AttributeGroupMesh.bl_rna.functions['new'].parameters['type'].enum_items if item.identifier == 'FLOAT_COLOR')
    color_domain = next(item.identifier for item in bpy.types.AttributeGroupMesh.bl_rna.functions['new'].parameters['domain'].enum_items if item.identifier == 'CORNER')
    report = []
    for obj in parts:
        name = obj['kitPart']
        minimum = [min(vertex.co[axis] for vertex in obj.data.vertices) for axis in range(3)]
        maximum = [max(vertex.co[axis] for vertex in obj.data.vertices) for axis in range(3)]
        character = name in ('Kit_CourierHead', 'Kit_CourierBody', 'Kit_ResidentHead', 'Kit_ResidentBody', 'Kit_Hand', 'Kit_Boot')
        if character or name in ('Kit_Blossom', 'Kit_Shrub', 'Kit_CanopyLobe_Full'):
            shape = bmesh.new()
            bmesh.ops.create_uvsphere(shape, u_segments=24 if character else 20, v_segments=14 if character else 6, radius=1)
            for vertex in shape.verts:
                horizontal, forward, height = vertex.co
                if 'Head' in name:
                    power = .87
                    horizontal = math.copysign(abs(horizontal) ** power, horizontal)
                    forward = math.copysign(abs(forward) ** power, forward)
                    height = math.copysign(abs(height) ** power, height)
                    cheek = 1 + .1 * math.exp(-((height + .3) / .35) ** 2)
                    horizontal *= cheek
                elif 'Body' in name:
                    horizontal *= 1 - height * .24
                    forward *= 1 - height * .18
                elif name == 'Kit_Hand':
                    horizontal *= .95 + .09 * math.cos(height * math.pi / 2)
                    forward *= .92
                elif name == 'Kit_Boot':
                    height = max(-.7, height)
                    forward *= 1.08 - height * .15
                elif name == 'Kit_Blossom':
                    angle = math.atan2(forward, horizontal)
                    petal = .78 + .22 * math.cos(angle * 5)
                    horizontal *= petal
                    forward *= petal
                    height *= .7 + .3 * abs(math.cos(angle * 5))
                else:
                    angle = math.atan2(forward, horizontal)
                    organic = 1 + .075 * math.sin(angle * 3 + height * 2)
                    horizontal *= organic
                    forward *= organic
                vertex.co = (horizontal, forward, height)
            bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
            shape.to_mesh(obj.data)
            shape.free()
            fit_original_bounds(obj.data, minimum, maximum)
            for attribute in list(obj.data.color_attributes):
                obj.data.color_attributes.remove(attribute)
            colors = obj.data.color_attributes.new(name='KitRenderColor', type=color_type, domain=color_domain)
            tint = obj['kitTint']
            for item in colors.data:
                item.color = (tint[0], tint[1], tint[2], 1)
            obj.data.color_attributes.active_color = colors
        else:
            colors = obj.data.color_attributes.active_color
            if colors:
                colors.name = 'KitRenderColor'
        if (character or name in ('Kit_Blossom', 'Kit_Shrub', 'Kit_CanopyLobe_Full')) and hasattr(obj.data, 'normals_split_custom_set'):
            obj.data.normals_split_custom_set([(0, 0, 0)] * len(obj.data.loops))
        for polygon in obj.data.polygons:
            polygon.use_smooth = not any(token in name for token in ('Paver', 'Kerb'))
        for index, material in enumerate(obj.data.materials):
            material = material.copy()
            obj.data.materials[index] = material
            for node in material.node_tree.nodes:
                if node.type == 'VERTEX_COLOR':
                    node.layer_name = 'KitRenderColor'
        obj['premiumCandidate'] = 'soft-character-foliage-v1'
        obj['originalBounds'] = json.dumps([minimum, maximum])
        obj.data.update()
        obj.data.calc_loop_triangles()
        report.append({'name': name, 'triangles': len(obj.data.loop_triangles), 'remodeled': character or name in ('Kit_Blossom', 'Kit_Shrub', 'Kit_CanopyLobe_Full')})
    scene['candidateStatus'] = 'modeled-awaiting-bake'
    scene['candidateReport'] = json.dumps(report)
    return scene, parts


def bake_world_kit_study(scene, parts, filepath):
    previous = bpy.context.window.scene
    bpy.context.window.scene = scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16
    scene.render.bake.target = next(item.identifier for item in scene.render.bake.bl_rna.properties['target'].enum_items if item.identifier == 'VERTEX_COLORS')
    material = bpy.data.materials.new('Premium Kit Contact Occlusion')
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output, emission, occlusion = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion')
    occlusion.only_local = False
    occlusion.inputs['Distance'].default_value = .6
    occlusion.samples = 16
    links.new(occlusion.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    kind = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'EMIT')
    scene['candidateStatus'] = 'baking-unverified'
    try:
        for obj in parts:
            if obj['kitPart'] not in ('Kit_CourierHead', 'Kit_CourierBody', 'Kit_ResidentHead', 'Kit_ResidentBody', 'Kit_Hand', 'Kit_Boot', 'Kit_Blossom', 'Kit_Shrub', 'Kit_CanopyLobe_Full'):
                continue
            obj.update_tag()
            bpy.context.view_layer.update()
            center = obj.matrix_world.translation.copy()
            floor = min((obj.matrix_world @ vertex.co).z for vertex in obj.data.vertices) - .03
            mesh = bpy.data.meshes.new('Candidate Bake Ground')
            mesh.from_pydata([(center.x - 4, center.y - 4, floor), (center.x + 4, center.y - 4, floor), (center.x + 4, center.y + 4, floor), (center.x - 4, center.y + 4, floor)], [], [(0, 1, 2, 3)])
            ground = bpy.data.objects.new('Candidate Bake Ground', mesh)
            scene.collection.objects.link(ground)
            finishes = list(obj.data.materials)
            obj.data.materials.clear()
            obj.data.materials.append(material)
            for other in scene.objects:
                other.select_set(other == obj)
            bpy.context.view_layer.objects.active = obj
            bpy.context.view_layer.update()
            try:
                result = bpy.ops.object.bake(type=kind)
                if 'FINISHED' not in result:
                    raise RuntimeError('Kit bake failed: ' + obj['kitPart'])
                tint = obj['kitTint']
                for item in obj.data.color_attributes.active_color.data:
                    shade = .65 + .35 * max(0, min(1, item.color[0]))
                    item.color = (tint[0] * shade, tint[1] * shade, tint[2] * shade, 1)
            finally:
                obj.data.materials.clear()
                for finish in finishes:
                    obj.data.materials.append(finish)
                bpy.data.objects.remove(ground, do_unlink=True)
                bpy.data.meshes.remove(mesh)
        for obj in scene.objects:
            obj.select_set(obj in parts)
        options = bpy.ops.export_scene.gltf.get_rna_type().properties
        mode = next(item.identifier for item in options['export_vertex_color'].enum_items if item.identifier == 'NAME')
        result = bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', use_selection=True, use_active_scene=True, export_apply=True, export_extras=True, export_vertex_color=mode, export_vertex_color_name='KitRenderColor', export_all_vertex_colors=False)
        if 'FINISHED' not in result:
            raise RuntimeError('Kit export did not finish.')
        scene['candidateStatus'] = 'exported-awaiting-roundtrip'
    except Exception:
        scene['candidateStatus'] = 'failed-unverified'
        raise
    finally:
        bpy.context.window.scene = previous

