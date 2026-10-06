# Browser Performance and Streaming

## Scope

This pass reduces startup work and resource retention in the existing Living
Computer Kingdom. The original renderer, worlds, models, architecture,
interactions, radio, resume, transit, and multiplayer remain in place. Detailed
planet construction is now demand-loaded; distant city shells are replaced by
the original nearby building detail as scheduled work finishes.

Chrome's reported deployed-page failure was not reproduced locally. Resource
pressure was measured and reduced, but these results do not establish the cause
of that failure or certify the deployed Vercel site.

## Ground-Contact Boundary In The 19:25 Recording

`Recording 2026-10-06 192505.mp4` shows the straight shading boundary crossing
the white paths while the character stays still and the camera rotates. The
11.11-second original is unchanged; review frames are under
`outputs/performance/oct6-192505-review`.

Matched close-camera captures isolate `Blender_BakedGroundContact`: hiding
only that world-sized overlay removes the boundary while real cast shadows
remain. Its negative polygon offset pulled the transparent plane through
slightly raised paving, with the intersection changing with camera angle.
`app/ground-occlusion.ts` now leaves the overlay unbiased. The texture, opacity,
depth test, world geometry, local contact shadows, and real sun shadows remain.

`scripts/check-shadow-boundary.cjs --depth --distance=30` captures six headings
with the normal material, the former offset as a negative control, and the
global overlay hidden as a reference. The player stays fixed. The pixel check
samples uniform path interiors, excluding antialiased edges, and requires the
enabled normal overlay to match the reference while the former offset fails.
The desktop development check sampled 287,696 pixels: none differed by more
than three channel levels, compared with 189,489 under the former offset.
The rebuilt production mobile check sampled 90,921 pixels, with zero differing
in the corrected case and 86,887 in the control. Both saved 18 captures without
page errors, under `outputs/performance/oct6-contact-depth-pixels` and
`outputs/performance/oct6-contact-depth-production-mobile` respectively.

The ten ground-contact and capital tests, TypeScript, scoped runtime lint,
diagnostic syntax check, and plain production build pass. Logs and source
fingerprints use `outputs/performance/oct6-contact-depth-*`. These are local
results, not a deployment or a new frame-rate measurement. The earlier camera
clipping and shadow-coverage checks below did not resolve this recorded boundary
and must not be treated as proof that it was fixed.

## Camera-Only Shadow Boundary

This was an earlier attempt, not the confirmed cause of the 19:25 boundary.

The follow-up screenshots showed that testing only character movement was not
enough. The new `scripts/check-shadow-boundary.cjs` holds the character at the
plaza arrival and rotates only the camera through six headings. Matched captures
isolate ambient occlusion, sun shadows, and thin paving casters. Shadow-toggle
diagnostics explicitly invalidate material shaders: switching only
`renderer.shadowMap.enabled` can leave cached shader variants in use.

The plaza approach, promenade, and crosswalk overlays now receive real shadows
without casting their own nearly coplanar shadows onto adjacent ground. Their
geometry, textures, walking routes, and the original approach strip are retained.
The sun's orthographic coverage is also expanded from 170 to 512 world units
across, moving the nearby coverage boundary farther from the plaza. The existing
single shadow map and its resolution remain unchanged, so shadows can be softer;
no additional shadow-casting lights or render targets are added.

The 38 affected plaza, batching, controls, world-engine, and planetary-lighting
tests pass, along with TypeScript, scoped runtime lint, and the plain production
build. Production desktop and mobile camera-only checks pass at six headings
each, asserting fixed character position, nonblank rendering, enabled shadows,
512-unit coverage, and receiver-only approach paving. Captures are under
`outputs/performance/oct6-boundary-production-{desktop,mobile}`. The older
617-test and Vercel-build results below describe the preceding focus-only change,
not a new full-suite run for this narrow correction.

## Moving Plaza Shadow Coverage

This coverage improvement did not remove the camera-dependent overlay boundary.

