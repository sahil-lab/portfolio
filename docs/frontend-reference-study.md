# Frontend study for The Living Computer Kingdom

Study date: 2026-09-06. Companion: [graphics and Blender study](visual-reference-study.md).

## Scope and honesty

Reviewed selected project-relevant sections of the PDFs in `blender_python_reference_5_2` and its nested `book-1-master/book-1-master` collection. This is a targeted study, not a claim of having read or mastered every book. Reading-list PDFs were used for orientation; they do not count as reading the books they recommend. No game source, assets, or deployment were changed during this frontend study. Performance improvements below are proposals, not measured results.

Page numbers below are one-based PDF file pages, which sometimes differ from printed pages. Some extra pages were extracted but not fully inspected; they are deliberately excluded from this ledger.

## Reading ledger

Paths in this table are relative to `blender_python_reference_5_2`.

| Source | Selected sections inspected | Useful learning |
| --- | --- | --- |
| `dokumen.pub_advanced-react-deep-dives-investigations-performance-patterns-and-techniques-n-2672370.pdf` | 20–27, 156–163, 166–172, 209–218, 335–342 | State placement; separating context concerns and stable command APIs; mutable refs versus state that renders output; stale callback closures; limits of React error boundaries. |
| `_OceanofPDF.com_Web_Performance_Fundamentals_-_Nadia_Makarevich.pdf` | 145–149, 246–250, 325–344 | Transfer size versus execution cost; preloading tradeoffs; interaction profiling; shortening or splitting long tasks; distinguishing React work from other JavaScript. |
| `book-1-master/book-1-master/[JAVASCRIPT][High Performance JavaScript].pdf` | 70–73, 76–77, 127–129, 131, 140–142 | Layout reads mixed with writes; animation cost; timely interaction feedback; avoiding competing update timers; workers for substantial data-only work. Browser-specific recipes are historical. |
| `book-1-master/book-1-master/[HTML][Web Design for Developers].pdf` | 33–36, 41–42, 229–233, 247–248 | Hue/value/saturation and surrounding-color effects; restrained palettes; descriptive content and non-color signals; keyboard navigation. Its implementation recipes require critical filtering. |
| `book-1-master/book-1-master/[JAVASCRIPT][JavaScript Creativity].pdf` | 14–15, 20–22 | Separating logic and drawing; interpolation; behavior from local rules. Animation examples are conceptual references, not an engine template. |
| `CSE_Books_Converted_to_PDF/cse_books_pdfs/dokumen.pub_react-in-depth.pdf` | Opening 1–8 and contents | Identified as the older DevelopmentArc-derived guide, not the newer similarly named book in a supplied reading list. Do not adopt its legacy lifecycle examples. |

Also surveyed contents/bookmarks for *High Performance Browser Networking*, *Learning Three.js: The JavaScript 3D Library for WebGL*, and the supplied frontend architecture reading guide. These surveys are not recorded as chapter study. Deferred microfrontend and unrelated enterprise architecture material: the current challenge is one coherent local game, and added deployment boundaries do not solve its visual or interaction problems.

## Decisions for this project

These are engineering and art judgments informed by the reading and the production brief.

### Keep the world alive when interface state changes

The renderer, camera, input state, animation objects, and runtime ownership should have a persistent lifetime. React should render the portfolio, controls, and machine panels from relevant state snapshots. Moving the creature does not need to rerender every panel each frame. A ref can own imperative runtime state, but it cannot replace observable state for displayed queue counts or results.

Keep panel-local state near the panel. Expose commands such as submitting a CPU job through a stable boundary. Opening System Information must preserve camera position, simulation state, and the renderer. Check stale callbacks when the runtime outlives the render that created a handler. Dispose listeners, animation scheduling, audio and owned GPU resources when their owner actually ends its lifetime.

### Treat responsiveness and smooth rendering as separate checks

A smooth empty scene says little about opening a panel during asset loading. A responsive panel says little about GPU cost. Measure both on representative devices before optimization:

- Cold load to the first controllable frame in the Bootloader Workshop.
- Frame-time distribution and spikes while walking, rotating the camera, and crossing districts.
- Input-to-visible-feedback latency for the Packet Press, machine controls, map, and résumé.
- Main-thread long tasks, React commit work, draw calls, triangles, and texture/resource counts where the renderer exposes them.
- Memory/resource behavior after repeatedly opening panels and visiting districts.

