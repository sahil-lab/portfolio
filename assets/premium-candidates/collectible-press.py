import bpy
import math
import re
from mathutils import Vector

PROJECT = 'C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main'
STUDY = 'Collectible Packet Press Study'
scene = bpy.data.scenes.get(STUDY)
if scene:
    assert scene.get('collectibleOwner') == STUDY
    for obj in list(scene.objects):
        assert len(obj.users_scene) == 1
        bpy.data.objects.remove(obj, do_unlink=True)
else:
    scene = bpy.data.scenes.new(STUDY)
scene['collectibleOwner'] = STUDY
scene['status'] = 'building-unverified'
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=PROJECT + '/public/assets/packet-press.glb')
source = {}
for obj in list(scene.objects):
    name = re.sub(r'\.\d{3}$', '', obj.name)
    obj['collectibleRuntimeName'] = name
    obj.name = 'CollectibleSource_' + name
    source[name] = obj
original_root = source['PacketPress']
protected = {original_root}
for name in ['PacketPress_Lever', 'PacketPress_Tray', 'PacketPress_Ram', 'Collision_PacketPress']:
    protected.add(source[name])
    protected.update(source[name].children_recursive)
protected.update(obj for name, obj in source.items() if name.startswith('PacketPress_Indicator_'))
for obj in list(scene.objects):
    if obj not in protected:
        bpy.data.objects.remove(obj, do_unlink=True)
scene.frame_set(1)


def enum_value(properties, key, desired):
    return next(item.identifier for item in properties[key].enum_items if item.identifier == desired)


def modifier(obj, kind):
    value = enum_value(bpy.ops.object.modifier_add.get_rna_type().properties, 'type', kind)
    return obj.modifiers.new('Collectible ' + kind, value)


def finish(obj, name, location, material, owner):
    obj.name = 'Collectible_' + name
    obj['collectibleRuntimeName'] = name
    obj.location = location
    obj.parent = owner
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def group(name, location=(0, 0, 0), owner=original_root):
    obj = bpy.data.objects.new('Collectible_' + name, None)
    scene.collection.objects.link(obj)
    obj['collectibleRuntimeName'] = name
    obj.location = location
    obj.parent = owner
    return obj


assembly = group('PacketPress_CollectibleAssembly')
assembly['collectibleVersion'] = 1
images = {}


def material(name, color, roughness=.58, metalness=.02, coat=.25, family='ceramic', alpha=1, emission=0):
    mat = bpy.data.materials.new('CollectiblePress_' + name)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    channels = [int(color[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    linear = tuple(channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in channels)
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metalness
    shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = .28
    shader.inputs['Alpha'].default_value = alpha
    shader.inputs['Emission Color'].default_value = (*linear, 1)
    shader.inputs['Emission Strength'].default_value = emission
    mat['collectibleBaseColorLinear'] = [*linear, alpha]
    if family:
        for channel in ['color', 'roughness', 'normal']:
            key = family + '-' + channel
            if key not in images:
                image = bpy.data.images.load(PROJECT + '/public/assets/premium-v1/' + key + '.png', check_existing=False)
                if channel != 'color':
                    image.colorspace_settings.name = enum_value(image.colorspace_settings.bl_rna.properties, 'name', 'Non-Color')
                images[key] = image
            texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
            texture.image = images[key]
            if channel == 'color':
                multiply = mat.node_tree.nodes.new('ShaderNodeMixRGB')
                multiply.blend_type = enum_value(multiply.bl_rna.properties, 'blend_type', 'MULTIPLY')
                multiply.inputs[0].default_value = 1
                multiply.inputs[2].default_value = (*linear, 1)
                mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[1])
                mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Base Color'])
            elif channel == 'roughness':
                multiply = mat.node_tree.nodes.new('ShaderNodeMath')
                multiply.operation = enum_value(multiply.bl_rna.properties, 'operation', 'MULTIPLY')
                multiply.inputs[1].default_value = roughness
                mat.node_tree.links.new(texture.outputs['Color'], multiply.inputs[0])
                mat.node_tree.links.new(multiply.outputs[0], shader.inputs['Roughness'])
            else:
                normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = .35 if family == 'ceramic' else .3
                mat.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
                mat.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return mat


teal = material('TurquoiseEnamel', '269d99', .5, .03, .35)
pearl = material('Porcelain', 'f1f5e9', .56, .01, .3)
ink = material('SoftRubber', '26363d', .85, 0, 0, None)
brass = material('ChampagneMetal', 'e7c47d', .42, .7, .12, 'brushed')
coral = material('CoralAccent', 'f88c77', .54, .02, .25)
blue = material('CobaltAccent', '4277c7', .5, .03, .3)
pink = material('RoseAccent', 'f4b6ba', .64, 0, .15)
glass = material('MintGlass', 'b9f8e9', .15, .04, .6, None, .24)
core = material('LuminousCore', 'a7f9dd', .36, .04, .2, None, 1, .6)


def box(name, location, dimensions, mat, radius=.1, owner=assembly):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.scale = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, location, mat, owner)
    bevel = modifier(obj, 'BEVEL')
    bevel.width = min(radius, min(dimensions) * .45)
    bevel.segments = 4
    bevel.harden_normals = True
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    normal = modifier(obj, 'WEIGHTED_NORMAL')
    normal.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj


def orb(name, location, dimensions, mat, owner=assembly):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
    obj = bpy.context.object
    obj.scale = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, location, mat, owner)


