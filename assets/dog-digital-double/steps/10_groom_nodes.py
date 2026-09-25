import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
groom = bpy.data.collections["05_GROOM"]
hair_material = bpy.data.materials["DOG_Principled_Hair_Regional_Coat"]
reports = []

def named_socket(node, name, socket_type=None):
    for socket in node.inputs:
        if socket.name == name and (socket_type is None or socket.type == socket_type):
            return socket
    raise ValueError("Missing input " + name + " on " + node.bl_idname)

for obj in groom.objects:
    if obj.type != "CURVES":
        continue
    for existing in list(obj.modifiers):
        if existing.type == "NODES" and existing.name.startswith("GROOM_"):
            obj.modifiers.remove(existing)
    group = bpy.data.node_groups.new(obj.name + "_Interpolate_Clump_Noise", "GeometryNodeTree")
    group.interface.new_socket(name="Guides", in_out="INPUT", socket_type="NodeSocketGeometry")
    group.interface.new_socket(name="Groom", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    density_input = group.interface.new_socket(name="Render Density", in_out="INPUT", socket_type="NodeSocketFloat")
    density_input.default_value = 1200000 if obj.name != "FUR_TAIL" else 1900000
    density_input.min_value = 0
    density_input.max_value = 6000000
    viewport_input = group.interface.new_socket(name="Viewport Fraction", in_out="INPUT", socket_type="NodeSocketFloat")
    viewport_input.default_value = .10
    viewport_input.min_value = .01
    viewport_input.max_value = 1
    clump_input = group.interface.new_socket(name="Clump Amount", in_out="INPUT", socket_type="NodeSocketFloat")
    clump_input.default_value = .12 if "EAR" in obj.name else .17
    clump_input.min_value = 0
    clump_input.max_value = .7
    wave_input = group.interface.new_socket(name="Wave Amplitude", in_out="INPUT", socket_type="NodeSocketFloat")
    wave_input.default_value = .0009 if obj.name in {"FUR_BROWS", "FUR_MUZZLE"} else .0016
    nodes, links = group.nodes, group.links
    source = nodes.new("NodeGroupInput")
    source.location = (-1100, 100)
    output = nodes.new("NodeGroupOutput")
    output.location = (1100, 100)
    surface = nodes.new("GeometryNodeObjectInfo")
    surface.name = "UV_Mapped_Surface"
    surface.transform_space = "RELATIVE"
    surface.inputs["Object"].default_value = obj.data.surface
    surface.location = (-1100, -150)
    zone = nodes.new("GeometryNodeInputNamedAttribute")
    zone.data_type = "INT"
    zone.inputs["Name"].default_value = "fur_zone"
    compare = nodes.new("FunctionNodeCompare")
    compare.data_type = "INT"
    compare.operation = "EQUAL"
    named_socket(compare, "B", "INT").default_value = obj["zone_id"]
    links.new(zone.outputs["Attribute"], named_socket(compare, "A", "INT"))
    density = nodes.new("GeometryNodeInputNamedAttribute")
    density.data_type = "FLOAT"
    density.inputs["Name"].default_value = "groom_density"
    is_viewport = nodes.new("GeometryNodeIsViewport")
    viewport_scale = nodes.new("ShaderNodeMath")
    viewport_scale.operation = "MULTIPLY"
    links.new(source.outputs["Render Density"], viewport_scale.inputs[0])
    links.new(source.outputs["Viewport Fraction"], viewport_scale.inputs[1])
    switch = nodes.new("GeometryNodeSwitch")
    switch.input_type = "FLOAT"
    links.new(is_viewport.outputs["Is Viewport"], switch.inputs["Switch"])
    links.new(source.outputs["Render Density"], switch.inputs["False"])
    links.new(viewport_scale.outputs[0], switch.inputs["True"])
    masked_density = nodes.new("ShaderNodeMath")
    masked_density.operation = "MULTIPLY"
    links.new(switch.outputs["Output"], masked_density.inputs[0])
    links.new(density.outputs["Attribute"], masked_density.inputs[1])
    distribute = nodes.new("GeometryNodeDistributePointsOnFaces")
    distribute.distribute_method = "RANDOM"
    distribute.name = "Density_Masked_Surface_Roots"
    distribute.location = (-650, -100)
    distribute.inputs["Seed"].default_value = 23 + obj["zone_id"] * 17
    links.new(surface.outputs["Geometry"], distribute.inputs["Mesh"])
    links.new(compare.outputs["Result"], distribute.inputs["Selection"])
    links.new(masked_density.outputs[0], distribute.inputs["Density"])
    root_uv = nodes.new("GeometryNodeInputNamedAttribute")
    root_uv.data_type = "FLOAT_VECTOR"
    root_uv.inputs["Name"].default_value = "DOG_UV"
    store_uv = nodes.new("GeometryNodeStoreNamedAttribute")
    store_uv.domain = "POINT"
    store_uv.data_type = "FLOAT_VECTOR"
    store_uv.inputs["Name"].default_value = "surface_uv_coordinate"
    links.new(distribute.outputs["Points"], store_uv.inputs["Geometry"])
    links.new(root_uv.outputs["Attribute"], store_uv.inputs["Value"])
    guides_up = nodes.new("GeometryNodeInputNamedAttribute")
    guides_up.data_type = "FLOAT_VECTOR"
    guides_up.inputs["Name"].default_value = "guide_up"
    interpolate = nodes.new("GeometryNodeInterpolateCurves")
    interpolate.name = "INTERPOLATE_HAIR_CURVES"
    interpolate.location = (-350, 100)
    interpolate.inputs["Max Neighbors"].default_value = 3
    links.new(source.outputs["Guides"], interpolate.inputs["Guide Curves"])
    links.new(guides_up.outputs["Attribute"], interpolate.inputs["Guide Up"])
    links.new(store_uv.outputs["Geometry"], interpolate.inputs["Points"])
    links.new(distribute.outputs["Normal"], interpolate.inputs["Point Up"])
    factor = nodes.new("GeometryNodeSplineParameter")
    guide_sample = nodes.new("GeometryNodeSampleCurve")
    guide_sample.data_type = "FLOAT"
    guide_sample.mode = "FACTOR"
    guide_sample.use_all_curves = False
    guide_sample.name = "Nearest_Guide_Clump_Target"
    links.new(source.outputs["Guides"], guide_sample.inputs["Curves"])
    links.new(factor.outputs["Factor"], guide_sample.inputs["Factor"])
    links.new(interpolate.outputs["Closest Index"], guide_sample.inputs["Curve Index"])
    position = nodes.new("GeometryNodeInputPosition")
    difference = nodes.new("ShaderNodeVectorMath")
    difference.operation = "SUBTRACT"
    links.new(guide_sample.outputs["Position"], difference.inputs[0])
    links.new(position.outputs["Position"], difference.inputs[1])
    clump_weight = nodes.new("ShaderNodeMath")
    clump_weight.operation = "MULTIPLY"
    links.new(factor.outputs["Factor"], clump_weight.inputs[0])
    links.new(source.outputs["Clump Amount"], clump_weight.inputs[1])
    clump_offset = nodes.new("ShaderNodeVectorMath")
    clump_offset.operation = "SCALE"
    links.new(difference.outputs["Vector"], clump_offset.inputs[0])
    links.new(clump_weight.outputs[0], clump_offset.inputs["Scale"])
    noise = nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 95 if "EAR" in obj.name else 125
    noise.inputs["Detail"].default_value = 1.5
    noise.inputs["Roughness"].default_value = .4
    links.new(position.outputs["Position"], noise.inputs["Vector"])
    center_noise = nodes.new("ShaderNodeVectorMath")
    center_noise.operation = "SUBTRACT"
    center_noise.inputs[1].default_value = (.5, .5, .5)
    links.new(noise.outputs["Color"], center_noise.inputs[0])
    wave_weight = nodes.new("ShaderNodeMath")
    wave_weight.operation = "MULTIPLY"
    links.new(source.outputs["Wave Amplitude"], wave_weight.inputs[0])
    links.new(factor.outputs["Factor"], wave_weight.inputs[1])
    wave_offset = nodes.new("ShaderNodeVectorMath")
    wave_offset.operation = "SCALE"
    links.new(center_noise.outputs["Vector"], wave_offset.inputs[0])
    links.new(wave_weight.outputs[0], wave_offset.inputs["Scale"])
    offset = nodes.new("ShaderNodeVectorMath")
    offset.operation = "ADD"
    links.new(clump_offset.outputs["Vector"], offset.inputs[0])
    links.new(wave_offset.outputs["Vector"], offset.inputs[1])
    displace = nodes.new("GeometryNodeSetPosition")
    displace.name = "CLUMP_AND_RESTRAINED_WAVE"
    displace.location = (50, 100)
    links.new(interpolate.outputs["Curves"], displace.inputs["Geometry"])
    links.new(offset.outputs["Vector"], displace.inputs["Offset"])
    taper = nodes.new("ShaderNodeMapRange")
    taper.inputs["From Min"].default_value = 0
    taper.inputs["From Max"].default_value = 1
    taper.inputs["To Min"].default_value = .000070
    taper.inputs["To Max"].default_value = .000008
    links.new(factor.outputs["Factor"], taper.inputs["Value"])
    radius = nodes.new("GeometryNodeSetCurveRadius")
    radius.name = "Natural_Fine_Tip_Taper"
    radius.location = (350, 100)
    links.new(displace.outputs["Geometry"], radius.inputs["Curve"])
    links.new(taper.outputs["Result"], radius.inputs["Radius"])
    material = nodes.new("GeometryNodeSetMaterial")
    material.inputs["Material"].default_value = hair_material
    links.new(radius.outputs["Curve"], material.inputs["Geometry"])
    links.new(material.outputs["Geometry"], output.inputs["Groom"])
    modifier = obj.modifiers.new("GROOM_Interpolate_Clump_Wave", "NODES")
    modifier.node_group = group
    obj["groom_stage"] = "Guide interpolation with surface density mask, restrained nearest-guide clumping and wave"
    obj["render_density_socket"] = density_input.identifier
    obj["viewport_fraction_socket"] = viewport_input.identifier
    obj["clump_socket"] = clump_input.identifier
    obj["wave_socket"] = wave_input.identifier
    reports.append({"zone": obj.name, "node_count": len(nodes), "render_density": density_input.default_value, "viewport_fraction": .10})
depsgraph = bpy.context.evaluated_depsgraph_get()
total_curves = 0
for obj in groom.objects:
    if obj.type == "CURVES":
        evaluated = obj.evaluated_get(depsgraph)
        count = len(evaluated.data.curves)
        assert count > obj["guide_count"], obj.name + " was not densified"
        total_curves += count
        obj["verified_viewport_strands"] = count
scene["groom_node_report"] = json.dumps(reports)
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_05_groom.blend")
print(json.dumps({"native_groom_regions": len(reports), "viewport_strands": total_curves, "render_density_multiplier": 10, "node_groups": reports}))
