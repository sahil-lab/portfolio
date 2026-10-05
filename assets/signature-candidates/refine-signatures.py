import bpy
import bmesh
import json
import math
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
THEMES = ['donut', 'gelato', 'tea', 'tart', 'coffee', 'cotton', 'prism', 'glider', 'kite']
ROOF_HEIGHTS = {'donut': 5.55, 'gelato': 5.65, 'tea': 6.7, 'tart': 5.95, 'coffee': 6.4, 'cotton': 5.8, 'prism': 6.45, 'glider': 6.1, 'kite': 6.8}


def roof_height(theme, horizontal, forward):
    across, along = horizontal / 5.5, forward / 3.8
    crown = math.sqrt(max(0, 1 - across * across))
    if theme == 'tea':
        return 5.38 + 1.08 * (1 - abs(across)) + .5 * abs(across) ** 8 + .16 * along * along
    if theme == 'gelato':
        return 5.3 + .68 * crown + .1 * math.cos(across * math.pi * 4) ** 2
    if theme == 'tart':
        return 5.32 + .78 * crown + .14 * math.cos(across * math.pi * 3) * math.cos(along * math.pi)
    if theme == 'coffee':
        return 5.3 + 1.05 * crown
    if theme == 'cotton':
        return 5.38 + .58 * crown + .18 * math.cos(across * math.pi * 3) * math.cos(along * math.pi * 2)
    if theme == 'prism':
        return 5.42 + .65 * max(0, 1 - abs(across) * 1.25) + .12 * along
    if theme == 'glider':
        return 5.3 + .94 * (1 - abs(across))
    if theme == 'kite':
        return 5.36 + .65 * (1 - across * across) + .24 * math.sin(along * math.pi) ** 2
    return 5.26 + .84 * crown + .14 * max(0, 1 - along * along)


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def refine_signature(theme):
    source = bpy.data.scenes['Signature Collectible ' + theme]
    name = 'Signature Atelier ' + theme
    assert bpy.data.scenes.get(name) is None, 'Inspect the existing revision before rebuilding'
    scene = bpy.data.scenes.new(name)
    scene['signatureOwner'] = theme
    scene['signatureRevision'] = 2
    scene['status'] = 'atelier-modeling'
    bpy.context.window.scene = scene
    copies, materials = {}, {}
    for original in source.objects:
        obj = original.copy()
        if original.data is not None:
            obj.data = original.data.copy()
        scene.collection.objects.link(obj)
        copies[original.name] = obj
        if obj.type == 'MESH':
            for slot in obj.material_slots:
                original_material = slot.material
                if original_material.name not in materials:
                    materials[original_material.name] = original_material.copy()
                slot.material = materials[original_material.name]
    for original in source.objects:
        copies[original.name].parent = copies.get(original.parent.name) if original.parent else None
    root = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Root')
    architecture = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Architecture')
    hero = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Hero')
    root['signatureVersion'] = 2
    finishes = {material.get('runtimeName'): material for material in materials.values()}
    paint, pearl, accent = [finishes[key] for key in ['Signature_Paint', 'Signature_Porcelain', 'Signature_Accent']]
    wood, metal = [finishes[key] for key in ['Signature_Timber', 'Signature_Metal']]
    removed = {'Shared_Foundation', 'Shared_BackWall', 'Shared_SideWall', 'Shared_FrontPost', 'Shared_EntryHeader', 'Glaze_PillowRoof', 'Round_DisplayBay', 'Gelato_CurvedCornice', 'Fan_Canopy', 'Tea_FoldedRoof', 'Tea_TimberPortal', 'Petal_RoofShell', 'Coffee_CopperVault', 'Cloud_Canopy', 'Optics_PrismRoof', 'Hangar_FoldedRoof', 'Kite_SailRoof', 'Kite_RibCanopy'}
    for obj in list(scene.objects):
        if obj.get('shopPart') in removed:
            geometry = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if geometry.users == 0:
                bpy.data.meshes.remove(geometry)

    def finish(obj, label, location, material, owner=None):
        obj.name = 'Atelier_' + theme + '_' + label
        obj['shopPart'] = label
        obj['atelierDetail'] = True
        obj.parent = owner or architecture
        obj.location = location
        obj.data.materials.append(material)
        return obj

    def bevel(obj, amount, segments=3):
        modifier = obj.modifiers.new('Soft crafted edge', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'BEVEL'))
        modifier.width = amount
        modifier.segments = segments
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        modifier = obj.modifiers.new('Face normals', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'WEIGHTED_NORMAL'))
        modifier.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        return obj

    def box(label, location, size, material, radius=.06):
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj = bpy.context.object
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, label, location, material)
        return bevel(obj, min(radius, min(size) * .35))

    def solid(label, vertices, faces, material):
        geometry = bpy.data.meshes.new(label)
        geometry.from_pydata(vertices, [], faces)
        shape = bmesh.new()
        shape.from_mesh(geometry)
        bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
        if shape.calc_volume(signed=True) < 0:
            bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
        shape.to_mesh(geometry)
        shape.free()
        obj = bpy.data.objects.new(label, geometry)
        scene.collection.objects.link(obj)
        return finish(obj, label, (0, 0, 0), material)

    def extrude(label, outline, forward, depth, material, radius=.025):
        count = len(outline)
        vertices = [(horizontal, forward + offset, height) for offset in [-depth / 2, depth / 2] for horizontal, height in outline]
        faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
        faces.extend((index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count))
        return bevel(solid(label, vertices, faces, material), radius, 2)

    def arch(label, center, radius, bottom, spring, rise, forward, depth, material):
        inner = [(center - radius, bottom), (center - radius, spring)]
        inner.extend((center + math.cos(math.pi - step / 24 * math.pi) * radius, spring + math.sin(step / 24 * math.pi) * rise) for step in range(25))
        inner.append((center + radius, bottom))
        outer = [(center + radius + .15, bottom), (center + radius + .15, spring)]
        outer.extend((center + math.cos(step / 24 * math.pi) * (radius + .15), spring + math.sin(step / 24 * math.pi) * (rise + .15)) for step in range(25))
        outer.append((center - radius - .15, bottom))
        return extrude(label, inner + outer, forward, depth, material)

    box('Stone_Foundation', (0, 0, .17), (10.65, 7.4, .34), pearl, .14)
    box('Inset_TerrazzoFloor', (0, -.05, .36), (10.12, 6.95, .09), pearl, .025)
    box('Plaster_BackWall', (0, 3.27, 2.88), (10.1, .5, 5.15), paint, .18)
    for side in [-1, 1]:
        box('Rounded_ReturnWall', (side * 4.93, .04, 2.83), (.5, 6.52, 5.06), paint, .18)
        box('Stone_Skirt', (side * 4.94, .04, .56), (.57, 6.6, .38), pearl, .07)
        for horizontal in [side * 4.84, side * 1.3]:
            top = roof_height(theme, horizontal, -3.04) - .28
            box('Facade_Pier', (horizontal, -3.04, (top + .31) / 2), (.58, .55, top - .31), wood if theme in ['tea', 'glider', 'kite'] else paint, .11)
            box('Pier_Foot', (horizontal, -3.06, .58), (.72, .68, .45), pearl, .065)
        box('Deep_DisplaySill', (side * 3.08, -3.04, 1.58), (3.35, 1.05, .2), pearl, .07)
        arch('Recessed_DisplayArch', side * 3.06, 1.42, 1.66, 2.86, 1.13, -3.27, .18, pearl)
    for center, radius, spring, rise in [(-3.06, 1.47, 2.86, 1.17), (0, 1.01, 2.68, 1.17), (3.06, 1.47, 2.86, 1.17)]:
        outline = [(center + math.cos(math.pi - step / 24 * math.pi) * radius, spring + math.sin(step / 24 * math.pi) * rise) for step in range(25)]
        outline.extend((center + radius - step / 24 * radius * 2, roof_height(theme, center + radius - step / 24 * radius * 2, -3.04) - .32) for step in range(25))
        extrude('Sculpted_ArchSpandrel', outline, -3.04, .52, paint, .045)
    arch('Entry_StonePortal', 0, 1.0, .34, 2.68, 1.17, -3.29, .2, pearl)
    vertices, faces = [], []
    across, along = 40, 24
    for layer in [0, 1]:
        for column in range(across + 1):
            for row in range(along + 1):
                horizontal, forward = (column / across * 2 - 1) * 5.5, (row / along * 2 - 1) * 3.8
                vertices.append((horizontal, forward, roof_height(theme, horizontal, forward) - layer * .35))
    layer_count = (across + 1) * (along + 1)
    for column in range(across):
        for row in range(along):
            corner = column * (along + 1) + row
            face = (corner, corner + along + 1, corner + along + 2, corner + 1)
            faces.append(face)
            faces.append(tuple(index + layer_count for index in reversed(face)))
    boundary = list(range(along + 1)) + [column * (along + 1) + along for column in range(1, across + 1)] + list(range(layer_count - 2, layer_count - along - 2, -1)) + [column * (along + 1) for column in range(across - 1, 0, -1)]
    faces.extend((boundary[index], boundary[(index + 1) % len(boundary)], boundary[(index + 1) % len(boundary)] + layer_count, boundary[index] + layer_count) for index in range(len(boundary)))
    roof = solid('Sculpted_PatisserieRoof', vertices, faces, accent)
    for polygon in roof.data.polygons:
        polygon.use_smooth = True
    mount = next(obj for obj in scene.objects if obj.get('shopPart') == 'Shared_RooftopMount')
    offset = roof_height(theme, 0, 0) - ROOF_HEIGHTS[theme]
    mount.location.z += offset
    hero.location.z += offset
    for side in [-1, 1]:
        for drawer in range(3):
            horizontal = side * 3.03 + (drawer - 1) * .98
            box('Framed_DisplayPanel', (horizontal, -2.992, .94), (.9, .1, .68), wood, .035)
            box('Inset_DisplayPanel', (horizontal, -3.052, .94), (.74, .045, .5), accent, .025)
            box('Brass_DrawerPull', (horizontal, -3.09, 1.14), (.18, .07, .045), metal, .014)
    bpy.context.view_layer.update()
    parts = [obj for obj in scene.objects if obj.type == 'MESH']
    triangles = sum(len(polygon.vertices) - 2 for obj in parts for polygon in obj.data.polygons)
    assert triangles < 65000, (theme, triangles)
    hit = scene.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector((0, -6, 1.6)), Vector((0, 1, 0)), distance=6)
    assert not hit[0], 'The central entry must remain physically open'
    root['signatureDetails'] = json.dumps([obj.get('shopPart', obj.name) for obj in parts])
    scene['triangles'] = triangles
    scene['status'] = 'atelier-shape-review'
    print('ATELIER_SHAPE_READY', theme, len(parts), triangles)
    return scene


