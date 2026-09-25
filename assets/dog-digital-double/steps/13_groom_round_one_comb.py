import bpy
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
obj = bpy.data.objects["FUR_BROWS"]
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
selection = obj.data.attributes.get(".selection")
if selection:
    obj.data.attributes.remove(selection)
selection = obj.data.attributes.new(".selection", "FLOAT", "POINT")
before = [item.vector.copy() for item in obj.data.attributes["position"].data]
window = bpy.context.window_manager.windows[0]
area = next(area for area in window.screen.areas if area.type == "VIEW_3D")
region = next(region for region in area.regions if region.type == "WINDOW")

with bpy.context.temp_override(window=window, area=area, region=region):
    for side in (-1, 1):
        for band in (4, 7, 9):
            for item in selection.data:
                item.value = 0
            for curve in obj.data.curves:
                start = curve.first_point_index
                root = obj.data.attributes["position"].data[start].vector
                if root.x*side <= 0 or root.y > -.177:
                    continue
                for index in range(band, len(curve.points)):
                    selection.data[start+index].value = 1
            obj.data.update_tag()
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.transform.translate(value=(side*.0006, -.0015, -.0024), use_proportional_edit=False)
            bpy.ops.object.mode_set(mode="OBJECT")
for modifier in obj.modifiers:
    if modifier.type == "NODES":
        modifier.show_viewport = True
positions = obj.data.attributes["position"].data
changed = sum((item.vector-previous).length > 1e-8 for item, previous in zip(positions, before))
assert changed > 0, "Guide edit did not alter brow guides"
for curve in obj.data.curves:
    assert (positions[curve.first_point_index].vector-before[curve.first_point_index]).length < 1e-8, "Guide root moved"
obj["native_edit_points_changed"] = changed
obj["groom_edit_method"] = "User-approved native Edit Mode guide-tip transforms; MCP Comb replay was a verified no-op"
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 800
for name in ("close_face", "front", "three_quarter", "left"):
    scene.camera = bpy.data.objects["CAM_"+name]
    scene.render.filepath = OUT+"/groom-round-1/"+name+".png"
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene["groom_correction_rounds_completed"] = 1
scene["groom_round_one_notes"] = "Deepened brown crown and asymmetric eye masks; shortened moustache bulk; lengthened ear curtains/chest/tail; native Edit Mode tip transforms frame the eyes with stationary roots."
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_05_groom.blend")
print(json.dumps({"correction_round": 1, "native_edit_points_changed": changed, "roots_preserved": True, "renders": 4}))
