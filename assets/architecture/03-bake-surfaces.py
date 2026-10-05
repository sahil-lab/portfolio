import bpy

base_path = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/'
studio = bpy.data.scenes['Kingdom Architecture Studio']
bpy.context.window.scene = studio
if bpy.data.collections.get('Architecture Material Bakes'):
    raise RuntimeError('Material bakes already exist; do not overwrite the studio.')
collection = bpy.data.collections.new('Architecture Material Bakes')
studio.collection.children.link(collection)
geometry = bpy.data.meshes.new('Architecture Material Bake Plane')
geometry.from_pydata([(-2, -2, 0), (2, -2, 0), (2, 2, 0), (-2, 2, 0)], [], [(0, 1, 2, 3)])
uvs = geometry.uv_layers.new(name='SurfaceUV')
for loop_index, coordinate in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
    uvs.data[loop_index].uv = coordinate
receiver = bpy.data.objects.new('Architecture Material Bake Receiver', geometry)
collection.objects.link(receiver)
receiver.location = (0, 25, 0)
for source in studio.objects:
    source.select_set(False)
receiver.select_set(True)
bpy.context.view_layer.objects.active = receiver
studio.render.bake.target = next(item.identifier for item in studio.render.bake.bl_rna.properties['target'].enum_items if item.identifier == 'IMAGE_TEXTURES')
studio.render.bake.use_selected_to_active = False
studio.render.bake.margin = 0
studio.cycles.samples = 16
bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'EMIT')

for kind in ['ceramic', 'stone', 'timber', 'brushed']:
    material = bpy.data.materials.new('Architecture Baked ' + kind)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    coordinate = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    sockets = {socket.identifier: socket for socket in noise.inputs}
    sockets['Scale'].default_value = 24 if kind == 'stone' else 64
    sockets['Detail'].default_value = 3
    sockets['Roughness'].default_value = 0.65
    links = material.node_tree.links
    links.new(next(socket for socket in coordinate.outputs if socket.identifier == 'UV'), sockets['Vector'])
    channel = noise.outputs[0]
    if kind in ['timber', 'brushed']:
        wave = nodes.new('ShaderNodeTexWave')
        wave.wave_type = next(item.identifier for item in wave.bl_rna.properties['wave_type'].enum_items if item.identifier == 'BANDS')
        wave.bands_direction = next(item.identifier for item in wave.bl_rna.properties['bands_direction'].enum_items if item.identifier == 'X')
        wave_inputs = {socket.identifier: socket for socket in wave.inputs}
        wave_inputs['Scale'].default_value = 8 if kind == 'timber' else 110
        wave_inputs['Distortion'].default_value = 4 if kind == 'timber' else 0.1
        links.new(next(socket for socket in coordinate.outputs if socket.identifier == 'UV'), wave_inputs['Vector'])
        mix = nodes.new('ShaderNodeMixRGB')
        mix.blend_type = next(item.identifier for item in mix.bl_rna.properties['blend_type'].enum_items if item.identifier == 'MIX')
        mix.inputs[0].default_value = 0.25
        links.new(wave.outputs[0], mix.inputs[1])
        links.new(noise.outputs[0], mix.inputs[2])
        channel = mix.outputs[0]
    emission = nodes.new('ShaderNodeEmission')
    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(channel, emission.inputs[0])
    links.new(emission.outputs[0], output.inputs[0])
    image = bpy.data.images.new('Architecture Relief ' + kind, width=512, height=512, alpha=True)
    image.colorspace_settings.is_data = True
    target = nodes.new('ShaderNodeTexImage')
    target.image = image
    nodes.active = target
    geometry.materials.clear()
    geometry.materials.append(material)
    bpy.ops.object.bake(type=bake_type)
    pixels = list(image.pixels)
    grain_values = pixels[::4]
    if max(grain_values) - min(grain_values) < 0.15:
        raise RuntimeError('The surface bake lacks detail: ' + kind)
    for offset in range(0, len(pixels), 4):
        grain = pixels[offset]
        roughness = 0.87 + grain * 0.1 if kind in ['stone', 'timber'] else 0.8 + grain * 0.12
        pixels[offset:offset + 4] = [grain, roughness, 1, 1]
    image.pixels[:] = pixels
    image.filepath_raw = base_path + 'public/assets/architecture-' + kind + '-relief.png'
    image.file_format = next(item.identifier for item in image.bl_rna.properties['file_format'].enum_items if item.identifier == 'PNG')
    image.save()
    print(kind, min(grain_values), max(grain_values))
collection.hide_render = True
collection.hide_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=base_path + 'assets/architecture/architecture-kit.blend', copy=True)
