# Kingdom visual direction

## Material and spatial language

The kingdom combines pearl ceramic, jade substrate, satin brass, cool glazing,
and selective coral accents. District colors remain recognizable. Warm signals
and fine inlays provide detail without turning every surface into a light source.
The original mural, models, signs, portfolio content, and gameplay remain in use.

| Surface | Owner |
| --- | --- |
| Rounded edges, shared deterministic grain, ceramic and metal finishes | `app/crafted-surfaces.ts` |
| District engraving, boulevard signals, edge contacts, common material finishing | `app/kingdom-art.ts` |
| Open atrium ribs and large district silhouettes | `app/awe-world.ts` |
| Weather-driven sky vault, light, instanced clouds, sun and moon | `app/weather-sky.ts` |
| Bounded highlight bloom, output antialiasing, quality switching, render-target cleanup | `app/kingdom-presentation.ts` |
| Storefront hardware, glazing, planting, responsive arrival camera | `app/creative-plaza.ts` |
| Instanced home trim, entrance lights, roof panels, waterways | `app/planet-infrastructure.ts` |
| Matching vehicle finishes, window surrounds, running lights | `app/transit-models.ts` |
| HUD, district atlas, dispatch, typography, responsive tools | `app/kingdom-ui.css` |

Preserve thin real edge radii instead of increasing subdivision on every repeated
primitive. Shared materials keep independent mutable instances for animated
machines. Static batching distinguishes clearcoat, reflection strength, and
surface textures, so visually different finishes cannot silently collapse.

Ground inlays do not create collision obstacles. New planted beds occupy clear
lots and participate in collision checks. The small-screen Commons arrival has a
tested sight line past the radio to the kettle storefront. The open atrium no
longer imposes the previous solid ceiling on orbital camera movement.

## Optimized Diorama Finish, 10 October 2026

The supplied reference calls for richer midtones, rounded edge highlights,
distinct paint/trim/metal response and subtle contact depth. Its screenshots have
different framing and browser chrome, so the quoted luminance/saturation values
are directional guides, not directly comparable measurements or a percentage
match target.

The shared finish applies to the mainland and streamed planets without new
lights, postprocessing passes, larger render targets, extra texture downloads or
a LUT lookup. The existing memory-cleanup, input and panel-recovery work remains
in place. The only change to the world controller in this visual pass is exposure.

- Fitted premium blocks preserve their Blender-authored normals. The previous
  fitter recomputed them, discarding the authored edge shading. A real-asset test
  verifies identical normals, dimensions, vertex count and triangle count after
  fitting. Legacy fallback normals retain their existing path.
- Medium trims now use the existing bevel treatment down to 0.14 units of
  thickness instead of 0.22. Tiny rails/traces and very large foundations remain
  simple. The 108-triangle primitive cap is unchanged.
- Generic facade window surrounds use two-segment bevels with bounded width and
  the original 0.12-unit depth. Their openings remain clear. A 64-entry LRU cache
  avoids rebuilding repeated shape profiles while returning independently owned
  geometry. Indexed facade batching avoids expanding every box into separate
  triangle vertices; per-building draw-group and triangle budgets still pass.
  A follow-up indexes the cached bevel profiles by exact Float32 attribute bits,
  retaining normal and UV seams. The tested chamfer, arch and square profiles
  use 15360, 26448 and 7232 bytes instead of 18432, 29952 and 9216 bytes. Their
  expanded positions, normals and UVs remain byte-identical. This is a 12-22%
  profile-storage saving, not the same percentage of the entire scene.
- The workshop's custom window surrounds already had two-segment bevels and are
  retained. Existing native body, machine and shop profiles are not subdivided
  indiscriminately.
- Authored vertex-AO materials no longer fall into the vegetation finish bucket
  solely because they use vertex colors. Their distinct environment responses
  survive finishing; explicitly natural materials keep the natural response.
- Shared ceramic paint is rougher with a lighter clearcoat. Building walls use
  roughness 0.68, trim 0.60 with stronger clearcoat, rails 0.42, metal 0.36 and
  timber 0.74. Existing glazing, roughness/normal maps, color identities and
  independent animated materials remain in use.
- Exposure is 0.95 instead of 1.08, approximately 12% lower. The existing Neutral
  tone curve keeps its highlight roll-off; saturation is 1.08, vibrance 0.34 and
  the faint warm black floor is slightly lower. The grade stays inside the
  existing tone-mapping hook, without another full-screen pass.
- GTAO blend increases from 0.72 to 0.78 with the same depth source, radius,
  resolution budget and sample count. VSM softness increases from 5/2048 to
  6/2048 with unchanged map sizes, blur samples and update cadence.

### Initial Visual Evidence

Matched production workshop captures passed on desktop and mobile across low,
balanced, high, local time, night and movement. Desktop High sampled mean
luminance moved from 0.543 to 0.506 and saturation from 0.391 to 0.421; mobile
local-time mean moved from 0.529 to 0.491 and saturation from 0.435 to 0.468.
Desktop High sampled draws were 2186 for both builds; triangles increased from
1538911 to 1559311, about 1.3%. These frame counters include shadow passes and
are not a whole-application FPS measurement.

The 46-view architecture tour also passed mainland locations, all nine planets
at surface and orbital distances, first-person movement and night, with no page
errors, blank canvases or horizontal overflow. Representative workshop, planet
and night captures were reviewed. The full suite passed 692 of 703 tests; the
same eleven previously documented baseline failures remain. TypeScript, scoped
runtime lint and the production build passed. The generated city shell and hero
assets passed source verification. The city cache checksum differs from the
frozen control; the original GLBs and generated hero packages are unchanged.
The cache difference is confined to 235 lookup keys containing the existing
source palette; its 33333152-byte vertex payload is identical. The compressed
file changes from 3624067 to 3624097 bytes. This corrects stale lookup keys, not
the city geometry.

### Initial Performance Cost

The first full visual candidate added 6.8-13.0 MiB of geometry storage at the
sampled locations. Fixed-Balanced paired timings were slower, including after
reversing the execution order on mobile. These results are retained rather than
presented as a performance win:

| Location | Desktop Mean, Before / After | Mobile Mean, Before / After |
| --- | ---: | ---: |
| Plaza | 152.03 / 160.36 ms | 54.44 / 89.25 ms |
| Project gallery | 133.51 / 135.74 ms | 41.67 / 70.74 ms |
| Mainland return | 156.29 / 188.70 ms | 49.63 / 71.85 ms |
| Citadel | 118.76 / 146.29 ms | 45.00 / 48.52 ms |

Absolute frame times on this machine vary substantially between sessions. This
first pair does not isolate the cause of every timing difference. It prompted
the byte-exact profile-indexing follow-up above; no visual feature was removed
to improve the figures. The initial candidate's mobile memory/lifecycle run
passed two circuits in 182.81 seconds with inactive-world cleanup, touch input
and context restoration intact. That run predates the indexing follow-up.

The initial timing and cache-difference records are under
`outputs/performance/oct10-diorama-finish/initial-performance.json`, with full
paired reports under `outputs/performance/oct10-diorama-runtime-desktop/` and
`outputs/performance/oct10-diorama-runtime-reversed-mobile/`. The follow-up passed
all 18 focused architecture tests plus TypeScript, scoped lint and a new build;
the earlier 703-test run was not rerun after this lossless indexing-only change.
The follow-up's long browser benchmark was stopped before producing final results
when publication was requested. Its final FPS and repeat-soak results remain
unverified; the completed initial comparisons above do not demonstrate a speedup.

