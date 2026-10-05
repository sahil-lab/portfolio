import bpy
import bmesh

studio = bpy.data.scenes['Kingdom Architecture Studio']
bpy.context.window.scene = studio
root = bpy.data.objects['Architecture_Library']
if root.get('stage') != 'modeled':
    raise RuntimeError('Bake only the newly modeled architecture.')

plain = bmesh.new()
bmesh.ops.create_cube(plain, size=2)
plain_mesh = bpy.data.meshes.new('Architecture_PlainBlock_Mesh')
plain.to_mesh(plain_mesh)
plain.free()
plain_object = bpy.data.objects.new('Architecture_PlainBlock', plain_mesh)
bpy.data.collections['Authored Architecture Library'].objects.link(plain_object)
plain_object.parent = root
plain_object.location = (0, -8, 1)
plain_mesh.materials.append(bpy.data.materials['Architecture Porcelain Stone'])
plain_object['architecturePart'] = plain_object.name

floor_mesh = bpy.data.meshes.new('Architecture_BakeFloor')
floor_mesh.from_pydata([(-14, -12, -0.015), (14, -12, -0.015), (14, 4, -0.015), (-14, 4, -0.015)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new('Architecture Studio Floor', floor_mesh)
studio.collection.objects.link(floor)
floor_mesh.materials.append(bpy.data.materials['Architecture Porcelain Stone'])
parts = [source for source in root.children if source.type == 'MESH']
color_type = next(item.identifier for item in bpy.types.Attribute.bl_rna.properties['data_type'].enum_items if item.identifier == 'FLOAT_COLOR')
color_domain = next(item.identifier for item in bpy.types.Attribute.bl_rna.properties['domain'].enum_items if item.identifier == 'CORNER')
for source in studio.objects:
    source.select_set(False)
for source in parts:
    layer = source.data.color_attributes.new(name='Architecture_AO', type=color_type, domain=color_domain)
    source.data.color_attributes.active_color = layer
    source.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
studio.render.bake.target = next(item.identifier for item in studio.render.bake.bl_rna.properties['target'].enum_items if item.identifier == 'VERTEX_COLORS')
studio.cycles.samples = 24
bpy.ops.object.bake(type=next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == 'AO'))
for source in parts:
    shader = next(node for node in source.data.materials[0].node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    tint = tuple(next(socket for socket in shader.inputs if socket.identifier == 'Base Color').default_value)
    source['bakedTint'] = list(tint[:3])
    colors = source.data.color_attributes.new(name='Architecture_Color', type=color_type, domain=color_domain)
    for target, occlusion in zip(colors.data, source.data.color_attributes['Architecture_AO'].data):
        amount = 0.65 + min(1.0, max(0.0, occlusion.color[0])) * 0.35
        target.color = tuple(amount * channel for channel in tint[:3]) + (1.0,)
    source.data.color_attributes.active_color = colors
    source.data.color_attributes.render_color_index = 1
    source['bakedAO'] = True
for material in {source.data.materials[0] for source in parts}:
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    vertex = material.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = 'Architecture_Color'
    material.node_tree.links.new(vertex.outputs[0], next(socket for socket in shader.inputs if socket.identifier == 'Base Color'))
root.select_set(True)
bpy.context.view_layer.objects.active = root
color_mode = next(item.identifier for item in bpy.ops.export_scene.gltf.get_rna_type().properties['export_vertex_color'].enum_items if item.identifier == 'NAME')
bpy.ops.export_scene.gltf(filepath='C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/public/assets/architecture-kit.glb', export_format='GLB', use_selection=True, use_active_scene=True, export_apply=True, export_extras=True, export_vertex_color=color_mode, export_vertex_color_name='Architecture_Color', export_all_vertex_colors=False)
root['stage'] = 'baked'
studio.render.filepath = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/architecture-kit-render.png'
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/assets/architecture/architecture-kit.blend', copy=True)
print('Exported architecture parts:', len(parts))
