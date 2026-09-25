import bpy
import bmesh
import math
import json
from mathutils import Vector

ROOT = "C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT = ROOT+"/outputs/sah-face"
data = REFERENCE_DATA
assert data["reference_count"] == 6
scene = bpy.data.scenes.get("Sah_Face_Sculpt")
if scene is None:
    bpy.ops.wm.save_as_mainfile(filepath=OUT+"/previous-scene-preserved.blend",copy=True)
    scene = bpy.data.scenes.new("Sah_Face_Sculpt")
bpy.context.window.scene = scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.length_unit = "CENTIMETERS"
scene["scope"] = "Face and head only; no body, animation or portfolio replacement"
scene["reference_limit"] = data["depth_limit"]
scene["reference_provenance"] = json.dumps(data["references"])
scene["scale_assumption"] = data["metric_scale"]

collections = {}
for name in ("00_REFERENCE", "01_COMPARISON_CAMERAS", "02_SCULPT", "03_FACE_FEATURES", "04_HAIR", "05_LIGHTING", "06_EXPORT"):
    collection = bpy.data.collections.get("SAH_"+name) or bpy.data.collections.new("SAH_"+name)
    if collection.name not in scene.collection.children:
        scene.collection.children.link(collection)
    collections[name] = collection

def move(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)

def point_at(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()

roles = {"IMG_8513.jpeg":"distant_front","IMG_8514.jpeg":"back_head_1","IMG_8515.jpeg":"back_head_2","IMG_8520.jpeg":"primary_close_front","IMG_8525.jpeg":"scalp_top","IMG_8528.jpeg":"chin_underside"}
for index, record in enumerate(data["references"]):
    if bpy.data.objects.get("SAH_REF_"+roles[record["source"]]):
        continue
    image = bpy.data.images.load(ROOT+"/picsofSah/"+record["source"],check_existing=True)
    image.pack()
    reference = bpy.data.objects.new("SAH_REF_"+roles[record["source"]],None)
    collections["00_REFERENCE"].objects.link(reference)
    reference.empty_display_type = "IMAGE"
    reference.data = image
    reference.empty_display_size = .32
    reference.color[3] = .48
    reference.location = ((index%3-1)*.38,.7,.55-(index//3)*.42)
    reference.rotation_euler = (math.pi/2,0,0)
    reference.lock_location = reference.lock_rotation = reference.lock_scale = (True,True,True)
    reference.hide_select = True
    reference.hide_render = True
    reference.hide_viewport = True

head = bpy.data.objects.get("SAH_Head_Landmark_Cage")
if head is None:
    before = set(bpy.data.objects)
    import_schema = bpy.ops.wm.obj_import.get_rna_type()
    assert "NEGATIVE_Y" in [item.identifier for item in import_schema.properties["forward_axis"].enum_items]
    assert "Z" in [item.identifier for item in import_schema.properties["up_axis"].enum_items]
    bpy.ops.wm.obj_import(filepath=OUT+"/analysis/landmark-head.obj",forward_axis="NEGATIVE_Y",up_axis="Z",use_split_objects=False,use_split_groups=False)
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type=="MESH"]
    assert len(imported)==1
    head = imported[0]
    head.name = "SAH_Head_Landmark_Cage"
move(head,collections["02_SCULPT"])
mesh = bmesh.new()
mesh.from_mesh(head.data)
bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces))
topology = {"vertices":len(mesh.verts),"faces":len(mesh.faces),"open_edges":sum(edge.is_boundary for edge in mesh.edges),"non_manifold_edges":sum(not edge.is_manifold for edge in mesh.edges)}
assert topology["open_edges"]==0 and topology["non_manifold_edges"]==0
mesh.to_mesh(head.data)
mesh.free()
assert max(vertex.co.z for vertex in head.data.vertices)>.20
if max(vertex.co.z for vertex in head.data.vertices)<.26:
    for vertex in head.data.vertices:
        if vertex.co.y>.008 and vertex.co.z>.20:
            weight = max(0,1-abs(vertex.co.x)/.078)*min(1,(vertex.co.z-.20)/.05)
            vertex.co.z += .018*weight
for polygon in head.data.polygons:
    polygon.use_smooth = True
head["topology_source"] = "MediaPipe canonical connectivity fitted to the supplied portrait; not a stock identity"
head["portrait_landmarks"] = 478
head["sculpt_state"] = "Landmark-fitted base, awaiting native anatomical sculpt refinement"
head["topology_check"] = json.dumps(topology)
for name, point in data["landmarks"].items():
    marker = bpy.data.objects.get("SAH_LM_"+name) or bpy.data.objects.new("SAH_LM_"+name,None)
    if marker.name not in collections["00_REFERENCE"].objects:
        collections["00_REFERENCE"].objects.link(marker)
    marker.empty_display_type = "SPHERE"
    marker.empty_display_size = .0013
    marker.location = point
    marker.hide_render = True
    marker.hide_viewport = True
    marker["confidence"] = "2D portrait fit; monocular depth estimate"

def skin_material(name, color):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color,1)
    shader = next(node for node in material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color,1)
    shader.inputs["Roughness"].default_value = .58
    shader.inputs["Specular IOR Level"].default_value = .27
    shader.inputs["Subsurface Weight"].default_value = .065
    shader.inputs["Subsurface Radius"].default_value = (.9,.42,.22)
    shader.inputs["Subsurface Scale"].default_value = .012
    return material