The later recording showed a light rectangle moving with the character and
interrupting cast shadows. The earlier removal of the fixed
`Capital_QuietApproach` paving strip targeted the wrong rectangle; that strip
and its original behavior have been restored.

The directional shadow map previously followed the character everywhere. Its
finite footprint could cross the courtyard as the visitor moved, leaving
parts of existing plaza shadows outside the map. Shadow following now supports
a stable focus region: the plaza uses its center and 27-unit radius, then
smoothly blends back to normal character following over the next 24 units.
Map size, shadow resolution, light direction, and texel snapping are unchanged.
The three-dimensional focus distance retains normal behavior for distant
planets and high flight.

The regression includes an unfocused control that clips the plaza at a real
walking position. With the focus enabled, the whole paving perimeter stays
inside the shadow map, movement inside the plaza does not change its footprint,
and leaving the region does not jump the shadow target. The test initializes
the shadow projection as Three.js does when allocating the map.

The live browser check visits five character positions with sun shadows enabled.
It measures the target's distance from the plaza center and the paving's margin
from the map edges, retaining the original approach surface. Captures and the
initial results are under `outputs/performance/oct6-plaza-shadow-focus-live`.

Final production desktop and mobile checks pass with at least an 18.25 percent
map-edge margin throughout those positions. Shadow targets stay within 0.027
local units of the plaza center, accounting for texel snapping, rather than
following the moving character. Camera sweeps, mode changes, preview unloading,
and graphics recovery pass; desktop planet travel also returns to zero detailed
residents. All 617 Node tests, TypeScript, scoped lint, and both production build
targets pass. Results are under `outputs/performance/oct6-shadow-focus-production`
and `oct6-shadow-focus-*.log`, with source fingerprints checked around each gate.

## Recorded Camera-Motion Flicker, 6 October 2026

The supplied 14:44 recording is 15.68 seconds at 1124 x 914. It shows the
plaza during camera rotation, a case not covered by the earlier stationary
pixel comparison. Extracted review frames are kept locally under
`outputs/performance/oct6-recording-review`; the original recording is unchanged.

The orbit camera retained a 0.1 near plane at long viewing distances. A regression
using the plaza's paving/contact heights found only 2.75 depth steps in an
initial 24-bit depth-budget sample. The camera now chooses a near plane equal
to two percent of its actual orbit distance, capped at 2.5 and never below the
original near plane. This increases separation between closely layered surfaces
without changing their geometry, graphics quality, or the far view distance.

First-person and interior views retain their original close clipping plane.
Obstructions that bring the camera closer also reduce the near plane. Flight,
shared activities, and planet observation reset clipping when they take over the
shared camera. GTAO already updates its near/far and projection uniforms each
frame, so no postprocessing implementation was replaced.

The regression sweeps 24 angles at three orbit distances and checks the paving
layers stay at least four depth steps apart. It also covers first-person,
interior, close-view, and controller-handoff behavior. The browser check
`scripts/check-camera-lifecycle.cjs --flicker` performs real mouse drags, checks
48 rendered frames for depth separation and nonblank output, and saves three
view captures. The initial live sweep retained at least 5.79 depth steps at
the recording's viewport. These checks target depth shimmer, not the separate
frame-rate bottleneck or a guarantee against all texture aliasing.

All 616 Node tests, TypeScript, scoped runtime lint, and both Vercel and plain
production builds pass for this source. Logs use
`outputs/performance/oct6-flicker-*.log`, with source fingerprints in
`outputs/performance/oct6-flicker-source.json`.

The production motion checks also pass at 1124 x 914 and 390 x 844. Across
48 moving frames each, the minimum paving-layer separation was 5.79 and 5.90
depth steps respectively. Camera-mode cycles, project-preview unloading, and
forced WebGL loss/restoration retained the same document, scene, canvas, and
player position, with no captured page errors. Desktop planet travel retired
all inactive detail. Captures and results are under
`outputs/performance/oct6-flicker-production`.

