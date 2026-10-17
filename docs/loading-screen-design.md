# Kingdom Loading Screen

## Research, 14 October 2026

The loading screen is an introduction to the existing miniature computer
kingdom, not a separate mini-game or an artificial delay. The references below
informed the interaction and motion direction; their artwork and code were not
copied. There is no objective "best loading screen" or measurable 10,000x visual
improvement claim.

| Reference | Relevant Finding | Kingdom Application |
| --- | --- | --- |
| [Goodgrowth: Boot Sequences](https://tympanus.net/codrops/2026/08/27/goodgrowth-boot-sequences-spinning-discs-and-the-art-of-the-portfolio/) | Console-inspired preload, identity, and reveal form one experience; simple CSS can carry lightweight motion. | A living computer mascot, circuit-board details, and a coordinated reveal into the world. |
| [R-K '26: Presence](https://tympanus.net/codrops/2026/04/07/r-k-26-the-thinking-and-code-behind-a-portfolio-led-by-presence/) | The preloader belongs to the site's visual identity; restrained transitions can replace heavier WebGL effects. | Existing Fraunces/Space Grotesk typography and mint/gold colors, with a short ready-state exit. |
| [Heron: Domain-Led Design](https://tympanus.net/codrops/2026/10/12/heron-ai/) | Derive visual language from the product's world; DOM interaction can be lighter than another WebGL layer. | Original bakery, clock house, tea shop, and motherboard illustration with DOM-driven eyes. |
| [NN/g: Progress Indicators](https://www.nngroup.com/articles/progress-indicators/) | Explain real work and use step counts when an honest overall percentage is unavailable; playful elements must not obscure progress. | Six actual preparation milestones, followed by a distinct world-assembly state. No fake timer or percentage. |
| [web.dev: Animation Performance](https://web.dev/articles/animations-guide) | Prefer transform and opacity for repeated animation; avoid unnecessary layout and paint work. | CSS bobbing, blinking, letter motion, and transformed progress fills; no per-frame React state loop. |
| [WCAG: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | Let users stop nonessential movement, with a control that does not trap focus. | One pause control, OS/saved reduced-motion support, and ordinary HTML exit links. |

The [Awwwards preloader search](https://www.awwwards.com/inspiration_search/?text=preloader)
was also consulted, but did not provide enough interaction detail to serve as
implementation evidence. Its older loading collection URL returned 404.

## Research, 16 October 2026

A second research pass ([session report](../outputs/loading-screen-research.md)
if exported; otherwise the summary below) ranked what makes loading screens
memorable, with sources: the loader should be the hero that becomes the site
(Outfit / HelloHello, View Transitions write-ups), progress must be honest and
staged (NN/g: a moving indicator roughly triples tolerated waits; stalls or
fake percentages destroy trust), narration of real work shortens perceived
time (Maister's waiting-line propositions), the final seconds dominate memory
(peak-end rule; goal-gradient), agency beats passive waiting, and physical
metaphors plus kinetic type establish craft quickly. Anti-patterns: fake
progress, blocking a ready app, generic spinners past ten seconds, no pause,
vestibular motion, a loader heavier than the app.

## Implementation: Power-On

The loader is now the kingdom's motherboard booting at night, using the
HUD's own dark ink, mint and gold palette so the handoff into the world is
continuous rather than a palette jump.

- A CSS-perspective PCB tilts beneath the diorama and follows a clamped
  pointer tilt (desktop, fine pointers only). Six copper traces run from edge
  pads into the chip socket; each real preparation powers one trace with a
  stroke-draw glow, lit vias, a lit edge pad and a spark burst at the socket.
  Quiet traces, orbiting satellite LEDs in the worlds' colors, a projection
  glow under the island, and a subtle grid and starfield complete the board.
- The title rises word by word (clip-path), the eyebrow tracks in, and
  "Kingdom" glows gold.
- A KINGDOM OS boot log lists the six real preparations by name in the order
  they actually finished (page.tsx now passes completion labels), then the
  ones still loading; without labels (fixtures) it falls back to list order.
  The native `progress`, the live status and the three stage labels are
  unchanged.
- The crowned computer keeps its phase expressions, pointer gaze, boop and
  heart interactions, zzz while nothing is ready, and a wider smile at 6 / 6
  when the socket turns gold.
- Ready: the header reads ONLINE, all traces flash, a warm power surge blooms
  from the board, the mascot cheers under confetti, the board tilts toward the
  camera, and the overlay fades immediately over 180 ms. There is no fixed
  pre-fade wait. Readiness is still immediate and inert; OS or saved reduced
  motion removes the overlay without an animation delay.
- Reduced motion freezes everything, snaps lit traces to their end state and
  removes bursts; the pause control stops all animation; projects and résumé
  remain plain links. Short landscape keeps the two-column layout with a
  compact log.

Runtime implementation: [world-loading.tsx](../app/world-loading.tsx) and
[world-loading.css](../app/world-loading.css). The artwork recipe remains
[render-loading-art.cjs](../scripts/render-loading-art.cjs).

## Verification

[Unit tests](../tests/world-loading.test.cjs) cover server-rendered states,
bounded real preparation counts, greeting selection, boot-log ordering
(finished names first, never invented completions), lit trace counts,
accessibility, the named boop control, the ready-only celebration, and
ready-state inertness. [Browser checks](../scripts/check-world-loading.cjs)
cover desktop, mobile, narrow mobile, short landscape and reduced motion,
including pointer response, pause stability, heart and boop interaction,
progress milestones, asset loading, layout, and the real nonblank-world
handoff. The saved-location lifecycle checks remain in
[check-player-controls.cjs](../scripts/check-player-controls.cjs).

## Measured Loader Overhead, 17 October 2026

The loader keeps its artwork, controls, layout, real preparation counts, and
HTML exits. Pointer events now retain the latest position and schedule at most
one update per animation frame. Stage bounds are cached and invalidated on
resize or scroll. Leaving the stage, hiding the document, enabling reduced
motion, pausing, readiness, and unmounting cancel pending pointer work.

Startup waits for a browser paint opportunity before imports and crosses two
animation-frame boundaries before heavy world construction. This lets the
real final preparation state be displayed instead of immediately burying it
under synchronous scene work.
Both boundaries are abortable, including during a replacement world startup.
They do not make scene construction itself asynchronous or guarantee that all
3D assembly work is free of long tasks.

The exit timer is scheduled at commit time. After its first real rendered
frame, the world pauses without requesting another frame during the short
fade. Loader dismissal releases that pause and starts optional asset work;
the already rendered world remains visible underneath. Automatic destination
links and movement controls wait for the same handoff. The user's explicit
Pause setting still takes precedence.

Queued background work also pauses during the fade. Optional shop-model
parsing and attachment, and city-map rasterization, use the existing
cooperative scheduler. Fresh loads take this hold before asynchronous shader
preparation so optional work cannot start early; saved-location restoration
can still load its required assets. Nested holds release independently, and
disposing a world releases its hold. Model files, texture dimensions, color
space, and anisotropy remain unchanged; this moves work out of the handoff,
not out of the application.

A matched Chrome component comparison used the prior built loader and current
source with identical assets and viewports. Median ready-trigger-to-removal
times came from three samples per case:

| Case | Before | After |
| --- | ---: | ---: |
| Desktop, 1280 x 800 | 911 ms | 196 ms |
| Mobile-sized, 390 x 844 | 909 ms | 191 ms |
| OS reduced motion | 927 ms | 12 ms |
| Layout reads for 100 pointer events in one task | 100 | 1 |
| Style writes for that same burst | 400 | 4 |

These are loader-overhead measurements, not a 10,000x total-startup claim.
The pointer burst is synthetic and does not represent ordinary mouse event
frequency. Frozen screenshots retained the same layout and artwork; the mean
channel difference was below 0.005/255, with no pixels crossing the comparison
threshold. The five existing desktop/mobile/narrow/landscape/
reduced-motion interaction checks passed.

The page's five existing lint diagnostics were reproduced unchanged in the
control; none were added. Loader, scheduler, world and affected asset paths
passed their scoped lint checks.

The final production run used fresh Chrome contexts, identical Low quality
and DPR 1, and the original assets. Ready-to-overlay-removal took 195.5 ms on
desktop, 192.0 ms on mobile, and 188.1 ms on a fresh direct Bengaluru visit;
the desktop control took 1800.9 ms. Each candidate displayed the actual
assembly state before construction, resumed rendering after dismissal,
cleared inertness, and produced one nonblank canvas with no page errors.

These single full-startup samples do not establish faster overall loading:
desktop readiness was 23.25 seconds before and 23.83 seconds after. Heavy
world construction still dominates startup. The improvement measured here
is loader overhead and handoff, not a universal scene-loading speedup.

Final verification passed 155 tests, TypeScript, the production build and
output checks, five component viewports, five production-loader viewports,
and 14 saved-location movement checkpoints. All four browser-run reports
match the current nine source fingerprints and their exact test harnesses.
Evidence: [verification run](../outputs/playtest/loading-optimization/verification-run.json)
and [component comparison](../outputs/playtest/loading-optimization/comparison.json).