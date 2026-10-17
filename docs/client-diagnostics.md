# Client Diagnostics And Mobile Browser Limits

Research checked 10 October 2026. The client recorder reports observations, not a guarantee that every browser termination can be detected or prevented. The supplied successful Vercel page/bulletin requests do not prove the WebGL scene stayed healthy; their function-memory numbers are server memory, not phone memory.

## Completed Work Record

This change set records the diagnostics implementation, mobile-browser research, and the rendering recovery repair completed on 10 October 2026. Earlier published optimization, streaming, memory-cleanup and visual work remains documented in [performance-streaming.md](performance-streaming.md); those results are historical and are not new performance claims for this change set.

| Completed work | Outcome |
| --- | --- |
| Shared diagnostic contract | Allowlisted event types and fields, input validation, redaction and payload limits reused by browser and server |
| Browser recorder | Root-mounted hooks, session/page correlation, bounded history and offline queue, retry backoff, lifecycle checkpoints and downloadable JSON |
| Vercel ingestion | Native POST route, bounded body reads, same-origin checks, per-process rate limits and structured `KINGDOM_CLIENT` output |
| Whole-app checkpoints | Startup, UI views, scenes, assets, planet travel, optional panels, previews, radio, multiplayer, voice and Linux PC lifecycle/error reporting |
| Rendering context | Lazy camera, quality, readiness, frame, render-target, allocation-count and available heap snapshots; low-frequency performance sampling |
| Error recovery | Route/root fallback downloads, retained optional-panel retry, frame-error pause/Resume and restoration of render state after a throwing postprocessing pass |
| Mobile-limit research | Apple, WebKit, MDN and Chrome guidance; distinctions between JS heap, GPU allocations, process memory, storage and native termination |
| Verification | Focused regression tests, fault-injection browser workflow, desktop/mobile screenshots and pixel checks, Vercel packaging and actual server-log correlation |
| Operator handoff | Vercel search/export commands, plan-retention caveats, privacy and abuse limits, and a physical-device reproduction checklist |

No assets, visual effects, gameplay features or dependencies were removed. The existing Low-quality setting after graphics-context restoration is unchanged. Build/test snapshots, raw local log captures and screenshots remain ignored local artifacts; the source, reproducible checks and this report are included for publication. A Git push alone does not verify a successful hosted rollout or eliminate OS-driven browser termination.

## Serialized Decentralized Previews

The follow-up keeps previews off by default and preserves saved choices. When opted in, every quality tier admits at most one project iframe. An unselected frame is retired rather than kept running behind CSS. A cooperating child gets one `close` message and up to 600 ms to release its own resources; an unresponsive child is detached. The next iframe is admitted only after detachment and a 1,200 ms handoff interval. This interval reduces repeated startup churn, not a guarantee of OS memory reclamation.

The iframe's internal viewport is 720 x 248, preserving the board's aspect ratio and world-space size with one quarter of the former layout pixels. This is not a universal cap on arbitrary child canvases. Inactive previews skip budget allocation, scene-bound scans and CSS rendering. No additional animation loop, polling interval, worker, proxy, screenshot service, database or runtime dependency is added to the portfolio.

Each project has an independent embedded bootstrap selected by `portfolio-preview=1`, a valid `preview-parent` origin and a per-visit `preview-token`. Top-level visits ignore this mode and retain the full application. The embedded paths are deliberately read-only still views, not the full applications running invisibly inside non-interactive boards:

| Project | Embedded Workload |
| --- | --- |
| Cosmic Wellness | Existing emotion data and a compact view; no React, Three.js, Firebase, videos or AI-service imports |
| 3D Code Pad | Read-only code/editor view; no Monaco, execution APIs, React or third-party fonts |
| Mindful Goal | Existing logo and sign-in view; no authentication, database, charting or animation startup |
| Sahil Resume | Existing project artwork; no physics, audio, GLB loaders, WebGL or post-processing |
| EcoFusion | Existing logo and land/water/energy imagery; no dashboard, map, chart, WebGL or third-party stylesheet startup |

Preview assets are served from each project's own origin. Generated logos are at most 160 pixels per side, category images 320 x 112, and individual WebP files are below 25 KB. The portfolio does not download or cache these assets when previews are off. Normal project links are unchanged.

`app/embed-policy.ts` defines the small dependency-free lifecycle contract. Child projects carry their own copy rather than fetching executable code from the portfolio. Both sides validate message origin, source window, version and visit token. Child `closed` acknowledgment follows disposal completion; duplicate or stale messages cannot close a newer visit. Settings-off, page-hidden and portfolio disposal detach immediately instead of waiting for a cooperative response.

### Separate Project Rollout

Child changes are prepared in independent local checkouts under `outputs/preview-projects/oct11-single-preview/`, not imported into this application's bundle. Cosmic Wellness, 3D Code Pad, Mindful Goal and the resume use their own Git repositories. EcoFusion's frontend was recovered from its uploaded deployment because that project has no Git source link; its 66 original frontend/public files were verified against Vercel's SHA-1 identifiers. Environment files and prior build output were excluded.

Deploy and verify each child preview before publishing the parent handoff changes. A query parameter alone cannot reduce the workload of an old deployment that ignores it. Keep the default off until the independent child versions are live and the same-device preview tour succeeds. No child or parent push/deployment is implied by a local build.

The resume's ordinary build currently encounters three pre-existing lint errors in unchanged source: an undefined `Stats` component and two hook-order violations. Its new entry/preview modules must be linted separately. A test bundle produced with the lint plugin disabled does not certify its full build gate; these existing errors remain a rollout blocker.

### Local Preview Verification

The parent passed 64 focused controls/preview/diagnostics tests, TypeScript, scoped lint, Vercel-adapter compilation and output validation. All 290 runtime source fingerprints still matched the isolated build. Cosmic Wellness, Code Pad, Mindful Goal and EcoFusion passed their production builds. The resume's new modules passed scoped lint and its test bundle compiled with the existing full-app lint failures excluded; its ordinary lint/build gate remains blocked as described above.

Final desktop High (1440 x 960) and mobile Auto (390 x 844) runs each passed 18 checks using the actual local child production bundles under their original origins. All five child views had zero canvases/WebGL contexts, animation-frame requests, intervals and workers, with no third-party requests or new requests during the idle sample. The checked image dimensions were bounded, settings remained persistent, and the main scene produced nonblank fresh frames without unexpected context loss. Actual DOM connection observations, including CSS3D wrapper attachment, confirmed exactly one attached preview and the post-close gap. An earlier all-zero attachment counter was insufficient evidence and was corrected before accepting these results.

