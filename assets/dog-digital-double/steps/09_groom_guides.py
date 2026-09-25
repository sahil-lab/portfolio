import bpy
import math
import random
import json
import bisect
from mathutils import Vector

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
groom = bpy.data.collections["05_GROOM"]
assert not any(obj.type == "CURVES" for obj in groom.objects), "Guide groom already exists"
random.seed(230926)
zone_names = ["HEAD", "MUZZLE", "BROWS", "EAR_L", "EAR_R", "NECK", "CHEST", "BODY", "FRONT_LEGS", "REAR_LEGS", "PAWS", "TAIL"]
zone_ids = {name: index + 1 for index, name in enumerate(zone_names)}
guide_counts = {"HEAD": 410, "MUZZLE": 270, "BROWS": 150, "EAR_L": 210, "EAR_R": 210, "NECK": 190, "CHEST": 320, "BODY": 1100, "FRONT_LEGS": 330, "REAR_LEGS": 310, "PAWS": 320, "TAIL": 360}
lengths = {"HEAD": .037, "MUZZLE": .041, "BROWS": .025, "EAR_L": .072, "EAR_R": .068, "NECK": .053, "CHEST": .067, "BODY": .053, "FRONT_LEGS": .047, "REAR_LEGS": .046, "PAWS": .034, "TAIL": .094}

def zone_for(point, surface_name):
    horizontal, depth, height = point
    if "EAR_L" in surface_name:
        return "EAR_L"
    if "EAR_R" in surface_name:
        return "EAR_R"
    if "TAIL" in surface_name:
        return "TAIL"
    if height < .004:
        return None
    if depth < -.147 and height > .184:
        eye_distance = min(math.hypot(horizontal - .0347, height - .2642), math.hypot(horizontal + .0347, height - .2636))
        if depth < -.196 and eye_distance < .016:
            return None
        if depth < -.240 and abs(horizontal) < .020 and .226 < height < .254:
            return None
        if depth < -.200 and height < .249:
            return "MUZZLE"
        if depth < -.193 and .253 < height < .293:
            return "BROWS"
        return "HEAD"
    if height < .030:
        return "PAWS"
    if height < .112 and abs(horizontal) > .028:
        return "FRONT_LEGS" if depth < 0 else "REAR_LEGS"
    if depth < -.080 and height < .199:
        return "CHEST"
    if depth < -.085:
        return "NECK"
    return "BODY"

surfaces = [bpy.data.objects[name] for name in ("DOG_BODY_RETOPO", "DOG_EAR_L", "DOG_EAR_R", "DOG_TAIL")]
for surface in surfaces:
    zone_attribute = surface.data.attributes.get("fur_zone") or surface.data.attributes.new("fur_zone", "INT", "FACE")
    density_attribute = surface.data.attributes.get("groom_density") or surface.data.attributes.new("groom_density", "FLOAT", "FACE")
    for polygon in surface.data.polygons:
        zone = zone_for(surface.matrix_world @ polygon.center, surface.name)
        zone_attribute.data[polygon.index].value = zone_ids.get(zone, 0)
        density_attribute.data[polygon.index].value = 0 if zone is None else 1
    surface.data.update()

hair_material = bpy.data.materials.new("DOG_Principled_Hair_Regional_Coat")
hair_material.use_nodes = True
nodes = hair_material.node_tree.nodes
links = hair_material.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
hair = nodes.new("ShaderNodeBsdfHairPrincipled")
hair.parametrization = "COLOR"
hair.inputs["Roughness"].default_value = .34
if "Radial Roughness" in hair.inputs:
    hair.inputs["Radial Roughness"].default_value = .43
hair.inputs["IOR"].default_value = 1.48
uv = nodes.new("ShaderNodeAttribute")
uv.attribute_name = "surface_uv_coordinate"
texture = nodes.new("ShaderNodeTexImage")
texture.image = bpy.data.images["dog_basecolor"]
links.new(uv.outputs["Vector"], texture.inputs["Vector"])
links.new(texture.outputs["Color"], hair.inputs["Color"])
links.new(hair.outputs["BSDF"], output.inputs["Surface"])
info = nodes.new("ShaderNodeHairInfo")
roughness = nodes.new("ShaderNodeMapRange")
roughness.inputs["From Min"].default_value = 0
roughness.inputs["From Max"].default_value = 1
roughness.inputs["To Min"].default_value = .29
roughness.inputs["To Max"].default_value = .40
links.new(info.outputs["Random"], roughness.inputs["Value"])
links.new(roughness.outputs["Result"], hair.inputs["Roughness"])