Blender's addon could not be reached for either status or scene inspection. This
pass therefore does not claim a fresh Blender bevel remodel, bake or native-file
export. It reuses the existing authored profiles and adds runtime facade geometry
within explicit budgets. An exact offline-render match and physical-phone frame
rates are not certified.

The control is the memory-cleanup build at port 4361 with privately frozen public
assets. The compact candidate is `http://127.0.0.1:4363/`, built from
`outputs/performance-source/oct10-diorama-compact/`; the first candidate remains
archived under `outputs/performance-source/oct10-diorama-finish/`. Source fingerprints, logs and
comparison metadata are under `outputs/performance/oct10-diorama-finish/`;
captures use the `oct10-diorama-before`, `oct10-diorama-after` and
`oct10-diorama-worlds` prefixes under `outputs/playtest/`. These are local
verification results; deployment status is not certified by these checks.

## Presentation and accessibility

- Space Grotesk and Fraunces are served locally from `public/assets/fonts`, with
  their upstream licenses. There is no runtime font service dependency.
- The HUD retains the existing navigation and interactions, using labeled icons,
  native hover titles, visible focus states, and at least 44px toolbar targets.
- The district atlas uses spatially separated, keyboard-accessible buttons.
- Small screens keep the world full-bleed, with independent camera and movement
  controls and a two-row toolbar when eight 44px targets cannot fit.
- Reduced motion freezes decorative routing signals and honors existing weather
  and character settings. Low quality bypasses bloom and releases its targets.
- Bloom uses a high-pass radiance limit so reflected highlights cannot wash out
  whole streets. Quality can switch in both directions without recreating the
  world or changing player progress.
- Far-away discovery labels fade; full labels return on approach. Existing
  artwork and machine emissions are not recolored by the finishing pass.

## Rendering Finish Pass, 9 October 2026

A rendering-pipeline response to the stylised daylight reference (bevelled,
open-shadow miniature look). Geometry, assets, content and quality tiers are
unchanged; this pass only rebalances light transport, material response and
the final colour pipeline. It is not a Blender re-bake or a bevel remodel.

- `app/kingdom-grade.ts` installs the project grade through Three's
  `CustomToneMapping` hook: Khronos Neutral curve, then a mild chroma-aware
  vibrance (muted surfaces regain colour, saturated paint is untouched) and a
  faint warm black floor so shadows never crush. Because it lives in the shared
  tone-mapping chunk, the direct renderer, the postprocessing `OutputPass` and
  every quality tier produce the same finish at zero extra pass cost.
- Image-based lighting is the material glue. The downloaded studio HDR is no
  longer used at runtime (the file stays for the Blender export importer):
  `app/sky-environment.ts` renders the sky the player can see (zenith, horizon,
  ground bounce and a soft glow around the key light, with no hard sun disk) to
  a 128px cubemap and prefilters it with PMREM. Reflections, broad highlights
  and shade fill therefore follow weather, time of day and the local vertical
  on every planet, and orbit/transit reflections show space rather than a
  photographic studio. Skylight is paled to half the dome's chroma (real sky
  fill is far less blue than the zenith) and dim night skies rise to a moonlit
  floor so shade never goes black. Refreshes reuse one prefiltered target so
  materials keep their programs; they are throttled to 4 Hz (2 Hz on Low) and
  only happen when the quantized sky signature changes or after a WebGL context
  restore. Measured in isolated Chrome: zero refreshes over 120 steady frames,
  about .1-.4 ms per forced refresh including a GPU finish, 27 refreshes across
  a full day-to-night cross-fade (`outputs/performance/oct9-sky-environment/
  probe.json`). The finishing pass allows non-metal, metal and natural surfaces
  up to .9 / 1 / .5 environment response (previously .6 / .85 / .4).
- Daylight key and fill were rebalanced for the sky environment (clear sky sun
  2.9 at a slightly warmer `#ffdfb4`, hemisphere .25; fixed `day` mode matches)
  so lit paint stays under the Neutral shoulder instead of bleaching while the
  environment carries the shade. The motherboard day sky and fog move from pale
  cyan to a deep clean blue with a warm-neutral ground bounce.
- Material hierarchy: the shared finish keeps authored satin trims distinct
  from matte walls (non-metal roughness floor .46, metals .3-.5, clearcoat up
  to .35) instead of flattening everything to a .55 floor. Plain untextured
  finishes share one 128px micro-roughness map (about +-4%) so flat paint stops
  reading as uniform plastic; crafted edge radii grow from 14% to 17% of the
  shortest dimension (capped at .15) at identical triangle counts.
- Depth-based AO is subtler (blend .72, scale 1.15) so contacts read without
  dark outlines.
- Shadows are variance shadow maps (`VSMShadowMap`): a blurred penumbra that
  widens the same way a softbox would, instead of PCF's stepped edge. The blur
  radius scales with the map (`shadowSoftness` 5/2048) so softness is constant
  in world units across tiers; Balanced keeps 2048 at 8 Hz with 8 blur samples,
  High uses 3072 per frame with 12 samples (VSM holds three buffers per map, so
  4096 would cost about 190 MB and was not used). Low still disables shadows.
- The visible skies carry the same sun glow as the environment map (a broad
  and a tight lobe around the key light, fading below the horizon) on both the
  motherboard dome and the planet atmospheres, so what reflects in a window is
  what you see when you look up. The glow follows the live sun colour and
  strength, dimming to a faint moon glow at night.
- The grade gains a mild global saturation (1.06) under the chroma-aware
  vibrance and a 2% highlight warmth that leaves shadows neutral; results are
  clamped to the display range. Workshop hero trims and forecourt paving are a
  touch glossier (chalk .5 / clearcoat .2, paving .78) so the cream ribbons and
  the ground catch the sky.
- `scripts/check-kingdom-visuals.cjs` now records display tone statistics for
  every capture (mean/median/p5/p95 luma, HSV saturation and value). Workshop
  desktop-high day captures moved from mean .555 / p5 .128 / saturation .344
  (baseline) to .542 / .192 / .365 with the sky environment: shade is a third
  brighter at the same overall exposure, and the sky-fill blue cast seen in the
  first environment calibration (p5 .245, saturation .442) was removed by
  paling the skylight. Night keeps its practical lights at mean .20 / p5 .078.
  Plaza, lantern quarter, Commons, Copper surface and orbit, first-person
  movement and night views pass with no errors. Reports:
  `outputs/playtest/grade-before-checks.json`,
  `outputs/playtest/sky-env2-checks.json`,
  `outputs/playtest/sky-env2-world-checks.json`, and after the soft-shadow and
  sky-glow pass `outputs/playtest/vsm3-checks.json` and
  `outputs/playtest/vsm3-world-checks.json` (desktop-high day mean .543 / p5
  .193 / saturation .39; all views errors[]).

## Rendering Efficiency Follow-Up, 9 October 2026

This pass preserves the new VSM resolutions, blur samples, update rates, sky
glow, grading, material finishes and all asset data. It changes runtime resource
handling and cache work, not the artwork or visual quality settings.

- Shader preparation reproduces and fixes the reported
  `Cannot read properties of undefined (reading 'isReady')` error. The regression
  uses the installed Three.js polling implementation with a material disposed
  between checks. Preparation now captures and deduplicates actual compiled
  programs, cancels on material disposal/context loss, cleans up its timers and
  listeners, and rejects failures through its promise instead of throwing from
  a detached timer. Parallel shader compilation and the existing startup and
  teardown contract remain in place.
