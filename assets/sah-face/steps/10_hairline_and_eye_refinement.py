import bpy
import math
import random
import bisect
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert not head.get("hairline_round_two")
camera=REFERENCE_DATA["camera"]
hairline=[(318,460),(344,370),(380,272),(423,211),(481,186),(566,198),(638,186),(699,226),(749,306),(779,447),(801,475)]

def line_at(horizontal):
    if horizontal<=hairline[0][0]:
        return hairline[0][1]
    for first,second in zip(hairline,hairline[1:]):
        if horizontal<=second[0]:
            amount=(horizontal-first[0])/(second[0]-first[0])
            return first[1]+(second[1]-first[1])*amount
    return hairline[-1][1]

def scalp_weight(point):
    depth=point.y+.70
    horizontal=camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth
    vertical=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth
    front=min(1,max(0,(line_at(horizontal)-vertical+4)/11))
    back=min(1,max(0,(point.y-.039)/.041))
    rear=min(1,max(0,(point.z-.124)/.014))
    return front*(1-back)+rear*back

attribute=head.data.color_attributes.get("Scalp_Tone") or head.data.color_attributes.new(name="Scalp_Tone",type="FLOAT_COLOR",domain="CORNER")
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    amount=scalp_weight(point)
    skin=(.29,.143,.083)
    clipped=(.066,.038,.023)
    attribute.data[loop.index].color=tuple(skin[index]*(1-amount)+clipped[index]*amount for index in range(3))+(1,)
skull=bpy.data.materials["SAH_Skin_Base"]
node=skull.node_tree.nodes.new("ShaderNodeVertexColor")
node.layer_name="Scalp_Tone"
shader=next(node for node in skull.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
skull.node_tree.links.new(node.outputs["Color"],shader.inputs["Base Color"])
old=bpy.data.objects["SAH_HAIR_Scalp"]
old.name="SAH_HAIR_Scalp_FirstPass"
old.hide_render=True
old.hide_set(True)
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
mesh.calc_loop_triangles()
entries=[]
cumulative=[]
total=0
for triangle in mesh.loop_triangles:
    center=sum((mesh.vertices[index].co for index in triangle.vertices),Vector())/3
    weight=scalp_weight(center)
    if weight<.08 or triangle.area<1e-12:
        continue
    total+=triangle.area*weight
    cumulative.append(total)
    entries.append(triangle.index)
assert total>.005
count=46000
curves=bpy.data.hair_curves.new("SAH_HAIR_Scalp_Refined")
curves.add_curves([5]*count)
curves.set_types(type="CATMULL_ROM")
curves.surface=head
curves.surface_uv_map=head.data.uv_layers.active.name
positions=curves.attributes["position"]
radii=curves.attributes.new("radius","FLOAT","POINT")
uv=curves.attributes.new("surface_uv_coordinate","FLOAT2","CURVE")
random.seed(852524)
for index in range(count):
    triangle=mesh.loop_triangles[entries[min(len(entries)-1,bisect.bisect_left(cumulative,random.random()*total))]]
    first=math.sqrt(random.random())
    second=random.random()
    weights=(1-first,first*(1-second),first*second)
    root=sum((mesh.vertices[vertex].co*weight for vertex,weight in zip(triangle.vertices,weights)),Vector())
    normal=sum((mesh.vertices[vertex].normal*weight for vertex,weight in zip(triangle.vertices,weights)),Vector()).normalized()
    uv.data[index].vector=sum((mesh.uv_layers.active.data[loop].uv*weight for loop,weight in zip(triangle.loops,weights)),Vector((0,0)))
    tangent=Vector((.10 if root.x>0 else -.10,.34,-.20))
    tangent-=normal*tangent.dot(normal)
    if tangent.length<.01:
        tangent=normal.cross(Vector((1,0,0)))
    tangent.normalize()
    length=.0009+random.random()*.00135
    for point_index in range(5):
        fraction=point_index/4
        point=root+normal*(.00016+length*.66*fraction)+tangent*(length*.53*fraction)
        positions.data[index*5+point_index].vector=point
        radii.data[index*5+point_index].value=.000039*max(.12,(1-fraction)**.7)
obj=bpy.data.objects.new("SAH_HAIR_Scalp",curves)
bpy.data.collections["SAH_04_HAIR"].objects.link(obj)
curves.materials.append(bpy.data.materials["SAH_Hair_Short_Dark_Brown"])
curves.update_tag()
obj["strand_count"]=count
obj["root_surface"]="Render-level Multires; 0.16 mm root offset"
obj["hairline_reference"]="Traced frontal hairline IMG_8520, short length and recession checked against IMG_8525"
evaluated.to_mesh_clear()
brows=bpy.data.objects["SAH_HAIR_Brows"]
for curve in brows.data.curves:
    start=curve.first_point_index
    positions=brows.data.attributes["position"]
    for index in range(len(curve.points)):
        positions.data[start+index].vector.z-=.004
brows.data.update_tag()
for suffix in ("R","L"):
    eye=bpy.data.objects["SAH_EYE_"+suffix]
    center=eye.location
    radius=eye.dimensions.x/2
    for name,scale in (("IRIS",1.18),("PUPIL",1.14)):
        disc=bpy.data.objects["SAH_"+name+"_"+suffix]
        for vertex in disc.data.vertices:
            vertex.co.x=center.x+(vertex.co.x-center.x)*scale
            vertex.co.z=center.z+(vertex.co.z-center.z)*scale
            radial=(vertex.co.x-center.x)**2+(vertex.co.z-center.z)**2
            vertex.co.y=center.y-math.sqrt(max(.000001,radius*radius-radial))-(.00016 if name=="IRIS" else .00026)
head["hairline_round_two"]=True
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples=24
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.filepath=OUT+"/renders/refined-hairline-front.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_09_hairline_refined.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"scalp_curves":count,"root_source":"render-resolution skin","brow_fringe_lowered_m":.004,"iris_width_multiplier":1.18,"eye_centers_unchanged":True}))