depsgraph = bpy.context.evaluated_depsgraph_get()
reports = []
for surface in surfaces:
    evaluated = surface.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    mesh.calc_loop_triangles()
    zones = {}
    for triangle in mesh.loop_triangles:
        vertices = [mesh.vertices[index].co.copy() for index in triangle.vertices]
        center = sum(vertices, Vector()) / 3
        zone = zone_for(surface.matrix_world @ center, surface.name)
        if zone is None:
            continue
        zones.setdefault(zone, []).append((triangle, vertices, triangle.area))
    for zone, triangles in zones.items():
        count = guide_counts[zone]
        cumulative = []
        total = 0
        for triangle, vertices, area_value in triangles:
            total += area_value
            cumulative.append(total)
        curves = bpy.data.hair_curves.new("FUR_" + zone + "_Guides")
        curves.add_curves([12] * count)
        curves.set_types(type="CATMULL_ROM")
        curves.surface = surface
        curves.surface_uv_map = "DOG_UV"
        obj = bpy.data.objects.new("FUR_" + zone, curves)
        groom.objects.link(obj)
        obj.matrix_world = surface.matrix_world.copy()
        curves.materials.append(hair_material)
        positions = curves.attributes["position"]
        radii = curves.attributes.new("radius", "FLOAT", "POINT")
        root_uv = curves.attributes.new("surface_uv_coordinate", "FLOAT2", "CURVE")
        up = curves.attributes.new("guide_up", "FLOAT_VECTOR", "CURVE")
        color_attribute = curves.attributes.new("coat_color", "FLOAT_COLOR", "CURVE")
        for guide_index in range(count):
            triangle_index = min(len(triangles)-1, bisect.bisect_left(cumulative, random.random()*total))
            triangle, vertices, area_value = triangles[triangle_index]
            first = math.sqrt(random.random())
            second = random.random()
            weights = (1-first, first*(1-second), first*second)
            root = sum((vertex * weight for vertex, weight in zip(vertices, weights)), Vector())
            normal = sum((mesh.vertices[index].normal * weight for index, weight in zip(triangle.vertices, weights)), Vector()).normalized()
            uv_value = sum((mesh.uv_layers.active.data[index].uv * weight for index, weight in zip(triangle.loops, weights)), Vector((0, 0)))
            root_uv.data[guide_index].vector = uv_value
            up.data[guide_index].vector = normal
            tint = [0, 0, 0, 1]
            for component in range(3):
                tint[component] = sum(mesh.color_attributes["DOG_CoatColor"].data[index].color[component] * weight for index, weight in zip(triangle.loops, weights))
            color_attribute.data[guide_index].color = tint
            horizontal, depth, height = root
            side = 1 if horizontal >= 0 else -1
            if zone == "HEAD":
                desired = Vector((side*.70, .24, -.50)) if height > .288 else Vector((side*.58, -.12, -.82))
            elif zone == "BROWS":
                desired = Vector((side*.82, -.16, -.38))
            elif zone == "MUZZLE":
                desired = Vector((side*.63, -.28, -.88))
            elif zone.startswith("EAR"):
                desired = Vector((side*.10, -.16, -1))
            elif zone == "TAIL":
                desired = Vector((normal.x*.9, -.48, -.26 + normal.z*.55))
            elif zone == "PAWS":
                desired = Vector((normal.x*.55, normal.y*.45, -.64))
            else:
                desired = Vector((normal.x*.25, .14, -1))
            tangent = desired - normal * desired.dot(normal)
            if tangent.length < .05:
                tangent = Vector((side*.2, .2, -1))
            tangent.normalize()
            across = normal.cross(tangent).normalized()
            strand_length = lengths[zone] * (.80 + random.random()*.36)
            if zone in {"PAWS", "FRONT_LEGS", "REAR_LEGS"}:
                strand_length = min(strand_length, max(.012, height*.85))
            wave = .0022 if zone.startswith("EAR") else .0030
            if zone in {"HEAD", "MUZZLE", "BROWS"}:
                wave = .0016
            phase = random.random()*math.tau
            lift = .016 if zone in {"CHEST", "BODY", "NECK", "TAIL"} else .008
            for point_index in range(12):
                factor = point_index/11
                point = root + normal*(.0005+lift*math.sin(factor*math.pi*.8)) + tangent*(strand_length*factor)
                point += across * (wave*math.sin(factor*math.tau*.8+phase)*math.sin(factor*math.pi))
                point.z -= strand_length*.17*factor*factor
                point.z = max(.001, point.z)
                positions.data[guide_index*12+point_index].vector = point
                radii.data[guide_index*12+point_index].value = .000075 * max(.10,(1-factor)**.7)
        obj["zone_id"] = zone_ids[zone]
        obj["surface_area_m2"] = total
        obj["guide_count"] = count
        obj["base_length_m"] = lengths[zone]
        obj["groom_stage"] = "Editable region-specific guides; densification and sculpt-comb correction pending"
        curves.update_tag()
        reports.append({"zone": zone, "guides": count, "surface": surface.name, "area": total})
    evaluated.to_mesh_clear()
assert len([obj for obj in groom.objects if obj.type == "CURVES"]) == 12
scene["groom_guide_report"] = json.dumps(reports)
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_05_groom.blend")
print(json.dumps({"native_hair_curves_objects": 12, "guides": sum(item["guides"] for item in reports), "zones": reports}))
