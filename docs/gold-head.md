# Suited Figure

The portfolio loads `public/assets/sah-suited-figure.glb`: a normally proportioned gold figure in a coat/jacket and trousers, standing on a compact podium. The web asset is included with the application; personal photographs and Blender working files remain local. The previous gold head asset is preserved.

`app/gold-monument.ts` normalizes the complete figure-and-podium bounds to `bulletinSites.markets.height * 3`: 50.625 local units / 101.25 world units, exactly three bulletin display heights. Scaling is uniform, so head, body and podium proportions are unchanged. The Blender figure is nominally 1.76 m tall on a 0.22 m podium, with a roughly seven-head-tall body. Actual height was not measured.

The figure is fixed at `(150, 0, -121)`, north of Lantern Quarter, with its podium grounded. The reserved city lot, camera collision, normal depth occlusion and late-load disposal remain. There is no tower or camera-following overlay. Metallic tailoring and nonmetallic podium materials retain their exported properties.

The human body starts from MakeHuman's existing CC0 `hm08` body group, not generated human topology. The [source mesh](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) and [graphical-assets license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md) document its provenance. Its 13,380 vertices, 13,378 quads and original UVs are preserved in the editable master, with matching original/fitted connectivity hashes and an untouched source copy. Clothing and podium are separate objects. Subdivision and the covered-skin mask remain unapplied in the master.

The local editable master is `outputs/sah-figure/sah_suited_figure_master.blend`, with save/reopen and topology evidence in `outputs/sah-figure/figure-validation.json`; these working files are not included in Git. The GLB is a triangulated display copy with 24 meshes and 130,772 triangles, no reference photos or source helpers. The likeness is a photo-guided approximation, not an exact scan; unmeasured body depth and the suit style are inferred.

Verification:

- `node --test tests/gold-monument.test.cjs tests/city-districts.test.cjs tests/city-expansion.test.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/oxlint/bin/oxlint app/gold-monument.ts app/gold-monument-site.ts app/city-districts.ts app/world.ts`
- `npm exec --yes --package=playwright -- node scripts/check-gold-monument.cjs`

Use Node 22.13+; this Windows machine also has an older Node on its default path. The browser check uses Edge, defaults to `http://localhost:3001/`, and accepts `GOLD_WORLD_URL`. It checks the complete figure height, required clothing/podium meshes, ground contact, reserved lot, walking collision, fixed position through planet travel, gold pixels, normal wall occlusion and desktop/mobile framing. Current evidence is in `outputs/playtest/suited-figure/`; earlier head/building screenshots are historical.

The figure-authoring scripts remain excluded through `.git/info/exclude`. Existing ignore rules keep personal-photo folders, caches, generated outputs and Blender working files local. Only the reviewed, photograph-free GLB is distributed with the application.
