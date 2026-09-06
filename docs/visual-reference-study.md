# Living Computer Kingdom — reference study

Date: 2026-09-06

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