def detail_signature(theme):
    scene = bpy.data.scenes['Signature Atelier ' + theme]
    assert not scene.get('atelierFinishRevision'), 'The finish pass is already present'
    bpy.context.window.scene = scene
    architecture = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Architecture')
    hero = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Hero')
    root = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_Root')
    anchor = next(obj for obj in scene.objects if obj.get('runtimeName') == 'Signature_SignAnchor')
    materials = {material.get('runtimeName'): material for obj in scene.objects if obj.get('shopPart') for material in obj.data.materials}
    paint, pearl, accent, wood, metal, ink = [materials[key] for key in ['Signature_Paint', 'Signature_Porcelain', 'Signature_Accent', 'Signature_Timber', 'Signature_Metal', 'Signature_Ink']]
    product = materials.get('Signature_Product', wood)

    def tint(material, hex_value, roughness=.6):
        channels = [int(hex_value[index:index + 2], 16) / 255 for index in (0, 2, 4)]
        shade = tuple(value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in channels) + (1,)
        material['signatureColor'] = list(shade)
        material.diffuse_color = shade
        shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        shader.inputs['Base Color'].default_value = shade
        shader.inputs['Roughness'].default_value = roughness
        for node in material.node_tree.nodes:
            if node.type == 'MIX_RGB':
                node.inputs[2].default_value = shade
        return material

    palettes = {'donut': ('cf859b', 'b8d3cf'), 'gelato': ('8eac9b', 'e6c084'), 'tea': ('e2d6bb', '538d87'), 'tart': ('d397a7', 'afbf99'), 'coffee': ('77928d', 'bb8767'), 'cotton': ('a2bac8', 'dba3bd'), 'prism': ('6f9c9b', 'bdcbd0'), 'glider': ('be8e7d', '809fa5'), 'kite': ('a5b78d', 'cf927e')}
    tint(paint, palettes[theme][0])
    tint(pearl, 'e9e7d8')
    tint(wood, '705747', .68)
    roof_material = accent.copy()
    roof_material['runtimeName'] = 'Signature_RoofFinish'
    tint(roof_material, palettes[theme][1], .43)
    roof = next(obj for obj in scene.objects if obj.get('shopPart') == 'Sculpted_PatisserieRoof')
    roof.data.materials.clear()
    roof.data.materials.append(roof_material)

    def finish(obj, label, material, owner=None):
        obj.name = 'Finish_' + theme + '_' + label
        obj['shopPart'] = label
        obj['atelierDetail'] = True
        obj.parent = owner or architecture
        obj.data.materials.append(material)
        return obj

    def box(label, location, size, material, radius=.035):
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj = bpy.context.object
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        finish(obj, label, material)
        obj.location = location
        bevel = obj.modifiers.new('Fitted corner', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'BEVEL'))
        bevel.width, bevel.segments = min(radius, min(size) * .35), 2
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        normal = obj.modifiers.new('Fitted normals', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'WEIGHTED_NORMAL'))
        normal.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normal.name)
        return obj

    def orb(label, location, dimensions, material, owner=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1)
        obj = finish(bpy.context.object, label, material, owner)
        obj.location, obj.scale = location, dimensions
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        return obj

    def cylinder(label, location, radius, depth, material, front=False):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=depth)
        obj = finish(bpy.context.object, label, material)
        obj.location = location
        if front:
            obj.rotation_euler.x = math.pi / 2
        return obj

    def ring(label, location, radius, thickness, material, owner=None, front=False):
        bpy.ops.mesh.primitive_torus_add(major_segments=28, minor_segments=6, major_radius=radius, minor_radius=thickness)
        obj = finish(bpy.context.object, label, material, owner)
        obj.location = location
        if front:
            obj.rotation_euler.x = math.pi / 2
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        return obj

    def tube(label, coordinates, radius, material, owner=None):
        curve = bpy.data.curves.new(label, enum_value(bpy.data.curves.bl_rna.functions['new'].parameters, 'type', 'CURVE'))
        curve.dimensions = enum_value(curve.bl_rna.properties, 'dimensions', '3D')
        curve.bevel_depth, curve.bevel_resolution, curve.use_fill_caps = radius, 1, True
        spline = curve.splines.new(enum_value(curve.splines.bl_rna.functions['new'].parameters, 'type', 'POLY'))
        spline.points.add(len(coordinates) - 1)
        for point, coordinate in zip(spline.points, coordinates):
            point.co = (*coordinate, 1)
        obj = bpy.data.objects.new(label, curve)
        scene.collection.objects.link(obj)
        for other in scene.objects:
            other.select_set(False)
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target=enum_value(bpy.ops.object.convert.get_rna_type().properties, 'target', 'MESH'))
        return finish(bpy.context.object, label, material, owner)

    for obj in scene.objects:
        if obj.get('shopPart') == 'Facade_Pier':
            lower, upper = min(vertex.co.z for vertex in obj.data.vertices), max(vertex.co.z for vertex in obj.data.vertices)
            top = roof_height(theme, obj.location.x, obj.location.y) - .28
            for vertex in obj.data.vertices:
                vertex.co.z = .31 + (vertex.co.z - lower) / (upper - lower) * (top - .31) - obj.location.z
            obj.data.update()
    for forward in [-3.8, 3.8]:
        tube('Continuous_EaveBeading', [(horizontal, forward, roof_height(theme, horizontal, forward) - .18) for horizontal in [-5.5 + index * 11 / 48 for index in range(49)]], .065, pearl)
    for side in [-1, 1]:
        tube('Side_EaveBeading', [(side * 5.5, forward, roof_height(theme, side * 5.5, forward) - .18) for forward in [-3.8 + index * 7.6 / 24 for index in range(25)]], .065, pearl)
    for index in range(1, 10):
        horizontal = -5.5 + index * 1.1
        tube('Roof_StandingSeam', [(horizontal, forward, roof_height(theme, horizontal, forward) + .018) for forward in [-3.78 + step * 7.56 / 12 for step in range(13)]], .025 if theme not in ['tea', 'glider'] else .045, metal if theme in ['coffee', 'prism'] else pearl if theme in ['donut', 'gelato'] else wood)
    anchor.location.y, anchor.location.z = -1.33, 4.74
    back_anchor = bpy.data.objects.new('Atelier_' + theme + '_BackSignAnchor', None)
    back_anchor['runtimeName'] = 'Signature_BackSignAnchor'
    back_anchor.parent = root
    back_anchor.location = (0, 5.54, 4.74)
    scene.collection.objects.link(back_anchor)
    root['signatureLettering'] = 'facade-relief'
    vertices, faces = [], []
    for index in range(41):
        horizontal = -5.05 + index * 10.1 / 40
        for forward in [3.02, 3.52]:
            vertices.extend([(horizontal, forward, 4.9), (horizontal, forward, roof_height(theme, horizontal, forward) - .27)])
        if index < 40:
            corner = index * 4
            faces.extend([(corner, corner + 4, corner + 5, corner + 1), (corner + 2, corner + 3, corner + 7, corner + 6), (corner + 1, corner + 5, corner + 7, corner + 3), (corner, corner + 2, corner + 6, corner + 4)])
    faces.extend([(0, 1, 3, 2), (160, 162, 163, 161)])
    geometry = bpy.data.meshes.new('Fitted rear roof infill')
    geometry.from_pydata(vertices, [], faces)
    shape = bmesh.new()
    shape.from_mesh(geometry)
    bmesh.ops.recalc_face_normals(shape, faces=list(shape.faces))
    if shape.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(shape, faces=list(shape.faces))
    shape.to_mesh(geometry)
    shape.free()
    rear = bpy.data.objects.new('Fitted rear roof infill', geometry)
    scene.collection.objects.link(rear)
    finish(rear, 'Fitted_RearRoofInfill', paint)
    for side in [-1, 1]:
        for stripe in range(7):
            center = side * 3.04 - 1.49 + stripe * .495
            vertices, faces = [], []
            for across in range(3):
                for depth in range(13):
                    progress = depth / 12
                    vertices.append((center + (across / 2 - .5) * .5, -3.22 - progress * 1.02, 3.9 - .46 * progress + .14 * math.sin(progress * math.pi) + .025 * math.sin(across / 2 * math.pi)))
                    if across < 2 and depth < 12:
                        corner = across * 13 + depth
                        faces.append((corner, corner + 13, corner + 14, corner + 1))
            geometry = bpy.data.meshes.new('Tailored awning')
            geometry.from_pydata(vertices, [], faces)
            awning = bpy.data.objects.new('Tailored awning', geometry)
            scene.collection.objects.link(awning)
            finish(awning, 'Tailored_StripedAwning', accent if stripe % 2 == 0 else pearl)
            for other in scene.objects:
                other.select_set(False)
            awning.select_set(True)
            bpy.context.view_layer.objects.active = awning
            shell = awning.modifiers.new('Woven fabric thickness', enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', 'SOLIDIFY'))
            shell.thickness = .05
            bpy.ops.object.modifier_apply(modifier=shell.name)
            for polygon in awning.data.polygons:
                polygon.use_smooth = True
            orb('Scalloped_AwningHem', (center, -4.24, 3.36), (.253, .048, .14), accent if stripe % 2 == 0 else pearl)
        tube('Awning_FrontPiping', [(side * 3.04 - 1.74, -4.25, 3.43), (side * 3.04 + 1.73, -4.25, 3.43)], .035, pearl)
        for end in [-1, 1]:
            horizontal = side * 3.04 + end * 1.59
            tube('Awning_BracedSupport', [(horizontal, -3.1, 3.05), (horizontal, -4.13, 3.4), (horizontal, -3.14, 3.87)], .035, metal)
        box('Side_WindowRecess', (side * 5.196, .18, 2.92), (.055, 3.55, 2.68), ink)
        box('Side_GlazedInset', (side * 5.229, .18, 2.94), (.035, 3.22, 2.38), roof_material)
        for end in [-1, 1]:
            box('Side_WindowUpright', (side * 5.265, .18 + end * 1.69, 2.94), (.14, .13, 2.68), wood)
            box('Side_WindowRail', (side * 5.265, .18, 2.94 + end * 1.29), (.14, 3.48, .14), pearl)
        for mullion in [-.55, .55]:
            box('Side_WindowMullion', (side * 5.272, .18 + mullion, 2.94), (.12, .065, 2.5), wood)
        box('Side_WindowTransom', (side * 5.28, .18, 3.52), (.12, 3.37, .065), wood)
        cylinder('Counter_DisplayPlate', (side * 3.1, -2.48, 1.73), .52, .06, pearl)
        for horizontal in [side * 4.84, side * 1.3]:
            cylinder('Pier_PorcelainSconce', (horizontal, -3.38, 3.06), .13, .27, materials['Signature_Light'])
            cylinder('Pier_SconceCap', (horizontal, -3.38, 3.22), .16, .07, metal)
            box('Pier_SconceBracket', (horizontal, -3.28, 3.06), (.07, .3, .06), metal)
    if theme == 'donut':
        for index in range(8):
            horizontal, forward = -4.18 + index % 4 * .67, -2.75 + index // 4 * .52
            ring('Patisserie_GlazedDonut', (horizontal, forward, 1.9), .18, .075, product)
            ring('Patisserie_IcingCrown', (horizontal, forward, 1.955), .18, .04, accent if index % 2 else roof_material)
        for obj in list(scene.objects):
            if obj.get('shopPart') == 'Donut_GlazeRibbon':
                bpy.data.objects.remove(obj, do_unlink=True)
        vertices, faces = [], []
        for around in range(57):
            angle = around / 56 * math.tau
            for across in range(13):
                cross = -.05 + across / 12 * (math.pi + .1) + .12 * math.sin(angle * 7) + .05 * math.sin(angle * 11)
                radius = 1.65 + .594 * math.cos(cross)
                vertices.append((math.cos(angle) * radius, -.605 * math.sin(cross) - .025, math.sin(angle) * radius))
                if around < 56 and across < 12:
                    corner = around * 13 + across
                    faces.append((corner, corner + 13, corner + 14, corner + 1))
        geometry = bpy.data.meshes.new('Flowing glaze shell')
        geometry.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new('Flowing glaze shell', geometry)
        scene.collection.objects.link(obj)
        finish(obj, 'Donut_FlowingGlaze', accent, hero)
        for polygon in geometry.polygons:
            polygon.use_smooth = True
    elif theme == 'gelato':
        for index in range(6):
            horizontal, forward = 2.24 + index % 3 * .72, -2.65 + index // 3 * .55
            cylinder('Gelato_TastingCup', (horizontal, forward, 1.94), .2, .26, pearl)
            orb('Gelato_PipedScoop', (horizontal, forward, 2.12), (.22, .22, .19), accent if index % 2 else roof_material)
            tube('Gelato_TastingSpoon', [(horizontal + .1, forward, 2.05), (horizontal + .22, forward + .04, 2.42)], .018, metal)
    elif theme == 'tea':
        for side in [-1, 1]:
            for grid in range(5):
                box('Shoji_Lattice', (side * 5.3, .18 - 1.3 + grid * .65, 2.94), (.06, .035, 2.35), wood, .01)
                box('Shoji_LatticeCrossbar', (side * 5.3, .18, 2.06 + grid * .44), (.06, 3.25, .035), wood, .01)
            orb('Tea_RibbedPaperLantern', (side * 4.56, -3.58, 4.26), (.3, .3, .46), pearl)
            for level in range(5):
                height = 4.26 + (level - 2) * .15
                radius = .3 * math.sqrt(max(.05, 1 - ((height - 4.26) / .46) ** 2))
                ring('Tea_LanternRib', (side * 4.56, -3.58, height), radius, .012, wood)
        for index in range(5):
            cylinder('Tea_CeremonyBowl', (-4.1 + index * .47, -2.68, 1.91), .17, .18, pearl)
            cylinder('Tea_GreenInfusion', (-4.1 + index * .47, -2.68, 2.003), .14, .009, materials.get('Signature_Leaf', roof_material))
    elif theme == 'tart':
        for index in range(8):
            horizontal, forward = -4.11 + index % 4 * .64, -2.68 + index // 4 * .49
            cylinder('Tart_IndividualShell', (horizontal, forward, 1.91), .21, .18, product)
            cylinder('Tart_CreamFilling', (horizontal, forward, 2.01), .18, .04, pearl)
            for berry in range(3):
                angle = berry / 3 * math.tau
                orb('Tart_FreshBerry', (horizontal + math.cos(angle) * .08, forward + math.sin(angle) * .08, 2.08), (.078, .078, .11), accent)
    elif theme == 'coffee':
        for index in range(5):
            horizontal = 2.02 + index * .49
            cylinder('Coffee_CeramicCup', (horizontal, -2.73, 1.92), .17, .22, pearl)
            ring('Coffee_CupHandle', (horizontal + .18, -2.73, 1.93), .09, .025, metal, front=True)
            cylinder('Coffee_Crema', (horizontal, -2.73, 2.034), .145, .012, product)
        for index in range(8):
            orb('Coffee_RoastedBean', (-3.55 + index % 4 * .24, -2.75 + index // 4 * .18, 1.84), (.12, .075, .06), wood)
        for side in [-1, 1]:
            cylinder('Roastery_FrontGauge', (side * 4.84, -3.37, 4.15), .2, .08, metal, front=True)
            cylinder('Roastery_GaugeFace', (side * 4.84, -3.425, 4.15), .16, .02, pearl, front=True)
    elif theme == 'cotton':
        for index in range(6):
            horizontal, forward = 2.06 + index % 3 * .65, -2.7 + index // 3 * .56
            cylinder('Sugar_DisplayStand', (horizontal, forward, 1.82), .15, .09, metal)
            cylinder('Sugar_CandyStem', (horizontal, forward, 2.04), .025, .4, pearl)
            for puff in range(3):
                orb('Sugar_MarbledConfection', (horizontal + (puff - 1) * .11, forward, 2.23 + puff * .07), (.18, .16, .23), accent if puff % 2 else roof_material)
    elif theme == 'prism':
        for index in range(5):
            horizontal = -4.14 + index * .54
            cylinder('Optics_PresentationPlinth', (horizontal, -2.7, 1.84), .22, .08, wood)
            ring('Optics_FinishedLensFrame', (horizontal, -2.7, 2.16), .2, .035, metal, front=True)
            cylinder('Optics_PolishedLens', (horizontal, -2.7, 2.16), .18, .025, roof_material, front=True)
        for side in [-1, 1]:
            for flute in range(5):
                box('Optics_FlutedPierInlay', (side * 4.84 + (flute - 2) * .065, -3.329, 1.98), (.025, .025, 2.1), metal, .008)
    elif theme == 'glider':
        for side in [-1, 1]:
            tube('Hangar_LoadBearingBrace', [(side * 4.84, -3.35, 3.73), (side * 3.52, -3.35, 4.03)], .07, wood)
            for rib in range(7):
                horizontal = side * (.18 + rib * .35)
                tube('Glider_WingRibStitch', [(horizontal, -.45, .21), (horizontal, .4, .21)], .015, wood, hero)
        for index in range(5):
            cylinder('Hangar_ToolPot', (2.2 + index * .47, -2.66, 1.96), .13, .28, metal)
            tube('Hangar_BalsaTool', [(2.2 + index * .47, -2.66, 2.04), (2.26 + index * .47, -2.66, 2.43)], .019, wood)
    elif theme == 'kite':
        for side in [-1, 1]:
            for index in range(5):
                horizontal = side * 3.04 + (index - 2) * .5
                cylinder('Ribbon_CounterSpool', (horizontal, -2.62, 1.98), .18, .35, accent if index % 2 else roof_material)
                for end in [-1, 1]:
                    cylinder('Ribbon_SpoolFlange', (horizontal, -2.62, 1.98 + end * .19), .22, .055, pearl)
        tube('Kite_HandStitchedBorder', [(0, -.025, 1.86), (1.36, -.025, .1), (0, -.025, -1.61), (-1.36, -.025, .1), (0, -.025, 1.86)], .018, pearl, hero)
    bpy.context.view_layer.update()
    parts = [obj for obj in scene.objects if obj.get('shopPart')]
    triangles = sum(len(polygon.vertices) - 2 for obj in parts for polygon in obj.data.polygons)
    assert triangles < 65000, (theme, triangles)
    assert not scene.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector((0, -6, 1.6)), Vector((0, 1, 0)), distance=6)[0]
    root['signatureDetails'] = json.dumps([obj['shopPart'] for obj in parts])
    scene['atelierFinishRevision'], scene['triangles'], scene['status'] = 1, triangles, 'atelier-finished-awaiting-bake'
    print('ATELIER_FINISH_READY', theme, len(parts), triangles)


if __name__ == '__main__':
    for signature_theme in THEMES:
        refine_signature(signature_theme)
        detail_signature(signature_theme)

