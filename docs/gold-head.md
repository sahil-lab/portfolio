# Gold Head Landmark

The portfolio loads the side-reference-refined face as a cast-gold head from `public/assets/sah-gold-head.glb`. The asset has four metallic materials, four meshes, 91,808 triangles and no photographs or textures. Short brow, beard and scalp relief is derived from the source groom.

`app/gold-monument.ts` normalizes the actual head bounds to `bulletinSites.markets.height * 10`: 168.75 local units, or 337.5 units with the world's existing 2x scale. The entire tower and base have been removed. The head now rests directly on the ground, with its width, depth, height and gold material unchanged.

The head is fixed at `(150, 0, -121)`, north of Lantern Quarter. `app/gold-monument-site.ts` retains its reserved city-block center so procedural residences are not generated underneath it. There is no tower, plaza, foundation, plinth, canopy, glazing or facade geometry. Walking collision covers only the grounded head's bounds, and its meshes remain camera-solid. The deleted building contributes no invisible collision geometry.

There is no camera-following placement or overlay render pass. The head belongs to the normal world scene and keeps its position and orientation when the camera moves, the viewport resizes, or the player travels to a planet. Ordinary depth testing allows nearer objects to occlude it, and looking away removes it from view. Fog is disabled on its materials so its silhouette remains readable at distance. It is intentionally not pinned on screen. Disposal also handles late asset loads.

The original skin master remains at `outputs/sah-face/sah_face_master.blend`. The independent gold head asset is `outputs/sah-face/sah_gold_master.blend`; its save/reopen report is `outputs/sah-face/gold-package-status.json`. These assets were not modified when removing the tower. `sah_gold_working.blend` retains the source scenes as well. The face remains a reference-guided approximation, not an exact scan.

Verification:

- `node --test tests/gold-monument.test.cjs tests/city-districts.test.cjs tests/city-expansion.test.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/oxlint/bin/oxlint app/gold-monument.ts app/gold-monument-site.ts app/city-districts.ts app/world.ts`
- `npm exec --yes --package=playwright -- node scripts/check-gold-monument.cjs`

Use Node 22.13+; this Windows machine also has an older Node on its default path. The browser check uses Edge, defaults to `http://localhost:3001/`, and accepts `GOLD_WORLD_URL`. It verifies unchanged head height, ground contact, exactly four head meshes with no building, reserved lot, walking collision, stationary transform through planet travel, gold pixels, normal wall occlusion, looking away, and desktop/mobile views. Current screenshots and results are in `outputs/playtest/gold-head/`; earlier `gold-building/` and `gold-monument/` captures show the removed tower and superseded overlay.

The guarded Blender conversion step is `assets/sah-face/steps/23_gold_monument.py`; do not blindly rerun it in a modified scene. It exports only the active gold scene. `assets/sah-face/package_gold.py` isolates and reopens the gold deliverable in a separate Blender process, preserving the live source scenes.
