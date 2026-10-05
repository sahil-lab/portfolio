import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def enum_value(owner, field, preferred):
    return next(item.identifier for item in owner.bl_rna.properties[field].enum_items if item.identifier == preferred)


def share_images(images, cache):
    shared = 0
    for image in images:
        if not image.packed_file:
            continue
        key = (image.packed_file.data, image.colorspace_settings.name, image.alpha_mode)
        retained = cache.get(key)
        if retained is None:
            cache[key] = image
        elif retained != image:
            image.user_remap(retained)
            bpy.data.images.remove(image)
            shared += 1
    return shared


def restore_surface(material, package):
    if material.get('completeExportSurface') or not material.use_nodes:
        return
    paving = material.get('authoredPaving')
    surface = material.get('authoredSurface')
    if not paving and not surface:
        return
    filename = ('world-asphalt-relief.png' if paving == 'asphalt' else 'world-paving-relief.png') if paving else 'architecture-' + surface + '-relief.png'
    image = bpy.data.images.load(str(package) + '/original-assets/' + filename, check_existing=True)
    image.colorspace_settings.is_data = True
    image.pack()
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.label = 'Original authored relief'
    if paving:
        coordinates = nodes.new('ShaderNodeNewGeometry')
        scale = nodes.new('ShaderNodeVectorMath')
        scale.operation = enum_value(scale, 'operation', 'SCALE')
        scale.inputs['Scale'].default_value = .125
        links.new(coordinates.outputs['Position'], scale.inputs[0])
        links.new(scale.outputs[0], texture.inputs['Vector'])
        texture.projection = enum_value(texture, 'projection', 'BOX')
        texture.projection_blend = .15
    channels = nodes.new('ShaderNodeSeparateColor')
    links.new(texture.outputs['Color'], channels.inputs[0])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Distance'].default_value = (.055 if paving == 'asphalt' else .16) if paving else {'timber': .025, 'stone': .018, 'brushed': .006, 'ceramic': .004}[surface]
    links.new(channels.outputs[0], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    roughness = nodes.new('ShaderNodeMath')
    roughness.operation = enum_value(roughness, 'operation', 'MULTIPLY')
    roughness.inputs[1].default_value = shader.inputs['Roughness'].default_value
    links.new(channels.outputs[1], roughness.inputs[0])
    links.new(roughness.outputs[0], shader.inputs['Roughness'])
    material['completeExportSurface'] = 'world-coordinate box projection approximation' if paving else 'authored UV relief restored'


def restore_primitives(obj):
    primitive = obj.get('exportPrimitive')
    if not primitive or obj.get('completeExportPrimitive'):
        return
    group = bpy.data.node_groups.new('Export ' + primitive, bpy.types.GeometryNodeTree.bl_rna.identifier)
    direction = group.interface.bl_rna.functions['new_socket'].parameters['in_out'].enum_items
    for preferred in ('INPUT', 'OUTPUT'):
        group.interface.new_socket(name='Geometry', in_out=next(item.identifier for item in direction if item.identifier == preferred), socket_type=bpy.types.NodeSocketGeometry.bl_rna.identifier)
    nodes, links = group.nodes, group.links
    source, output = nodes.new('NodeGroupInput'), nodes.new('NodeGroupOutput')
    if primitive == 'line':
        curve, profile, mesh = nodes.new('GeometryNodeMeshToCurve'), nodes.new('GeometryNodeCurvePrimitiveCircle'), nodes.new('GeometryNodeCurveToMesh')
        profile.inputs['Resolution'].default_value = 6
        profile.inputs['Radius'].default_value = .012 * obj.get('exportLineWidth', 1)
        links.new(source.outputs['Geometry'], curve.inputs['Mesh'])
        links.new(curve.outputs['Curve'], mesh.inputs['Curve'])
        links.new(profile.outputs['Curve'], mesh.inputs['Profile Curve'])
        result = mesh.outputs['Mesh']
    elif obj.type == 'POINTCLOUD':
        radius = nodes.new('GeometryNodeSetPointRadius')
        radius.inputs['Radius'].default_value = min(.2, max(.015, obj.get('exportPointSize', 1) * .04))
        links.new(source.outputs['Geometry'], radius.inputs['Points'])
        result = radius.outputs['Points']
    else:
        points = nodes.new('GeometryNodeMeshToPoints')
        points.inputs['Radius'].default_value = min(.2, max(.015, obj.get('exportPointSize', 1) * .04))
        links.new(source.outputs['Geometry'], points.inputs['Mesh'])
        result = points.outputs['Points']
    if obj.data.materials:
        material = nodes.new('GeometryNodeSetMaterial')
        material.inputs['Material'].default_value = obj.data.materials[0]
        links.new(result, material.inputs['Geometry'])
        result = material.outputs['Geometry']
    links.new(result, output.inputs['Geometry'])
    modifier = obj.modifiers.new('Renderable exported primitive', enum_value(bpy.types.Modifier, 'type', 'NODES'))
    modifier.node_group = group
    obj['completeExportPrimitive'] = 'static physical thickness approximation'


def prepare_objects(objects, package):
    materials = {material for obj in objects if obj.type in ('MESH', 'POINTCLOUD') for material in obj.data.materials if material}
    for material in materials:
        restore_surface(material, package)
    for obj in objects:
        restore_primitives(obj)
        if any(token in obj.name for token in ('AtmosphericVault', 'LocalAtmosphere', 'AtmosphericLimb', 'RisingVapor')):
            obj.hide_render = True
            obj.hide_set(True)
            obj['completeExportRenderNote'] = 'GLSL-only effect retained as source geometry; environment lighting replaces sky in Blender'
        if not obj.get('sourceVisible', True) and any(token in obj.name for token in ('Speech', 'Bubble', 'Weather_', 'SharedCabin')):
            obj.hide_render = True
            obj.hide_set(True)


def add_camera(scene, name, position, target, lens=42):
    data = bpy.data.cameras.new(name)
    camera = bpy.data.objects.new(name, data)
    scene.collection.objects.link(camera)
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.lens = lens
    data.clip_start = .05
    data.clip_end = 40000
    return camera


def prepare_scene(scene, package):
    world = bpy.data.worlds.new('Complete Kingdom HDR')
    world.use_nodes = True
    scene.world = world
    background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
    environment = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
    environment.image = bpy.data.images.load(str(package) + '/original-assets/studio_small_03_1k.hdr', check_existing=True)
    environment.image.pack()
    background.inputs['Strength'].default_value = .55
    world.node_tree.links.new(environment.outputs['Color'], background.inputs['Color'])
    scene.camera = add_camera(scene, 'Kingdom Overview', (2100, -3800, 4400), (0, -150, 0), 36)
    add_camera(scene, 'Workshop Detail', (60, -135, 78), (0, -32, 10), 42)
    try:
        scene.render.engine = 'CYCLES'
    except TypeError:
        pass
    if scene.render.engine == 'CYCLES':
        scene.cycles.samples = 32
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.clip_end = 40000
    return scene


def import_package(package, zone_ids=None, save=True, assembly=False):
    manifest = json.loads((package / 'manifest.json').read_text(encoding='utf8'))
    if manifest['status'] != 'complete':
        raise ValueError('Package export is incomplete')
    catalog = json.loads((package / 'blender-assembly' / 'manifest.json').read_text(encoding='utf8')) if assembly else manifest
    if catalog['status'] != 'complete':
        raise ValueError('Assembly is incomplete')
    scene = bpy.data.scenes.new('Kingdom Complete Export')
    bpy.context.window.scene = scene
    report = {'sourceFingerprint': manifest['sourceFingerprint'], 'zones': [], 'status': 'importing', 'assembly': assembly}
    image_cache = {}
    options = bpy.ops.import_scene.gltf.get_rna_type().properties
    shading = next(item.identifier for item in options['import_shading'].enum_items if item.identifier == 'NORMALS')
    for zone in catalog['zones']:
        if zone_ids and zone['id'] not in zone_ids:
            continue
        filename = package / zone['file']
        with filename.open('rb') as source_file:
            if hashlib.file_digest(source_file, 'sha256').hexdigest() != zone['sha256']:
                raise ValueError('Export hash mismatch: ' + zone['id'])
        before = set(scene.objects)
        images_before = set(bpy.data.images)
        bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection
        bpy.ops.import_scene.gltf(filepath=str(filename), import_shading=shading, import_pack_images=True, import_scene_as_collection=True, import_point_as_pointcloud=True, loglevel=50)
        created = set(scene.objects) - before
        shared_images = share_images(set(bpy.data.images) - images_before, image_cache)
        if assembly:
            triangles = sum(len(polygon.vertices) - 2 for obj in created if obj.type == 'MESH' for polygon in obj.data.polygons)
            if triangles != zone['triangles']:
                raise ValueError('Assembly triangle mismatch: ' + zone['id'])
        else:
            detail = json.loads((package / zone['manifest']).read_text(encoding='utf8'))
            imported_ids = {obj.get('exportId') for obj in created}
            missing = [obj['id'] for obj in detail['objects'] if obj['id'] not in imported_ids]
            if missing:
                raise ValueError('Missing Blender identities: ' + repr(missing[:5]))
        prepare_objects(created, package)
        if zone['kind'] == 'asset-library':
            for obj in created:
                obj.hide_render = True
                obj.hide_set(True)
        report['zones'].append({'id': zone['id'], 'objects': len(created), 'sharedImages': shared_images, 'verifiedTriangles' if assembly else 'verifiedIdentities': triangles if assembly else len(detail['objects'])})
        print('BLENDER_ZONE ' + json.dumps(report['zones'][-1]), flush=True)
    prepare_scene(scene, package)
    report['status'] = 'selected-zones' if zone_ids else 'complete'
    report['objects'] = len(scene.objects)
    scene['completeExport'] = json.dumps(report)
    text = bpy.data.texts.new('Complete Export Report')
    text.write(json.dumps(report, indent=2))
    if save:
        bpy.ops.wm.save_as_mainfile(filepath=str(package / ('selected-zones.blend' if zone_ids else 'complete-kingdom.blend')), compress=True, copy=True)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--package', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--zone', action='append')
    parser.add_argument('--no-save', action='store_true')
    parser.add_argument('--assembly', action='store_true')
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    print(json.dumps(import_package(arguments.package.resolve(), arguments.zone, not arguments.no_save, arguments.assembly), indent=2))
