import bpy
from mathutils import Vector

base_path = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/'
planet_ids = ['copper', 'garden', 'prism', 'petal', 'solstice', 'cloud', 'ai-research', 'project-foundry', 'skills-technology']
studio = bpy.data.scenes.get('Kingdom Planet Studio')
if studio is None:
    studio = bpy.data.scenes.new('Kingdom Planet Studio')
bpy.context.window.scene = studio
try:
    studio.render.engine = 'CYCLES'
except TypeError as error:
    raise RuntimeError(str(error)) from error
studio.cycles.samples = 16
studio.cycles.use_denoising = True
color_type = next(item.identifier for item in bpy.types.Attribute.bl_rna.properties['data_type'].enum_items if item.identifier == 'FLOAT_COLOR')
color_domain = next(item.identifier for item in bpy.types.Attribute.bl_rna.properties['domain'].enum_items if item.identifier == 'CORNER')
bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'AO')
studio.render.bake.target = next(item.identifier for item in studio.render.bake.bl_rna.properties['target'].enum_items if item.identifier == 'VERTEX_COLORS')
color_mode = next(item.identifier for item in bpy.ops.export_scene.gltf.get_rna_type().properties['export_vertex_color'].enum_items if item.identifier == 'NAME')

for planet_index, planet_id in enumerate(planet_ids):
    planet_root = studio.objects.get('Planet_' + planet_id)
    if planet_root and planet_root.get('terrainBaked'):
        continue
    if planet_root is None:
        bpy.ops.import_scene.gltf(filepath=base_path + 'assets/planets/source/' + planet_id + '.glb')
        planet_root = studio.objects.get('Planet_' + planet_id)
    if planet_root is None:
        raise RuntimeError('Missing imported planet: ' + planet_id)
    terrain = [source for source in planet_root.children if source.type == 'MESH']
    if len(terrain) != 2:
        raise RuntimeError('Each planet must contain full and distant terrain.')
    for source in terrain:
        for candidate in studio.objects:
            candidate.select_set(False)
            if candidate.type == 'MESH':
                candidate.hide_render = True
        source.hide_render = False
        source.select_set(True)
        bpy.context.view_layer.objects.active = source
        colors = source.data.color_attributes['Color']
        base_colors = [tuple(item.color) for item in colors.data]
        for layer_name in ['Terrain_AO', 'Terrain_Color']:
            existing = source.data.color_attributes.get(layer_name)
            if existing:
                source.data.color_attributes.remove(existing)
        occlusion = source.data.color_attributes.new(name='Terrain_AO', type=color_type, domain=color_domain)
        source.data.color_attributes.active_color = occlusion
        bpy.context.view_layer.update()
        bpy.ops.object.bake(type=bake_type)
        painted = source.data.color_attributes.new(name='Terrain_Color', type=color_type, domain=color_domain)
        for index, (target, shaded) in enumerate(zip(painted.data, occlusion.data)):
            amount = 0.72 + min(1.0, max(0.0, shaded.color[0])) * 0.28
            target.color = tuple(base_colors[index][channel] * amount for channel in range(3)) + (1.0,)
        source.data.color_attributes.active_color = painted
        source.data.color_attributes.render_color_index = source.data.color_attributes.find('Terrain_Color')
        source['bakedTerrain'] = True
        source['originalAuthority'] = 'planetPoint'
        material = source.data.materials[0]
        shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        vertex = next((node for node in material.node_tree.nodes if node.type == 'VERTEX_COLOR' and node.layer_name == 'Terrain_Color'), None)
        if vertex is None:
            vertex = material.node_tree.nodes.new('ShaderNodeVertexColor')
            vertex.layer_name = 'Terrain_Color'
        material.node_tree.links.new(vertex.outputs[0], next(socket for socket in shader.inputs if socket.identifier == 'Base Color'))
        source.hide_render = True
    for candidate in studio.objects:
        candidate.select_set(False)
    planet_root.select_set(True)
    for source in terrain:
        source.select_set(True)
        source.hide_render = False
    bpy.context.view_layer.objects.active = planet_root
    bpy.ops.export_scene.gltf(filepath=base_path + 'public/assets/planets/' + planet_id + '.glb', export_format='GLB', use_selection=True, use_active_scene=True, export_apply=True, export_extras=True, export_vertex_color=color_mode, export_vertex_color_name='Terrain_Color', export_all_vertex_colors=False)
    planet_root['terrainBaked'] = True
    planet_root.location = ((planet_index % 3) * 460, (planet_index // 3) * 460, 0)
    for source in terrain:
        source.hide_render = source.get('terrainDetail') != 'Full'
    print('Baked and exported:', planet_id)

for source in studio.objects:
    if source.type == 'MESH':
        source.hide_render = source.get('terrainDetail') != 'Full'
if studio.camera is None:
    world = bpy.data.worlds.new('Planet Library World')
    world.use_nodes = True
    background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
    background.inputs[0].default_value = (0.2, 0.26, 0.27, 1)
    background.inputs[1].default_value = 0.6
    studio.world = world
    light_data = bpy.data.lights.new('Planet Library Sun', next(item.identifier for item in bpy.types.Light.bl_rna.properties['type'].enum_items if item.identifier == 'SUN'))
    light_data.energy = 2.5
    light_data.angle = 0.15
    light = bpy.data.objects.new(light_data.name, light_data)
    studio.collection.objects.link(light)
    light.rotation_euler = (0.4, -0.6, -0.4)
    camera_data = bpy.data.cameras.new('Planet Library Camera')
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    studio.collection.objects.link(camera)
    camera.location = (1500, -1200, 1500)
    camera.rotation_euler = (Vector((460, 460, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = next(item.identifier for item in camera_data.bl_rna.properties['type'].enum_items if item.identifier == 'ORTHO')
    camera_data.ortho_scale = 1500
    camera_data.clip_start = 1
    camera_data.clip_end = 10000
    studio.camera = camera
studio.render.resolution_x = 1600
studio.render.resolution_y = 1100
studio.render.resolution_percentage = 100
studio.render.filepath = base_path + 'outputs/planet-library-render.png'
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=base_path + 'assets/planets/planet-library.blend', copy=True)
print('Planet library complete.')
