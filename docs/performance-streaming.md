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

## Roaming Resource Cleanup, 10 October 2026

The user reported restarts after roaming between planets and requested that
unnecessary memory be released. The current world was not passing the existing
constrained-device budget or resource-release callback to the planet streamer,
and was not invoking the existing hidden-GPU cleanup or inactive-world flushes.
The published control reproduced the missing cleanup at its first planet: its
memory-tour assertion failed because no hidden-mainland GPU release had run.
It did not reproduce an actual page reload, so memory pressure remains a plausible
cause of the reported restart rather than a confirmed browser crash diagnosis.

The world now connects those existing resource controls:

- Coarse-pointer and low-memory/low-core devices use a target of one detailed
  planet and a three-second inactive retirement window. Other devices retain the
  existing two-planet/fifteen-second cache. Active, observed and in-transit worlds
  remain protected; these protections can temporarily exceed the cache target.
- Entering the existing fully hidden mainland state releases its unshared GPU
  geometry and texture allocations once per visit. This applies on desktop too.
  CPU geometry, scene objects, materials and resources shared with visible
  objects remain intact and re-upload when needed on return.
- Unloading a planet clears retained renderer draw lists. Hiding the document or
  losing the graphics context flushes inactive planets, unloads project previews
  and pauses queued model downloads. The current world, travel destination,
  observed world and active character/shared-activity worlds are protected.
- Visible, render-ready recovery resumes queued assets and the existing render
  loop. There is no new page reload, navigation trap, forced application GC,
  resolution change or removal of scene content.

### Travel Verification

The exact candidate production build was tested in local Chrome on Intel Arc,
using controlled project-page fixtures. Each circuit visited the statue, walked
on planets 1, 2 and 7, and returned to the mainland. Retained-heap samples were
taken only after inactive planets, previews and city-detail loading had settled.
Garbage collection was requested by the test for those measurements, not by the
application.

| Check | Mobile Touch Emulation, Balanced | Desktop, High |
| --- | ---: | ---: |
| Viewport | 390x844 | 1440x960 |
| Tour duration | 196.49 s | 196.19 s |
| Circuits / planet visits | 7 / 21 | 3 / 9 |
| Detailed planets during sampled normal visits | 1 | At most 2 |
| Retained heap on settled returns | 337.79-340.44 MiB | 341.63-342.69 MiB |
| First hidden-GPU release: allocated geometries | 988 to 223 | 2052 to 484 |
| First hidden-GPU release: allocated textures | 116 to 41 | 196 to 52 |
| Unexpected document or scene resets | 0 | 0 |

The geometry/texture figures are actual renderer allocation counts, not VRAM
bytes. The helper also reports attempted releases of resources that may never
have been uploaded; those larger helper counts are not GPU savings.

Both runs passed a controlled visibility-change check: two resident planets
became one, the current planet and player position stayed unchanged, and asset
pause/resume each ran once. An initial version of that test did not protect its
extra planet during loading and failed to establish two residents; the corrected
fixture protects it only while loading, removes protection before cleanup, and
keeps the original assertions. The initial evidence is retained separately.

Both runs also passed camera modes, pause/resume, preview lifetime and forced
WebGL context restoration on the same scene/canvas. Mobile additionally passed
six native swipes across three orientations. Active/paused/resumed render counts
were 8/0/8. The existing low-quality context-recovery policy was not changed.
Planet, mainland-return and recovery screenshots were nonblank and reviewed.
All 33 focused resource/travel tests, TypeScript, scoped world lint and the
production build passed. The full suite and Vercel packaging were not rerun for
this local follow-up.

### Roaming Cleanup Limits

Stable post-GC retention does not imply low transient memory. Peak sampled heap
across the full workflow was 896.87 MiB on mobile emulation (during the later
graphics-recovery phase) and 1058.41 MiB on desktop (during a planet visit with two
resident worlds). These are JavaScript heap samples, not total process memory,
not measured VRAM and not evidence of a remaining leak by themselves. Temporary
allocation peaks and the substantial baseline world still need to be considered
on constrained physical devices.

No explicit automatic reload call was found in the searched application code.
Browser/OS tab termination, device-specific GPU failures, external pages and
network conditions are outside a guarantee that an app can never reload. This
pass fixes a confirmed retention gap and verifies repeated local travel; it does
not certify the user's physical device or establish the exact cause of every
reported restart. No new reload-recovery checkpoint behavior was added.

Evidence: `outputs/performance/oct10-roaming-retention/summary.json`,
`mobile-verified/balanced-mobile.json`, `desktop-verified/high-desktop.json`, their
logs and captures under that directory. `before/` records the published control;
`mobile/` retains the initial visibility-fixture failure. Runtime fingerprints are
in `built-source.json`; `verified-browser-source.json` records the later
harness-only readiness/fixture corrections. The private build is under
`outputs/performance-source/oct10-roaming-retention/` and the candidate preview is
`http://127.0.0.1:4361/`. These are local verification results; hosted deployment
and physical-device behavior have not been certified.

## Interaction Panel Recovery, 10 October 2026

The user reported a blank screen after any interaction on the local preview at
port 4356. The inspected live page retained its canvas, advancing render frames,
finite camera values and 260 sampled colors, with no JavaScript errors or WebGL
context loss. Ordinary E/menu interaction did not reproduce the full report.
That observation does not invalidate the reported failure or establish its exact
cause on the user's existing tab.

A focused fault-injection test did reproduce one concrete interaction-triggered
app failure: rejecting the first Friends panel JavaScript download replaced the
entire application with the framework error page, removing the world canvas.
Suspense handled loading but did not isolate the rejected lazy import.

The five optional panels now use a shared, panel-local error boundary: Friends,
radio, resume reader, machine controls and project-study controls. A failed panel
offers Retry and Close while the world, player state and shared services remain
mounted. Normal imports and loading indicators remain lazy; successful panel
behavior, scene assets and graphics settings are unchanged. Ordinary rerenders
and reopening a failed panel do not create an automatic retry loop.

The first retry implementation preserved the world but exposed the browser's
cached failed module import. Explicit Retry now uses a fresh query parameter for
the expected same-origin panel chunk and validates the named component export.
There is no page reload, cache-wide clearing or quality reduction. A permanently
missing chunk or unavailable server may still leave the panel unavailable; the
boundary keeps that failure from replacing the entire application.

The final production regression passed nine checks each on Chrome desktop High
(1440x960) and mobile Auto touch emulation (390x844): failed-load containment,
dismissal, reopen, successful retry, resumed movement, normal resume/radio/study/
machine workflows and return to the world. Each run intercepted exactly one
failed download, retained one document/scene/canvas and ended with zero unhandled
page errors and nonblank canvas samples (463 and 357 colors). Machine job
submission and study reset were exercised, not just panel visibility.

The existing mobile Auto lifecycle check also passed six native swipes, three
orientations, camera-mode switches, pause/resume, bounded project previews and
forced WebGL loss/restoration. Render scheduling remained eight active, zero
paused and eight resumed frames. The existing low-quality graphics-recovery
policy was not changed. TypeScript, new-module lint and the production build
passed; the unrelated historical full-suite failures were not rerun or modified.

The candidate was built in `outputs/performance-source/oct10-panel-recovery/`
and served at `http://127.0.0.1:4357/`, leaving the existing 4356 build and its
assets intact. Evidence is under `outputs/performance/oct10-panel-recovery/`,
including `desktop-final/`, `mobile-final/`, `mobile-lifecycle/` and source
fingerprints. The original failing control is preserved under
`outputs/performance/oct10-panel-blank-before/`; the initial cached-retry failure
is retained separately. This is a verified failure-containment fix, not a new
frame-rate claim, physical-device certification, hosted deployment or proof that
every possible blank-screen cause has been eliminated.

## Documentation-Guided Optimization, 9 October 2026

This follow-up uses the current working tree, including its existing local visual
changes, as the control. It does not restore a historical visual configuration or
change resolution, lighting, shadows, effects, asset detail, populations or game
rules. The application uses imperative Three.js; React Three Fiber and Drei are
reference material, not new dependencies or a proposed renderer rewrite.

