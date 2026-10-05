# Art asset handoff

The Packet Press was the first Blender-authored hero prop. Shared Blender libraries now supply character parts, planting, paving, architecture and baked planetary terrain. World assembly, live content and gameplay remain in Three.js. This is not live Cycles rendering in the browser or a claim that every custom mesh has been replaced.

## Street Life

The home world and all nine planets now include morning butterflies, night fireflies,
independent birds, a painter, a violinist and a unicycle juggler. The
[published life kit](../public/assets/life-v1/manifest.json) contains 16 Blender-authored,
vertex-AO-baked parts: 5,144 triangles and 413,076 bytes, with no embedded images.
The [street-life handoff](../assets/street-life/README.md) records the editable native
study, density limits, source recipes and verification.

Butterflies and fireflies follow the observer using independently timed random
waypoints rather than circular orbits. Fireflies have 2.5-times-larger bodies,
glowing tips and halos, with slower drifting and retained light pulses. Birds do
not follow: 55 on the mainland and 25 on each planet occupy distributed habitats,
peck at seeds, drink from pools and perch on ray-verified surfaces. Sparrows,
robins, bluebirds and pigeons have distinct plumage and compact proportions, with
open wingspans about 1.2 to 1.4 times a butterfly's width. Their flight paths vary
between arcs, weaves and swoops. These behaviors retain each planet's local gravity.

The final count update passed 18 feature tests, TypeScript, scoped lint and the
[production build](../outputs/playtest/bird-populations-build.log). Tests require
exactly 55 mainland birds and 25 on all nine actual planet builders. The earlier
[32-view flock review](../outputs/playtest/bird-flocks-final-checks.json) verified
all four species and feeding, perching, drinking and flight at desktop/mobile sizes;
that report predates the final population counts and is preserved unchanged.

The final [live census](../outputs/playtest/bird-populations-final-checks.json)
confirms the 55/25 populations, all four species and nonblank scenes across all
ten worlds, with no captured browser errors.

Wildlife is instanced; low quality and wet weather reduce density.
Fireflies add no lights. Performer reservations preserve public approaches and are
respected by the player, residents and shuttles. Reduced motion freezes the new
animations, and inactive worlds do not accumulate motion time. Direct lighting and
animation remain live Three.js systems; violin performance is visual only.

Raised shop and workshop names now have rounded, self-lit pink LED materials with
nighttime color preservation and bloom, while remaining readable on low quality.
The preceding follow-up passed 48 targeted tests, TypeScript, scoped runtime lint and the
[production build](../outputs/playtest/wildlife-behavior-build.log).
[LED checks](../outputs/playtest/wildlife-led-final-checks.json),
[insect following](../outputs/playtest/wildlife-random-follow-final-checks.json) and
[bird behavior](../outputs/playtest/wildlife-independent-birds-final-checks.json)
cover 28 desktop/mobile review views and eight further normal-camera captures,
with no captured browser errors and matching source fingerprints at that milestone.
Those reports predate the expanded flock and remain unchanged as history.

The earlier [candidate review](../outputs/playtest/street-life-candidate-checks.json) passed
120 desktop/mobile views across all ten worlds with unchanged source hashes and no
captured browser errors. At that rollout, ten feature tests, TypeScript and the production build passed.
That full-suite run had 593 passes and one independently reproduced rocket-porthole
test failure outside this feature. The
[normal-loader review](../outputs/playtest/street-life-live-checks.json) passed
24 further home/Copper views, and the
[mobile recovery check](../outputs/playtest/street-life-recovery/balanced-mobile.json)
restored the same scene, canvas and player position after a deliberate WebGL reset.
Those earlier reports are retained as history; the shared Blender asset is unchanged.
The published asset hash matches the bytes served over HTTP. No hosted deployment
or physical-phone performance certification was performed.

## Refined Signature Shops

The final October 5 collection is integrated under
[signature-v2](../public/assets/signature-v2/manifest.json). All nine non-Copper
shops have more substantial themed roofs and facades, fitted architectural joins,
tailored awnings, deeper displays, individual merchandise and fresh 2048-square
contact bakes. Copper Crumb's native design remains the reference and is preserved.
All ten shops are three times larger, including their complete assemblies,
collision bounds and rooftop models; plots, cameras and approaches follow.

