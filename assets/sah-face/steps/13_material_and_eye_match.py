import bpy
import math
import json
from mathutils import Vector

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert head.get("crown_projection_corrected")
assert not head.get("skin_transition_matched")

def smooth(minimum,maximum,value):
    fraction=min(1,max(0,(value-minimum)/(maximum-minimum)))
    return fraction*fraction*(3-2*fraction)

side_skin=head.data.color_attributes.get("SAH_SideSkin") or head.data.color_attributes.new(name="SAH_SideSkin",type="FLOAT_COLOR",domain="CORNER")
scalp=head.data.color_attributes["SAH_Scalp_Mask"]
for loop in head.data.loops:
    point=head.data.vertices[loop.vertex_index].co
    beard=1-smooth(.103+abs(point.x)*.42,.133+abs(point.x)*.42,point.z)
    skin=(.26,.126,.072)
    stubble=(.068,.033,.018)
    values=[skin[index]*(1-beard*.68)+stubble[index]*beard*.68 for index in range(3)]
    hair=scalp.data[loop.index].color[0]
    values=[value*(1-hair)+(.025,.014,.008)[index]*hair for index,value in enumerate(values)]
    side_skin.data[loop.index].color=(*values,1)
face_material=bpy.data.materials["SAH_Portrait_Reference_Color"]
nodes,links=face_material.node_tree.nodes,face_material.node_tree.links
shader=next(node for node in nodes if node.type=="BSDF_PRINCIPLED")
existing_blend=nodes.get("Continuous_Face_To_Side_Skin")
prior=existing_blend.inputs[1].links[0].from_socket if existing_blend else shader.inputs["Base Color"].links[0].from_socket
geometry=nodes.new("ShaderNodeNewGeometry")
components=nodes.new("ShaderNodeSeparateXYZ")
links.new(geometry.outputs["Position"],components.inputs["Vector"])
blend_weight=nodes.new("ShaderNodeMapRange")
blend_weight.interpolation_type="SMOOTHERSTEP"
blend_weight.inputs["From Min"].default_value=.050
blend_weight.inputs["From Max"].default_value=.115
blend_weight.inputs["To Min"].default_value=0
blend_weight.inputs["To Max"].default_value=1
links.new(components.outputs["Y"],blend_weight.inputs["Value"])
side=nodes.new("ShaderNodeVertexColor")
side.layer_name="SAH_SideSkin"
blend=existing_blend or nodes.new("ShaderNodeMixRGB")
blend.name="Continuous_Face_To_Side_Skin"
blend.blend_type="MIX"
links.new(blend_weight.outputs["Result"],blend.inputs[0])
links.new(prior,blend.inputs[1])
links.new(side.outputs["Color"],blend.inputs[2])
links.new(blend.outputs[0],shader.inputs["Base Color"])
for polygon in head.data.polygons:
    if polygon.material_index==1:
        polygon.material_index=0
shader.inputs["Roughness"].default_value=.64
shader.inputs["Specular IOR Level"].default_value=.22

hair_material=bpy.data.materials["SAH_Hair_Short_Dark_Brown"]
hair=next(node for node in hair_material.node_tree.nodes if node.type=="BSDF_HAIR_PRINCIPLED")
assert "HUANG" in [item.identifier for item in hair.bl_rna.properties["model"].enum_items]
hair.model="HUANG"
for identifier,value in (("R lobe",.28),("TT lobe",.72),("TRT lobe",.40)):
    socket=next(socket for socket in hair.inputs if socket.identifier==identifier)
    socket.default_value=value
hair.inputs["Roughness"].default_value=.52
hair.inputs["Random Roughness"].default_value=.10
report=[]
landmarks=REFERENCE_DATA["face_vertices"]
for suffix,center_index,edge_indices in (("R",468,[469,470,471,472]),("L",473,[474,475,476,477])):
    eye=bpy.data.objects["SAH_EYE_"+suffix]
    center=eye.location.copy()
    observed=Vector(landmarks[center_index])
    target_radius=sum(math.hypot(landmarks[index][0]-observed.x,landmarks[index][2]-observed.z) for index in edge_indices)/4
    disc=bpy.data.objects["SAH_IRIS_"+suffix]
    previous_radius=max(math.hypot(vertex.co.x-center.x,vertex.co.z-center.z) for vertex in disc.data.vertices)
    ratio=target_radius/previous_radius
    radius=eye.dimensions.x/2
    for vertex in disc.data.vertices:
        vertex.co.x=center.x+(vertex.co.x-center.x)*ratio
        vertex.co.z=center.z+(vertex.co.z-center.z)*ratio
        radial=(vertex.co.x-center.x)**2+(vertex.co.z-center.z)**2
        vertex.co.y=center.y-math.sqrt(max(.000001,radius*radius-radial))-.00016
    report.append({"eye":suffix,"iris_radius_m":target_radius,"prior_radius_m":previous_radius,"center_unchanged":True})
sclera=bpy.data.materials["SAH_Eye_Sclera"]
sclera_shader=next(node for node in sclera.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
sclera_shader.inputs["Base Color"].default_value=(.32,.335,.305,1)
sclera_shader.inputs["Roughness"].default_value=.28
head["skin_transition_matched"]=True
head["eye_reference_fit"]=json.dumps(report)
scene.camera=bpy.data.objects["SAH_CAM_THREE_QUARTER"]
scene.cycles.samples=24
scene.render.resolution_x=900
scene.render.resolution_y=1000
scene.render.filepath=OUT+"/renders/refined-three-quarter.png"
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_11_material_refined.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"skin_seam_blended":True,"hair_reflection_reduced":True,"iris_fit":report,"material_scope":"reference-derived face color; inferred sides and rear"}))
