import bpy
import json

parameters = []
for definition in bpy.ops.export_scene.gltf.get_rna_type().properties:
    if "vertex_color" not in definition.identifier and "material" not in definition.identifier:
        continue
    entry = {"name": definition.identifier, "type": definition.type}
    if definition.type == "ENUM":
        entry["values"] = [item.identifier for item in definition.enum_items]
    if hasattr(definition, "default"):
        entry["default"] = definition.default
    parameters.append(entry)
print(json.dumps({"gltf_export_options": parameters, "fur_material_nodes": [{"type": node.bl_idname, "name": node.name} for node in bpy.data.materials["WEB_Fur_Alpha_Cutout_PBR"].node_tree.nodes]}, indent=2))
