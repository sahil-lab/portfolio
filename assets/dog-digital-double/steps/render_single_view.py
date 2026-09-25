import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
body = bpy.data.objects["DOG_BODY_RETOPO"]
assert body.get("guide_alignment_restored"), "Render only the corrected aligned master"
assert body.location.length < 1e-7, "Body moved away from its attached guide frame"
view = RENDER_VIEW
folder = RENDER_FOLDER
size = int(RENDER_SIZE)
samples = int(RENDER_SAMPLES)
look = RENDER_LOOK
assert folder.replace("-", "").replace("_", "").isalnum()
assert view.replace("_", "").isalnum()
camera_name = "CAM_" + view
if view.startswith("REF_"):
    camera_name = "CAM_" + view
camera = bpy.data.objects[camera_name]
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.samples = samples
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.resolution_x = size
scene.render.resolution_y = round(size * camera.get("source_height", 1) / camera.get("source_width", 1))
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
neutral = bpy.data.collections["LIGHTING_Neutral_Accuracy"]
beauty = bpy.data.collections["LIGHTING_Beauty_Soft_Studio"]
neutral.hide_render = look == "beauty"
beauty.hide_render = look != "beauty"
prior_override = bpy.context.view_layer.material_override
floor = bpy.data.objects["STUDIO_Ground_Not_For_Export"]
prior_floor_visibility = floor.hide_render
if view in {"REF_07", "REF_08"}:
    floor.hide_render = True
if look == "silhouette":
    clay = bpy.data.materials.get("DOG_Neutral_Silhouette") or bpy.data.materials.new("DOG_Neutral_Silhouette")
    clay.use_nodes = True
    shader = next(node for node in clay.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (.32, .32, .32, 1)
    shader.inputs["Roughness"].default_value = .8
    bpy.context.view_layer.material_override = clay
scene.render.filepath = OUT + "/" + folder + "/" + view + ".png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override = prior_override
    floor.hide_render = prior_floor_visibility
    neutral.hide_render = False
    beauty.hide_render = True
print(json.dumps({"render": scene.render.filepath, "camera": camera.name, "size": [scene.render.resolution_x, scene.render.resolution_y], "samples": samples, "look": look, "aligned_master": True, "native_groom_regions": sum(obj.type == "CURVES" for obj in bpy.data.collections["05_GROOM"].objects)}))