## Verified Follow-up, 6 October 2026

This follow-up addresses the outstanding failures from `048071e` while retaining
its project boards, named fallbacks, scheduling, shops, and world interactions.

### Corrected Failures

- The rocket porthole assembly now sits 0.12 local units farther forward, clear
  of the hull. The visibility regression checks both fallback and authored
  rockets, along with their original operating bounds and animation bindings.
- Nitro's tracer collected multiple physical copies of the same package version
  and copied them concurrently to identical destinations. The supported
  `traceOpts.hooks.tracedPackages` hook now deduplicates package-relative output
  paths. Duplicate sources must be byte-identical; conflicting contents fail
  explicitly, and separate package versions remain separate. The complete
  Windows Vercel build, including Nitro packaging, now succeeds without modifying
  dependencies or suppressing errors.
- Graphics restoration now prepares visible shaders asynchronously before
  restarting the frame loop. A generation guard rejects stale recovery
  callbacks. The previous direct first render timed out after a multi-planet
  tour; the same production test now restores the existing canvas, scene, and
  player position. Timer-based event polling alone did not fix the stall.

### Rendering Corrections

Premium surfaces clone texture objects per material. UUID-only texture keys
prevented otherwise identical scenery from batching, while resident instancing
rejected mapped materials entirely. Known immutable premium textures can now
share batches when their image source, UV matrix, channel, wrapping, filtering,
format, color space, and other sampling settings match. Custom textures retain
identity-based separation; authored-material and animated-part exclusions remain.

Fixed stairs and rails now use fewer than twelve meshes while the service lift
remains independent. The collectible press batches fixed decoration without
removing its needles, glass, illuminated core, stock controls, or animation
targets. Three.js type flags at the import boundary also allow real ESM-loaded
GLTF meshes to be checked by the CommonJS regression harness. Clearance tests
check actual batched triangles and instances rather than bounding empty gaps.

### Follow-up Measurements

The control is the preserved production build of `048071e`, served separately
from the candidate. Both use the same Chrome process, Intel Arc Pro GPU,
1440 x 960 viewport, DPR 1, fixed Balanced quality, and static project-page
fixtures. Each view warms for 90 frames and records three 90-frame windows;
values below are the median run's mean interval and derived FPS. No profiler
or draw instrumentation is active during this comparison.

| View | Before ms / FPS | After ms / FPS |
| --- | ---: | ---: |
| Plaza | 49.63 / 20.15 | 45.74 / 21.86 |
| Project gallery | 22.22 / 45.00 | 20.55 / 48.65 |
| Returned plaza | 56.11 / 17.82 | 49.26 / 20.30 |
| Planet | 25.92 / 38.58 | 27.96 / 35.76 |

Mainland average frame time improved, but its p95 remained about 66.7 ms and
the dense plaza is still below 30 FPS on this machine. Planet mean frame time
regressed in this sample. These changes therefore do not establish a complete
lag fix or universal FPS improvement. Sampled plaza draw calls fell from 3,215
to 2,294; individual draw counters include phase-dependent shadow work and
cannot be treated as per-frame averages. Post-GC plaza heap was 384.71 versus
382.80 MiB, not a large memory reduction.

The separate instrumented probe reported scene-render CPU time of 61.17 versus
45.41 ms before the final stair, press, and recovery changes. It helped locate
the excess submissions but is not substituted for the final route above.
Control-first ordering, caches, asset activation, and machine load still affect
this single paired comparison. Results and screenshots are preserved in
`outputs/performance/oct6-resolution-production-desktop/metrics.json`.

### Follow-up Verification

All **615 Node tests pass**, including the former rocket failure. TypeScript,
scoped lint for all changed runtime/configuration files, the full Vercel build,
and the plain production build pass. Source fingerprints were checked around
each test/build and final browser run after an overlapping edit was detected;
the user chose to retain the published features, which were restored before
the successful verification.

