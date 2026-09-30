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
remains unverified. Changes are local and unpublished.

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
