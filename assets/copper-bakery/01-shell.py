import bpy
import bmesh
import math
from mathutils import Vector


def enum_id(owner, property_name, identifier):
    choices = [item.identifier for item in owner.bl_rna.properties[property_name].enum_items]
    if identifier not in choices:
        raise ValueError((property_name, identifier, choices))
    return next(value for value in choices if value == identifier)


def linear_color(value):
    channels = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    return tuple(channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in channels)


def point(horizontal, height, forward):
    return (horizontal, -forward, height)


def material(label, color, roughness, metallic=0):
    value = bpy.data.materials.new(label)
    value.use_nodes = True
    shader = next(node for node in value.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    next(socket for socket in shader.inputs if socket.identifier == 'Base Color').default_value = (*linear_color(color), 1)
    next(socket for socket in shader.inputs if socket.identifier == 'Roughness').default_value = roughness
    next(socket for socket in shader.inputs if socket.identifier == 'Metallic').default_value = metallic
    value.diffuse_color = (*linear_color(color), 1)
    return value


def mesh_object(label, vertices, faces, finish, parent, bevel=0):
    geometry = bpy.data.meshes.new(label)
    geometry.from_pydata([point(*vertex) for vertex in vertices], [], faces)
    geometry.update()
    working = bmesh.new()
    working.from_mesh(geometry)
    bmesh.ops.recalc_face_normals(working, faces=list(working.faces))
    working.to_mesh(geometry)
    working.free()
    obj = bpy.data.objects.new(label, geometry)
    collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(finish)
    if bevel:
        modifier = obj.modifiers.new('Soft fitted edges', enum_id(bpy.types.Modifier, 'type', 'BEVEL'))
        modifier.width = bevel
        modifier.segments = 2
    return obj


def box(label, center, size, finish, parent=None, bevel=.045):
    horizontal, height, forward = center
    width, tall, depth = size
    vertices = [(horizontal + side * width / 2, height + level * tall / 2, forward + end * depth / 2) for end in (-1, 1) for level in (-1, 1) for side in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return mesh_object(label, vertices, faces, finish, model if parent is None else parent, bevel)


def profile(label, contours, forward, depth, finish, parent):
    kinds = [item.identifier for item in bpy.types.BlendDataCurves.bl_rna.functions['new'].parameters['type'].enum_items]
    curve = bpy.data.curves.new(label, next(value for value in kinds if value == 'CURVE'))
    curve.dimensions = enum_id(curve, 'dimensions', '2D')
    curve.fill_mode = 'BOTH'
    curve.resolution_u = 2
    curve.extrude = depth / 2
    curve.bevel_depth = .024
    curve.bevel_resolution = 1
    for contour in contours:
        spline = curve.splines.new(enum_id(bpy.types.Spline, 'type', 'POLY'))
        spline.points.add(len(contour) - 1)
        for control, coordinates in zip(spline.points, contour):
            control.co = (*coordinates, 0, 1)
        spline.use_cyclic_u = True
    obj = bpy.data.objects.new(label, curve)
    collection.objects.link(obj)
    obj.parent = parent
    obj.location = point(0, 0, forward)
    obj.rotation_euler[0] = math.pi / 2
    curve.materials.append(finish)
    return obj


def arch(left, bottom, width, height):
    radius = width / 2
    shoulder = bottom + height - radius
    return [(left, bottom), (left + width, bottom)] + [(left + radius + math.cos(index * math.pi / 20) * radius, shoulder + math.sin(index * math.pi / 20) * radius) for index in range(21)]


if bpy.data.scenes.get('Copper Crumb Studio'):
    raise ValueError('The authored scene already exists; do not overwrite it.')

scene = bpy.data.scenes.new('Copper Crumb Studio')
collection = bpy.data.collections.new('Copper Crumb Authored Collection')
scene.collection.children.link(collection)
bpy.context.window.scene = scene
root = bpy.data.objects.new('Copper_Crumb_Asset', None)
collection.objects.link(root)
model = bpy.data.objects.new('Copper_Architecture', None)
collection.objects.link(model)
model.parent = root
root['authoredVenue'] = 'copper-bakery'
root['stage'] = 'shell'

plaster = material('Copper Plaster', '#E0E2D5', .88)
stone = material('Copper Limestone', '#BFC9BA', .93)
wood = material('Copper Oiled Timber', '#7D5940', .76)
roof = material('Copper Jade Roof', '#397E75', .6, .18)
metal = material('Copper Satin Metal', '#BE8655', .42, .72)
interior = material('Copper Interior Plaster', '#D8C5A4', .9)

outer = [(-5, .18), (5, .18)] + [(5 - index * .5, 4.95 + 1.25 * (1 - ((5 - index * .5) / 5) ** 2)) for index in range(21)]
openings = [arch(-4.32, .76, 3.0, 3.35), arch(1.32, .76, 3.0, 3.35), arch(-.72, .18, 1.44, 3.35)]
facade = profile('Copper_PiercedFacade', [outer] + [list(reversed(opening)) for opening in openings], 1.32, .38, plaster, model)
box('Copper_BackWall', (0, 2.6, -5.25), (10, 5.1, .36), plaster)
for side in (-1, 1):
    box('Copper_ReturnWall', (side * 4.82, 2.5, -1.98), (.36, 4.9, 6.55), plaster)
box('Copper_Foundation', (0, .12, -1.94), (10.35, .3, 7.55), stone)
box('Copper_InteriorFloor', (0, .32, -1.92), (9.5, .12, 6.2), interior)
box('Copper_InteriorBack', (0, 2.5, -5.04), (9.25, 4.4, .07), interior, bevel=.01)

vertices = []
for forward in (-5.6, 2.05):
    for layer in (0, 1):
        for index in range(29):
            horizontal = -5.4 + index * 10.8 / 28
            vertices.append((horizontal, 5.08 + 1.36 * (1 - (horizontal / 5.4) ** 2) - layer * .23, forward))
faces = []
for index in range(28):
    faces.extend([(index, index + 1, index + 59, index + 58), (index + 29, index + 87, index + 88, index + 30), (index, index + 29, index + 30, index + 1), (index + 58, index + 59, index + 88, index + 87)])
faces.extend([(0, 58, 87, 29), (28, 57, 115, 86)])
mesh_object('Copper_ContinuousBarrelRoof', vertices, faces, roof, model, .035)

for left, bottom, width, height in [(-4.32, .76, 3, 3.35), (1.32, .76, 3, 3.35), (-.72, .18, 1.44, 3.35)]:
    profile('Copper_ArchedTimberReveal', [arch(left - .12, bottom - .06, width + .24, height + .18), list(reversed(arch(left, bottom, width, height)))], 1.57, .16, wood, model)
    if width > 2:
        box('Copper_WindowShelf', (left + width / 2, .73, 1.62), (width + .28, .18, .62), stone)

world = bpy.data.worlds.new('Copper Studio Environment')
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs[0].default_value = (.32, .42, .45, 1)
background.inputs[1].default_value = .35
scene.world = world
for label, location, power, size, color in [('Key', (-8, 12, 10), 1900, 8, '#FFF0D7'), ('Fill', (10, 9, 4), 900, 9, '#D3E9ED'), ('Rim', (0, 11, -9), 1300, 7, '#FFF3D9')]:
    data = bpy.data.lights.new('Copper Studio ' + label, enum_id(bpy.types.Light, 'type', 'AREA'))
    light = bpy.data.objects.new(data.name, data)
    collection.objects.link(light)
    light.location = point(*location)
    light.rotation_euler = (Vector(point(0, 2, -1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    data.energy = power
    data.shape = enum_id(data, 'shape', 'DISK')
    data.size = size
    data.color = linear_color(color)
camera_data = bpy.data.cameras.new('Copper Studio Camera')
camera = bpy.data.objects.new(camera_data.name, camera_data)
collection.objects.link(camera)
camera.location = point(15, 11, 23)
camera.rotation_euler = (Vector(point(0, 3, -1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.lens = 48
scene.camera = camera
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_perspective = enum_id(area.spaces.active.region_3d, 'view_perspective', 'CAMERA')
        area.spaces.active.shading.type = enum_id(area.spaces.active.shading, 'type', 'MATERIAL')
print('Copper shell created:', len(scene.objects), 'objects; original Scene preserved.')
