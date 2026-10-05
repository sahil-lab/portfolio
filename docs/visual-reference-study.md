# Living Computer Kingdom — reference study

Date: 2026-09-06

The sections immediately below are the historical September study. The dated
October research update at the end describes the current renderer and supersedes
the early implementation-status caveats for present-day decisions.

## User direction and current boundary

The user accepts the current base, wants the visuals to become enticing, and asked that the supplied Blender folder be studied before further creation, enhancement, or optimization. Personal portfolio content is deferred until the end. No game source has been modified since that instruction. This document records research, not an implemented visual pass.

The supplied library is large and contains duplicate PDFs, EPUBs, source archives, and unrelated systems/security books. The review below is a focused study of relevant sections, **not a claim to have read every book cover to cover**. The résumé PDF was intentionally not read.

## Sources actually consulted

All paths below are relative to `blender_python_reference_5_2/`. PDF page numbers are one-based file pages unless explicitly marked as printed pages.

### Blender 5.2 manual archive

Archive: `blender_manual_epub.zip`, directory `blender_manual_v520_en.epub/`.

- `modeling/modifiers/generate/bevel.xhtml`: complete text reviewed. Bevel widths, segment counts, angle/weight limiting, overlap clamping, hardened normals, and face strength. Bevels change actual edge geometry and silhouette; normal treatments alone do not.
- `modeling/modifiers/normals/weighted_normal.xhtml`: complete text reviewed. Area/angle weighting, sharp-edge preservation, face influence. Use to keep broad machinery panels visually flat while bevels catch light.
- `render/color_management/index.xhtml` and `render/color_management/displays_views.xhtml`: reviewed. Distinguish scene-linear working values, exposure, tone mapping/view transforms, and display encoding. A Blender render's appearance is not automatically preserved just by exporting a model.
- `addons/scene_gltf2.xhtml`: mesh, GPU instance, material, base color, metallic/roughness, baked AO, tangent-space normal, emissive, and material-extension sections reviewed. Export quads/n-gons as triangles. UV seams and hard shading edges can split vertices. Curves must become meshes. Use supported PBR channels; procedural Blender shaders require baking or an explicit runtime equivalent. Occlusion/roughness/metalness can share RGB channels, with data textures treated as non-color. Exported instances have hierarchy and material restrictions.

### Real-Time Rendering, fourth edition

File: `Real-Time Rendering Textbook, 4th Edition.pdf` (1,196 file pages). Text extraction returned empty pages. Selected pages were rendered and visually read rather than treating extraction as reading.

- Contents page 7: located shading, texturing, shadows, color, and physically based shading sections.
- File pages 297–299 / printed 279–281: RGB rendering approximations, spectral-vs-RGB limitations, scene-to-screen pipeline.
- File pages 301–303 / printed 283–285: tone mapping, display encoding, exposure, contrast, highlight/shadow roll-off, perception. Exposure and tone mapping are separate operations.
- File page 345 / printed 327: microgeometry, roughness, and the widening/dimming of specular highlights.

Implication: distinguish copper, solder, painted housings, ceramic insulators, and soft character materials through roughness and reflectance. Preserve bright core colors through controlled exposure; simply adding more light can erase their identity.

### Physically Based Rendering, fourth edition

File: `dokumen.pub_physically-based-rendering-fourth-edition-from-theory-to-implementation-4nbsped-2022014718-2022014719-9780262048026-9780262374033-9780262374040.pdf` (2,024 file pages).

- Contents indexed for later use.
- File pages 44–48: light distribution, visibility, BRDF/BSDF, indirect light transport. A visible emissive surface and the illumination it casts are distinct concerns.
- File pages 888–890: roughness using microfacet theory, statistical representation of unresolved detail, masking, shadowing, and aggregate reflection.

Implication: a glowing Packet Press should have a deliberately lit nearby receiving surface. Surface identity needs light direction and useful reflections. Do not model microscopic roughness with excessive geometry.

### WebGL Insights

File: `dokumen.pub_webgl-insights-1nbsped-1498716075-9781498716079.pdf` (416 file pages).

