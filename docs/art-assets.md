# Art asset handoff

The Packet Press is the first Blender-authored hero prop. Other existing world assets, including the animated courier, remain code-authored meshes; this pass does not claim that the entire kingdom has been converted to Blender.

## Editable sources

- `assets/blender/PacketPress.blend`: editable model, packed brush textures, named pivots, and NLA animation.
- `assets/blender/build_packet_press.py`: deterministic Blender 5.2 builder. Parameters at the top control seed, bevel size, segment count, frame rate, and duration. Builds in a separate background process, without touching an open interactive scene.
- `assets/blender/textures/`: original 128 × 128 painted-grain PNGs, retained separately as well as packed.
- `assets/art/workshop-mural-source.png`: untouched 1254 × 1254 generated artwork. This is the source resolution returned by built-in image generation; it has not been artificially upscaled.
- `assets/art/mural-prompt.md`: final generation prompt and selection notes.
- `assets/manifest.json`: authorship, intended use, coordinates, pivots, runtime binding, and export commands.

From the repository root, run:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python assets/blender/build_packet_press.py
python assets/art/optimize_mural.py
```

The mural optimization script needs Pillow. The Blender script needs no additional Python packages. GLB export uses the bundled glTF exporter. The runtime GLB is approximately 471 KiB, and the 1024 × 1024 WebP mural is approximately 146 KiB. The `.blend` source is explicitly exempted from the repository's general Blender-file ignore rule.

## Runtime behavior

`app/packet-press-asset.ts` loads the GLB at meter scale. Its single `PacketPress_Prepare` clip drives the lever, ram, and tray. The three-second delivery simulation samples the clip; the final frame holds until the player explicitly starts another round. Four individually named capsule groups and indicator materials respond to the same delivery state. The collision mesh is hidden and expanded by the player's navigation radius. Its bounds include the fully extended tray. Route planning and movement use these same obstacles, including the new mural wall.

The mural uses an sRGB, unlit material to preserve the original painted colors under the game’s tone mapping. A small depth offset prevents wall z-fighting. Cream paths, rougher materials, and warmer hemisphere lighting bring the existing world closer to the hero prop's palette.

## Verification

- Opened the actual local game in a separate test tab. Inspected the imported model and mural from the normal starting camera and while approaching the press. Verified the model's scale, cable silhouette, material response, stock slots, and visible capsule changes.
- Prepared four capsules, collected all four, delivered to the owl, chameleon, cloud, and tortoise family, returned to the press, explicitly started another round, and successfully prepared the next batch.
- Approach testing exposed overlap with the extended tray. Expanded the exported collision mesh, reopened a fresh preview, and confirmed that northward movement stops before the tray.
- The selected mural visibly contains four capsules, the bird, snail, and `codex` signature. Its courier and processor remain legible at the default camera distance. Small lettering is naturally easier to inspect at closer range.
- Twelve automated tests pass. GLB tests read the real export, inspect named nodes, embedded textures, normals, geometry budget, clip movement and rewind, and body/full-tray collision containment. Existing delivery and project-state regression tests pass.
- TypeScript and focused lint pass. Production build passes, with the existing large-client-chunk advisory.

One long-running hidden QA tab produced blank canvas captures late in the round test, with no JavaScript errors. Its DOM continued responding and the visible user tab remained rendered. Reloading the QA tab restored the canvas. Repeated the complete round in the refreshed tab and visually verified the reset: tray retracted, indicators dimmed, stock cleared, and the world remained rendered. The earlier hidden-tab capture anomaly did not reproduce.
