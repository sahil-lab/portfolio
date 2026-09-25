import bpy
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("groom_correction_rounds_completed") == 1
groom = bpy.data.collections["05_GROOM"]
assert not scene.get("groom_round_two_applied")
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
roots_before = {}
for obj in groom.objects:
    if obj.type == "CURVES":
        attribute = obj.data.attributes["position"]
        roots_before[obj.name] = [attribute.data[curve.first_point_index].vector.copy() for curve in obj.data.curves]

def select_tip_band(obj, band, side=0, central=False):
    selection = obj.data.attributes.get(".selection")
    if selection and selection.domain != "POINT":
        obj.data.attributes.remove(selection)
        selection = None
    selection = selection or obj.data.attributes.new(".selection", "FLOAT", "POINT")
    for item in selection.data:
        item.value = 0
    positions = obj.data.attributes["position"]
    selected = 0
    for curve in obj.data.curves:
        start = curve.first_point_index
        root = positions.data[start].vector
        if side and root.x*side <= 0:
            continue
        if central and (abs(root.x) > .019 or root.z < .270):
            continue
        if obj.name == "FUR_BROWS" and root.y > -.185:
            continue
        for index in range(band, len(curve.points)):
            selection.data[start+index].value = 1
            selected += 1
    obj.data.update_tag()
    return selected

window = bpy.context.window_manager.windows[0]
area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
region = next(region for region in area.regions if region.type == "WINDOW")
changes = []
for name in ("FUR_HEAD", "FUR_BROWS", "FUR_MUZZLE", "FUR_TAIL", "FUR_EAR_L", "FUR_EAR_R"):
    obj = bpy.data.objects[name]
    positions = obj.data.attributes["position"]
    before = [item.vector.copy() for item in positions.data]
    if name == "FUR_HEAD":
        for curve in obj.data.curves:
            start = curve.first_point_index
            root = positions.data[start].vector.copy()
            if abs(root.x) > .019 or root.z < .270:
                continue
            side = 1 if root.x >= 0 else -1
            for index in range(1, len(curve.points)):
                factor = index/(len(curve.points)-1)
                offset = positions.data[start+index].vector-root
                offset.x *= .24
                offset.y -= .025*factor
                offset.z -= .006*factor
                positions.data[start+index].vector = root+offset
    elif name == "FUR_MUZZLE":
        for curve_index, curve in enumerate(obj.data.curves):
            start = curve.first_point_index
            root = positions.data[start].vector.copy()
            for index in range(1, len(curve.points)):
                factor = index/(len(curve.points)-1)
                offset = positions.data[start+index].vector-root
                offset.x *= .76
                offset.y *= .83
                offset.z -= .006*factor*(.65+.35*math.sin(curve_index*1.7))
                positions.data[start+index].vector = root+offset
    elif name.startswith("FUR_EAR"):
        side = 1 if name.endswith("L") else -1
        for curve_index, curve in enumerate(obj.data.curves):
            start = curve.first_point_index
            root = positions.data[start].vector.copy()
            for index in range(1, len(curve.points)):
                factor = index/(len(curve.points)-1)
                point = positions.data[start+index].vector.copy()
                point.x += side*.0025*math.sin(factor*math.pi*2+curve_index*.64)*factor
                point.z -= .004*factor*(.5+.5*math.sin(curve_index*.93))
                positions.data[start+index].vector = point
    obj.data.update_tag()
    if name == "FUR_BROWS":
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for side in (-1, 1):
            for band in (3, 6, 9):
                select_tip_band(obj, band, side)
                with bpy.context.temp_override(window=window, area=area, region=region):
                    bpy.ops.object.mode_set(mode="EDIT")
                    bpy.ops.transform.translate(value=(-side*.0009, -.0017, -.0018 if side==1 else -.0014), use_proportional_edit=False)
                    bpy.ops.object.mode_set(mode="OBJECT")
    changed = sum((item.vector-earlier).length>1e-8 for item, earlier in zip(positions.data, before))
    changes.append({"region": name, "points_changed": changed})
    group = next(modifier.node_group for modifier in obj.modifiers if modifier.type == "NODES")
    for item in group.interface.items_tree:
        if item.item_type != "SOCKET":
            continue
        if item.name == "Clump Amount":
            item.default_value = .10 if name in {"FUR_HEAD", "FUR_BROWS"} else .16
        if item.name == "Wave Amplitude":
            item.default_value = .0013 if name in {"FUR_HEAD", "FUR_BROWS", "FUR_MUZZLE"} else .0024
    group.interface_update(bpy.context)

material = bpy.data.materials["DOG_Principled_Hair_Regional_Coat"]
nodes, links = material.node_tree.nodes, material.node_tree.links
hair = next(node for node in nodes if node.type == "BSDF_HAIR_PRINCIPLED")
attribute = nodes["Per_Strand_Intrinsic_Coat_Color"]
tone = nodes.new("ShaderNodeGamma")
tone.name = "Brown_Absorption_White_Preserved"
tone.inputs["Gamma"].default_value = 1.70
links.new(attribute.outputs["Color"], tone.inputs["Color"])
links.new(tone.outputs["Color"], hair.inputs["Color"])
for obj in groom.objects:
    if obj.type != "CURVES":
        continue
    positions = obj.data.attributes["position"]
    for index, curve in enumerate(obj.data.curves):
        assert (positions.data[curve.first_point_index].vector-roots_before[obj.name][index]).length < 1e-8, "Groom root moved"
scene["groom_round_two_applied"] = True
scene.cycles.samples = 24
scene.render.resolution_x = scene.render.resolution_y = 900
for name in ("close_face", "front", "three_quarter", "left"):
    scene.camera = bpy.data.objects["CAM_"+name]
    scene.render.filepath = OUT+"/groom-round-2/"+name+".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene["groom_correction_rounds_completed"] = 2
scene["groom_round_two_notes"] = "Narrowed central blaze flow, wrapped irregular brow fringe around eyes, reduced moustache width, darkened brown hair without blackening white regions, added subtle asymmetric ear waves."
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_05_groom.blend")
print(json.dumps({"correction_round": 2, "roots_preserved": True, "guide_changes": changes, "renders": 4}))