Raised 3D names replace the flat shop panels. Bootloader Workshop and its nearby
wing names use the same treatment on existing building surfaces, with no extra
white fascia or canvas plaque. The local font retains its
[license](../assets/fonts/LICENSE).

The placement audit corrected the buried roadside sign, lamps and planting in
the graded road shoulders, twelve tree canopies reaching building lots, and city
lawn strips showing through public plazas. All 944 city street trees are retained.
Checks include actual shop-to-fixture geometry bounds, city canopy/public-plot
clearance and public-place/planting/road/river clearance on all nine planets.
Intentional model joints are retained; this is not an exhaustive proof that every
triangle in the complete world is disjoint.

The [signature handoff](../assets/signature-candidates/README.md) links the
[editable native study](../assets/signature-candidates/signature-atelier-study-20261005.blend),
[final contact sheet](../outputs/playtest/signature-atelier-contact-sheet.jpg),
[52-view candidate review](../outputs/playtest/signature-atelier-candidate-checks.json),
[52-view published-model review](../outputs/playtest/signature-atelier-live-checks.json)
and [15-view workshop review](../outputs/playtest/workshop-facade-live-checks.json).
All 588 tests, TypeScript, scoped runtime lint, the plain production build and
mobile-sized WebGL recovery pass. The native save contains 521 packed images and
was fully decoded for integrity verification. No commit, push or deployment was
performed; existing unrelated lint and build warnings remain documented.

## World Detail Library

The October 5 pass integrates the selected seven families: trees, terrain,
furniture, vehicles, signs, public venues and custom landmarks. The
[world-detail handoff](../assets/world-candidates/README.md) records their models,
source recipes, retained behaviors and verification. Earlier signature shops,
hero models, artwork and complete-world exports are preserved.

The new [craft manifest](../public/assets/world-v1/craft-manifest.json) covers 28
Blender profiles, 9,870 triangles and 661,856 bytes. The app fits these profiles
inside its existing factories and keeps the live text, collisions, interactions,
vehicle bindings and animation. Final close-up corrections include the rocket
window, fountain inlays and the clock's twelve markers, connected hands and hub.

The [editable study](../assets/world-candidates/world-details-study-20261005-r3.blend)
contains the craft library and its review scene alongside the previous native
scenes, with 512 packed images. Its complete compressed stream was verified.
The [native overview](../assets/world-candidates/craft-library-final.png) shows
normalized templates; the [runtime contact sheet](../outputs/playtest/craft-candidate-final-contact-sheet.jpg)
shows their assembled proportions and materials. The retained complete assembly
is an archive, not a refreshed export of the final runtime world.

At that milestone, 571 tests, TypeScript, scoped runtime lint and the plain production build passed.
The [candidate review](../outputs/playtest/craft-candidate-final-checks.json) passed
120 desktop/mobile captures, including all nine planets and 52 craft close-ups,
with no captured browser errors and matching source hashes. The
[normal-loader review](../outputs/playtest/craft-live-final-checks.json) passed
46 further captures without candidate redirects. The
[mobile recovery check](../outputs/playtest/camera-lifecycle/balanced-mobile.json)
restored the same scene and canvas after a deliberate WebGL reset.
No commit, push, hosted
deployment, literal every-mesh replacement or physical-phone FPS claim is implied.

## Premium Shared-Asset Pass

All signature shops now have authored models. The nine additional shop designs,
their equipment and merchandise, contact bakes, rejected drafts and verification
are documented in the [signature shop handoff](../assets/signature-candidates/README.md).
The [live shop tour](../outputs/playtest/signature-live-final-checks.json) passed
52 views; the nearby regression suite passed 39 tests. Subsequent family work is
recorded in the scope ledger and the world-detail handoff above.

The subsequent bespoke collectible pass now includes the Packet Press and Copper
Bakery. Their [Press manifest](../public/assets/collectible-v1/manifest.json),
[bakery manifest](../public/assets/collectible-v1/bakery-manifest.json) and
[editable study handoff](../assets/premium-candidates/README.md) document the native
models, packed sources and original-asset fallbacks. The final nearby regression
suite passed 36 tests, and the [live tour](../outputs/playtest/collectibles-final-checks.json)
passed 34 desktop/mobile views across all ten shop destinations. The world loop
also now forwards the selected weather into planetary lighting and clears local
atmosphere for orbital views. TypeScript and the production build passed; lint
still flags an untouched `prefer-const` declaration in the world module.
Later hero-model work is recorded in the current scope ledger.

