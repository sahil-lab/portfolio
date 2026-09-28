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

## Matched Local Measurements

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

Motherboard construction and shader initialization still contain expensive
synchronous work. The scheduler yields between tasks but is not a frame-time
budget scheduler. All lightweight city shells are still built initially, and
regional skyline batches duplicate some geometry. Some Motherboard systems
still simulate while off-world, and the camera periodically rescans visible
bounds. Unloaded planet proxies do not include every detailed landmark.

This pass does not add geometry/texture compression, workers, a BVH, offline
caching, or CDN changes. Further work should target the measured city draw
count and remaining construction/model costs rather than claim these targets
have already been met.
