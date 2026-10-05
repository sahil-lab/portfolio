import bpy
import math
import json
import re
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
DESIGNS = [
    ('donut', 'd96f91', 'efa1b5', 5.55), ('gelato', '78bca9', 'efbc78', 5.65),
    ('tea', '669a9e', 'd89c6d', 6.7), ('tart', 'ce83a1', 'adc480', 5.95),
    ('coffee', '527e81', 'd6a26d', 6.4), ('cotton', '91b9d4', 'e9adc9', 5.8),
    ('prism', '69a7a6', 'a4cde1', 6.45), ('glider', 'c97965', '8aaeb9', 6.1),
    ('kite', '90af78', 'e4a272', 6.8),
]


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def linear_color(color):
    channels = [int(color[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    return tuple(value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in channels)


def build_signature(design):
    theme, paint_color, accent_color, roof_height = design
    name = 'Signature Collectible ' + theme
    assert bpy.data.scenes.get(name) is None, 'Inspect an existing study before rebuilding it: ' + name
    scene = bpy.data.scenes.new(name)
    scene['signatureOwner'] = theme
    scene['status'] = 'building-unverified'
    bpy.context.window.scene = scene
    parts, images = [], {}

    def group(label, location=(0, 0, 0), owner=None):
        obj = bpy.data.objects.new(theme + '_' + label, None)
        scene.collection.objects.link(obj)
        obj['runtimeName'] = label
        obj.location = location
        obj.parent = owner
        return obj

    root = group('Signature_Root')
    root['signatureTheme'] = theme
    root['signatureVersion'] = 1
    architecture = group('Signature_Architecture', (0, 2, 0), root)
    hero = group('Signature_Hero', (0, 2, 0), root)
    group('Signature_SignAnchor', (0, -1.78, 4.38), root)

    def material(label, color, family='ceramic', metallic=.02, roughness=.6, emission=0):
        mat = bpy.data.materials.new(theme + '_' + label)
        mat.use_nodes = True
        shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        tint = (*linear_color(color), 1)
        shader.inputs['Base Color'].default_value = tint
        shader.inputs['Metallic'].default_value = metallic
        shader.inputs['Roughness'].default_value = roughness
        shader.inputs['Coat Weight'].default_value = .18 if family == 'ceramic' else .04
        shader.inputs['Coat Roughness'].default_value = .38
        shader.inputs['Emission Color'].default_value = tint
        shader.inputs['Emission Strength'].default_value = emission
        mat['runtimeName'] = label
        mat['signatureColor'] = list(tint)
        if family:
            mat['signatureSurface'] = family
            uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
            uv.uv_map = 'DetailUV'
            for channel in ['color', 'roughness', 'normal']:
                key = family + '-' + channel
                if key not in images:
                    image = bpy.data.images.load(PROJECT + '/public/assets/premium-v1/' + key + '.png', check_existing=False)
                    if channel != 'color':
                        image.colorspace_settings.name = enum_value(image.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
                    image.pack()
                    images[key] = image
                texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
                texture.image = images[key]
                mat.node_tree.links.new(uv.outputs['UV'], texture.inputs['Vector'])
                if channel == 'normal':
                    normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
                    normal.uv_map = 'DetailUV'
                    normal.inputs['Strength'].default_value = .28
                    mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
                    mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
                elif channel == 'roughness':
                    multiply = mat.node_tree.nodes.new('ShaderNodeMath')
                    multiply.operation = enum_value(multiply.bl_rna.properties, 'operation', 'MULTIPLY')
                    multiply.inputs[1].default_value = roughness
                    mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[0])
                    mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Roughness'])
                else:
                    multiply = mat.node_tree.nodes.new('ShaderNodeMixRGB')
                    multiply.blend_type = enum_value(multiply.bl_rna.properties, 'blend_type', 'MULTIPLY')
                    multiply.inputs[0].default_value = 1
                    multiply.inputs[2].default_value = tint
                    mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[1])
                    mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Base Color'])
        return mat

    paint = material('Signature_Paint', paint_color)
    accent = material('Signature_Accent', accent_color)
    pearl = material('Signature_Porcelain', 'eef2e7')
    wood = material('Signature_Timber', '916753', 'timber', .01, .67)
    metal = material('Signature_Metal', 'd9b775', 'brushed', .65, .42)
    ink = material('Signature_Ink', '29444c', None, 0, .82)
    crust = material('Signature_Product', 'd1a15f', 'stone', .01, .82)
    leaf = material('Signature_Leaf', '629b76', None, 0, .85)
    light = material('Signature_Light', 'ffe0a0', None, 0, .5, .3)

    def finish(obj, label, location, mat, owner=None):
        obj.name = theme + '_' + label + '_' + str(len(parts))
        obj['shopPart'] = label
        obj.location = location
        obj.parent = owner or architecture
        obj.data.materials.append(mat)
        parts.append(obj)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        return obj

    def box(label, location, size, mat, radius=.055, owner=None):
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj = bpy.context.object
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, label, location, mat, owner)
        bevel = obj.modifiers.new('Crafted edges', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'BEVEL'))
        bevel.width = min(radius, min(size) * .4)
        bevel.segments = 2
        bevel.harden_normals = True
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        normal = obj.modifiers.new('Corner normals', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'WEIGHTED_NORMAL'))
        normal.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normal.name)
        return obj

    def orb(label, location, scale, mat, owner=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
        obj = bpy.context.object
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        return finish(obj, label, location, mat, owner)

    def cylinder(label, location, radius, depth, mat, owner=None, front=False, vertices=24):
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
        obj = finish(bpy.context.object, label, location, mat, owner)
        if front:
            obj.rotation_euler.x = math.pi / 2
        return obj

    def ring(label, location, radius, thickness, mat, owner=None, front=True):
        bpy.ops.mesh.primitive_torus_add(major_segments=40, minor_segments=8, major_radius=radius, minor_radius=thickness)
        obj = finish(bpy.context.object, label, location, mat, owner)
        if front:
            obj.rotation_euler.x = math.pi / 2
        return obj

    def tube(label, coordinates, radius, mat, owner=None, closed=False):
        curve = bpy.data.curves.new(theme + label, enum_value(bpy.data.curves.bl_rna.functions['new'].parameters, 'type', 'CURVE'))
        curve.dimensions = enum_value(curve.bl_rna.properties, 'dimensions', '3D')
        curve.resolution_u = 6
        curve.bevel_depth = radius
        curve.bevel_resolution = 2
        curve.use_fill_caps = True
        spline = curve.splines.new(enum_value(curve.splines.bl_rna.functions['new'].parameters, 'type', 'BEZIER'))
        spline.bezier_points.add(len(coordinates) - 1)
        spline.use_cyclic_u = closed
        for point, coordinate in zip(spline.bezier_points, coordinates):
            point.co = coordinate
            point.handle_left_type = enum_value(point.bl_rna.properties, 'handle_left_type', 'AUTO')
            point.handle_right_type = enum_value(point.bl_rna.properties, 'handle_right_type', 'AUTO')
        obj = bpy.data.objects.new(theme + label, curve)
        scene.collection.objects.link(obj)
        for other in scene.objects:
            other.select_set(False)
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target=enum_value(bpy.ops.object.convert.get_rna_type().properties, 'target', 'MESH'))
        return finish(bpy.context.object, label, (0, 0, 0), mat, owner)

    def beam(label, start, end, thickness, mat):
        direction = Vector(end) - Vector(start)
        obj = box(label, (Vector(start) + Vector(end)) * .5, (thickness, thickness, direction.length), mat)
        obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
        return obj

    def arch(label, horizontal, forward, bottom, width, height, thickness, mat):
        coordinates = [(horizontal - width / 2, forward, bottom), (horizontal - width / 2, forward, bottom + height * .62)]
        coordinates.extend((horizontal + math.cos(math.pi - index / 12 * math.pi) * width / 2, forward, bottom + height * .62 + math.sin(index / 12 * math.pi) * height * .38) for index in range(13))
        coordinates.append((horizontal + width / 2, forward, bottom))
        return tube(label, coordinates, thickness, mat)

    def dome(label, location, scale, mat):
        vertices = [(0, 0, scale[2])]
        faces = []
        for latitude in range(1, 13):
            angle = latitude / 12 * math.pi / 2
            for segment in range(32):
                around = segment / 32 * math.tau
                vertices.append((math.sin(angle) * math.cos(around) * scale[0], math.sin(angle) * math.sin(around) * scale[1], math.cos(angle) * scale[2]))
        for segment in range(32):
            faces.append((0, 1 + segment, 1 + (segment + 1) % 32))
        for latitude in range(11):
            for segment in range(32):
                first = 1 + latitude * 32 + segment
                following = 1 + latitude * 32 + (segment + 1) % 32
                faces.append((first, first + 32, following + 32, following))
        mesh = bpy.data.meshes.new(label)
        mesh.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new(label, mesh)
        scene.collection.objects.link(obj)
        finish(obj, label, location, mat)
        for other in scene.objects:
            other.select_set(False)
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        solid = obj.modifiers.new('Roof shell', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'SOLIDIFY'))
        solid.thickness = .14
        bpy.ops.object.modifier_apply(modifier=solid.name)
        return obj

    box('Shared_Foundation', (0, 0, .17), (10.6, 7.35, .34), pearl, .15)
    box('Shared_BackWall', (0, 3.3, 2.6), (10, .24, 5.15), paint)
    for side in [-1, 1]:
        box('Shared_SideWall', (side * 4.9, .1, 2.6), (.25, 6.5, 5.15), paint)
        box('Shared_ServiceCounter', (side * 3.05, -2.35, .82), (3.45, 1.2, 1.3), paint, .15)
        box('Shared_CounterStone', (side * 3.05, -2.4, 1.52), (3.65, 1.35, .15), pearl, .07)
        box('Shared_BackShelf', (side * 3.1, 2.7, 1.75), (3.4, .68, .16), wood)
        box('Shared_BackShelf', (side * 3.1, 2.7, 3.04), (3.4, .68, .16), wood)
    for horizontal in [-4.7, -1, 1, 4.7]:
        box('Shared_FrontPost', (horizontal, -3.05, 2.5), (.24, .3, 4.65), pearl)
    box('Shared_EntryHeader', (0, -3.05, 3.56), (2.15, .36, .28), pearl)
    for side in [-1, 1]:
        cylinder('Shared_PendantShade', (side * 2.8, -.7, 4.18), .36, .25, metal)
        cylinder('Shared_PendantGlow', (side * 2.8, -.7, 4.04), .29, .04, light)
        cylinder('Shared_PendantStem', (side * 2.8, -.7, 4.65), .027, .7, ink)

    if theme == 'donut':
        box('Glaze_PillowRoof', (0, 0, 5.25), (10.75, 7.45, .6), pearl, .28)
        for side in [-1, 1]:
            arch('Round_DisplayBay', side * 3.03, -3.12, .6, 3.5, 3.58, .17, accent)
        box('Glaze_Conveyor', (-2.9, -2.55, 1.67), (3.3, .76, .18), metal)
        for index in range(7):
            ring('Glaze_FreshDonut', (-4.15 + index * .41, -2.5, 1.85), .15, .07, crust, front=False)
        for index in range(5):
            cylinder('Glaze_MixingVat', (2 + index * .52, 2.1, 2.15), .19, .56, accent)
        ring('Donut_GoldenDough', (0, 0, 0), 1.65, .58, crust, hero)
        ring('Donut_GlazeRibbon', (0, -.18, 0), 1.65, .46, accent, hero)
        for index in range(28):
            angle = index / 28 * math.tau
            sprinkle = box('Donut_Sprinkle', (math.cos(angle) * 1.65, -.64, math.sin(angle) * 1.65), (.06, .06, .2), pearl if index % 2 else metal, .018, hero)
            sprinkle.rotation_euler.y = angle * 2
    elif theme == 'gelato':
        box('Gelato_CurvedCornice', (0, 0, 5.25), (10.6, 7.3, .35), pearl, .15)
        for index in range(9):
            canopy = box('Fan_Canopy', (-4.6 + index * 1.15, -2.3, 5.43), (1.16, 3.1, .25), accent if index % 2 else pearl, .11)
            canopy.rotation_euler.y = (index - 4) * .025
        box('Gelato_ServiceIsland', (-3.1, -2.3, 1.7), (3.65, 1.15, .23), metal)
        for index in range(8):
            cylinder('Scoop_Well', (-4.2 + index % 4 * .73, -2.57 + index // 4 * .53, 1.86), .27, .12, ink)
            orb('Gelato_FlavorMound', (-4.2 + index % 4 * .73, -2.57 + index // 4 * .53, 1.92), (.22, .22, .11), accent if index % 2 else pearl)
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.08, radius2=1.0, depth=2.7)
        finish(bpy.context.object, 'Gelato_WaffleCone', (0, 0, -.85), crust, hero)
        for level in range(4):
            ring('Gelato_WaffleBand', (0, 0, -1.65 + level * .56), .3 + level * .19, .04, metal, hero, False)
        for location, scale, mat in [((-.48, 0, .85), (.98, .9, .93), accent), ((.5, .15, .85), (.97, .88, .95), pearl), ((0, .05, 1.83), (.83, .78, .83), paint)]:
            orb('Gelato_Scoop', location, scale, mat, hero)
    elif theme == 'tea':
        for side in [-1, 1]:
            roof = box('Tea_FoldedRoof', (side * 2.55, 0, 5.93), (5.75, 7.65, .22), accent)
            roof.rotation_euler.y = side * .26
            for forward in [-3.35, 3.1]:
                beam('Tea_TimberPortal', (side * 4.75, forward, .25), (side * 4.75, forward, 5.12), .24, wood)
                beam('Tea_TimberPortal', (side * 4.75, forward, 5.1), (0, forward, 6.65), .24, wood)
            for slat in range(10):
                box('Tea_ShojiLattice', (side * 3 + (slat - 4.5) * .3, -3.1, 2.42), (.035, .06, 1.55), wood, .008)
            orb('Paper_Lantern', (side * 4.12, -3.1, 3.86), (.39, .38, .58), pearl)
            box('Ceremony_Tray', (side * 3.0, -2.5, 1.7), (2.25, .7, .09), wood)
            for cup in range(4):
                cylinder('Tea_TastingCup', (side * 3 - .7 + cup * .46, -2.5, 1.91), .15, .31, pearl)
        orb('Tea_PorcelainPot', (0, 0, 0), (1.5, 1.22, 1.1), pearl, hero)
        cylinder('Tea_Lid', (0, 0, 1.09), .82, .16, accent, hero)
        orb('Tea_LidKnob', (0, 0, 1.34), (.19, .19, .17), metal, hero)
        ring('Tea_LoopHandle', (-1.53, 0, .1), .79, .14, wood, hero)
        tube('Tea_CurvedSpout', [(1, 0, -.1), (1.8, 0, .2), (2.27, 0, .99)], .21, pearl, hero)
    elif theme == 'tart':
        for index in range(10):
            angle = index / 10 * math.tau
            petal = orb('Petal_RoofShell', (math.cos(angle) * 3.25, math.sin(angle) * 2.25, 5.45), (2.2, 1.8, .49), accent if index % 2 else pearl)
            petal.rotation_euler.z = angle
        for side in [-1, 1]:
            box('Tart_OrchardBox', (side * 4.7, -2.8, .74), (.48, .86, .92), wood)
            for level in range(3):
                cylinder('Pastry_Tier', (side * 3.02, -2.25, 1.76 + level * .4), .8 - level * .18, .07, pearl)
                for item in range(5):
                    angle = item / 5 * math.tau
                    orb('Tart_DisplayBerry', (side * 3.02 + math.cos(angle) * (.6 - level * .18), -2.25 + math.sin(angle) * (.6 - level * .18), 1.9 + level * .4), (.13, .13, .17), accent)
        cylinder('Tart_FlutedCrust', (0, 0, -.3), 1.72, .65, crust, hero)
        cylinder('Tart_Custard', (0, 0, .08), 1.53, .13, pearl, hero)
        for index in range(24):
            angle = index / 24 * math.tau
            cylinder('Tart_CrustFlute', (math.cos(angle) * 1.7, math.sin(angle) * 1.7, -.3), .1, .65, crust, hero, vertices=12)
        for index in range(9):
            angle = index / 9 * math.tau
            orb('Tart_FruitCrown', (math.cos(angle) * 1.13, math.sin(angle) * 1.13, .45), (.37, .35, .46), accent, hero)
    elif theme == 'coffee':
        dome('Coffee_CopperVault', (0, 0, 5.13), (5.23, 3.64, 1.29), metal)
        for side in [-1, 1]:
            arch('Coffee_ArchWindow', side * 3.05, -3.13, .5, 3.4, 3.68, .16, wood)
        cylinder('Roaster_Drum', (-2.95, 1.76, 2.24), .75, 1.38, metal, front=True)
        ring('Roaster_InspectionRim', (-2.95, 1.02, 2.24), .52, .08, ink)
        for index in range(3):
            cylinder('Bean_Silo', (1.93 + index * .8, 2, 2.85), .3, 1.88, metal)
            cylinder('Bean_DosingHandle', (1.93 + index * .8, 1.63, 2.21), .08, .34, ink, front=True)
        for index in range(6):
            cylinder('Coffee_TastingCup', (-4 + index * .43, -2.5, 1.94), .14, .31, pearl)
        cylinder('Coffee_CupBody', (0, 0, -.15), 1.2, 2.55, pearl, hero)
        cylinder('Coffee_InsulatingSleeve', (0, 0, -.28), 1.23, 1.08, accent, hero)
        cylinder('Coffee_FittedLid', (0, 0, 1.23), 1.36, .24, metal, hero)
        box('Coffee_SipPort', (0, -.73, 1.39), (.6, .27, .045), ink, .04, hero)
        for index in range(12):
            angle = index / 12 * math.tau
            cylinder('Coffee_SleeveRib', (math.cos(angle) * 1.23, math.sin(angle) * 1.23, -.28), .035, .94, pearl, hero, vertices=8)
    elif theme == 'cotton':
        for index in range(7):
            orb('Cloud_Canopy', (-4.15 + index * 1.38, -1.3, 5.22), (1.25, 2.2, .57), pearl if index % 2 else accent)
        for side in [-1, 1]:
            cylinder('Sugar_SpinBowl', (side * 3.03, -2.2, 1.88), .76, .4, metal)
            cylinder('Sugar_Spinner', (side * 3.03, -2.2, 2.18), .17, .3, ink)
            tube('Sugar_PipeLoop', [(side * 4.3, 2.7, 1), (side * 4.3, 2.7, 4.1), (side * 2, 2.7, 4.1), (side * 2, 2.7, 2.8)], .1, metal)
            for jar in range(4):
                cylinder('Sugar_FlavorJar', (side * 3 - .72 + jar * .48, 2.6, 1.99), .16, .44, accent if jar % 2 else pearl)
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.03, radius2=.64, depth=2.3)
        finish(bpy.context.object, 'Cotton_PaperCone', (0, 0, -1.15), pearl, hero)
        for index in range(9):
            angle = index * 2.399
            orb('Cotton_SpunSugar', (math.cos(angle) * .48, math.sin(angle) * .4, .05 + index * .18), (.82, .73, .84), accent if index % 3 else pearl, hero)
    elif theme == 'prism':
        for side in [-1, 1]:
            roof = box('Optics_PrismRoof', (side * 2.6, 0, 5.63), (5.8, 7.35, .22), metal)
            roof.rotation_euler.y = side * .22
            cylinder('Prism_LightColumn', (side * 4.62, -2.86, 2.62), .36, 4.82, accent, vertices=6)
            for index in range(3):
                ring('Optics_LensWall', (side * 3.05, 2.92, 2.01 + index * .79), .31, .065, metal)
                cylinder('Optics_DisplayLens', (side * 3.05, 2.95, 2.01 + index * .79), .26, .035, accent, front=True)
            box('Lens_AssemblyBench', (side * 3.05, -2.25, 1.74), (3.3, .85, .16), wood)
            for index in range(4):
                cylinder('Optics_LensCell', (side * 3.05 - .83 + index * .55, -2.25, 1.92), .19, .16, metal)
        telescope = cylinder('Optics_Telescope', (0, 0, 0), 1.02, 3.25, accent, hero)
        telescope.rotation_euler.y = -.48
        direction = Vector((0, 0, 1))
        direction.rotate(telescope.rotation_euler)
        lens = cylinder('Optics_Lens', direction * 1.69, .96, .08, ink, hero)
        lens.rotation_euler = telescope.rotation_euler.copy()
        for distance in [-1.4, -.35, 1.4]:
            collar = ring('Optics_MachinedCollar', direction * distance, 1.04, .075, metal, hero, False)
            collar.rotation_euler = telescope.rotation_euler.copy()
    elif theme == 'glider':
        for side in [-1, 1]:
            roof = box('Hangar_FoldedRoof', (side * 2.6, 0, 5.57), (5.82, 7.7, .2), paint if side < 0 else pearl)
            roof.rotation_euler.y = side * .17
            for forward in [-3.12, -.9, 1.3, 3.24]:
                beam('Hangar_Lattice', (side * 4.65, forward, 4.98), (0, forward, 6.1), .12, metal)
                beam('Hangar_Lattice', (side * 4.65, forward, 4.98), (side * 4.65, forward, .32), .16, metal)
            box('Fold_CuttingTable', (side * 2.97, -2.2, 1.78), (3.38, 1.06, .16), wood)
            for index in range(4):
                cradle = box('Wing_DisplayCradle', (side * 3 + (index - 1.5) * .59, 2.56, 2.18), (.44, .58, .2), pearl)
                cradle.rotation_euler.y = .14
                horizontal = side * 3 + (index - 1.5) * .59
                orb('Wing_DisplayFuselage', (horizontal, 2.56, 2.37), (.055, .32, .055), wood)
                box('Wing_DisplayAirfoil', (horizontal, 2.56, 2.39), (.48, .14, .035), accent, .01)
                box('Wing_DisplayTail', (horizontal, 2.8, 2.4), (.16, .09, .025), metal, .008)
        orb('Glider_Fuselage', (0, 0, 0), (.34, 2.15, .33), pearl, hero)
        for side in [-1, 1]:
            wing = box('Glider_FoldedWing', (side * 1.3, 0, .13), (2.7, 1.32, .11), accent, .04, hero)
            wing.rotation_euler.z = side * .18
            wing.rotation_euler.y = -side * .075
        box('Glider_Tailplane', (0, 1.58, .29), (1.5, .62, .1), metal, .035, hero)
        box('Glider_Rudder', (0, 1.5, .56), (.08, .63, .7), accent, .03, hero)
    else:
        for side in [-1, 1]:
            for index in range(5):
                forward = -3.65 + index / 4 * 7.3
                tube('Kite_RibCanopy', [(side * (5.15 - step / 8 * 5.1), forward, 5.2 + .85 * math.sin(index / 4 * math.pi) + .65 * (step / 8) ** 2) for step in range(9)], .075, wood)
            vertices, faces = [], []
            for across in range(17):
                for along in range(13):
                    span, depth = across / 16, along / 12
                    vertices.append((side * (.05 + span * 5.1), -3.65 + depth * 7.3, 5.2 + .85 * math.sin(depth * math.pi) + .65 * (1 - span) ** 2 + .3 * math.sin(span * math.pi) * math.sin(depth * math.pi)))
                    if across < 16 and along < 12:
                        corner = across * 13 + along
                        faces.append((corner, corner + 13, corner + 14, corner + 1) if side > 0 else (corner + 1, corner + 14, corner + 13, corner))
            mesh = bpy.data.meshes.new('Curved Kite Canopy')
            mesh.from_pydata(vertices, [], faces)
            roof = bpy.data.objects.new('Curved Kite Canopy', mesh)
            scene.collection.objects.link(roof)
            finish(roof, 'Kite_SailRoof', (0, 0, 0), accent if side < 0 else pearl)
            box('Sail_CuttingTable', (side * 3, -2.18, 1.8), (3.4, 1.05, .12), wood)
            for index in range(6):
                cylinder('Ribbon_SpoolWall', (side * 3 + (index % 3 - 1) * .66, 2.66, 2.08 + index // 3 * .8), .22, .32, accent if index % 2 else pearl, front=True)
        vertices = [(0, 0, 1.9), (1.4, 0, .1), (0, -.22, .1), (0, 0, -1.65), (-1.4, 0, .1)]
        mesh = bpy.data.meshes.new('Sculpted Kite Sail')
        mesh.from_pydata(vertices, [], [(0, 2, 1), (1, 2, 3), (3, 2, 4), (4, 2, 0)])
        obj = bpy.data.objects.new('Sculpted Kite Sail', mesh)
        scene.collection.objects.link(obj)
        finish(obj, 'Kite_FoldedSail', (0, 0, 0), accent, hero)
        tube('Kite_RibbonTail', [(0, 0, -1.65), (.5, 0, -2.1), (-.35, 0, -2.55), (.18, 0, -2.95)], .055, pearl, hero)
        tube('Kite_Spar', [(0, -.04, -1.65), (0, -.04, 1.9)], .035, metal, hero)
        tube('Kite_Spar', [(-1.4, -.04, .1), (1.4, -.04, .1)], .035, metal, hero)

    for side in [-1, 1]:
        for index in range(4):
            box('Shared_PresentationBox', (side * 3.1 - .78 + index * .52, 2.67, 3.33), (.4, .44, .44), pearl if index % 2 else accent)
    bpy.context.view_layer.update()
    hero_parts = [obj for obj in parts if obj.parent == hero]
    lowest = min((obj.matrix_local @ vertex.co).z for obj in hero_parts for vertex in obj.data.vertices)
    hero.location.z = roof_height + .15 - lowest
    box('Shared_RooftopMount', (0, 0, roof_height + .035), (1.8, 1.1, .23), metal, .09)
    root['signatureDetails'] = json.dumps([obj['shopPart'] for obj in parts])
    for obj in parts:
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name='SurfaceUV')
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'EDIT'))
    bpy.ops.mesh.select_all(action=enum_value(bpy.ops.mesh.select_all.get_rna_type().properties, 'action', 'SELECT'))
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.002)
    bpy.ops.object.mode_set(mode=enum_value(bpy.ops.object.mode_set.get_rna_type().properties, 'mode', 'OBJECT'))
    triangles = 0
    for obj in parts:
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
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    scene['triangles'] = triangles
    scene['status'] = 'modeled-awaiting-export-check'
    assert 8000 < triangles < 65000, (theme, triangles)
    properties = bpy.ops.export_scene.gltf.get_rna_type().properties
    options = dict(filepath=PROJECT + '/assets/signature-candidates/' + theme + '.raw.glb', use_active_scene=True,
                   use_selection=False, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
    try:
        bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
    except TypeError as error:
        match = re.search(r'not found in (\([^)]*\))', str(error))
        if not match:
            raise
        formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
        bpy.ops.export_scene.gltf(export_format=next(identifier for identifier in formats if identifier == 'GLB'), **options)
    scene['status'] = 'exported-awaiting-independent-review'
    print('SIGNATURE_EXPORTED', theme, triangles, len(parts))
    return scene


for design in DESIGNS:
    build_signature(design)