skin = skin_material("SAH_Skin_Base",(.34,.176,.104))
clay = skin_material("SAH_Neutral_Clay",(.34,.36,.37))
cavity = skin_material("SAH_Oral_And_Socket_Interior",(.035,.009,.008))
portrait = bpy.data.images.load(OUT+"/textures/portrait_reference_color.png",check_existing=True)
portrait.pack()
face_material = skin.copy()
face_material.name = "SAH_Portrait_Reference_Color"
node = face_material.node_tree.nodes.new("ShaderNodeTexImage")
node.image = portrait
shader = next(node for node in face_material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
face_material.node_tree.links.new(node.outputs["Color"],shader.inputs["Base Color"])
face_material["limitation"] = "Reference-derived color contains residual photographic lighting; clay renders are the geometry check"
for slot in head.material_slots:
    name = slot.material.name
    slot.material = face_material if name.startswith("Face_") else cavity if name.startswith("Cavity_") else skin
subdivision = head.modifiers.new("Landmark_Surface_Subdivision","SUBSURF")
subdivision.levels = 2
subdivision.render_levels = 2

camera_parameters = data["camera"]
front_data = bpy.data.cameras.new("SAH_CAM_REFERENCE_FRONT")
front = bpy.data.objects.new(front_data.name,front_data)
collections["01_COMPARISON_CAMERAS"].objects.link(front)
front.location = camera_parameters["position"]
point_at(front,camera_parameters["target"])
front_data.type = "PERSP"
front_data.lens = camera_parameters["focal_mm"]
front_data.sensor_width = 36
front_data.sensor_fit = "HORIZONTAL"
front_data.shift_x = (.5-camera_parameters["principal_pixel"][0]/camera_parameters["image_width"])
front_data.shift_y = (camera_parameters["principal_pixel"][1]-camera_parameters["image_height"]/2)/camera_parameters["image_width"]
front_data.clip_start = .001
front_data.clip_end = 20
front_data.show_background_images = True
background = front_data.background_images.new()
background.image = bpy.data.images.get("IMG_8520.jpeg")
background.alpha = .35
background.display_depth = "BACK"
front["resolution_x"] = camera_parameters["image_width"]
front["resolution_y"] = camera_parameters["image_height"]
front["fit_status"] = "Initial perspective face projection; not independently calibrated"
views = {"FRONT":((0,-.66,.17),(0,.025,.160)),"THREE_QUARTER":((.34,-.55,.215),(0,.025,.163)),"PROFILE":((.65,.02,.18),(0,.02,.17)),"BACK":((0,.69,.21),(0,.045,.17)),"TOP":((0,-.12,.75),(0,.025,.17)),"UNDERSIDE":((.01,-.55,-.24),(0,.008,.16))}
for name,(position,target) in views.items():
    camera_data = bpy.data.cameras.new("SAH_CAM_"+name)
    camera = bpy.data.objects.new(camera_data.name,camera_data)
    collections["01_COMPARISON_CAMERAS"].objects.link(camera)
    camera.location = position
    point_at(camera,target)
    camera_data.lens = 72
    camera_data.clip_start = .001
    camera_data.clip_end = 20
    camera.hide_viewport = True
scene.camera = bpy.data.objects["SAH_CAM_FRONT"]
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("SAH_Neutral_Studio_World")
scene.world.use_nodes = True
background = next(node for node in scene.world.node_tree.nodes if node.type=="BACKGROUND")
background.inputs["Color"].default_value = (.21,.25,.26,1)
background.inputs["Strength"].default_value = .38

for name,position,energy,size,color in [("Key",(-.4,-.45,.55),14,.42,(1,.94,.88)),("Fill",(.45,-.35,.32),8,.45,(.89,.95,1)),("Rim",(.15,.4,.5),12,.4,(1,1,1))]:
    light_data = bpy.data.lights.new("SAH_LIGHT_"+name,"AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light_data.color = color
    light = bpy.data.objects.new(light_data.name,light_data)
    collections["05_LIGHTING"].objects.link(light)
    light.location = position
    point_at(light,(0,.01,.15))
scene.view_settings.view_transform = "AgX"
scene.view_settings.exposure = -.5
bpy.context.view_layer.objects.active = head
head.select_set(True)
for area in bpy.context.screen.areas:
    if area.type=="VIEW_3D":
        area.spaces.active.region_3d.view_rotation = scene.camera.rotation_euler.to_quaternion()
        area.spaces.active.region_3d.view_location = Vector((0,.025,.16))
        area.spaces.active.region_3d.view_distance = .57
        area.spaces.active.clip_start = .001
        area.spaces.active.overlay.show_overlays = False
scene["landmark_coordinates"] = json.dumps(data["landmarks"])
scene["face_boundaries"] = json.dumps(data["facial_boundaries"])
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_01_landmark_base.blend")
bpy.context.view_layer.material_override = clay
scene.render.filepath = OUT+"/renders/base-clay-front.png"
bpy.ops.render.render(write_still=True)
bpy.context.view_layer.material_override = None
print(json.dumps({"scene":scene.name,"references":6,"head_topology":topology,"scope":"head only","depth":"monocular estimate","checkpoint":"face_01_landmark_base.blend"}))
