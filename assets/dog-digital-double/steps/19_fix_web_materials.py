import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
for name in ("dog_basecolor", "dog_roughness", "dog_normal", "fur_length", "fur_density"):
    previous = bpy.data.images.get(name)
    current = bpy.data.images.load(OUT+"/textures/"+name+".png", check_existing=False)
    current.colorspace_settings.name = "sRGB" if name == "dog_basecolor" else "Non-Color"
    assert current.size[0] == 2048 and current.size[1] == 2048
    for owner in bpy.data.materials:
        if owner.use_nodes:
            for node in owner.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image == previous:
                    node.image = current
    if previous:
        previous.name = name+"_SupersededPackedBake"
    current.name = name
    current.pack()
    assert current.packed_file is not None
material = bpy.data.materials["WEB_Fur_Alpha_Cutout_PBR"]
material.use_backface_culling = False
shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
texture = next(node for node in material.node_tree.nodes if node.type == "TEX_IMAGE")
threshold = next(node for node in material.node_tree.nodes if node.type == "MATH")
threshold.operation = "GREATER_THAN"
threshold.inputs[1].default_value = .32
material.alpha_threshold = .32
reports = []
for lod in range(3):
    root = bpy.data.objects["DOG_WEB_LOD%d" % lod]
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
        if obj.type == "MESH" and obj.data.color_attributes.get("Coat"):
            obj.data.color_attributes.active_color = obj.data.color_attributes["Coat"]
    bpy.context.view_layer.objects.active = root
    filename = "dog_web.glb" if lod == 0 else "dog_web_lod%d.glb" % lod
    bpy.ops.export_scene.gltf(filepath=OUT+"/"+filename, export_format="GLB", use_selection=True, export_apply=True, export_animations=False, export_cameras=False, export_lights=False, export_extras=True, export_vertex_color="NAME", export_vertex_color_name="Coat", export_all_vertex_colors=False, export_tangents=True)
    for obj in root.children:
        obj.hide_set(True)
        obj.hide_render = True
    reports.append({"lod": lod, "file": filename, "vertex_color": "Coat"})
scene["web_color_export"] = "Explicit named Coat attribute; body uses its baked basecolor image, avoiding double tint"
bpy.ops.object.select_all(action="DESELECT")
body = bpy.data.objects["DOG_BODY_RETOPO"]
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_06_final.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_master.blend")
print(json.dumps({"corrected_exports": reports, "native_master_preserved": True}))
