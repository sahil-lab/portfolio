import bpy
import json
import math
from mathutils import Matrix, Vector


def enum_value(owner, field, preferred):
    return next(item.identifier for item in owner.bl_rna.properties[field].enum_items if item.identifier == preferred)


def export_web_glb(filepath, **settings):
    formats = bpy.ops.export_scene.gltf.get_rna_type().properties['export_format']
    identifier = next((item.identifier for item in formats.enum_items if item.identifier == 'GLB'), formats.default)
    try:
        return bpy.ops.export_scene.gltf(filepath=filepath, export_format=identifier, **settings)
    except TypeError as error:
        if identifier or "'GLB'" not in str(error):
            raise
        return bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', **settings)


def terrain_uv(mesh):
    layer = mesh.uv_layers.active if mesh.uv_layers else mesh.uv_layers.new(name='TerrainSurfaceUV')
    for polygon in mesh.polygons:
        values = []
        poles = []
        for loop_index in polygon.loop_indices:
            point = mesh.vertices[mesh.loops[loop_index].vertex_index].co.normalized()
            values.append([(math.atan2(point.y, point.x) / (2 * math.pi)) % 1, math.asin(max(-1, min(1, point.z))) / math.pi + .5])
            poles.append(abs(point.z) > .999999)
        longitudes = [value[0] for value, pole in zip(values, poles) if not pole]
        if longitudes and max(longitudes) - min(longitudes) > .5:
            for value in values:
                if value[0] < .5:
                    value[0] += 1
        longitudes = [value[0] for value, pole in zip(values, poles) if not pole]
        for value, pole in zip(values, poles):
            if pole and longitudes:
                value[0] = sum(longitudes) / len(longitudes)
        for loop_index, value in zip(polygon.loop_indices, values):
            layer.data[loop_index].uv = value
    layer.active_render = True
    mesh.update()


def occlusion_output(material, image):
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', bpy.types.ShaderNodeTree.bl_rna.identifier)
        directions = group.interface.bl_rna.functions['new_socket'].parameters['in_out'].enum_items
        group.interface.new_socket(name='Occlusion', in_out=next(item.identifier for item in directions if item.identifier == 'INPUT'), socket_type=bpy.types.NodeSocketFloat.bl_rna.identifier)
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    output = material.node_tree.nodes.new('ShaderNodeGroup')
    output.node_tree = group
    material.node_tree.links.new(texture.outputs['Color'], output.inputs['Occlusion'])


