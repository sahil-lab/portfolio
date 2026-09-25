import bpy
import bmesh
import math
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main/outputs/sah-face"
scene=bpy.context.scene
head=bpy.data.objects["SAH_Head_Sculpt"]
assert not head.get("primary_shape_round_one")
features=bpy.data.collections["SAH_03_FACE_FEATURES"]
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_before_primary_correction.blend",copy=True)
for vertex in head.data.vertices:
    point=vertex.co
    if point.z>.207 and point.y>-.009:
        vertical=min(1,max(0,(point.z-.207)/.045))
        side=min(1,abs(point.x)/.035)
        point.x*=1+.31*vertical
        point.z+=.006*vertical*side
for suffix,side in (("R",-1),("L",1)):
    eye=bpy.data.objects["SAH_EYE_"+suffix]
    eye.location.y+=.004
    for name in ("IRIS","PUPIL"):
        obj=bpy.data.objects["SAH_"+name+"_"+suffix]
        for vertex in obj.data.vertices:
            vertex.co.y+=.004
    for prefix in ("SAH_EAR_","SAH_Antihelix_","SAH_Concha_Recess_"):
        obj=bpy.data.objects[prefix+suffix]
        obj.location.x-=side*.005
        obj.location.y+=.010
        obj.location.z+=.002

bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
evaluated=head.evaluated_get(depsgraph)
surface=evaluated.to_mesh()
tree=BVHTree.FromPolygons([vertex.co.copy() for vertex in surface.vertices],[tuple(face.vertices) for face in surface.polygons])
camera=REFERENCE_DATA["camera"]
for boundary in REFERENCE_DATA["facial_boundaries"]:
    if boundary["role"]!="eye":
        continue
    suffix="L" if boundary["center"][0]>0 else "R"
    eye=bpy.data.objects["SAH_EYE_"+suffix]
    center=eye.location.copy()
    radius=eye.dimensions.x/2
    outline=[Vector(REFERENCE_DATA["face_vertices"][index]) for index in boundary["indices"]]
    vertices=[]
    faces=[]
    coordinates=[]
    for ring in range(5):
        progress=ring/4
        for point in outline:
            radial=Vector((point.x-center.x,0,point.z-center.z))
            amount=radial.length
            direction=radial.normalized()
            outer=point+direction*.0068
            hit=tree.ray_cast(Vector((outer.x,-.35,outer.z)),Vector((0,1,0)))[0]
            outer.y=hit.y-.0002 if hit is not None else point.y+.003
            inward=point.copy()
            inward.y=min(point.y,center.y-math.sqrt(max(.000003,radius*radius-amount*amount))-.00025)
            coordinate=inward.lerp(outer,progress)
            coordinate.y-=.00065*math.sin(progress*math.pi)
            vertices.append(tuple(coordinate))
            depth=coordinate.y+.70
            pixel_x=camera["principal_pixel"][0]+camera["focal_pixels"]*coordinate.x/depth
            pixel_y=camera["principal_pixel"][1]-camera["focal_pixels"]*(coordinate.z-.165)/depth
            coordinates.append((pixel_x/camera["image_width"],1-pixel_y/camera["image_height"]))
    count=len(outline)
    for ring in range(4):
        for index in range(count):
            first=ring*count+index
            second=ring*count+(index+1)%count
            faces.append((first,second,second+count,first+count))
    mesh=bpy.data.meshes.new("SAH_Eyelid_Anatomical_Wrap_"+suffix)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name="PortraitProjection")
    for loop in mesh.loops:
        uv.data[loop.index].uv=coordinates[loop.vertex_index]
    for face in mesh.polygons:
        face.use_smooth=True
    mesh.materials.append(bpy.data.materials["SAH_Portrait_Reference_Color"])
    lid=bpy.data.objects.new(mesh.name,mesh)
    features.objects.link(lid)
    subdiv=lid.modifiers.new("Lid_Rim_Smoothing","SUBSURF")
    subdiv.levels=2
    subdiv.render_levels=2
    solid=lid.modifiers.new("Lid_Rim_Thickness","SOLIDIFY")
    solid.thickness=.0006
    lid["shape_source"]="Matched photo eye contour, wrapped to the recessed eyeball and surrounding skin"
evaluated.to_mesh_clear()

head["primary_shape_round_one"]=True
bpy.ops.object.select_all(action="DESELECT")
head.select_set(True)
bpy.context.view_layer.objects.active=head
scene.camera=bpy.data.objects["SAH_CAM_FRONT"]
scene.cycles.samples=16
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.render.filepath=OUT+"/renders/primary-correction-front.png"
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/face_03_primary_forms.blend")
window=bpy.context.window_manager.windows[0]
area=next(area for area in window.screen.areas if area.type=="VIEW_3D")
region=next(region for region in area.regions if region.type=="WINDOW")
area.spaces.active.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion()
area.spaces.active.region_3d.view_location=Vector((0,-.003,.146))
area.spaces.active.region_3d.view_distance=.44
area.spaces.active.lens=65
area.spaces.active.shading.type="SOLID"
with bpy.context.temp_override(window=window,area=area,region=region):
    bpy.ops.object.mode_set(mode="SCULPT")
    bpy.ops.brush.asset_activate(asset_library_type="ESSENTIALS",relative_asset_identifier="brushes/essentials_brushes-mesh_sculpt.blend/Brush/Smooth")
    brush=scene.tool_settings.sculpt.brush
    brush.strength=.18
    brush.size=52
    scene.tool_settings.sculpt.unified_paint_settings.use_unified_size=False
    scene.tool_settings.sculpt.unified_paint_settings.use_unified_strength=False
print(json.dumps({"skull_broadened":True,"eyeballs_recessed_mm":4,"wrapped_lids":2,"ear_inset_mm":5,"native_sculpt_mode":head.mode,"next":"Local native sculpt strokes after viewport update"}))
