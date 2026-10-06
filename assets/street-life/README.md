# Street Life

Published under [life-v1](../../public/assets/life-v1/manifest.json) after the
120-view candidate gate.

The home world and all nine planets share daytime butterflies, nighttime bats and fireflies,
independent feeding and perching birds, an easel painter, a violinist and a unicycle juggler.
Existing residents, signature shops, controls and local terrain remain intact.

## Native Sources

- [build-life-kit.py](build-life-kit.py) authors 16 reusable parts in a separate Blender scene and bakes 16-sample Cycles ambient occlusion into vertex colors.
- [life-kit.glb](life-kit.glb) contains 5,144 triangles in 413,076 bytes, with normals, UVs and vertex colors. It has no embedded images, cameras, lights or animation tracks.
- [manifest.json](manifest.json) records the exact exported-file and recipe hashes.
- [street-life-study-20261005.blend](street-life-study-20261005.blend) preserves the new library, fitted review parts and all earlier scenes. Its complete compressed stream was independently decoded: 1,206,288,948 stored bytes, 5,659,677,849 decoded bytes, all 16 part names and the final Blender end block verified.
- [Native parts render](../../outputs/playtest/street-life-native-parts.png) shows the fitted source shapes; the characters and moving assemblies are composed in Three.js.

## Runtime

[life-kit.ts](../../app/life-kit.ts) preloads the kit with a bounded timeout and
procedural fallback. Scene-owned geometry clones follow existing disposal and streaming.
[street-performers.ts](../../app/street-performers.ts) combines the authored parts
with existing resident models, an original landscape painting and procedural movement.
[street-life.ts](../../app/street-life.ts) handles placement, instancing and visibility.

The mainland population is 55 birds; each of the nine planets has 25 birds.
Birds remain distributed across fixed habitats, not attached to the player.
Daylight, distance, weather and graphics quality control how many are drawn;
low quality draws at most 28 mainland birds or 13 planet birds without changing
the underlying population. Each world also has up to eight following daytime butterflies
and 24 night fireflies, halved on low quality. Wet weather reduces visible wildlife.
Fireflies use emissive meshes and soft point
halos without adding lights. Their bodies, glowing tips and halos are 2.5 times
the original size.

The original butterfly group and fireflies follow the observer with independently timed, seeded
waypoints, changing radius, direction and height instead of orbiting in circles.
Butterflies remain active after morning ends, fading with night rather than the
morning-light value. Weather and graphics quality still reduce their visible count.
Fireflies drift more slowly and retain their individual light pulses. The shared
follower stays within three units of its target, supports flight and teleports,
and follows local gravity on every planet. Menus do not hide the insects.

An additional 55 mainland butterflies and 25 per planet occupy scattered habitats
during daylight. They share the existing geometry and fluttering behavior but keep
their own habitat positions and phases, independent of the observer and altitude.
Only nearby groups within 100 local units are updated and drawn.

At night, 55 mainland bats and 25 per planet take over the daytime bird population
ratio, with the same weather and quality reductions. Each follows a seeded,
closed seven-point flight path above a habitat, oriented to local gravity; bats
do not follow the player. Groups farther than 130 local units are skipped.
Eight instanced mesh groups supply fitted life-kit bodies and eyes plus procedural
scalloped membrane wings and pointed ears. Bats add no lights or shadow casters.
The existing Blender library is unchanged. Reduced motion freezes flight and wings;
inactive worlds and daytime bats do not advance their flight clocks.

[street-birds.ts](../../app/street-birds.ts) has no observer target. Birds independently
peck at seed patches, drink from pools, fly between locations and perch on real
objects. Sparrows, robins, bluebirds and pigeons have distinct plumage, breast
patches and proportions; open wingspans are about 1.2 to 1.4 times a butterfly's width.
Up to 18 safe habitat areas replace the original three. Exclusive landing
reservations prevent shared landing spots. Perches and pool coping are ray-checked
for foot support; dipping beaks reach the actual water surface. Curved arcs,
weaves and swoops vary their bends, heights and speeds on each flight.
Resting wings fold beside the body.

Each world has one painter, violinist and juggler. Terrain-aware reservations keep
approaches clear and protect the complete moving unicycle footprint. The player,
roaming population and shuttles respect those reservations. Planets use local gravity.
Reduced motion freezes these new animations; inactive worlds do not accumulate motion time.

## Verification

The October 6 habitat addition passed all 21 street-life tests, TypeScript, scoped
runtime lint and the [production build](../../outputs/playtest/oct6-habitat-wildlife-build.log).
Tests cover the 55/25 ratios, independent habitats, retained followers and fireflies,
quality/distance limits, mirrored wings, reduced motion, inactive clocks and bat
flight clearance on all nine actual planet builders. The
[browser review](../../outputs/playtest/oct6-habitat-wildlife-checks.json) passed eight
mainland/Copper desktop/mobile views with visible geometry, motion, day/night
switching and matching source fingerprints. No hosted deployment or FPS improvement
is claimed by these checks.

