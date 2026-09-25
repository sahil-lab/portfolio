import bpy
import math
import random
import bisect
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("scalp_transition_smoothed")
assert bpy.data.objects.get("SAH_HAIR_Scalp") is None
random.seed(240924)
hair_collection=bpy.data.collections["SAH_04_HAIR"]
hair_material=bpy.data.materials.new("SAH_Hair_Short_Dark_Brown")
hair_material.use_nodes=True
nodes=hair_material.node_tree.nodes
links=hair_material.node_tree.links
nodes.clear()
output=nodes.new("ShaderNodeOutputMaterial")
hair=nodes.new("ShaderNodeBsdfHairPrincipled")
valid=[item.identifier for item in hair.bl_rna.properties["parametrization"].enum_items]
assert "COLOR" in valid
hair.parametrization="COLOR"
hair.inputs["Color"].default_value=(.006,.0038,.0025,1)
hair.inputs["Roughness"].default_value=.43
if "Radial Roughness" in hair.inputs:
    hair.inputs["Radial Roughness"].default_value=.50
hair.inputs["IOR"].default_value=1.52
links.new(hair.outputs[0],output.inputs["Surface"])
info=nodes.new("ShaderNodeHairInfo")
color=nodes.new("ShaderNodeValToRGB")
color.color_ramp.elements[0].position=.05
color.color_ramp.elements[0].color=(.0018,.0013,.0010,1)
color.color_ramp.elements[1].position=.95
color.color_ramp.elements[1].color=(.012,.008,.005,1)
links.new(info.outputs["Random"],color.inputs["Fac"])
links.new(color.outputs["Color"],hair.inputs["Color"])

def smooth(minimum,maximum,value):
    amount=min(1,max(0,(value-minimum)/(maximum-minimum)))
    return amount*amount*(3-2*amount)

def zone(point):
    horizontal,depth,height=point
    absolute=abs(horizontal)
    frontal_line=.252-.058*smooth(.043,.082,absolute)
    back_mix=smooth(.034,.095,depth)
    line=frontal_line*(1-back_mix)+.128*back_mix
    if height>line:
        return "Scalp"
    if depth>.037 or height>.198:
        return None
    arch=.184+.007*max(0,1-abs(absolute-.034)/.026)
    if .015<absolute<.060 and abs(height-arch)<.0038:
        return "Brows"
    if absolute<.028 and .098<height<.117 and height<.113-.16*absolute:
        return "Moustache"
    upper_boundary=.096+absolute*.54
    mouth_distance=(horizontal/.031)**2+((height-.093)/.018)**2
    if .040<height<upper_boundary and mouth_distance>1.12:
        return "Beard"
    return None

multires=next(modifier for modifier in head.modifiers if modifier.type=="MULTIRES")
prior_level=multires.levels
multires.levels=1
bpy.context.view_layer.update()
evaluated=head.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=bpy.context.evaluated_depsgraph_get())
mesh.calc_loop_triangles()
groups={}
for triangle in mesh.loop_triangles:
    points=[mesh.vertices[index].co.copy() for index in triangle.vertices]
    center=sum(points,Vector())/3
    name=zone(center)
    if name is None or triangle.area<1e-12:
        continue
    if name!="Scalp" and triangle.normal.y>.15:
        continue
    groups.setdefault(name,[]).append((triangle.index,triangle.area))
counts={"Scalp":30000,"Beard":8500,"Brows":2100,"Moustache":1700}
report=[]
for name,entries in groups.items():
    cumulative=[]
    total=0
    for triangle_index,area in entries:
        total+=area
        cumulative.append(total)
    count=counts[name]
    curves=bpy.data.hair_curves.new("SAH_HAIR_"+name)
    curves.add_curves([5]*count)
    curves.set_types(type="CATMULL_ROM")
    curves.surface=head
    curves.surface_uv_map=head.data.uv_layers.active.name
    positions=curves.attributes["position"]
    radius=curves.attributes.new("radius","FLOAT","POINT")
    uv=curves.attributes.new("surface_uv_coordinate","FLOAT2","CURVE")
    lengths=[]
    for index in range(count):
        choice=min(len(entries)-1,bisect.bisect_left(cumulative,random.random()*total))
        triangle=mesh.loop_triangles[entries[choice][0]]
        first=math.sqrt(random.random())
        second=random.random()
        weights=(1-first,first*(1-second),first*second)
        root=sum((mesh.vertices[vertex].co*weight for vertex,weight in zip(triangle.vertices,weights)),Vector())
        normal=sum((mesh.vertices[vertex].normal*weight for vertex,weight in zip(triangle.vertices,weights)),Vector()).normalized()
        texture=sum((mesh.uv_layers.active.data[loop].uv*weight for loop,weight in zip(triangle.loops,weights)),Vector((0,0)))
        uv.data[index].vector=texture
        side=1 if root.x>0 else -1
        if name=="Scalp":
            desired=Vector((side*.12,.38,.25 if root.z>.242 else -.55))
            length=.00075+random.random()*.00120
            lift=.58
        elif name=="Brows":
            desired=Vector((side*.85,-.10,-.08))
            length=.0014+random.random()*.0019
            lift=.18
        elif name=="Moustache":
            desired=Vector((side*.42,-.05,-.85))
            length=.0011+random.random()*.0010
            lift=.24
        else:
            desired=Vector((side*.10,-.08,-1))
            length=.0007+random.random()*(.0016 if root.z<.07 else .0010)
            lift=.32
        tangent=desired-normal*desired.dot(normal)
        if tangent.length<.05:
            tangent=normal.cross(Vector((1,0,0)))
        if tangent.length<.05:
            tangent=Vector((0,0,-1))
        tangent.normalize()
        across=normal.cross(tangent).normalized()
        bend=(random.random()-.5)*.00020
        for point_index in range(5):
            factor=point_index/4
            point=root+normal*(.000018+length*lift*factor)+tangent*(length*(1-lift*.45)*factor)
            point+=across*bend*math.sin(factor*math.pi)
            positions.data[index*5+point_index].vector=point
            radius.data[index*5+point_index].value=(.000025 if name=="Scalp" else .000032)*max(.12,(1-factor)**.6)
        lengths.append(length)
    obj=bpy.data.objects.new(curves.name,curves)
    hair_collection.objects.link(obj)
    curves.materials.append(hair_material)
    curves.update_tag()
    obj["region"]=name
    obj["reference"]="Short scalp from IMG_8525; beard and brow layout from IMG_8520 and underside IMG_8528"
    obj["strand_count"]=count
    report.append({"region":name,"curves":count,"length_m_min":min(lengths),"length_m_max":max(lengths)})
evaluated.to_mesh_clear()
multires.levels=prior_level
assert len(report)==4
scene["native_hair_report"]=json.dumps(report)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_08_stubble.blend")
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.cycles.samples=24
scene.render.filepath=OUT+"/renders/stubble-front.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"native_hair_regions":report,"total_curves":sum(item["curves"] for item in report),"face_scope":"head only"},indent=2))
