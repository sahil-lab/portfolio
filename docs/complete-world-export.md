# Complete World Export

The export is in [outputs/complete-world-export](../outputs/complete-world-export/manifest.json).
It contains the complete static 3D kingdom, not only the currently streamed view.

## Contents

- One home-world landmarks and infrastructure zone.
- All 236 full-detail city blocks, containing 1,888 buildings and 472 residents.
- All nine complete planet landscapes, including towns, outposts, venues, planting, populations and authored terrain.
- A separate library containing Comet, Vector, Ion and the crew starship.
- Embedded scene textures, vertex colors, instance colors, hierarchy, transforms and object identities.
- Original public model parts, JavaScript rig definitions, material maps and HDR environment.
- Archived controller and shader source, per-zone manifests and a coverage report.
- A separate material-grouped Blender working assembly. Original per-object GLBs remain unchanged.

The 247 GLBs total 2,554,888,484 bytes. Shared binary payloads are reused without
quantization, decimation, texture resizing or extension removal. Every referenced
buffer view is compared byte-for-byte before the compacted file is accepted.

The independently verified originals contain 332,352 nodes and 38,700,737
triangles. The separate Blender assembly groups compatible materials into 11,187
nodes while retaining every triangle. It is 3.45 GB because shared instances become
joined mesh data. Per-object editing and unmodified shader-extension data remain
available in the original zones.

## Blender

The finished native working scene is
[outputs/complete-world-export/complete-kingdom-final.blend](../outputs/complete-world-export/complete-kingdom-final.blend)
(1,097,429,806 bytes). All 247 zones and 38,700,737 source triangles were checked
against the actual imported meshes. The scene contains 27,266 objects, 315 packed
images, 12 cameras, 3,521 restored surface materials and 95 finished line/point
objects. Earlier imported blocks retain more detailed grouping, so its object
count differs from a fresh import of the final material-grouped GLBs.

Cycles checks were rendered and inspected:
[outputs/complete-world-home-render.png](../outputs/complete-world-home-render.png)
and [outputs/complete-world-planet-render.png](../outputs/complete-world-planet-render.png).
The opening workshop camera was lowered to avoid cloud occlusion.

The verified
[outputs/complete-world-export-portable.zip](../outputs/complete-world-export-portable.zip)
contains the original zones, derived assembly, assets, source references and
importer. It predates this final native save and does not contain the Blender file
linked above. All 736 recorded archive file hashes and portable paths were checked.

[scripts/import-complete-world.py](../scripts/import-complete-world.py) imports the
package into a new scene without deleting existing scenes. It verifies file hashes
and imported identities, restores authored relief, supplies physical line and point
representations, loads the HDR environment and saves an editable Blender file.

From an ordinary Blender command-line installation:

```text
blender --background --python scripts/import-complete-world.py -- --package outputs/complete-world-export --assembly
```

Omit `--assembly` to import the original per-object hierarchy. Use repeated `--zone` options to import selected zones, for example
`--zone city-block-0 --zone planet-copper`. The complete detailed import contains
over 330,000 nodes and needs substantial memory and processing time.

## Reproduction

Run the local application, then:

```text
npm exec --yes --package=playwright -- node scripts/export-complete-world.cjs --url=http://localhost:4332/ --output=outputs/new-complete-export
node scripts/verify-complete-world.cjs outputs/new-complete-export
```

Use `--probe` for the home zone, one city block, Forge and the vehicle library.
Use `--resume` to continue the same source version. Changed source or assets are
rejected rather than silently mixed with an older export.

## Limits

This is a complete scene/asset snapshot, not a translation of the JavaScript game
into Blender. Motion controllers, interaction, collisions, live feeds, HTML UI and
postprocessing remain application behavior. Skinned scene poses are baked where
present. The original character GLBs use multipart JavaScript rigs, not glTF skins
or animation clips; model parts and rig definitions are supplied separately.
Displays contain export-time images.

Custom GLSL is retained in manifests but uses static material approximations.
Blender paving uses world-coordinate box projection instead of the exact shader's
normal-weighted projection. GLSL-only sky/vapor shells are retained but hidden in
the Blender render setup; the HDR supplies environment lighting. These are not
pixel-identical browser renders or a baked animation of every possible game state.
