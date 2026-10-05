import bpy
import json
import math
import re
import sys

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
THEMES = ['donut', 'gelato', 'tea', 'tart', 'coffee', 'cotton', 'prism', 'glider', 'kite']


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def bake_signature(theme, atelier=False):
    scene = bpy.data.scenes[('Signature Atelier ' if atelier else 'Signature Collectible ') + theme]
    assert scene.get('status') == ('atelier-finished-awaiting-bake' if atelier else 'exported-awaiting-independent-review')
    bpy.context.window.scene = scene
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        raise RuntimeError('Cycles is required for contact baking')
    scene.cycles.samples = 16
    scene.render.bake.target = enum_value(scene.render.bake.bl_rna.properties, 'target', 'IMAGE_TEXTURES')
    scene.render.bake.margin = 3
    scene.render.bake.use_clear = True
    originals = [obj for obj in scene.objects if obj.type == 'MESH' and (not atelier or obj.get('shopPart'))]
    if atelier:
        for obj in scene.objects:
            obj.select_set(obj in originals)
        bpy.context.view_layer.objects.active = originals[0]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for obj in originals:
            for uv in list(obj.data.uv_layers):
                obj.data.uv_layers.remove(uv)
            obj.data.uv_layers.new(name='ContactUV')
        bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'EDIT'))
        bpy.ops.mesh.select_all(action=enum_value(bpy.ops.mesh.select_all.get_rna_type().properties, 'action', 'SELECT'))
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.003)
        bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'OBJECT'))
        for obj in originals:
            uv = obj.data.uv_layers.new(name='DetailUV')
            for polygon in obj.data.polygons:
                components = [abs(value) for value in polygon.normal]
                axis = components.index(max(components))
                horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
                for loop in polygon.loop_indices:
                    point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
                    uv.data[loop].uv = (point[horizontal] * .65, point[vertical] * .65)
            obj.data.uv_layers.active_index = 0
            obj.data.uv_layers[0].active_render = True
    previous_visibility = {obj: obj.hide_render for obj in originals}
    clones = []
    scene['status'] = 'contact-baking-unverified'
    resolution = 2048 if atelier else 1024
    image_name = ('Atelier Contact ' if atelier else 'Signature Contact ') + theme
    image = bpy.data.images.get(image_name) or bpy.data.images.new(image_name, width=resolution, height=resolution, alpha=False)
    image.colorspace_settings.name = enum_value(image.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
    image.use_fake_user = True
    material = bpy.data.materials.new('Signature Contact Baker ' + theme)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    contact = nodes.new('ShaderNodeAmbientOcclusion')
    contact.inputs['Distance'].default_value = 1.1
    contact.samples = 16
    contact.only_local = True
    links.new(contact.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], output.inputs['Surface'])
    target = nodes.new('ShaderNodeTexImage')
    target.image = image
    nodes.active = target
    joined = None
    try:
        bpy.context.view_layer.update()
        for obj in scene.objects:
            obj.select_set(False)
        for original in originals:
            original.data.uv_layers[0].name = 'ContactUV'
            original.data.uv_layers.active_index = 0
            clone = original.copy()
            clone.data = original.data.copy()
            scene.collection.objects.link(clone)
            clone.parent = None
            clone.matrix_world = original.matrix_world.copy()
            clone.hide_render = False
            clone.select_set(True)
            original.hide_render = True
            clones.append(clone)
        bpy.context.view_layer.objects.active = clones[0]
        bpy.ops.object.join()
        joined = bpy.context.object
        joined.data.materials.clear()
        joined.data.materials.append(material)
        for polygon in joined.data.polygons:
            polygon.material_index = 0
        joined.data.update()
        joined.update_tag()
        bpy.context.view_layer.update()
        result = bpy.ops.object.bake(type=enum_value(bpy.ops.object.bake.get_rna_type().properties, 'type', 'EMIT'), uv_layer='ContactUV')
        assert 'FINISHED' in result
        image.filepath_raw = PROJECT + '/assets/signature-candidates/' + ('atelier-' if atelier else '') + theme + '-ao.png'
        image.file_format = enum_value(image.bl_rna.properties, 'file_format', 'PNG')
        image.save()
        image.pack()
        levels = {round(value * 255) for value in image.pixels[::512]}
        assert len(levels) > 12, 'The contact bake has no shading variation'
        scene['signatureBakeReport'] = json.dumps({'theme': theme, 'width': resolution, 'samples': 16, 'levels': len(levels)})
        scene['status'] = 'baked-awaiting-visual-review'
        print('SIGNATURE_CONTACT_BAKED', theme, len(levels))
    finally:
        if joined:
            data = joined.data
            bpy.data.objects.remove(joined, do_unlink=True)
            if data.users == 0:
                bpy.data.meshes.remove(data)
        for original, hidden in previous_visibility.items():
            original.hide_render = hidden
    if atelier:
        for obj in scene.objects:
            obj.select_set(bool(obj.get('shopPart') or obj.get('runtimeName')))
        properties = bpy.ops.export_scene.gltf.get_rna_type().properties
        options = dict(filepath=PROJECT + '/assets/signature-candidates/atelier-' + theme + '.raw.glb', use_active_scene=True, use_selection=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
        try:
            bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
        except TypeError as error:
            match = re.search(r'not found in (\([^)]*\))', str(error))
            if not match:
                raise
            formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
            bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
        scene['status'] = 'atelier-baked-exported-awaiting-review'


if __name__ == '__main__':
    for signature_theme in THEMES:
        bake_signature(signature_theme, atelier='--atelier' in sys.argv)