def bake_planet_finish(asset_directory, identifier, display_name, radius, center):
    master = bpy.data.scenes['Kingdom Complete Assembly']
    previous = bpy.context.window.scene
    scene = bpy.data.scenes.new('Web Finish ' + identifier)
    scene['bakeStatus'] = 'preparing'
    scene.world = master.world
    scene.render.engine = master.render.engine
    scene.cycles.samples = 16
    scene.render.bake.target = enum_value(scene.render.bake, 'target', 'IMAGE_TEXTURES')
    scene.render.bake.margin = 8
    source_objects = [obj for obj in master.objects if obj.get('completeExportZone') == 'planet-' + identifier]
    source_terrain = [obj for obj in source_objects if obj.name.startswith(display_name + '_Planet')]
    assert len(source_terrain) == 1, 'Terrain source is ambiguous: ' + identifier
    for obj in source_objects:
        if obj in source_terrain or any(token in obj.name for token in ('Resident', 'Shuttle', 'Speech', 'Bubble', 'Weather_Cloud', 'Balloon')):
            continue
        if not obj.hide_render:
            scene.collection.objects.link(obj)
    bpy.context.window.scene = scene
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=asset_directory + '/' + identifier + '.glb', import_pack_images=True, import_select_created_objects=True, loglevel=50)
    imported = set(bpy.data.objects) - before
    terrain = [obj for obj in imported if obj.type == 'MESH' and obj.get('planet') == identifier]
    assert len(terrain) == 2
    full = next(obj for obj in terrain if obj.get('terrainDetail') == 'Full')
    distant = next(obj for obj in terrain if obj.get('terrainDetail') == 'Distant')
    matrices = {obj: obj.matrix_world.copy() for obj in terrain}
    center_blender = Vector((center[0] * 2, -center[2] * 2, center[1] * 2))
    placement = Matrix.Translation(center_blender) @ Matrix.Scale(2, 4)
    for obj in terrain:
        terrain_uv(obj.data)
        obj.matrix_world = placement @ matrices[obj]
    distant.hide_render = True
    image = bpy.data.images.new('Scene AO ' + identifier, width=2048, height=1024, alpha=False)
    image.colorspace_settings.is_data = True
    image.generated_color = (1, 1, 1, 1)
    returned_material = full.data.materials[0].copy()
    bake_material = bpy.data.materials.new('Scene AO Bake ' + identifier)
    bake_material.use_nodes = True
    nodes, links = bake_material.node_tree.nodes, bake_material.node_tree.links
    nodes.clear()
    output, emission, occlusion, target = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion'), nodes.new('ShaderNodeTexImage')
    occlusion.inputs['Distance'].default_value = 10
    occlusion.samples = 16
    links.new(occlusion.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    target.image = image
    nodes.active = target
    full.data.materials.clear()
    full.data.materials.append(bake_material)
    for obj in scene.objects:
        obj.select_set(False)
    full.select_set(True)
    bpy.context.view_layer.objects.active = full
    full.update_tag()
    bpy.context.view_layer.update()
    scene['bakeStatus'] = 'baking'
    try:
        bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'EMIT')
        bpy.ops.object.bake(type=bake_type, use_clear=True, uv_layer=full.data.uv_layers.active.name)
        image.file_format = enum_value(image, 'file_format', 'PNG')
        image.filepath_raw = asset_directory + '/blender-final/' + identifier + '-scene-ao.png'
        image.save()
        occlusion_output(returned_material, image)
        returned_material['blenderSceneFinish'] = 'scene-ao-v1'
        for obj in terrain:
            obj.matrix_world = matrices[obj]
            obj.hide_render = False
            obj.data.materials.clear()
            obj.data.materials.append(returned_material)
            obj['blenderSceneFinish'] = 'scene-ao-v1'
            obj['bakedSceneOccluders'] = len(scene.objects) - len(imported)
            obj['radius'] = radius
        for obj in scene.objects:
            obj.select_set(obj in terrain)
        options = bpy.ops.export_scene.gltf.get_rna_type().properties
        color_mode = next(item.identifier for item in options['export_vertex_color'].enum_items if item.identifier == 'NAME')
        color_name = full.data.color_attributes[0].name
        export_web_glb(asset_directory + '/blender-final/' + identifier + '.glb', use_selection=True, use_active_scene=True, export_apply=True, export_extras=True, export_vertex_color=color_mode, export_vertex_color_name=color_name, export_all_vertex_colors=False)
        scene['bakeStatus'] = 'exported'
        scene['bakeResult'] = json.dumps({'planet': identifier, 'finish': 'scene-ao-v1', 'vertices': len(full.data.vertices), 'occluders': len(scene.objects) - len(imported), 'resolution': [2048, 1024]})
        return scene['bakeResult']
    finally:
        bpy.context.window.scene = previous