- The VSM intermediate blur target keeps its original RG16F texture, sampling
  and size but no longer allocates an unused depth renderbuffer. The native
  driver requested one DEPTH_COMPONENT24 buffer before and none after. That
  removes 12 MiB of nominal depth storage at 2048 and 27 MiB at 3072; actual GPU
  allocation includes driver-dependent padding. The original depth texture and
  shadow/blur color textures remain. Unchanged target configurations are reused.
- Sky-environment refresh decisions use two reusable numeric keys instead of
  constructing arrays and a joined string each frame. All decisions matched the
  original algorithm across 360 fade, orientation and invalidation samples;
  120 steady updates performed no signature joins or flat-map operations.
- Unchanged viewport events no longer reset the drawing buffer or pixel ratio.
  The initial mobile browser regression observed 16 size updates across eight
  unchanged events; the corrected run observed zero. Real orientation or DPR
  changes update the buffer once, retaining its exact requested dimensions.

Validation used a frozen copy of the current working visual pass, including
the user's existing local changes, with private build assets. All 109 focused
tests, TypeScript, scoped runtime lint, `npm run build:vercel` and Vercel output
verification passed. Nothing was committed or deployed by this follow-up.

Real Chrome/Intel Arc WebGL comparisons were byte-identical in twelve frozen
desktop/mobile, Balanced/High, day/night/moved-object cases using the actual
presentation pipeline. The final full-app workshop check passed eleven quality,
viewport, night and motion captures. A fourteen-view mainland/Copper surface
and orbit tour passed before the resize-only follow-up. The final High-quality
mobile lifecycle check passed six touch swipes, three orientations, camera
modes, pause/resume, bounded website previews and one forced context recovery,
retaining the same document, scene and canvas. Recovery still uses the existing
Low-quality fallback; that policy was not introduced by this patch.

Evidence is under `outputs/performance/oct9-render-efficiency/`: build logs and
fingerprints, `rendering.json`, `world/`, and `lifecycle/high-mobile.json`.
`pre-resize/` preserves the first lifecycle failure and earlier build evidence;
`shadow-only/` preserves the earlier GPU experiment. The final resize adds no
changes to the rendering operations exercised by the pixel comparison.

GPU timings are mixed and variable, including slower samples; no consistent
frame-rate improvement or multiplier is claimed. The established gains are
reduced memory/allocation work and elimination of the reproduced readiness
failure. Mobile checks are emulation, external website pages are controlled
fixtures in the lifecycle test, and no hosted Vercel or physical-device
certification is implied.

## Planted Miniature World Pass, 2 October 2026

This pass addresses the bare surroundings, pointed ornament and disconnected
props visible in the fifty-photo review. It is a concrete art-direction change,
not a claim of a numerical visual-quality multiplier.

### Grounding And Planting

- Public venues gain irregular pocket gardens with matte textured turf, low
  rounded shrubs, flowers, pebbles and rounded edging. Shops also have deliberate
  side and rear planting. Fixtures, ramps and entry aisles remain clear.
- Each satellite has 23-26 larger planted islands around venues, outposts and
  groves, plus terrain-following lawn borders around its public spaces. Borders
  leave the entrance corridor, roads, rivers and water open. Garden surfaces use
  interior vertices as well as edge vertices so they follow curved terrain.
  Lawn borders use rounded outline geometry with bounded tessellation, not
  grid-cut edges. The Forge's seven borders total 9,486 triangles and share one
  material; distant borders are culled.
- Planting uses shared material sets and instanced foliage. A planet's planted
  islands are capped at 32 and tested below 75,000 triangles; nearby patches are
  visible within 115 local units and hide when the planet is inactive.
- City street trees gain instanced planted courts in the near detail level.
  Their geometry is reused between neighborhoods; distant city models retain
  their existing lightweight silhouettes.

### Softer Construction

- Shared civic props and building bodies reuse bounded bevels. Street and park
  lamps are shorter, lamp fins become rounded crowns, and entry plaques are
  compact arches rather than pointed arrows.
- Market and playground canopies use rounded surfaces. Citadel spires become
  low lanterns, rooftop solar fins become fitted panels, and thin shade slats
  become joined shade roofs. Chimneys and rooftop instruments are more compact.
- Outpost signals are short capped fixtures. Landing-station crystal columns
  become grounded topiary, while interactive resonators keep their behavior.
- Research landmark wings are shortened and rounded, with matching collision
  heights and distant forms. Small realm roofs become domes or barrel roofs.
  Working demonstrations, galleries, wheel mechanisms and approaches remain.
- Shop sculptures sit closer to their roofs on wider, fitted mounts and plinths;
  the donut opening, display interactions and distinct shop identities remain.

### Planetary Atmosphere

A local-gravity sky and distance haze connect planetary subjects to a horizon
instead of a flat space backdrop. The existing day, sunset, night and cycle
controls now also drive planetary key/fill and venue lighting. No real-time
lights are added. The sky is a sub-800-triangle mesh and is disabled for orbital
observation and views far from the surface. Motherboard lighting, HDR, tone
mapping, AO, FXAA, adaptive quality and context recovery remain in place.

### Planted World Verification

Focused tests cover planted-area clearance, curved-ground raycasts, material
sharing, count and triangle budgets, reduced/inactive behavior, architectural
identity, sculpture supports, transit, local gravity and light-count invariants.
The existing browser tour accepts `--shops --premium` to check all shop arrivals,
desktop/mobile framing, planted borders, planetary sunset/night and orbital
visibility. The full Node regression suite and 32-capture world tour passed
before the final lawn-edge refinement. That refinement then passed the
all-nine-planet terrain tests and a five-capture day/sunset/night/orbital check.
Reports are under `outputs/playtest/premium-final-checks.json` and
`outputs/playtest/premium-smooth-checks.json`, both with no browser errors.
The existing mobile camera and forced context-recovery check also passed,
preserving the page, canvas, scene and player position. TypeScript and scoped
feature-module lint checks pass. Existing unrelated lint findings are not part
of this visual pass. Physical-phone performance and hosted deployment are not
certified by desktop browser captures. Individual bespoke assets and scene
compositions remain candidates for further art review.

## Signature Shops And Scenic Streets

World > Signature shops now visits ten sculpted storefronts. Existing public
venues remain in place; each satellite receives one additional shop near a town.

| Destination | Shop | Rooftop silhouette |
| --- | --- | --- |
| Motherboard Central | Loop & Glaze | Open donut ring, dripping glaze and instanced sprinkles |
| GitHub - The Forge | Copper Crumb | Braided pretzel and butterfly roof |
| Cache Gardens | Scoop Cache | Waffle cone, three scoops and scalloped canopy |
| LinkedIn - The Citadel | Paper & Steam | Teapot with curved spout and folded gable |
| Petal Park | Petal Pantry | Fruit tart and petal roof |
| Solstice Springs | Sunrise Roastery | Takeaway cup and ceramic dome |
| Cloud Nine | Nimbus Sugar Works | Spun sugar cone and rounded towers |
| AI Research Planet | Prism Optics | Angled telescope, fitted lens and prismatic piers |
| Project Foundry Planet | Fold & Fly | Glider and hangar roof |
| Skills / Technology Planet | Ribbon & Reel | Diamond kite, ribbon tail and sail canopy |

The shared catalog lives in [everyday-config](../app/everyday-config.ts), while
[signature-shops](../app/signature-shops.ts) owns the meshes and display-color
interaction. The menu does not import the geometry builder. Roof supports meet
the actual sculpture geometry. Storefront meshes remain below 20,000 triangles
each, and no new real-time lights are added.

