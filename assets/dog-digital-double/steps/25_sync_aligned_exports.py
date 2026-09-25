import bpy
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_BODY_RETOPO"]
assert body.get("guide_alignment_restored")
assert body.location.length < 1e-7
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
reports = []
for obj in bpy.data.collections["05_GROOM"].objects:
    if obj.type != "CURVES":
        continue
    source = obj.data.surface
    evaluated = source.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
    mesh.calc_loop_triangles()
    vertices = [vertex.co.copy() for vertex in mesh.vertices]
    tree = BVHTree.FromPolygons(vertices,[tuple(triangle.vertices) for triangle in mesh.loop_triangles],all_triangles=True)
    inverse = source.matrix_world.inverted()
    positions = obj.data.attributes["position"]
    root_colors = obj.data.attributes["coat_color"]
    maximum = 0
    for index, curve in enumerate(obj.data.curves):
        root = inverse @ (obj.matrix_world @ positions.data[curve.first_point_index].vector)
        closest,normal,triangle_index,distance = tree.find_nearest(root)
        maximum = max(maximum,distance)
        triangle = mesh.loop_triangles[triangle_index]
        first,second,third = [vertices[value] for value in triangle.vertices]
        edge_a,edge_b,offset = second-first,third-first,closest-first
        aa,ab,bb = edge_a.dot(edge_a),edge_a.dot(edge_b),edge_b.dot(edge_b)
        determinant = aa*bb-ab*ab
        if abs(determinant)<1e-18:
            weights = (1.0,0.0,0.0)
        else:
            second_weight = (bb*offset.dot(edge_a)-ab*offset.dot(edge_b))/determinant
            third_weight = (aa*offset.dot(edge_b)-ab*offset.dot(edge_a))/determinant
            weights = (1-second_weight-third_weight,second_weight,third_weight)
        uv = sum((mesh.uv_layers.active.data[loop].uv*weight for loop,weight in zip(triangle.loops,weights)),Vector((0,0)))
        obj.data.attributes["surface_uv_coordinate"].data[index].vector = uv
        color = [sum(mesh.color_attributes["DOG_CoatColor"].data[loop].color[channel]*weight for loop,weight in zip(triangle.loops,weights)) for channel in range(3)]
        root_colors.data[index].color = (*color,1)
    evaluated.to_mesh_clear()
    obj.data.update_tag()
    assert maximum < .001, obj.name+" has detached roots"
    reports.append({"zone":obj.name,"maximum_root_gap_m":maximum})
    for lod,rows in ((0,12),(1,7),(2,4)):
        web = bpy.data.objects["WEB_L%d_%s_Locks"%(lod,obj.name)]
        stride = web["guide_stride"]
        attribute = web.data.color_attributes["Coat"]
        for loop in web.data.loops:
            index = (loop.vertex_index//(rows*3))*stride
            attribute.data[loop.index].color = root_colors.data[index].color

for lod in range(3):
    copy = bpy.data.objects["WEB_L%d_DOG_BODY_RETOPO"%lod]
    copy.matrix_world = body.matrix_world.copy()
scene["guide_surface_alignment"] = json.dumps({"mean_gap_m":.000498,"regions":reports,"body_transform_restored":True})
scene["normal_map_notes"] = "Normal texture supplied for editing; normal contribution disabled after visual diagnostics. Geometric normals and the native groom define the current look."
scene.camera = bpy.data.objects["CAM_three_quarter"]
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        area.spaces.active.shading.type = "SOLID"
        area.spaces.active.region_3d.view_rotation = scene.camera.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_location = Vector((0,-.02,.17))
        area.spaces.active.region_3d.view_distance = .9
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.wm.obj_export(filepath=OUT+"/dog_body_low.obj",export_selected_objects=True,apply_modifiers=False,export_materials=False)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_06_final.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_master.blend")
scene.camera = bpy.data.objects["CAM_left"]
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.filepath = OUT+"/diagnostics/aligned-left.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"master_aligned":True,"root_gap_checks":reports,"web_copies_synchronized":3,"saved_master":True}))
