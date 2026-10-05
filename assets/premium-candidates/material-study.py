import bpy
import math
import json


def enum_value(owner, field, preferred):
    return next(item.identifier for item in owner.bl_rna.properties[field].enum_items if item.identifier == preferred)


def make_material_study(destination):
    if bpy.data.scenes.get('Premium Surface Candidate'):
        raise RuntimeError('Surface candidate already exists; inspect before rebuilding.')
    previous = bpy.context.window.scene
    scene = bpy.data.scenes.new('Premium Surface Candidate')
    scene.render.engine = bpy.data.scenes['Kingdom Complete Assembly'].render.engine
    scene.cycles.samples = 8
    scene.render.bake.target = enum_value(scene.render.bake, 'target', 'IMAGE_TEXTURES')
    scene.render.bake.normal_space = enum_value(scene.render.bake, 'normal_space', 'TANGENT')
    mesh = bpy.data.meshes.new('Premium Surface Receiver')
    mesh.from_pydata([(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [], [(0, 1, 2, 3)])
    layer = mesh.uv_layers.new(name='SurfaceUV')
    for item, coordinates in zip(layer.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        item.uv = coordinates
    receiver = bpy.data.objects.new('Premium Surface Receiver', mesh)
    scene.collection.objects.link(receiver)
    bpy.context.window.scene = scene
    receiver.select_set(True)
    bpy.context.view_layer.objects.active = receiver
    recipes = {'ceramic': (5, .9, .1, .004), 'stone': (9, .8, .2, .012), 'timber': (3, .67, .33, .008), 'brushed': (20, .86, .14, .002)}
    results = []
    scene['candidateStatus'] = 'baking-unverified'
    try:
        for kind, (frequency, minimum, contrast, height) in recipes.items():
            material = bpy.data.materials.new('Premium Surface ' + kind)
            material.use_nodes = True
            nodes, links = material.node_tree.nodes, material.node_tree.links
            nodes.clear()

            def operation(name, first, second=0):
                node = nodes.new('ShaderNodeMath')
                node.operation = enum_value(node, 'operation', name)
                for index, value in enumerate((first, second)):
                    if isinstance(value, (int, float)):
                        node.inputs[index].default_value = value
                    else:
                        links.new(value, node.inputs[index])
                return node.outputs[0]

            coordinates, axes = nodes.new('ShaderNodeTexCoord'), nodes.new('ShaderNodeSeparateXYZ')
            links.new(coordinates.outputs['UV'], axes.inputs[0])
            horizontal = operation('MULTIPLY', axes.outputs['X'], math.tau)
            vertical = operation('MULTIPLY', axes.outputs['Y'], math.tau)
            periodic = nodes.new('ShaderNodeCombineXYZ')
            links.new(operation('COSINE', horizontal), periodic.inputs[0])
            links.new(operation('SINE', horizontal), periodic.inputs[1])
            links.new(operation('COSINE', vertical), periodic.inputs[2])
            noise = nodes.new('ShaderNodeTexNoise')
            noise.noise_dimensions = enum_value(noise, 'noise_dimensions', '4D')
            links.new(periodic.outputs[0], noise.inputs['Vector'])
            links.new(operation('SINE', vertical), noise.inputs['W'])
            noise.inputs['Scale'].default_value = frequency
            noise.inputs['Detail'].default_value = 3
            signal = noise.outputs['Fac']
            if kind in ('timber', 'brushed'):
                bands = operation('ADD', operation('MULTIPLY', horizontal if kind == 'timber' else vertical, 8 if kind == 'timber' else 100), operation('MULTIPLY', signal, 3 if kind == 'timber' else .4))
                signal = operation('MULTIPLY_ADD', operation('SINE', bands), .5)
                signal.node.inputs[2].default_value = .5
            color = operation('ADD', operation('MULTIPLY', signal, contrast), minimum)
            roughness = operation('ADD', operation('MULTIPLY', signal, .28), .72)
            shader, bump, emission, output, target = nodes.new('ShaderNodeBsdfPrincipled'), nodes.new('ShaderNodeBump'), nodes.new('ShaderNodeEmission'), nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeTexImage')
            links.new(color, shader.inputs['Base Color'])
            links.new(roughness, shader.inputs['Roughness'])
            links.new(signal, bump.inputs['Height'])
            bump.inputs['Distance'].default_value = height
            links.new(bump.outputs['Normal'], shader.inputs['Normal'])
            receiver.data.materials.clear()
            receiver.data.materials.append(material)
            for channel, source in [('color', color), ('roughness', roughness), ('normal', None)]:
                image = bpy.data.images.new('Premium ' + kind + ' ' + channel, width=512, height=512, alpha=False)
                image.colorspace_settings.is_data = channel != 'color'
                target.image = image
                nodes.active = target
                for link in list(output.inputs['Surface'].links):
                    links.remove(link)
                if channel == 'normal':
                    links.new(shader.outputs[0], output.inputs['Surface'])
                    wanted = 'NORMAL'
                else:
                    for link in list(emission.inputs['Color'].links):
                        links.remove(link)
                    links.new(source, emission.inputs['Color'])
                    links.new(emission.outputs[0], output.inputs['Surface'])
                    wanted = 'EMIT'
                bpy.context.view_layer.update()
                bake_type = next(item.identifier for item in bpy.ops.object.bake.get_rna_type().properties['type'].enum_items if item.identifier == wanted)
                result = bpy.ops.object.bake(type=bake_type, use_clear=True, uv_layer=layer.name)
                if 'FINISHED' not in result:
                    raise RuntimeError('Material bake failed: ' + kind + '/' + channel)
                image.file_format = enum_value(image, 'file_format', 'PNG')
                image.filepath_raw = destination + '/' + kind + '-' + channel + '.png'
                image.save()
                results.append({'surface': kind, 'channel': channel, 'resolution': [512, 512]})
        scene['candidateStatus'] = 'baked-awaiting-verification'
        scene['candidateReport'] = json.dumps(results)
        return results
    except Exception:
        scene['candidateStatus'] = 'failed-unverified'
        raise
    finally:
        bpy.context.window.scene = previous