Unique uncompressed local response payloads were 15,203 bytes for the resume, 37,395 for EcoFusion, 7,209 for Cosmic Wellness, 10,351 for Mindful Goal and 7,905 for Code Pad. These are fulfilled test-response body sizes, not compressed production transfer sizes or RAM/VRAM measurements. The previews still consume bounded DOM/image memory on the visitor's device; separate hosting does not move that memory to a server.

Evidence is under `outputs/performance/oct11-serial-preview/`, with final reports in `desktop-ownership-verified/` and `mobile-ownership-verified/`. The initial external-font failure and the unsuccessful farther mobile test-camera position remain preserved as earlier attempts. Physical iPhone/WebKit stability, a universal no-reload guarantee, normal full-child-application workflows and deployment of these changes remain unverified. The local parent server does not redirect a human visitor's browser to the undeployed child bundles; the test harness performs that mapping only for its isolated browser.

### Research Basis

- [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): CSS-hiding an iframe does not change the child document's visibility state.
- [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe): each iframe is a complete document environment; sandboxing is not a RAM or GPU budget.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): bounded backbuffers and eager resource disposal, without assuming a portable VRAM allowance.
- [Three.js cleanup](https://threejs.org/manual/en/cleanup.html) and [R3F performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance): explicitly manage owned resources and avoid continuous rendering when the view is at rest.
- [Detached-window memory leaks](https://web.dev/articles/detached-window-memory-leaks): avoid retaining child documents/objects across removal; communicate through messages.
- [MDN postMessage security](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns): validate the origin, source and message structure, with an exact target origin.

## Collect From Vercel

Deploy the diagnostics changes before expecting these records. No additional database, credential, or logging vendor is required. `POST /api/client-diagnostics` emits one JSON console line per accepted event, tagged `KINGDOM_CLIENT`. A successful ingestion returns 204 with `Cache-Control: no-store`; this does not mean the reported client failure was harmless.

1. Open the Vercel project, then **Logs**, not Build Logs.
2. Select the deployment, environment and UTC reproduction time. Search the message text for `KINGDOM_CLIENT`; optionally filter Request Path to `/api/client-diagnostics` and method to POST. An adapter may show the function route as `/__server`, so use Request Path rather than assuming one route name.
3. Open **Log Messages** inside a matching request. Search the literal session ID from its JSON message to find related requests. Our JSON `sessionId` is not necessarily Vercel's built-in session filter.
4. Export the messages, not just request summary rows. With a current authenticated Vercel CLI, a PowerShell export is:

```powershell
vercel logs --project portfolio --environment production --no-branch --since 1h --query KINGDOM_CLIENT --json --limit 1000 | Out-File -Encoding utf8 outputs/client-diagnostics.jsonl
```

Vercel CLI 63.1.2 rejects `--query` with `--follow`. For live reproduction, use `vercel logs --project portfolio --follow --json` and filter the parsed JSON locally for `KINGDOM_CLIENT`. Historical `--query` remains supported. Live following lasts up to five minutes and can exit with code 1 when that limit expires; that is not an application crash. Check `vercel logs --help` for the installed version. Narrow the time range or increase the result limit when an export is truncated. No CLI authentication tokens should be pasted into a chat or source file.

Historical JSONL groups events inside `logs[]` as well as the request's top-level `message`. Parse both and deduplicate by `(sessionId, pageId, seq)`; reading only `message` misses much of a batch. On this Windows machine, Node 24 needed `--use-system-ca` for Vercel certificate verification. The process-local setting uses Windows trust without disabling TLS validation; never use `NODE_TLS_REJECT_UNAUTHORIZED=0` as a workaround.

As documented on the research date, Vercel retention is Hobby **1 hour**, Pro **1 day**, Enterprise **3 days**, or **30 days** with Observability Plus on eligible plans. Export promptly. Current log-output limits are 256 lines/request, 256 KB/line, and 1 MB/request; our 20-event/48,000-byte batches are below these. Plan capabilities can change; check the linked Vercel documentation. Long-term collection requires a separately configured drain or storage destination and is not included here.

**Local export:** System controls > Download diagnostics produces JSON with session/page IDs, up to 120 recent events, pending delivery count and delivery failures. Route/root error fallbacks also offer a download. Use this when requests are offline or blocked. This is a bounded per-tab session buffer, not permanent storage; closing the tab, clearing site data or process termination can lose it.

## Event Coverage

| Area | Records |
| --- | --- |
| Page | App start/stop, navigation type, reload, visible/hidden, pagehide/pageshow, online/offline, visible heartbeat |
| JavaScript and React | Window errors, unhandled rejections, route/root error fallback, optional panel failure and explicit retry |
| Renderer | Scene construction/ready/disposal, frame exception, context loss/native restoration, shader-preparation rejection and emitted Three/WebGL console errors/warnings, with warnings classified separately |
| Assets | Startup kit preparation, model attempt/success/failure/cancellation, managed-job failures, planet construction/ready/failure/unload |
| Navigation | World/destination/mode changes, UI view changes, camera mode and quality |
| Services | Multiplayer state/reconnect/close code and failure, voice state/failure, radio playback state/failure, Linux boot/ready/asset failure/save/restore failure |
| Embedded projects | Loading, frame-load event, unload, blocked recursive preview, element failure/timeout |
| Performance | Existing FPS/p95 window at most once per 30 seconds, sampled frame stalls, renderer geometry/texture/program counts, memory-release counts |

Events carry random per-tab `sessionId`, per-document `pageId`, increasing per-page `seq`, wall-clock `at`, monotonic `uptime`, and client `data.build`. The endpoint adds `receivedAt`, deployment and server commit. Use `(sessionId, pageId, seq)` to deduplicate: an unacknowledged beacon can be replayed after navigation. Server receipt time is more trustworthy than a client clock; client reports are explicitly labeled `source: unverified-browser`.

Once the world exists, a lazy snapshot adds scene identity, current world/destination, player and camera positions, camera clipping planes, finite camera/projection check, readiness/pause/context state, screen-versus-offscreen target, renderer frame count, render-buffer dimensions/DPR, draw/triangle counts, geometry/texture/program counts, planet queue/residency and optional JS heap figures. Renderer creation records supported texture, cubemap, sampler, attribute and sample limits. These are **capabilities, not safe memory budgets**. World counts are read without walking every scene object or polling synchronous GPU queries per frame. A memory-release event reports count deltas, not VRAM bytes.

`previous_session_incomplete` means a recent visible checkpoint lacked a clean hidden/ending marker. It has `uncertain: true`: it may indicate abrupt termination, but is not a crash verdict. A hidden page can subsequently be killed without any observable final event. `wasDiscarded` is feature-dependent and is not dependable evidence on iOS. Native context restoration may precede renderer shader preparation; inspect subsequent readiness/heartbeat records before concluding rendering resumed.

Collection starts when the root client component mounts. A failure that prevents JavaScript/bootstrap from running cannot be captured by that same recorder. Cross-origin iframe internals and worker-internal failures without a forwarded event are not observable from the parent page; an iframe load event can even represent an error document, so it is explicitly uncertain. Device crash reports and ordinary Vercel server logs remain necessary complementary evidence.

## Bounds And Privacy

- Maximum 120 events/minute per page, with ordinary events limited to 100 to reserve capacity for failures, impending preview loads and navigation checkpoints; identical events within one second are suppressed. Dropped counts are carried forward. Very large storms still lose events by design.
- At most 120 in-memory history entries and 60 queued events. Saved history plus queue is capped at 180,000 encoded bytes, trimming older history and then pending events when necessary. Events are capped at 6,000 bytes; stacks at 1,800 characters.
- Batches contain at most 20 events and 48,000 bytes. Flush checks run every 10 seconds; critical events request earlier delivery with a five-second minimum spacing. Delivery failures back off from 20 seconds to five minutes. Only one normal request is in flight, with an eight-second timeout.
- Hidden/pagehide events try a bounded beacon. The shared browser beacon queue is finite, so accepted enqueueing is not an acknowledgement of ingestion. Normal delivery does not consume the keepalive quota; the recorder never retries by reloading the page.
- The endpoint revalidates and sanitizes reports, bounds streamed request bytes, rejects browser cross-site origins and non-JSON bodies, and applies per-process limits of 60 requests/peer/minute and 600 total/minute with a bounded peer map. These limits are **not distributed authentication**. Non-browser clients can forge headers and session IDs. Use Vercel Firewall/rate limits for stronger abuse and cost protection.
- No passwords, cookies, authorization headers, room codes/identities, chat text, microphone data, guest terminal commands or guest state bytes are intentionally collected. URL credentials/query/fragment are removed, common secrets/emails are redacted, and fields are allowlisted. Browser/OS family and version replace the full user agent in our payload. Arbitrary error text and URL pathnames can still contain sensitive content; inspect exports before sharing and avoid putting secrets in paths or error messages. Vercel independently retains its ordinary request metadata, including IP/UA according to its policies.

## Preview Restart Follow-Up

The production Chrome-on-iOS capture showed an old preview unloaded at 17:23:49.314 UTC, Codepad starting at 17:23:49.323, and a new page at 17:23:51.870 on 10 October 2026. That 2.547-second correlation and the incomplete-session marker make the shared preview lifecycle a strong suspect. They do not identify an out-of-memory kill. The navigation type was `back_forward`, and no immediate JavaScript exception or main-canvas context-loss event was captured.

[WebKit bug 218168](https://bugs.webkit.org/show_bug.cgi?id=218168) describes repeated WebGL iframe-to-blank loads growing memory and eventually restarting a page on iOS 14. Its engineer response references [back-buffer ownership fix 217212](https://bugs.webkit.org/show_bug.cgi?id=217212), landed in 2020. This is useful precedent, not proof that the same defect exists in the reported iOS 18.7/26.6.1 environments. There is no page-JavaScript API that forces iOS to reclaim all GPU memory or reports the OS's exact termination reason.

The follow-up keeps every project and normal automatic preview, while changing the lifecycle ordering: set `src` before attaching the iframe; clear handlers and detach before removing `src`; ignore callbacks belonging to an earlier load generation. This avoids an unnecessary attached `about:blank` navigation and stale completion reports. It is a focused mitigation, not a guarantee of immediate memory reclamation.

Additional diagnostics now include:

- A synchronous local checkpoint before a live preview is attached, followed by a bounded/throttled send attempt. An offline or killed process can still prevent network delivery.
- Active preview IDs and count, total starts/stops, pending selection count, last preview URL, load generation, elapsed load time and time since the most recent unload.
- Internal iframe size and projected CSS size at lifecycle events; device DPR is recorded separately from the main renderer's DPR. The internal viewport is still 1440 x 496. Actual child canvas counts/pixels are collected only when same-origin access is available; cross-origin values remain null with `childObservable: false`. No DOM text, guest commands or chat content is read.
- Passive top-document `navigate` events where supported, plus `popstate`, `hashchange`, link-click context and history length. These do not intercept or prevent navigation. Browser-native gestures and hard process termination may provide no event.
- Exact prior checkpoint/event timestamps, sequence, uptime, resource/action and active preview IDs on `previous_session_incomplete`. Previously clipped `previousSeenAt` values of `1000000000000` are invalid historical timing evidence; use the outer `at`/`receivedAt` fields for old records.
- `shader_cancelled` separately from `shader_error`, with `missing-program`, `material-disposed` or `context-lost` in the cancellation message. A cancellation is not evidence that the browser ran out of memory.

### Follow-Up Verification

The follow-up was verified locally using an isolated Vercel build. Desktop High quality at 1440 x 960 and touch Auto quality at 390 x 844 each passed 12 preview-diagnostics checks, including all five board loads and the preview-off control. Desktop captured nine diagnostic batches and mobile seven. These runs used controlled cross-origin pages, not the full external project applications, and do not certify physical iPhone stability.

The Vercel-output validator passed, and all 290 runtime source fingerprints matched the tested build at the 11 October publication preparation. Screenshots showed the world and boards retained with normal and control behavior. Local evidence is under `outputs/performance/oct10-preview-checkpoints/`, including `desktop-verified/`, `mobile-verified/`, `built-source.json` and `vercel-output.log`. Ignored build snapshots, raw logs and screenshots are not part of the Git publication; the implementation, reproducible checks and this report are included.

### Controlled Phone Comparison

Live previews can also be changed in **System > Settings > Live project previews**. The checkbox is off by default, saves its choice on this browser, and applies without reloading the world. Turning it off unloads active project frames and prevents new ones from loading; turning it on opts into the normal nearby-preview selection. The statue, boards and project links remain available. Fresh visits and older saves without a valid preview preference default to off; resetting local settings restores that default. Existing saved on/off choices are preserved, including a previously saved enabled value.

The explicit `?preview-test=off` URL takes precedence over the saved preference. On that URL the checkbox is unchecked and disabled, without changing the saved choice. Remove the parameter to use the checkbox normally.

The settings addition passed 59 focused controls, preview and diagnostics tests, TypeScript, scoped lint, Vercel compilation and output validation. Its browser checks passed at desktop 1440 x 960/High and touch 390 x 844/Auto: 16 checks each, including the actual checkbox, no new preview requests while disabled, saved-off startup after a deliberate reload, re-enabling without replacing the current world, unchanged project URLs and URL-override precedence. Screenshots and canvas checks used controlled cross-origin project content; they do not establish that physical-device crashes are fixed. Evidence is under `outputs/performance/oct11-preview-settings/`. The first mobile harness attempt assumed child DPR equaled the parent's emulated DPR; it now records the actual positive child DPR while retaining the exact viewport/canvas and context-health checks.

After this follow-up is deployed, compare the same route on the same phone and browser:

1. Open the ordinary site URL, ensure **Live project previews** is checked, visit the statue and rotate through the five project boards.
2. Open the same URL with `?preview-test=off` (or append `&preview-test=off` if there is already a query). Repeat the route. The complete world, statue, boards and project links remain; only automatic live iframe loading is disabled for this explicit control. Logs report `previewMode: off`.
3. Open each project directly in its own tab, then compare against its live preview inside the world. Close the extra test tabs before repeating to avoid adding unrelated memory pressure.
4. Export both sessions promptly. If only the live-preview run restarts, investigate combined resource pressure and iframe lifecycle. If the control also restarts, investigate the mainland/renderer or navigation independently. A passing single run is not sufficient to prove a memory leak fixed.

For an OS-level cause, inspect the iPhone's Analytics Data around the recorded UTC time (Settings > Privacy & Security > Analytics & Improvements > Analytics Data), if available. A matching JetsamEvent/WebContent crash report can distinguish a memory termination from other failures. Preserve timestamp, affected process, `reason`, `rpages` and `pageSize`; redact device identifiers and unrelated process details before sharing. Alternatively use Safari Web Inspector on a Mac with the phone connected to record memory and navigation. Vercel cannot retrieve these device-only reports.

## Confirmed Rendering Fault

The initial controlled High-quality desktop workflow reproduced a real blank canvas after an injected rendering exception, Resume, planet travel and forced WebGL loss/restoration. The UI remained visible and the context had restored; there was no additional uncaught JavaScript exception. A focused test then confirmed that a throwing postprocessing pass left an offscreen framebuffer selected. The existing recovery path switched to direct rendering and continued drawing offscreen.

The presentation layer now restores the previous render target, `autoClear`, and scene override material on an exception before propagating the original error. The world records that error, pauses its animation loop and allows an explicit Resume without rebuilding or reloading the document. Normal effects remain unchanged, as does the existing Low-quality policy after context restoration. This fixes the reproduced sequence; it does not establish that all reported iPhone failures have the same cause.

## Memory Maintenance Without Visual Downgrades

Research rechecked 15 October 2026. Frequent blanket flushing is not a memory
management strategy for this world: recreating visible textures, geometry,
render targets, and shader programs can cause stalls and raise allocation
churn. `gl.flush()` submits queued graphics commands; it does not free memory.

Use the following ownership and residency rules:

- Keep visible, current, destination, and observed worlds protected. The existing
	planet-cache sweep checks at most every 500 ms and retires unused residents
	after its grace period; it does not delete everything on a repeating timer.
- On a world unload or cancelled load, dispose owned geometry, materials,
	textures, skeletons, shadows, and instance bookkeeping. Removing a scene node
	alone is not disposal.
- Close decoded `ImageBitmap` sources only when their owner is definitively
	finished. Streamed terrain now carries an explicit, deduplicated image-release
	callback from the fresh load through final unload or cancellation.
- GPU-only eviction of hidden scenery must retain CPU data for reuse and
	context restoration. It must not close shared images or dispose resources
	still referenced by active scenery.
- Preserve texture resolution, geometry detail, materials, lighting, and effect
	settings. Experimental multi-draw is disabled by default after the measured
	frame-time regression below. It requires explicit developer opt-in and native
	support; it is not activated by hardware support alone. The experiment only
	combines immutable sibling batches with identical material identity and
	compatible state. Custom and transparent draws stay separate, and scene-level
	objects referenced by visibility/residency registries retain their identities.
- Reuse render targets and buffers when dimensions and data are unchanged.
	Do not poll synchronous graphics queries in the normal animation loop.
- Do not call forced garbage collection, lose the graphics context, reload the
	page, or clear saved location/settings as periodic production cleanup.

The resource-disposal boundary uses Three.js type flags rather than relying on
module-instance identity, and includes shader-uniform texture arrays. Batched
rendering bookkeeping is released once. Geometry-only neighborhood retirement
also releases instance buffers, while preserving the shared materials and
textures. Full scene export expands the batched instances back into their
original geometry, transforms, and colors.

For maintenance, repeat the same destinations and return to the same camera
pose at fixed quality. Compare post-GC heap in diagnostics, backing buffers,
decoded-image estimates, native-process allocation, actual render counts,
frame timing, and screenshots. Keep native allocator pools separate from GPU
VRAM claims, and never add overlapping categories. Forced GC is appropriate as
a measurement control in isolated profiling, not as application behavior.

Research references:

- [Three.js r185 disposal guide](https://raw.githubusercontent.com/mrdoob/three.js/r185/manual/en/how-to-dispose-of-objects.html): explicit ownership, shader/texture disposal, `ImageBitmap.close()`, and the cost of disposing reusable resources.
- [Three.js BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html): per-object culling, multi-draw batching, and fallback behavior; runtime assumptions are checked against the installed r185 implementation.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): bounded budgets, batching, avoiding allocation churn and blocking queries, and the distinction between command flushing and memory release.
- [Chrome memory-problem guidance](https://developer.chrome.com/docs/devtools/memory-problems): distinguish bloat, retained allocations, and frequent collection using repeatable measurements.

### Rejected Multi-Draw Experiment, 15-16 October

Five same-scene Chrome comparisons used Balanced quality, fixed cameras and
lighting, refreshed shadow maps, and explicitly requested rendered frames.
Desktop canvases were 1280 x 800; the mobile-sized canvas was 390 x 844, both
at device scale factor 1. Each scene was captured before and after enabling
the native multi-draw pass, without changing geometry or material settings.

| View | Draws Before | Draws After | Triangles, Unchanged |
| --- | ---: | ---: | ---: |
| Plaza | 2,583 | 2,468 | 2,386,427 |
| Workshop, night | 2,299 | 2,247 | 1,585,355 |
| Prism planet | 1,263 | 1,215 | 2,502,467 |
| Bengaluru | 206 | 206 | 367,619 |
| Mobile plaza | 1,281 | 1,233 | 1,829,767 |

All five latest comparisons had zero pixel differences and no page errors.
Bengaluru's visible tile renderer is separate, so batching hidden mainland
scenery does not reduce its visible draws. These are submission and image
equivalence results, not an FPS improvement or a physical-phone certification.

Separate-build timing was variable and changed direction when the run order
was reversed. A subsequent same-scene test therefore alternated native batches
and their exact expanded meshes after warming both paths. Cameras, pixels,
triangles, pixel density, and shadow state matched; each sample explicitly
requested rendering. Mean times below average the two windows per mode:

| Auto-Quality View | Batch Sorting | Expanded Draws | Native Multi-Draw |
| --- | --- | ---: | ---: |
| Plaza | Off | 96.4 ms | 108.5 ms |
| Plaza | On | 98.1 ms | 106.5 ms |
| Prism planet | Off | 58.2 ms | 62.3 ms |
| Prism planet | On | 60.6 ms | 63.9 ms |

The saved submissions did not translate to lower frame times on this Windows
Chrome / Intel Arc Pro setup. Normal application rendering keeps
the existing mesh path. The tested utility and export/teardown support remain
available for explicit experiments, not as an enabled performance claim.
No models, textures, lighting, effects, or settings were downgraded to improve
these numbers. The paused-scene test is not live-gameplay FPS certification.

### Resource-Lifetime Verification, 16 October

The final default-off build passed TypeScript, scoped lint, 86 focused tests,
the Vercel output validator, and 48 desktop/mobile world checks. Those checks
covered all nine authored planets, their orbital views, mainland districts,
Bengaluru tiles, movement, and night rendering, and asserted that experimental
multi-draw was absent. Native mobile touch, orientation, camera changes, and
WebGL loss/restoration also passed with the same document, scene, canvas, and
player position. The existing Low-quality recovery policy was not changed.

A separate complete control/experimental-candidate comparison performed three
identical travel/return cycles, with Auto quality, Day lighting, previews and
audio off. Both returned to approximately 197.732 MiB of geometry backing and
303.635 MiB of image RGBA8 base estimates. Post-GC heap rose from about 100.6 to
106.2 MiB in the control and 100.7 to 106.2 MiB in the experimental candidate.
The final default-off build is distinct from this experimental timing build.

The renderer native buffer pool's allocated-object counter rose from 141.686
to 394.918 MiB in the control and 143.398 to 396.823 MiB in the experimental
candidate. These cleanup fixes therefore do not establish a complete fix for
the observed native retention.

A diagnostic-only control replayed the unchanged control build with this
probe's `Network.enable` payload buffers limited to 1 MiB total and 256 KiB per
resource. Native-pool growth fell from 253.232 MiB to 129.426 MiB, with the
limited run measuring 89.327 to 218.753 MiB. All 15 checkpoints rendered
nonblank scenes without recorded page errors or context loss, and returned
geometry and image estimates matched. No application cache, request, texture,
model, or quality setting was changed. This demonstrates a material diagnostic
contribution, not an application memory saving. Other debugger sessions and
browser/driver accounting remain, so the residual growth is not yet attributed.
The payload limits apply to the individual DevTools session, as documented by
the [Chrome DevTools Network protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Network.pdl).

Allocator roots, geometry/backing estimates, image estimates, and GPU host
allocations overlap; they must not be summed or presented as physical VRAM.
The attempted reverse-order memory repeat was incomplete when the control
browser closed, so it is not treated as a successful comparison. No general
FPS gain, physical-phone stability, or whole-site memory-leak guarantee is
claimed from these tests.

### CPU Copy Release, 16 October

The retained-copy rule above was revised by an explicit product decision: the
renderer's private footprint, not VRAM, is what Chrome and Android act on when
they discard or kill a tab, and the duplicate CPU copies were the largest
remaining lossless saving. [gpu-residency.ts](../app/gpu-residency.ts) now:

- Arms the attributes of immutable, unpickable scenery (`SceneryBatch`,
  `City_VisibleSilhouettes`, `Everyday_CraftedBuilding`; never instanced,
  batched, skinned, interleaved, morphing, or under pickable roots) so the
  first `onUpload` replaces each static array with an empty one. Counts and
  precomputed bounds stay valid, dynamic attributes (the silhouette index) keep
  their data, and released meshes ignore rays.
- Closes a decoded `ImageBitmap` after its first upload when every texture of
  that source shares one GL cache key, swapping the source to a 1 x 1
  placeholder so any later upload is harmless rather than fatal. Managed
  models arm their images when parsed; planets when prepared.
- Keeps released resources resident during hidden-mainland GPU eviction, since
  nothing could re-upload them.
- Replaces seamless context restoration: on `webglcontextlost` the world
  checkpoints its location and the page rebuilds it behind the loading screen.
  `?keep-cpu-copies` disables the release for export and audit tooling.

Text fitting changed in the same pass: [text-fit.ts](../app/text-fit.ts)
measures each word once instead of shaping cumulative lines at up to 95 font
sizes, and speech bubbles draw their canvas only when first shown. Measured on
the same low-quality desktop scene, renderer private footprint fell from 837 MB
to 659 MB after the text changes (Blink shaping tables 134 MB to 12 MB) with
`measureText` calls down 95%; the figures after copy release are recorded in the
session notes rather than claimed here until re-measured on a physical phone.

## Measured Local Memory

The 11 October investigation profiled the isolated local build at `http://127.0.0.1:4369/`, not an unrebuilt working tree or a physical phone. Fresh Windows Chrome sessions used Balanced quality, device scale factor 1, desktop 1440 x 960 and mobile-emulated 390 x 844 viewports. Live previews, audio/voice and the Linux PC were inactive. Each run visited the plaza, project area, Prism planet and returned to the plaza. The profiler collected unique scene backing-buffer sizes and Chromium heap counters before/after forced GC; the second run also collected four successful detailed native memory dumps.

### Largest Reported Categories

| Category | Observed Range | Interpretation |
| --- | --- | --- |
| GPU-process `malloc` allocator | 652.2-761.3 MiB | Largest reported native allocator in the profiled browser; includes host-side graphics/driver allocations and is **not physical VRAM** |
| Main renderer ArrayBuffer/external-string backing storage | 247.8-288.7 MiB after GC | Primarily binary assets; scene geometry accounts for 213.8-260.0 MiB of this category |
| Main renderer native canvas resources | 208.0-223.8 MiB | Browser-reported canvas resource allocation, supporting the in-world display-texture priority |
| Main JavaScript object heap | 91.4-105.3 MiB after GC | Objects, code-related data, strings and application state, excluding the separately reported backing-store category |

These figures are not independent totals. Geometry is part of backing storage; native allocator parents/children and shared graphics resources overlap. Do not add rows or call the GPU-process allocator a VRAM measurement. The native dump did not provide usable process RSS/private-footprint totals in this capture. Three.js texture/geometry counts likewise are not byte measurements.

The scene image census found 366.8 MiB of base pixels at the plaza and 417.5 MiB on the planet **if represented as RGBA8**. This is a dimension-based payload estimate, not measured residency. At the plaza it comprises 213 canvas images (195.5 MiB), 47 ImageBitmaps (90.6 MiB), eight HTML images (76.3 MiB), and other image descriptors (4.5 MiB). Actual formats, mipmaps, copies, upload state and cached images outside the scene change the real footprint.

### Specific Targets

| Resource | Measured Storage Or RGBA8 Base Estimate |
| --- | --- |
| Scene position attributes | 52.2 MiB of backing buffers |
| Scene normal attributes | 52.1 MiB of backing buffers |
| Scene color attributes | 47.3 MiB of backing buffers |
| Scene UV attributes | 34.8 MiB of backing buffers |
| Shared city silhouette geometry | 37.9 MiB of backing buffers |
| Loaded Prism detail | 61.8 MiB of backing buffers |
| First two referenced resume page images, each 2048 x 2897 | 45.3 MiB combined RGBA8 base estimate; additional cached pages are not included in that figure |
| Companion base-color, normal and roughness maps, each 2048 x 2048 | 48 MiB combined RGBA8 base estimate |
| Markets and news canvases, each 2048 x 1152 | 18 MiB combined RGBA8 base estimate |
| Chronicle canvas, 1800 x 1200 | 8.24 MiB RGBA8 base estimate |
| Weather canvas, 2048 x 1024 | 8 MiB RGBA8 base estimate |

The source confirms that `createResumeBooks()` eagerly starts every resume-page load. `createBulletinWorld()` allocates both full-resolution canvases during construction. `createVisibleGeometry()` merges city silhouette data and retains per-range indices plus separate main/shadow index regions. These are concrete optimization surfaces, not evidence that the individual features should be removed.

### Recommended Order

1. **Introduce byte/pixel-budgeted display residency.** Keep small, readable placeholders at a distance; allocate high-resolution canvas/page textures only when needed and retire unused ones with hysteresis. Retain compact text/data/redraw recipes rather than every large canvas. Halving both dimensions quarters pixel storage, but visual readability must be checked before choosing each tier. Static signs can share backgrounds or use an atlas; dynamic displays should retain their existing update-on-change behavior.
2. **Load resume pages by visibility and spread.** Avoid decoding every full-resolution page at startup. Preserve page turning and high-resolution close reading, with a bounded shared cache and cancellation of obsolete loads. Both books already share page textures, so duplicating that cache per book would be a regression.
3. **Compact selected geometry attributes.** Normalized Uint8 colors could reduce the eligible 47.3 MiB color buffers to about 11.8 MiB; normalized Int16 normals could reduce 52.1 MiB to about 26.1 MiB. These are theoretical representation savings, not implemented results. Verify value ranges, lighting error, custom shaders, skinning and exporters before adoption. Keep world-position precision unless a per-chunk quantization scheme is validated.
4. **Reduce texture residency, not merely download size.** Evaluate 1024-pixel variants and GPU-compressed KTX2/Basis assets for suitable 2048-pixel maps. Three 2048-square RGBA8 maps reduced to 1024-square would save 36 MiB of base pixels, before mipmaps. Normal-map fidelity and close-ups need explicit comparison. JPEG/WebP compression alone does not reduce same-dimension decoded/GPU storage. Reuse one transcoder loader, cap worker concurrency and account for decode/transcode peaks.
5. **Make geometry/cache residency byte-aware.** The 37.9 MiB silhouette mesh is a useful first target for spatial partitioning and duplicate-index review. Preserve visibility and shadow behavior. Share immutable geometry and use instancing where shapes genuinely match; merging draws can duplicate vertex data and is not automatically a memory optimization.
6. **Control peak coexistence.** Bound simultaneous fetch/decode/upload work and release obsolete intermediates before loading replacements. Do not retain inactive planet detail just because a count-based limit permits it. Preserve live/shared resources and the current scene while unloading others.
7. **Preserve recovery when releasing CPU copies.** `texture.dispose()` releases renderer resources but does not necessarily release a retained canvas/ImageBitmap source. Close ImageBitmaps and drop references only after their last owner is finished, or retain a way to reload them. Likewise, do not blindly clear BufferAttribute arrays after upload: raycasting, export, updates and WebGL restoration may still need them.

### Retention Versus Peaks

On the desktop return checkpoint, backing storage fell from about 335.6 MiB before GC to 247.9 MiB afterward. Scene geometry returned from 260.0 MiB on the planet to 219.95 MiB, essentially its initial value. The mobile-emulated run also returned to the initial geometry and backing-store levels, with one document and roughly 475 DOM nodes. These two routes do not establish an unbounded JavaScript/geometry leak.

However, GPU-process native `malloc` rose from 652.2 MiB initially to 761.3 MiB on return while its reported logical `gpu` allocator returned from 264.3 MiB on the planet to approximately its initial 248.6 MiB. Caching, allocator retention, driver behavior or a leak require repeated-cycle attribution to distinguish. Do not claim all native memory was reclaimed. Forced GC is a diagnostic comparison, not a production fix, and these desktop measurements do not establish an iPhone termination threshold.

### Reproduction And Sources

The existing `scripts/compare-runtime.cjs` now accepts `--memory` and `--native-memory`. With modern Node and Playwright available, use `--single local --control http://127.0.0.1:4369/ --memory --native-memory --label local-memory`, adding `--mobile` for the emulated viewport. Native traces are generated only by this explicit profiling tool, not by the application. Original artifacts are under `outputs/performance/oct11-memory-census-desktop/` and `outputs/performance/oct11-memory-attribution-mobile/`; `ranked-summary.json` records the non-additive native categories. The observed low FPS during these profiled sessions is not a controlled performance comparison.

- [Chrome memory diagnostics](https://developer.chrome.com/docs/devtools/memory-problems): live heap versus process footprint, allocation profiling and retained-object checks.
- [Chromium Runtime protocol](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getHeapUsage): separate JavaScript, embedder-GC and backing-store fields; measurements cover an isolate, not an arbitrary individual object.
- [Three.js texture memory](https://threejs.org/manual/en/textures.html#memory): image dimensions, mipmaps and the distinction between transfer compression and GPU storage.
- [Three.js BufferAttribute](https://threejs.org/docs/pages/BufferAttribute.html) and [KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_mesh_quantization): normalized integer attributes and precision/compatibility tradeoffs.
- [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html): hardware detection, transcoding, worker limits and loader disposal.
- [ImageBitmap.close](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close) and [WebGL memory budgeting](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#estimate_a_per-pixel_vram_budget): explicit resource ownership and budgets without relying on a portable free-VRAM query.

The initial investigation changed only profiling/reporting. The following implementation applies the highest-priority reductions; other techniques above remain proposals.

## Implemented Memory Reductions

The memory follow-up preserves the world, models, original resume PDF, full-resolution page images and near-view display layouts. It does not depend on the separate, unpublished child-preview rollout.

- Resume books load shared 512 x 724 preview images initially. Only the nearest book's current spread requests original 2048-pixel pages, with one request in flight and at most two resident detail textures. Page turning retires obsolete details, distant views return to previews after an eight-second grace period, and hidden/off-mainland states release them immediately. Late arrivals cannot restore retired textures. The existing PDF renderer now generates the previews; original page/PDF hashes were preserved.
- Weather, market, news and chronicle canvases use quarter dimensions while distant. Their original paint coordinates are retained through a canvas transform, and original resolution returns nearby. Distance/time hysteresis avoids repeated resizing. GPU texture allocation is released before a size change; both faces keep sharing the same texture. Hidden pages cannot promote themselves back to full resolution through a late data update.
- Owned static scenery and city-silhouette outputs store eligible colors as normalized Uint8 values and normals as normalized Int16 values. Positions, UVs, indices and collision bounds remain unchanged. Error bounds are half a quantization step (plus floating-point tolerance). Skinned/morph geometry, dynamic/interleaved attributes, custom upload callbacks, nonfinite values and HDR/out-of-range colors are excluded. The exact merge helper is unchanged, and batching supports `compactAttributes: false` for full-precision output.
- No new runtime dependency, animation loop, polling timer, worker or server-side service is introduced. CPU data needed for raycasting and context restoration remains available.

### Matched Before And After

Separate fresh Chrome processes tested the committed pre-fix build at local port 4368 and the isolated publication candidate at 4370. Both used Balanced quality, mobile-emulated 390 x 844, DPR 1, previews/audio/VM off, and the plaza -> project area -> Prism -> return route. These are Windows Chrome measurements, not physical iPhone limits or a controlled FPS benchmark.

| Metric | Before | After | Reduction |
| --- | --- | --- | --- |
| Plaza scene geometry buffers | 219.95 MiB | 194.56 MiB | 25.39 MiB |
| Prism scene geometry buffers | 260.02 MiB | 232.00 MiB | 28.01 MiB |
| Plaza ArrayBuffer/external-string backing storage after GC | 247.78 MiB | 222.39 MiB | 25.39 MiB |
| Plaza native canvas-resource allocation | 208.04 MiB | 167.45 MiB | 40.58 MiB |
| Prism native canvas-resource allocation | 223.77 MiB | 183.19 MiB | 40.58 MiB |
| Plaza scene-image RGBA8 base-pixel estimate | 366.81 MiB | 292.27 MiB | 74.54 MiB |

The geometry reduction is included in backing-storage reduction, and image estimates overlap native resources; do not add these rows. Near the statue's resume book, full-resolution pages were deliberately resident and the image estimate was 334.71 MiB instead of the distant 292.27 MiB. GPU-process native malloc was lower at these checkpoints by approximately 6-19 MiB, but allocator caching/driver behavior makes that less directly attributable than unique geometry bytes. Neither this metric nor the image estimate is a physical VRAM reading.

### Verification And Limits

- The isolated publication candidate passed 73 focused memory/display/navigation tests and 21 scene-export/resource/recovery tests, TypeScript, scoped lint, the Vercel-adapter production build and output validator. Existing generated Linux-PC inputs were copied only after validating their manifest hashes; unrelated work was not included in the candidate.
- The resume browser check verified low-resolution startup with no resident full pages, original-resolution near views on both sides of both books, page turning, all reader pages, zoom, text mode, click/touch, the original PDF hash and release back to previews. Its menu path and statue camera were updated to match the existing UI/foreground geometry; runtime book positions were not changed.
- Desktop and mobile browser checks verified all four large displays restore their original resolution nearby, paint nonblank content, preserve viewport bounds, shrink on hidden state and repaint after return. The mobile weather probe enters the actual close-reading area; the ordinary mobile Commons arrival is intentionally farther away.
- The existing High-quality mobile touch/orientation workflow passed native WebGL loss/restoration with the same document, scene and canvas. The prior Low-quality policy after context restoration is unchanged.
- Before/after raw memory traces, build logs and browser captures are under `outputs/performance/oct11-memory-fix/` and `outputs/performance/oct11-memory-fix-{before,after}-mobile/`. These local artifacts are not required at runtime.

These checks establish bounded resource behavior and local allocation savings, not a universal no-reload guarantee. Browser/OS pressure can still terminate a page, and physical-device soak testing remains necessary. The older child-preview changes and unrelated work are outside this memory publication.

## Actual Mobile Limits

There is **no universal Safari, Chrome, Firefox, or in-app-browser MB allowance** for a Three.js page. Device RAM, OS and engine version, other tabs/apps, foreground/background state, GPU/driver behavior and embedded-app policy matter. Do not treat old claims of 256 MB/384 MB canvas quotas or a JavaScript heap limit as a current universal iOS 18.7 limit. WebKit has changed canvas accounting over time, including removal of an artificial canvas-context limit in a 2023 Technology Preview; that is not a guarantee of unlimited memory on current iPhones.

| Constraint | What we can establish |
| --- | --- |
| iOS process memory | iOS can terminate processes under memory pressure or a per-process limit (jetsam). The limit is not exposed to page JavaScript. Native device reports can distinguish `per-process-limit` from system pressure; website logs alone cannot. |
| LinkedIn on iOS | The supplied UA identifies iOS 18.7 and LinkedIn 9.32.4494, not phone hardware, spare RAM or the exact host implementation. WKWebView content runs in a separate process; termination callbacks belong to the native host. The website cannot change LinkedIn's process/reload policy. |
| Chromium heap | `performance.memory` is deprecated/nonstandard, implementation-dependent, and does not account for all renderer/worker/iframe/GPU costs. `jsHeapSizeLimit` is a heap ceiling, not an allocation target. |
| Safari/Firefox measurement | Neither portable JS heap telemetry nor free GPU memory is available. Missing values stay unknown/null; they are not reported as zero. `navigator.deviceMemory` is approximate and unavailable on Safari/iOS and Firefox. |
| Wider memory API | `measureUserAgentSpecificMemory()` is experimental, Chromium-specific, HTTPS and cross-origin-isolation dependent. Do not impose COOP/COEP solely for diagnostics: it can break existing embeds and resources and still does not solve iOS measurement. |
| WebGL capabilities | Query the actual context. `MAX_TEXTURE_SIZE`, sampler limits, samples, extensions and renderbuffer dimensions vary. A legal 8K/16K texture can still cause memory pressure. WebGL has no portable total/free VRAM query. |
| GPU context loss | Memory pressure, GPU reset, driver problems or other pages can cause loss. Loss is a symptom, not proof of an application leak. Recovery can reuse the same document; a killed process cannot run recovery code. |
| CPU/thermal limits | 60 FPS allows about 16.7 ms/frame; 30 FPS about 33.3 ms. These are performance targets, not browser guarantees. Sustained heat/battery modes and expensive build/decode/upload work can reduce throughput without throwing an exception. |
| Lifecycle | Background pages may freeze or be discarded. Unload/pagehide are not guaranteed on mobile. Save bounded checkpoints while running and on visibility changes; do not try to defeat OS reclamation with timers or unload traps. |
| Storage/network | Cache/IndexedDB disk quotas, Vercel function memory, download size and the approximately 64 KiB beacon queue are separate limits. None is a phone renderer-memory budget. |

### Why Small Downloads Can Still Be Heavy

An uncompressed RGBA8 texture requires approximately `width * height * 4` bytes before mipmaps; a complete mip chain adds about one third:

- 2048 x 2048: 16 MiB base, approximately 21.3 MiB with mipmaps.
- 4096 x 4096: 64 MiB base, approximately 85.3 MiB with mipmaps.
- 8192 x 8192: 256 MiB base, approximately 341.3 MiB with mipmaps.

These are format-based estimates, not measured VRAM. A small PNG/JPEG download normally expands for GPU use. Geometry can have CPU typed arrays, construction temporaries and GPU buffers concurrently. Shadow maps, bloom/AO targets, depth and multisampling add allocations beyond scene texture counts. At 390 x 844 CSS pixels, DPR 3 gives 2,962,440 render pixels: about 11.3 MiB for just one RGBA8 color surface before other targets/depth. Resolution cost grows quadratically with DPR.

The optional Linux PC requests **128 MiB guest RAM plus 4 MiB VGA memory**, before emulator/DOM/state-restore overhead. A running embedded project can add its own scripts, canvases and memory outside the main heap measurement. This is why aggregate peak residency matters more than individual file size or whether Chrome eventually draws the page.

## Diagnosis And Next Decisions

Previous local Chromium mobile-emulation checks returned to roughly 338-340 MiB of JS heap after cleanup, but also observed approximately 897 MiB at a recovery checkpoint. A desktop run observed approximately 1,058 MiB during travel. These historical measurements are not iPhone footprints, safe limits, proof of a leak, or benchmarks of the new logging code. They identify a credible peak-memory risk that a physical-device investigation must test.

1. Reproduce on the same iPhone in LinkedIn and directly in Safari, recording OS/app version, phone model, UTC time and the exported session ID. Also check one constrained Android device. Compare cold startup, mainland travel, one planet, previews and Linux separately before combining workloads.
2. Classify the evidence: `frame_error`/React error means a code path failed; asset/fetch errors identify delivery/decoding; context loss with recovery is a graphics reset; a new page with no final callback is only suspected process termination. Obtain a redacted device jetsam/WebContent crash report when available. A missing final beacon does not itself prove a crash.
3. For repeated memory-linked failures, prioritize reducing **peak coexistence** of inactive mainland resources, incoming planet assets, decoded buffers and optional subsystems. Existing count-based streaming/cleanup is helpful but is not a comprehensive byte budget. Account for ownership and keep active/shared resources alive.
4. Preserve the existing visual contract first through immutable geometry sharing, prebuilt detail, incremental construction/upload and stricter lifetime ownership. GPU-compressed textures, stronger LOD, lower render resolution or changing live-preview/VM behavior require separate visual/product validation; no blanket visual downgrade was added here.
5. Establish per-device empirical budgets with headroom and long travel/background-return tests. Do not allocate until a browser crashes to discover a supposed threshold. Desktop viewport/CPU emulation does not reproduce iOS jetsam, WKWebView policy, thermal throttling, or the physical GPU.

## Local Verification

- 45 focused Node tests passed for diagnostics, radio, planets, shaders, resource lifetimes and presentation exception recovery. All 11 diagnostic tests were repeated successfully after the final equivalent control-character sanitizer adjustment. The new presentation regression failed before the repair and passed afterward.
- TypeScript, scoped runtime lint, Vercel-adapter compilation and the repository Vercel-output validator passed. The build used existing generated assets; it did not rerun the unrelated asset-download prebuild or deploy to Vercel.
- Final isolated Chromium runs passed at 1440 x 960 desktop/High and 390 x 844 touch/Auto. Each covered synthetic window/rejection/fetch failures, a thrown render call and Resume, failed optional-panel download/retry, a planet round-trip, native forced context loss/restoration, local JSON download and an intentional reload.
- The world retained its document/scene/canvas through the recovery workflow. Only the deliberate reload created a new page ID while retaining the session ID. Pixel probes required actual fresh frames, verified nonblank canvases and checked canvas/viewport dimensions and horizontal overflow. These are local Chromium tests, not iPhone/Safari certification or sustained-FPS benchmarks.
- Desktop sent 15 accepted batches containing 105 event observations; mobile sent 12 containing 90. All observed responses were 204. Every observed event matched an actual `KINGDOM_CLIENT` server log after the endpoint's sanitization, and no synthetic secret survived. One inline-resource marker was normalized on the server. The final server artifact contains 201 lines including later exit beacons; duplicates are expected.
- Largest observed batch: 9,585 bytes. Largest observed event: 1,432 bytes. All 290 runtime source fingerprints matched the final build. Evidence is under `outputs/performance/oct10-diagnostics/`, with final browser reports in `desktop-final/` and `mobile-final/`; the earlier failed desktop capture is retained separately.
- A broader asset/preview run still encountered seven pre-existing compressed-asset metadata test failures. They were not changed. The entire repository test suite was not rerun, and general physical-device crash freedom remains unverified.

## Sources

- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): system limits, no portable VRAM query, eager deletion, compressed textures and blocking GPU queries.
- [Apple jetsam reports](https://developer.apple.com/documentation/xcode/identifying-high-memory-use-with-jetsam-event-reports): process limits, system pressure and interpreting device reports.
- [Apple WKWebView process termination](https://developer.apple.com/documentation/webkit/wknavigationdelegate/webviewwebcontentprocessdidterminate(_:)): native-host termination callback.
- [WebKit Technology Preview 174](https://webkit.org/blog/14390/release-notes-for-safari-technology-preview-174/): historical canvas-limit removal, not a universal current iOS memory allowance.
- [MDN performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory), [deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory), and [measureUserAgentSpecificMemory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory): measurement limitations and support.
- [Chrome Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), [MDN sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon), and [MDN context loss](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost): lifecycle, delivery and graphics limits.
- [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime) and [Vercel CLI logs](https://vercel.com/docs/cli/logs): search, export, retention and quotas.