Production desktop/mobile camera cycles, zero paused draws, single-loop resume,
project iframe unloading, and forced WebGL loss/restoration pass. Desktop rapid
travel retains at most two detailed planets and retires to zero. Recovery uses
the existing low-quality fallback; normal benchmark quality is unchanged.
Screenshots and canvas-pixel checks confirm nonblank rendering. These are local
browser checks, not deployment or physical-phone certification. The earlier
stationary lighting probe did not reproduce persistent flicker; no claim is
made that every device-specific lighting issue is eliminated.

Verification logs use `outputs/performance/oct6-resolution-verified-*.log` and
`oct6-resolution-final-browser-*.log`; final camera captures are under
`outputs/performance/oct6-resolution-final-lifecycle`.

## Runtime Follow-up, 6 October 2026

This pass targets retained iframe applications, hidden transform traversal,
static draw submission, and idle scheduling. It preserves the existing world,
models, interactions, project links, and graphics-quality choices.

### October Runtime Changes

- `app/project-page-previews.ts` bounds live project pages to one at Balanced
  or Low and two at High. Frustum and occlusion checks choose nearby previews;
  leaving the gallery, pausing, or hiding the document unloads them. Short
  changes of view use a 2.5-second idle grace period. All five physical boards
  retain their permanent project names and fallback displays. Visibility
  selection runs at 250 ms intervals, blocker scans at five seconds, and CSS3D
  rendering is skipped when neither the camera nor the preview state changed.
- `app/static-transforms.ts` suspends matrix traversal beneath explicitly hidden
  mainland and city LOD roots, then forces an update when they become visible.
  Direct world-position queries still work while a root is hidden.
- `app/world.ts` owns one demand-aware animation-frame request. Paused or hidden
  worlds do not keep drawing; resume, resize, and context restoration request
  the next frame without starting a second loop.
- `app/static-batching.ts` supports exact-material batching for authored shops,
  preserving textures and independent recoloring. Transparent authored meshes
  retain their sorting. Batches now preserve original shadow-casting,
  shadow-receiving, depth, and emissive roles instead of inventing casters or
  merging incompatible state. Raised shop lettering uses fewer subdivisions
  without changing its dimensions or glow.
- `app/planet-lighting.ts` parallel-transports its ground tangent independently
  of avatar heading. Turning in place no longer rotates the planetary sun.
- `app/work-scheduler.ts` uses available idle time, retains a fixed 150 ms
  deadline across short idle retries, and runs one queued task per callback.
  Priority, cancellation, and the timer fallback remain. An individual task is
  still synchronous; this does not make expensive construction preemptible.

### October Production Comparison

The control is commit `f08b534`, archived under
`outputs/performance-source/oct6-matched-control` without changing the working
tree. Both plain Vinext production builds passed and used the same dependencies,
Chrome process, Windows/Intel Arc Pro GPU, 1440 x 960 viewport, device scale
factor 1, and fixed Balanced graphics. The control runs first in a separate
browser context. Each view warms for 90 frames and measures three 90-frame
windows; the table reports the median run's mean interval and derived FPS.
The five external project URLs use identical lightweight HTML fixtures, not
their real network-dependent applications. CPU profiling is disabled.

| View | Before ms / FPS | After ms / FPS |
| --- | ---: | ---: |
| Plaza | 55.55 / 18.00 | 74.26 / 13.47 |
| Project gallery | 25.00 / 40.00 | 28.33 / 35.30 |
| Returned plaza | 76.11 / 13.14 | 69.44 / 14.40 |
| Planet | 34.44 / 29.03 | 30.37 / 32.93 |

This run does **not** establish an overall FPS improvement. Initial plaza and
gallery timing regressed, while the return and planet improved. Plaza p95 rose
from 83.4 to 100 ms; returned-plaza p95 fell from 116.7 to 83.4 ms. The dense
mainland remains below 30 FPS and its rendering bottleneck is not resolved.

