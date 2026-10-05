# Reference-Guided Anime Figure

A separate anime-style figure based on the six supplied photographs in `pics/`: long side-parted black hair, large brown eyes, an oversized white T-shirt, navy shorts and neutral slides. The relaxed pose and compact display base are authored for this figure. This is an anime interpretation, not an exact likeness or scan.

The existing portfolio statue is unchanged. No commit, push or deployment is part of this work. The personal reference directory is excluded in `.gitignore`; all generated models, reports and screenshots are under the ignored `outputs/anime-figure/` directory. Photos were not uploaded to a generation service and are not embedded in the exported model or Blender master.

## Editable Asset

- `outputs/anime-figure/anime_figure_master.blend`: standalone scene with separate body, clothing, facial details, 30 hair locks, display base and studio setup. The untouched body source is retained but hidden.
- `outputs/anime-figure/anime-figure.glb`: portable display copy, with no studio backdrop, reference photos or hidden source mesh. It has 63 glTF meshes, 67 material primitives and 232,504 triangles.
- `outputs/anime-figure/anime-preview.png` and `review-front.png`: current full-figure renders.
- `outputs/anime-figure/review-portrait.png`: final close portrait.
- `outputs/anime-figure/character-validation.json`: save/reopen, topology, UV, source provenance, hashes and export checks.
- `outputs/anime-figure/viewer-validation.json`: desktop/mobile framing, rendered-pixel, turntable, clay-view and private-path checks.

The body starts from the existing [MakeHuman hm08 base](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj), released under [CC0 for graphical assets](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md). The downloaded source SHA-256 is `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`. Its body group retains all 13,380 vertices, 13,378 quads and original UVs in the editing master. Subdivision and covered-skin masking remain unapplied. Clothing panels use the base's helpers; the hairstyle and facial accents are separate authored objects. glTF triangulates and evaluates the display copy; edit the quad body in Blender.

This is a static figure, not an animation rig or print-certified watertight assembly. Head and body proportions are intentionally stylized, not physically measured. Original photos remain the visual reference for hairstyle, outfit and broad appearance; facial forms are simplified for the anime treatment.

## Local Viewer

Use Node 22.13+ and the workspace's installed Three.js dependency:

```powershell
node assets/anime-figure/serve.cjs
```

The default URL is `http://127.0.0.1:4321/`; set `ANIME_PORT` to use a different free port. The viewer provides orbit/zoom, camera views, a turntable toggle, clay mode and the GLB download. Its server allows only the viewer files, Three.js files and this GLB; it cannot serve the personal photo folder or arbitrary output files.

```powershell
npm exec --yes --package=playwright -- node assets/anime-figure/check_viewer.cjs
```

The browser check uses Edge and starts an isolated server on an available port. It verifies actual rendered pixels and captures desktop, side, face and mobile screenshots.

## Source Workflow

The numbered scripts are guarded Blender MCP operations and must not be blindly replayed against a modified scene. `package_character.py` isolates the final checkpoint in a separate Blender process, preserves the editing topology, saves and reopens the master, renders previews, and exports the evaluated GLB. Earlier scene checkpoints remain available for comparison.
