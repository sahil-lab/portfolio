import bpy

studio = bpy.data.scenes['Kingdom Shared Asset Studio']
bpy.context.window.scene = studio
asset = bpy.data.objects['Kingdom_WorldKit_Asset']
if asset.get('stage') != 'baked':
    raise RuntimeError('The kit must be baked before export.')
for source in studio.objects:
    source.select_set(False)
asset.select_set(True)
for source in asset.children:
    source.select_set(True)
bpy.context.view_layer.objects.active = asset
options = bpy.ops.export_scene.gltf.get_rna_type().properties
color_mode = next(item.identifier for item in options['export_vertex_color'].enum_items if item.identifier == 'NAME')
bpy.ops.export_scene.gltf(
    filepath='C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/public/assets/kingdom-world-kit.glb',
    export_format='GLB',
    use_selection=True,
    use_active_scene=True,
    export_apply=True,
    export_extras=True,
    export_vertex_color=color_mode,
    export_vertex_color_name='KitRenderColor',
    export_all_vertex_colors=False,
)