Sampled plaza draw submissions fell from 3,193 to 2,784, but planet submissions
rose from 917 to 1,182; these counters include shadow/postprocessing phases.
Post-GC plaza heap was 380.13 versus 384.27 MiB, so no heap reduction is claimed.
The world-ready marker was 23.00 versus 19.86 seconds, but it is not standardized
TTI or a repeated cold-cache measurement. Cache order, asset activation,
animation phase, and machine load remain sources of variation.

The reproducible lifecycle gain is bounded embedded applications: the control
retained all five even after leaving and travelling to a planet; the candidate
loaded one in the gallery and zero after leaving. Other boards retained their
named fallbacks. Earlier development runs varied substantially and are not
substituted for this production comparison.

Results and screenshots are in
`outputs/performance/oct6-matched-production-desktop/metrics.json`. With both
builds served separately and Playwright available, reproduce the route with:

```sh
node scripts/compare-runtime.cjs --control=http://127.0.0.1:4333/ --candidate=http://127.0.0.1:4334/ --projects --label=oct6-matched-production
```

### Verification and Limits

TypeScript and the seven optimized standalone runtime modules pass their scoped
lint checks. The complete Node run passed 611 of 612 tests. The sole failure is
the previously recorded rocket hull/porthole visibility assertion in
`tests/transit-motion.test.cjs:145`; no vehicle geometry was changed here. After
the final idle-deadline correction, all ten resource/planet-streaming tests
passed, including repeated insufficient idle slots, priority, and cancellation.

Desktop and mobile-viewport browser checks measured eight active draws, zero
paused draws, and eight resumed draws. They verified bounded project previews
and zero loaded iframes after leaving. Desktop rapid planet travel stayed within
two detailed residents and retired to zero; mobile WebGL loss/restoration kept
the same document, scene, player position, and canvas. Screenshots and canvas
sampling were captured; these checks do not certify physical phones.

The frozen-camera lighting probe explicitly rendered 32 samples, found 554
quantized colors, and observed at most five changed pixels out of 16,000.
Persistent at-rest flicker was not reproduced. This finite stationary check does
not prove that every movement-dependent or deployed lighting issue is fixed.
The associated CPU trace contained a long timing gap and is not used as a
performance comparison.

The Vercel client, RSC, and SSR compilation stages succeeded, but Windows Nitro
packaging again failed with `EBUSY` while copying `content-type@2.1.0`.
Deployment packaging therefore remains unverified; no hosting configuration was
changed to hide that failure.

## Runtime Follow-up, 29 September 2026

The follow-up targets rendering CPU cost after the visual refinement pass. The
control is a snapshot of that working tree, not the older published tree:
`outputs/performance-source/visual-control` contains 552 copied tracked files
and their SHA-256 fingerprints. The parent revision is
`168dc87fca0a640923c1eaf27846ab2ac844f13f`. The snapshot includes the pending
visual refinements and excludes personal files and generated outputs.

An initial diagnostic captured a long first-use shader stall, thousands of draw
submissions, and repeated matrix traversal. A separate production probe found
about 47.6 ms in rendering per frame, versus a 16.6 ms frame cadence with drawing
temporarily disabled. Halving render resolution only reduced the frame interval
from about 59.8 to 56.3 ms. That pointed to rendering CPU work rather than a need
to reduce every model or the screen resolution.

### Retained Changes

- `app/static-transforms.ts` caches explicitly immutable branches. It skips
  descendant matrix updates only while the parent/local transforms and child
  identities are unchanged. Streamed replacements invalidate the cache.
- `app/static-batching.ts` groups compatible static pieces within 40-unit
  tiles. Original vertex positions, materials, camera bounds, and excluded
  animated objects remain intact.
- `app/visible-geometry.ts` holds city roofscape vertices once per material,
  replacing duplicate per-block and regional silhouette buffers. It compacts
  the index buffer to the visible block ranges for the current camera/shadow
  pass and only uploads it when that selection changes. Nearby full building
  envelopes and facades still replace the same silhouettes at their existing
  distances. This is batching and culling, not geometric simplification.
