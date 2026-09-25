import bpy
import json

report = {"mode": bpy.context.mode, "windows": [], "objects": []}
for obj in bpy.context.scene.objects:
    if obj.name.startswith("DOG_"):
        report["objects"].append({"name": obj.name, "mode": obj.mode, "visible": obj.visible_get(), "selected": obj.select_get(), "hide_viewport": obj.hide_viewport})
for window in bpy.context.window_manager.windows:
    entry = {"screen": window.screen.name, "workspace": window.workspace.name, "areas": []}
    for area in window.screen.areas:
        if area.type != "VIEW_3D":
            continue
        region = next(region for region in area.regions if region.type == "WINDOW")
        with bpy.context.temp_override(window=window, area=area, region=region):
            paint = bpy.context.scene.tool_settings.sculpt
            brush = paint.brush
            entry["areas"].append({"mode": bpy.context.mode, "active": bpy.context.view_layer.objects.active.name if bpy.context.view_layer.objects.active else None, "sculpt_object": bpy.context.sculpt_object.name if bpy.context.sculpt_object else None, "brush": brush.name if brush else None, "stroke_poll": bpy.ops.sculpt.brush_stroke.poll(), "paint_fields": [prop.identifier for prop in paint.bl_rna.properties if "unified" in prop.identifier or "brush" in prop.identifier], "brush_type_fields": [prop.identifier for prop in brush.bl_rna.properties if "sculpt" in prop.identifier] if brush else []})
            sequence = [{"point": "initial", "poll": bpy.ops.sculpt.brush_stroke.poll(), "mode": bpy.context.mode}]
            bpy.ops.brush.asset_activate(asset_library_type="ESSENTIALS", relative_asset_identifier="brushes/essentials_brushes-mesh_sculpt.blend/Brush/Smooth")
            sequence.append({"point": "after_asset_activation", "poll": bpy.ops.sculpt.brush_stroke.poll(), "mode": bpy.context.mode})
            bpy.ops.wm.redraw_timer(type="DRAW_WIN_SWAP", iterations=1)
            sequence.append({"point": "after_redraw", "poll": bpy.ops.sculpt.brush_stroke.poll(), "mode": bpy.context.mode})
            entry["preparation_sequence"] = sequence
    report["windows"].append(entry)
print(json.dumps(report, indent=2))
