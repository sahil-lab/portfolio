"""Start a separate local-only face-sculpting Blender MCP session."""
import json
from pathlib import Path

import addon_utils
import bpy

output = Path(__file__).resolve().parents[2] / "outputs/sah-face"
output.mkdir(parents=True, exist_ok=True)
bpy.utils.refresh_script_paths()
addon_utils.modules_refresh()
addon_utils.enable("blender_mcp", default_set=False, persistent=True)
import blender_mcp

existing = getattr(bpy.types, "blendermcp_server", None)
if existing and existing.running:
    existing.stop()
bpy.context.preferences.addons["blender_mcp"].preferences.telemetry_consent = False
bpy.context.scene.name = "Sah_Face_MCP"
bpy.context.scene.blendermcp_port = 9877
for field in ("blendermcp_use_polyhaven", "blendermcp_use_hyper3d", "blendermcp_use_hunyuan3d", "blendermcp_use_sketchfab", "blendermcp_use_polypizza"):
    if hasattr(bpy.context.scene, field):
        setattr(bpy.context.scene, field, False)
bpy.types.blendermcp_server = blender_mcp.BlenderMCPServer(host="127.0.0.1", port=9877)
bpy.ops.blendermcp.start_server()
server = bpy.types.blendermcp_server
report = {"blender":bpy.app.version_string,"host":server.host,"port":server.port,"running":server.running,"telemetry_consent":False,"scene":bpy.context.scene.name}
(output / "connection.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report),flush=True)
