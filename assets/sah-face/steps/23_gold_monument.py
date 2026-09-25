import bpy
import json
import math
from mathutils import Vector

ROOT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
source=bpy.data.scenes["Sah_Face_Sculpt"]
assert bpy.data.objects["SAH_Head_Sculpt"].get("profile_surface_finish")
assert bpy.data.scenes.get("Sah_Gold_Monument") is None
scene=bpy.data.scenes.new("Sah_Gold_Monument")
scene.render.engine=source.render.engine
scene.world=source.world.copy()
scene.render.image_settings.file_format=source.render.image_settings.file_format
scene.view_settings.view_transform=source.view_settings.view_transform
scene.view_settings.look=source.view_settings.look
scene.view_settings.exposure=source.view_settings.exposure
scene.view_settings.gamma=source.view_settings.gamma
materials=[]
for name,color,roughness in (
    ("Gold_Cast",(.83,.49,.095,1),.28),
    ("Gold_Polished",(.93,.63,.20,1),.19),
    ("Gold_Engraved",(.30,.145,.025,1),.34),
    ("Gold_Relief",(.52,.29,.052,1),.40),
):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    shader=next(node for node in material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value=color
    shader.inputs["Metallic"].default_value=1
    shader.inputs["Roughness"].default_value=roughness
    material.diffuse_color=color
    materials.append(material)
for original in source.objects:
    if original.type=="LIGHT" or original.name=="SAH_CAM_FRONT":
        obj=original.copy()
        obj.data=original.data.copy()
        scene.collection.objects.link(obj)
        if original.type=="CAMERA":
            scene.camera=obj
bpy.context.window.scene=scene
modifier_types=[item.identifier for item in bpy.types.Modifier.bl_rna.properties["type"].enum_items]
assert "DECIMATE" in modifier_types
objects=[]
for original in list(source.objects):
    if original.hide_render or original.type not in {"MESH","CURVE"}:
        continue
    temporary=original.copy()
    temporary.data=original.data.copy()
    temporary.name="GOLD_Source_"+original.name
    scene.collection.objects.link(temporary)
    temporary.hide_set(False)
    for modifier in temporary.modifiers:
        if modifier.type=="MULTIRES":
            modifier.levels=1
            modifier.render_levels=1
    bpy.context.view_layer.update()
    evaluated=temporary.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=bpy.data.meshes.new_from_object(evaluated)
    obj=bpy.data.objects.new("GOLD_"+original.name.removeprefix("SAH_"),mesh)
    obj.matrix_world=original.matrix_world.copy()
    scene.collection.objects.link(obj)
    bpy.data.objects.remove(temporary,do_unlink=True)
    target=52000 if original.name=="SAH_Head_Sculpt" else 4000 if original.name.startswith("SAH_EAR_") else 1800
    triangles=sum(len(polygon.vertices)-2 for polygon in mesh.polygons)
    if triangles>target:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        modifier=obj.modifiers.new("Web_Geometry_Budget","DECIMATE")
        modifier.ratio=target/triangles
        modifier.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    material_index=2 if any(token in original.name for token in ("IRIS_","PUPIL_","Concha_")) else 1 if "EYE_" in original.name else 0
    obj.data.materials.clear()
    obj.data.materials.append(materials[material_index])
    for polygon in obj.data.polygons:
        polygon.material_index=0
        polygon.use_smooth=True
    objects.append(obj)
for original in source.objects:
    if original.type!="CURVES" or original.hide_render:
        continue
    limit=600 if "Scalp" in original.name else 650 if "Beard" in original.name else 260
    step=max(1,math.ceil(len(original.data.curves)/limit))
    vertices=[]
    faces=[]
    positions=original.data.attributes["position"].data
    radius=.00011 if "Scalp" in original.name else .00019
    for curve_index in range(0,len(original.data.curves),step):
        curve=original.data.curves[curve_index]
        root=original.matrix_world @ positions[curve.first_point_index].vector
        first=len(vertices)
        for fraction in (0,.5,1):
            index=curve.first_point_index+round((curve.points_length-1)*fraction)
            point=original.matrix_world @ positions[index].vector
            point=root+(point-root)*.46
            width=radius*(1-.72*fraction)
            vertices.extend((tuple(point+Vector((width,0,0))),tuple(point-Vector((width,0,0))),tuple(point+Vector((0,width,0))),tuple(point-Vector((0,width,0)))))
        for segment in range(2):
            base=first+segment*4
            faces.extend(((base,base+1,base+5,base+4),(base+2,base+3,base+7,base+6)))
    mesh=bpy.data.meshes.new("Gold_Relief_"+original.name)
    mesh.from_pydata(vertices,[],faces)
    mesh.materials.append(materials[3])
    obj=bpy.data.objects.new("GOLD_Relief_"+original.name,mesh)
    scene.collection.objects.link(obj)
    objects.append(obj)
joined=[]
for material in materials:
    members=[obj for obj in scene.objects if obj.type=="MESH" and obj.data.materials[0]==material]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in members:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=members[0]
    bpy.ops.object.join()
    combined=bpy.context.object
    combined.name=material.name
    for layer in list(combined.data.uv_layers):
        combined.data.uv_layers.remove(layer)
    for attribute in list(combined.data.color_attributes):
        combined.data.color_attributes.remove(attribute)
    joined.append(combined)
bpy.ops.object.select_all(action="DESELECT")
for obj in joined:
    obj.select_set(True)
    obj["source"]="Side-reference-refined Sah face; cast-gold web derivative"
triangles=sum(len(polygon.vertices)-2 for obj in joined for polygon in obj.data.polygons)
assert triangles<100000,triangles
scene["gold_export_triangles"]=triangles
scene["source_face_preserved"]=True
scene["portfolio_height_ratio"]=10
scene["reference_photos_exported"]=False
scene.render.resolution_x=840
scene.render.resolution_y=1008
scene.render.resolution_percentage=100
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.filepath=ROOT+"/outputs/sah-face/gold-preview.png"
bpy.ops.export_scene.gltf(filepath=ROOT+"/public/assets/sah-gold-head.glb",use_selection=True,use_active_scene=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_extras=False)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+"/outputs/sah-face/sah_gold_working.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"scene":scene.name,"meshes":len(joined),"triangles":triangles,"materials":[material.name for material in materials],"all_metallic":True,"photos_exported":False,"source_face_preserved":bpy.data.scenes.get("Sah_Face_Sculpt") is not None},indent=2))
