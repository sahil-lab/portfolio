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

## Collect From Vercel

Deploy the diagnostics changes before expecting these records. No additional database, credential, or logging vendor is required. `POST /api/client-diagnostics` emits one JSON console line per accepted event, tagged `KINGDOM_CLIENT`. A successful ingestion returns 204 with `Cache-Control: no-store`; this does not mean the reported client failure was harmless.

1. Open the Vercel project, then **Logs**, not Build Logs.
2. Select the deployment, environment and UTC reproduction time. Search the message text for `KINGDOM_CLIENT`; optionally filter Request Path to `/api/client-diagnostics` and method to POST. An adapter may show the function route as `/__server`, so use Request Path rather than assuming one route name.
3. Open **Log Messages** inside a matching request. Search the literal session ID from its JSON message to find related requests. Our JSON `sessionId` is not necessarily Vercel's built-in session filter.
4. Export the messages, not just request summary rows. With a current authenticated Vercel CLI, a PowerShell export is:

```powershell
vercel logs --project portfolio --environment production --no-branch --since 1h --query KINGDOM_CLIENT --json --limit 1000 | Out-File -Encoding utf8 outputs/client-diagnostics.jsonl
```

For live reproduction, use `vercel logs --project portfolio --follow --json --query KINGDOM_CLIENT`. CLI live following lasts up to five minutes. Older CLI versions may not have historical/query options; check `vercel logs --help`. Narrow the time range or increase the result limit when an export is truncated. No CLI authentication tokens should be pasted into a chat or source file.

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

- Maximum 120 events/minute per page, with ordinary events limited to 100 to reserve failure capacity; identical events within one second are suppressed. Dropped counts are carried forward. Very large storms still lose events by design.
- At most 120 in-memory history entries and 60 queued events. Saved history plus queue is capped at 180,000 encoded bytes, trimming older history and then pending events when necessary. Events are capped at 6,000 bytes; stacks at 1,800 characters.
- Batches contain at most 20 events and 48,000 bytes. Flush checks run every 10 seconds; critical events request earlier delivery with a five-second minimum spacing. Delivery failures back off from 20 seconds to five minutes. Only one normal request is in flight, with an eight-second timeout.
- Hidden/pagehide events try a bounded beacon. The shared browser beacon queue is finite, so accepted enqueueing is not an acknowledgement of ingestion. Normal delivery does not consume the keepalive quota; the recorder never retries by reloading the page.
- The endpoint revalidates and sanitizes reports, bounds streamed request bytes, rejects browser cross-site origins and non-JSON bodies, and applies per-process limits of 60 requests/peer/minute and 600 total/minute with a bounded peer map. These limits are **not distributed authentication**. Non-browser clients can forge headers and session IDs. Use Vercel Firewall/rate limits for stronger abuse and cost protection.
- No passwords, cookies, authorization headers, room codes/identities, chat text, microphone data, guest terminal commands or guest state bytes are intentionally collected. URL credentials/query/fragment are removed, common secrets/emails are redacted, and fields are allowlisted. Browser/OS family and version replace the full user agent in our payload. Arbitrary error text and URL pathnames can still contain sensitive content; inspect exports before sharing and avoid putting secrets in paths or error messages. Vercel independently retains its ordinary request metadata, including IP/UA according to its policies.

## Confirmed Rendering Fault

The initial controlled High-quality desktop workflow reproduced a real blank canvas after an injected rendering exception, Resume, planet travel and forced WebGL loss/restoration. The UI remained visible and the context had restored; there was no additional uncaught JavaScript exception. A focused test then confirmed that a throwing postprocessing pass left an offscreen framebuffer selected. The existing recovery path switched to direct rendering and continued drawing offscreen.

The presentation layer now restores the previous render target, `autoClear`, and scene override material on an exception before propagating the original error. The world records that error, pauses its animation loop and allows an explicit Resume without rebuilding or reloading the document. Normal effects remain unchanged, as does the existing Low-quality policy after context restoration. This fixes the reproduced sequence; it does not establish that all reported iPhone failures have the same cause.

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