- `app/resident-instances.ts` draws repeated rounded resident parts through
  shared instances, while the existing character objects retain their own
  animation, colors, expressions, interactions, and collision positions.
  Hidden stations and vehicle-parent transforms are respected.
- `app/shader-preparation.ts` serializes Three.js asynchronous compilation
  using the active presentation target. Initial visible shaders prepare before
  the frame loop begins; new large models, city detail, and planet detail
  prepare before activation. Cancellation cannot attach abandoned detail, and
  final renderer teardown waits for active preparation. Shader error checking
  remains enabled.

Two experiments were removed: a `BatchedMesh` city variant increased render
cost on this GPU, and a global position/rotation comparison wrapper added more
overhead than it saved. Only the targeted static transform caches remain.

### Fixed-quality Comparison

Both builds use plain production Vinext, Chrome on the same Windows computer
with Intel Arc Pro graphics through ANGLE, device scale factor 1, and explicit
Balanced graphics. No CPU sampling is active during the comparison. Each
location warms for 90 frames and then takes three 90-frame samples. The table
shows the mean frame interval of the median run, with FPS derived from it.

| View | Before ms / FPS | After ms / FPS |
| --- | ---: | ---: |
| Desktop plaza, 1440 x 960 | 69.07 / 14.48 | 62.96 / 15.88 |
| Desktop mall | 70.00 / 14.29 | 61.48 / 16.27 |
| Desktop Citadel | 33.15 / 30.17 | 30.18 / 33.13 |
| Mobile viewport plaza, 390 x 844 | 35.74 / 27.98 | 30.37 / 32.93 |
| Mobile viewport mall | 36.66 / 27.27 | 29.26 / 34.18 |
| Mobile viewport Citadel | 25.93 / 38.57 | 20.92 / 47.79 |

Desktop world-ready time was 20.68 s before and 13.01 s after; mobile-viewport
time was 18.52 s before and 12.02 s after. The ready marker is not standardized
TTI, and these startup samples are not a repeated cold-cache benchmark.

At the desktop plaza, post-GC heap fell from 273.82 to 244.90 MiB, unique geometry
buffers from 180.77 to 155.37 MiB, and scene object count from 21,209 to 12,537.
Sampled draw submissions fell from 3,255 to 2,054 in the plaza and 3,275 to 2,222
at the mall. Counters include shadow/postprocessing passes; individual snapshots
are phase-dependent and some planet/mobile snapshots are higher, so this does
not establish a draw-count reduction at every location.

The improvement is not uniform: the selected desktop-plaza p95 was 83.7 ms
before and 100 ms after; mall p95 stayed about 83.5 ms. Average frames improve,
but worst-frame pacing is not solved. The wide desktop city remains around
16 FPS on this machine, below the 30/60 FPS targets.

The control runs before the candidate in one Chrome process. Shared browser or
driver caches and machine load can affect results. Three timing windows are
not three independent sessions, and touch emulation uses the desktop GPU, not
a physical phone. The comparison is local evidence, not a field-performance
guarantee or proof of the original deployed Chrome crash's cause.

Results and screenshots are in
`outputs/performance/runtime-comparison-{desktop,mobile}/metrics.json`.
Earlier `runtime-production-candidate`, `runtime-production-after`, and
`visual-runtime-*` reports are intermediate experiments, not the final comparison.

### Verification and Reproduction

All 438 Node regression tests passed, followed by focused callback-binding
checks. TypeScript and the optimized runtime modules passed; the existing
`app/world.ts` variable warning and page-level lint findings remain outside
this task. The full production city walkthrough preserved all five promenades,
public-place interactions, mall gallery, lookout, resume access, night lighting,
and loaded planet arrivals.

Chrome desktop/mobile camera cycles and forced WebGL loss/restoration passed
with the same document, canvas, scene, and player position. Desktop rapid travel
settled within the two-planet residency target and returned to zero detailed
residents after retirement. No unexpected page error, renderer crash, or context
loss occurred in those checks. This finite test is not a claim that all leaks or
device-specific crashes are eliminated.

