import bpy
import math
import json
import re

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
THEMES = ['donut', 'gelato', 'tea', 'tart', 'coffee', 'cotton', 'prism', 'glider', 'kite']


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def refine_signature(theme):
    scene = bpy.data.scenes['Signature Collectible ' + theme]
    assert not scene.get('displayDetailRevision')
    bpy.context.window.scene = scene
    architecture = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Architecture')
    root = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Root')
    materials = {mat['runtimeName']: mat for obj in scene.objects if obj.type == 'MESH' for mat in obj.data.materials}
    paint, pearl, metal, wood, ink, accent = [materials[key] for key in ['Signature_Paint', 'Signature_Porcelain', 'Signature_Metal', 'Signature_Timber', 'Signature_Ink', 'Signature_Accent']]

    def add(label, location, size, mat, shape='box', rotation=None):
        if shape == 'orb':
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1)
        elif shape == 'ring':
            bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=8, major_radius=1, minor_radius=.18)
        elif shape == 'cone':
            bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=.03, radius2=1, depth=2)
        elif shape == 'cylinder':
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=2)
        else:
            bpy.ops.mesh.primitive_cube_add(size=1)
        obj = bpy.context.object
        obj.name = theme + '_' + label + '_' + str(len(scene.objects))
        obj['shopPart'] = label
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.location = location
        obj.parent = architecture
        obj.data.materials.append(mat)
        if shape == 'box':
            bevel = obj.modifiers.new('Display detail edges', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'BEVEL'))
            bevel.width = min(.025, min(size) * .3)
            bevel.segments = 2
            bpy.ops.object.modifier_apply(modifier=bevel.name)
            for polygon in obj.data.polygons:
                polygon.use_smooth = False
        else:
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
        if rotation:
            obj.rotation_euler = rotation
        return obj

    for side in [-1, 1]:
        add('Detail_SideDado', (side * 5.055, .07, .73), (.065, 6.15, .76), wood if theme in ['tea', 'coffee', 'glider'] else pearl)
        add('Detail_SideTrim', (side * 5.09, .07, 1.14), (.075, 6.15, .09), metal)
        for index in range(5):
            add('Detail_CounterFlute', (side * 3.05 + (index - 2) * .55, -2.967, .82), (.035, .035, 1.0), pearl)
        add('Detail_CounterKick', (side * 3.05, -2.985, .32), (3.4, .06, .14), metal)

    if theme == 'donut':
        for obj in scene.objects:
            if obj.get('shopPart') == 'Glaze_MixingVat':
                obj.location.y = -2.45
        for index in range(4):
            add('Glaze_Nozzle', (2.1 + index * .54, -2.45, 2.55), (.085, .085, .13), metal, 'cylinder')
    elif theme == 'gelato':
        add('Gelato_ConeRack', (3, -2.4, 1.79), (2.65, .6, .16), metal)
        for index in range(6):
            add('Gelato_StackedCone', (1.95 + index * .42, -2.4, 2.1), (.17, .17, .37), materials['Signature_Product'], 'cone')
    elif theme == 'tea':
        for index in range(4):
            add('Tea_LacquerTin', (-3.8 + index * .5, -2.03, 2.2), (.18, .18, .31), paint, 'cylinder')
            add('Tea_TinLid', (-3.8 + index * .5, -2.03, 2.53), (.2, .2, .045), metal, 'cylinder')
        add('Tea_ServingPot', (3.7, -2.05, 2.1), (.36, .3, .3), pearl, 'orb')
        add('Tea_ServingHandle', (3.32, -2.05, 2.1), (.23, .23, .23), wood, 'ring', (math.pi / 2, 0, 0))
        add('Tea_ServingSpout', (4.04, -2.05, 2.17), (.28, .11, .12), pearl, 'orb')
    elif theme == 'tart':
        for side in [-1, 1]:
            add('Tart_FruitCrate', (side * 4.5, -2.65, 1.75), (.62, .58, .24), wood)
            for index in range(4):
                add('Tart_CrateFruit', (side * 4.5 + (index % 2 - .5) * .24, -2.65 + (index // 2 - .5) * .23, 1.96), (.12, .12, .15), accent, 'orb')
    elif theme == 'coffee':
        add('Coffee_EspressoMachine', (3.02, -2.17, 2.27), (2.05, .62, 1.12), metal)
        add('Coffee_DripTray', (3.02, -2.67, 1.8), (2.2, .63, .12), ink)
        for side in [-1, 1]:
            add('Coffee_GroupHead', (3.02 + side * .55, -2.56, 2.15), (.22, .18, .15), ink, 'cylinder')
            add('Coffee_EspressoCup', (3.02 + side * .55, -2.64, 1.98), (.16, .16, .15), pearl, 'cylinder')
            add('Coffee_PressureGauge', (3.02 + side * .55, -2.51, 2.57), (.14, .14, .03), pearl, 'cylinder', (math.pi / 2, 0, 0))
    elif theme == 'cotton':
        for side in [-1, 1]:
            add('Sugar_SpinRim', (side * 3.03, -2.2, 2.1), (.7, .7, .38), pearl, 'ring')
            for index in range(3):
                add('Sugar_ServingStick', (side * 3.03 + (index - 1) * .48, -2.8, 2.03), (.025, .025, .35), wood, 'cylinder')
                add('Sugar_FinishedFloss', (side * 3.03 + (index - 1) * .48, -2.8, 2.45), (.2, .18, .31), accent, 'orb')
    elif theme == 'prism':
        for index in range(3):
            add('Optics_FinishedScope', (2.2 + index * .8, -2.2, 2.04), (.22, .22, .43), paint, 'cylinder', (math.pi / 2, 0, 0))
            add('Optics_ScopeLensRim', (2.2 + index * .8, -2.65, 2.04), (.22, .22, .22), metal, 'ring', (math.pi / 2, 0, 0))
    elif theme == 'glider':
        for obj in scene.objects:
            if obj.get('shopPart') in ['Wing_DisplayFuselage', 'Wing_DisplayAirfoil', 'Wing_DisplayTail', 'Wing_DisplayCradle']:
                obj.location.y -= 4.86
                obj.location.z -= .38
    else:
        sail = next(obj for obj in scene.objects if obj.get('shopPart') == 'Kite_FoldedSail')
        for side in [-1, 1]:
            for index in range(3):
                obj = sail.copy()
                obj.data = sail.data.copy()
                obj.name = 'kite_Kite_DisplaySail_' + str(side) + '_' + str(index)
                obj['shopPart'] = 'Kite_DisplaySail'
                scene.collection.objects.link(obj)
                obj.parent = architecture
                obj.location = (side * 3 + (index - 1) * .67, -2.33, 2.17)
                obj.scale = (.19, .19, .19)
                add('Kite_DisplayStand', (side * 3 + (index - 1) * .67, -2.3, 1.79), (.34, .35, .1), wood)

    meshes = [obj for obj in scene.objects if obj.type == 'MESH']
    for obj in meshes:
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name='ContactUV')
        obj.data.uv_layers[0].name = 'ContactUV'
        obj.data.uv_layers.active_index = 0
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'EDIT'))
    bpy.ops.mesh.select_all(action=enum_value(bpy.ops.mesh.select_all.get_rna_type().properties, 'action', 'SELECT'))
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.002)
    bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'OBJECT'))
    triangles = 0
    for obj in meshes:
        uv = obj.data.uv_layers.get('DetailUV') or obj.data.uv_layers.new(name='DetailUV')
        for polygon in obj.data.polygons:
            components = [abs(value) for value in polygon.normal]
            axis = components.index(max(components))
            horizontal, vertical = (1, 2) if axis == 0 else (0, 2) if axis == 1 else (0, 1)
            for loop in polygon.loop_indices:
                point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
                uv.data[loop].uv = (point[horizontal] * .65, point[vertical] * .65)
        obj.data.uv_layers.active_index = 0
        obj.data.uv_layers[0].active_render = True
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    assert triangles < 65000
    root['signatureDetails'] = json.dumps([obj['shopPart'] for obj in meshes])
    scene['displayDetailRevision'] = 1
    scene['status'] = 'details-built-awaiting-export'
    scene['triangles'] = triangles
    properties = bpy.ops.export_scene.gltf.get_rna_type().properties
    options = dict(filepath=PROJECT + '/assets/signature-candidates/' + theme + '.raw.glb', use_active_scene=True, use_selection=False, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
    try:
        bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
    except TypeError as error:
        match = re.search(r'not found in (\([^)]*\))', str(error))
        if not match:
            raise
        formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
        bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
    scene['status'] = 'exported-awaiting-independent-review'
    print('SIGNATURE_DETAILS_EXPORTED', theme, triangles)


for theme in THEMES:
    refine_signature(theme)