- Contents and selected text from Chapter 14, Budgeting Frame Time, especially file pages 247–252 / printed 227–232: update queues, amortizing work, worker-suitable geometry processing, resolution and fill-rate tradeoffs.
- Chapter 16, HDR Image-Based Lighting, file pages 277–280 / printed 257–260: roughness-dependent filtered environments, compact diffuse lighting, filtering boundaries. Historical WebGL compatibility workarounds require current API checks before adoption.
- Chapter 17 opening, file pages 281–284: participating media, volumetric lighting costs and approximations. Not an instruction to implement full volume rendering for this game.
- Selected Chapter 22 text, file pages 375 onward: navigation constraints, minimap destinations, landmarks, author-guided viewpoints and preserving user orientation.
- Chapter 23 selected text, file pages 389–396: camera/world transforms, orbiting versus tracking strategies, and maintaining a consistent camera state.

Implication: the close third-person view should preserve the creature and upcoming route; an overview can be a deliberate alternate view. Instancing and resolution scaling are measured choices, not substitutes for composition. Profile frame time and draw calls before restructuring the renderer.

### Game Engine Architecture, fourth edition, Volume I

File: `_OceanofPDF.com_Game_Engine_Architecture_4Ed_-_Jason_Gregory.pdf` (628 file pages).

- Contents and edition preface reviewed. This supplied file is **Volume I: Foundations and Core Engine Systems**, not the separate graphics/motion/sound volume.
- Chapter 8, file pages 515–520 / printed 498–503: elapsed time, variable frame durations, spikes, consistent simulation timing, high-resolution timing, and replay implications.

Implication: movement, machine animations, and simulations need explicit timing policies. Camera smoothing should be time-based; a per-frame interpolation fraction changes its feel across refresh rates. Bound simulation catch-up and handle tab suspension deliberately.

### Polygon Mesh Processing

File: `Polygon Mesh Processing (Mario Botsch, Leif Kobbelt, Mark Pauly etc.) (z-library.sk, 1lib.sk, z-lib.sk).pdf` (243 file pages).

- Contents and geometry-processing overview.
- Chapter 7 selected text, file pages 124–130 / printed 112–118: clustering, incremental decimation, approximation metrics, edge collapse, and topological validity.

Implication: simplify according to visible shape/error rather than a blanket percentage. Preserve thin rails, walkable edges, door openings, and recognizable silhouettes. Keep collision geometry separately authored and simpler than render geometry.

### GPU Gems 3

File: `toaz.info-gpu-gems-3-pr_1f076b51118343529fcf5a1447090ae1.pdf` (912 file pages).

- Chapter 12, file pages 380–385: ambient occlusion, contact shadows, discretization artifacts, and hierarchical approximations. The archive includes repeated chapter-opening pages.
- Chapter 13, file pages 405–408: volumetric scattering and screen-space approximation limitations.
- Chapter 28 was located/extracted for subsequent depth-of-field study; do not claim the entire chapter reviewed.

Implication: contact shadows can make the platforms, feet, and mechanical joints feel connected. AO is an approximation, not complete indirect lighting. Any screen-space atmospheric effect needs an artifact and cost check as the camera moves.

### Supplied Three.js examples

Archive: `Learn-Three.js-Fourth-edition-main.zip`.

Read source:

- `source/samples/chapters/chapter-13/import-from-blender-lightmap.js`
- `source/samples/chapters/chapter-8/instanced-grouping.js`
- `source/samples/chapters/chapter-11/ambient-occlusion.js`

These demonstrate GLTFLoader with separately assigned lightmaps, shared instanced geometry, and an AO composition pass. They are learning references; do not blindly transplant historical UV attribute/API conventions or the example's extremely large transparent instance count into this project. Check the installed Three.js implementation when writing the actual pipeline.

### Reading guides

`The Expert Canon for Blender, 3D Graphics, Rendering, Geometry, and Real-Time Engines.pdf` and other short reading-list PDFs were inspected to orient the study. Treat their rankings as author judgments, not primary graphics evidence. Actual book sections and the supplied Blender manual underpin the conclusions above.

