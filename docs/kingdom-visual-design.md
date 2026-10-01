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
| Bounded highlight bloom, quality switching, render-target cleanup | `app/kingdom-presentation.ts` |
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