### Research And Applicability

| Source | Relevant Finding | Decision For This Application |
| --- | --- | --- |
| [Three.js r185: many objects](https://raw.githubusercontent.com/mrdoob/three.js/r185/manual/en/optimize-lots-of-objects.html) | Separate meshes have submission and scene-graph overhead; merging can preserve their geometry. | Keep spatial and material boundaries; retain index buffers instead of expanding every triangle. Do not merge independently animated objects. |
| [Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer.html) | `compileAsync` reduces shader-compilation stalls; `initTexture` can move first-use texture upload work earlier. | Shader preparation already exists. Texture upload budgeting is a separate candidate, not something shader compilation alone guarantees. |
| [Drei Instances](https://drei.docs.pmnd.rs/performances/instances) | Declarative instances reduce draws but add CPU overhead; native `InstancedMesh` is recommended for large populations. | Retain native instancing. Require exact geometry equality before sharing a primitive, including edited vertices, normals, UVs and colors. |
| [R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance) and [pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) | Reuse resources and temporary objects; avoid reactive per-frame state and unnecessary remounting. | Cache unchanged rigid camera bounds and refresh shared ancestors once per pass. Preserve existing imperative animation and pause/visibility handling. |
| [Drei BVH](https://drei.docs.pmnd.rs/performances/bvh) | Hierarchical acceleration helps triangle raycasting. | Camera obstruction uses spatially indexed box intersections, not triangle raycasting. A BVH is not a blanket replacement or a proven frame-rate win here. |
| [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) | Batch draws, avoid synchronous GPU queries, keep buffers stable and budget memory. | Consolidate trusted immutable texture clones only when source and sampling state agree. Keep arbitrary custom textures distinct. Measure memory and draws separately. |
| [Three.js r185 disposal](https://raw.githubusercontent.com/mrdoob/three.js/r185/manual/en/how-to-dispose-of-objects.html) | GPU resources need explicit disposal; shared resources and `ImageBitmap` need application-level ownership. | Preserve resource ownership. Do not close images or dispose shared buffers merely because one object is hidden. |
| [Chrome long animation frames](https://developer.chrome.com/docs/web-platform/long-animation-frames) | Frame duration and blocking duration describe different problems; long tasks alone miss cumulative frame work. | Compare fixed-quality frame-time distributions, not just average FPS or JavaScript operation counts. Cross-origin iframe attribution remains limited. |
| [web.dev workers](https://web.dev/articles/off-main-thread) | Offloading can improve input responsiveness without reducing total work; transfers add overhead. | Prebuilt detail and transferable worker geometry are future candidates requiring cancellation, ownership and equivalent-output tests. |
| [Discover Three.js](https://discoverthreejs.com/tips-and-tricks/) | Reuse objects, avoid unnecessary matrix work and test assumptions on target devices. | Apply the principles, not outdated `Geometry`, `outputEncoding` or WebGL 1 texture restrictions to this r185/WebGL 2 application. |

[Drei AdaptiveDpr](https://drei.docs.pmnd.rs/performances/adaptive-dpr) explicitly
trades visual quality for speed, and [BakeShadows](https://drei.docs.pmnd.rs/performances/bake-shadows)
freezes dynamic shadows. Neither is adopted. Lower-resolution textures, new LOD
cuts, lossy texture compression, effect removal and suspended visible animation
also do not satisfy the unchanged-visuals requirement.

### Verified Local Work Reductions

- A rigid obstacle across an initial update and 120 unchanged frames now performs
  one world-bounds rebuild instead of 121. Parent motion, geometry replacement,
  position-buffer changes and edited local bounds invalidate the cache. Grouped
  and deforming obstacles retain live calculations.
- Thirty-two obstacles with one shared parent refresh that parent's transform
  once per camera update instead of 32 times. Moving-door collision still applies
  on the next frame, with the same camera easing and clipping behavior.
- The existing immutable-texture fixture now produces three batches instead of
  twelve. Different source images, UV transforms and channels remain separate.
- Static merging retains indexed vertices. Existing tests compare the expanded
  position, normal and UV arrays exactly; the added edited-primitive regression
  also compares vertex colors and prevents replacing distinct geometry with the
  first primitive. This changes storage and submission, not triangle content.

These are focused work-count and equivalence results, not a 10,000x application
speedup. Even eliminating one subsystem cannot remove the cost of all remaining
simulation, draw submission, shader execution, memory transfer and compositing.
Display refresh rates, browser scheduling, driver support, thermal throttling
and third-party pages impose additional limits. No finite test can establish
that there is no remaining code optimization or guarantee a device never discards
the tab.

The isolated batching control is
`outputs/performance-source/oct9-docs-optimization-control/`. It includes the
camera cache, so subsequent control/candidate rendering comparisons isolate the
batching changes rather than attributing them to the camera. The control shares
unchanged public assets; verification logs are under
`outputs/performance/oct9-docs-optimization/`.

### Production Measurements

The same local Chrome/Intel Arc system rendered both production builds with
Balanced quality, device scale factor 1 and unchanged effects. Each location used
90 warm frames followed by three 90-frame windows; the table reports the median
window's mean and p95 frame interval. Desktop ran control then candidate; mobile
touch emulation ran candidate then control. Values below always mean the old
batcher followed by the optimized batcher, regardless of execution order.

| View | Mean Frame, Before / After | p95 Frame, Before / After |
| --- | ---: | ---: |
| Desktop plaza | 50.48 / 61.29 ms | 74.80 / 83.30 ms |
| Desktop project gallery | 24.09 / 17.41 ms | 25.40 / 17.00 ms |
| Desktop mainland return | 72.05 / 40.00 ms | 97.90 / 50.20 ms |
| Desktop Citadel | 26.85 / 19.26 ms | 33.50 / 33.40 ms |
| Mobile plaza | 22.22 / 23.15 ms | 33.40 / 33.40 ms |
| Mobile project gallery | 16.67 / 16.67 ms | 16.80 / 16.90 ms |
| Mobile mainland return | 22.96 / 22.96 ms | 33.50 / 33.40 ms |
| Mobile Citadel | 17.04 / 16.67 ms | 16.90 / 16.80 ms |

Frame-time results are mixed, not a universal speedup: the initial plaza sample
regressed on both viewports, while mobile gallery and return were essentially
unchanged. The large desktop return improvement is not a promise of equivalent
gains on other devices or visits. Single draw/triangle snapshots vary with shadow
cadence and animation phase and must not be interpreted as removed scene content.

A second desktop pair reversed the execution order. With values still shown as
before / after, plaza measured 149.44 / 144.07 ms, gallery 128.88 / 127.59 ms,
return 150.92 / 144.81 ms and Citadel 119.63 / 115.92 ms. The initial plaza
regression did not repeat, but both builds ran substantially slower in this
session. This variability prevents a robust general frame-rate claim; neither
the first run's larger gains nor the second run's roughly 1-4% improvements should
be presented as guaranteed. The complete reverse-order report is
`outputs/performance/oct9-docs-batching-reversed-desktop/metrics.json`.

Unique geometry typed-array storage decreased identically on both viewports:

| Location | Before | After | Saved |
| --- | ---: | ---: | ---: |
| Mainland plaza | 261.65 MiB | 213.47 MiB | 48.18 MiB |
| Project gallery | 269.04 MiB | 220.86 MiB | 48.18 MiB |
| Citadel | 314.59 MiB | 257.90 MiB | 56.69 MiB |

Post-GC sampled JavaScript heap also decreased by roughly 48-57 MiB. These
measurements overlap and must not be added together; neither is measured VRAM.
Reports are `outputs/performance/oct9-docs-batching-desktop/metrics.json` and
`outputs/performance/oct9-docs-batching-reversed-mobile/metrics.json`.

### Validation And Remaining Limits

Both production builds, TypeScript and scoped runtime lint passed. All 24
camera/input/static-transform tests and all 11 static-batching tests passed. The
full suite passed 689 of 700 tests. All eleven failures reproduced with identical
errors in the untouched control: seven compressed-asset metadata tests, the
missing city meadow field, city-template indexing and two existing tree triangle
budgets. Their owning sources were verified unchanged; assertions and unrelated
local edits were not rewritten to make this pass appear green.

Eleven production desktop/mobile captures covered low, balanced and high
graphics, local time, night and movement, with nonblank canvas, loaded assets and
layout checks. The native Chrome touch run covered six swipes, three orientations,
nine camera-mode changes, pause/resume, bounded project previews and forced WebGL
loss/restoration. It retained one document, scene and canvas, with zero page
errors; frame scheduling was eight active, zero paused and eight resumed renders.
The existing low-quality context-recovery policy is unchanged by this pass.
Representative control/candidate, night, planet and recovery captures were
reviewed. This is not pixel-perfect certification of every possible world state.

Visual evidence is in `outputs/playtest/oct9-docs-optimization-checks.json` and
the corresponding captures; lifecycle evidence is in
`outputs/performance/oct9-docs-optimization/lifecycle/balanced-mobile.json`.
Public assets are unchanged and source hashes remained stable through tests,
builds and browser checks. Project-page fixtures isolate the main app from
third-party content; physical phones, real external scripts and the hosted
deployment are not certified. No deployment or Git publication was performed.

## Statue Preview Safety, 9 October 2026

The reported Vercel restart near the golden statue remains accepted but was not
reproduced locally. This patch removes two independently testable risks in that
area without changing the statue, board geometry, project links, quality settings
or normal live external previews.

Direct self-embeds and project previews inside an already embedded portfolio are
blocked. A portfolio loaded under another deployment alias notifies its parent
before constructing a 3D world. The parent accepts that fixed notification only
from the owning iframe, releases that frame and its residency budget, and keeps
the existing project-name fallback. Later approaches do not retry the rejected
frame. Alias protection requires the embedded deployment to include this guard;
it cannot control arbitrary third-party applications or older deployments.

Board collision queries now reuse one padded box rather than cloning a box for
each candidate. The regression exercises 1,200 queries with identical collision
results and unchanged source bounds: 30,000 temporary box clones before, zero
after. This is an allocation-count result, not a measured whole-app speedup.

Validation used an isolated copy of published commit `9103b24` plus only these
safeguards, preserving its progressive startup, recovery, rendering and asset
implementation. Unrelated working-tree changes were not copied or overwritten.
All 44 statue/control tests passed, along with TypeScript, scoped lint,
`npm run build:vercel` and `node scripts/check-vercel-output.cjs`.

The generated Vercel Fetch handler and filesystem-first static output were served
locally on Node 24. Chrome desktop (1440x960) and mobile touch emulation (390x844)
each passed eight `--preview-safety` checks. A controlled deployment alias loaded
the same portfolio once, allocated zero nested WebGL contexts and did not retry
on three return visits. The other four controlled live HTML pages still loaded.
Both runs retained one document, scene and canvas, with no page errors or context
loss; canvas-pixel checks and reviewed captures were nonblank, with no page
overflow. External fixtures do not certify actual third-party scripts or physical
Safari/Android behavior.

Evidence, captures, build logs, source fingerprints and the local-only Vercel
adapter are under `outputs/performance/oct9-statue-safety/`. The snapshot is under
`outputs/performance-source/oct9-statue-safety/`. The generic Vite preview command
requested a missing `dist/server/index.js`; the tests instead used the actual
generated `.vercel/output` handler and assets.

No deployment was performed. The hosted restart's cause remains unconfirmed,
and browser/OS tab termination cannot be prevented by these guards. Preloading
all five project websites at startup is not implemented; existing bounded,
visibility-based loading is preserved for normal external pages.

## Mobile Input And Hotspot Monitoring, 9 October 2026

The mobile joystick now owns its native pointer lifecycle independently of the
render loop. World input resets release camera pointer captures and emit a
scene-scoped `kingdom-input-reset` event. The joystick releases its own capture,
centers its knob and publishes neutral movement immediately on that event,
disable, pointer cancellation/loss, page hide/show, blur, viewport changes,
graphics loss and unmount. Other camera fingers cannot release its active touch.
Capture failures and missed mouse-button releases leave it usable for a fresh
gesture. Neutral movement does not enable audio and also clears input while paused.

All 18 controls tests and the restored indexed-merge helper check passed, along
with TypeScript, scoped lint and production build. The native Chrome touch test
passed 23 checks covering movement/release, simultaneous camera input, travel
while held, pause/resume, persisted page events, orientation, graphics recovery,
back navigation and a fresh reload. Desktop/mobile captures were nonblank with
one canvas and no horizontal overflow. The navigation test returned a fresh
document rather than a real back-forward-cache hit; persisted page events were
also tested explicitly. This is local touch emulation, not physical Safari/Android
certification or a guarantee against main-thread stalls.

The initial 23-check run used a working tree with separate local changes that
removed saved-location recovery. It verified input reset and fresh-mount paths,
not saved-location restoration. Those local changes and their two build
compatibility repairs are excluded from the mobile-control publication. The
selective commit retains the published recovery, startup, batching and asset
implementations; unrelated working-tree edits remain local.

Control evidence is in `outputs/performance/oct9-mobile-controls/`, including
`browser/joystick.json`, the build source fingerprints and the first harness
failure. That failure attempted a fresh CDP touch before releasing a deliberately
held contact across navigation; the corrected test still asserts that the stale
contact cannot revive movement.

### Hotspot Findings

A separate, earlier local production tour monitored 17 stops on desktop and
mobile, with 68 samples per tour across arrival, movement, camera sweeps and
settled frames. Stops included all five project boards, Lantern Quarter, the
mall, signature shops, outer city detail, commons, workshop, Copper and Prism,
and returns to the mainland. The monitored source is recorded separately in
`outputs/performance/oct9-hotspot-monitor/source.json`; surrounding source changed
afterward, so these are historical diagnostics, not timings for the control fix.

| Observation | Desktop | Mobile Emulation |
| --- | ---: | ---: |
| Settled project-board mean frame range | 39.34-42.63 ms | 33.33-35.61 ms |
| Largest project-board frame interval | 1,333.5 ms | 233.6 ms |
| Plaza camera-sweep maximum interval | 999.9 ms | 1,716.6 ms |
| Copper arrival maximum interval | 6,099.9 ms | 9,133.0 ms |
| Post-GC heap: initial plaza | 342.43 MiB | 339.12 MiB |
| Post-GC heap: mainland return | 429.88 MiB | 426.14 MiB |

Each tour retained one document, scene and canvas, with no unexpected context
loss or recorded frame fault. All five external website requests failed with
`net::ERR_SSL_PROTOCOL_ERROR`, so their actual scripts were not measured. The
observed stalls cannot be attributed to those scripts. Board visits coincided
with neighborhood detail changes, and substantial delays also occurred away
from the boards, especially around planet arrivals and camera sweeps.

One mobile workshop sample contained a 7,142,690.4 ms timing discontinuity and
the run also recorded a network change. That sample is excluded from useful
frame-time conclusions; it is not evidence of a two-hour application stall.
The interrupted mobile run is not a controlled performance baseline. Heap growth
across a single tour includes caches and different residency states and does
not by itself prove a leak. No reload fix or general FPS improvement is claimed
from this monitoring. Raw reports remain under
`outputs/performance/oct9-hotspot-monitor/desktop/` and
`outputs/performance/oct9-hotspot-monitor/mobile/`.

## Lossless Model Loading, 9 October 2026

This follow-up is limited to asset delivery and lifetime safety. The previous
render-cache changes remain in place. No region batching, shadow redesign,
texture recompression, geometry simplification or renderer migration was added.

The three hero GLBs have deterministic gzip packages generated by
`scripts/build-hero-models.cjs`. The existing city-shell prebuild invokes this
step, and `node scripts/build-city-shells.cjs --check` verifies both caches.
Original GLBs remain unchanged and available as fallbacks. The generated
`app/hero-model-manifest.json` records download/decoded sizes and checksum-based
URL versions. Native browser decompression restores byte-identical models,
including textures, materials, rigging and animation data.

| Model | Original Bytes | Packed Bytes | Reduction |
| --- | ---: | ---: | ---: |
| Monument | 6,800,840 | 4,245,783 | 37.6% |
| Companion | 6,117,224 | 4,549,999 | 25.6% |
| Angel | 8,329,360 | 5,708,606 | 31.5% |
| Total | 21,247,424 | 14,504,388 | 31.7% |

`world-assets.ts` fills one bounded decoded buffer, rejects short/oversized or
invalid gzip data, and cancels failed streams. Unsupported native decompression
or failed packed downloads fall back to the existing primary GLB, then the
existing legacy fallback. The canonical asset URL and consumer-owned scene
contract are preserved. Shared download leases still deduplicate requests.

A promise chain bounds parsing, and subsequent downloads wait for the preceding
parse before starting. This avoids accumulating unparsed buffers after faster
transfers. Disposed loaders skip waiting parses, release late decoded scenes,
and reject with `AbortError`; they never hand those scenes to a dead consumer or
start fallback work after disposal. Public-manager disposal uses the same guard.
A more elaborate second decode manager was tested and discarded when it showed
no benefit by itself. No general GPU-memory budget is claimed here.

### Measurements And Tradeoffs

Real GLBs were loaded in baseline/candidate/candidate/baseline order on local
Chrome. Mobile used a 390x844 touch viewport, 4x CPU throttling, 80 ms latency and
10 Mbps download throughput. The following values average the two runs per
variant. These measure the three models becoming available, not full app readiness
or steady-state FPS.

| Measurement | Before | After |
| --- | ---: | ---: |
| Constrained mobile: all three models | 18.54 s | 13.94 s |
| Constrained mobile: first model | 6.26 s | 4.09 s |
| Constrained mobile: sampled peak JS heap | 53.39 MiB | 53.29 MiB |
| Unthrottled localhost: all three models | 372.60 ms | 491.85 ms |
| Unthrottled localhost: sampled peak JS heap | 53.85 MiB | 67.08 MiB |

The constrained-network model load improved about 24.8%, saving 4.60 seconds and
6.43 MiB of transfer. Decompression/backpressure costs about 119 ms on fast
localhost in these samples, and temporary desktop heap was higher. The longest
observed throttled main-thread task also increased from 324 to 502 ms; this is not
a stall-elimination claim. Sampled JS heap is neither a retained-memory leak
measurement nor GPU memory. Decoded geometry/texture sizes and steady-state
rendering work are unchanged. A universal speedup or 10x gain is not established.

### Verification

All 89 affected loader, resource, model, animation and preview tests, TypeScript,
new-code lint, generated-cache checks and production build passed. One lint
finding on an unchanged `new Array(100)` line in the existing shell builder was
left untouched. Tests cover corrupt, missing, short, oversized and unsupported
compressed data, download deduplication, independent ownership, parse failure,
queued cancellation and cleanup after disposal.

Eight isolated real-model runs retained matching geometry/material fingerprints,
rendered the original textures and released their GPU geometry. Production checks
confirmed exactly three packed responses with the expected checksums/byte sizes,
no accidental raw fallback, and nonblank desktop/mobile canvases. Deliberately
corrupting all packed responses loaded the original GLBs successfully. Mobile
touch/orientation, camera controls, 8/0/8 active/paused/resumed frames, preview
unloading and forced WebGL recovery retained the same scene and canvas.

Evidence is in `outputs/performance/oct9-asset-pipeline/compressed-verified.json`,
`outputs/performance/oct9-asset-pipeline/production-verified.json`, and
`outputs/performance/oct9-asset-pipeline-lifecycle/balanced-mobile.json`.
Earlier experiments have separate filenames and are not final-build evidence.
The production preview is local; physical-phone and hosted-deployment behavior
remain unverified. No application reload mechanism was added.

## Cached Render Work, 9 October 2026

Four localized changes preserve geometry, materials, lighting effects, resolution,
populations, live previews and the existing streaming/recovery behavior:

- `visible-geometry.ts` caches camera and shadow selections in separate ranges of one owned index buffer. Switching passes changes the draw range instead of rewriting indices. Visibility flags, moving cameras and transformed parents still invalidate each selection. Pending upload ranges are retained until the renderer consumes them, and normal geometry disposal releases the complete buffer.
- `paving-material.ts` shares triplanar weights and the center texture sample between color, roughness and bump derivatives. Source-level texture samples drop from 15 to 9, but this is not a claim about generated GPU instructions. The texture, derivative samples and relief strength remain unchanged.
- `city-expansion.ts` retains indexed vertices while baking shared garden/resident templates. The production-authored garden and three resident templates save 2,911,196 bytes (2.78 MiB), with identical expanded vertex hashes, triangle counts and material-batch counts.
- Weather visuals are computed once per update and refreshed immediately on lighting-mode/report changes. Material lighting skips unchanged writes while still initializing newly streamed materials, honoring color policies and restoring expected values after other systems change them. The steady-state regression records zero repeated material writes across 60 frames.

### Rendering Checks

The generated-city fixed-view test reduced 1,320 index rewrites and 103.99 MiB of
requested updates to zero across 60 alternating camera/shadow cycles after warm-up.
This is not an upload rate for normal Balanced rendering, which refreshes shadows
less frequently. A separate actual WebGL fixture reduced 360 index
`bufferSubData` calls to zero over 60 rendered frames. Disposal left zero fixture
buffers allocated. Desktop and mobile pixels matched exactly for fixed views,
changed visibility, moved cameras/parents, shadows and authored paving.

Isolated ABBA GPU timings found no meaningful paving-shader speedup on Intel Arc:
desktop medians were 0.224414/0.224616 ms before/after, and mobile medians were
0.111035/0.111556 ms. Shader compiler optimization can already remove repeated
source work. The final fixed viewports were 1280x800 and 390x844; an earlier
980-pixel mobile-layout run was rejected. Results and the local verification
harness are in `outputs/performance/oct9-small-changes/`.

### App Comparison

Against archived commit `80dd4cf`, the production builds used Balanced quality,
DPR 1, 90 warm frames and three 90-frame samples per location. Desktop ran the
baseline first; mobile reversed the order. Entries are the mean frame time of
the median run in milliseconds; lower is better.

| Location | Desktop Before | Desktop After | Mobile Before | Mobile After |
| --- | ---: | ---: | ---: | ---: |
| Plaza | 40.18 | 40.18 | 28.70 | 23.52 |
| Website gallery | 22.41 | 21.66 | 16.66 | 16.67 |
| Return to plaza | 45.92 | 43.52 | 23.70 | 22.96 |
| Planet | 26.85 | 24.82 | 16.66 | 16.67 |

The largest observed reduction was about 18% for the mobile plaza, with p95
50.0 -> 33.4 ms. Other measurements were modest or effectively unchanged; these
are one matched comparison per viewport, not a universal improvement or a 10x
result. Startup varied with order and is not presented as an optimization gain.
Scene-object counts matched at every corresponding location. Extra index capacity
costs 4.06 MiB; template savings offset 2.78 MiB, leaving a net 1.28 MiB increase in
geometry buffers. This is a deliberate memory-for-reduced-upload tradeoff.

Reports are `outputs/performance/oct9-small-changes-desktop/metrics.json` and
`outputs/performance/oct9-small-changes-reversed-mobile/metrics.json`. Website
responses were controlled fixtures; mobile was local touch/viewport emulation,
not a physical-phone or hosted-deployment certification.

All 77 affected tests, TypeScript, runtime lint, shell-cache consistency and the
production build passed. Test lint reported six findings on unchanged `HEAD`
source lines; unrelated test code was left untouched. Eleven full-scene captures
passed desktop/mobile, quality, day/night, motion, nonblank-canvas and layout
checks. Mobile lifecycle validation passed six touch gestures, three orientations,
zero redundant resize allocations, 8/0/8 active/paused/resumed frames, preview
unloading, camera modes and forced graphics recovery with the same scene/canvas.
Reports are `outputs/playtest/oct9-small-changes-checks.json` and
`outputs/performance/oct9-small-changes-lifecycle/balanced-mobile.json`.

## Frame Work And Recovery, 8 October 2026

This pass preserves scene geometry, textures, populations, animation, lighting,
shadows, postprocessing and quality settings. It removes repeated work in shared
update paths rather than lowering visual quality or disabling the website boards.

- Camera obstruction bounds are reused only for rigid, childless meshes with unchanged world transforms, geometry, position attributes and local bounds. Moving doors, grouped objects, skinned/instanced objects and morph targets retain the exact update path. A stationary-wall regression reduced 121 bounds reconstructions to one across 120 updates.
- Camera and resident updates refresh shared ancestors once within each update pass. The 32-sibling obstruction regression reduced parent refreshes from 32 to one without changing the resulting world transforms.
- Resident instance matrices are compared at Float32 GPU precision. Unchanged matrices and colors are not uploaded again, unchanged bounds are reused, and batch-object transforms use the existing immutable-transform cache. Tests retain exact animation, parent movement, visibility compaction and conservative bounds.
- Empty wildlife batches no longer enter renderer setup or upload unused buffers. Day/night transitions restore visibility from the existing nonzero counts; no wildlife populations or effects were removed.
- Loaded authored canopies read shared trunk-layout data directly instead of constructing and discarding another complete tree/fruit scene. Procedural fallback geometry, physical roots, fruit and leaf animation remain unchanged.

### Reload Resilience

An ordinary header-logo click now returns to the plaza inside the current world
instead of navigating to `/`. Modified link clicks retain normal browser behavior.
Frame exceptions pause the existing world once and expose the existing Resume
control; they do not start an automatic reload or repeated frame-error loop.
Existing WebGL-context recovery still restores graphics in the same scene/canvas.

A compact per-tab checkpoint records a validated safe on-foot world position,
orientation and camera view in session storage. It writes changed snapshots at
most every two seconds, plus page-hide/visibility transitions. Corrupt, oversized,
invalid or older-than-eight-hour snapshots are rejected; storage failures are
nonfatal. Flights, journeys, driving, interiors and shared games retain the last
safe on-foot checkpoint. Explicit project/room/friends links take precedence over
restoration, and delayed planet loads cannot overwrite a newer user action.

The browser/OS can still discard or terminate a tab. JavaScript cannot guarantee
that this never happens. The checkpoint restores location after such a restart;
it does not prevent the restart. No unconditional `beforeunload` trap, security
bypass, automatic refresh loop or artificial application hang was added.

### Verification Scope

The combined transform/recovery build passed all 664 repository tests, TypeScript,
scoped lint and production build. Two earlier full-suite failures were old bare-tree
budgets that predated the requested fruit. Tests retain the original wood/leaf
limits and add exact fruit counts and triangle budgets; no geometry was reduced.
After the final empty-batch and canopy-allocation changes, all 53 affected world,
canopy, wildlife and resource tests, TypeScript, lint, cache consistency and build
passed. That later focused run is not presented as a fresh full-suite run.

The browser resilience test verified same-document header navigation, a single
injected frame fault followed by Resume, and restored mainland/planet positions
and camera orientation after deliberate document reloads. The final build also
passed native touch/orientation changes, preview unloading and forced WebGL
recovery before repeating those resilience checks. Its report is
`outputs/performance/oct8-algorithm-final-lifecycle/balanced-mobile.json`.
Performance comparisons
use the archived pre-change build, fixed Balanced quality, equal viewports and
controlled project iframe responses. Fixtures do not certify the inaccessible
third-party website scripts or physical-phone behavior.

### Measured Frame Times

The final comparison used the same Chrome/GPU, Balanced quality, equal viewports,
90 warm frames and three 90-frame samples per location. Values below are the mean
frame time of the median run in milliseconds; lower is better. Desktop tested the
baseline first, while mobile reversed the order. The mobile report's `control`
label is therefore the optimized URL, not the baseline.

| Location | Desktop Before | Desktop After | Mobile Before | Mobile After |
| --- | ---: | ---: | ---: | ---: |
| Plaza | 163.33 | 167.76 | 75.36 | 73.14 |
| Website gallery | 138.33 | 137.59 | 59.79 | 60.00 |
| Return to plaza | 165.73 | 164.62 | 74.81 | 66.48 |
| Planet | 127.59 | 124.62 | 63.15 | 67.22 |

The mobile return mean improved about 11%, but its p95 worsened from 83.4 to
100.1 ms. Other locations include regressions, and startup times varied markedly
with run order; these samples do not establish a general FPS or startup multiplier.
Geometry-buffer sizes and scene-object counts stayed equal between builds at
each corresponding location. The saved reports are
`outputs/performance/oct8-final-desktop-desktop/metrics.json` and
`outputs/performance/oct8-final-mobile-reversed-mobile/metrics.json`.

Eleven normal-scene desktop/mobile/quality/day/night/movement captures and eight
mainland/planet wildlife captures passed nonblank, layout, motion, population and
reduced-motion checks. Representative native captures were visually reviewed.
Reports are `outputs/playtest/oct8-algorithm-final-checks.json` and
`outputs/playtest/oct8-algorithm-wildlife-checks.json`.

Measured operation-count reductions are not whole-app FPS multipliers. This pass
has not established a 10x whole-app improvement. Rendering submission remains a
significant cost. Hosted deployment is not verified, and mobile measurements are
local emulation rather than physical-phone
certification.

## Statue Website Loading, 8 October 2026

The user narrowed the restart to approaching the five website boards in front of
the gold statue. Those boards embed complete external websites, not static images.
The published budget capped residency but immediately replaced a selected iframe
whenever the visible candidate changed, potentially every 250 ms during camera
turns. A regression test reproduced a full website starting on a passing view.

New previews now require 900 ms of continuous selection and at least 1,200 ms
between starts. Existing resident limits, idle retirement, immediate inactive
cleanup, all five links and live previews remain. High-quality mode starts its
second preview later rather than starting both together. Statistics expose starts,
stops and pending selections. This reduces transient website-load churn; it does
not bound the internal memory or GPU use of an arbitrary embedded website.

The real-site probe visited all five boards on the published production build.
It recorded one document, scene and canvas, no top-page navigation, no unexpected
graphics loss, and a 3,983 ms frame interval on the first approach. The longest
3,930 ms task was attributed to the main page. However, every external site request
failed here with `net::ERR_SSL_PROTOCOL_ERROR`, and the child frames contained
Chrome error documents. Their scripts did not successfully load, so this run does
not prove that the user's successful website load causes a reload, nor can its
stalls be attributed to those website scripts. No TLS/security bypass was used.
The report is `outputs/performance/oct8-statue-websites-before/website-loads.json`.

The camera harness now has a `--websites` probe for child URLs/readiness, embedded
canvases, nested frames, main-page long tasks and navigation. It explicitly reports
whether the real sites loaded; iframe `load` events alone are not certification.

All 18 monument/board/preview tests, TypeScript, scoped lint and a production build
pass. The candidate's controlled-fixture mobile test passed 18 snapshots, six touch
swipes, three orientations, camera changes, zero unnecessary resize allocations,
preview unloading and same-scene forced graphics recovery with no page errors.
Results are in `outputs/performance/oct8-preview-settle-lifecycle/`. Fixtures verify
the application lifecycle only, not the inaccessible third-party scripts. Exact
device/browser details and the physical reload cause remain unknown. No general
FPS gain or guaranteed reload prevention is claimed. These checks describe the
tested build, not hosted-deployment certification.

## Mainland Roaming And Camera Turns, 7 October 2026

The reported restart follows visits to new mainland areas and sometimes a rapid
camera rotation. Nearby building construction is controlled by player distance,
not camera direction. Turning the camera changes visibility and LOD selection,
and can expose geometry and textures that have not yet been uploaded to the GPU.
That distinction does not establish the cause of the physical phone's restart.

Two concrete defects were reproduced and corrected:

- Several neighborhoods could allocate full detail while the first neighborhood was still waiting for shader preparation. A city-owned queue now permits one complete construction, batching and shader-preparation job at a time. Abandoned queued requests are cancelled before allocating geometry. The existing per-stage scheduler, detail distances, silhouettes, full building geometry and materials remain intact. Nearby detail may take longer to finish during a burst of arrivals; existing silhouettes remain visible while it waits.
- Full scene disposal released geometry but omitted `InstancedMesh.dispose()`. The installed Three.js renderer uses that separate disposal event to release instance matrices, instance colors and associated binding state. Full teardown now invokes it, while shared geometry and materials retain exactly-once disposal. This does not change the separate hidden-mainland GPU-only release policy.

The allocation test first failed with all three requested neighborhoods building
behind a blocked shader job. It now verifies that only one allocates, a cancelled
second request builds nothing, and the third retains its original completed detail.
The instance cleanup regression uses Three.js's actual `WebGLObjects` listener and
verifies that both meshes release their matrix/color buffers without double-disposing
their shared geometry or material. All 53 focused tests, TypeScript, scoped lint and
the production build passed.

The production Chrome mobile-emulation check completed two mainland circuits:
eight area visits, real road movement and 48 fast camera sweeps, followed by six
native touch swipes, three orientation states, camera-mode changes and forced
graphics recovery. All eight stationary-camera checks retained the player's
position and detailed-neighborhood count, requested no further building loads,
and captured nonblank pixels. There was one document, scene and canvas, no
unexpected context loss and no page errors. At sampled loading points there was
one preparing neighborhood with up to five queued requests. A separate desktop
check passed 48 rendered camera-sweep frames and same-scene graphics recovery.

Reports are in `outputs/performance/oct7-mainland-safety-verified` and
`outputs/performance/oct7-mainland-safety-desktop`. The first mobile attempt used
an invalid between-frame pixel read; its screenshot showed the rendered city.
The final run samples inside an animation frame with the original nonblank
threshold. Its unusually long wall-clock duration is not treated as proof of
continuous active stress or as a performance measurement. The first return's
heap sample also preceded completion of its new detail loads, so the two return
samples are not presented as a matched memory-plateau result.

This is not a complete GPU-memory cap: first visits increased resident texture
allocation counts from 108 at readiness to 324 after the circuit. These are counts,
not VRAM bytes. Static mainland GPU caching remains a separate risk, and the user's
phone/browser failure has not been reproduced. No 10x improvement, universal
no-reload guarantee, full-suite run or hosted-deployment verification is claimed.
Earlier frame-time comparisons were mixed, including desktop regressions; this
follow-up establishes allocation and lifecycle behavior, not a general FPS gain.
These checks describe the tested build, not hosted-deployment certification.

The implementation follows [MDN's explicit resource deletion and VRAM-budget guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
and the [Three.js instanced-mesh disposal contract](https://threejs.org/docs/pages/InstancedMesh.html).

## Mobile Travel Memory, 7 October 2026

The reported mobile reset happens near the gold statue and after roaming planets.
This follow-up reduces concrete resource-lifetime and allocation risks; it does not
claim to have reproduced the reset on the user's physical phone.

- Planet terrain decoding, construction and shader preparation share a one-load queue. Abandoned queued destinations allocate no geometry.
- Unprotected inactive planets are evicted before the next planet allocates, rather than only after it has loaded. Arrivals immediately update the protected destination; active, observed and in-transit worlds are preserved.
- Constrained devices retain one inactive-cache slot and use a three-second retirement delay instead of the desktop two-world/fifteen-second policy. No world content or detail level is removed.
- Explicit inactive-world flushing runs on visibility loss and graphics-context loss. Released worlds clear renderer draw-list references, and optional model loads pause during context recovery.
- Cancelled asset completions can no longer remove a replacement cache entry. Late lease releases cannot make reference counts negative.
- Statue-side preview iframes are attached only while running and detached on stop, error or timeout. Revisiting can start them again; the five boards and their links remain.
- When a constrained device leaves the mainland, GPU allocations exclusive to hidden mainland and companion roots are released once. CPU vertex data, scene objects and materials remain for re-upload on return. Visible shared geometry, ordinary/interleaved attributes, textures and the scene environment are protected. Material disposal is deliberately not used for this temporary release.

### Sustained Travel Verification

The final isolated Chrome mobile-emulation run used Balanced quality, a 390 x 844
viewport with device scale 2, the existing pixel budget and real embedded project
pages, not response fixtures. It completed 194.8 seconds and five cycles: five
statue visits, fifteen planet visits with WASD movement, and five plaza returns.
There was one document, one scene and one canvas throughout, with no unexpected
context loss or page errors. Native touch/orientation, camera-mode changes and
forced context recovery then passed without replacing the app.

Each visited planet was the only resident detailed planet; returning to the plaza
retired all planet details and detached all preview iframes. Post-GC retained heap
across returns was 333.26, 336.07, 335.98, 335.53 and 337.17 MiB. Garbage collection
was requested by the diagnostic only; the application does not attempt to force GC.

On the first off-mainland release, the renderer's resident geometry allocation
count fell from 1,730 to 298 and texture allocation count from 123 to 44. These are
allocation counts, not measured VRAM bytes. The helper also encounters unuploaded
resources, so its disposal-attempt counts are not reported as GPU savings.
Planet and returned-mainland frames remained nonblank, and screenshots confirmed
the statue, world content and restored plaza. Eleven separate desktop/mobile
day/night/quality/movement visual checks passed.

TypeScript, scoped lint, 69 focused asset/planet/statue/travel/resource tests and
the production build passed. Source fingerprints are recorded in
`outputs/performance/oct7-memory-final-source.json`; browser results are under
`outputs/performance/oct7-memory-final-tour` and
`outputs/playtest/oct7-memory-final-visuals-checks.json`. An earlier soak had stable
memory but failed its error gate because test initialization ran inside sandboxed
iframes; the harness now initializes only the top-level page. The final run above
passed with real embeds.

This is local Chrome emulation on the available GPU, not physical-phone or hosted
deployment certification. No universal 10,000-times speedup or prevention of every
OS/browser tab discard is claimed. A whole-document restart can still initialize
at the plaza; this change reduces memory pressure rather than hiding a restart.
The full suite and Vercel deployment packaging were not rerun for this follow-up.
These measurements describe the local build and do not certify the hosted deployment.

## Progressive Visibility, 7 October 2026

The latest requirement is to show the live scene within roughly 7-8 seconds and
continue filling it in, rather than keep an opaque cover until the entire world
is ready. This supersedes the earlier full-readiness-only target below.

Startup now draws a lightweight live plaza and animated fountain on the same
WebGL canvas before preparing the bulk assets. Independent asset preparation
still runs in parallel after that first draw. Model preload hints use low priority
so they do not outrank application startup. World construction yields through
browser frames between sections; the early renderer draws newly available scene
content on demand instead of repeatedly redrawing an unchanged construction stage.

The full-screen cover becomes a compact loading status when real geometry is
visible. The page remains `aria-busy`, and gameplay controls remain unavailable
until full initialization completes. The temporary plaza is removed when the real
capital exists; the ordinary renderer and unchanged effects take over at readiness.
The early view is not a claim that all content or effects have already loaded.
Cancellation closes the staged builder and releases partial resources, while the
existing synchronous world-creation API remains available.

| Final Local Check | First Visible Scene | Full World Ready |
| --- | --- | --- |
| Mobile, cold cache / 4x CPU / 80 ms latency / 10 Mbps down / 2 Mbps up | **6.28 s** | 95.98 s |
| Desktop, unthrottled | **1.29 s** | 37.54 s |

These are single local Chrome runs, not physical-phone guarantees. Full readiness
is still expensive and is not advertised as a 7-8 second result. The visible-first
path changes scheduling and adds interim rendering, so it should not be compared
with earlier complete-startup timings as an overall throughput improvement.

Both early captures contained real nonblank geometry while `data-ready` was false,
used one canvas, hid the movement controls, and retained the loading status. At
completion all 85 sign textures matched the preceding build pixel-for-pixel, all
five routes matched, all 236 prebuilt neighborhoods were used, and temporary startup
geometry was absent. Mobile native gestures, orientation/camera changes, preview
lifetimes and forced context restoration passed after handoff. Eleven desktop/mobile
day/night/quality/movement visual checks passed with no page errors.

TypeScript, scoped lint, production builds, 40 focused controls/rendering/resource
tests and the additional staged-cancellation/redraw checks passed. The full suite
and Vercel packaging were not rerun for this progressive follow-up. Final reports
are under `outputs/performance/oct7-progressive-verified-*`, with source hashes in
`outputs/performance/oct7-progressive-source.json`; lifecycle and visual evidence
use the `oct7-progressive` prefix. These measurements describe the local build;
they do not certify the hosted deployment.

## Slow-Device Follow-up, 7 October 2026

Before progressive visibility, finished rover/rocket assemblies were reused with
independent paint and moving parts, and sign text fitting switched from a linear
font-size scan to a binary search over the same candidates. All 39 focused tests
passed. A completed matched throttled pair improved full readiness from 64.30 to
57.40 seconds (10.7%), with all 85 sign textures and all five routes unchanged.
That separate pair is under `outputs/performance/oct7-slow-device-verified-mobile`;
it must not be mixed with other runs to infer a larger isolated gain.

## Loading-Time Pass, 7 October 2026

This pass targets time to the existing ready marker and a nonblank composited
first view. The loader still waits for world construction and shader preparation;
it is not dismissed early. Existing post-ready model downloads remain post-ready.
No resolution, geometry, texture, population or effect quality was reduced.

### Retained Changes

- The four required model libraries are discovered from HTML preload hints. The browser reuses those requests, with no duplicate model downloads.
- Architecture model parsing, relief-image decoding and normal-map requests overlap instead of forming a serial waterfall.
- City planting reuses immutable canopy bounds and scratch boxes. All 944 street trees and four large banyan trees remain, with the same clearance checks.
- Capital walkway planning reuses exact external collision answers during construction. Five routes captured from the published world are validated with the same collision predicates before use; invalid hints fall back to the existing A* search. Local lamp colliders stay live.
- Neighborhood baking can consume uniquely owned geometry instead of cloning it immediately before disposal. Shared geometry and the default public behavior retain copying; every tested position, normal, color, UV and index matches.
- Fixed city shells are baked from the actual city builder: 236 neighborhoods and 2,585 material batches. The compact cache stores aligned typed arrays, exact bounds and material slots; it does not recreate a temporary GLTF scene. Runtime materials, nearby detail streaming and procedural fallback remain unchanged.

The binary cache contains 35,199,000 uncompressed bytes and downloads as
3,624,097 losslessly gzip-compressed bytes. Local build-time decode took about
54-60 ms. This is an additional download, traded against repeated CPU construction;
it is not a claim of lower total asset bytes. Templates are consumed and unused
entries released. Unsupported decompression or a failed request uses the original
procedural path. A content-hashed URL avoids reusing an older generated cache.

`npm run build:city-shells` regenerates the asset and manifest. Both production
prebuild paths run it, and the Vercel path still runs Friends preparation.
`node scripts/build-city-shells.cjs --check` verifies every source attribute/index
hash and the generated asset version. An intermediate GLTF-cache implementation
was replaced because it created unnecessary temporary scene objects. The payload
uses a `.bin` URL: Vinext treats `.gz` files as compression sidecars, not standalone
resources.

### Matched Results

Control is published commit `0294aff`; candidate is the local loading pass.
Each pair used isolated contexts in one Chrome process, Balanced quality, DPR 1,
the same viewport, no CPU profiler, and the unchanged ready marker followed by
actual composited-canvas pixel and screenshot checks.

| Startup Case | Before | After | Reduction |
| --- | --- | --- | --- |
| Mobile viewport, unthrottled | 28.36 s | 11.44 s | 59.7% |
| Desktop viewport, unthrottled | 30.11 s | 16.21 s | 46.2% |
| Mobile, 4x CPU / 80 ms latency / 10 Mbps down / 2 Mbps up | 172.78 s | 94.99 s | 45.0% |

The throttled pair also disables browser caching. Mobile viewport is 390 x 844;
desktop is 1440 x 960. All three candidates used all 236 prepared neighborhoods,
retained identical five walkway routes, rendered nonblank canvases and had no page
errors or context loss. Results are under `outputs/performance/oct7-loading-final-*`;
runtime and asset hashes are in `outputs/performance/oct7-loading-source.json`.

These are single paired local Chrome measurements, not physical-phone or field
certification. Control ran first; shared-machine and shader-cache variation remain.
Slow-CPU startup is still substantial, and this pass does not claim instant loading
or a general FPS improvement. Other world construction and first-use GPU work remain
on the critical path. The hosted deployment has not been tested or changed.

### Verification And Research

The full suite passed 636 of 637 tests; its only failure was JSON-import interop in
the new cache test. That import was corrected to the repository's namespace style,
and all four neighborhood/cache tests then passed. The full suite was not rerun
after that one-line fix. TypeScript, scoped lint, Vercel packaging, plain production
build and reproducible cache generation passed.

Production mobile checks passed native swipes, portrait/landscape changes, camera
cycles, paused-loop behavior, bounded project previews and forced context recovery
without replacing the document, scene or canvas. Eleven desktop/mobile visual
captures covered day/night, quality settings and movement. The visual harness now
normalizes trailing-slash URLs and waits for actual world readiness.

Research used [web.dev long-task guidance](https://web.dev/articles/optimize-long-tasks),
[MDN lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)
and [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html).
Yielding improves responsiveness but does not itself eliminate construction work;
this pass prioritizes precomputation, exact reuse and overlapping independent work.
No worker, new transit-station streaming or reduced-quality startup mode is claimed.
These measurements describe the local build, not deployed field performance.

## Mobile Stability And Research, 7 October 2026

This follow-up targets camera changes, native touch swipes and mobile rendering
without removing assets, effects, population, resolution settings or controls.
The page already creates its world only on mount; camera mode changes do not
recreate that world. The reported physical-phone reload was not reproduced in
local Chrome emulation, so its cause is not certified by these tests.

The investigation did reproduce unnecessary GPU work: eight resize events with
unchanged dimensions caused 16 drawing-buffer resets. World resizing now caches
width, height and pixel ratio, uses one `setDrawingBufferSize` call for a real
change, and explicitly invalidates the cache after context restoration. The
same unchanged-size check now produces zero resets. The canvas, camera and all
postprocessing settings remain the same.

The root viewport disables overscroll while the world is present, preventing
supported browsers' pull-to-refresh and scroll chaining during gestures. Normal
controls and scrollable panels remain available. The browser harness now uses
native touch events, not just mouse drags in a narrow viewport: six swipes across
three portrait/landscape states plus camera-mode cycles retained one document,
scene and canvas. Development recovery also retained those identities.

Animated resident batches now maintain conservative bounding spheres as their
matrices update. Ordinary camera and shadow frustum tests can reject an entirely
off-screen batch without dropping any visible part; a distance-scaled Float32
margin is covered by a vertex-level regression. Unchanged instance colors are
not uploaded again, but recoloring and changing visible slots still upload.

Three.js shader debug checks remain enabled in development and are disabled in
production, following the renderer documentation. This avoids optional blocking
shader/program log queries, not shader compilation or any shading feature. The
existing asynchronous preparation and visual validation remain in place.

### Researched Guidance

- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): avoid blocking GPU queries and framebuffer churn; batch compatible draws and manage resource lifetime. Quality-reducing backbuffer changes and lossy texture compression were not adopted.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): production shader diagnostics, `compileAsync`, and one-call drawing-buffer sizing. APIs were checked against the installed renderer before use.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): transformed instances require updated bounds for correct culling; color buffers need uploading only when changed.
- [MDN overscroll behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior): prevent viewport pull-to-refresh and scroll chaining rather than attempting to intercept browser reloads afterward.
- [Chrome Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): browsers can discard pages under resource pressure without a cancellable event. No website can guarantee that a tab survives every OS/browser condition; no unconditional unload handler or reload loop was added.

### Current Measurement

The matched local Chrome mobile-emulation run used the previous retained build,
the same 390 x 844 viewport, Balanced quality, project fixtures and the existing
three-sample method. This is not a physical-phone or 10,000-times speedup claim.

| Location | Mean Frame, Before/After (ms) | p95, Before/After (ms) |
| --- | --- | --- |
| Plaza | 28.52 / 33.52 | 50.0 / 50.0 |
| Project boards | 28.89 / 19.81 | 49.9 / 33.4 |
| Return to plaza | 42.59 / 32.03 | 66.7 / 50.0 |
| Citadel | 20.92 / 16.67 | 33.4 / 16.7 |

Readiness was 20.60 versus 19.16 seconds. Three locations improved, including
60 FPS in the sampled Citadel view, but the initial plaza mean regressed. The
result is therefore mixed, not universally smooth. Evidence is under
`outputs/performance/oct7-mobile-stability-comparison-mobile`.

Production validation passed: zero unchanged-size drawing-buffer resets, six
native swipes across three orientation states, camera-mode cycles, a 48-frame
camera sweep, bounded preview unloading and forced context recovery all retained
the same document, scene and canvas. The single-loop check recorded 8 active,
0 paused and 8 resumed frames. No unexpected context loss or page errors occurred.
The separate day/night/quality visual review passed 11 desktop/mobile captures.
Reports are under `outputs/performance/oct7-mobile-stability-production` and
`outputs/playtest/oct7-mobile-stability-visuals-checks.json`.

TypeScript, scoped lint, all 29 focused controls/resource/resident tests and the
production build passed for this follow-up. The earlier 629-test full-suite gate
describes the preceding ranked pass, not a new full-suite run here. Source hashes
in `outputs/performance/oct7-mobile-stability-source.json` were verified after
the browser tests. The exact reported phone/browser reload remains unconfirmed;
the test evidence is local Chrome touch emulation. This follow-up was published
in `0294aff`.

## Complexity-Ranked Algorithmic Pass

The [full file ranking](code-complexity.md) inventories 1,045 non-ignored project
files and parses 586 source files, including 132 Python sources, with no parser
failures. Its separate application queue contains 262 modules. The score combines
function control-flow complexity, decision count, nesting and local importers;
it is not a Big-O estimate or a substitute for runtime profiling. The audit covers
every included source file, but does not claim a manual rewrite of every file.

Work starts with the highest-ranked application paths and follows the dependency
that owns the measured cost. The current changes preserve assets, geometry,
textures, visual effects, population counts, interactions and quality settings:

| Ranked Area | Action |
| --- | --- |
| World orchestration | Profiled startup and draw submission; extended resident instancing with a WeakMap and collision-checked geometry hashes, retaining independent transforms, colors and visibility. |
| Page initialization | Reviewed the existing parallel module/kit loading; retained it. Cached the two prepared variants of each shared model part in the owning kit module. |
| Everyday-place construction | Added a 128-entry exact-dimension LRU in the shared authored-block factory; every caller still receives independently editable buffers. |
| Friends server | Encode each shared room snapshot once per broadcast, preserving delivery, backpressure and the wire format. |
| Realm construction | Reuse valid bounds for shared immutable geometry; existing landmark, collision and animated-detail tests remain intact. |
| Building factories | Retain index buffers through material-group and static-scene merging; exact transformed triangles, normals and UVs match the expanded representation. |
| Friends UI | Reviewed its bounded five-player lookups and conditional timers; no speculative rewrite. |
| City districts | Use the existing grid spatial index before the unchanged collision predicate; 72,030 multi-height samples match the original scan with less than 20 percent of its candidates. |
| Authored surfaces | Reuse the full source/sampling/UV identity for trusted relief and normal-map clones, without merging different UVs or custom texture identities. |

The initial production diagnostic measured about 19 seconds to ready and 67.8 ms
median-run mean frame time in the plaza. Disabling wildlife did not improve that
run; bypassing draw submission reduced frame time substantially. Those diagnostic
modes are temporary test instrumentation, not application changes.

An early full-screen shader-preparation experiment was rejected: in its matched
run readiness changed from 26.5 to 28.2 seconds and frame time did not improve.
Its runtime changes were removed; the original bloom, GTAO, output and antialiasing
pipeline remains. The differing absolute timings demonstrate local-run variability.

A second experiment combining different diffuse colors into shared static draws
was also rejected after its matched run regressed loading and frame times. Its
changes were removed. Material color boundaries and wildlife perch discovery
remain as before; no visual content was removed to obtain a faster result.

The retained version passed TypeScript, scoped lint, all 629 tests in 117 Node test files and
the plain production build. The guarded source hashes and logs are under
`outputs/performance/oct6-retained-final-*`. The full AST inventory is complete;
the manual optimization work covered the ranked paths above and their owning
dependencies, not every lower-ranked file. Remaining files retain their place in
the report's optimization queue.

The retained lossless-indexing desktop comparison used the same Chrome process,
Balanced settings, 1440 x 960 viewport and DPR 1. Each location used 90 warm frames
and three 90-frame samples; the table reports the median run's mean and p95.
Project iframes used fixed local response fixtures in both builds. Control ran
first, so cache, ordering and shared-machine variation remain limitations.

| Location | Mean Frame, Before/After (ms) | p95, Before/After (ms) |
| --- | --- | --- |
| Plaza | 94.27 / 83.14 | 133.3 / 116.6 |
| Project boards | 51.11 / 43.14 | 83.4 / 66.7 |
| Return to plaza | 88.33 / 80.74 | 116.7 / 100.0 |
| Citadel | 43.89 / 40.74 | 66.8 / 50.2 |

Readiness changed from 36.92 to 30.49 seconds in this pair. Plaza heap use changed
from 382.63 to 342.67 MiB, and Citadel from 455.09 to 403.06 MiB. The scene still
falls short of consistently smooth 30/60 FPS on this machine; these are local
improvements, not a universal speed or physical-phone guarantee. Results and
screenshots are in `outputs/performance/oct6-lossless-comparison-desktop`.
The separate 390 x 844 mobile-emulation run retained the same settings and
workload but did not improve frame time:

| Location | Mean Frame, Before/After (ms) | p95, Before/After (ms) |
| --- | --- | --- |
| Plaza | 66.66 / 71.85 | 100.0 / 100.1 |
| Project boards | 42.22 / 47.22 | 66.7 / 66.8 |
| Return to plaza | 68.51 / 77.03 | 100.1 / 133.3 |
| Citadel | 41.85 / 43.33 | 66.7 / 66.8 |

Mobile plaza heap fell from 381.34 to 341.37 MiB and Citadel from 452.08 to
398.43 MiB. Readiness was 118.97 versus 54.44 seconds, an unusually slow pair
compared with the earlier runs; it is not a stable cold-start guarantee. Mobile
smoothness therefore remains unresolved despite the memory and algorithmic-work
reductions. Results are under `outputs/performance/oct7-retained-final-comparison-mobile`.
Desktop and mobile captures retain the visible scene, content and controls.
Final desktop and mobile interaction/recovery checks pass. Each camera sweep
captured 48 rendered frames with at least 5.79 depth steps between the tested
paving layers. Pause/resume retained one render loop (8 active, 0 paused, 8 resumed
frames), project previews unloaded on departure, and forced graphics recovery
preserved the document, scene, canvas and player position. Desktop rapid planet
travel also returned to zero inactive detailed residents. Results are under
`outputs/performance/oct7-retained-lifecycle`.

The final visual review passed 11 desktop/mobile captures covering the workshop,
quality modes, day/night lighting and movement, with no page errors or clipped
controls. Results are in `outputs/playtest/oct7-retained-visuals-checks.json`.
Source fingerprints still match the fully tested build. This completes the
ranked optimization and verification pass, not the unresolved mobile frame-rate
goal or a claim that every source file has been manually rewritten. No changes
from this pass have been committed or pushed. The original control remains
archived under `outputs/performance-source/oct6-smooth-control`.

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
