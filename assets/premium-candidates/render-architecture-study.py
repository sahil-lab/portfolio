import bpy
import json
from mathutils import Vector


def render_architecture_study(destination):
    source = bpy.data.scenes['Premium Architecture Candidate']
    studio = bpy.data.scenes.new('Premium Architecture Comparison')
    previous = bpy.context.window.scene
    bpy.context.window.scene = studio
    studio.world = bpy.data.scenes['Kingdom Complete Assembly'].world
    studio.render.engine = bpy.data.scenes['Kingdom Complete Assembly'].render.engine
    studio.cycles.samples = 32
    studio.cycles.use_denoising = True
    studio.render.resolution_x = 1400
    studio.render.resolution_y = 900
    studio.render.resolution_percentage = 100
    studio.render.image_settings.file_format = next(item.identifier for item in studio.render.image_settings.bl_rna.properties['file_format'].enum_items if item.identifier == 'PNG')
    names = ['Architecture_Block', 'Architecture_ForgeRoof', 'Architecture_ConservatoryRoof', 'Architecture_GuildRoof', 'Architecture_PetalRoof', 'Architecture_Dome']
    variants = {'baseline': [], 'candidate': []}
    for variant in variants:
        for index, name in enumerate(names):
            original = next(obj for obj in source.objects if obj.get('baselinePart') == name) if variant == 'baseline' else next(obj for obj in source.objects if obj.get('architecturePart') == name)
            obj = original.copy()
            obj.data = original.data.copy()
            obj.parent = None
            studio.collection.objects.link(obj)
            obj.location = ((index % 3 - 1) * 3.2, -(index // 3) * 3.2, 1)
            obj.hide_render = False
            obj.hide_set(False)
            if variant == 'candidate':
                kind = 'timber' if name == 'Architecture_GuildRoof' else 'brushed' if name == 'Architecture_ForgeRoof' else 'ceramic'
                values = {'ceramic': (.55, .02, .14, .4), 'timber': (.58, .01, .12, .4), 'brushed': (.4, .45, .04, .4)}[kind]
                for slot, material in enumerate(obj.data.materials):
                    material = material.copy()
                    obj.data.materials[slot] = material
                    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
                    for socket, value in zip(('Roughness', 'Metallic', 'Coat Weight', 'Coat Roughness'), values):
                        shader.inputs[socket].default_value = value
            variants[variant].append(obj)
    mesh = bpy.data.meshes.new('Comparison Ground')
    mesh.from_pydata([(-10, -9, 0), (10, -9, 0), (10, 5, 0), (-10, 5, 0)], [], [(0, 1, 2, 3)])
    ground = bpy.data.objects.new('Comparison Ground', mesh)
    studio.collection.objects.link(ground)
    material = bpy.data.materials.new('Comparison Ground Matte')
    material.use_nodes = True
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (.25, .3, .31, 1)
    shader.inputs['Roughness'].default_value = .8
    mesh.materials.append(material)
    data = bpy.data.cameras.new('Comparison Camera')
    camera = bpy.data.objects.new(data.name, data)
    studio.collection.objects.link(camera)
    camera.location = (9, -12, 9)
    camera.rotation_euler = (Vector((0, -1.6, .7)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = next(item.identifier for item in data.bl_rna.properties['type'].enum_items if item.identifier == 'ORTHO')
    data.ortho_scale = 12
    studio.camera = camera
    try:
        for variant in variants:
            for group, objects in variants.items():
                for obj in objects:
                    obj.hide_render = group != variant
            studio.render.filepath = destination + '/architecture-' + variant + '.png'
            result = bpy.ops.render.render(write_still=True, scene=studio.name)
            if 'FINISHED' not in result:
                raise RuntimeError('Comparison render failed: ' + variant)
        studio['comparisonStatus'] = 'rendered-awaiting-review'
        return json.dumps({'scene': studio.name, 'variants': list(variants), 'resolution': [1400, 900]})
    finally:
        bpy.context.window.scene = previous
