import bpy
import math
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("likeness_eye_pass_v1"), "Resume the verified eye-pass checkpoint"
assert not scene.get("owner_face_groom_v2"), "Correction already applied"
body = bpy.data.objects["DOG_BODY_RETOPO"]
assert body.get("guide_alignment_restored") and body.location.length < 1e-7
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/before-face-groom.blend", copy=True)

eye_report = []
for suffix, previous_recession, target_recession in (("L", .0038, .0008), ("R", .0032, .0006)):
    eye = bpy.data.objects["DOG_EYE_"+suffix]
    before = eye.location.copy()
    for prefix in ("DOG_EYE_", "DOG_CORNEA_", "DOG_PUPIL_", "DOG_EYELID_"):
        obj = bpy.data.objects.get(prefix+suffix)
        if obj is None:
            continue
        obj.location.y += target_recession-previous_recession
        if prefix in {"DOG_EYE_", "DOG_CORNEA_"}:
            for vertex in obj.data.vertices:
                vertex.co.y *= .90/.78
        if prefix == "DOG_PUPIL_":
            obj.location.y -= .0012
    assert abs(eye.location.x-before.x)<1e-8 and abs(eye.location.z-before.z)<1e-8
    eye_report.append({"side":suffix,"recession_from_original_m":target_recession,"depth_ratio_from_original":.90,"spacing_preserved":True})
for name, roughness in (("DOG_Eye_Dark_Iris", .28), ("DOG_Eye_Clear_Cornea", .14)):
    shader = next(node for node in bpy.data.materials[name].node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = 0
    shader.inputs["Specular IOR Level"].default_value = .27

reports = []
for name in ("FUR_MUZZLE", "FUR_CHEST", "FUR_FRONT_LEGS", "FUR_PAWS", "FUR_EAR_L", "FUR_EAR_R"):
    obj = bpy.data.objects[name]
    positions = obj.data.attributes["position"]
    before = [item.vector.copy() for item in positions.data]
    for curve_index, curve in enumerate(obj.data.curves):
        start = curve.first_point_index
        root = positions.data[start].vector.copy()
        side = 1 if root.x>=0 else -1
        variation = .5+.5*math.sin(curve_index*2.173+side*.71)
        for index in range(1,len(curve.points)):
            factor = index/(len(curve.points)-1)
            offset = positions.data[start+index].vector-root
            if name=="FUR_MUZZLE":
                offset.x *= .63+variation*.12
                offset.y *= .70
                offset.z *= .80
                offset.z -= factor*(.006 if root.z>.231 else .017)*( .78+variation*.34)
                offset.x += side*factor*.0018
                offset.y -= factor*.0015
            elif name=="FUR_CHEST":
                offset.x += side*.013*math.sin(factor*math.pi*.6)*min(1,abs(root.x)/.025)
                offset.z *= 1.15
                offset.y -= .004*factor
            elif name=="FUR_FRONT_LEGS":
                offset.z *= 1.14
                offset.x += side*.003*factor
            elif name=="FUR_PAWS":
                offset.x *= .85
                offset.y *= .90
            else:
                offset.x += .0015*math.sin(factor*math.pi*2.7+curve_index*.43)*math.sin(factor*math.pi)
                offset.y += .0018*math.sin(factor*math.pi*1.9+curve_index*.91)*factor
                offset.z *= .93+variation*.14
            point = root+offset
            point.z = max(.0008,point.z)
            positions.data[start+index].vector = point
        assert (positions.data[start].vector-before[start]).length<1e-8, "A groom root moved"
    obj.data.update_tag()
    changed = sum((item.vector-prior).length>1e-8 for item,prior in zip(positions.data,before))
    assert changed>0
    reports.append({"region":name,"changed_points":changed,"roots_preserved":True})

mouth = bpy.data.objects.get("DOG_MOUTH_INNER")
if mouth:
    mouth.hide_render = True
    mouth.hide_set(True)
scene["owner_face_groom_v2"] = json.dumps({"eyes":eye_report,"groom":reports,"mouth":"Tidy exposed smile hidden beneath the reference-like moustache"})
scene["asset_status"] = "Owner-requested face and groom correction, awaiting matched-camera review"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/face-groom-pass.blend")
scene.camera = bpy.data.objects["CAM_close_face"]
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.cycles.samples = 16
scene.render.filepath = OUT+"/owner-corrections/face-groom-after.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"eye_correction":eye_report,"groom_correction":reports,"render":"owner-corrections/face-groom-after.png"},indent=2))
