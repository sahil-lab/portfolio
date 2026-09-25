import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_SCULPT_HIGH"]
assert body.get("facial_correction_complete")
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.color_type = "SINGLE"
scene.display.shading.single_color = (.56, .56, .56)
scene.render.resolution_percentage = 60
completed = []
for index in range(1, 9):
    camera = bpy.data.objects["CAM_REF_%02d" % index]
    scene.camera = camera
    scene.render.resolution_x = camera["source_width"]
    scene.render.resolution_y = camera["source_height"]
    scene.render.filepath = OUT + "/reference-anatomy/REF_%02d.png" % index
    bpy.ops.render.render(write_still=True)
    completed.append({"camera": camera.name, "role": camera["reference_role"], "limit": camera["comparison_limit"]})
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene.render.resolution_x = scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene["reference_anatomy_views"] = json.dumps(completed)
scene["anatomy_gate_notes"] = "Fur-free head is broad and muzzle is short. Eye/nose locations remain provisional under hair. No calibrated side photograph; torso depth and joints are lower-confidence. Posed belly/upright photos constrain markings and relative dimensions, not a neutral-pose outline."
print(json.dumps({"anatomy_reference_renders": len(completed), "comparison_views": completed}))
