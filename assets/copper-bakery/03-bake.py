import bpy
import math
import json

scene = bpy.data.scenes['Copper Crumb Studio']
bpy.context.window.scene = scene
root = bpy.data.objects['Copper_Crumb_Asset']
collection = bpy.data.collections['Copper Crumb Authored Collection']
if root.get('stage') != 'detailed':
    raise ValueError('Baking requires the completed detail stage.')


def operator_enum(operator, parameter, identifier):
    return next(item.identifier for item in operator.get_rna_type().properties[parameter].enum_items if item.identifier == identifier)


def select(objects):
    for obj in scene.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


miniature = bpy.data.objects['Pretzel_BraidedLoaf'].data.copy()
miniature.name = 'Copper Display Bread Geometry'
miniature.resolution_u = 2
miniature.bevel_resolution = 0
for obj in collection.objects:
    if obj.name.startswith('Copper_FreshPretzel'):
        obj.data = miniature

renderables = [obj for obj in collection.objects if obj.type in {'MESH', 'CURVE', 'FONT'}]
select(renderables)
bpy.ops.object.convert(target=operator_enum(bpy.ops.object.convert, 'target', 'MESH'))

model = bpy.data.objects['Copper_Architecture']
court = bpy.data.objects['Copper_Courtyard']
hero = bpy.data.objects['Shop_Rooftop_pretzel']
protected = {'Copper_PiercedFacade', 'Copper_ContinuousBarrelRoof', 'Copper_Foundation'}
for parent, label in [(model, 'Copper_FurnishedInterior'), (court, 'Copper_CourtyardMesh'), (hero, 'Pretzel_BraidedLoaf')]:
    objects = [obj for obj in collection.objects if obj.type == 'MESH' and obj.parent == parent and obj.name not in protected]
    select(objects)
    bpy.ops.object.join()
    bpy.context.object.name = label
    bpy.context.object['authoredPart'] = label

meshes = [obj for obj in collection.objects if obj.type == 'MESH']
for obj in meshes:
    for layer in list(obj.data.uv_layers):
        obj.data.uv_layers.remove(layer)
    obj.data.uv_layers.new(name='Copper_BakeUV')
    obj.data.uv_layers.active.active_render = True
select(meshes)
bpy.ops.object.mode_set(mode=operator_enum(bpy.ops.object.mode_set, 'mode', 'EDIT'))
bpy.ops.mesh.select_all(action=operator_enum(bpy.ops.mesh.select_all, 'action', 'SELECT'))
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.012, correct_aspect=True, scale_to_bounds=True)
bpy.ops.object.mode_set(mode=operator_enum(bpy.ops.object.mode_set, 'mode', 'OBJECT'))

image = bpy.data.images.new('Copper Bakery Baked AO', width=1024, height=1024, alpha=True)
image.colorspace_settings.name = next(item.identifier for item in image.colorspace_settings.bl_rna.properties['name'].enum_items if item.identifier == 'Non-Color')
materials = {slot.material for obj in meshes for slot in obj.material_slots if slot.material}
for material in materials:
    node = material.node_tree.nodes.new(bpy.types.ShaderNodeTexImage.bl_rna.identifier)
    node.label = 'Copper Bakery AO Bake Target'
    node.image = image
    for other in material.node_tree.nodes:
        other.select = False
    node.select = True
    material.node_tree.nodes.active = node

try:
    scene.render.engine = 'CYCLES'
except TypeError as error:
    raise RuntimeError('Cycles is required for the authored ambient bake: ' + str(error))
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.bake.use_clear = True
scene.render.bake.margin = 8
bpy.ops.object.bake(type=operator_enum(bpy.ops.object.bake, 'type', 'AO'), margin=8, use_clear=True)
image.filepath_raw = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/public/assets/copper-bakery-ao.png'
image.file_format = next(item.identifier for item in image.bl_rna.properties['file_format'].enum_items if item.identifier == 'PNG')
image.save()
samples = [image.pixels[index] for index in range(0, len(image.pixels), 256) if image.pixels[index + 3] > .5]
assert len(samples) > 100
assert max(samples) - min(samples) > .2
triangles = 0
for obj in meshes:
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)
root['stage'] = 'baked'
root['bakedAO'] = '/assets/copper-bakery-ao.png'
root['bakedAOUV'] = 0
root['triangleCount'] = triangles
root['authoredParts'] = 'arched facade, curved roof, bakery interior, fresh bread, seating, planted courtyard'
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/assets/copper-bakery/copper-bakery.blend', copy=True)
print(json.dumps({'meshes': len(meshes), 'triangles': triangles, 'ao_samples': len(samples), 'ao_range': [min(samples), max(samples)], 'original_scene_objects': len(bpy.data.scenes['Scene'].objects)}, indent=2))
