"""Package the saved face scene in a separate Blender process without editing the live project."""
import hashlib
import json
import math
import shutil
import sys
import traceback
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/"outputs/sah-face"
STATUS=OUTPUT/"package-status.json"
PROFILE_REVISION="--profile-revision" in sys.argv
REVIEW_OUTPUT=OUTPUT/"profile-revision" if PROFILE_REVISION else OUTPUT


def status(stage, **details):
    STATUS.write_text(json.dumps({"stage":stage,**details},indent=2),encoding="utf-8")
    print("FACE_PACKAGE",stage,flush=True)


def main():
    source=REVIEW_OUTPUT/"side_07_surface_finished.blend" if PROFILE_REVISION else OUTPUT/"face_13_profile_refined.blend"
    if PROFILE_REVISION:
        archive=REVIEW_OUTPUT/"before-side-photos"
        archive.mkdir(parents=True,exist_ok=True)
        for name in ("sah_face_master.blend","face-validation.json","package-status.json","delivery-manifest.json"):
            original=OUTPUT/name
            if original.exists() and not (archive/name).exists():
                shutil.copy2(original,archive/name)
    status("opening",source=str(source))
    bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=False)
    scene=bpy.data.scenes.get("Sah_Face_Sculpt")
    assert scene is not None
    if bpy.context.window:
        bpy.context.window.scene=scene
    retained=set(scene.objects)
    for other in list(bpy.data.scenes):
        if other!=scene:
            bpy.data.scenes.remove(other)
    for obj in list(bpy.data.objects):
        if obj not in retained:
            bpy.data.objects.remove(obj,do_unlink=True)
    used_collections=set(scene.collection.children_recursive)
    for collection in list(bpy.data.collections):
        if collection not in used_collections:
            bpy.data.collections.remove(collection)
    for obj in list(scene.objects):
        if obj.hide_render and (obj.name.startswith("SAH_HAIR_Scalp_") or (PROFILE_REVISION and "BeforeSideReferences" in obj.name)):
            bpy.data.objects.remove(obj,do_unlink=True)
    for datablocks in (bpy.data.meshes,bpy.data.hair_curves,bpy.data.curves,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights,bpy.data.node_groups):
        for block in list(datablocks):
            if block.users==0:
                datablocks.remove(block)
    head=bpy.data.objects["SAH_Head_Sculpt"]
    assert head.get("profile_surface_finish" if PROFILE_REVISION else "profile_finish_complete")
    mesh=bmesh.new()
    mesh.from_mesh(head.data)
    topology={"vertices":len(mesh.verts),"faces":len(mesh.faces),"quad_faces":sum(len(face.verts)==4 for face in mesh.faces),"boundary_edges":sum(edge.is_boundary for edge in mesh.edges),"non_manifold_edges":sum(not edge.is_manifold for edge in mesh.edges),"degenerate_faces":sum(face.calc_area()<1e-14 for face in mesh.faces)}
    mesh.free()
    assert topology["boundary_edges"]==0 and topology["non_manifold_edges"]==0 and topology["degenerate_faces"]==0
    assert all(math.isfinite(coordinate) for vertex in head.data.vertices for coordinate in vertex.co)
    assert head.data.uv_layers
    references=[obj for obj in scene.objects if obj.name.startswith("SAH_REF_")]
    reference_count=11 if PROFILE_REVISION else 6
    assert len(references)==reference_count
    assert all(obj.data is not None and obj.data.packed_file for obj in references)
    assert len({obj.data.as_pointer() for obj in references})==reference_count
    groom=[obj for obj in scene.objects if obj.type=="CURVES" and not obj.hide_render]
    assert len(groom)==5
    surface=BVHTree.FromObject(head,bpy.context.evaluated_depsgraph_get())
    attachment=[]
    for obj in groom:
        assert obj.data.surface==head
        assert obj.data.attributes.get("surface_uv_coordinate")
        assert all(math.isfinite(coordinate) for point in obj.data.attributes["position"].data for coordinate in point.vector)
        distances=[]
        for curve_index in range(0,len(obj.data.curves),max(1,len(obj.data.curves)//512)):
            curve=obj.data.curves[curve_index]
            point=obj.data.attributes["position"].data[curve.first_point_index].vector
            local=head.matrix_world.inverted() @ obj.matrix_world @ point
            nearest,_normal,_index,distance=surface.find_nearest(local)
            assert nearest is not None
            distances.append(distance)
        assert max(distances)<.00025, (obj.name,max(distances))
        attachment.append({"name":obj.name,"sampled_roots":len(distances),"max_gap_m":max(distances)})
    assert not any(obj.name.startswith(("DOG_","FUR_","WEB_L")) for obj in scene.objects)
    for obj in scene.objects:
        if obj.name.startswith(("SAH_REF_","SAH_LM_","SAH_CAM_","SAH_LIGHT_")):
            obj.hide_set(True)
    for image in bpy.data.images:
        if image.type=="IMAGE" and image.size[0]>0 and not image.packed_file:
            image.pack()
    scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
    scene.render.resolution_x=1000
    scene.render.resolution_y=1200
    scene.render.resolution_percentage=100
    scene.cycles.samples=48
    scene.cycles.use_denoising=True
    scene.render.filepath=str(REVIEW_OUTPUT/("review/front-color.png" if PROFILE_REVISION else "review/front.png"))
    scene["deliverable"]="Face and full head only. No torso, accessories, rig, or portfolio integration."
    scene["likeness_status"]="Reference-guided approximation for review, not an exact scan or verified digital double."
    scene["depth_uncertainty"]="Both side profiles and obliques now constrain depth and ear placement. Manual annotations, estimated cameras and assumed scale are not calibrated multi-view reconstruction." if PROFILE_REVISION else "One close front portrait. The supplied overhead and underside views constrain scalp and chin, but there is no clear left or right facial profile."
    scene["color_provenance"]="Local source-photo color with background removal and restrained lighting correction. Residual photo lighting remains. Compare the untextured clay views for geometry."
    if PROFILE_REVISION:
        scene["color_provenance"]+=" Side-photo ear areas were locally inpainted to avoid duplicate projected ears; separate ear textures are packed."
    scene["model_scale"]="Assumed 64 mm interpupillary distance. Physical head dimensions were not measured."
    scene["native_sculpt_scope"]="Landmark-fitted mesh, Multires, surface refinement and short native Hair Curves. Native brush pass maximum change was micrometers; larger skull edits were reference-guided mesh adjustments, not hand-sculpted reconstruction."
    scene["topology_scope"]="Manifold quad-dominant subdivision cage, not manually retopologized or facial-animation certified."
    if hasattr(scene,"blendermcp_auto_start_server"):
        scene.blendermcp_auto_start_server=False
        scene.blendermcp_server_running=False
    if bpy.context.object and bpy.context.object.mode!="OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    head.hide_set(False)
    head.select_set(True)
    bpy.context.view_layer.objects.active=head
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active
                space.clip_start=.001
                space.lens=65
                space.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion()
                space.region_3d.view_location=Vector((0,.02,.163))
                space.region_3d.view_distance=.60
                space.overlay.show_overlays=False
                space.shading.type="MATERIAL"
    filepath=OUTPUT/"sah_face_master.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(filepath))
    report={"blender":bpy.app.version_string,"file":filepath.name,"scenes":len(bpy.data.scenes),"objects":len(scene.objects),"scope":"face/head only","topology":topology,"uv_layers":[layer.name for layer in head.data.uv_layers],"multires_levels":next(modifier.total_levels for modifier in head.modifiers if modifier.type=="MULTIRES"),"packed_references":len(references),"native_hair":[{"name":obj.name,"curves":len(obj.data.curves)} for obj in groom],"hair_attachment":attachment,"native_sculpt":json.loads(head["native_sculpt_report"]),"source_checkpoint":str(source.relative_to(OUTPUT)),"source_checkpoint_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),"likeness_status":scene["likeness_status"],"profile_revision":PROFILE_REVISION,"depth_uncertainty":scene["depth_uncertainty"]}
    if PROFILE_REVISION:
        report["ear_alignment"]=json.loads(head["profile_ear_alignment_report"])
        report["ear_surface_finish"]=json.loads(head["profile_surface_finish_report"])
    (OUTPUT/"face-validation.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    status("saved",report=report)
    bpy.ops.wm.open_mainfile(filepath=str(filepath),use_scripts=False)
    assert len(bpy.data.scenes)==1
    assert bpy.context.scene.name=="Sah_Face_Sculpt"
    assert len([obj for obj in bpy.context.scene.objects if obj.type=="CURVES" and not obj.hide_render])==5
    reopened_references=[obj for obj in bpy.context.scene.objects if obj.name.startswith("SAH_REF_")]
    assert len(reopened_references)==reference_count
    assert all(obj.data.packed_file for obj in reopened_references)
    if PROFILE_REVISION:
        assert bpy.data.objects["SAH_Head_Sculpt"].get("profile_surface_finish")
    assert bpy.data.objects["SAH_Head_Sculpt"].data.uv_layers
    status("complete",report=report,reopened=True,bytes=filepath.stat().st_size,sha256=hashlib.sha256(filepath.read_bytes()).hexdigest())


try:
    main()
except Exception as error:
    status("error",error=repr(error),traceback=traceback.format_exc())
    raise
