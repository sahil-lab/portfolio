"""Package a separate anime figure and verify its editable source and display export."""
import hashlib
import json
import math
import struct
import traceback
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/"outputs/anime-figure"
STATUS=OUTPUT/"package-status.json"


def record(stage,**details):
    STATUS.write_text(json.dumps({"stage":stage,**details},indent=2)+"\n",encoding="utf-8")
    print("ANIME_PACKAGE",stage,flush=True)


def connectivity(obj):
    return [list(face.vertices) for face in obj.data.polygons]


def main():
    checkpoint=OUTPUT/"anime_08_face_smooth.blend"
    record("opening",checkpoint=checkpoint.name)
    bpy.ops.wm.open_mainfile(filepath=str(checkpoint),use_scripts=False)
    scene=bpy.data.scenes["Reference_Anime_Figure"]
    if bpy.context.window:
        bpy.context.window.scene=scene
    retained=set(scene.objects)
    for other in list(bpy.data.scenes):
        if other!=scene:
            bpy.data.scenes.remove(other)
    for obj in list(bpy.data.objects):
        if obj not in retained or obj.hide_render and obj.name!="ANI_Untouched_MakeHuman_Body":
            bpy.data.objects.remove(obj,do_unlink=True)
    used_collections=set(scene.collection.children_recursive)
    for collection in list(bpy.data.collections):
        if collection not in used_collections:
            bpy.data.collections.remove(collection)
    for _iteration in range(4):
        for datablocks in (bpy.data.meshes,bpy.data.hair_curves,bpy.data.curves,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.node_groups,bpy.data.worlds):
            for block in list(datablocks):
                block.use_fake_user=False
                if block.users==0:
                    datablocks.remove(block)
    body=bpy.data.objects["ANI_Body"]
    original=bpy.data.objects["ANI_Untouched_MakeHuman_Body"]
    assert body.get("garment_clearance") and body.get("final_face_smoothing")
    assert len(body.data.vertices)==len(original.data.vertices)==13380
    assert len(body.data.polygons)==len(original.data.polygons)==13378
    assert connectivity(body)==connectivity(original)
    assert [tuple(loop.uv) for loop in body.data.uv_layers[0].data]==[tuple(loop.uv) for loop in original.data.uv_layers[0].data]
    topology=bmesh.new()
    topology.from_mesh(body.data)
    shape={"vertices":len(topology.verts),"faces":len(topology.faces),"quads":sum(len(face.verts)==4 for face in topology.faces),"boundary_edges":sum(edge.is_boundary for edge in topology.edges),"non_manifold_edges":sum(not edge.is_manifold for edge in topology.edges),"degenerate_faces":sum(face.calc_area()<1e-14 for face in topology.faces)}
    topology.free()
    assert shape["boundary_edges"]==shape["non_manifold_edges"]==shape["degenerate_faces"]==0
    source_hash=hashlib.sha256(json.dumps(connectivity(original),separators=(",",":")).encode("ascii")).hexdigest()
    for obj in scene.objects:
        if obj.type=="MESH":
            assert all(math.isfinite(value) for vertex in obj.data.vertices for value in vertex.co),obj.name
    assert not any(image.type=="IMAGE" for image in bpy.data.images)
    assert all(modifier.type in {"SUBSURF","MASK"} for modifier in body.modifiers)
    scene["deliverable"]="Separate reference-guided anime figure: long side-parted black hair, brown eyes, oversized white T-shirt, navy shorts and slides. Existing portfolio objects are not replaced."
    scene["human_base_license"]="MakeHuman hm08 CC0 graphical asset; source OBJ SHA256 8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c"
    scene["body_connectivity_sha256"]=source_hash
    if hasattr(scene,"blendermcp_auto_start_server"):
        scene.blendermcp_auto_start_server=False
        scene.blendermcp_server_running=False
    camera=bpy.data.objects["ANI_Camera"]
    camera.location=(1.65,-3.9,1.78)
    camera.rotation_euler=(Vector((0,-.025,.865))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=70
    scene.camera=camera
    bpy.data.objects["ANI_Studio_Backdrop_NoExport"].rotation_euler.z=math.atan2(camera.location.x,-camera.location.y)
    scene.render.resolution_x=1000
    scene.render.resolution_y=1300
    scene.render.resolution_percentage=100
    scene.cycles.samples=40
    scene.render.filepath=str(OUTPUT/"anime-preview.png")
    for obj in scene.objects:
        if obj.type in {"CAMERA","LIGHT"} or "NoExport" in obj.name:
            obj.hide_set(True)
    bpy.ops.object.select_all(action="DESELECT")
    body.hide_set(False)
    body.select_set(True)
    bpy.context.view_layer.objects.active=body
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active
                space.clip_start=.005
                space.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
                space.region_3d.view_location=Vector((0,0,.85))
                space.region_3d.view_distance=3.3
                space.overlay.show_overlays=False
                values=[item.identifier for item in space.shading.bl_rna.properties["type"].enum_items]
                if "MATERIAL" in values:
                    space.shading.type="MATERIAL"
    master=OUTPUT/"anime_figure_master.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(master),compress=True)
    bpy.ops.wm.open_mainfile(filepath=str(master),use_scripts=False)
    assert len(bpy.data.scenes)==1 and bpy.context.scene.name=="Reference_Anime_Figure"
    assert connectivity(bpy.data.objects["ANI_Body"])==connectivity(bpy.data.objects["ANI_Untouched_MakeHuman_Body"])
    scene=bpy.context.scene
    record("master-reopened",master=master.name,body_topology=shape)
    bpy.ops.render.render(write_still=True)
    camera=bpy.data.objects["ANI_Camera"]
    camera.location=(0,-4.15,1.57)
    camera.rotation_euler=(Vector((0,-.025,.865))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.objects["ANI_Studio_Backdrop_NoExport"].rotation_euler.z=0
    scene.render.filepath=str(OUTPUT/"review-front.png")
    scene.cycles.samples=32
    bpy.ops.render.render(write_still=True)
    display=[obj for obj in scene.objects if obj.type in {"MESH","CURVE"} and not obj.hide_render and "NoExport" not in obj.name]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in display:
        obj.hide_set(False)
        obj.select_set(True)
        for modifier in obj.modifiers:
            if modifier.type=="SUBSURF":
                modifier.levels=1
                modifier.render_levels=1
    bpy.context.view_layer.objects.active=bpy.data.objects["ANI_Body"]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT/"anime-figure.glb"),use_selection=True,use_active_scene=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=False)
    asset=OUTPUT/"anime-figure.glb"
    payload=asset.read_bytes()
    assert payload[:4]==b"glTF"
    metadata=json.loads(payload[20:20+struct.unpack_from("<I",payload,12)[0]])
    assert len(metadata["scenes"])==1 and not metadata.get("images") and not metadata.get("textures")
    names=[node.get("name","") for node in metadata["nodes"]]
    assert all("Untouched" not in name and "NoExport" not in name and "Blockout" not in name for name in names)
    for prefix in ("ANI_Body","ANI_Tee","ANI_Shorts","ANI_Slide","ANI_Back_Lock","ANI_FaceFraming","ANI_Painted_Iris","ANI_Display_Base"):
        assert any(name.startswith(prefix) for name in names),prefix
    triangles=sum(metadata["accessors"][primitive["indices"]]["count"]//3 for mesh in metadata["meshes"] for primitive in mesh["primitives"])
    assert triangles<320000,triangles
    references=[]
    for filename in sorted((ROOT/"pics").glob("*.jpg")):
        references.append({"file":filename.name,"sha256":hashlib.sha256(filename.read_bytes()).hexdigest()})
    assert len(references)==6
    report={"master":master.name,"master_bytes":master.stat().st_size,"master_sha256":hashlib.sha256(master.read_bytes()).hexdigest(),"reopened":True,"scene_count":1,"body_topology":shape,"original_connectivity_sha256":source_hash,"fitted_connectivity_sha256":source_hash,"original_uvs_preserved":True,"hair_locks":30,"reference_photos":references,"embedded_photographs":0,"source_checkpoint":checkpoint.name,"source_checkpoint_sha256":hashlib.sha256(checkpoint.read_bytes()).hexdigest(),"asset":asset.name,"asset_bytes":len(payload),"asset_sha256":hashlib.sha256(payload).hexdigest(),"asset_triangles":triangles,"asset_meshes":len(metadata["meshes"]),"scope":"Static, editable anime-style interpretation; not exact likeness, not rigged, not certified for printing","display_copy_note":"GLB evaluates subdivision and clothing mask and triangulates the display copy; edit the preserved quad body in the Blender master","existing_portfolio_unchanged":True,"garment_clearance":json.loads(scene["garment_clearance_report"])}
    (OUTPUT/"character-validation.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    record("complete",**report)


try:
    main()
except Exception as error:
    record("error",error=repr(error),traceback=traceback.format_exc())
    raise
