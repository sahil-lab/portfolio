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
