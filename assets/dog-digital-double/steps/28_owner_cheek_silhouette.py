import bpy
import math
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("owner_face_groom_v2")
assert not scene.get("owner_cheek_silhouette_v3")
changes = []
for name in ("FUR_HEAD", "FUR_MUZZLE"):
    obj = bpy.data.objects[name]
    positions = obj.data.attributes["position"]
    before = [item.vector.copy() for item in positions.data]
    guides = 0
    for curve_index, curve in enumerate(obj.data.curves):
        start = curve.first_point_index
        root = positions.data[start].vector.copy()
        cheek = name=="FUR_HEAD" and root.z < .270 and root.y < -.155
        if not cheek and name!="FUR_MUZZLE":
            continue
        guides += 1
        variation = .5+.5*math.sin(curve_index*1.713)
        for index in range(1,len(curve.points)):
            factor = index/(len(curve.points)-1)
            offset = positions.data[start+index].vector-root
            if cheek:
                offset.x *= .33
                offset.y *= .62
                offset.z *= .77
                offset.z -= .012*factor*(.75+variation*.30)
            else:
                offset.x *= .79
                offset.y *= .78
                if root.z>.224:
                    offset.z *= .86
                else:
                    offset.z -= .004*factor*variation
            positions.data[start+index].vector = root+offset
        assert (positions.data[start].vector-before[start]).length<1e-8
    obj.data.update_tag()
    changes.append({"region":name,"guides_changed":guides,"points_changed":sum((item.vector-prior).length>1e-8 for item,prior in zip(positions.data,before))})

for suffix, previous in (("L",.0008),("R",.0006)):
    for prefix in ("DOG_EYE_","DOG_CORNEA_","DOG_PUPIL_","DOG_EYELID_"):
        obj = bpy.data.objects.get(prefix+suffix)
        if obj is None:
            continue
        obj.location.y += .0002-previous
        if prefix in {"DOG_EYE_","DOG_CORNEA_"}:
            for vertex in obj.data.vertices:
                vertex.co.y *= .96/.90
        if prefix=="DOG_PUPIL_":
            obj.location.y -= .0007
    cornea = bpy.data.objects["DOG_CORNEA_"+suffix]
    cornea.hide_render = True
    cornea.hide_set(True)
iris = bpy.data.materials["DOG_Eye_Dark_Iris"]
shader = next(node for node in iris.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value = (.013,.0065,.003,1)
shader.inputs["Roughness"].default_value = .24
shader.inputs["Specular IOR Level"].default_value = .32
shader.inputs["Coat Weight"].default_value = .10
shader.inputs["Coat Roughness"].default_value = .20
scene["owner_cheek_silhouette_v3"] = json.dumps({"groom":changes,"eye_depth_ratio":.96,"eye_recession_m":.0002,"cornea":"Retained editable, hidden to remove double highlights; iris carries a restrained wet coat"})
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/cheek-silhouette-pass.blend")
scene.camera = bpy.data.objects["CAM_close_face"]
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.filepath = OUT+"/owner-corrections/cheek-silhouette-after.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"pass":"lower_cheek_and_eye_visibility","groom_changes":changes,"roots_preserved":True,"eye_spacing_unchanged":True}))
