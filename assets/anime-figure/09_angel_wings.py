import bpy
import json
import math
from mathutils import Vector

ROOT="C:/Users/upadhsah/Downloads/portfolio-main/portfolio-main"
OUT=ROOT+"/outputs/angel"
assert bpy.data.scenes.get("Anime_Angel") is None
source=bpy.data.scenes["Reference_Anime_Figure"]
assert bpy.data.objects["ANI_Body"].get("final_face_smoothing")
scene=bpy.data.scenes.new("Anime_Angel")
scene.render.engine=source.render.engine
scene.view_settings.view_transform=source.view_settings.view_transform
scene.view_settings.look=source.view_settings.look
scene.render.image_settings.file_format=source.render.image_settings.file_format
scene.world=source.world.copy()
bpy.context.window.scene=scene
copies={}
for original in source.objects:
    if original.name=="ANI_Display_Base" or original.hide_render and original.name!="ANI_Untouched_MakeHuman_Body":
        continue
    obj=original.copy()
    if original.data is not None:
        obj.data=original.data.copy()
    obj.name="ANGEL_"+original.name.removeprefix("ANI_")
    scene.collection.objects.link(obj)
    copies[original]=obj
for original,obj in copies.items():
    obj.parent=copies.get(original.parent)
    obj.hide_set(original.hide_render)
assembly=bpy.data.objects["ANGEL_Character"]
assembly.location.z=0
body=bpy.data.objects["ANGEL_Body"]
reference=bpy.data.objects["ANGEL_Untouched_MakeHuman_Body"]
assert [tuple(face.vertices) for face in body.data.polygons]==[tuple(face.vertices) for face in reference.data.polygons]
materials=[]
for title,color,roughness,metal in (("Ivory_Feather",(.89,.86,.76),.62,0),("Pearl_Feather",(.69,.79,.83),.58,0),("Warm_Quill",(.70,.52,.22),.45,.25)):
    material=bpy.data.materials.new("ANGEL_"+title)
    material.use_nodes=True
    shader=next(node for node in material.node_tree.nodes if node.type=="BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Roughness"].default_value=roughness
    shader.inputs["Metallic"].default_value=metal
    material.diffuse_color=(*color,1)
    materials.append(material)
reports=[]
for sign,suffix in ((1,"L"),(-1,"R")):
    hinge=bpy.data.objects.new("ANGEL_Wing_"+suffix,None)
    scene.collection.objects.link(hinge)
    hinge.parent=assembly
    pivot=Vector((sign*.085,.112,1.255))
    hinge.location=pivot
    vertices=[]
    faces=[]
    assignments=[]

    def feather(start,end,width,finish,curve=.08):
        start=Vector((sign*start[0],start[1],start[2]))
        end=Vector((sign*end[0],end[1],end[2]))
        along=(end-start).normalized()
        broad=Vector((along.z,0,-along.x)).normalized()
        outward=Vector((0,-1,0))
        first=len(vertices)
        rows=12
        sides=8
        for row in range(rows+1):
            amount=row/rows
            center=start.lerp(end,amount)+Vector((sign*curve*math.sin(amount*math.pi),-.024*math.sin(amount*math.pi),0))
            taper=(.14+.86*math.sin(math.pi*min(.985,amount*.93+.03))**.58)*(1-amount**7)+.006
            for section in range(sides):
                angle=section/sides*math.tau
                point=center+broad*(math.cos(angle)*width*.5*taper)+outward*(math.sin(angle)*.009*taper)-pivot
                vertices.append(tuple(point))
                if row:
                    current=first+row*sides+section
                    following=first+row*sides+(section+1)%sides
                    faces.append((current-sides,following-sides,following,current))
                    assignments.append(finish)
        faces.append(tuple(reversed(range(first,first+sides))))
        assignments.append(finish)
        faces.append(tuple(first+rows*sides+section for section in range(sides)))
        assignments.append(finish)

    for index in range(16):
        fraction=index/15
        start=(.18+1.23*fraction,.17,1.35+.43*math.sin(fraction*math.pi*.65))
        end=(.26+1.56*fraction,.18, .88+.41*fraction)
        feather(start,end,.13 if index<8 else .115,0 if index%3 else 1,.045)
    for index in range(14):
        fraction=index/13
        start=(.13+1.22*fraction,.105,1.31+.43*math.sin(fraction*math.pi*.66))
        end=(.28+1.21*fraction,.10,1.10+.33*fraction)
        feather(start,end,.115,0,.025)
    for index in range(12):
        fraction=index/11
        start=(.11+1.16*fraction,.066,1.29+.41*math.sin(fraction*math.pi*.70))
        end=(.20+1.13*fraction,.06,1.21+.33*fraction)
        feather(start,end,.094,1 if index%4==0 else 0,.015)
    mesh=bpy.data.meshes.new("ANGEL_Layered_Feathers_"+suffix)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    for material in materials:
        mesh.materials.append(material)
    for polygon,assignment in zip(mesh.polygons,assignments):
        polygon.material_index=assignment
        polygon.use_smooth=True
    wing=bpy.data.objects.new("ANGEL_Feathers_"+suffix,mesh)
    scene.collection.objects.link(wing)
    wing.parent=hinge
    modifier=wing.modifiers.new("Soft_Feather_Edges","SUBSURF")
    modifier.levels=1
    modifier.render_levels=1
    curve=bpy.data.curves.new("ANGEL_Leading_Quill_"+suffix,"CURVE")
    curve.dimensions="3D"
    curve.bevel_depth=.017
    curve.bevel_resolution=3
    spline=curve.splines.new("BEZIER")
    control_points=[(.10,.13,1.26),(.36,.16,1.49),(.74,.17,1.63),(1.15,.17,1.73),(1.43,.17,1.73)]
    spline.bezier_points.add(len(control_points)-1)
    for index,(control,point) in enumerate(zip(spline.bezier_points,control_points)):
        control.co=Vector((sign*point[0],point[1],point[2]))-pivot
        control.handle_left_type=control.handle_right_type="AUTO"
        control.radius=1-index/len(control_points)*.73
    curve.materials.append(materials[2])
    quill=bpy.data.objects.new(curve.name,curve)
    scene.collection.objects.link(quill)
    quill.parent=hinge
    hinge["animation_role"]="wing hinge for local z flap and local y feather sweep after glTF export"
    reports.append({"side":suffix,"feathers":len(vertices)//104,"pivot":list(pivot)})
scene.camera=bpy.data.objects["ANGEL_Camera"]
scene.camera.location=(1.05,-5.5,2.10)
scene.camera.rotation_euler=(Vector((0,0,.96))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.lens=53
backdrop=bpy.data.objects.get("ANGEL_Studio_Backdrop_NoExport")
if backdrop:
    backdrop.rotation_euler.z=math.atan2(scene.camera.location.x,-scene.camera.location.y)
scene.render.resolution_x=1200
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.filepath=OUT+"/angel-wings-preview.png"
scene["winged_figure_ready"]=True
scene["wing_report"]=json.dumps(reports)
scene["privacy"]="Reference photos remain local; derivative adds only geometric wings. Original anime scene and portfolio statue preserved."
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/angel_01_wings.blend")
bpy.ops.render.render(write_still=True)
print(json.dumps({"scene":scene.name,"wings":reports,"body_topology_preserved":True,"original_anime_scene_preserved":bpy.data.scenes.get("Reference_Anime_Figure") is not None},indent=2))