The reviewed October 3 shared-asset study is integrated under
[premium-v1/manifest.json](../public/assets/premium-v1/manifest.json). It adds a
smoother dome and facial details, softer character body parts and small planting,
plus Blender-baked color, roughness and normal maps across four surface families.
The 14 versioned files total 3,245,320 bytes. Original assets remain available as
fallbacks and were not overwritten.

The high-detail sphere is used only for facial features; repeated background
objects keep the low-detail sphere. Original roof geometry was retained after the
beveled experiment showed wavy highlights. Existing artwork, character identities,
animation, collision, world-space paving and live displays are preserved.

This is a shared-family improvement, not a completed hand-remodel of every unique
object. Per-family completion, retained shapes and runtime-only systems are
listed in [scope.json](../assets/premium-candidates/scope.json). The editable
source and review history are in the
[study handoff](../assets/premium-candidates/README.md).

Validation: 533 tests passed, TypeScript and scoped lint passed, all 46 desktop/mobile
views passed across nine planets, the same scene/canvas recovered from a deliberate
WebGL reset, and the plain production build passed. Reports:
[premium-shared-regression.xml](../outputs/premium-shared-regression.xml) and
[premium-shared-final-checks.json](../outputs/playtest/premium-shared-final-checks.json).
No visual-quality multiplier, physical-phone FPS or hosted deployment is claimed.

## Blender Return To React

The October 3, 2026 pass returns actual assets from the finished Blender scene to
the running website. This is separate from the earlier complete-scene export.

- All nine planets now prefer scene-finished GLBs under `public/assets/planets/blender-final/`. Each contains both original terrain LODs and an embedded 2048-by-1024 Cycles AO bake using the surrounding static buildings, planting and roads. Moving residents and vehicles are excluded from the bake.
- The home world uses a 1024-by-2048 Blender-baked contact layer. It loads asynchronously, waits for shader preparation, adds no collision geometry and is released with the scene.
- Ceramic, stone, timber and brushed-metal materials use four 512-square tangent-space normal maps baked in Blender. World-space paving retains its triplanar relief mapping. Existing palettes, character animation, live displays and material behavior remain intact.
- Both Blender kits preload before world construction. Terrain streaming actually attaches the returned full/distant meshes, with the original terrain as fallback on loading failure.
- Static batching separates incompatible vertex layouts and normal-map finishes. Shared tree-court planting is present at all 944 city street-tree positions without changing walking-route clearance.

The runtime asset set is 21,693,097 bytes across all worlds; planet files stream on
demand rather than downloading the complete assembly at startup. The standalone
AO inspection PNGs are authoring references and are not fetched by the website.
[manifest.json](../public/assets/world-finish/manifest.json) records exact hashes,
dimensions, bake settings, occluder counts and runtime strengths.