def cylinder(name, location, radius, depth, mat, front=False, owner=assembly):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth)
    obj = finish(bpy.context.object, name, location, mat, owner)
    if front:
        obj.rotation_euler.x = math.pi / 2
    bevel = modifier(obj, 'BEVEL')
    bevel.width = min(.035, depth * .2)
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    normal = modifier(obj, 'WEIGHTED_NORMAL')
    normal.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj


def ring(name, location, radius, thickness, mat, front=False):
    bpy.ops.mesh.primitive_torus_add(major_segments=40, minor_segments=8, major_radius=radius, minor_radius=thickness)
    obj = finish(bpy.context.object, name, location, mat, assembly)
    if front:
        obj.rotation_euler.x = math.pi / 2
    return obj


for side in [-1, 1]:
    for end in [-1, 1]:
        orb('CollectiblePress_Foot_' + str(side) + '_' + str(end), (side * 1.29, end * .78, .22), (.36, .38, .22), ink)
box('CollectiblePress_PorcelainPlinth', (0, 0, .48), (3.87, 2.52, .4), pearl, .19)
box('CollectiblePress_CoralWaist', (0, 0, .7), (3.53, 2.24, .16), coral, .075)
shell = box('CollectiblePress_Shell', (0, .22, 1.37), (3.38, 1.93, 1.37), teal, .34)
box('CollectiblePress_DashboardSeat', (0, -.77, 1.48), (2.98, .15, 1.11), ink, .065)
box('CollectiblePress_Dashboard', (0, -.86, 1.5), (2.84, .13, 1.01), pearl, .06)
for side in [-1, 1]:
    cylinder('CollectiblePress_Column_' + str(side), (side * 1.43, .04, 2.74), .18, 2.04, brass)
    cylinder('CollectiblePress_PorcelainSleeve_' + str(side), (side * 1.43, .04, 2.72), .25, 1.1, pearl)
    for level in [2.16, 3.28]:
        cylinder('CollectiblePress_SleeveRing_' + str(side) + '_' + str(level), (side * 1.43, .04, level), .28, .1, coral)
box('CollectiblePress_CrownSeat', (0, .04, 3.62), (3.68, 1.88, .17), brass, .08)
box('CollectiblePress_PillowCrown', (0, .04, 3.84), (3.91, 2.03, .47), pearl, .23)
box('CollectiblePress_CrownStripe', (0, -1.0, 3.84), (2.95, .11, .2), blue, .049)
vessel = orb('CollectiblePress_Vessel', (0, 0, 2.78), (.79, .67, .69), glass)
orb('CollectiblePress_Core', (0, 0, 2.75), (.43, .4, .46), core)
for level in [2.17, 3.37]:
    cylinder('CollectiblePress_VesselCollar_' + str(level), (0, 0, level), .71, .13, brass)
    ring('CollectiblePress_VesselSeal_' + str(level), (0, 0, level + .07), .65, .045, pearl)
