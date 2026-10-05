import bpy
import bmesh
import math
from mathutils import Vector

scene = bpy.data.scenes['Copper Crumb Studio']
bpy.context.window.scene = scene
collection = bpy.data.collections['Copper Crumb Authored Collection']
root = bpy.data.objects['Copper_Crumb_Asset']
model = bpy.data.objects['Copper_Architecture']
if root.get('stage') != 'shell':
    raise ValueError('The detail stage requires the completed shell.')


def point(horizontal, height, forward):
    return (horizontal, -forward, height)


def enum_id(owner, property_name, identifier):
    choices = [item.identifier for item in owner.bl_rna.properties[property_name].enum_items]
    if identifier not in choices:
        raise ValueError((property_name, identifier, choices))
    return next(value for value in choices if value == identifier)


def color(value):
    channels = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    return tuple(channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in channels)


def material(label, value, roughness=.8, metallic=0, emission=0):
    finish = bpy.data.materials.new(label)
    finish.use_nodes = True
    shader = next(node for node in finish.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    for identifier, setting in [('Base Color', (*color(value), 1)), ('Roughness', roughness), ('Metallic', metallic)]:
        next(socket for socket in shader.inputs if socket.identifier == identifier).default_value = setting
    if emission:
        next(socket for socket in shader.inputs if socket.identifier == 'Emission Color').default_value = (*color(value), 1)
        next(socket for socket in shader.inputs if socket.identifier == 'Emission Strength').default_value = emission
    finish.diffuse_color = (*color(value), 1)
    return finish


def finish_object(label, geometry, center, finish, parent=model, bevel=0):
    obj = bpy.data.objects.new(label, geometry)
    collection.objects.link(obj)
    obj.parent = parent
    obj.location = point(*center)
    geometry.materials.append(finish)
    if bevel:
        modifier = obj.modifiers.new('Crafted edges', enum_id(bpy.types.Modifier, 'type', 'BEVEL'))
        modifier.width = bevel
        modifier.segments = 2
    return obj


def box(label, center, size, finish, parent=model, bevel=.025):
    geometry = bpy.data.meshes.new(label)
    working = bmesh.new()
    bmesh.ops.create_cube(working, size=1)
    for vertex in working.verts:
        vertex.co.x *= size[0]
        vertex.co.y *= size[2]
        vertex.co.z *= size[1]
    working.to_mesh(geometry)
    working.free()
    return finish_object(label, geometry, center, finish, parent, bevel)


def sphere(label, center, scale, finish, parent=model, segments=12, rings=8):
    geometry = bpy.data.meshes.new(label)
    working = bmesh.new()
    bmesh.ops.create_uvsphere(working, u_segments=segments, v_segments=rings, radius=1)
    working.to_mesh(geometry)
    working.free()
    for polygon in geometry.polygons:
        polygon.use_smooth = True
    obj = finish_object(label, geometry, center, finish, parent)
    obj.scale = (scale[0], scale[2], scale[1])
    return obj


def tube(label, coordinates, radius, finish, parent=model, cyclic=False):
    choices = [item.identifier for item in bpy.types.BlendDataCurves.bl_rna.functions['new'].parameters['type'].enum_items]
    curve = bpy.data.curves.new(label, next(value for value in choices if value == 'CURVE'))
    curve.dimensions = enum_id(curve, 'dimensions', '3D')
    curve.resolution_u = 5
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.use_fill_caps = True
    spline = curve.splines.new(enum_id(bpy.types.Spline, 'type', 'BEZIER'))
    spline.bezier_points.add(len(coordinates) - 1)
    for control, position in zip(spline.bezier_points, coordinates):
        control.co = point(*position)
        control.handle_left_type = enum_id(control, 'handle_left_type', 'AUTO')
        control.handle_right_type = enum_id(control, 'handle_right_type', 'AUTO')
    spline.use_cyclic_u = cyclic
    return finish_object(label, curve, (0, 0, 0), finish, parent)


plaster = bpy.data.materials['Copper Plaster']
stone = bpy.data.materials['Copper Limestone']
wood = bpy.data.materials['Copper Oiled Timber']
roof = bpy.data.materials['Copper Jade Roof']
metal = bpy.data.materials['Copper Satin Metal']
ink = material('Copper Deep Ink', '#254543')
accent = material('Copper Cabinet Enamel', '#A76873', .62)
dough = material('Copper Golden Crust', '#CE9A55', .86)
warm = material('Copper Warm Diffusers', '#FFE5B8', .65, emission=1.5)
soil = material('Copper Garden Soil', '#786B55', 1)
leaves = [material('Copper Leaf ' + str(index), value, .94) for index, value in enumerate(['#557E65', '#759A71', '#92AC82'])]
bloom = material('Copper Soft Blossoms', '#DDAEB0', .94)

for side in (-1, 1):
    box('Copper_CounterCabinet', (side * 2.75, .89, .05), (3.05, 1.1, .94), wood)
    box('Copper_StoneCountertop', (side * 2.75, 1.5, .05), (3.2, .17, 1.12), stone)
    for drawer in (-1, 0, 1):
        box('Copper_CounterPanel', (side * 2.75 + drawer * .94, .92, .55), (.8, .74, .08), accent)
        box('Copper_DrawerPull', (side * 2.75 + drawer * .94, 1.12, .62), (.23, .045, .09), metal, bevel=.012)
box('Copper_OvenBody', (-2.85, 1.78, -3.95), (2.85, 2.9, 1.7), roof, bevel=.14)
box('Copper_OvenOpening', (-2.85, 1.6, -3.075), (2.08, 1.6, .1), ink, bevel=.18)
box('Copper_OvenHearth', (-2.85, .82, -2.99), (1.8, .12, .2), warm)
for horizontal in (-3.63, -2.08):
    sphere('Copper_OvenDial', (horizontal, 2.87, -3.025), (.12, .12, .06), metal)
box('Copper_BreadRackBack', (2.85, 2.0, -4.95), (3.2, 3.3, .14), wood)
for side in (-1, 1):
    box('Copper_BreadRackUpright', (2.85 + side * 1.52, 2.0, -4.6), (.13, 3.3, .8), wood)
for height in (.7, 1.6, 2.5):
    box('Copper_BreadRackShelf', (2.85, height, -4.52), (3.15, .14, .96), stone)

braid = [(-1.45, -.7, 0), (-1.95, .4, 0), (-1.32, 1.27, 0), (-.35, .66, .16), (.95, -.93, .29), (1.85, -.43, 0), (1.94, .48, 0), (1.27, 1.28, 0), (.31, .68, -.16), (-.94, -.93, -.25)]
hero = bpy.data.objects.new('Shop_Rooftop_pretzel', None)
collection.objects.link(hero)
hero.parent = root
hero.location = point(-.55, 8.0, -2.05)
hero['movingHero'] = True
pretzel = tube('Pretzel_BraidedLoaf', braid, .29, dough, hero, True)
for index, position in enumerate(braid):
    for offset in (-.08, .08):
        sphere('Copper_SeaSalt', (position[0] + offset, position[1], position[2] + .29), (.047, .036, .025), plaster, hero, 6, 4)
for side in (-1, 1):
    box('Shop_SculptureSupport', (-.55 + side * .88, 6.86, -2.05), (.2, 1.25, .3), metal)
box('Copper_RoofSignSaddle', (-.55, 6.25, -2.05), (2.5, .23, 1.1), metal)

for index in range(20):
    display = bpy.data.objects.new('Copper_FreshPretzel', pretzel.data)
    collection.objects.link(display)
    display.parent = model
    if index < 8:
        display.location = point((-2.75 if index < 4 else 2.75) + (index % 4 - 1.5) * .63, 1.7, .03)
        display.rotation_euler[0] = math.pi / 2
    else:
        display.location = point(1.7 + (index % 4) * .76, .96 + ((index - 8) // 4) * .9, -4.33)
    display.scale = (.12, .12, .12)

for horizontal in (-2.75, 2.75):
    tube('Copper_PendantCord', [(horizontal, 5.4, -.5), (horizontal, 3.9, -.5)], .018, ink)
    sphere('Copper_PendantShade', (horizontal, 3.92, -.5), (.42, .21, .42), metal)
    sphere('Copper_PendantDiffuser', (horizontal, 3.82, -.5), (.29, .04, .29), warm)

for forward in (-5.45, -3.98, -2.51, -1.04, .43, 1.9):
    tube('Copper_RoofStandingSeam', [(horizontal, 5.11 + 1.36 * (1 - (horizontal / 5.4) ** 2), forward) for horizontal in (-5.35, -3.6, -1.8, 0, 1.8, 3.6, 5.35)], .022, metal)

font_types = [item.identifier for item in bpy.types.BlendDataCurves.bl_rna.functions['new'].parameters['type'].enum_items]
text = bpy.data.curves.new('Copper Bakery Lettering', next(value for value in font_types if value == 'FONT'))
text.body = 'COPPER CRUMB'
text.align_x = enum_id(text, 'align_x', 'CENTER')
text.size = .56
text.space_character = 1.08
text.extrude = .008
text.bevel_depth = .004
lettering = finish_object('Copper_BakeryLettering', text, (0, 4.48, 1.55), ink, root)
lettering.rotation_euler[0] = math.pi / 2

court = bpy.data.objects.new('Copper_Courtyard', None)
collection.objects.link(court)
court.parent = root
box('Copper_ShallowTerrace', (0, .04, 3.65), (10.6, .12, 4.2), stone, court, .08)
for index in range(4):
    box('Copper_EntryPaver', ((index % 2 - .5) * .05, .1, 5.4 + index * .7), (1.55, .13, .58), plaster, court, .06)
for horizontal, forward in [(-6.85, -.9), (6.85, -1.65), (-6.6, 5.75)]:
    box('Copper_PlantingBed', (horizontal, .24, forward), (2.65, .42, 3.7), stone, court, .2)
    box('Copper_BedSoil', (horizontal, .47, forward), (2.4, .055, 3.42), soil, court, .12)
    for index in range(12):
        angle = index * 2.399
        spread = math.sqrt((index + .4) / 12)
        center = (horizontal + math.cos(angle) * .92 * spread, .67 + index % 3 * .09, forward + math.sin(angle) * 1.37 * spread)
        sphere('Copper_MoundingShrub', center, (.43, .34 + index % 3 * .04, .43), leaves[index % 3], court, 10, 6)
        if index % 3 == 0:
            sphere('Copper_BlossomCluster', (center[0], center[1] + .31, center[2]), (.17, .1, .17), bloom, court, 8, 5)
for horizontal, forward in [(-6.85, -.9), (6.85, -1.65)]:
    tube('Copper_GardenTreeTrunk', [(horizontal, .5, forward), (horizontal + .08, 1.5, forward), (horizontal - .17, 2.8, forward + .06)], .095, wood, court)
    for index in range(7):
        angle = index * 2.399
        sphere('Copper_SoftTreeCrown', (horizontal + math.cos(angle) * .58, 2.85 + index % 3 * .26, forward + math.sin(angle) * .55), (.69, .72, .69), leaves[index % 3], court, 12, 8)
for side in (-1, 1):
    horizontal = side * 3.35
    for slat in range(4):
        box('Copper_CourtyardBenchSlat', (horizontal, .73, 3.55 + slat * .16), (2.05, .11, .13), wood, court, .035)
    box('Copper_CourtyardBenchBack', (horizontal, 1.22, 3.43), (2.08, .66, .12), roof, court, .07)
    for leg in (-1, 1):
        box('Copper_CourtyardBenchFoot', (horizontal + leg * .76, .37, 3.78), (.14, .66, .52), metal, court, .025)
for index in range(3):
    box('Copper_DeliveryCrate', (6.45 + (index % 2) * .65, .42 + (index // 2) * .58, 4.4), (.58, .55, .67), wood, court, .04)
    for rail in range(3):
        box('Copper_CrateSlat', (6.45 + (index % 2) * .65, .24 + rail * .16 + (index // 2) * .58, 4.75), (.53, .09, .055), plaster, court, .01)
root['stage'] = 'detailed'
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.overlay.show_overlays = False
        area.spaces.active.region_3d.view_perspective = enum_id(area.spaces.active.region_3d, 'view_perspective', 'CAMERA')
print('Copper detail stage complete:', len(scene.objects), 'objects')