The editable bake source is
[world-return.blend](../assets/world-return/world-return.blend), with the recipe in
[bake-scene-finish.py](../assets/world-return/bake-scene-finish.py#L1).
[finalize-blender-return.cjs](../scripts/finalize-blender-return.cjs#L1) verifies the
returned files and regenerates the asset manifest. The previous complete Blender
export and portable ZIP are unchanged.

### Return Verification

- All 530 repository tests pass; TypeScript and scoped rendering-module lint pass.
- All terrain vertices remain within 0.0002 units of the walking authority. Both LODs use matching spherical UVs and the correct occlusion texture channel.
- The full browser tour passed 46 desktop/mobile captures across home locations and all nine planets. A further 14-view check passed after the final tree-court correction, including first-person motion and night mode.
- A mobile-sized Balanced WebGL context-loss test restored the same scene and canvas with no captured errors. This is browser emulation, not physical-phone FPS certification.
- The plain Vinext production build passes. No commit, push or hosted deployment was performed.

Reports: [blender-return-regression.xml](../outputs/blender-return-regression.xml),
[full tour](../outputs/playtest/blender-return-final-checks.json),
[final follow-up](../outputs/playtest/blender-return-complete-checks.json) and
[context recovery](../outputs/playtest/camera-lifecycle/balanced-mobile.json).

This returns scene-aware occlusion, geometry and surface detail, not the Cycles
renderer or full indirect-light baking. The multi-gigabyte static assembly is not
loaded into React. Direct lighting, shadows, weather, movement, interactions and
postprocessing remain live Three.js systems.

## Architecture And Planets

The follow-up pass extends authored assets through buildings, compatible landmarks, stations and all nine spherical planets while preserving their layout, controls and terrain authority.

### Architecture Library

- [architecture-kit.blend](../assets/architecture/architecture-kit.blend) contains the separate `Kingdom Architecture Studio`.
- Run [01-author-architecture.py](../assets/architecture/01-author-architecture.py#L1), [02-bake-export.py](../assets/architecture/02-bake-export.py#L1) and [03-bake-surfaces.py](../assets/architecture/03-bake-surfaces.py#L1) in order in Blender for a fresh library. Configure their project paths for the checkout; stage guards prevent overwriting an existing studio.
- [architecture-kit.glb](../public/assets/architecture-kit.glb) contains 14 templates: structural blocks, roof profiles, domes, low/high-detail cylinders, spheres and rings. Vertex AO is exported in the primary color channel with source metadata.
- Four 512-square data textures provide ceramic, stone, timber and brushed-metal relief/roughness. They are not cyan albedo images.

[architecture-kit.ts](../app/architecture-kit.ts#L1) fits the parts to existing dimensions, retaining the ten architecture families, individual building recipes, facades and colors. The pavilion has its own cosine vault profile; large round fixtures use a higher-resolution cylinder; rings preserve open centers and orientation. Shared material attributes are completed before batching. Canonical instanced blocks remain unbeveled so their transforms cannot stretch corner radii.

This is a modular conversion, not thousands of individually hand-modeled buildings. Partial arcs, open pipes, skinned geometry, textured display geometry and incompatible custom shapes remain intact. Shared material factories give compatible custom objects Blender-baked finishes without changing the geometry or animation they need. Live lettering, screens, radio/news, water, sky/weather and interaction logic remain runtime systems.

### Planet Terrain

[export-planet-sources.cjs](../scripts/export-planet-sources.cjs#L1) exports full/distant meshes directly from the current geography functions. [bake-planets.py](../assets/planets/bake-planets.py#L1) imports them into Blender, bakes each LOD with the other LOD hidden, and exports per-planet GLBs. The editable source is [planet-library.blend](../assets/planets/planet-library.blend).

All 18 exported terrain meshes preserve `planetPoint`: the measured maximum round-trip vertex error was below 0.000015 world units. Colors, rivers, roads, landing caps, walking heights and local gravity remain compatible. The exported terrain totals 8,428,996 bytes and streams per planet, not all at startup. Re-export/rebake when the geography authority changes; tests deliberately detect stale geometry.

[authored-terrain.ts](../app/authored-terrain.ts#L1) checks planet identity, radius and detail metadata. The existing streamer controls timeout, cancellation, procedural fallback, shader preparation and unload disposal. The home motherboard is not spherical: its board sections use authored structural templates while preserving the lower-work and abyss openings.

The original `Scene`, `Copper Crumb Studio` and `Kingdom Shared Asset Studio` are retained. These bakes are AO and surface detail, not full GI. The browser still uses its existing HDR lighting, shadows and postprocessing. Saved Cycles renders provide the offline preview; Blender viewport capture remained unavailable in this session.

### Architecture Verification

[architecture-kit.test.cjs](../tests/architecture-kit.test.cjs#L1) loads both authored libraries and checks bounds, recipes, facade parts, open rings/pipes, instancing, material maps, pavilion access and city merging. [authored-terrain.test.cjs](../tests/authored-terrain.test.cjs#L1) checks every exported terrain vertex, both LODs, mismatched metadata, failure fallback, cancellation and unload disposal.

The visual checker accepts `--world-kit --architecture` to assert real asset use and capture desktop/mobile surface and orbital views. `--probe` limits the planet portion to Forge. Earlier inventory coverage percentages are a pre-conversion snapshot and have not been recomputed. No deployment or physical-phone performance claim is implied.

Final verification: 515 regression tests passed and 46 desktop/mobile captures passed, including 18 orbital views, all nine authored planet terrains, first-person movement and night. Reports: [architecture-planets-regression.xml](../outputs/architecture-planets-regression.xml) and [architecture-planets-final-checks.json](../outputs/playtest/architecture-planets-final-checks.json). The final architecture GLB is 71,828 bytes. The generated reports and screenshots are local artifacts; no commit, push or deployment was performed.

## Shared World Kit

The October 2026 shared-kit pass covers roads/paving, characters and planting across the existing worlds. It uses original Blender-authored geometry and real Cycles ambient-occlusion bakes, not live Cycles rendering in the browser.

- [world-kit.blend](../assets/world-kit/world-kit.blend) is the editable `Kingdom Shared Asset Studio`. The original `Scene` and `Copper Crumb Studio` are preserved.
- Run [01-author-kit.py](../assets/world-kit/01-author-kit.py#L1), [02-compose-kit.py](../assets/world-kit/02-compose-kit.py#L1), [03-bake-kit.py](../assets/world-kit/03-bake-kit.py#L1) and [04-export-kit.py](../assets/world-kit/04-export-kit.py#L1) in order in Blender to create a fresh kit. Stage guards prevent accidental overwrites. These scripts require Blender's Python modules, not an ordinary standalone interpreter.
- [kingdom-world-kit.glb](../public/assets/kingdom-world-kit.glb) has 21 reusable meshes, 20,462 triangles and no studio lights/cameras. The verified export is 542,596 bytes.
- [world-paving-relief.png](../public/assets/world-paving-relief.png) and [world-asphalt-relief.png](../public/assets/world-asphalt-relief.png) are 512-square data textures: red is relief height and green is roughness.

[world-kit.ts](../app/world-kit.ts#L1) loads the kit before world construction, with a bounded network timeout and the procedural models as fallback. Factories receive independent geometry clones and normalized color/UV attributes. Neutral AO supports character recoloring; tree colors preserve the baked shading. Shared CPU templates are retained for scene recreation, while scene-owned clones follow the existing disposal mechanism.

Courier, human residents, PIP and the named encounter characters use authored main body shapes without replacing their animation, inventory, gestures, eyes, clothing or interactions. The existing imported dog, angel and monument remain intact. Small accessories and some special details remain procedural.

Trees and banyans retain their physical trunk/root metadata, local gravity, wind, instancing and distance-based detail. The tree is 4,560 triangles at full detail and 1,008 at distance; the banyan is 10,450 and 2,336. Garden shrubs, blossoms and Commons planting use authored shapes. Planet colors retain baked occlusion. Lawn surfaces still follow existing terrain geometry.

[paving-material.ts](../app/paving-material.ts#L1) maps Blender-baked stone and asphalt detail at world scale, including instanced and merged roads. It does not displace walking surfaces or add one physical object per paving stone. Road markings, curvature, height queries and collision behavior remain unchanged. Beveled paver modules remain in the editable kit as bake/authoring sources.

Shared batching now includes attribute layout and vertex-color state. Resident instancing includes authored part identity, preventing a hand from being instanced with head geometry.

### Kit Verification

[world-kit.test.cjs](../tests/world-kit.test.cjs#L1) checks the actual GLB's baked colors, budgets, independent geometry clones, character poses/bounds, instance identity, city merge compatibility, paving shader hooks and all-nine-satellite planting clearance. The existing fallback tests remain intact.

The visual checker supports `--world-kit`, and `--probe` limits it to the home world plus Forge. It asserts real loaded-kit use, both paving finishes, planting, desktop/mobile layouts, first-person movement and night rendering. It rejects build-error overlays and shader/page errors. Local preview: <http://localhost:4332/>.

Final local verification: 503 regression tests passed, TypeScript and scoped runtime lint passed, and all 28 final visual captures passed with no browser errors or build overlay. Reports are [world-kit-regression.xml](../outputs/world-kit-regression.xml) and [world-kit-final-checks.json](../outputs/playtest/world-kit-final-checks.json). These are local generated artifacts. No commit, push, production deployment or physical-phone performance claim is included.

This is an AO bake, not full indirect-light/GI baking. Studio and app lighting differ. Screenshot checks are not physical-phone FPS certification. Blender's viewport/window capture returned black during this session, so saved Cycles renders were used for visual inspection; no working viewport-capture claim is made.

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
