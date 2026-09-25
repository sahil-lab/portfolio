"""Package the exported multi-view dog as an editable, self-contained Blender scene."""
import hashlib
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs" / "reference-dog"
REFERENCES = ROOT / "picsFOR3dModler"
ARGUMENTS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DRAFT = "--draft" in ARGUMENTS
RENDER = "--render" in ARGUMENTS
OUTPUT.mkdir(parents=True, exist_ok=True)
STATUS = OUTPUT / "blender-status.json"


def status(stage, **values):
    STATUS.write_text(json.dumps({"stage": stage, **values}, indent=2), encoding="utf-8")
    print("DOG_BLENDER", stage, flush=True)


def collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to_collection(obj, destination):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    destination.objects.link(obj)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area_light(name, position, energy, size, tint, studio):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = tint
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = position
    point_at(obj, (0, 0, .18))
    return obj


def material(name, rgba, roughness):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = roughness
    return result


def main():
    status("starting", blender=bpy.app.version_string)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "CENTIMETERS"
    scene.unit_settings.scale_length = 1
    bpy.ops.import_scene.gltf(filepath=str(OUTPUT / "reference-dog.glb"))
    status("imported")
    dog_objects = list(scene.objects)
    anatomy = collection("DOG / Editable Anatomy")
    facial = collection("DOG / Eyes Nose Mouth")
    groom = collection("DOG / UV Groom Layers")
    hierarchy = collection("DOG / Hierarchy")
    studio = collection("STUDIO / Preview Only")
    reference_collection = collection("REFERENCES / Eight Views")
    for obj in dog_objects:
        target = hierarchy
        if obj.type == "MESH":
            target = groom if obj.name.startswith("Groom_") else facial if any(token in obj.name for token in ("Eye_", "Nose_", "Nostril_", "Philtrum", "Mouth_")) else anatomy
        move_to_collection(obj, target)
    cage = next(obj for obj in dog_objects if obj.type == "MESH" and obj.name.startswith("Dog_Continuous"))
    mesh = bmesh.new()
    mesh.from_mesh(cage.data)
    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=.0000002)
    unused = [vertex for vertex in mesh.verts if not vertex.link_faces]
    if unused:
        bmesh.ops.delete(mesh, geom=unused, context="VERTS")
    bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
    bmesh.ops.join_triangles(mesh, faces=list(mesh.faces), angle_face_threshold=math.radians(42), angle_shape_threshold=math.radians(42), cmp_uvs=True, cmp_vcols=True, cmp_materials=True)
    body_report = {
        "vertices": len(mesh.verts),
        "faces": len(mesh.faces),
        "quads": sum(len(face.verts) == 4 for face in mesh.faces),
        "boundary_edges": sum(edge.is_boundary for edge in mesh.edges),
        "non_manifold_edges": sum(not edge.is_manifold for edge in mesh.edges),
        "degenerate_faces": sum(face.calc_area() < 1e-14 for face in mesh.faces),
    }
    mesh.to_mesh(cage.data)
    mesh.free()
    for polygon in cage.data.polygons:
        polygon.use_smooth = True
    cage["Editing"] = "Connected four-limb cage. Coat follows authored source parameters, not a live rig."
    texture_directory = OUTPUT / "textures"
    texture_directory.mkdir(exist_ok=True)
    for image in list(bpy.data.images):
        if image.type not in {"IMAGE", "UV_TEST"} or image.size[0] == 0:
            continue
        filename = "".join(character if character.isalnum() or character in "_-" else "_" for character in image.name)
        image.filepath_raw = str(texture_directory / (filename + ".png"))
        image.file_format = "PNG"
        image.save()
        image.pack()
    role_map = {
        "31": "Rear: brown rump, white hind legs, brown tail root and lighter feathering. Tail held up; use only pattern, not pose.",
        "36": "Primary face: narrow white blaze, dark eye surrounds, brown ears and broad cream moustache.",
        "40": "Close front: short nose, dark rounded nose leather, muzzle width, parted beard and chest volume.",
        "44": "Overhead standing: compact torso, brown saddle, irregular lighter wisps and curled white tail plume.",
        "48": "Raised paw: white leg feathering and chest coat. Do not reproduce the raised-paw pose.",
        "52": "Oblique front: ear curtain length, brow volume, shallow muzzle and facial asymmetry.",
        "56": "Underside: white belly and limb coverage; infer neutral standing joints instead of copying supine pose.",
        "00": "Second underside: short-legged proportions and chest/inner-leg fur, corroborating the other underside view.",
    }
    photos = sorted(REFERENCES.glob("*.jpg"))
    assert len(photos) == 8, "Expected the complete eight-image identity reference pack"
    reference_report = []
    for index, photo in enumerate(photos):
        stamp = photo.stem.split("_")[-1].split(" ")[0]
        image = bpy.data.images.load(str(photo), check_existing=True)
        image.pack()
        empty = bpy.data.objects.new("REF_%02d_%s" % (index + 1, stamp), None)
        empty.empty_display_type = "IMAGE"
        empty.data = image
        empty.empty_display_size = .35
        empty.location = ((index % 4) * .44 - .66, 1.0, .56 - (index // 4) * .50)
        empty.rotation_euler = (math.pi / 2, 0, 0)
        empty["Used for"] = role_map[stamp]
        reference_collection.objects.link(empty)
        reference_report.append({"file": photo.name, "sha256": hashlib.sha256(photo.read_bytes()).hexdigest(), "used_for": role_map[stamp]})
    reference_collection.hide_render = True
    reference_collection.hide_viewport = True
    status("references_packed", count=len(reference_report))
    scene.world = bpy.data.worlds.new("Neutral Studio World")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (.68, .73, .75, 1)
    background.inputs["Strength"].default_value = .30
    area_light("Key / Large Softbox", (-.65, -.8, .95), 45, .75, (1, .93, .84), studio)
    area_light("Fill / Cool Softbox", (.75, -.4, .52), 20, .65, (.82, .91, 1), studio)
    area_light("Rim / Coat Separation", (.35, .7, .88), 55, .55, (1, .96, .88), studio)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.001))
    floor = bpy.context.object
    floor.name = "Studio_Ground_Not_Exported"
    floor.data.materials.append(material("Studio / Sage Gray", (.49, .56, .55, 1), 1))
    move_to_collection(floor, studio)
    camera_data = bpy.data.cameras.new("Studio Portrait Camera")
    camera = bpy.data.objects.new("Studio Portrait Camera", camera_data)
    studio.objects.link(camera)
    camera_data.lens = 65
    camera_data.clip_start = .005
    camera_data.clip_end = 300
    camera.location = (.72, -1.04, .49)
    point_at(camera, (0, -.02, .17))
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24 if DRAFT else 64
    scene.cycles.use_denoising = True
    scene.cycles.transparent_max_bounces = 16
    scene.cycles.max_bounces = 8
    device_report = []
    preferences = bpy.context.preferences.addons["cycles"].preferences
    for device_type in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            preferences.compute_device_type = device_type
            preferences.get_devices()
            available = [device for device in preferences.devices if device.type != "CPU"]
            if available:
                for device in preferences.devices:
                    device.use = device.type != "CPU"
                scene.cycles.device = "GPU"
                device_report = [device.name for device in available]
                break
        except (TypeError, RuntimeError):
            continue
    scene.render.resolution_x = scene.render.resolution_y = 900 if DRAFT else 1600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = -.4
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 144
    orbit = bpy.data.objects.new("Turntable_Camera_Orbit", None)
    studio.objects.link(orbit)
    camera.parent = orbit
    orbit.rotation_euler.z = 0
    orbit.keyframe_insert(data_path="rotation_euler", frame=1)
    orbit.rotation_euler.z = math.tau
    orbit.keyframe_insert(data_path="rotation_euler", frame=145)
    scene.frame_set(1)
    scene["Reference reconstruction"] = "All eight photos describe one dog. Neutral standing pose is inferred across posed and handheld images; not a scan or measured anatomical replica."
    scene["Delivery"] = "GLB contains the dog only. This .blend includes packed refs, editable meshes, material nodes and studio cameras."
    notes = bpy.data.texts.new("READ_ME / Reference And Editing Notes")
    notes.write("REFERENCE DOG\n\nOne dog, eight views. Units: meters. Standing pose: four grounded paws.\n\n" + json.dumps(reference_report, indent=2) + "\n\nThe fur has separate UV-mapped hair-card and closed-fiber layers. These are editable meshes, not simulated hair.\nThe base body is a connected quad-dominant cage after triangle joining. GLB is conventionally triangulated.\nThe model is not rigged. Side-profile proportions and real-world scale are inferred, not measured.\nThe belly is fully coated for the neutral standing asset; anatomical details under the coat are not reproduced.\n")
    meshes = [obj for obj in dog_objects if obj.type == "MESH"]
    report = {
        "blender": bpy.app.version_string,
        "reference_count": len(reference_report),
        "references": reference_report,
        "body_topology": body_report,
        "mesh_count": len(meshes),
        "meshes_with_uvs": sum(bool(obj.data.uv_layers) for obj in meshes),
        "materials": [value.name for value in bpy.data.materials],
        "render_devices": device_report or ["CPU"],
        "source_glb_sha256": hashlib.sha256((OUTPUT / "reference-dog.glb").read_bytes()).hexdigest(),
    }
    assert report["meshes_with_uvs"] == len(meshes), "A model mesh has no UVs"
    assert body_report["boundary_edges"] == 0, "Body cage has an open boundary"
    assert body_report["non_manifold_edges"] == 0, "Body cage is non-manifold"
    assert body_report["degenerate_faces"] == 0, "Body cage has degenerate faces"
    bpy.ops.object.select_all(action="DESELECT")
    cage.select_set(True)
    bpy.context.view_layer.objects.active = cage
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_distance = 1.0
                area.spaces.active.region_3d.view_location = Vector((0, -.02, .17))
                area.spaces.active.clip_start = .001
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "reference-dog.blend"))
    (OUTPUT / "blender-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    status("source_saved", report=report)
    if RENDER:
        destination = OUTPUT / "previews"
        destination.mkdir(exist_ok=True)
        scene.render.filepath = str(destination / "blender-three-quarter.png")
        bpy.ops.render.render(write_still=True)
        status("rendered", report=report)
    status("complete", report=report)


try:
    main()
except Exception as error:
    status("error", error=repr(error))
    raise
