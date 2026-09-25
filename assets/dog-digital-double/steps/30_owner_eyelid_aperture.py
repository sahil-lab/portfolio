import bpy
import json

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
scene = bpy.context.scene
assert scene.get("owner_web_fur_v4")
assert not scene.get("owner_eyelid_aperture_v5")
iris = bpy.data.materials["DOG_Eye_Dark_Iris"]
shader = next(node for node in iris.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
shader.inputs["Base Color"].default_value = (.006,.003,.0018,1)
shader.inputs["Roughness"].default_value = .39
shader.inputs["Specular IOR Level"].default_value = .20
shader.inputs["Coat Weight"].default_value = 0
lid_material = bpy.data.materials["DOG_Lid_Pigmented_Skin"]
lid_shader = next(node for node in lid_material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
lid_shader.inputs["Base Color"].default_value = (.009,.0055,.0035,1)
lid_shader.inputs["Roughness"].default_value = .75
for suffix in ("L","R"):
    lid = bpy.data.objects["DOG_EYELID_"+suffix]
    eye = bpy.data.objects["DOG_EYE_"+suffix]
    lid.location.y = eye.location.y-.0116
    lid.location.z = eye.location.z-.0009
    lid.scale.z = .72
    lid.hide_render = False
    lid.hide_set(False)
    lid["owner_aperture"] = "Shallow wrapped lid over the upper and lower eyeball; spacing and eye radius unchanged"
    for lod in range(3):
        root = bpy.data.objects["DOG_WEB_LOD%d"%lod]
        copy = bpy.data.objects.get("WEB_L%d_DOG_EYELID_%s"%(lod,suffix))
        if copy is None:
            copy = lid.copy()
            copy.data = lid.data.copy()
            copy.name = "WEB_L%d_DOG_EYELID_%s"%(lod,suffix)
            bpy.data.collections["08_EXPORT"].objects.link(copy)
            copy.parent = root
        copy.matrix_world = lid.matrix_world.copy()
        bpy.ops.object.select_all(action="DESELECT")
        copy.hide_set(False)
        copy.hide_render = False
        copy.select_set(True)
        bpy.context.view_layer.objects.active = copy
        for modifier in list(copy.modifiers):
            if modifier.type=="SUBSURF":
                modifier.levels = modifier.render_levels = 1
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        if not copy.data.uv_layers:
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.smart_project(island_margin=.02)
            bpy.ops.object.mode_set(mode="OBJECT")
        copy["owner_export_included"] = True
        copy.hide_set(True)
        copy.hide_render = True
reports = []
for lod in range(3):
    root = bpy.data.objects["DOG_WEB_LOD%d"%lod]
    included = [obj for obj in root.children if obj.get("owner_export_included",True)]
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    triangles = 0
    for obj in included:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
        if obj.type=="MESH":
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
    bpy.context.view_layer.objects.active = root
    filename = "dog_web.glb" if lod==0 else "dog_web_lod%d.glb"%lod
    bpy.ops.export_scene.gltf(filepath=OUT+"/"+filename,export_format="GLB",use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_vertex_color="NAME",export_vertex_color_name="Coat",export_all_vertex_colors=False,export_tangents=True)
    for obj in root.children:
        obj.hide_set(True)
        obj.hide_render = True
    reports.append({"lod":lod,"root":root.name,"file":filename,"meshes":len(included),"triangles":triangles})
scene["web_lod_report"] = json.dumps(reports)
scene["owner_eyelid_aperture_v5"] = "Visible wrapped lids reduce exposed eyeball area; iris remains dark with restrained gloss"
bpy.ops.object.select_all(action="DESELECT")
body = bpy.data.objects["DOG_BODY_RETOPO"]
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/owner-corrections/revised-master.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_06_final.blend")
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/dog_master.blend")
scene.camera = bpy.data.objects["CAM_close_face"]
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.filepath = OUT+"/owner-corrections/eyelid-aperture-after.png"
bpy.ops.render.render(write_still=True)
print(json.dumps({"wrapped_eyelids":2,"eye_radius_unchanged":True,"web_lods":reports}))
