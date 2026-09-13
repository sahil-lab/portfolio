# Performance and playtest record

Test date: 13 September 2026. Production build served locally with vinext, not a development server. This is a measured development pass, not performance certification.

## Test setup and measured budgets

Desktop: Acer Predator PH315-53, Intel i7-10870H, 32 GB RAM, Windows 11 Home 10.0.26200. Codex in-app Chromium 152. The machine has an RTX 3060 Laptop GPU, but the browser reported **ANGLE Intel UHD Graphics (0x00009BC4), Direct3D11**; these are integrated-GPU results.

The in-game meter reports five-second average FPS and p95 frame interval. Draw/triangle counters are the most recent rendered frame, not route-wide peaks. Measurements below were stationary at the workshop after walking; they are not continuous route benchmarks. Browser visibility and actual render resolution matter.

| Setting / conditions | CSS viewport | Render buffer | Average FPS | p95 frame interval | Draws / triangles |
| --- | --- | --- | --- | --- | --- |
| Balanced, background QA tab (confounded) | 1280 × 720 | 1600 × 900 | 29.2 | 47.9 ms | 403 / 97,226 |
| Low, foreground | 1280 × 720 | 1280 × 720 | 49.9 | 25.0 ms | 403 / 97,226 |
| Balanced, foreground | 1280 × 720 | 1280 × 720 | 53.9 | 22.9 ms | 403 / 97,226 |

**60 FPS desktop target is not yet met on this declared setup.** These short samples cannot establish sustained performance throughout the world. No physical midrange phone was available; the 30 FPS mobile target remains unverified. Desktop viewport emulation does not establish mobile GPU, thermal, touch, or battery behavior.

The download script measures every file in dist/client independently with gzip, excluding source maps. This is a conservative client-assets estimate including lazy chunks, fonts and manifests; it is not a measured HTTP first-load transfer and excludes HTML/headers. Run `node scripts/measure-download.cjs` after building. The final complete client asset set is **2,141,047 bytes raw / 844,564 bytes gzip**, below the approximately 10 MB target.

## Implemented optimization and fixes

- Instance exact repeated primitive geometry; merge compatible static geometry by material and world-space tile. Preserve collision geometry separately.
- Reuse orb geometry and materials, with separate mutable chameleon skin. Cull distant inhabitants/curiosity props and skip their animation work.
- Construct project interior machinery when approaching its building. District base geometry remains compact and resident; this is not full district network streaming.
- Avoid resampling the Packet Press animation and stock visibility while unchanged.
- Stop the world RAF while the document is hidden, clear held inputs, suspend audio, restart with a fresh timestamp, and clamp resumed simulation steps to 50 ms.
- Deduplicate disposal of shared geometries, materials, all material texture slots, lines, sprites and shadow resources. A focused test protects shared-resource lifetime.
- Preserve one principal shadow-casting light and existing quality resolution controls. Existing WebP mural and embedded GLB assets already fit the download budget; no new mesh/texture codec dependency was introduced.
- Hide exterior title sprites while inside the corresponding project, reduce machinery label width, and widen the interior camera limit. Final production entry/exit was checked visually.
- Replace framework Link components with ordinary anchors after production logs exposed a broken framework prefetch/navigation callback. Direct portfolio routes use normal document navigation and the same portfolio content.

## Actual play route and results

Used visible interaction and movement controls in the production browser, without injecting player positions or simulation state.

| Scenario | Observed result |
| --- | --- |
| Workshop onboarding / repeated press interaction | One charging cycle; four capsules collected; extra pickup attempts did not exceed four |
| Delivery route: Workshop → RAM owl → GPU chameleon → Network cloud → Database tortoise family | Four distinct deliveries; carried inventory decreased 4 → 3 → 2 → 1 → 0; explicit completion banner |
| Already served recipient | Delivery disabled with Delivered status; ordinary conversation still worked |
| Save and reload | Completed round restored; no implicit restart |
| Explicit second round | Round 2 idle, completed rounds 1, four discoveries preserved |
| Routes: Workshop → CPU → Kubernetes lift → sky bridge → lift down → Kafka → RAM stairs and balcony | All seven districts reached on foot; lift carried player both ways; repeated interaction while moving reported wait; bridge and upper RAM room accessible |
| RAM return | Earlier manual ascent/descent and focused ramp test passed; this pass was interrupted after the balcony and did not re-establish an uninterrupted descent trace |
| Project route selection | Marked a distant entrance; did not teleport into the building |
| Component Studio | Walked through entrance; selected Amber; trigger, pause, resume produced Amber at stage 4; walked back out |
| Request Hall | Walked through entrance; key 404 returned missing record at stage 5; reset and key 101 returned 200 Copper coil |
| Collision detour | Database house blocked a straight cross-yard path; walking around its southern edge reached Request Hall |
| Pause / workshop recovery | Pause and Return to Workshop restored a safe spawn |
| Mobile layout emulation | 390 × 844 portrait and 844 × 390 landscape: no horizontal overflow, visible buttons at least 44 CSS pixels high/wide; joystick drag and camera drag exercised separately; landscape interaction collected one capsule |
| Final interior camera | Rebuilt production version entered Component Studio and exited through doorway; exterior title no longer covered camera |

Native simultaneous touch injection is unavailable in this browser interface. Independent movement/camera pointer tracking, two-pointer pinch, cancellation and clearing are covered by the focused control test; this is **not** a physical multitouch playtest. Long-session thermal performance, real-device simultaneous touch, and continuous route frame-time capture remain open checks. Do not call this a completed mobile performance certification.

## Automated verification and evidence

Production build succeeds; TypeScript passes; 19 focused tests pass covering delivery conservation and duplicate prevention, explicit round restart, save validation, independent input cancellation, camera obstruction and moving doors, ramps/lift boarding, project state transitions, navigation, exported hero animation and resource disposal. After the standard-anchor fix, actual navigation from the game to the directory and then résumé succeeded. No new console errors were recorded on the rebuilt pages; earlier framework errors remain in the historical log.

Local screenshots are retained in `outputs/playtest/`: delivery-complete.png, sky-bridge.png, desktop-low.png, desktop-balanced.png, react-result.png, backend-result.png, mobile-portrait.png, mobile-landscape.png, interior-camera.png. Screenshots capture real game states. They are not synthetic mockups. Personal portfolio content remains explicitly labeled demonstration content.
