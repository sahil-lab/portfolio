import bpy

studio = bpy.data.scenes['Kingdom Shared Asset Studio']
bpy.context.window.scene = studio
asset = bpy.data.objects['Kingdom_WorldKit_Asset']
if asset.get('stage') != 'composed':
    raise RuntimeError('Bake only the newly composed kit.')


def enum_value(owner, property_name, wanted):
    values = [item.identifier for item in owner.bl_rna.properties[property_name].enum_items]
    if wanted not in values:
        raise ValueError((property_name, wanted, values))
    return wanted


meshes = [source for source in asset.children if source.type == 'MESH']
for source in studio.objects:
    source.select_set(False)
for source in meshes:
    source.select_set(True)
    colors = source.data.color_attributes.new(name='KitAO', type=enum_value(bpy.types.Attribute, 'data_type', 'FLOAT_COLOR'), domain=enum_value(bpy.types.Attribute, 'domain', 'CORNER'))
    source.data.color_attributes.active_color = colors
    source.data.color_attributes.render_color_index = 0
bpy.context.view_layer.objects.active = meshes[0]
studio.cycles.samples = 24
studio.render.bake.target = enum_value(studio.render.bake, 'target', 'VERTEX_COLORS')
bake_types = bpy.ops.object.bake.get_rna_type().properties['type'].enum_items
bpy.ops.object.bake(type=next(item.identifier for item in bake_types if item.identifier == 'AO'))
minimum, maximum = 1.0, 0.0
for source in meshes:
    for item in source.data.color_attributes['KitAO'].data:
        amount = max(0.0, min(1.0, item.color[0]))
        minimum, maximum = min(minimum, amount), max(maximum, amount)
        item.color = (0.45 + amount * 0.55,) * 3 + (1.0,)
    source['bakedAO'] = True
    finish = source.data.materials[0]
    shader = next(node for node in finish.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    tint = tuple(next(socket for socket in shader.inputs if socket.identifier == 'Base Color').default_value)
    source['kitTint'] = list(tint[:3])
    render_colors = source.data.color_attributes.new(name='KitRenderColor', type=enum_value(bpy.types.Attribute, 'data_type', 'FLOAT_COLOR'), domain=enum_value(bpy.types.Attribute, 'domain', 'CORNER'))
    for render_item, baked_item in zip(render_colors.data, source.data.color_attributes['KitAO'].data):
        render_item.color = tuple(baked_item.color[channel] * tint[channel] for channel in range(3)) + (1.0,)
    source.data.color_attributes.active_color = render_colors
    source.data.color_attributes.render_color_index = 1
for finish in {slot.material for source in meshes for slot in source.material_slots}:
    nodes = finish.node_tree.nodes
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    base = next(socket for socket in shader.inputs if socket.identifier == 'Base Color')
    attribute = nodes.new('ShaderNodeVertexColor')
    attribute.layer_name = 'KitRenderColor'
    finish.node_tree.links.new(attribute.outputs[0], base)

bake_collection = bpy.data.collections.new('Paving Relief Bake')
studio.collection.children.link(bake_collection)
height_material = bpy.data.materials.new('Paving Measured Height')
height_material.use_nodes = True
nodes = height_material.node_tree.nodes
nodes.clear()
position = nodes.new('ShaderNodeNewGeometry')
separate = nodes.new('ShaderNodeSeparateXYZ')
mapping = nodes.new('ShaderNodeMapRange')
mapping.inputs[1].default_value = -0.1
mapping.inputs[2].default_value = 0.1
mapping.inputs[3].default_value = 0.05
mapping.inputs[4].default_value = 0.95
emission = nodes.new('ShaderNodeEmission')
output = nodes.new('ShaderNodeOutputMaterial')
links = height_material.node_tree.links
links.new(position.outputs[0], separate.inputs[0])
links.new(separate.outputs[2], mapping.inputs[0])
links.new(mapping.outputs[0], emission.inputs[0])
links.new(emission.outputs[0], output.inputs[0])
high = []
for row in range(-1, 9):
    for column in range(-1, 5):
        tile = bpy.data.objects.new('Paving_BakeStone', bpy.data.objects['Kit_StonePaver'].data.copy())
        bake_collection.objects.link(tile)
        tile.data.materials.clear()
        tile.data.materials.append(height_material)
        tile.location = (column - 1.5 + (0.5 if row % 2 else 0), row * 0.5 - 1.75, 0)
        tile.scale = (0.97, 0.94, 1)
        high.append(tile)
plane = bpy.data.meshes.new('Paving_BakePlane')
plane.from_pydata([(-2, -2, -0.15), (2, -2, -0.15), (2, 2, -0.15), (-2, 2, -0.15)], [], [(0, 1, 2, 3)])
plane.uv_layers.new(name='PavingUV')
for polygon in plane.polygons:
    for loop_index in polygon.loop_indices:
        vertex = plane.vertices[plane.loops[loop_index].vertex_index]
        plane.uv_layers.active.data[loop_index].uv = (vertex.co.x / 4 + 0.5, vertex.co.y / 4 + 0.5)
receiver = bpy.data.objects.new('Paving_BakeReceiver', plane)
bake_collection.objects.link(receiver)
receiver_material = bpy.data.materials.new('Paving Bake Receiver')
receiver_material.use_nodes = True
plane.materials.append(receiver_material)
image = bpy.data.images.new('Kingdom Paving Relief', width=512, height=512, alpha=True)
image.colorspace_settings.is_data = True
target = receiver_material.node_tree.nodes.new('ShaderNodeTexImage')
target.image = image
receiver_material.node_tree.nodes.active = target
for source in studio.objects:
    source.select_set(False)
for source in high + [receiver]:
    source.select_set(True)
bpy.context.view_layer.objects.active = receiver
studio.render.bake.target = enum_value(studio.render.bake, 'target', 'IMAGE_TEXTURES')
studio.render.bake.use_selected_to_active = True
studio.render.bake.cage_extrusion = 0.6
studio.render.bake.max_ray_distance = 1
studio.render.bake.margin = 0
bpy.ops.object.bake(type=next(item.identifier for item in bake_types if item.identifier == 'EMIT'))
pixels = list(image.pixels)
heights = pixels[::4]
if max(heights) - min(heights) < 0.1:
    raise RuntimeError('The paving bake has no measurable relief.')
for offset in range(0, len(pixels), 4):
    height = pixels[offset]
    pixels[offset:offset + 4] = [height, 0.88 + (1 - height) * 0.1, 1, 1]
image.pixels[:] = pixels
image.filepath_raw = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/public/assets/world-paving-relief.png'
image.file_format = enum_value(image, 'file_format', 'PNG')
image.save()
studio.render.bake.use_selected_to_active = False
for source in studio.objects:
    source.select_set(False)
receiver.select_set(True)
bpy.context.view_layer.objects.active = receiver
asphalt = bpy.data.images.new('Kingdom Asphalt Relief', width=512, height=512, alpha=True)
asphalt.colorspace_settings.name = image.colorspace_settings.name
target.image = asphalt
noise = receiver_material.node_tree.nodes.new('ShaderNodeTexNoise')
next(socket for socket in noise.inputs if socket.identifier == 'Scale').default_value = 64
next(socket for socket in noise.inputs if socket.identifier == 'Detail').default_value = 3
asphalt_emission = receiver_material.node_tree.nodes.new('ShaderNodeEmission')
asphalt_output = next(node for node in receiver_material.node_tree.nodes if node.type == 'OUTPUT_MATERIAL')
receiver_material.node_tree.links.new(noise.outputs[0], asphalt_emission.inputs[0])
receiver_material.node_tree.links.new(asphalt_emission.outputs[0], asphalt_output.inputs[0])
bpy.ops.object.bake(type=next(item.identifier for item in bake_types if item.identifier == 'EMIT'))
asphalt_pixels = list(asphalt.pixels)
for offset in range(0, len(asphalt_pixels), 4):
    grain = asphalt_pixels[offset]
    asphalt_pixels[offset:offset + 4] = [grain, 0.86 + grain * 0.1, 1, 1]
asphalt.pixels[:] = asphalt_pixels
asphalt.filepath_raw = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/public/assets/world-asphalt-relief.png'
asphalt.file_format = image.file_format
asphalt.save()
bake_collection.hide_render = True
bake_collection.hide_viewport = True
asset['stage'] = 'baked'
asset['vertexAO'] = 'KitAO'
asset['pavingRelief'] = '/assets/world-paving-relief.png'
asset['asphaltRelief'] = '/assets/world-asphalt-relief.png'
print('Baked AO range:', minimum, maximum)
print('Paving height range:', min(heights), max(heights))
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/assets/world-kit/world-kit.blend', copy=True)
