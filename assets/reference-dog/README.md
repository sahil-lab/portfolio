# Reference Dog

An artist-authored, semi-realistic reconstruction of **one dog from eight photographs**. The supplied images are not a calibrated scan: hidden side-profile anatomy, the neutral standing stance and physical scale are inferred. Likeness remains an artistic approximation, not a verified exact replica.

The portfolio application is unchanged. This asset and its viewer are separate from the game.

## Deliverables

Generated files are in `outputs/reference-dog/`:

- `reference-dog.glb`: self-contained, Y-up, meter-scale, neutral standing pose; no studio, cameras or reference photographs inside the GLB.
- `reference-dog.blend`: editable anatomy, face and groom collections; packed materials and all eight reference images; studio lights and an orbiting camera.
- `previews/`: front, rear, side, overhead, three-quarter and facial-detail PNGs, contact sheet and viewer screenshot.
- `reference-dog-turntable.mp4` and `.gif`: five-second rotation of the actual exported GLB.
- `textures/`: extracted UV detail and strand-atlas images for editing.
- `glb-validation.json`, `blender-validation.json`: specification, UV and body-topology checks, reference provenance and artifact fingerprints.

## Reference Fusion

Photo timestamps identify the original files in `picsFOR3dModler/`:

| Photo | Information Used |
| --- | --- |
| 06_07_31 | Rear coat, brown rump and tail root, white hind-leg feathering. The held tail is not copied as the neutral pose. |
| 06_07_36 | Frontal identity, narrow white blaze, dark eye surrounds, short muzzle and brown ears. |
| 06_07_40 | Nose silhouette, broad moustache, parted beard and white chest volume. |
| 06_07_44 | Compact standing torso, brown saddle, lighter wisps, over-back curl and white tail plume. |
| 06_07_48 | Chest and white front-leg feathering; the raised-paw pose is not reproduced. |
| 06_07_52 | Oblique facial proportions, brow and ear curtain, small coat asymmetries. |
| 06_07_56 | White belly and inner limbs, short-leg proportions. |
| 06_08_00 | Corroborating underside and leg-coat coverage. |

## Editing

The Blender file has a connected, quad-dominant body cage. Eyes, nose, ears, muzzle and tail are independently named. The GLB is conventionally triangulated. Fur is organized by region into UV-mapped alpha-cutout locks and closed polygon fibers; these are ordinary editable meshes, not particle hair or a simulated groom.

Coat regions use vertex colors with an embedded detail texture. Edit the color attribute in Blender's vertex-paint tools, or change `coatColor()` in `model.mjs` and rebuild. Hair cards intentionally reuse their strand atlas. The model is not rigged or automatically game-optimized; the detailed version is intended for inspection and further art work.

The `REFERENCES / Eight Views` collection is hidden by default. Enable it to inspect the packed reference images. Scene text blocks explain which photograph informed each feature. Studio and references are excluded from the delivered GLB.

## Rebuild

Requires Node 24, the repository's installed Three.js dependency, Playwright with Edge, Blender, and Python with Pillow and imageio-ffmpeg for the video. Khronos gltf-validator is used by the separate validation script.

```powershell
node --test tests/reference-dog.test.mjs
node scripts/render-reference-dog.cjs
node scripts/verify-reference-dog.cjs
blender --background --factory-startup --python-exit-code 1 --python assets/reference-dog/prepare_blend.py -- --render
node scripts/render-reference-dog.cjs --reuse --turntable
python assets/reference-dog/finish_previews.py
node assets/reference-dog/serve.cjs
```

For the Microsoft Store Blender installation, use its `blender-launcher.exe` execution alias with `Start-Process -Wait`; directly launching the protected WindowsApps binary can fail with access denied. Inspect `blender-status.json` for completion or a Python error because that launcher does not relay Blender's console output.

The viewer runs at `http://127.0.0.1:4318/`. The GLB remains editable in Blender without the viewer or the generator.
