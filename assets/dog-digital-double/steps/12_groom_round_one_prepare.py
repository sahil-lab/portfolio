import bpy
import math
import json
from mathutils import Vector, Quaternion

scene = bpy.context.scene
assert scene.get("groom_correction_rounds_completed", 0) == 0
changes = {"FUR_MUZZLE": .78, "FUR_BROWS": 1.27, "FUR_HEAD": 1.06, "FUR_CHEST": 1.16, "FUR_TAIL": 1.20, "FUR_EAR_L": 1.10, "FUR_EAR_R": 1.07}
for name, scale in changes.items():
    obj = bpy.data.objects[name]
    if obj.get("round_one_length_applied"):
        continue
    attribute = obj.data.attributes["position"]
    for curve in obj.data.curves:
        start = curve.first_point_index
        root = attribute.data[start].vector.copy()
        for index in range(1, len(curve.points)):
            offset = attribute.data[start+index].vector - root
            point = root + offset*scale
            point.z = max(.001, point.z)
            attribute.data[start+index].vector = point
    obj.data.update_tag()
    obj["round_one_length_applied"] = scale
for name in ("FUR_HEAD", "FUR_BROWS", "FUR_MUZZLE", "FUR_EAR_L", "FUR_EAR_R"):
    obj = bpy.data.objects[name]
    group = next(modifier.node_group for modifier in obj.modifiers if modifier.type == "NODES")
    taper = group.nodes["Natural_Fine_Tip_Taper"]
    for link in list(taper.inputs["Radius"].links):
        source = link.from_node
        if source.bl_idname == "ShaderNodeMapRange":
            source.inputs["To Min"].default_value = .000086
            source.inputs["To Max"].default_value = .000012
    density = next(item for item in group.interface.items_tree if item.item_type == "SOCKET" and item.name == "Render Density")
    density.default_value = 1700000
    group.interface_update(bpy.context)
material = bpy.data.materials["DOG_Principled_Hair_Regional_Coat"]
nodes = material.node_tree.nodes
links = material.node_tree.links
hair = next(node for node in nodes if node.type == "BSDF_HAIR_PRINCIPLED")
texture = next(node for node in nodes if node.type == "TEX_IMAGE")
if not nodes.get("Coat_Absorption_Correction"):
    color = nodes.new("ShaderNodeMixRGB")
    color.name = "Coat_Absorption_Correction"
    color.blend_type = "MULTIPLY"
    color.inputs[0].default_value = 1
    color.inputs[2].default_value = (.72, .72, .72, 1)
    links.new(texture.outputs["Color"], color.inputs[1])
    links.new(color.outputs["Color"], hair.inputs["Color"])
for suffix in ("L", "R"):
    bpy.data.objects["DOG_EYELID_"+suffix].hide_render = True
    bpy.data.objects["DOG_EYELID_"+suffix].hide_set(True)
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
brows = bpy.data.objects["FUR_BROWS"]
for modifier in brows.modifiers:
    if modifier.type == "NODES":
        modifier.show_viewport = False
brows.select_set(True)
bpy.context.view_layer.objects.active = brows
window = bpy.context.window_manager.windows[0]
area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
region = next(region for region in area.regions if region.type == "WINDOW")
area.spaces.active.region_3d.view_rotation = Quaternion((1, 0, 0), math.pi/2)
area.spaces.active.region_3d.view_location = Vector((0, -.20, .265))
area.spaces.active.region_3d.view_distance = .42
area.spaces.active.lens = 65
with bpy.context.temp_override(window=window, area=area, region=region):
    bpy.ops.object.mode_set(mode="SCULPT_CURVES")
    bpy.ops.brush.asset_activate(asset_library_type="ESSENTIALS", relative_asset_identifier="brushes/essentials_brushes-curve_sculpt.blend/Brush/Comb")
    brush = scene.tool_settings.curves_sculpt.brush
    brush.size = 72
    brush.strength = .34
print(json.dumps({"curves_sculpt_mode": brows.mode, "brush": scene.tool_settings.curves_sculpt.brush.name, "length_corrections": changes, "next": "native comb strokes in a separate MCP call after viewport refresh"}))
