import bpy
import math
import json
from mathutils import Vector, Quaternion

scene = bpy.context.scene
OUT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/dog-digital-double"
fits = [
    (1, (.007, -.68, .273), (0, -.132, .170), 66, -.025),
    (2, (0, -.57, .235), (0, -.174, .164), 62, .006),
    (3, (-.100, -.70, .283), (0, -.127, .174), 65, .035),
    (4, (-.15, -.32, .79), (0, .015, .146), 62, -.16),
    (5, (.04, .65, .47), (0, .01, .158), 61, .02),
    (6, (0, -.71, .30), (0, -.114, .158), 64, -.025),
    (7, (.10, -.13, -.58), (0, .015, .144), 60, -.20),
    (8, (.055, -.075, -.62), (0, .016, .144), 60, -.15),
]
for index, position, target, lens, roll in fits:
    camera = bpy.data.objects["CAM_REF_%02d" % index]
    camera.location = position
    orientation = (Vector(target) - camera.location).to_track_quat("-Z", "Y")
    camera.rotation_euler = (orientation @ Quaternion((0, 0, 1), roll)).to_euler()
    camera.data.lens = lens
    camera["fit_status"] = "Round 1: approximate scale and framing matched; posture/camera uncertainty remains"
    scene.camera = camera
    scene.render.resolution_x = camera["source_width"]
    scene.render.resolution_y = camera["source_height"]
    scene.render.resolution_percentage = 65
    scene.render.filepath = OUT + "/reference-anatomy/REF_%02d.png" % index
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["CAM_three_quarter"]
scene.render.resolution_x = scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene["reference_camera_fit_round"] = 1
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/dog_02_sculpt.blend")
print(json.dumps({"camera_fit_round": 1, "views": len(fits), "mode": "perspective", "exact_calibration": False}))
