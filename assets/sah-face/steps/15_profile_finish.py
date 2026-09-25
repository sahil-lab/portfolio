import bpy
import math
import random
import bisect
import json
from mathutils import Vector, Matrix

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("detail_roots_attached")
assert not head.get("profile_finish_complete")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_before_profile_finish.blend",copy=True)

def smooth(minimum,maximum,value):
    fraction=min(1,max(0,(value-minimum)/(maximum-minimum)))
    return fraction*fraction*(3-2*fraction)

attribute=head.data.color_attributes["SAH_SideSkin"]
scalp=head.data.color_attributes["SAH_Scalp_Mask"]
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    beard=(1-smooth(.126,.157,point.z))*(1-smooth(.087,.126,point.y))
    beard=max(beard,smooth(.051,.075,abs(point.x))*(1-smooth(.163,.179,point.z))*(1-smooth(.083,.106,point.y)))
    skin=(.31,.155,.089)
    dark=(.070,.037,.022)
    values=[skin[index]*(1-beard*.53)+dark[index]*beard*.53 for index in range(3)]
    hair=scalp.data[loop.index].color[0]
    values=[value*(1-hair)+(.025,.014,.008)[index]*hair for index,value in enumerate(values)]
    attribute.data[loop.index].color=(*values,1)
material=bpy.data.materials["SAH_Portrait_Reference_Color"]
nodes,links=material.node_tree.nodes,material.node_tree.links
blend=nodes["Continuous_Face_To_Side_Skin"]
old_weight=blend.inputs[0].links[0].from_socket
geometry=next(node for node in nodes if node.type=="NEW_GEOMETRY")
normal=nodes.new("ShaderNodeSeparateXYZ")
links.new(geometry.outputs["Normal"],normal.inputs[0])
facing=nodes.new("ShaderNodeMapRange")
facing.name="Stop_Frontal_Projection_On_Side_Planes"
facing.inputs["From Min"].default_value=-.65
facing.inputs["From Max"].default_value=-.10
facing.inputs["To Min"].default_value=0
facing.inputs["To Max"].default_value=1
links.new(normal.outputs["Y"],facing.inputs["Value"])
maximum=nodes.new("ShaderNodeMath")
assert "MAXIMUM" in [item.identifier for item in maximum.bl_rna.properties["operation"].enum_items]
maximum.operation="MAXIMUM"
links.new(facing.outputs["Result"],maximum.inputs[0])
links.new(old_weight,maximum.inputs[1])
links.new(maximum.outputs[0],blend.inputs[0])
material["projection_falloff"]="Front-facing surfaces retain local reference color; side planes blend to authored skin, avoiding projection streaks"

for suffix,side in (("R",-1),("L",1)):
    ear=bpy.data.objects["SAH_EAR_"+suffix]
    pivot=Vector((side*.078,.050,.134 if suffix=="R" else .132))
    angle=side*math.radians(42)
    transform=Matrix.Translation(pivot)@Matrix.Rotation(angle,4,"Z")@Matrix.Translation(-pivot)
    for prefix in ("SAH_EAR_","SAH_Antihelix_","SAH_Concha_Recess_"):
        obj=bpy.data.objects[prefix+suffix]
        obj.matrix_world=transform@obj.matrix_world
        obj["profile_orientation"]="Cartilage tilted outward from the skull; oblique ear depth is inferred"

bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
mesh.calc_loop_triangles()
entries=[]
cumulative=[]
total=0
for triangle in mesh.loop_triangles:
    point=sum((mesh.vertices[index].co for index in triangle.vertices),Vector())/3
    weight=smooth(.049,.069,abs(point.x))*smooth(.025,.05,point.y)*(1-smooth(.088,.122,point.y))*(1-smooth(.136,.163,point.z))*smooth(.046,.066,point.z)
    if weight>.03 and triangle.area>1e-12:
        total+=triangle.area*weight
        entries.append(triangle.index)
        cumulative.append(total)
assert entries
count=4200
curves=bpy.data.hair_curves.new("SAH_Sideburns_Short")
curves.add_curves([4]*count)
curves.set_types(type="CATMULL_ROM")
curves.surface=head
curves.surface_uv_map=head.data.uv_layers.active.name
positions=curves.attributes["position"]
radii=curves.attributes.new("radius","FLOAT","POINT")
root_uv=curves.attributes.new("surface_uv_coordinate","FLOAT2","CURVE")
random.seed(240915)
for index in range(count):
    triangle=mesh.loop_triangles[entries[min(len(entries)-1,bisect.bisect_left(cumulative,random.random()*total))]]
    first=math.sqrt(random.random())
    second=random.random()
    weights=(1-first,first*(1-second),first*second)
    root=sum((mesh.vertices[vertex].co*weight for vertex,weight in zip(triangle.vertices,weights)),Vector())
    outward=sum((mesh.vertices[vertex].normal*weight for vertex,weight in zip(triangle.vertices,weights)),Vector()).normalized()
    tangent=Vector((0,-.10,-1))
    tangent-=outward*tangent.dot(outward)
    if tangent.length<.01:
        tangent=Vector((1,0,0))
    tangent.normalize()
    root_uv.data[index].vector=sum((mesh.uv_layers.active.data[loop].uv*weight for loop,weight in zip(triangle.loops,weights)),Vector((0,0)))
    length=.0006+random.random()*.0011
    for point_index in range(4):
        factor=point_index/3
        positions.data[index*4+point_index].vector=root+outward*(.000045+length*.28*factor)+tangent*length*.90*factor
        radii.data[index*4+point_index].value=.00003*max(.10,(1-factor)**.65)
obj=bpy.data.objects.new("SAH_HAIR_Sideburns",curves)
bpy.data.collections["SAH_04_HAIR"].objects.link(obj)
curves.materials.append(bpy.data.materials["SAH_Hair_Short_Dark_Brown"])
curves.update_tag()
obj["strand_count"]=count
obj["reference_limit"]="Sideburn continuation inferred from the front and underside photos; no profile photo provided"
evaluated.to_mesh_clear()
head["profile_finish_complete"]=True
scene.camera=bpy.data.objects["SAH_CAM_THREE_QUARTER"]
scene.render.resolution_x=900
scene.render.resolution_y=1080
scene.cycles.samples=24
scene.render.filepath=OUT+"/renders/profile-finished-three-quarter.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_13_profile_refined.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"projection_streaks_addressed":True,"ears_tilted_degrees":42,"sideburn_curves":count,"central_face_geometry_unchanged":True}))
