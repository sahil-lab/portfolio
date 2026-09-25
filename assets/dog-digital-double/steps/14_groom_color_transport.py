import bpy
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
groom = bpy.data.collections["05_GROOM"]
depsgraph = bpy.context.evaluated_depsgraph_get()
reports = []
for obj in groom.objects:
    if obj.type != "CURVES":
        continue
    surface = obj.data.surface
    evaluated = surface.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    mesh.calc_loop_triangles()
    vertices = [vertex.co.copy() for vertex in mesh.vertices]
    triangles = [tuple(triangle.vertices) for triangle in mesh.loop_triangles]
    tree = BVHTree.FromPolygons(vertices, triangles, all_triangles=True)
    root_uv = obj.data.attributes["surface_uv_coordinate"]
    coat = obj.data.attributes["coat_color"]
    positions = obj.data.attributes["position"]
    max_distance = 0
    for index, curve in enumerate(obj.data.curves):
        root = positions.data[curve.first_point_index].vector
        closest, normal, triangle_index, distance = tree.find_nearest(root)
        max_distance = max(max_distance, distance)
        triangle = mesh.loop_triangles[triangle_index]
        first, second, third = [vertices[value] for value in triangle.vertices]
        edge_a, edge_b, offset = second-first, third-first, closest-first
        aa, ab, bb = edge_a.dot(edge_a), edge_a.dot(edge_b), edge_b.dot(edge_b)
        determinant = aa*bb-ab*ab
        if abs(determinant) < 1e-18:
            weights = (1.0, 0.0, 0.0)
        else:
            second_weight = (bb*offset.dot(edge_a)-ab*offset.dot(edge_b))/determinant
            third_weight = (aa*offset.dot(edge_b)-ab*offset.dot(edge_a))/determinant
            weights = (1-second_weight-third_weight, second_weight, third_weight)
        uv = sum((mesh.uv_layers.active.data[loop].uv*weight for loop, weight in zip(triangle.loops, weights)), Vector((0, 0)))
        root_uv.data[index].vector = uv
        color = [sum(mesh.color_attributes["DOG_CoatColor"].data[loop].color[component]*weight for loop, weight in zip(triangle.loops, weights)) for component in range(3)]
        coat.data[index].color = (*color, 1)
    evaluated.to_mesh_clear()
    group = next(modifier.node_group for modifier in obj.modifiers if modifier.type == "NODES")
    nodes, links = group.nodes, group.links
    interpolate = nodes["INTERPOLATE_HAIR_CURVES"]
    root_geometry = interpolate.inputs["Points"].links[0].from_socket
    attribute = nodes.new("GeometryNodeInputNamedAttribute")
    attribute.name = "Surface_Coat_Color"
    attribute.data_type = "FLOAT_COLOR"
    attribute.inputs["Name"].default_value = "DOG_CoatColor"
    store = nodes.new("GeometryNodeStoreNamedAttribute")
    store.name = "Preserve_Per_Root_Coat_Color"
    store.data_type = "FLOAT_COLOR"
    store.domain = "POINT"
    store.inputs["Name"].default_value = "coat_color"
    links.new(root_geometry, store.inputs["Geometry"])
    links.new(attribute.outputs["Attribute"], store.inputs["Value"])
    links.new(store.outputs["Geometry"], interpolate.inputs["Points"])
    obj.data.update_tag()
    reports.append({"zone": obj.name, "roots_refreshed": len(obj.data.curves), "max_surface_distance": max_distance})
material = bpy.data.materials["DOG_Principled_Hair_Regional_Coat"]
nodes, links = material.node_tree.nodes, material.node_tree.links
hair = next(node for node in nodes if node.type == "BSDF_HAIR_PRINCIPLED")
attribute = nodes.new("ShaderNodeAttribute")
attribute.name = "Per_Strand_Intrinsic_Coat_Color"
attribute.attribute_name = "coat_color"
links.new(attribute.outputs["Color"], hair.inputs["Color"])
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
for obj in groom.objects:
    if obj.type != "CURVES":
        continue
    evaluated = obj.evaluated_get(depsgraph)
    attribute = evaluated.data.attributes.get("coat_color")
    assert attribute is not None, obj.name+" lost root coat colors"
    brightness = [sum(value.color[:3])/3 for value in attribute.data]
    if obj.name == "FUR_CHEST":
        assert sum(brightness)/len(brightness) > .45, "Chest should be predominantly warm white"
    obj["root_color_transport"] = "Surface vertex-paint coat attribute captured on distributed roots and propagated to native curves"
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 800
for name in ("close_face", "three_quarter"):
    scene.camera = bpy.data.objects["CAM_"+name]
    scene.render.filepath = OUT+"/groom-round-1-color-fixed/"+name+".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_05_groom.blend")
print(json.dumps({"root_color_transport_fixed": True, "regions": reports}))
