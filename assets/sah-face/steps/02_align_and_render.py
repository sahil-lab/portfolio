import bpy
import json
from mathutils import Vector, Matrix

OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene = bpy.context.scene
head = bpy.data.objects["SAH_Head_Landmark_Cage"]
head.matrix_world = Matrix.Identity(4)
head["reference_frame"] = "X horizontal, Y depth with nose negative, Z up; importer rotation removed"
bpy.context.view_layer.update()
camera = bpy.data.objects["SAH_CAM_REFERENCE_FRONT"]
scene.camera = camera
scene.render.resolution_x = REFERENCE_DATA["camera"]["image_width"]
scene.render.resolution_y = REFERENCE_DATA["camera"]["image_height"]
projection = camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(), x=scene.render.resolution_x, y=scene.render.resolution_y)
errors = []
for index in (1,4,33,133,263,362,13,14,61,291,152,168,468,473):
    point = Vector((*REFERENCE_DATA["face_vertices"][index],1))
    clip = projection @ camera.matrix_world.inverted() @ point
    actual = Vector(((clip.x/clip.w+1)*scene.render.resolution_x/2,(1-clip.y/clip.w)*scene.render.resolution_y/2))
    source = REFERENCE_DATA["all_detected_fits"]["IMG_8520.jpeg"]["landmarks"][index]
    expected = Vector((source[0]*scene.render.resolution_x,source[1]*scene.render.resolution_y))
    errors.append((actual-expected).length)
assert max(errors)<1, "Perspective camera projection does not match fitted image landmarks"
scene["initial_landmark_projection_error_pixels"] = max(errors)
scene.render.resolution_x = 700
scene.render.resolution_y = 934
scene.camera = bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples = 16
bpy.context.view_layer.material_override = bpy.data.materials["SAH_Neutral_Clay"]
scene.render.filepath = OUT+"/renders/base-clay-front.png"
bpy.ops.render.render(write_still=True)
bpy.context.view_layer.material_override = None
scene.render.filepath = OUT+"/renders/base-color-front.png"
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_01_landmark_base.blend")
print(json.dumps({"orientation_corrected":True,"maximum_landmark_projection_error_px":max(errors),"renders":["base-clay-front.png","base-color-front.png"]}))