```sh
node scripts/build-performance.mjs
npm exec --yes --package=playwright -- node scripts/compare-runtime.cjs --control=http://127.0.0.1:4310/ --candidate=http://127.0.0.1:4311/
npm exec --yes --package=playwright -- node scripts/compare-runtime.cjs --mobile --control=http://127.0.0.1:4310/ --candidate=http://127.0.0.1:4311/
npm exec --yes --package=playwright -- node scripts/profile-world.cjs --quick --runtime-cpu --label=runtime-diagnostic --url=http://127.0.0.1:4311/
```

Serve the preserved control and current candidate separately before comparison.
The plain production builds succeeded. Vercel-specific Nitro packaging remains
unverified following the previously observed Windows `EBUSY` copy issue; no
hosting configuration or deployed resources were changed by this runtime pass.

## Earlier Streaming Measurements

The control is published commit `40fc5daf4c8a30673413b56e31861df14c7a7487`.
Both versions used local production Vinext builds, installed Chrome, Intel Arc
Pro graphics through ANGLE, a 1440 x 960 viewport, device scale factor 2, and
automatic graphics quality on the same Windows computer. CPU sampling was
disabled for these runs. These are one paired run, not a field benchmark.

| Metric | Before | After |
| --- | ---: | ---: |
| Application world-ready marker | 155.82 s | 20.49 s |
| First contentful paint | 1.752 s | 0.920 s |
| Settled JS heap after GC | 476.15 MiB | 275.10 MiB |
| Unique geometry buffers | 353.54 MiB | 180.34 MiB |
| Estimated uncompressed scene textures | 907.09 MiB | 372.89 MiB |
| Scene objects | 27,639 | 21,160 |
| Sampled draw calls | 2,870 | 2,870 |
| Sampled triangles | 1,450,818 | 1,369,370 |
| Mean frame interval, 120 frames | 102.59 ms | 63.63 ms |
| p95 frame interval | 149.9 ms | 100.0 ms |
| Derived frame rate | 9.75 FPS | 15.71 FPS |
| Encoded bytes completed by readiness | 20,466,649 | 14,724,874 |
| Script bytes completed by readiness | 1,902,577 | 1,773,169 |
| Detailed planets resident at startup | 9 | 0 |

World readiness improved by about 87%, settled heap by 42%, and mean frame
interval by 38%. Draw calls did not improve in the sampled wide view, and frame
rate remains below the 30/60 FPS targets.

During repeated Forge/Citadel/home travel, the optimized post-GC heap peaked at
355.98 MiB with two resident detailed planets. After returning and allowing the
15-second retirement interval, residency returned to zero and heap to
280.35 MiB, close to the initial settled value. This finite run is not proof
that every possible resource leak is absent.

The ready marker is not standardized TTI. Texture sizes are RGBA-plus-mipmap
estimates, not measured GPU VRAM. Readiness network bytes exclude downloads that
complete later; model files have not been compressed. Automatic quality can
adapt during the runs. Mobile checks below emulate a viewport and touch input
on this desktop GPU, not a physical phone.

## Implementation

- `app/spatial-index.ts`, collision owners, and the camera restrict exact
  intersection work to local candidates. Indexed venue and grove collisions
  are checked against their brute-force equivalents.
- `app/walking-route.ts` uses stable A* with a per-search occupancy cache.
  The long-route fixture needs 12,711 collision-predicate calls, below its
  18,000-call budget, while retaining exact segment checks.
- `app/planet-streaming.ts` retains lightweight orbital proxies and stable
  roots, deduplicates loads, cancels abandoned work, sleeps inactive detail,
  and disposes retired detail. Normal residency targets two planets after
  trimming, with active/observed destinations protected. Realm demo selection
  and fetched repository data survive detail reloads.
- `app/work-scheduler.ts` schedules priority-ordered construction chunks.
  City neighborhoods asynchronously replace per-address shells with full
  nearby envelopes and facades, releasing them again outside the detail range.
