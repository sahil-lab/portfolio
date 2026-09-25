import bpy
import json
from mathutils import Matrix, Vector

ROOT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT=ROOT+"/outputs/sah-face/profile-revision"
scene=bpy.context.scene
assert scene.name=="Sah_Face_Sculpt"
assert scene.get("profile_revision_started")
collection=bpy.data.collections.get("SAH_Profile_Cameras") or bpy.data.collections.new("SAH_Profile_Cameras")
if collection.name not in scene.collection.children:
    scene.collection.children.link(collection)
camera_types=[item.identifier for item in bpy.types.Camera.bl_rna.properties["type"].enum_items]
assert "PERSP" in camera_types
report=[]
for view in PROFILE_FIT["cameras"]:
    name="SAH_CAM_SIDE_"+view["file"].split(".")[0]
    camera=bpy.data.objects.get(name)
    if camera is None:
        data=bpy.data.cameras.new(name)
        camera=bpy.data.objects.new(name,data)
        collection.objects.link(camera)
    data=camera.data
    orientation=Matrix((view["right"],view["up"],view["backward"])).transposed().to_4x4()
    orientation.translation=Vector(view["location"])
    camera.matrix_world=orientation
    data.type="PERSP"
    data.lens=view["focal_mm"]
    data.sensor_width=36
    data.sensor_fit="HORIZONTAL"
    data.shift_x=view["shift_x"]
    data.shift_y=view["shift_y"]
    data.clip_start=.001
    data.clip_end=30
    image=bpy.data.images.load(ROOT+"/picsofSah/"+view["file"],check_existing=True)
    image.pack()
    if not data.background_images:
        data.background_images.new()
    data.show_background_images=True
    data.background_images[0].image=image
    data.background_images[0].alpha=.30
    camera["source_file"]=view["file"]
    camera["resolution_x"]=1152
    camera["resolution_y"]=1536
    camera["fit_scope"]="Approximate perspective pose; fixed for before/after geometry comparisons"
    camera["fit_parameters"]=json.dumps(view)
    bpy.context.view_layer.update()
    matrix=camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(),x=1152,y=1536)@camera.matrix_world.inverted()
    maximum=0
    for values in view["points"].values():
        clip=matrix@Vector((*values["before"],1))
        actual=Vector(((clip.x/clip.w+1)*576,(1-clip.y/clip.w)*768))
        maximum=max(maximum,(actual-Vector(values["before_pixel"])).length)
    assert maximum<.02,"Blender camera differs from fitted comparison projection"
    report.append({"camera":name,"maximum_projection_difference_pixels":maximum})
    camera.hide_viewport=True
scene["profile_fit_parameters"]=json.dumps(PROFILE_FIT)
scene.camera=bpy.data.objects["SAH_CAM_SIDE_IMG_8545"]
scene.render.resolution_x=576
scene.render.resolution_y=768
scene.render.resolution_percentage=100
scene.cycles.samples=12
prior=bpy.context.view_layer.material_override
visibility=[(obj,obj.hide_render) for obj in bpy.data.collections["SAH_04_HAIR"].objects]
for obj,hidden in visibility:
    obj.hide_render=True
bpy.context.view_layer.material_override=bpy.data.materials["SAH_Neutral_Clay"]
scene.render.filepath=OUT+"/before/right-clay.png"
try:
    bpy.ops.render.render(write_still=True)
finally:
    bpy.context.view_layer.material_override=prior
    for obj,hidden in visibility:
        obj.hide_render=hidden
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/side_01_comparison_cameras.blend")
print(json.dumps({"profile_cameras":report,"fixed_geometry_comparison":True}))
