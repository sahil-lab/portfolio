import bpy
import math
import re
from mathutils import Vector

ROOT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
PLANETS = ['copper', 'garden', 'prism', 'petal', 'solstice', 'cloud', 'ai-research', 'project-foundry', 'skills-technology']


def choice(properties, key, wanted):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == wanted)


def surface_uv(mesh):
    contact = mesh.uv_layers.active or mesh.uv_layers.new(name='TerrainSurfaceUV')
    contact.name = 'TerrainSurfaceUV'
    detail = mesh.uv_layers.new(name='TerrainDetailUV')
    for polygon in mesh.polygons:
        values, poles = [], []
        for loop in polygon.loop_indices:
            normal = mesh.vertices[mesh.loops[loop].vertex_index].co.normalized()
            values.append([(math.atan2(normal.y, normal.x) / math.tau) % 1, .5 + math.asin(max(-1, min(1, normal.z))) / math.pi])
            poles.append(abs(normal.z) > .999999)
        longitudes = [value[0] for value, pole in zip(values, poles) if not pole]
        if longitudes and max(longitudes) - min(longitudes) > .5:
            for value in values:
                if value[0] < .5:
                    value[0] += 1
        longitudes = [value[0] for value, pole in zip(values, poles) if not pole]
        for loop, value, pole in zip(polygon.loop_indices, values, poles):
            if pole and longitudes:
                value[0] = sum(longitudes) / len(longitudes)
            contact.data[loop].uv = value
            detail.data[loop].uv = (value[0] * 36, value[1] * 18)
    contact.active_render = True
    mesh.uv_layers.active_index = 0
    mesh.update()


def finish_planet(identifier):
    name = 'Sculpted Terrain ' + identifier
    existing = bpy.data.scenes.get(name)
    if existing:
        assert existing.get('status') == 'exported-awaiting-review', name + ' is incomplete'
        return
    scene = bpy.data.scenes.new(name)
    bpy.context.window.scene = scene
    scene['status'] = 'importing'
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        raise RuntimeError('Cycles is required for terrain shading')
    scene.cycles.samples = 16
    scene.render.bake.target = choice(scene.render.bake.bl_rna.properties, 'target', 'IMAGE_TEXTURES')
    scene.render.bake.margin = 8
    scene.render.bake.use_selected_to_active = False
    bpy.ops.import_scene.gltf(filepath=ROOT + '/assets/world-candidates/terrain-source/' + identifier + '.glb')
    terrain = [obj for obj in scene.objects if obj.type == 'MESH']
    assert len(terrain) == 2 and all(obj.get('terrainRevision') == 'sculpted-v2' for obj in terrain)
    full = next(obj for obj in terrain if obj.get('terrainDetail') == 'Full')
    distant = next(obj for obj in terrain if obj.get('terrainDetail') == 'Distant')
    for obj in terrain:
        obj.name = 'Sculpted_' + identifier + '_' + obj['terrainDetail']
        surface_uv(obj.data)
        obj.data.color_attributes.active_color.name = 'TerrainColor'
    distant.hide_render = True
    finish = bpy.data.materials.new('Sculpted Ground ' + identifier)
    finish.use_nodes = True
    finish['surface'] = 'natural'
    nodes, links = finish.node_tree.nodes, finish.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = .94
    shader.inputs['Specular IOR Level'].default_value = .22
    color = nodes.new('ShaderNodeVertexColor')
    color.layer_name = 'TerrainColor'
    links.new(color.outputs['Color'], shader.inputs['Base Color'])
    grain = bpy.data.images.load(ROOT + '/public/assets/premium-v1/stone-normal.png', check_existing=False)
    grain.colorspace_settings.is_data = True
    grain.pack()
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'TerrainDetailUV'
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = grain
    normal = nodes.new('ShaderNodeNormalMap')
    normal.uv_map = 'TerrainDetailUV'
    normal.inputs['Strength'].default_value = .22
    links.new(uv.outputs['UV'], texture.inputs['Vector'])
    links.new(texture.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    image = bpy.data.images.new('Sculpted Terrain AO ' + identifier, width=1024, height=512, alpha=False)
    image.colorspace_settings.is_data = True
    image.generated_color = (1, 1, 1, 1)
    bake = bpy.data.materials.new('Sculpted Terrain Bake ' + identifier)
    bake.use_nodes = True
    bake_nodes, bake_links = bake.node_tree.nodes, bake.node_tree.links
    bake_nodes.clear()
    output, emission, occlusion, target = bake_nodes.new('ShaderNodeOutputMaterial'), bake_nodes.new('ShaderNodeEmission'), bake_nodes.new('ShaderNodeAmbientOcclusion'), bake_nodes.new('ShaderNodeTexImage')
    occlusion.only_local = True
    occlusion.samples = 16
    occlusion.inputs['Distance'].default_value = 6
    bake_links.new(occlusion.outputs['Color'], emission.inputs['Color'])
    bake_links.new(emission.outputs[0], output.inputs['Surface'])
    target.image = image
    bake_nodes.active = target
    full.data.materials.clear()
    full.data.materials.append(bake)
    for obj in scene.objects:
        obj.select_set(obj == full)
    bpy.context.view_layer.objects.active = full
    bpy.context.view_layer.update()
    scene['status'] = 'baking'
    try:
        mode = choice(bpy.ops.object.bake.get_rna_type().properties, 'type', 'EMIT')
        assert 'FINISHED' in bpy.ops.object.bake(type=mode, use_clear=True, uv_layer='TerrainSurfaceUV')
    finally:
        full.data.materials.clear()
        full.data.materials.append(finish)
    image.file_format = choice(image.bl_rna.properties, 'file_format', 'PNG')
    image.filepath_raw = ROOT + '/assets/world-candidates/terrain-raw/' + identifier + '-self-ao.png'
    image.save()
    image.pack()
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', bpy.types.ShaderNodeTree.bl_rna.identifier)
        group.interface.new_socket(name='Occlusion', in_out=choice(group.interface.bl_rna.functions['new_socket'].parameters, 'in_out', 'INPUT'), socket_type=bpy.types.NodeSocketFloat.bl_rna.identifier)
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = image
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'TerrainSurfaceUV'
    output = nodes.new('ShaderNodeGroup')
    output.node_tree = group
    links.new(uv.outputs['UV'], texture.inputs['Vector'])
    links.new(texture.outputs['Color'], output.inputs['Occlusion'])
    for obj in terrain:
        obj.hide_render = False
        obj.data.materials.clear()
        obj.data.materials.append(finish)
        obj['bakedTerrain'] = True
        obj['blenderSceneFinish'] = 'relief-ao-v2'
    for obj in scene.objects:
        obj.select_set(obj in terrain)
    properties = bpy.ops.export_scene.gltf.get_rna_type().properties
    options = dict(filepath=ROOT + '/assets/world-candidates/terrain-raw/' + identifier + '.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False, export_vertex_color=choice(properties, 'export_vertex_color', 'NAME'), export_vertex_color_name='TerrainColor', export_all_vertex_colors=False)
    try:
        bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
    except TypeError as error:
        match = re.search(r'not found in (\([^)]*\))', str(error))
        if not match:
            raise
        formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
        bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
    distant.hide_render = True
    scene['status'] = 'exported-awaiting-review'
    print('SCULPTED_TERRAIN_EXPORTED', identifier)


for planet in PLANETS:
    finish_planet(planet)