At 60 frames per second the whole frame has about 16.7 ms; the old JavaScript book's 100 ms responsiveness discussion is not an acceptable per-frame game budget. CPU and GPU timings need separate interpretation. Use production builds for realistic timings and development profiling for attribution as appropriate. Do not claim a percentage speedup without a comparable baseline and repeatable route.

### Make loading serve the first minute

Prioritize the creature, collision and routes, Packet Press, nearby workshop art, and the CPU/RAM vista. Load optional detailed exhibits after the first playable state, and consider preloading an adjacent district before entry. Do not preload the entire library at once. Small downloaded JavaScript can still have expensive evaluation; assets also incur decoding, upload, and shader work.

Split avoidable bulk setup when a profile reveals blocking work. Consider workers only for sufficiently expensive independent computations after including communication cost. Tiny queue/partition demonstrations do not automatically justify workers. Do not insert yields into correctness-critical state transitions merely to shorten tasks: preserve each simulation's invariants and expose only consistent state.

### Keep controls immediate and meaningful

Use one coordinated update schedule with elapsed-time-based animation and bounded simulation steps. After a hidden-tab pause, avoid a huge movement jump or an unbounded catch-up loop. Interpolate visual motion without inventing extra simulation transitions.

Machine controls should acknowledge acceptance promptly, then show the actual local sequence: queued, running, completed. Kafka animation follows retained partition order and each group's own progress. Kubernetes animation follows readiness and eligibility. Cosmetic particles must never substitute for the demonstrated behavior.

Camera smoothing should settle quickly enough to preserve control. Judge it while turning near walls and traversing ramps, not just from a still frame. Walking, camera, and panel input need explicit ownership; typing into a form must not move the creature. Clear held keys when focus is lost to avoid stuck movement.

### Integrate the HUD with the kingdom

Use the world palette in the UI, with restrained backgrounds and strong text contrast over changing scenes. Reserve saturated accents for interactions and state. District colors also need recognizable shapes, names, and landmarks. View colors against their actual surroundings rather than assuming equal numeric colors have equal perceived emphasis.

Keep résumé and projects directly reachable from the start. Use semantic HTML controls with labels, visible focus, logical DOM order, Escape behavior where appropriate, and focus restoration after dialogs. Provide textual simulation results alongside spatial feedback. Avoid continuously announcing decorative animation. On small screens, preserve readable controls and usable touch targets while leaving enough view of the route.

## Connect this to Blender and graphics study

The companion ledger documents actual selected graphics pages and Blender manual sections already studied. Its main applications remain:

1. Author a representative Packet Press asset with rounded structural edges, intentional normals, readable pivots, distinct materials, and a clear mechanical sequence.
2. Validate glTF export in the browser: units, orientation, material channels, textures, animation, lights, and collision representation. Blender rendering is not proof of browser equivalence.
3. Establish depth through workshop detail, district landmarks, and distant chassis; prioritize silhouettes and accessible routes before adding tiny decorations.
4. Separate metal, ceramic, substrate, paint, and luminous data through material response. Evaluate exposure and highlights before bloom; retain route readability and contact grounding.
5. Preserve silhouette and functional openings when simplifying geometry. Share repeated geometry/materials when useful, then measure instancing, LOD, shadows and postprocessing choices.

## Historical advice deliberately not adopted

- Legacy React lifecycle methods from the older React guide, and version-specific ref forwarding recipes without checking the installed React version.
- Old Three.js JSON exporters, CanvasRenderer-era patterns, or obsolete animation classes.
- Internet Explorer timing limits, browser-version tables, web-safe palette constraints, or old worker serialization restrictions as present-day facts.
- Positive tabindex numbering and image-based text replacement recipes from the 2009 design book. Plan natural semantic order and real text for this UI.
- The animation book's fixed timer plus rendering examples as a production clock; its claimed 60 fps ceiling is not a general design constraint.
- Treating a resolved Promise as a general way to yield a rendering opportunity, or assuming an available yielding API guarantees every interaction is fast. Verify supported APIs and profile the actual workload before implementation.
- Taking an old book's statement that workers cannot affect responsiveness literally; CPU contention, message handling and data transfer can still have costs.

## Next implementation order when development resumes

Capture baseline visuals and timings; establish the persistent runtime/interface boundary; complete one polished and functional workshop encounter; validate authored assets in browser; connect the district simulations to their visible machinery; complete reliable vertical routes and returns; then optimize measured bottlenecks and conduct actual route-by-route play verification. Personal résumé and project content remains last, as requested.
