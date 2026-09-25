import bpy
import json
from mathutils.bvhtree import BVHTree

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_BODY_RETOPO"]
high = bpy.data.objects["DOG_SCULPT_HIGH"]
groom = [obj for obj in bpy.data.collections["05_GROOM"].objects if obj.type == "CURVES" and obj.data.surface == body]

def root_distance():
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = body.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    tree = BVHTree.FromPolygons([evaluated.matrix_world @ vertex.co for vertex in mesh.vertices], [tuple(polygon.vertices) for polygon in mesh.polygons])
    distances = []
    for obj in groom:
        positions = obj.data.attributes["position"]
        for index in range(0,len(obj.data.curves),4):
            point = obj.matrix_world @ positions.data[obj.data.curves[index].first_point_index].vector
            closest, normal, face, distance = tree.find_nearest(point)
            distances.append(distance)
    evaluated.to_mesh_clear()
    return {"mean":sum(distances)/len(distances),"maximum":max(distances),"samples":len(distances)}

previous = body.matrix_world.copy()
before = root_distance()
body.matrix_world = high.matrix_world.copy()
after = root_distance()
if after["mean"] >= before["mean"]:
    body.matrix_world = previous
    aligned = False
else:
    aligned = True
    body["guide_alignment_restored"] = True
    body["prior_unaligned_location"] = list(previous.translation)
material = bpy.data.materials["DOG_Coat_Authored_Masks"]
for node in material.node_tree.nodes:
    if node.type == "NORMAL_MAP":
        node["diagnostic_previous_strength"] = node.inputs["Strength"].default_value
        node.inputs["Strength"].default_value = 0
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.camera = bpy.data.objects["CAM_front"]
scene.render.filepath = OUT+"/diagnostics/aligned-no-normal-front.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"root_distance_before":before,"root_distance_after_test":after,"body_alignment_retained":aligned,"normal_map_strength":0,"saved_over_master":False},indent=2))
