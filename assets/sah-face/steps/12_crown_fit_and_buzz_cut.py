import bpy
import math
import random
import bisect
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("hairline_round_two")
assert not head.get("crown_projection_corrected")
if head.mode!="OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_before_crown_fit.blend",copy=True)
camera=REFERENCE_DATA["camera"]
before=[vertex.co.copy() for vertex in head.data.vertices]
diagnostic=json.loads(scene["scalp_projection_diagnostic"])
projected_top=diagnostic["current_projected_top_y"]
target_top=diagnostic["reference_top_pixel_y"]
before_min=projected_top
factor=(390-target_top)/(390-projected_top)
assert 1<factor<1.3
for vertex in head.data.vertices:
    point=vertex.co
    if point.z<.184:
        continue
    depth=point.y+.70
    row=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth
    amount=min(1,max(0,(390-row)/100))
    amount=amount*amount*(3-2*amount)
    corrected_row=390+(row-390)*(1+(factor-1)*amount)
    point.z=.165+(camera["principal_pixel"][1]-corrected_row)*depth/camera["focal_pixels"]
assert max((vertex.co-prior).length for vertex,prior in zip(head.data.vertices,before) if prior.z<.184)<1e-8
uv=head.data.uv_layers.active
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    depth=point.y+.70
    uv.data[loop.index].uv=((camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth)/camera["image_width"],1-(camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth)/camera["image_height"])

hairline=[(318,460),(344,370),(380,272),(423,211),(481,186),(566,198),(638,186),(699,226),(749,306),(779,447),(801,475)]
def threshold_at(horizontal):
    if horizontal<=hairline[0][0]:
        return hairline[0][1]
    for first,second in zip(hairline,hairline[1:]):
        if horizontal<=second[0]:
            fraction=(horizontal-first[0])/(second[0]-first[0])
            return first[1]+(second[1]-first[1])*fraction
    return hairline[-1][1]

def scalp_mask(point):
    depth=point.y+.70
    horizontal=camera["principal_pixel"][0]+camera["focal_pixels"]*point.x/depth
    vertical=camera["principal_pixel"][1]-camera["focal_pixels"]*(point.z-.165)/depth
    edge=threshold_at(horizontal)-vertical+2.4*math.sin(horizontal*.09)
    front=min(1,max(0,(edge+4)/12))
    back=min(1,max(0,(point.y-.040)/.045))
    rear=min(1,max(0,(point.z-.129)/.017))
    return front*(1-back)+rear*back

attribute=head.data.color_attributes.get("SAH_Scalp_Mask") or head.data.color_attributes.new(name="SAH_Scalp_Mask",type="FLOAT_COLOR",domain="CORNER")
for loop in head.data.loops:
    weight=scalp_mask(head.data.vertices[loop.vertex_index].co)
    attribute.data[loop.index].color=(weight,weight,weight,1)
for name in ("SAH_Skin_Base","SAH_Portrait_Reference_Color"):
    material=bpy.data.materials[name]
    nodes,links=material.node_tree.nodes,material.node_tree.links
    shader=next(node for node in nodes if node.type=="BSDF_PRINCIPLED")
    prior_socket=shader.inputs["Base Color"].links[0].from_socket if shader.inputs["Base Color"].is_linked else None
    mask=nodes.new("ShaderNodeVertexColor")
    mask.layer_name="SAH_Scalp_Mask"
    mask.name="Reference_Hairline_Mask"
    blend=nodes.new("ShaderNodeMixRGB")
    blend.name="Close_Cropped_Hair_Undercoat"
    blend.blend_type="MIX"
    blend.inputs[1].default_value=(.29,.143,.083,1)
    blend.inputs[2].default_value=(.025,.014,.008,1)
    links.new(mask.outputs["Color"],blend.inputs[0])
    if prior_socket:
        links.new(prior_socket,blend.inputs[1])
    links.new(blend.outputs[0],shader.inputs["Base Color"])

old=bpy.data.objects["SAH_HAIR_Scalp"]
old.name="SAH_HAIR_Scalp_SecondPass"
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
    weight=scalp_mask(center)
    if weight<.03 or triangle.area<1e-12:
        continue
    total+=triangle.area*weight
    cumulative.append(total)
    entries.append(triangle.index)
curves=bpy.data.hair_curves.new("SAH_Scalp_BuzzCut_Final")
count=82000
curves.add_curves([4]*count)
curves.set_types(type="CATMULL_ROM")
curves.surface=head
curves.surface_uv_map=head.data.uv_layers.active.name
positions=curves.attributes["position"]
radii=curves.attributes.new("radius","FLOAT","POINT")
root_uv=curves.attributes.new("surface_uv_coordinate","FLOAT2","CURVE")
random.seed(852513)
frontal=0
for index in range(count):
    triangle=mesh.loop_triangles[entries[min(len(entries)-1,bisect.bisect_left(cumulative,random.random()*total))]]
    first=math.sqrt(random.random())
    second=random.random()
    weights=(1-first,first*(1-second),first*second)
    root=sum((mesh.vertices[vertex].co*weight for vertex,weight in zip(triangle.vertices,weights)),Vector())
    normal=sum((mesh.vertices[vertex].normal*weight for vertex,weight in zip(triangle.vertices,weights)),Vector()).normalized()
    root_uv.data[index].vector=sum((mesh.uv_layers.active.data[loop].uv*weight for loop,weight in zip(triangle.loops,weights)),Vector((0,0)))
    tangent=Vector((.16 if root.x>0 else -.16,.42,-.20))
    tangent-=normal*tangent.dot(normal)
    if tangent.length<.01:
        tangent=normal.cross(Vector((1,0,0)))
    tangent.normalize()
    length=.00065+random.random()*.00120
    for step in range(4):
        fraction=step/3
        positions.data[index*4+step].vector=root+normal*(.00008+length*.60*fraction)+tangent*(length*.55*fraction)
        radii.data[index*4+step].value=.000033*max(.10,(1-fraction)**.65)
    frontal+=root.y<.035
obj=bpy.data.objects.new("SAH_HAIR_Scalp",curves)
bpy.data.collections["SAH_04_HAIR"].objects.link(obj)
curves.materials.append(bpy.data.materials["SAH_Hair_Short_Dark_Brown"])
curves.update_tag()
after_min=min(camera["principal_pixel"][1]-camera["focal_pixels"]*(vertex.co.z-.165)/(vertex.co.y+.70) for vertex in mesh.vertices)
assert abs(after_min-target_top)<8,"Crown did not reach the observed contour"
evaluated.to_mesh_clear()
obj["strand_count"]=count
head["crown_projection_corrected"]=True
head["crown_projection_report"]=json.dumps({"before_y":before_min,"after_y":after_min,"reference_y":target_top,"facial_vertices_protected":True})
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_10_crown_fitted.blend")
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples=24
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.filepath=OUT+"/renders/crown-fitted-front.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"crown_before_pixel_y":before_min,"crown_after_pixel_y":after_min,"reference_pixel_y":target_top,"scalp_curves":count,"frontal_curves":frontal,"protected_face_unchanged":True}))