- `app/asset-manager.ts` and `app/world-assets.ts` prioritize and serialize
  large model downloads after initial readiness. Download buffers are shared;
  parsed Three.js scenes are independently owned and disposed. The press keeps
  its existing loader.
- `app/page.tsx` loads the world asynchronously and lazily loads optional
  panels and the resume reader. Cancellation prevents late world attachment.
  Ready-dependent effects preserve deep links and pause state.
- Device-aware pixel budgets limit renderer and bloom allocations. Shader
  uniform textures, skeletons, and disposed lighting-registry entries are
  released. Small signs use smaller canvases; resume page artwork is unchanged.
- Hidden station residents and traffic stop simulation until visible again.
  WebGL loss suspends the existing loop; restoration resumes the same world
  at a safer render setting without reloading the page.

## Verification

TypeScript passed. Automated coverage includes streaming lifecycle and
cancellation, independent asset ownership, resource disposal, collision
equivalence, camera obstruction, walking routes, transit, planet rotation,
building detail, models, radio, and multiplayer. Existing integration tests
now explicitly await destination readiness before asserting their original
boarding, demo, walking, driving, and collision behavior.

The optimized production build passed Chrome camera-preset/drag cycles at
desktop and 390 x 844 mobile viewports. Document, canvas, and scene identity
remained unchanged. A separate desktop rapid-destination sequence settled
within two resident planets and returned to zero after idle retirement.
Intentionally forced WebGL loss/restoration passed on both viewports with the
same player position and a nonblank canvas verified through pixel sampling
and screenshots. No unexpected context loss or renderer crash was observed.

Plain production builds passed. The local Vercel-adapter build compiled its
client, RSC, and SSR output, but final Nitro packaging failed with Windows
`EBUSY` while copying `content-type/package.json`. Vercel deployment itself has
not been verified. The broad scoped lint command is not clean: it includes
existing UI diagnostics and CommonJS fixture/import rules; no clean global
lint result is claimed.

## Reproduction

Use Node 24 or another version satisfying the package engine requirement. Run
the executable directly when the system PATH points to an older Node version.

```sh
node --test --test-concurrency=2 'tests/*.test.cjs' 'tests/*.test.mjs'
node node_modules/typescript/bin/tsc --noEmit
node scripts/build-performance.mjs --baseline
node scripts/build-performance.mjs
```

The baseline builder archives the published control under ignored
`outputs/performance-source/before` and shares installed dependencies through
a junction. It does not check out a branch or modify tracked control sources.
Serve the two production builds separately, then use Playwright:

```sh
npm exec --yes --package=playwright -- node scripts/profile-world.cjs --label=production-before --production --url=http://127.0.0.1:3002/
npm exec --yes --package=playwright -- node scripts/profile-world.cjs --label=production-after --production --url=http://127.0.0.1:3003/
npm exec --yes --package=playwright -- node scripts/check-camera-lifecycle.cjs --browser=chrome --url=http://127.0.0.1:3003/ --streaming --recover
npm exec --yes --package=playwright -- node scripts/check-camera-lifecycle.cjs --browser=chrome --url=http://127.0.0.1:3003/ --mobile --recover
```

Local results live under `outputs/performance` and
`outputs/playtest/camera-lifecycle`; generated evidence and builds are not
included in Git.

## Remaining Limits

Motherboard construction still contains expensive synchronous work. Shader
preparation reduces first-use waits but cannot remove driver compilation cost.
The scheduler yields between tasks but is not a frame-time budget scheduler.
Lightweight city geometry is still generated initially, now retained once in
shared material buffers. Some Motherboard systems still simulate while
off-world, and the camera periodically rescans visible bounds. Unloaded planet
proxies do not include every detailed landmark.

This pass does not add geometry/texture compression, workers, a BVH, offline
caching, or CDN changes. Further work should target the measured city draw
count and remaining construction/model costs rather than claim these targets
have already been met.
