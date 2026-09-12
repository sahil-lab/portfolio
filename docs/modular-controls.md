# Modular controls and traversal

This pass preserves the existing TypeScript/Three.js renderer and React HTML interface. React Three Fiber/Drei were not introduced as a second rendering owner: the existing imperative asset, exhibit, and animation APIs remain intact. Replacing that renderer would require a broader scene migration.

## Extension points

| System | Source |
| --- | --- |
| Districts, routes, destinations, spawn | `app/world-config.ts` |
| Portfolio records and demonstration graphs | `app/portfolio.ts` |
| NPC identities, positions, dialogue | `app/encounter-config.ts` |
| Scenery construction | `app/world-scenery.ts` |
| Character movement and recovery | `app/character-controller.ts` |
| Keyboard and independent camera pointers | `app/game-input.ts` |
| Ordered, single-consumption interaction handlers | `app/interactions.ts` |
| Touch joystick | `app/touch-controls.tsx` |
| Camera obstruction and comfort modes | `app/game-camera.ts` |
| Body clearance and headroom | `app/collision-world.ts` |
| Stair/ramp, balcony, bridge, lift | `app/traversal.ts` |
| Delivery quest and state transitions | `app/delivery-state.ts` |
| Project simulations | `app/exhibit-state.ts` |
| Character and prop animation | `app/courier.ts`, `app/packet-press-asset.ts` |
| Voices, volume, gesture-gated audio | `app/kingdom-voices.ts` |
| Local versioned save validation | `app/persistence.ts` |
| Settings interface | `app/comfort-settings.tsx` |
| Scenery batching and measurements | `app/static-batching.ts`, `app/performance-budget.ts` |

`createWorld` accepts a character factory with the existing courier rig contract, so a replacement can supply a different model while preserving movement and quest systems. Projects continue to derive their buildings and demonstrations from portfolio records. Static scenery batches retain separate camera obstruction boxes.

## Controls and saves

WASD/arrows move; E interacts; P/Escape pauses. Pointer drag rotates, wheel/pinch zooms. Settings offer fixed-direction camera, reduced decorative motion, volume, mute, graphics quality, return to workshop, and a two-step local reset. Touch uses a dedicated left joystick plus independent camera pointer IDs; interaction remains a separate button. Cancellation, lost capture, blur, and hidden-page events clear held input. Gameplay uses `touch-action: none`; dialogs retain scrolling and screen safe-area padding. Touch targets are at least 44 CSS pixels.

Movement uses elapsed seconds and 0.15-meter collision substeps. The camera tests an expanded set of obstruction bounds, pulls inward immediately, eases outward, and clamps pitch. Close obstructions hide the courier to avoid an obstructed view. The RAM staircase uses a continuous ramp height matching its visible steps. Raised surfaces reject unsupported edge movement. The service lift carries boarded players, holds their horizontal position while moving, and can be called back. Invalid/fallen character positions recover to the workshop.

Version 1 saves contain settings, discoveries, and delivery state. They reject malformed values, invalid recipient IDs, duplicate deliveries, and broken inventory conservation. Interrupted charging safely restarts with an empty press; collected stock is retained. This save does not claim to persist the current stage of every project simulation. Audio is created/resumed only after an interaction gesture.

## Measured performance

Development preview observations at 1280 × 720, with another game preview running on the same machine:

| Observation | Draw calls | Reported triangles | Frame p95 |
| --- | ---: | ---: | ---: |
| Before static batching, balanced | 1,454 | 220,276 | 39.6 ms |
| After batching, balanced | 999 | 235,964 | 35.6 ms |
| After batching, low | 437 | 94,596 | 34.6 ms |

Counts are Three.js renderer counters and can include shadow work; they are not unique asset triangle totals. Targets are at most 1,100 draws and 650,000 reported triangles, with frame p95 at most 20 ms balanced / 34 ms low. The geometry/draw budget passed in these observations; the timing targets were **not yet met**. Low-mode observations varied between about 35 and 41 ms. These are development-browser measurements, not a hardware-independent frame-rate guarantee or a physical-phone benchmark.

Further changes cap balanced pixel ratio at 1.25, update shadows at 8 Hz, and avoid reconfiguring the renderer on every delivery/save transition. Final timing after those changes still needs fresh browser measurements.

## Verification and remaining checks

Eighteen automated tests cover delivery and exhibit regressions, GLB integrity, frame-rate-independent movement, wall sliding, fall recovery, ramp ascent, guarded edges, lift return, camera obstruction including moving doors on the next frame, corrupt/version-mismatched saves, duplicate delivery prevention after restoration, and independent pinch/cancel/focus input behavior. TypeScript checks pass.

Actual desktop play reached the RAM balcony by its staircase, rode the service lift, and walked onto the sky bridge. Inspection led to a wider room entrance aisle and rail openings at the bridge junction. Settings and live measurement controls were inspected in the game.

Follow-up browser verification used 390 × 844 and 375 × 812 phone viewports: visible header and interaction targets measure at least 44 pixels high, and there is no horizontal document overflow. Prepared capsules, collected one, changed stable camera, and reloaded: both inventory and the setting restored. Reset confirmation was opened and cancelled, preserving progress. Walked up the RAM stairs, into the balcony room, and back down. Pause and return-to-workshop controls were exercised.

The follow-up low-quality measurement at 1280 × 800 reported p95 33.5 ms, 428 draws, and 88,908 triangles, meeting the low target for that observation. Balanced timing still needs a fresh benchmark. Physical multi-touch remains unverified; desktop viewport inspection and automated pointer-event tests are not physical-phone testing.

Follow-up fixes disable and clear the joystick during pause/dialogs, ignore cancellation from unrelated fingers, refresh moving camera-obstruction bounds each frame, prevent saving after failed WebGL startup, preserve loaded delivery state in the fallback view, and keep audio suspended while paused.
