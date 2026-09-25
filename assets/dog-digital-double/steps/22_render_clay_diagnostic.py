import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_BODY_RETOPO"]
floor = bpy.data.objects["STUDIO_Ground_Not_For_Export"]
report = {"body_materials": [slot.material.name if slot.material else None for slot in body.material_slots], "floor": {"location": list(floor.location), "rotation": list(floor.rotation_euler), "scale": list(floor.scale), "dimensions": list(floor.dimensions)}, "body_holdout": body.is_holdout, "body_shadow_catcher": body.is_shadow_catcher, "body_modifiers": [{"name": mod.name, "levels": mod.levels, "render_levels": mod.render_levels} for mod in body.modifiers if mod.type == "MULTIRES"]}
material = bpy.data.materials.get("DIAGNOSTIC_Clay") or bpy.data.materials.new("DIAGNOSTIC_Clay")
material.use_nodes = True
shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value = (.22, .24, .25, 1)
shader.inputs["Roughness"].default_value = .8
prior_override = bpy.context.view_layer.material_override
groom_visibility = [(obj, obj.hide_render) for obj in bpy.data.collections["05_GROOM"].objects]
for obj, hidden in groom_visibility:
    obj.hide_render = True
bpy.context.view_layer.material_override = material
scene.camera = bpy.data.objects["CAM_front"]
scene.render.resolution_x = scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.cycles.samples = 12
scene.render.filepath = OUT+"/diagnostics/clay-front.png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override = prior_override
    for obj, hidden in groom_visibility:
        obj.hide_render = hidden
print(json.dumps(report, indent=2))