## Proposed art direction derived from the brief and study

These are project-specific artistic judgments, not claims that the books prescribe this exact style.

1. Preserve the tiny creature inside a functioning computer. Use deliberately oversized connectors, layered PCB edges, cables, and fan housings to establish scale; human-scale workshop details establish intimacy.
2. Improve large forms first. Break the repeated circular-platform-and-box silhouette. CPU uses dense amber cores and heat fins; RAM uses layered shelves and balconies; GPU uses sculptural geometry and a cinema; Network uses router arches and tracks; Vaults use descending index corridors; Kubernetes uses floating neighborhoods and service bridges; Kafka uses long parallel partition conveyors.
3. Make the Packet Press the first hero asset: rounded cast housing, readable feed/output tray, pistons, flywheel, bolts, a lit packet, and visible operating motion. Keep the forward route to CPU and RAM unobstructed.
4. Establish a restrained material palette: copper conductors, dark teal board substrate, dull solder, ceramic accents, painted machine shells, luminous data. Use realistic material distinctions while keeping stylized proportions.
5. Compose three depth layers: nearby workshop detail, walkable district silhouettes, distant chassis/fans. Let haze separate distance without hiding routes or flattening the whole scene.
6. Use warm focal lights and cooler surrounding fill, controlled highlights, and grounded contact shadows. Add bloom only after judging the underlying lighting; avoid indiscriminate glow and blur.
7. Tie visible movement to meaning. Queue tokens move toward cores, occupied slots change shelves, packet labels follow cargo, and consumer progress moves independently. Environmental motion remains secondary.
8. Validate from the actual player camera and moving routes, not only a static beauty view. Preserve the player silhouette against backgrounds and readable paths at small viewport sizes.

## Implementation sequence after the study stage

First establish a fixed baseline view and timing measurements. Then produce one authored workshop/Packet Press asset and verify its export, materials, scale, pivots, shadows, and collisions in-browser. Expand the district silhouettes only after that representative asset works. Complete traversable elevations and simulation-to-world links. Profile the resulting scene before applying instancing, LOD, texture budgets, or selective postprocessing. Add real portfolio details last, per the user.

## Current implementation caveats to preserve in handoff

The running preview is an early procedural base. `app/world.ts` supplies the scene and movement. `app/page.tsx` currently has placeholder interaction handlers. `app/simulation.ts`, `app/panels.tsx`, and `app/portfolio.ts` were created before the study instruction but are not wired into the running page. Seven completed playable simulations, sound, collision, interiors, functional lifts/stairs, and full play verification must not be claimed. No production deployment or completed-game handoff has occurred.

## Drei And Rendering Alternatives, 2 October 2026

### Recommendation

Keep the functioning Three.js world while rebuilding one representative venue
with an authored Blender/glTF asset set, coherent materials, terrain transitions
and baked ambient/indirect lighting. Use React Three Fiber and Drei in an isolated
look-development prototype if their authoring workflow helps. Do not begin with
a whole-world renderer migration or another global layer of effects.

The highest-confidence visual improvement is a different asset and composition
pipeline, not translating the current primitives into JSX. This is an engineering
and art-direction recommendation, not a measured visual-quality multiplier.

### Current Evidence

