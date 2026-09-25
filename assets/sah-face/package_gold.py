"""Save and reopen a standalone gold head without touching the live Blender scenes."""
import hashlib
import json
import traceback
from pathlib import Path

import bpy

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/"outputs/sah-face"
STATUS=OUTPUT/"gold-package-status.json"


def record(stage,**details):
    STATUS.write_text(json.dumps({"stage":stage,**details},indent=2)+"\n",encoding="utf-8")
    print("GOLD_PACKAGE",stage,flush=True)


def main():
    source=OUTPUT/"sah_gold_working.blend"
    record("opening",source=source.name)
    bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=False)
    scene=bpy.data.scenes["Sah_Gold_Monument"]
    if bpy.context.window:
        bpy.context.window.scene=scene
    retained=set(scene.objects)
    for other in list(bpy.data.scenes):
        if other!=scene:
            bpy.data.scenes.remove(other)
    for obj in list(bpy.data.objects):
        if obj not in retained:
            bpy.data.objects.remove(obj,do_unlink=True)
    collections=set(scene.collection.children_recursive)
    for collection in list(bpy.data.collections):
        if collection not in collections:
            bpy.data.collections.remove(collection)
    for _pass in range(3):
        for datablocks in (bpy.data.meshes,bpy.data.hair_curves,bpy.data.curves,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.node_groups,bpy.data.worlds):
            for block in list(datablocks):
                block.use_fake_user=False
                if block.users==0:
                    datablocks.remove(block)
    meshes=[obj for obj in scene.objects if obj.type=="MESH"]
    assert len(meshes)==4 and len(bpy.data.scenes)==1
    assert all(obj.name.startswith("Gold_") for obj in meshes)
    triangles=sum(len(polygon.vertices)-2 for obj in meshes for polygon in obj.data.polygons)
    assert triangles==91808
    for obj in meshes:
        material=obj.data.materials[0]
        shader=next(node for node in material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
        assert shader.inputs["Metallic"].default_value==1
        assert not any(node.type=="TEX_IMAGE" for node in material.node_tree.nodes)
    assert not any(image.type=="IMAGE" for image in bpy.data.images)
    if hasattr(scene,"blendermcp_auto_start_server"):
        scene.blendermcp_auto_start_server=False
        scene.blendermcp_server_running=False
    scene["deliverable"]="Cast-gold head derived from the completed side-reference face; original skin master preserved separately."
    scene["portfolio_scale"]="Height equals 10 times bulletinSites.markets.height at runtime, including the world scale."
    scene["portfolio_visibility"]="Persistent camera-relative 3D display, rendered after world depth so districts, interiors, fog and planets cannot hide it."
    for obj in scene.objects:
        obj.hide_set(obj.type in {"CAMERA","LIGHT"})
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active
                space.clip_start=.001
                space.lens=65
                space.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion()
                space.region_3d.view_location=(0,.03,.163)
                space.region_3d.view_distance=.65
                space.overlay.show_overlays=False
    filepath=OUTPUT/"sah_gold_master.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(filepath),compress=True)
    bpy.ops.wm.open_mainfile(filepath=str(filepath),use_scripts=False)
    assert len(bpy.data.scenes)==1 and bpy.context.scene.name=="Sah_Gold_Monument"
    assert len([obj for obj in bpy.context.scene.objects if obj.type=="MESH"])==4
    record("complete",file=filepath.name,reopened=True,scenes=1,meshes=4,triangles=triangles,reference_photos=0,bytes=filepath.stat().st_size,sha256=hashlib.sha256(filepath.read_bytes()).hexdigest(),web_asset="public/assets/sah-gold-head.glb",web_asset_sha256=hashlib.sha256((ROOT/"public/assets/sah-gold-head.glb").read_bytes()).hexdigest())


try:
    main()
except Exception as error:
    record("error",error=repr(error),traceback=traceback.format_exc())
    raise