for side, label in [(-1, 'Left'), (1, 'Right')]:
    location = (side * .82, -.96, 1.56)
    cylinder('CollectiblePress_DialSeat' + label, location, .387, .08, blue, True)
    ring('CollectiblePress_DialRim' + label, (side * .82, -1.02, 1.56), .34, .04, brass, True)
    cylinder('CollectiblePress_DialFace' + label, (side * .82, -1.035, 1.56), .30, .025, pearl, True)
    for tick in range(9):
        angle = (-.72 + tick / 8 * 1.44) * math.pi
        mark = box('CollectiblePress_DialTick' + label + str(tick), (side * .82 + math.sin(angle) * .24, -1.055, 1.56 + math.cos(angle) * .24), (.018, .012, .041), ink, .004)
        mark.rotation_euler.y = angle
    pivot = group('CollectiblePress_Needle' + label, (side * .82, -1.08, 1.56), assembly)
    box('CollectiblePress_Pointer' + label, (0, 0, .075), (.034, .025, .2), coral, .012, pivot)
    orb('CollectiblePress_PointerHub' + label, (0, -.016, 0), (.055, .022, .055), ink, pivot)
    orb('CollectiblePress_Cheek' + label, (side * 1.27, -.96, 1.15), (.12, .036, .073), pink)
    cylinder('CollectiblePress_Button' + label, (side * .44, -.967, 1.1), .105, .075, coral if side == -1 else blue, True)
box('CollectiblePress_IdentityPlate', (0, -.965, 1.53), (.49, .05, .28), teal, .025)
for index in range(3):
    box('CollectiblePress_IdentityMark' + str(index), (-.13 + index * .13, -.999, 1.53), (.044, .012, .09), pearl, .005)
for side in [-1, 1]:
    for vent in range(5):
        box('CollectiblePress_SideVent' + str(side) + '_' + str(vent), (side * 1.696, .15, 1.04 + vent * .13), (.018, .76, .045), ink, .008)

for obj in protected:
    if obj.type != 'MESH' or obj == source['Collision_PacketPress']:
        continue
    name = obj['collectibleRuntimeName']
    replacement = brass
    if 'Grip' in name:
        replacement = blue
    elif 'CapsuleShell' in name:
        replacement = pearl
    elif 'Core' in name or 'Indicator' in name:
        replacement = core
    elif 'Lip' in name:
        replacement = coral
    elif 'RackSlot' in name:
        replacement = ink
    obj.data.materials.clear()
    obj.data.materials.append(replacement)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    if 'CapsuleShell' in name or 'LeverGrip' in name:
        temporary = orb('CollectiblePress_Temporary', (0, 0, 0), (.22, .22, .35) if 'Capsule' in name else (.31, .27, .29), replacement)
        obj.data = temporary.data
        bpy.data.objects.remove(temporary, do_unlink=True)

scene.frame_set(1)
source['Collision_PacketPress'].hide_render = True
source['Collision_PacketPress'].hide_set(True)
scene['status'] = 'modeled-awaiting-export-check'
bpy.context.view_layer.update()
for image in images.values():
    image.pack()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_location = Vector((0, 0, 2))
            area.spaces.active.region_3d.view_distance = 8
            area.spaces.active.region_3d.view_rotation = Vector((6, -9, 5)).to_track_quat('Z', 'Y')
            area.spaces.active.shading.type = enum_value(area.spaces.active.shading.bl_rna.properties, 'type', 'MATERIAL')
print('COLLECTIBLE_PRESS_MODELED', len(scene.objects), len(images), scene['status'])

properties = bpy.ops.export_scene.gltf.get_rna_type().properties
options = dict(filepath=PROJECT + '/assets/premium-candidates/packet-press-collectible.raw.glb',
               use_active_scene=True, use_selection=False, use_visible=False, use_renderable=False,
               export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
try:
    bpy.ops.export_scene.gltf(export_format=properties['export_format'].default, **options)
except TypeError as error:
    match = re.search(r'not found in (\([^)]*\))', str(error))
    if not match:
        raise
    formats = re.findall(r"'([A-Z0-9_]+)'", match.group(1))
    binary_format = next(identifier for identifier in formats if identifier == 'GLB')
    bpy.ops.export_scene.gltf(export_format=binary_format, **options)
scene['status'] = 'exported-awaiting-independent-check'
print('COLLECTIBLE_PRESS_RAW_EXPORTED')

native_images = {node.image for obj in scene.objects if obj.type == 'MESH'
                 for mat in obj.data.materials if mat and mat.use_nodes
                 for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image}
for image in native_images:
    if not image.packed_file:
        if not image.has_data:
            image.reload()
        image.pack()
assert all(image.packed_file for image in native_images)
save_properties = bpy.ops.wm.save_as_mainfile.get_rna_type().properties
assert all(key in save_properties for key in ['filepath', 'copy', 'compress'])
bpy.ops.wm.save_as_mainfile(filepath=PROJECT + '/assets/premium-candidates/collectible-study-20261003.blend', copy=True, compress=True)
print('COLLECTIBLE_PRESS_NATIVE_SAVED', len(native_images))


