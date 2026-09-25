# Face-Only Blender Study

An editable head and face based on the six photographs in `picsofSah/`. No body, clothing, earbuds, rig, or portfolio integration is included.

## Likeness And Limits

The close front portrait (`IMG_8520.jpeg`) supplies facial feature spacing. The overhead and underside photographs inform the scalp and chin; the distant rear photographs constrain the back-of-head silhouette. There is no clear left/right facial profile, so depth, ears and unseen side anatomy remain estimates.

This is **not an exact scan or a verified digital double**. A local MediaPipe model estimated 478 face landmarks from the close front portrait. Its depth is monocular, and the working scale assumes a 64 mm interpupillary distance. Matching the projected input landmarks is a setup check, not independent evidence of exact likeness.

The head was refined in Blender 5.2.2 through the local MCP connection, with an editable subdivision cage, Multires, wrapping eyelids, separate eyes and ear forms, and native Hair Curves for scalp stubble, brows, moustache, beard and sideburns. The recorded native sculpt brush pass made very small (micrometer-scale) changes; larger corrections used reference-guided mesh adjustments. It should not be described as a fully hand-sculpted or animation-certified asset.

Face color is derived from the supplied portrait with the background removed and restrained low-frequency lighting correction. It retains some photographic lighting. Side/rear skin is authored and blended into that color. **Use the clay previews to judge the actual geometry separately from the portrait texture.**

## Deliverables

Generated files live in `outputs/sah-face/`:

- `sah_face_master.blend`: standalone face-only scene with packed references, skin textures, editable head, Multires, separate eyes/ears and native short-hair regions.
- `review/`: front, three-quarter, profile, top and matched-source-camera color renders.
- `clay/`: front and three-quarter renders with portrait color and hair hidden.
- `comparison.jpg`: reference photograph, matched-camera model and clay comparison.
- `preview-sheet.jpg`: multiple model views, including the estimated profile.
- `face-validation.json` and `package-status.json`: topology, UV, hair, packed-reference and save/reopen checks.
- `analysis/`: local landmark overlays, reference provenance, original-coordinate fit and portrait crop.
- `face_01_*.blend` through `face_13_*.blend`: intermediate checkpoints. These may retain the previously active scene; use the standalone master for the face-only deliverable.

The original dog scene was preserved in `previous-scene-preserved.blend`. The standalone packaging step runs in a separate Blender process; it does not delete or replace objects in the live source scene.

## References

| Source | Use |
| --- | --- |
| IMG_8513 | Distant front proportions; insufficient facial resolution for reliable automatic landmarks. |
| IMG_8514 | Rear skull and short-hair silhouette. |
| IMG_8515 | Corroborating rear silhouette. |
| IMG_8520 | Primary close face, asymmetric brows, eyes, nose, lips and beard. |
| IMG_8525 | Buzz-cut length and hairline recession from above. |
| IMG_8528 | Chin, underside of jaw and beard continuation. |

All image processing is local. Photos were not uploaded to a generation service. The only analysis downloads were the public MediaPipe landmark model and canonical connectivity under Apache-2.0; that connectivity was fitted to the supplied portrait, not used as a stock identity.

## Editing And Replay

The working scene is `Sah_Face_Sculpt`. `SAH_Head_Landmark_Cage` preserves the fitted starting surface; `SAH_Head_Sculpt` is the refined, UV-mapped Multires head. The `SAH_04_HAIR` collection contains editable short-hair regions. References and landmark markers are retained but hidden from the opening viewport.

The steps under `assets/sah-face/steps/` are checkpoint-dependent MCP operations, not an unattended script batch. They must not be blindly rerun. The MCP helper supports `--output`, `--goal`, `--port` and structured `--data` inputs; safe mode remains on and telemetry remains disabled.

`scripts/render-sah-face.py` renders one view per MCP request. `package_face.py` packages a saved scene in a separate Blender process and verifies reopening it. Local analysis uses MediaPipe, NumPy, SciPy and Pillow. The Blender scripts require Blender's own Python; `bpy` is not expected in the editor's ordinary interpreter.
