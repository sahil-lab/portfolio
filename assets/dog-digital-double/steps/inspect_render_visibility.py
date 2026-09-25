import bpy
import json

scene = bpy.context.scene
report = {"scene": scene.name, "camera": scene.camera.name, "objects": [], "materials": []}
for name in ("DOG_BODY_RETOPO", "DOG_SCULPT_HIGH", "DOG_EAR_L", "DOG_TAIL", "FUR_BODY", "FUR_HEAD", "FUR_CHEST", "DOG_EYE_L"):
    obj = bpy.data.objects[name]
    entry = {"name": name, "hide_render": obj.hide_render, "hide_viewport": obj.hide_viewport, "visible_get": obj.visible_get(), "visible_camera": obj.visible_camera, "location": list(obj.location), "scale": list(obj.scale), "parent": obj.parent.name if obj.parent else None, "collections": [{"name": owner.name, "render_hidden": owner.hide_render, "viewport_hidden": owner.hide_viewport} for owner in obj.users_collection], "modifiers": [{"name": modifier.name, "type": modifier.type, "render": modifier.show_render, "viewport": modifier.show_viewport} for modifier in obj.modifiers]}
    report["objects"].append(entry)
material = bpy.data.materials["DOG_Coat_Authored_Masks"]
for node in material.node_tree.nodes:
    if node.type == "BSDF_PRINCIPLED":
        report["materials"].append({"material": material.name, "alpha": node.inputs["Alpha"].default_value, "alpha_links": len(node.inputs["Alpha"].links), "transmission": node.inputs["Transmission Weight"].default_value, "color_image": node.inputs["Base Color"].links[0].from_node.image.name})
report["groom_geometry_inputs"] = [{"object": obj.name, "source_surface": obj.data.surface.name, "nodes_surface": next(modifier.node_group.nodes["UV_Mapped_Surface"].inputs["Object"].default_value.name for modifier in obj.modifiers if modifier.type == "NODES")} for obj in bpy.data.collections["05_GROOM"].objects if obj.type == "CURVES"]
depsgraph = bpy.context.evaluated_depsgraph_get()
report["geometry_bounds"] = []
for name in ("DOG_BODY_RETOPO", "DOG_SCULPT_HIGH", "FUR_BODY", "FUR_HEAD"):
    obj = bpy.data.objects[name]
    evaluated = obj.evaluated_get(depsgraph)
    if obj.type == "MESH":
        mesh = evaluated.to_mesh()
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        evaluated.to_mesh_clear()
    else:
        points = [evaluated.matrix_world @ point.vector for point in evaluated.data.attributes["position"].data]
    report["geometry_bounds"].append({"name": name, "points": len(points), "minimum": [min(point[axis] for point in points) for axis in range(3)], "maximum": [max(point[axis] for point in points) for axis in range(3)], "rotation": list(obj.rotation_euler)})
print(json.dumps(report, indent=2))
