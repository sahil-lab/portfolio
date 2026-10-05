# Suited Figure

The portfolio loads [public/assets/hero-v1/monument.glb](../public/assets/hero-v1/monument.glb): a normally proportioned gold figure in a coat/jacket and trousers, standing on a compact podium. The original [suited figure](../public/assets/sah-suited-figure.glb) remains as a fallback. Personal photographs and Blender working files remain local; the previous gold head asset is also preserved.

[app/gold-monument.ts](../app/gold-monument.ts) normalizes the complete figure-and-podium bounds to `referenceModelHeight * 3`: 50.625 local units / 101.25 world units. The reference height remains 16.875 independently of the smaller current bulletin displays; the monument is now five actual display heights, without having changed size. Scaling is uniform, so head, body and podium proportions are unchanged. The Blender figure is nominally 1.76 m tall on a 0.22 m podium, with a roughly seven-head-tall body. Actual height was not measured.

The figure is fixed at `(150, 0, -121)`, north of Lantern Quarter, with its podium grounded. The reserved city lot, camera collision, normal depth occlusion and late-load disposal remain. There is no tower or camera-following overlay. Metallic tailoring and nonmetallic podium materials retain their exported properties.

The human body starts from MakeHuman's existing CC0 `hm08` body group, not generated human topology. The [source mesh](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) and [graphical-assets license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md) document its provenance. Its 13,380 vertices, 13,378 quads and original UVs are preserved in the editable master, with matching original/fitted connectivity hashes and an untouched source copy. Clothing and podium are separate objects. Subdivision and the covered-skin mask remain unapplied in the master.

The original [editable master](../outputs/sah-figure/sah_suited_figure_master.blend) and its [topology evidence](../outputs/sah-figure/figure-validation.json) remain unchanged and local. The original GLB has 24 meshes and 130,772 triangles. The refined display copy has 25 meshes, 131,300 triangles and four embedded surface maps, with no reference photos or source helpers. The likeness is a photo-guided approximation, not an exact scan; unmeasured body depth and the suit style are inferred.

The [collectible study](../assets/hero-candidates/monument-study-20261003.blend) preserves the refined lapels/collars, surface-fitted pin, differentiated metal/stone finishes and four packed maps. Its [recipe and review notes](../assets/hero-candidates/README.md) include matched renders and the rejected hidden-pin draft. Both standalone and shared world loaders retain fallback and late-disposal behavior; scene metadata reports the asset actually loaded.

Verification:

- `node --test tests/gold-monument.test.cjs tests/city-districts.test.cjs tests/city-expansion.test.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/oxlint/bin/oxlint app/gold-monument.ts app/gold-monument-site.ts app/city-districts.ts app/world.ts`
- `npm exec --yes --package=playwright -- node scripts/check-gold-monument.cjs`

Use Node 22.13+; this Windows machine also has an older Node on its default path. The browser check uses Edge and accepts `GOLD_WORLD_URL`, `GOLD_OUTPUT`, `GOLD_CANDIDATE` and `GOLD_EXPECTED_ASSET`. The local preview is `http://localhost:4332/`; its legacy default remains port 3001. It checks complete figure height, required clothing/podium meshes, ground contact, reserved lot, walking collision, fixed position through planetary observation, gold pixels, wall occlusion and desktop/mobile framing.

Current [live evidence](../outputs/playtest/monument-collectible-live/checks.json) uses the published asset without candidate routes: three captures and no browser errors. Nineteen portrait/asset-loading tests, TypeScript, scoped runtime lint and the production build passed. Tests include original/candidate/published geometry, visible pin attachment, actual material/collision flags, fallback and disposal. Earlier head/building and original suited-figure screenshots are historical; these checks do not establish physical-device performance gains.

The figure-authoring scripts remain excluded through `.git/info/exclude`. Existing ignore rules keep personal-photo folders, caches, generated outputs and Blender working files local. Only the reviewed, photograph-free GLB is distributed with the application.
