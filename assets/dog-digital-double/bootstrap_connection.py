"""Enable the approved local MCP add-on in a dedicated Blender GUI session."""
import json
from pathlib import Path

import addon_utils
import bpy


root = Path(__file__).resolve().parents[2]
output = root / "outputs" / "dog-digital-double"
output.mkdir(parents=True, exist_ok=True)
bpy.utils.refresh_script_paths()
addon_utils.modules_refresh()
addon_utils.enable("blender_mcp", default_set=True, persistent=True)
import blender_mcp

preferences = bpy.context.preferences.addons["blender_mcp"].preferences
preferences.telemetry_consent = False
scene = bpy.context.scene
scene.name = "Dog_Digital_Double_MCP"
scene.blendermcp_port = 9876
for field in ("blendermcp_use_polyhaven", "blendermcp_use_hyper3d", "blendermcp_use_hunyuan3d", "blendermcp_use_sketchfab", "blendermcp_use_polypizza"):
    if hasattr(scene, field):
        setattr(scene, field, False)
if not getattr(bpy.types, "blendermcp_server", None):
    bpy.types.blendermcp_server = blender_mcp.BlenderMCPServer(host="127.0.0.1", port=9876)
bpy.ops.blendermcp.start_server()
bpy.ops.wm.save_userpref()
server = bpy.types.blendermcp_server
report = {"blender": bpy.app.version_string, "host": server.host, "port": server.port, "running": server.running, "telemetry_consent": preferences.telemetry_consent, "scene": scene.name}
(output / "connection.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report), flush=True)
