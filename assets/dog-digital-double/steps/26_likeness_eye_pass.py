import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.name == "Dog_Digital_Double_MCP"
assert bpy.data.objects["DOG_BODY_RETOPO"].get("guide_alignment_restored")
assert not scene.get("likeness_eye_pass_v1"), "Eye correction already applied"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_before_owner_corrections.blend", copy=True)
scene.camera = bpy.data.objects["CAM_close_face"]
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.cycles.samples = 16
scene.render.filepath = OUT+"/owner-corrections/eyes-before.png"
bpy.ops.render.render(write_still=True)

report = []
for suffix, recession in (("L", .0038), ("R", .0032)):
    eye = bpy.data.objects["DOG_EYE_"+suffix]
    old_location = eye.location.copy()
    old_width = eye.dimensions.x
    for prefix in ("DOG_EYE_", "DOG_CORNEA_", "DOG_PUPIL_", "DOG_EYELID_"):
        obj = bpy.data.objects.get(prefix+suffix)
        if obj is None:
            continue
        obj.location.y += recession
        if prefix in {"DOG_EYE_", "DOG_CORNEA_"}:
            for vertex in obj.data.vertices:
                vertex.co.y *= .78
        if prefix == "DOG_PUPIL_":
            obj.location.y += .0024
    assert abs(eye.location.x-old_location.x)<1e-8
    assert abs(eye.location.z-old_location.z)<1e-8
    assert eye.location.y>old_location.y
    report.append({"eye":suffix,"recessed_m":recession,"depth_scale":.78,"spacing_and_height_unchanged":True,"prior_width_m":old_width})

for name, roughness, specular in (("DOG_Eye_Dark_Iris", .34, .28), ("DOG_Eye_Clear_Cornea", .20, .30), ("DOG_Pupil", .38, .18)):
    material = bpy.data.materials[name]
    shader = next(node for node in material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Specular IOR Level"].default_value = specular
    shader.inputs["Coat Weight"].default_value = 0
    if name=="DOG_Eye_Dark_Iris":
        shader.inputs["Base Color"].default_value = (.0035,.0020,.0012,1)

scene["likeness_eye_pass_v1"] = json.dumps(report)
scene["asset_status"] = "Owner-requested likeness correction in progress; not approved as an exact digital double"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/eyes-pass.blend")
scene.render.filepath = OUT+"/owner-corrections/eyes-after.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"pass":"eyes","changes":report,"comparison":["owner-corrections/eyes-before.png","owner-corrections/eyes-after.png"]}))