[storybook-street](../app/storybook-street.ts) builds striped tethered balloons
and two rolling roads around Loop & Glaze at city coordinates (250, 379).
Balloons stay below 2,500 triangles each, reuse tether buffers, follow local
planet gravity, and stop moving in reduced-motion or inactive venues. Road
meshes, shoulders and walking heights share the same sampled curves and grades.
Endpoints join existing streets. The displaced banyan remains in the neighboring
courtyard, and banyan placement now respects public-venue footprints.

Shop travel uses the existing planet streamer, waits for loaded scenery, and
arrives at the clear entrance with a local movement and camera frame. Returning
home or to the station cancels a pending shop arrival. Responsive cameras retain
collision checks; Fold & Fly uses a higher view and Ribbon & Reel uses a sideways
angle to clear nearby infrastructure.

Verification includes geometry and placement tests, real road walks through the
world controller, reduced-motion and tether checks, loading cancellation, and
desktop/mobile canvas and full-landmark bounds. Run the visual tour with
`node scripts/check-kingdom-visuals.cjs --shops --url=http://127.0.0.1:4332 --prefix=shops-final`
in an environment with Playwright available. `--shop=motherboard` limits the tour
to the donut district. Captures and JSON reports are generated under
`outputs/playtest`.

The full Node regression suite and TypeScript check passed. Scoped runtime lint
is clean; the CommonJS harness still triggers the repository's existing
`no-require-imports` policy and older unused-parameter findings. These checks do
not certify hosted deployment or physical-phone performance.

## Lantern Presentation Pass, 1 October 2026

This follow-up responds to the mobile composition critique while retaining
the published workshop materials, HDR environment, PBR Neutral tone mapping,
GTAO, FXAA, adaptive quality, instancing, LOD and streaming. No renderer migration
or new cloud service was introduced. Hosted deployment has not been verified.

### Visual Changes

- Lantern Quarter now has an open arcade with two swept ribs, a restrained
  translucent canopy, fifteen instanced opal lanterns, fitted caps and suspension
  cords. The arcade is below 7,000 triangles and introduces no real-time lights.
  Four support posts clear the existing gardens and leave the centre walkable.
- A 64-instance stone promenade and brass circuit inlays lead from arrival to
  the clockhouse. A shared footprint map grounds the buildings and planters.
  Night light pools sit above the promenade but below its raised brass details;
  this layer ordering has a regression test.
- Support piers and a gallery band visibly support the clockhouse's upper drum.
  Existing buildings, residents, traffic, routes and interactions are retained.
- Lantern arrival is now (150, 0.8, 95), with yaw 0.18, pitch 0.3, focus 12.5
  and distance `max(58, min(122, 36/aspect))`. It refits when the viewport changes
  until the user adjusts the camera. The duplicated arrival toast is removed.
- The five categories remain directly reachable in a compact translucent icon
  dock. Labels remain available through ARIA and native tooltips; every trigger
  and menu-close target is at least 44px. The header's empty area no longer
  intercepts scene input. The joystick shrinks from 116px to 104px without
  changing its normalized movement response or release behavior.
- Authored `surface: light` materials can reach bounded night emission above
  the existing bloom threshold. Ordinary glazing retains its previous 1.2 cap.
  Material-role metadata participates in batching so these policies cannot
  silently merge. Workshop practical lamps also gain a stronger night glow.

### Research And Corrections