Inspected the current Copper Crumb screenshot and the active renderer/package
configuration, not just reference demos. The code already has React 19.2.6,
Three.js 0.185.x, HDR environment lighting, PBR Neutral tone mapping, GTAO,
bounded bloom, FXAA, streaming, instancing and adaptive quality. Fiber and Drei
are not installed. See [dependencies](../package.json#L24),
[renderer setup](../app/world.ts#L67) and
[presentation pipeline](../app/kingdom-presentation.ts#L24).

The screenshot still exposes these problems:

- The large turf border reads as a flat mat placed around a separate display pad.
  More patches do not establish believable soil, curb, path and planting transitions.
- The storefront is recognizable, but its broad surfaces and opaque window bays
  still read as assembled primitives rather than a carefully modeled miniature.
- Foliage has conspicuous sharp, flat silhouettes at this camera distance. Leaf
  cards are not inherently wrong; their current shapes, grouping and shading are.
- The repeated isolated-pad layout leaves large low-information areas. Empty
  space needs a compositional role, not uniform coverage with grass or props.
- Much of the frame has similar visual weight. Better framing, material hierarchy
  and deliberate foreground/midground/background layers matter more than bloom.

These are qualitative findings. Earlier geometry, collision and screenshot tests
prove functionality and visibility, not that the art direction meets the brief.
The recent planted-world pass improved grounding and removed several spikes, but
did not close this asset-quality and composition gap.

### What Fiber Changes

[R3F's introduction][r3f-intro] describes a React renderer for Three.js: JSX creates
the same underlying Three objects. Stable Fiber 9 pairs with React 19; the page
currently identifies Fiber 10 as alpha with WebGPU and scheduler work. This is
not a reason to install an alpha renderer into the existing game.

The benefits are reusable scene components, React integration, asset hooks and
the Drei ecosystem. They are not automatic global illumination, better geometry
or a guaranteed frame-rate improvement. [Demand rendering][r3f-performance] helps
when a scene rests; this app's moving characters, balloons, weather and machines
cannot simply stop rendering without an explicit invalidation policy.

The existing world owns its renderer, animation loop, camera, input and disposal.
Placing another Canvas around it would duplicate ownership rather than migrate
it. Any future integration needs one renderer, one frame scheduler and a tested
bridge for simulation, local gravity, streaming, events and resource lifetime.

### Drei Components Worth Testing

| Component | Useful role here | Constraint and decision |
| --- | --- | --- |
| Environment and Lightformer | Art-direct broad highlights and material separation in the prototype | Environment lighting is already present. A better light arrangement is the experiment; simply adding another HDRI is not. Lightformers captured into an environment are not shadow-casting area lights. Self-host production assets. |
| useGLTF and gltfjsx | Load an authored kit and make its parts reusable | Optional if adopting Fiber; the current GLTFLoader path can consume the same assets. Preserve named interaction nodes, collider metadata and material roles during optimization. |
| AccumulativeShadows | Soft static contact for a local courtyard or product-style staging scene | It is a planar, Y-up catcher. Rotate a local group if needed; it is not a globe-wide shadow solution. Accumulation costs rendering work and must be reset when relevant casters or lighting change. |
| ContactShadows | A small local shadow catcher where a baked map is unsuitable | Source defaults to continuous updates. A normal update renders scene depth and two blur passes; smoothing adds two more blur passes. That is not five full-scene renders, but it is not free. |
| MeshReflectorMaterial | One restrained pool, wet surface or polished interior floor | Source uses a virtual camera reflected across one plane, with another scene render and optional blur. Not a physically correct reflection solution for the entire curved planet. |
| MeshTransmissionMaterial | A small number of hero display cases or glass objects | Extra scene rendering, optional backside cost and sampling cost. Shared buffers or transmissionSampler have visibility tradeoffs. Do not put it on every window. |
| Clouds and Sky | Carefully composed atmospheric layers | Clouds can share an instanced draw call, but transparent overdraw still costs pixels. Keep segment counts tight, self-host textures and avoid covering landmarks. |
| Stage, Bounds and Center | Fast isolated asset look-development | Stage defaults include centering and camera adjustment. Those transforms should not take over the gameplay camera or move an authored level relative to its collisions. |
| PerformanceMonitor, Detailed and Instances | Helpful orchestration in a Fiber prototype | The app already has analogous adaptive quality, LOD and instancing. Do not run duplicate governors or replace working systems without a measured reason. |

Sources: [Environment][drei-environment], [Lightformer][drei-lightformer],
[AccumulativeShadows][drei-accumulative], [ContactShadows][drei-contact],
[reflector][drei-reflector], [transmission][drei-transmission],
[Clouds][drei-cloud], [Stage][drei-stage] and [gltfjsx][gltfjsx].

### Source-Level Corrections

The actual implementations were checked as well as their documentation:

- [BakeShadows][source-bake] sets shadowMap.autoUpdate to false and requests an
  update. It does not unwrap geometry, produce a reusable lightmap or bake GI.
- [AccumulativeShadows][source-accumulative] uses progressive render targets and
  randomized lights. Once accumulation stops, the result still has a catcher
  mesh/material to render; "zero impact" should not be read as literally no cost.
- [ContactShadows][source-contact] temporarily replaces scene materials for depth
  capture, renders blur passes, then restores scene state. Static frames can be
  limited, but moving subjects require updates or a different shadow strategy.
- [MeshReflectorMaterial][source-reflector] computes one reflector plane and a
  virtual perspective camera. Its name does not make it arbitrary-surface ray tracing.
- React Postprocessing uses the separate pmndrs postprocessing package, not the
  current Three add-on composer. Compatible effects can be merged, but its current
  [composer documentation][post-composer] explicitly limits convolution-effect
  merging. A composer change must preserve depth, output conversion and recovery.

At the current 1.6-million-pixel presentation ceiling, one RGBA16F color buffer is
about 12.2 MiB before depth, mipmaps or multisampling. This is a storage estimate,
not a measured GPU-memory total. Several reflection, transmission or temporal
buffers can consume substantial memory even before scene textures are counted.

### Alternatives Compared

| Route | What it can improve | Recommendation for this project |
| --- | --- | --- |
| Existing Three.js plus authored glTF and baked lighting | Shape quality, material depth, scene coherence, predictable static lighting cost | Best first investment. It preserves working gameplay and does not require Fiber. |
| Fiber 9 plus selected Drei helpers | Scene authoring, reusable model components, rapid lighting/staging experiments | Good prototype option. Decide on migration only after it demonstrates a workflow benefit. |
| pmndrs postprocessing with a controlled AA/color experiment | Edge quality, effect organization and selected finishing | Secondary. Compare against current GTAO/FXAA at equal camera, resolution and content; do not run two composers. |
| Three WebGPURenderer and TSL | Modern rendering/compute architecture and node-based shader work | A separate technical project, not a drop-in visual fix. Current custom shaders and composer must be ported. |
| Babylon.js | Integrated PBR, render graph, inspectors, lighting and editor tools | Credible if intentionally rebuilding engine/tooling. The port must replace or adapt the existing camera, gravity, assets, input and streaming contracts. |
| PlayCanvas | Editor-led scene authoring and built-in lightmapping workflows | Credible if an editor-centered production workflow is the goal. Runtime lightmapping has important batching and GI limitations. |
| realism-effects SSGI/SSR | Experimental screen-space indirect light and reflections | Research branch only. The repository documents material, transparency, fog and orthographic limitations/WIP work; do not assume compatibility with this Three version. |
| three-gpu-pathtracer | Reference renders and an optional high-end still-photo mode | Not the default moving game renderer. The currently documented implementation requires WebGPU and supports Standard/Physical materials, not this app's arbitrary custom shaders. |

Important primary-source caveats:

- [WebGPURenderer][webgpu] can fall back to WebGL 2, but that does not make all
  WebGL-specific code portable. Current [ShaderMaterial][shader-material],
  [Material.onBeforeCompile][material-api] and [Three EffectComposer][three-composer]
  documentation state their WebGLRenderer restriction. The app uses these in
  its [sky](../app/planet-lighting.ts#L10), [leaf wind](../app/canopy-grove.ts#L35)
  and presentation pipeline.
- [Babylon's RSM GI documentation][babylon-gi] describes light leakage, computation
  cost, small-scene suitability and a pre-pass compatibility constraint. It is
  not equivalent to a large-game-engine GI system. [Engine specifications][babylon-spec]
  establish available features, not an automatic quality gain for these assets.
- [PlayCanvas runtime lightmaps][playcanvas-runtime] do not bake full GI and are
  incompatible with its batching system because objects require unique lightmaps.
  GPU-generated maps also need rebaking after device loss. [External lightmaps][playcanvas-bake]
  can capture sophisticated offline GI, with UV and authoring requirements.
- [realism-effects][realism] documents unfinished support and scene-dependent
  tuning. Its public main page showed activity from years earlier when reviewed;
  verify release/version compatibility before any experiment.
- The current [path-tracer documentation][pathtracer] differs from older WebGL
  tutorials. Do not assume those tutorials describe the current package API.

No alternative engine or effect stack was installed or benchmarked in this
research task. The table ranks suitability, not measured FPS or proven appearance.

### The Asset Pipeline That Changes The Result

1. Establish a visual target for one existing venue footprint. Use a coherent
   miniature material/shape language, not a mixture of unrelated asset packs.
2. Author the main building, terrain transitions, display interior and a small
   supporting kit in Blender. Use real recesses, roof thickness, fitted joints,
   intentional bevels and useful large forms before adding small decorations.
3. Replace the large turf mat with connected soil/stone/path transitions and
   clustered planting. Keep negative space for walking and sight lines. Build
   foreground, middle-distance and far silhouettes with different detail levels.
4. Give vegetation authored crown shapes and species variation. Fix visible
   card edges and overly uniform shading; do not solve it with uniformly dense,
   high-poly vegetation across every planet.
5. Bake AO and suitable static indirect lighting in Cycles, with non-overlapping
   lightmap UVs and padding. Keep the sun and moving-character shadows dynamic.
   An indirect bake is still tied to its lighting setup: use a neutral treatment
   or explicit lighting variants for the day/sunset/night cycle. Do not bake the
   same direct light into a texture and then add it again at runtime.
6. Export supported PBR channels and verify them in the browser. Blender's world
   lighting and area lights do not automatically survive core glTF export.
   Arbitrary Blender shader graphs and custom lightmaps need baking or an explicit
   runtime hookup. Keep color textures separate from non-color normal/ORM data.
7. Inspect and optimize the GLB with glTF Transform. Evaluate meshopt/Draco for
   geometry transfer and KTX2 for GPU-compressed textures; geometry compression
   does not by itself reduce the decoded triangle count. Avoid blind pruning or
   joining that destroys interaction nodes, collision metadata or lightmap identity.
8. Load that same asset into the existing renderer and, only if useful, a separate
   Fiber/Drei prototype. Preserve one active renderer per gameplay view.

References: [Cycles baking][blender-bake], [Blender glTF export][blender-gltf],
[glTF Transform][gltf-transform] and [gltfjsx][gltfjsx]. The public introduction of
the [Three.js Journey baking lesson][journey-bake] illustrates this authored-scene
workflow; only the accessible portion was consulted. The current source of
[Bruno Simon's 2019 portfolio][bruno-package] lists Three.js without Fiber/Drei,
which is a useful counterexample to the idea that JSX is required for strong art.
Do not copy portfolio assets or assume a library's license covers demo artwork.

### The First Prototype

Use Copper Crumb or Loop & Glaze as a deliberately finished courtyard:

- A sculpted storefront with one strong roof/product silhouette and a visible,
  warm display interior, rather than an opaque colored window plane.
- A path that joins the shop to its surroundings, with offset planted beds,
  varied low foliage, a small seating area and a believable delivery/service zone.
- A material hierarchy: matte masonry/timber, restrained satin metal, ceramic
  highlights and limited glass. Not a uniform glossy coating.
- Soft static grounding plus a clear directional key, an aligned environment
  and enough contrast to separate the player from the background.
- Fewer disconnected ornaments. Every foreground prop should support the place's
  purpose, scale, activity or composition.

Keep existing interactions, IDs, approaches and collision authority. On a curved
planet, author/blend a local terrace through the actual terrain system; a flat
model dropped onto the sphere can look detached even with excellent materials.

Review this prototype before expanding it to ten planets. If it is still visually
disappointing with effects disabled, continue art/asset work instead of adding
another renderer feature. Only after that approval should the kit and composition
rules be generalized across other worlds.

### Acceptance And Non-Goals

- Compare old/new with identical camera, light, resolution and viewport. Capture
  close, first-person and overview views plus day, sunset and night.
- Check the image itself: readable entrances, continuous ground, clear material
  differences, purposeful object grouping, controlled foliage silhouettes and
  no unexplained floating supports or repeated empty display pads.
- Validate movement, local gravity, travel, interaction, reduced motion, streaming
  and graphics recovery. Screenshots and triangle tests cannot replace play checks.
- Measure warmed frame-time distributions and memory on named target devices.
  A desktop phone-sized viewport is not physical-phone certification. Draw calls
  alone do not establish whether the app is CPU-, GPU- or bandwidth-limited.
- Treat any MSAA, SMAA, temporal AA, GI, reflection or transmission experiment as
  one controlled change, with its resource cost recorded. Keep one color-output
  conversion. Avoid default blur, chromatic aberration, heavy bloom or photo-only
  depth of field during ordinary navigation.
- Do not delete working features, introduce a second renderer, upgrade to alpha
  dependencies, purchase assets, or migrate engines as part of this research.

This update changes research documentation only. No application source or
dependency changes, new renderer benchmark, deployment or publication occurred.

### Online Sources Consulted

All links below were retrieved on 2 October 2026. Source links pointing at moving
branches describe what was inspected, not pinned package compatibility guarantees.

[r3f-intro]: https://r3f.docs.pmnd.rs/getting-started/introduction
[r3f-performance]: https://r3f.docs.pmnd.rs/advanced/scaling-performance
[drei-environment]: https://drei.docs.pmnd.rs/staging/environment
[drei-lightformer]: https://drei.docs.pmnd.rs/staging/lightformer
[drei-accumulative]: https://drei.docs.pmnd.rs/staging/accumulative-shadows
[drei-contact]: https://drei.docs.pmnd.rs/staging/contact-shadows
[drei-reflector]: https://drei.docs.pmnd.rs/shaders/mesh-reflector-material
[drei-transmission]: https://drei.docs.pmnd.rs/shaders/mesh-transmission-material
[drei-cloud]: https://drei.docs.pmnd.rs/staging/cloud
[drei-stage]: https://drei.docs.pmnd.rs/staging/stage
[source-bake]: https://raw.githubusercontent.com/pmndrs/drei/master/src/core/BakeShadows.tsx
[source-accumulative]: https://raw.githubusercontent.com/pmndrs/drei/master/src/core/AccumulativeShadows.tsx
[source-contact]: https://raw.githubusercontent.com/pmndrs/drei/master/src/core/ContactShadows.tsx
[source-reflector]: https://raw.githubusercontent.com/pmndrs/drei/master/src/core/MeshReflectorMaterial.tsx
[post-composer]: https://react-postprocessing.docs.pmnd.rs/effect-composer
[webgpu]: https://threejs.org/docs/pages/WebGPURenderer.html
[shader-material]: https://threejs.org/docs/pages/ShaderMaterial.html
[material-api]: https://threejs.org/docs/pages/Material.html
[three-composer]: https://threejs.org/docs/pages/EffectComposer.html
[babylon-spec]: https://www.babylonjs.com/specifications/
[babylon-gi]: https://doc.babylonjs.com/features/featuresDeepDive/lights/rsmgi
[playcanvas-runtime]: https://developer.playcanvas.com/user-manual/graphics/lighting/runtime-lightmaps/
[playcanvas-bake]: https://developer.playcanvas.com/user-manual/graphics/lighting/lightmapping/
[realism]: https://github.com/0beqz/realism-effects
[pathtracer]: https://github.com/gkjohnson/three-gpu-pathtracer
[blender-bake]: https://docs.blender.org/manual/en/latest/render/cycles/baking.html
[blender-gltf]: https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html
[gltf-transform]: https://gltf-transform.dev/cli
[gltfjsx]: https://github.com/pmndrs/gltfjsx
[journey-bake]: https://threejs-journey.com/lessons/baking-and-exporting-the-scene
[bruno-package]: https://raw.githubusercontent.com/brunosimon/folio-2019/master/package.json
