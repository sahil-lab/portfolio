import bpy
import math
import json
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("groom_correction_rounds_completed") == 2, "Check the previous render/save before making more edits"
assert not scene.get("eye_window_correction_applied")
if bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
groom = bpy.data.collections["05_GROOM"]
eyes = [bpy.data.objects["DOG_EYE_" + side].location.copy() for side in ("L", "R")]
changes = []
for obj in groom.objects:
    if obj.type != "CURVES":
        continue
    positions = obj.data.attributes["position"]
    before = [item.vector.copy() for item in positions.data]
    facial = obj.name in {"FUR_HEAD", "FUR_BROWS", "FUR_MUZZLE"}
    for curve_index, curve in enumerate(obj.data.curves):
        start = curve.first_point_index
        root = positions.data[start].vector.copy()
        side = 1 if root.x >= 0 else -1
        for index in range(1, len(curve.points)):
            factor = index / (len(curve.points) - 1)
            point = positions.data[start + index].vector.copy()
            if obj.name == "FUR_BROWS":
                point.x += side * .0025 * factor
                point.z += .0055 * factor
            if obj.name == "FUR_MUZZLE":
                offset = point - root
                offset.x *= .85
                point = root + offset
            if facial:
                for eye in eyes:
                    if point.y > eye.y + .004 or point.y < eye.y - .068:
                        continue
                    horizontal = (point.x - eye.x) / .0138
                    vertical = (point.z - eye.z) / .0118
                    distance = math.hypot(horizontal, vertical)
                    if distance < 1.08:
                        if distance < .05:
                            horizontal, vertical, distance = side * .3, 1, 1.044
                        edge = 1.10 / distance
                        point.x = eye.x + horizontal * edge * .0138
                        point.z = eye.z + vertical * edge * .0118
            wave = .0014 if facial else .0024
            if obj.name.startswith("FUR_EAR"):
                point.z += .007 * factor
                wave = .0022
            amplitude = math.sin(math.pi * factor) * wave
            phase = math.sin(curve_index * 7.17) * 2.1
            point.x += amplitude * math.sin(factor * math.pi * 3 + phase)
            point.y += amplitude * .65 * math.sin(factor * math.pi * 2.2 + phase + .4)
            point.z = max(.001, point.z)
            positions.data[start + index].vector = point
        assert (positions.data[start].vector - root).length < 1e-8
    obj.data.update_tag()
    changed = sum((item.vector - previous).length > 1e-8 for item, previous in zip(positions.data, before))
    changes.append({"region": obj.name, "points": changed})
    group = next(modifier.node_group for modifier in obj.modifiers if modifier.type == "NODES")
    group.nodes["INTERPOLATE_HAIR_CURVES"].inputs["Max Neighbors"].default_value = 2
    for item in group.interface.items_tree:
        if item.item_type == "SOCKET" and item.name == "Clump Amount":
            item.default_value = .09 if facial else .20
    group.interface_update(bpy.context)

material = bpy.data.materials["DOG_Nose_Satin_Leather"]
nodes, links = material.node_tree.nodes, material.node_tree.links
shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value = (.004, .003, .0025, 1)
shader.inputs["Roughness"].default_value = .52
texture = nodes.new("ShaderNodeTexNoise")
texture.inputs["Scale"].default_value = 1450
texture.inputs["Detail"].default_value = 2
bump = nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = .10
bump.inputs["Distance"].default_value = .00012
links.new(texture.outputs["Fac"], bump.inputs["Height"])
links.new(bump.outputs["Normal"], shader.inputs["Normal"])
scene["eye_window_correction_applied"] = True
scene["groom_eye_visibility_notes"] = "Original eye centers/radii preserved; small hair apertures opened around corneas; regional guides received restrained irregular waves."
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_05_groom.blend")
scene.camera = bpy.data.objects["CAM_close_face"]
scene.cycles.samples = 20
scene.render.resolution_x = scene.render.resolution_y = 900
scene.render.filepath = OUT + "/groom-round-3/close_face.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"eye_sizes_unchanged": True, "roots_preserved": True, "guide_changes": changes, "render": "groom-round-3/close_face.png"}))