Reviewed the current [R3F scaling-performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance),
[Drei Environment](https://drei.docs.pmnd.rs/staging/environment),
[Drei AccumulativeShadows](https://drei.docs.pmnd.rs/staging/accumulative-shadows),
the actual [BakeShadows implementation](https://github.com/pmndrs/drei/blob/master/src/core/BakeShadows.tsx),
and the installed Three.js `UnrealBloomPass` source.

| Supplied recommendation | Decision based on the current application |
| --- | --- |
| Add instancing, LOD, culling, HDR, AO and adaptive DPR | Already present. Retained and reused rather than claiming them as new work. |
| Use `BakeShadows` to bake lighting into materials | Its implementation freezes shadow-map updates; it is not an offline material-lightmap baker. Existing workshop baked occlusion remains intact. |
| Switch to ACES and add gamma correction | Retained the previously selected PBR Neutral and existing output conversion. A second gamma correction would be incorrect. |
| Halve bloom resolution for a guaranteed 75% saving | The installed pass already begins at half width/height and builds a smaller mip chain. Fewer pixels do not guarantee the same proportional total frame-time saving. |
| Force a full R3F/Drei migration | Not required to apply these rendering techniques to the existing React/Three.js world. Avoided an unrelated rewrite. |
| Add Draco and KTX2 everywhere | Not implemented in this visual pass. Draco affects transfer/decode; KTX2 can affect transfer and GPU texture memory. Neither independently fixes composition or draw-call cost, and both require an asset/decoder pipeline and device checks. |
| Promise 60 FPS, fewer than 50 draws or a 150 MB GPU budget | Treated as proposed goals, not measured results. No physical-phone or GPU-memory certification is claimed. |

### Lantern Verification

The complete Node regression suite, TypeScript and changed-module lint checks
passed. Focused tests were rerun after the final light-pool height correction.
The touch HUD workflow passed menu access, joystick release and rotation checks.
The Balanced mobile camera-lifecycle check passed deliberate WebGL loss and
restoration with the same document, canvas, scene and player position.

Lantern's seven final day/sunset/night/movement captures at 1440x960 and 390x844
are under `outputs/playtest/lantern-finished-*`, with no captured page or rendering
errors. Bootloader's eleven compatibility captures are under
`outputs/playtest/workshop-lantern-regression-*`; its reference-sized compact-HUD
checks are under `outputs/playtest/compact-dock-probe-*`.

The measured run in `outputs/playtest/lantern-final-checks.json` used Balanced,
normal scene animation, a 90-frame warm-up and three 90-frame samples on local
Chrome/Intel Arc. Median-run means were 21.85 ms at 1440x960 and 19.26 ms at
390x844, with p95 values around 33.5 ms and 33.3 ms. These are viewport-emulation
measurements, not iPhone/Android results or a matched before/after speedup. They
precede only the small final light-pool height correction. Earlier probe timings
used different scene revisions and should not be compared as controlled gains.

```sh
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --lantern --measure --url=http://127.0.0.1:4332 --prefix=lantern-check
```

## Workshop Reference Pass, 1 October 2026

The workshop retains its mural, imported machinery, routes and controls. This pass
addresses the flat lighting and stepped edges visible even at High quality:

- Local daylight now comes from the front-left, with a warmer, stronger key and
  less uniform fill. Moonlight and the existing weather transitions are retained.
  The Day preset uses a 3.1 warm key at (-40, 65, 70), 0.44 hemisphere fill and reduced rim light;
  Local sky retains its cloud-cover response and the original night values.
- PBR Neutral tone mapping replaces ACES after same-camera comparison, preserving
  more of the warm paint and teal material colors. The self-hosted 1K studio HDR
  supplies reflections without replacing the stylized sky. Its energy is scaled
  to 55% of the existing environment levels, with the old room environment kept
  as a loading fallback.
- A separate matte jade deck finish contrasts with the darker cabinet enamel;
  paving colors are quieter and slightly warmer.
- Oiled timber, brushed brass and copper, limewashed plaster, painted masonry
  and smoother ceramic use distinct finishes. Three shared relief maps add
  96 KiB of base texture data; the broad walls no longer inherit cabinet gloss.
- The fitted repair cabinet has ten genuinely recessed drawer panels, raised
  frames, label holders, a set-back plinth, adjustable feet and a shaped timber
  counter with edge inlay. Its original physical collision boundary is retained;
  the complete unbatched object stays below 10,000 triangles.
- Three hollow reels have actual bores, cut-out flanges and wound copper cable.
  A hinged task lamp adds a weighted base, linked arms and a spun shade. Each
  reel and the lamp stay below 3,000 triangles and introduce no real-time lights.
- Workshop windows reuse the existing 32 KiB room atlas with normalized shaped
  pane UVs, varied interiors and reversible night illumination. The painted shop
  signs now receive scene lighting and have fitted metal edging; mural and
  screen artwork remain unchanged.
- Three 512-square, offline-baked occlusion maps shade the two floor levels and
  shelf wall. They replace the procedural 256-square fallbacks after loading.
  A 64-square contact map follows the courier only on the workshop floors and
  fades at their edges. All four work in Low, add no collision geometry and
  require no accumulation during gameplay. The loaded base texture data totals
  3,088 KiB, before mipmaps; replaced fallback textures are released.
- Balanced and High apply FXAA after tone mapping and output conversion. Its
  texel size follows the existing 1.6-million-pixel postprocessing budget, and
  its resources are released on Low and disposal.
- Depth-reusing GTAO now shades nearby surfaces and recesses before bloom and
  tone mapping. It reconstructs normals from the existing scene depth instead
  of rendering another geometry pass. AO and denoising are capped at 600,000
  pixels with eight samples each; Low releases these resources and keeps the
  baked contacts. Depth-buffer references follow the composer's swaps.
- Auto can try Balanced after two measurement windows below 18 ms, allowing
  stable 60 Hz devices out of Low. High still requires windows below 12 ms;
  the existing slow-frame fallback and no-retry ceiling remain in place.
- The supported PCF filter uses radius 3 at Balanced and 6 at High, preserving
  the same shadow softness as map resolution doubles without another render pass.
- High permits native 2x rendering when it fits the existing device pixel budget.
- Return to workshop uses the standard 50-degree lens, arrival (-2, 0.8, 24),
  yaw 0.6, pitch 0.26, focus height 6.5 and distance
  `max(36, min(84, 27.75/aspect))`. The view refits on resize
  until a manual camera adjustment, retaining the existing camera modes.
- On phones, the interaction remains a labeled 44px hand button above the
  joystick rather than a wide banner; the smaller location title leaves the
  scene visible. Desktop interaction controls are retained.

### Reference Research And Assets

The reference was evaluated with estimated screen-space landmarks for the
courier, workbench sign, press, and the red building's roof and base. Trials with
longer and near-orthographic lenses did not improve the complete composition and
were removed. The selected standard-lens view is covered by projection tests and
an actual browser camera-distance assertion, not only a fixed screenshot zoom.

Research references:

- [Drei AccumulativeShadows](https://drei.docs.pmnd.rs/staging/accumulative-shadows):
  accumulate static soft shading, retaining cheap rendering after completion.
- [Drei Environment](https://drei.docs.pmnd.rs/staging/environment): use HDR
  environment lighting independently of the visible background, and self-host
  production assets instead of depending on preset CDNs.
- [Model-viewer tone mapping comparison](https://modelviewer.dev/examples/lightingandenv/):
  PBR Neutral preserves material colors differently from ACES and AgX.

`public/assets/studio_small_03_1k.hdr` is **Studio Small 03** by Greg Zaal,
downloaded from [Poly Haven](https://polyhaven.com/a/studio_small_03) under its
[CC0 asset license](https://polyhaven.com/license). It is 1024x512 and 1,686,299 bytes.

`app/workshop-lighting.ts` uses Three.js `ProgressiveLightMap` in an isolated
browser bake: 48 deterministic hemisphere-light samples on cloned static
geometry, normalized by an unobstructed-light control. The three PNGs are
generated from the existing workshop and press, not downloaded artwork. Opacity
variation is asserted; opaque diagnostic previews are written under
`outputs/playtest/bake-preview-*`. This bakes soft occlusion, not full indirect
color-bounce transport. Regenerate after changing the static workshop geometry:

```sh
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --bake-workshop --url=http://127.0.0.1:4332
```

The Blender MCP addon was unavailable. A Store installation was found, but direct
background execution was denied and no command alias was available. No Blender
scene, system permissions or running user work was changed.

Use `--match-reference` to capture the actual 353x600 touch viewport at DPR 2,
without the manual zoom used by older close-up checks. Optional `--tone=aces`,
`--tone=agx` and `--tone=neutral` switches are isolated comparison controls.

### Workshop Verification

All 484 Node regression tests passed, as did the full TypeScript check. The
invalid-position recovery test now checks the configured workshop spawn rather
than hardcoding its old coordinates. The isolated Chrome check completed 11 captures
at 946x764 and 390x844: Low/Balanced/High in matched daylight, Local sky, night,
and movement. It asserts visible contact shading, retained camera framing,
nonblank canvas pixels, asset loading, control bounds and 44px toolbar targets.
It also asserts the cabinet, three reels, task lamp, room-shaded glazing and
consistent shadow radius are present at every quality level.
No page or Three.js rendering errors were captured. Results and screenshots are
under `outputs/playtest/reference-complete-*`. The reference-sized High capture
and portrait/landscape interaction checks are under `outputs/playtest/reference-final-*`.
The full touch HUD workflow also passed 28 captures, including menus, joystick
release, rotation and character controls, under `outputs/playtest/hud-dropdowns/touch`.

```sh
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --workshop --url=http://127.0.0.1:4332 --prefix=reference-complete
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --workshop --match-reference --url=http://127.0.0.1:4332 --prefix=reference-final
```

The `--reference` option captures closer, matched Balanced views, warms up for
90 frames and records three 90-frame samples. `--ao-control` disables only GTAO in the isolated browser's intercepted
module, asserting that the active module was actually intercepted; app source is
unchanged by that control. The earlier AO-only captures are in `workshop-depth-close-*` and
`workshop-depth-control-*`. Their indicative single 90-frame samples on local Chrome/Intel
Arc were 20.56 ms without AO versus 20.18 ms with AO on desktop, and 17.59 versus
18.15 ms at phone viewport size. These short, non-randomized runs do not establish
a speedup or certify physical-phone performance.

The earlier craft close-ups are in `workshop-crafted-close-*` at 860x768 and
390x844. The median-run means after warm-up were 28.15 ms desktop and 22.78 ms
at phone viewport size, with substantial variation between runs. These are
current local measurements, not a matched before/after speed comparison. The
earlier `workshop-craft-probe-*` capture used a shorter single-window sample.

The final High mobile camera-lifecycle check passed Close/First person/Far
changes and deliberate WebGL context loss/restoration with the same document,
canvas, scene and player position. Its report is
`outputs/playtest/camera-lifecycle/high-mobile.json`.

The new bake module and changed atmosphere, lighting and quality-profile modules lint clean. Broader
lint still includes the pre-existing `module` loop variable in
`workshop-details.ts` and `activities` prefer-const finding in `world.ts`.
This is a local development-browser verification, not a real-phone performance
benchmark, production build, or hosted deployment verification.

## Vaulted Gallery, 1 October 2026

The pavilion is now a continuous timber-lined vault with two furnished studios,
superseding the folded-roof version documented below. The fountain, project
studies, original world, public destinations, transit, multiplayer, radio and
resume access remain connected to the same scene and renderer.

- The vaulted shell, curved ribs and rear acoustic wall form one architectural
  focal point. The existing name and role appear as facade lettering rather than
  an opaque billboard. Ordinary civic plaques retain their original treatment.
- `capital-gallery.ts` supplies a code studio and a prototype workshop: actual
  desks, shelving, books, task lamps, monitors and equipment. Two seated residents
  work at the desks; their hands settle when reduced motion is enabled.
- The central passage and existing project-study sight lines remain clear.
  Segmented roof camera bounds follow the arch rather than blocking the entire
  volume beneath it. The pavilion's geometry gate is 8,500 triangles and fewer
  than 26 mesh groups, including the studios, without new real-time lights.
- World > Gallery provides a direct visit at (52, 0.8, 168). Its Far view uses
  yaw 0, pitch 0.19, focus height 7.8 and distance
  `max(44, min(124, 50/aspect))`, framing both piers on phones. Saved Close and
  first-person modes retain precedence; the original plaza arrival is unchanged.
- Task-lamp emission, monitor glow and a restrained warm wall response establish
  the night interior without adding shadow-casting lights or another renderer.

### Gallery Verification

All 468 regression tests passed in the recovered integrated application;
`outputs/playtest/vault-regression.xml` records the result. TypeScript, scoped
runtime lint and the plain Vinext production build also passed. The production
walkthrough completed 73 captures with no browser errors, including the Gallery
shortcut, resident motion, full desktop/mobile roof framing, day/night interiors,
all six study workflows and their resume source handoff, five promenades with
3,276 samples, all nine public venues, both reading courts and every planet's
arrival and orbital views. Evidence is in `outputs/playtest/vault-final`.

```sh
npm exec --yes --package=playwright -- node scripts/check-capital.cjs --gallery --quality=balanced --all-planets --studies --biomes --output=outputs/playtest/vault-final
```

The pre-gallery production baseline is archived in
`outputs/performance-source/vault-control-dist`. Its server entry SHA-256 is
`aa1d35b7ee406f17ea73c27decc1317e8e48c4f29d3f6433033906ca98696150`.
It represents the previous local architectural pass, not published `dbfa0e9`.

### Gallery Performance

The final comparison used the same Chrome process and desktop GPU, Balanced
quality, DPR 1, 90 warm frames and three 90-frame samples per location. Reports
are in `outputs/performance/vault-comparison-{desktop,mobile}/metrics.json`.

| Location | Desktop Previous -> Gallery | Mobile Viewport Previous -> Gallery |
| --- | --- | --- |
| Plaza | 24.07 -> 24.26 ms | 16.85 -> 16.67 ms |
| Mall | 24.44 -> 24.44 ms | 16.67 -> 16.67 ms |
| Citadel | 16.67 -> 16.67 ms | 16.67 -> 16.67 ms |

The mobile viewport was 390x844 on that same desktop GPU, not a physical phone.
Plaza heap was 247.34 -> 248.39 MiB in the mobile pair. The near-16.67 ms values
are display-paced and do not establish unused rendering capacity or a general
speedup. Startup, cache order, animation and shadow refresh affect observations;
no universal frame-rate or literal visual multiplier is claimed.

This gallery and the earlier local improvements were validated together.
Vercel packaging and hosted deployment have not been verified as part of this pass.

## Architectural Diorama, 1 October 2026

This pass extends the local Tangible World work below. The same arrival cameras
are used for comparison; no original models, features, portfolio records, transit
routes or controls are removed.

- The pavilion has beveled stone piers, dressed roof edges and a folded underside
  that follows the roof profile instead of a flat slab. Both passages and the
  study sight lines remain clear within the existing 1,800-triangle budget.
- The fountain has a stepped foundation, shaped basin coping, shadow joints and
  genuinely fluted column geometry. A 64-byte gradient texture softens crossed
  water ribbons driven by the original jet trajectories. The ribbons reuse their
  buffers, add at most 1,152 triangles, and freeze with reduced motion. Water
  levels, collision radius and choreography are unchanged.
- The canal bridge gains abutments, bearing pads and arch ribs beneath its
  original deck. Study displays have recessed frames and braced legs; their
  original readouts, source links and controls remain. Foreground planting moves
  outward to reveal The Builder sign without removing the tree.
- A 32 KiB two-texture atlas gives architectural glazing recess shading and four
  room treatments, including a completely unlit room. Materials are shared by
  neighborhood. Address/floor/face/bay determines the room; matching detailed
  facades retain that choice. Static batching distinguishes atlas identity and
  room UVs so it cannot discard the authored occupancy. No extra window meshes
  or real-time lights are needed.
- Nine town compositions vary courtyard spacing, row offsets and building
  heights. Each accepted lot is retained; a proposed move that conflicts with
  roads, water, protected landmarks or neighbors keeps its original position.
  Height variations must also retain the original storey count, using the same
  calculation as the building generator, so skyline changes cannot add floors.
  Woodland clusters frame those settlements with balanced hemispheres. Existing
  roads, rivers, terrain, planet identities and destinations remain; the original
  132/172 trees and two banyans per planet are retained.

The complete 466-test suite passed, together with TypeScript and scoped lint.
The geometry tests include actual world-scaled pavilion ray intersections,
window-atlas ownership and disposal, room UV preservation, water-buffer reuse,
planet lot retention and canopy clearances. Results are saved in
`outputs/playtest/architectural-regression.xml`.

Production acceptance passed all six project study workflows, five promenades
with 3,276 path samples, all nine public venues, the bridge and lookout, resume
access, both reading courts, day/sunset/night, and all nine planet arrivals and
orbital views at desktop and mobile sizes. Screenshots and nonblank canvas checks
are in `outputs/playtest/architectural-final`. The subsequent storey-budget guard
passed ten focused planet, canopy, geography and window tests; the full captures
precede that final guard. The sampled capital owner increased from 152 draw calls
and 45,330 triangles to 158 and 50,386; these are scene-complexity observations,
not a frame-rate guarantee.

```sh
npm exec --yes --package=playwright -- node scripts/check-capital.cjs --quality=balanced --all-planets --studies --biomes --output=outputs/playtest/architectural-final
```

The pre-prototype control is the previously completed local production build in
`outputs/performance-source/architectural-control-dist`, not published `dbfa0e9`.
Its server entry SHA-256 is
`6debe2e75061325e3754b3f0500b3d517755af81a5324fdc5f03b677dc8feefb`.
Initial same-camera captures are under `outputs/playtest/architectural-prototype`.
Final fixed-quality mobile-emulation results after the storey-budget correction
are in `outputs/performance/architectural-budget-final-mobile/metrics.json`:

| Location | Previous Mean Frame | Updated Mean Frame |
| --- | --- | --- |
| Plaza | 27.59 ms | 25.37 ms |
| Mall | 23.15 ms | 23.52 ms |
| Citadel | 17.41 ms | 16.85 ms |

Plaza heap was 246.65 -> 247.22 MiB; Citadel heap was 280.06 -> 281.68 MiB.
These are local Chrome samples on the same desktop GPU with a 390x844 touch
viewport, Balanced quality and DPR 1: 90 warm frames, then three 90-frame runs.
The earlier desktop pair, before the final storey guard, measured
46.11 -> 45.37 ms at the plaza, 50.18 -> 48.15 ms at the mall and
24.81 -> 24.07 ms at the Citadel. Its report is under
`outputs/performance/architectural-final-desktop`. The initial mobile report
in `architectural-final-mobile` predates the correction and is not the final
result. Build order, caches, animation and shadow refresh can affect timings
and draw counters; no uniform speedup or physical-phone certification is claimed.

The plain Vinext production build passes; Vercel packaging and hosted deployment
of this pass have not been verified. These changes are local and unpushed.

## Tangible World, 1 October 2026

These local additions build on published commit `dbfa0e9`. The existing world,
artwork, models, portfolio records, public places, transit, multiplayer, radio,
Linux PC, camera modes and movement controls remain in use.

- The courtyard and its 180 paving instances now receive directional shadows.
  `ground-occlusion.ts` bakes contact shading from the plaza's existing object
  footprints into one 256x256 texture and one static quad, with no per-frame
  calculation or new light. A quieter inset approach leads toward the fountain.
- Civic stone, paving, wood and brass share deterministic height/roughness maps,
  at 64x64 or 128x128 pixels. Original material colors and static batching remain.
  The pavilion gains recessed gallery shelves and timber fins with an open rear
  passage. Roofs, soffits and the identity lintel now have camera bounds.
- Six existing project markers have distinct local miniature studies, driven by
  the existing `Exhibit` sequencer. They illustrate handoff, refinement, memory,
  proximity, component state and lineage; they are not project implementations,
  live services or generated AI responses. The original labels and resume source
  remain. The study dock offers Run/Pause, Reset, component color and source
  controls, and disappears when the visitor leaves or changes world.
- Inspection uses the open garden side: yaw -2.4, pitch 0.52, focus height 6.8,
  and distance `max(22, min(50, 16/aspect))`. Projection and ray tests include the
  real pavilion under the world's 2x scale, preventing the former roof occlusion.
- Nine biome profiles coordinate terrain, riverbanks, roads, foliage and local
  daylight. Road markings vary by architectural family. Terrain positions,
  gravity, roads, rivers, tree geometry and tree counts are unchanged. New quiet
  planetary motifs use the existing gesture-gated synthesizer, mute and volume
  controls; no audio downloads or additional scheduler are introduced.
- Existing residents begin walks from their actual positions, use distance-based
  speed, slow near stops and pause along their routes. Inactive and reduced-motion
  states do not accumulate movement debt.

### Verification

The full 459-test suite passed, including all six study sight lines at desktop,
390px and 320px aspect ratios. TypeScript and scoped runtime lint passed; the
existing unrelated page/world lint baseline was not refactored. The saved test
report is `outputs/playtest/tangible-regression.xml`.

Production acceptance passed all six study control workflows and source access,
5 promenades / 3,276 samples, all nine public venues, the mall gallery, lookout,
both reading courts, day/sunset/night, and all nine planet arrivals and orbital
views on desktop/mobile. Screenshots and canvas-pixel checks are recorded in
`outputs/playtest/tangible-final`. The final duplicate-toast condition is a
subsequent UI-only change; it does not alter the measured scene. After the last
rebuild, a focused production smoke check passed at 1440x960, 390x844, 320x740
and 844x390: no duplicate notice, no overlap with movement, location or header,
44px controls, working source access, and Escape dismissal without pausing.
Short landscape layouts reserve space beside the movement controls. Evidence
is in `outputs/playtest/tangible-final/ui-completion.json` and the four
`completed-study-*.png` captures.

```sh
npm exec --yes --package=playwright -- node scripts/check-capital.cjs --quality=balanced --all-planets --studies --biomes --output=outputs/playtest/tangible-final
```

### Rendering Cost

The control is the published-version production build archived under
`outputs/performance-source/tangible-control-dist`, not the older flagship
control. Its server entry SHA-256 is
`cdd17d0bb50530ceba26c490dfba1e3bcd83d9efcd7972df6d841b029444ea69`.
Both builds used Chrome, Balanced quality, DPR 1 and the same desktop GPU;
each location had 90 warm frames followed by three 90-frame samples.

| Location | Mobile Baseline -> Updated | Desktop Baseline -> Updated |
| --- | --- | --- |
| Plaza | 30.37 -> 28.89 ms | 37.78 -> 51.85 ms |
| Mall | 27.41 -> 22.96 ms | 57.59 -> 38.70 ms |
| Citadel | 19.81 -> 17.78 ms | 17.78 -> 20.56 ms |

Reversing the desktop execution order gave baseline -> updated means of
52.22 -> 45.18 ms at the plaza, 66.66 -> 64.25 ms at the mall, and
20.74 -> 25.92 ms at the Citadel. Desktop results are variable and not uniformly
faster; the Citadel was slower in both desktop pairs. No general speedup,
sustained frame-rate target or physical-phone certification is claimed.
Mobile plaza heap increased from 244.62 to 246.67 MiB. Reports are under
`outputs/performance/tangible-final-{desktop,mobile}` and
`outputs/performance/tangible-reverse-desktop`; the reverse report's `control`
label means the updated build, as its recorded URL confirms.

The plain Vinext production build passes. Vercel packaging and hosted deployment
of these additions remain unverified. No changes in this pass have been pushed.

## Flagship Architecture and Composition

This pass builds on the existing city and rendering optimizations. It does not
replace the environment, authored models, public venues, transit, multiplayer,
radio, resume, or interactive machines.

- `app/capital-pavilion.ts` frames the existing identity plaque with three
  folded ceramic roofs, graphite soffits, joined timber details and inset glass.
  The central approach remains open; new piers have walking and camera bounds.
  The pavilion is statically batched and adds no real-time lights.
- The fountain's finial now has a physical support. Muted, staggered paving
  slabs give the courtyard a quieter rhythm without adding meshes per tile.
  Deeper foliage, matte bark, lower environmental fill and clearer dry-weather
  haze retain the original tree geometry and weather behavior.
- Both live bulletin screens now occupy west-facing reading bays at
  (-77, 152) and (-77, 194), with a shared walk and separate street approaches.
  Original feeds, texture resolution, sources, timestamps, rear faces, paging
  and reduced-motion behavior remain. Shortcuts face the correct board.
- `app/transit-canopy.ts` gives all ten existing gateways different roof forms:
  folded atelier sails, Forge butterfly, Cache barrel vault, Citadel terraces,
  Petal swept eaves, Solstice pergola, Cloud ribbons, Research instrument fold,
  Foundry sawtooth and Skills timber gable. Each stays within the old platform
  footprint and below 2,500 triangles. Platforms, boarding points, driving
  routes and the original camera-solid canopy slab remain.
- Glazing can declare bounded `nightIllumination`; pavilion clerestories use
  0.24 and gateway glazing 0.14, versus the default 0.42. Daytime emission is
  restored exactly, and batching preserves different authored light levels.
  Existing lamp pools and fountain lighting remain the main local night accents,
  without additional shadow-casting lights.
- Third-person orbit uses frame-rate-independent easing. First-person aiming,
  reduced motion and obstruction clamping remain immediate. Camera mode changes
  preserve the displayed heading. Authored plaza, reading-court and planet
  views refit when the aspect ratio changes until manual orbit or zoom takes
  ownership; saved Close and first-person modes remain authoritative.
- The lighter vignette reveals more of the world. All five category menus and
  transparent movement controls remain, with one contextual command available
  only when a nearby interaction is active and no blocking interface is open.

Portrait plaza framing uses yaw -0.035 and distance `max(60, min(135, 32/aspect))`.
Tests include every pavilion roof corner, the identity plaque, fountain and
courier at desktop, 390-pixel, 320-pixel and landscape aspect ratios. A broader
initial portrait view was rejected after it increased mobile rendering cost.

Verification includes 447 passing regression tests, followed by seven focused
camera/pavilion checks after the final framing adjustment and 16 focused checks
after the final night-aware batching guard. TypeScript and scoped runtime lint
pass. The full touch workflow produced 28 captures with no browser errors.
Expanded production capital acceptance passed all nine public venues,
5 promenades / 3,276 samples, both reading-bay approaches, contextual buttons
at four viewport sizes, animated fountain geometry, and all nine satellite
arrivals on desktop and mobile:

```sh
npm exec --yes --package=playwright -- node scripts/check-capital.cjs --quality=balanced --all-planets --output=outputs/playtest/flagship-final
npm exec --yes --package=playwright -- node scripts/check-hud-dropdowns.cjs --touch
npm exec --yes --package=playwright -- node scripts/check-camera-lifecycle.cjs --browser=chrome --quality=balanced --mobile --recover
```

After the final batching guard and rebuild, the mobile Chrome lifecycle check
passed repeated camera-mode changes, orbit and zoom, and intentional context
loss/restoration. It retained one document, canvas and scene, restored the same
player position, and verified nonblank rendering. The full capital captures and
timing samples precede that final guard; its geometry, visibility and night-level
contracts were verified by the focused tests.

The comparison control is the previous optimized production build, archived in
`outputs/performance-source/flagship-control-dist`, not the published commit or
the older unoptimized city. The final fixed-quality mobile-emulation comparison
is in `outputs/performance/flagship-verified-mobile/metrics.json`:

| Location | Previous mean frame | Updated mean frame |
| --- | --- | --- |
| Plaza | 27.22 ms | 28.33 ms |
| Mall | 20.74 ms | 21.67 ms |
| Citadel | 18.70 ms | 17.41 ms |

Plaza heap was 243.69 -> 244.58 MiB. These are local Chrome samples on the same
desktop GPU with a mobile viewport, Balanced quality and DPR 1, using three
90-frame runs after 90 warm frames. They are not physical-phone certification.
Desktop timings were mixed (plaza 67.40 -> 36.67 ms, mall 39.44 -> 51.66 ms,
Citadel 21.11 -> 19.81 ms); no general speedup or frame-rate guarantee is claimed.
The initial wider-camera reports under `flagship-comparison` and `flagship-final`
are intermediate experiments, not the final mobile result. Draw counters vary
with shadow refresh and are not a universal per-frame cost.

The plain Vinext production build passes. Vercel packaging and hosted deployment
were not rerun for this pass; the earlier Windows packaging limitation below
remains unverified. This flagship pass was subsequently published as `dbfa0e9`;
the newer Tangible World additions above remain local.

## Visual Refinement, 29 September 2026

The visual hierarchy pass retains all worlds, models, activities, destinations,
camera modes, public-place interactions, and portfolio content.

- Day/night presets now use lower ambient fill and clearer directional light.
  Clear-weather haze is pushed farther back; rain, storm, snow, and fog still
  use their weather-controlled visibility. Live weather readings are unchanged.
- Market and news screens keep their locations, feeds, paging, and reading
  controls, but their width is reduced from 30 to 18 local units. Their supports,
  collision bounds, and dedicated reading camera follow the new dimensions.
- The plaza arrival is angled toward the identity sign and fountain. Close
  camera distance is now 24 world units instead of 12. Planet arrivals have a
  wider angled Far view that clears the station canopy. Saved Close and
  first-person preferences still take precedence over authored arrival views.
- Civic signs have dark faces, pale title text, and larger secondary lettering.
  Stone, paving, wood, and satin metal retain distinct finishes rather than
  receiving a uniformly glossy coating.
- Shared 32-pixel contact textures ground civic trees, benches, and the fountain.
  Existing lamp pools now sit above the plaza paving, and fountain underlights
  brighten at night. These changes add no real-time lights.
- All eight arcade shops remain. Each now has identifiable merchandise, framed
  displays, and awnings; the street frontage identifies Code Cafe and Digital
  Bookstore. The central aisle, stairs, galleries, and sky bridge stay clear.
- The World menu leads with Projects, a direct resume reader, Sahil Plaza, and
  Project Garden. Mall, Friends, Travel, and City remain shortcuts. Native
  expandable groups retain the remaining city places, discoveries, books, and
  district atlas. Phone panels are capped at 65dvh, with 44-pixel targets and the
  original transparent movement controls retained.

Large imported models keep their original size through `referenceModelHeight`
in `app/world-config.ts`; smaller billboards no longer resize them indirectly.
The imported model geometry and artwork are not replaced by this pass.

Run the focused browser checks against a running local development build:

```sh
npm exec --yes --package=playwright -- node scripts/check-capital.cjs
npm exec --yes --package=playwright -- node scripts/check-hud-dropdowns.cjs --world-only
npm exec --yes --package=playwright -- node scripts/check-hud-dropdowns.cjs --world-only --touch
```

The capital check verifies five clear promenades, every public venue, the upper
mall gallery, the lookout, resume access, settled day/sunset/night, Close mode,
and streamed Forge/Citadel arrivals on desktop and mobile. The HUD check retains
the action inventory and checks group exclusivity, scrolling, target size,
nonblank canvas pixels, and direct resume access at narrow and landscape sizes.
Captures are in `outputs/playtest/capital` and `outputs/playtest/hud-dropdowns`.

These are local browser and viewport checks, not hosted-deployment verification
or physical-phone performance certification. The high city draw count remains
a performance limit; this visual pass does not claim a frame-rate improvement.

The 423-test regression suite and TypeScript check passed. The final arrival
test additionally loads real planet detail and applies the same world-scale
collision transform as the app. Browser checks confirm settled arrival camera
distances of 62 units on desktop and about 73.6 on a 390-pixel phone viewport.
Application client/RSC/SSR compilation passed, but the final Vercel packaging
step hit the existing Windows `EBUSY` copy error for nested `content-type` files
on both attempts. A complete packaged build and hosted deployment of this pass
are therefore unverified. Existing page-ref/link and world-variable lint
diagnostics remain; the other touched runtime modules lint cleanly.

## Verification, 20 September 2026

Run with Node 24:

```sh
node --test --test-concurrency=4 tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --full --prefix=kingdom-optimized
```

The full behavioral suite passed 143 tests. Added checks cover edge geometry,
independent material animation, physical-material batching, ground detail bounds,
reduced motion, Commons sight lines, clear cross streets, and the open atrium.

The visual harness launches isolated headless Edge with software WebGL. It uses
in-memory browser storage and denies location permission; it does not modify the
user's saved game. Captures include the workshop, CPU/RAM/GPU, Commons, Pixel, an
asserted metro arrival on Cache Gardens, and the project panel. Responsive checks
cover 1440x960, 390x844, 320x740, 375x812, 680x850, and 844x390, plus Low quality and
restored Balanced quality. Checks include nonblank canvas pixels, moving content,
walking, loaded fonts, toolbar target sizes, map overlap, and shader errors.
Screenshots are in `outputs/playtest/kingdom-optimized-*.png`.

Software-rendered viewport tests are not real-phone performance certification.
Render counters include post-processing and any shadow refresh in the sampled
frame; they should not be compared directly with earlier scene-only counters.
The existing frame-time and draw/triangle goals remain targets, not a claim of
sustained performance across every route.

Optimized sampled frames: CPU 432 draws / 520,410 triangles; RAM 542 / 569,168;
GPU 649 / 605,372; Commons desktop 1,352 / 717,426; Pixel 1,309 / 700,762.
The wider Commons and Pixel samples still exceed the existing 1,100-draw and
650,000-triangle targets. Shadow-refresh frames can be higher. These are scene
complexity observations, not hardware frame-rate measurements.

Application RSC, client, and SSR bundles compiled. Vercel packaging failed twice
in Nitro dependency copying with Windows `EBUSY` for the nested `content-type`
package. No deployment configuration was changed; the final Vercel output
manifest was not produced. Resolve the file lock or run the build in a clean
environment before deployment.

Focused lint reported existing page-level render-ref and semantic-role issues,
plus the plain navigation anchors retained for the documented Vinext navigation
workaround. The visual modules themselves produced no lint diagnostics.
