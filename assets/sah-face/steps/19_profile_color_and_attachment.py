import bpy
import math
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT=ROOT+"/outputs/sah-face/profile-revision"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("profile_surface_refined")
assert not head.get("side_reference_color_pass")

def smooth(minimum,maximum,value):
    amount=min(1,max(0,(value-minimum)/(maximum-minimum)))
    return amount*amount*(3-2*amount)

for suffix,side in (("R",-1),("L",1)):
    for prefix in ("SAH_EAR_","SAH_Antihelix_","SAH_AntihelixFork_","SAH_Concha_Recess_"):
        obj=next(obj for obj in bpy.data.collections["SAH_03_FACE_FEATURES"].objects if obj.name.startswith(prefix+suffix) and not obj.hide_render)
        obj.location.x=side*.082 if prefix=="SAH_Concha_Recess_" else -side*.006
    ear=bpy.data.objects["SAH_EAR_"+suffix]
    ear["base_attachment_adjustment_m"]=-.006
bpy.context.view_layer.update()
weights=head.data.color_attributes.get("SAH_Profile_Blend") or head.data.color_attributes.new(name="SAH_Profile_Blend",type="FLOAT_COLOR",domain="CORNER")
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    outward=head.data.vertices[loop.vertex_index].normal
    weight=smooth(.024,.060,abs(point.x))*smooth(.012,.049,point.y)*smooth(.15,.74,abs(outward.x))
    weight*=1-smooth(.174,.210,point.y)
    weights.data[loop.index].color=(weight if point.x<0 else 0,weight if point.x>=0 else 0,0,1)
uv_names={"R":"SidePhoto_Right","L":"SidePhoto_Left"}
images={}
for suffix,filename,camera_name in (("R","right_profile_color.png","SAH_CAM_SIDE_IMG_8545"),("L","left_profile_color.png","SAH_CAM_SIDE_IMG_8549")):
    camera=bpy.data.objects[camera_name]
    matrix=camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(),x=1152,y=1536)@camera.matrix_world.inverted()
    uv=head.data.uv_layers.get(uv_names[suffix]) or head.data.uv_layers.new(name=uv_names[suffix])
    for loop in head.data.loops:
        point=head.matrix_world@head.data.vertices[loop.vertex_index].co
        clip=matrix@Vector((*point,1))
        uv.data[loop.index].uv=((clip.x/clip.w+1)/2,(clip.y/clip.w+1)/2)
    image=bpy.data.images.load(OUT+"/textures/"+filename,check_existing=True)
    image.pack()
    images[suffix]=image
head.data.uv_layers.active_index=0
material=bpy.data.materials["SAH_Portrait_Reference_Color"]
nodes,links=material.node_tree.nodes,material.node_tree.links
shader=next(node for node in nodes if node.type=="BSDF_PRINCIPLED")
original=shader.inputs["Base Color"].links[0].from_socket
weight_node=nodes.new("ShaderNodeVertexColor")
weight_node.layer_name="SAH_Profile_Blend"
channels=nodes.new("ShaderNodeSeparateColor")
channels.mode="RGB"
links.new(weight_node.outputs["Color"],channels.inputs[0])
for suffix,channel in (("R","Red"),("L","Green")):
    uv_node=nodes.new("ShaderNodeUVMap")
    uv_node.uv_map=uv_names[suffix]
    texture=nodes.new("ShaderNodeTexImage")
    texture.image=images[suffix]
    texture.name="Side_Reference_Color_"+suffix
    links.new(uv_node.outputs["UV"],texture.inputs["Vector"])
    blend=nodes.new("ShaderNodeMixRGB")
    blend.name="Blend_Profile_"+suffix
    blend.blend_type="MIX"
    links.new(channels.outputs[channel],blend.inputs[0])
    links.new(original,blend.inputs[1])
    links.new(texture.outputs["Color"],blend.inputs[2])
    original=blend.outputs[0]
links.new(original,shader.inputs["Base Color"])
material["side_reference_provenance"]="Corresponding left/right reference colors, locally balanced and limited to side-facing skin. Residual photographic lighting remains."
ear_material=bpy.data.materials["SAH_Ear_Skin"]
ear_shader=next(node for node in ear_material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
ear_shader.inputs["Base Color"].default_value=(.32,.145,.085,1)

bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
mesh=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=depsgraph)
mesh.calc_loop_triangles()
points=[vertex.co.copy() for vertex in mesh.vertices]
tree=BVHTree.FromPolygons(points,[tuple(triangle.vertices) for triangle in mesh.loop_triangles],all_triangles=True)
reports=[]
for obj in bpy.data.collections["SAH_04_HAIR"].objects:
    if obj.type!="CURVES" or obj.hide_render:
        continue
    positions=obj.data.attributes["position"]
    uv=obj.data.attributes["surface_uv_coordinate"]
    largest=0
    for index,curve in enumerate(obj.data.curves):
        start=curve.first_point_index
        root=positions.data[start].vector.copy()
        closest,normal,face,distance=tree.find_nearest(root)
        correction=closest+normal*.000045-root
        largest=max(largest,correction.length)
        for point_index in range(len(curve.points)):
            positions.data[start+point_index].vector+=correction
        triangle=mesh.loop_triangles[face]
        first,second,third=[points[value] for value in triangle.vertices]
        edge_a,edge_b,offset=second-first,third-first,closest-first
        aa,ab,bb=edge_a.dot(edge_a),edge_a.dot(edge_b),edge_b.dot(edge_b)
        denominator=aa*bb-ab*ab
        if abs(denominator)<1e-18:
            bary=(1.,0.,0.)
        else:
            weight_b=(bb*offset.dot(edge_a)-ab*offset.dot(edge_b))/denominator
            weight_c=(aa*offset.dot(edge_b)-ab*offset.dot(edge_a))/denominator
            bary=(1-weight_b-weight_c,weight_b,weight_c)
        uv.data[index].vector=sum((mesh.uv_layers[0].data[loop].uv*weight for loop,weight in zip(triangle.loops,bary)),Vector((0,0)))
    obj.data.update_tag()
    gap=0
    for index in range(0,len(obj.data.curves),19):
        root=positions.data[obj.data.curves[index].first_point_index].vector
        gap=max(gap,tree.find_nearest(root)[3])
    assert gap<.00008,obj.name+" roots detached"
    reports.append({"region":obj.name,"max_move_m":largest,"sampled_root_gap_m":gap})
evaluated.to_mesh_clear()
head["side_reference_color_pass"]=True
head["side_root_attachment_report"]=json.dumps(reports)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_04_color_and_roots.blend")
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8545"]
scene.render.resolution_x=720
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.cycles.samples=24
scene.render.filepath=OUT+"/after/right-profile-color.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"separate_profile_color_layers":2,"front_color_preserved":True,"native_hair_reattached":reports},indent=2))
