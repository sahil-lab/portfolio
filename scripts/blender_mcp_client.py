"""Run auditable, local-only Blender operations through the official MCP client."""
import argparse
import asyncio
import base64
import json
import os
import re
from datetime import timedelta
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "dog-digital-double" / "mcp-evidence"
GOAL = "please refer this and create on blender using MCP interact"


async def main(arguments):
    output = Path(arguments.output).resolve() if arguments.output else OUTPUT
    output.mkdir(parents=True, exist_ok=True)
    environment = dict(os.environ)
    environment.update({"BLENDER_HOST": "127.0.0.1", "BLENDER_PORT": str(arguments.port), "BLENDER_MCP_SAFE_MODE": "1", "DISABLE_TELEMETRY": "true", "BLENDERMCP_ADDONS_DIR": str(Path(os.environ["APPDATA"]) / "Blender Foundation/Blender/5.2/scripts/addons")})
    executable = Path(os.environ["LOCALAPPDATA"]) / "BlenderMCP/venv/Scripts/mcp-for-blender.exe"
    parameters = StdioServerParameters(command=str(executable), env=environment)
    records = []
    with (output / "server.log").open("a", encoding="utf-8") as log:
        async with stdio_client(parameters, errlog=log) as (incoming, outgoing):
            async with ClientSession(incoming, outgoing, read_timeout_seconds=timedelta(seconds=210)) as client:
                await client.initialize()

                async def call(name, values=None):
                    result = await client.call_tool(name, {"user_prompt": arguments.goal, **(values or {})})
                    failed = result.isError
                    content = []
                    for item in result.content:
                        if item.type == "text":
                            print(item.text, flush=True)
                            content.append({"type": "text", "text": item.text})
                            failed = failed or item.text.startswith(("Error ", "Rejected by safe mode"))
                        elif item.type == "image":
                            destination = output / (arguments.label + ".png")
                            destination.write_bytes(base64.b64decode(item.data))
                            print("VIEWPORT", destination, flush=True)
                            content.append({"type": "image", "path": str(destination)})
                    records.append({"tool": name, "content": content, "error": bool(failed)})
                    (output / (arguments.label + ".json")).write_text(json.dumps(records, indent=2), encoding="utf-8")
                    if failed:
                        raise RuntimeError("Blender MCP operation failed; inspect the saved response")
                    return result

                if arguments.action == "inspect":
                    await call("get_addon_status")
                    await call("get_scene_info")
                    await call("get_viewport_screenshot", {"max_size": 1400})
                elif arguments.action == "run":
                    code = Path(arguments.value).read_text(encoding="utf-8")
                    parameters = {"RENDER_VIEW": "three_quarter", "RENDER_FOLDER": "renders", "RENDER_SIZE": "1000", "RENDER_SAMPLES": "24", "RENDER_LOOK": "neutral"}
                    for parameter in arguments.param:
                        key, separator, value = parameter.partition("=")
                        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
                            raise ValueError("Parameters must be UPPERCASE_NAME=value")
                        parameters[key] = value
                    for specification in arguments.data:
                        key, separator, filename = specification.partition("=")
                        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
                            raise ValueError("Data inputs must be UPPERCASE_NAME=json_path")
                        parameters[key] = json.loads(Path(filename).read_text(encoding="utf-8"))
                    code = "\n".join(key + " = " + repr(value) for key, value in parameters.items()) + "\n" + code
                    await call("execute_blender_code", {"code": code})
                    await call("get_viewport_screenshot", {"max_size": 1400})
                    await call("get_scene_info")
                elif arguments.action == "api":
                    await call("bpy_api_lookup", {"query": arguments.value})
                elif arguments.action == "node":
                    await call("describe_node_type", {"bl_idname": arguments.value})
                elif arguments.action == "capture":
                    await call("get_viewport_screenshot", {"max_size": 1400})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("inspect", "run", "api", "node", "capture"))
    parser.add_argument("value", nargs="?")
    parser.add_argument("--label", default="connection")
    parser.add_argument("--param", action="append", default=[])
    parser.add_argument("--data", action="append", default=[])
    parser.add_argument("--output")
    parser.add_argument("--goal", default=GOAL)
    parser.add_argument("--port", type=int, default=9876)
    options = parser.parse_args()
    if options.action in {"run", "api", "node"} and not options.value:
        parser.error("This action requires a script path or API/node name")
    asyncio.run(main(options))
