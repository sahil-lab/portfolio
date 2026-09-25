# Dog Multi-View Reconstruction

This is the Blender-native revision created through a live **MCP for Blender** connection. It is separate from the earlier procedural draft in `assets/reference-dog/` and does not modify the portfolio application.

## Status And Likeness

The photographs informed one individual dog, not a stock breed asset. Eight packed references, eight perspective comparison cameras and 52 provisional landmarks are retained in the master. Face, muzzle, eye placement, ear structure, body mass and short limbs were reviewed before grooming. The coat then received two correction rounds, a root-color transport repair and an eye-fringe refinement.

This remains a reference-guided artistic reconstruction, **not an exact or owner-approved digital double**. Side anatomy and real-world scale are inferred. The groom is more regularly grouped than the photographed coat, and the blaze, eye fringe and ear silhouette can still benefit from an owner's likeness review. Technical validation does not establish likeness.

## Files

All deliverables are under `outputs/dog-digital-double/`:

| File | Content |
| --- | --- |
| `dog_master.blend` | Native sculpt, editable quad cage and Multires level, 12 surface-attached Hair Curves regions, Geometry Nodes densification, references, cameras and neutral/beauty lighting. |
| `dog_web.glb` | Main web model with guide-derived alpha-cutout hair cards and baked PBR body materials. |
| `dog_web_lod1.glb` | Medium-detail web model. |
| `dog_web_lod2.glb` | Light distant model. |
| `dog_body_low.obj` | Unrigged low-resolution body cage. |
| `textures/` | 2K body albedo, roughness, tangent normal, fur-density and fur-length maps; web strand atlas. |
| `renders/` | Native Cycles front, left, right, rear, top, three-quarter, close-face and contact-sheet images. |
| `reference-final/` | Eight perspective reference-angle renders and a paired comparison sheet. Posed views are not treated as neutral-pose silhouette matches. |
| `turntable/dog_turntable.mp4` | Six-second rotation of the actual web GLB. This is not a native-hair Cycles animation. |
| `mcp-evidence/` | MCP responses, operator diagnostics and captured Blender viewport states. |

The requested checkpoints `dog_01_blockout.blend` through `dog_06_final.blend` are preserved, along with `dog_00_reference.blend`. Corrections and backups are retained; earlier checkpoints should not be mistaken for the final material state.

## Verified Structure

- Body cage: 7,963 vertices and 7,961 quad faces, with no open edges, non-manifold edges or zero-area faces.
- Native groom: 12 Hair Curves objects, 4,180 editable guides, surface UV attachments, interpolated density, restrained clumping, wave and tip taper.
- After restoring the body frame, every region's guide roots were measured within approximately 0.5 mm of its surface. Render automation rejects a displaced body frame.
- Revised web LODs: 217,722 / 83,962 / 38,110 triangles; 23 meshes per LOD, including 12 fur regions.
- Embedded GLB maps, normals, UVs, named coat-color attributes, alpha masks and explicit tangents are checked by `scripts/verify-dog-web.cjs`.
- The actual GLB was re-imported into Blender; all meshes retained UVs and all fur regions retained coat colors.
- The viewer is tested at desktop, 390px and 320px phone, and landscape sizes, with canvas-pixel and motion checks.

## Approved Workflow Changes

The user explicitly approved these adaptations to the original brief:

1. Stepwise Blender-native Python operators through MCP, instead of requiring direct mouse-only interaction.
2. Native QuadriFlow plus projected cleanup instead of fully hand-built Poly Build topology. The cage is not claimed to be deformation-certified.
3. Native Edit Mode guide-point transforms after Curves Sculpt Comb replay repeatedly produced no deformation. The guides remain real editable Hair Curves; the evidence does not claim successful brush strokes where none occurred.

Native mesh sculpt strokes were verified to change 10,630 vertices. Brow Edit Mode transforms changed 1,200 points while preserving roots. No stock model, external image-generation service or reference-photo upload was used. The asset is unrigged; the brief made animation rigging optional.

## Editing

### Owner Correction Pass, September 24

The saved master and all three GLBs now include reduced eye glare, shallow wrapping eyelids, a narrower hanging cheek/moustache groom, a longer irregular beard, broader chest feathering and varied ear locks. The former exposed smile is hidden. The clear corneal objects remain editable but are hidden to avoid double highlights. Eye spacing and the underlying body anatomy were not changed in this pass.

The web fur now uses paired, narrower locks with varied lengths and fine tips instead of uniformly wide folded ribbons. The web version remains visibly coarser than the native groom; this change is not a claim of photo-real likeness.

Use `owner-corrections/before-after.jpg`, `owner-corrections/revised-master.blend`, the refreshed `web-previews/`, and the updated web turntable for this revision. The older `renders/`, `reference-final/` and numbered intermediate checkpoints document the previous pass, not this latest correction. `dog_before_owner_corrections.blend` preserves the earlier model. The master and `dog_06_final.blend` are updated.

Use the numbered collections in the master. `DOG_SCULPT_HIGH` is hidden to avoid overlap; `DOG_BODY_RETOPO` is the editable cage. `05_GROOM` contains the twelve native regions. Adjust guide points or the region's Geometry Nodes interface for density, clumping and wave. `08_EXPORT` contains hidden, separate web meshes; edits to the native groom do not automatically update them.

Intrinsic coat masks are available as vertex color attributes and baked image textures. The native hair uses per-root coat color transported from the surface, which avoids stale UV sampling after atlas repacking. Re-baked images must be reloaded into fresh image datablocks before packing/exporting: otherwise an earlier packed PNG may survive despite a current external bake.

The native master uses Principled Hair; the GLBs use ordinary PBR plus alpha-cutout locks. They are intentionally different render representations and should be reviewed independently.

The normal map is supplied for editing, but its material contribution is disabled after the shading diagnostic. Current rendering uses geometric normals and the groom. Older diagnostic images are retained as evidence, not as the final render set. The studio floor is hidden only for the underside comparison cameras to avoid occluding the dog.

## MCP And Replay

The isolated connector is installed at `%LOCALAPPDATA%/BlenderMCP/venv/`. The workspace configuration restricts the connection to `127.0.0.1:9876`, keeps safe mode on and disables telemetry. Asset-library and cloud-generation integrations are off. The dedicated Blender window leaves the original user scene untouched.

`scripts/blender_mcp_client.py` uses the official MCP SDK and server, not a direct socket substitute. It sends one operation at a time and records the response, viewport screenshot and scene query. Scripts under `steps/` are staged operations, **not a safe blind batch**: some expect a particular checkpoint or a verified live context.

Render one view per MCP request to stay inside the connection timeout:

```powershell
& "$env:LOCALAPPDATA\BlenderMCP\venv\Scripts\python.exe" scripts/render_dog_master.py --skip-existing
& "$env:LOCALAPPDATA\BlenderMCP\venv\Scripts\python.exe" scripts/render_dog_master.py --references --skip-existing
node scripts/verify-dog-web.cjs
node scripts/check-dog-web.cjs --turntable
python assets/dog-digital-double/finish_media.py
python assets/dog-digital-double/comparison_sheet.py reference-final
node assets/dog-digital-double/serve.cjs
```

Node 24, Playwright/Edge and `gltf-validator` must be available for those checks. Media packaging uses Pillow and imageio-ffmpeg. Blender scripts run inside Blender, not the editor's regular Python interpreter.

The local viewer is `http://127.0.0.1:4319/`. It serves existing files read-only.
