"""Package only the winged derivative; preserve the original anime and other live scenes."""
import hashlib
import json
import math
import struct
import traceback
from pathlib import Path

import bpy

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/"outputs/angel"
STATUS=OUTPUT/"package-status.json"


def record(stage,**details):
    STATUS.write_text(json.dumps({"stage":stage,**details},indent=2)+"\n",encoding="utf-8")
    print("ANGEL_PACKAGE",stage,flush=True)


def main():
    record("opening")
    bpy.ops.wm.open_mainfile(filepath=str(OUTPUT/"angel_01_wings.blend"),use_scripts=False)
    scene=bpy.data.scenes["Anime_Angel"]
    if bpy.context.window:
        bpy.context.window.scene=scene
    retained=set(scene.objects)
    for other in list(bpy.data.scenes):
        if other!=scene:
            bpy.data.scenes.remove(other)
    for obj in list(bpy.data.objects):
        if obj not in retained:
            bpy.data.objects.remove(obj,do_unlink=True)
    used=set(scene.collection.children_recursive)
    for collection in list(bpy.data.collections):
        if collection not in used:
            bpy.data.collections.remove(collection)
    for _pass in range(4):
        for blocks in (bpy.data.meshes,bpy.data.curves,bpy.data.hair_curves,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.node_groups,bpy.data.worlds):
            for block in list(blocks):
                block.use_fake_user=False
                if block.users==0:
                    blocks.remove(block)
    body=bpy.data.objects["ANGEL_Body"]
    reference=bpy.data.objects["ANGEL_Untouched_MakeHuman_Body"]
    assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in reference.data.polygons]
    assert len(body.data.vertices)==13380
    assert all(math.isfinite(component) for vertex in body.data.vertices for component in vertex.co)
    assert not any(image.type=="IMAGE" for image in bpy.data.images)
    if hasattr(scene,"blendermcp_auto_start_server"):
        scene.blendermcp_auto_start_server=False
        scene.blendermcp_server_running=False
    master=OUTPUT/"angel_master.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(master),compress=True)
    bpy.ops.wm.open_mainfile(filepath=str(master),use_scripts=False)
    assert len(bpy.data.scenes)==1
    scene=bpy.context.scene
    assert scene.name=="Anime_Angel"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type in {"MESH","CURVE"} and not obj.hide_render and "NoExport" not in obj.name:
            obj.hide_set(False)
            obj.select_set(True)
            for modifier in obj.modifiers:
                if modifier.type=="SUBSURF":
                    modifier.levels=0 if "Back_Lock" in obj.name or "FaceFraming" in obj.name else 1
                    modifier.render_levels=modifier.levels
    bpy.context.view_layer.objects.active=bpy.data.objects["ANGEL_Body"]
    bpy.ops.object.convert(target="MESH")
    for name in ("ANGEL_Character","ANGEL_Wing_L","ANGEL_Wing_R"):
        bpy.data.objects[name].select_set(True)
    asset=ROOT/"public/assets/anime-angel.glb"
    bpy.ops.export_scene.gltf(filepath=str(asset),use_selection=True,use_active_scene=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=False)
    payload=asset.read_bytes()
    metadata=json.loads(payload[20:20+struct.unpack_from("<I",payload,12)[0]])
    assert len(metadata["scenes"])==1 and not metadata.get("images") and not metadata.get("textures")
    names=[node.get("name","") for node in metadata["nodes"]]
    assert all(any(name.startswith(prefix) for name in names) for prefix in ("ANGEL_Wing_L","ANGEL_Wing_R","ANGEL_Body","ANGEL_Feathers_L","ANGEL_Feathers_R"))
    assert all("Display_Base" not in name and "Untouched" not in name and "NoExport" not in name for name in names)
    triangles=sum(metadata["accessors"][primitive["indices"]]["count"]//3 for mesh in metadata["meshes"] for primitive in mesh["primitives"])
    assert triangles<340000,triangles
    report={"master":master.name,"master_reopened":True,"body_original_quads":13378,"body_topology_preserved":True,"wings":2,"feathers_per_wing":42,"wing_hinges":["ANGEL_Wing_L","ANGEL_Wing_R"],"asset":"public/assets/anime-angel.glb","bytes":len(payload),"triangles":triangles,"asset_sha256":hashlib.sha256(payload).hexdigest(),"photos_embedded":0}
    record("exported",**report)
    scene.render.resolution_x=960
    scene.render.resolution_y=720
    scene.render.resolution_percentage=100
    scene.cycles.samples=16
    scene.render.filepath=str(OUTPUT/"angel-wings-preview.png")
    bpy.ops.render.render(write_still=True)
    record("complete",**report)


try:
    main()
except Exception as error:
    record("error",error=repr(error),traceback=traceback.format_exc())
    raise