def bake_home_finish(destination):
    master = bpy.data.scenes['Kingdom Complete Assembly']
    previous = bpy.context.window.scene
    scene = bpy.data.scenes.new('Web Finish Motherboard')
    scene.render.engine = master.render.engine
    scene.world = master.world
    scene.cycles.samples = 8
    scene.render.bake.target = enum_value(scene.render.bake, 'target', 'IMAGE_TEXTURES')
    excluded = ('Courier', 'Resident', 'Avatar', 'DOG_', 'ANGEL_', 'Weather_', 'Cloud', 'Steam', 'Vapor', 'Jet', 'Mist', 'Shuttle', 'RaceCar', 'Starship', 'Balloon', 'Orbital', 'Speech', 'Bubble')
    for obj in master.objects:
        zone = obj.get('completeExportZone', '')
        if obj.type != 'MESH' or obj.hide_render or not (zone == 'motherboard-landmarks' or zone.startswith('city-block-')):
            continue
        if any(token in obj.name for token in excluded) or obj.get('exportPrimitive') or obj.get('exportBillboard'):
            continue
        scene.collection.objects.link(obj)
    occluders = len(scene.objects)
    mesh = bpy.data.meshes.new('Motherboard bake receiver')
    mesh.from_pydata([(-1070, -2560, 0), (1070, -2560, 0), (1070, 2560, 0), (-1070, 2560, 0)], [], [(0, 1, 2, 3)])
    layer = mesh.uv_layers.new(name='SceneContactUV')
    for item, coordinates in zip(layer.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        item.uv = coordinates
    receiver = bpy.data.objects.new('Motherboard Scene AO Receiver', mesh)
    receiver.location = (0, -158, .07)
    scene.collection.objects.link(receiver)
    image = bpy.data.images.new('Motherboard Scene AO', width=1024, height=2048, alpha=False)
    image.colorspace_settings.is_data = True
    material = bpy.data.materials.new('Motherboard Scene AO Bake')
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output, emission, occlusion, target = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeAmbientOcclusion'), nodes.new('ShaderNodeTexImage')
    occlusion.inputs['Distance'].default_value = 6
    occlusion.samples = 16
    links.new(occlusion.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    target.image = image
    nodes.active = target
    receiver.data.materials.append(material)
    bpy.context.window.scene = scene
    for obj in scene.objects:
        obj.select_set(obj == receiver)
    bpy.context.view_layer.objects.active = receiver
    bpy.context.view_layer.update()
    try:
        bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'EMIT')
        bpy.ops.object.bake(type=bake_type, use_clear=True, uv_layer=layer.name)
        image.file_format = enum_value(image, 'file_format', 'PNG')
        image.filepath_raw = destination + '/motherboard-scene-ao.png'
        image.save()
        pixels = list(image.pixels)
        for offset in range(0, len(pixels), 4):
            shade = (1 - pixels[offset]) * .48
            pixels[offset:offset + 4] = [1, 1, 1, shade]
        contact = bpy.data.images.new('Motherboard Scene Contact', width=1024, height=2048, alpha=True)
        contact.colorspace_settings.is_data = True
        contact.pixels.foreach_set(pixels)
        contact.file_format = enum_value(contact, 'file_format', 'PNG')
        contact.filepath_raw = destination + '/motherboard-contact.png'
        contact.save()
        scene['bakeResult'] = json.dumps({'finish': 'scene-ao-v1', 'occluders': occluders, 'area': {'x': 0, 'z': 79, 'width': 1070, 'depth': 2560, 'y': .035}, 'resolution': [1024, 2048]})
        return scene['bakeResult']
    finally:
        bpy.context.window.scene = previous


def bake_surface_normals(asset_directory, destination):
    previous = bpy.context.window.scene
    scene = bpy.data.scenes.new('Web Finish Surface Normals')
    scene.render.engine = bpy.data.scenes['Kingdom Complete Assembly'].render.engine
    scene.cycles.samples = 8
    scene.render.bake.target = enum_value(scene.render.bake, 'target', 'IMAGE_TEXTURES')
    scene.render.bake.normal_space = enum_value(scene.render.bake, 'normal_space', 'TANGENT')
    mesh = bpy.data.meshes.new('Surface normal receiver')
    mesh.from_pydata([(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [], [(0, 1, 2, 3)])
    layer = mesh.uv_layers.new(name='SurfaceUV')
    for item, coordinates in zip(layer.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        item.uv = coordinates
    receiver = bpy.data.objects.new('Authored Surface Receiver', mesh)
    scene.collection.objects.link(receiver)
    bpy.context.window.scene = scene
    receiver.select_set(True)
    bpy.context.view_layer.objects.active = receiver
    results = []
    try:
        for kind, distance in [('ceramic', .004), ('stone', .018), ('timber', .025), ('brushed', .006)]:
            material = bpy.data.materials.new('Returned Surface ' + kind)
            material.use_nodes = True
            nodes, links = material.node_tree.nodes, material.node_tree.links
            shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
            source, separate, bump, target = nodes.new('ShaderNodeTexImage'), nodes.new('ShaderNodeSeparateColor'), nodes.new('ShaderNodeBump'), nodes.new('ShaderNodeTexImage')
            source.image = bpy.data.images.load(asset_directory + '/architecture-' + kind + '-relief.png', check_existing=True)
            source.image.colorspace_settings.is_data = True
            links.new(source.outputs['Color'], separate.inputs[0])
            links.new(separate.outputs[0], bump.inputs['Height'])
            bump.inputs['Distance'].default_value = distance
            links.new(bump.outputs['Normal'], shader.inputs['Normal'])
            image = bpy.data.images.new('Returned Normal ' + kind, width=512, height=512, alpha=False)
            image.colorspace_settings.is_data = True
            target.image = image
            nodes.active = target
            receiver.data.materials.clear()
            receiver.data.materials.append(material)
            bpy.context.view_layer.update()
            bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'NORMAL')
            bpy.ops.object.bake(type=bake_type, use_clear=True, uv_layer=layer.name)
            image.file_format = enum_value(image, 'file_format', 'PNG')
            image.filepath_raw = destination + '/' + kind + '-normal.png'
            image.save()
            results.append({'surface': kind, 'normalMap': kind + '-normal.png', 'resolution': [512, 512]})
        scene['bakeResult'] = json.dumps(results)
        return scene['bakeResult']
    finally:
        bpy.context.window.scene = previous