The earlier October 6 bird population update passed 18 feature tests, TypeScript and scoped
runtime lint. Tests require exactly 55 mainland birds and 25 birds in all nine
actual planet builders, alongside compact size, four species, drinking contacts,
exclusive landings and varied flights. The
[final production build](../../outputs/playtest/bird-populations-build.log) passed.

The [live census](../../outputs/playtest/bird-populations-final-checks.json) confirms
55 mainland birds and 25 on every planet, with four species, correctly sized
instance capacity, nonblank scenes and no captured browser errors in all ten worlds.

The preceding [32-view flock review](../../outputs/playtest/bird-flocks-final-checks.json)
verified each species and feeding, perching, drinking and flying on desktop/mobile
at home and Copper. It predates the final 55/25 counts and is preserved unchanged.

### Earlier Behavior Review

The preceding October 5 behavior follow-up passed 48 targeted tests, TypeScript and scoped
runtime lint. The [production build](../../outputs/playtest/wildlife-behavior-build.log)
passed with the existing externalization and large-chunk warnings.

- [LED review](../../outputs/playtest/wildlife-led-final-checks.json): eight day/night, desktop/mobile, balanced/low views; bright colored emission and unobstructed glyphs.
- [Insect-follow review](../../outputs/playtest/wildlife-random-follow-final-checks.json): eight home/Copper views plus eight normal-camera captures; visible insects follow the player in the running world loop.
- [Independent-bird review](../../outputs/playtest/wildlife-independent-birds-final-checks.json): twelve home/Copper desktop/mobile views covering feeding, flight and supported perching.

All three reports had no captured browser errors and matching source fingerprints
at that milestone. Their earlier source hashes remain unchanged as history.
The existing Blender kit and native study were not overwritten or rebaked.
Raised shop and workshop lettering now uses rounded, self-lit pink LED materials;
colored emission stays above the bloom threshold at night and remains readable
without postprocessing on low quality.

### Initial Asset Review

These earlier reports verify the original asset rollout, not the current movement
or LED behavior; their source fingerprints are retained unchanged as history.

The [candidate report](../../outputs/playtest/street-life-candidate-checks.json)
passed 120 views across all ten worlds, with no captured browser errors, all review
cameras unobstructed and all 13 source fingerprints unchanged. The
[desktop](../../outputs/playtest/street-life-candidate-desktop-sheet.jpg) and
[mobile](../../outputs/playtest/street-life-candidate-mobile-sheet.jpg) contact sheets
show the complete review. The published GLB matches the reviewed hash.

The [normal-loader review](../../outputs/playtest/street-life-live-checks.json)
passes 24 home/Copper desktop/mobile views without candidate routes, and the
413,076 served bytes match the published SHA-256. The
[mobile recovery check](../../outputs/playtest/street-life-recovery/balanced-mobile.json)
passes repeated camera changes and one deliberate WebGL reset, preserving the
document, scene, canvas and player position with a nonblank restored frame.
Both reports have no captured browser errors.

At the initial rollout, ten feature tests and TypeScript passed. The
[initial production build](../../outputs/playtest/street-life-build.log) passed with existing
externalization and large-chunk warnings. The
[full regression run](../../outputs/playtest/street-life-regression.log) has 593 passes
and one failure: the unrelated rocket-porthole visibility assertion in
[transit-motion.test.cjs](../../tests/transit-motion.test.cjs#L145), which reproduces
on its own. Vehicle code was not changed for this feature.

[street-life.test.cjs](../../tests/street-life.test.cjs) covers actual kit geometry,
day/night budgets, local morning, mirrored wings, eye instances, continuous juggling,
wheel contact, reduced motion and all nine real planet builders with population clearance.
[check-street-life.cjs](../../scripts/check-street-life.cjs) reviews six subjects on
desktop and mobile across ten worlds, including visible-pixel, movement and lifecycle checks.
Run it with `--study` for the staged kit; omit that flag to verify normal loading.
Use `--follow` for the player-following insects, `--birds` for independent bird
states, `--flocks` for all species and behaviors, `--census` for exact populations,
and `--neon` for LED lettering. `--probe` limits visual coverage to home and Copper.
[finalize-life.cjs](finalize-life.cjs) validates the export; `--publish` additionally
requires a successful 120-view candidate report, unchanged source fingerprints and the new native save.

The bake is vertex ambient occlusion, not full indirect illumination. Direct lighting,
shadows and animation remain live Three.js systems. Violin performance is visual only.
Desktop/mobile viewport checks do not certify physical-phone frame rates.
