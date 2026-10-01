# Workshop Visual Research And Improvement Report

Date: 2026-10-01

Implementation: [a70a977 - refine workshop lighting, materials and reference framing](https://github.com/sahil-lab/portfolio/commit/a70a9771b5dbfb43b5b8b7fabb34f8b7fedd0ccf)

## Purpose And Scope

The goal was to bring the Bootloader Workshop closer to the supplied image: a
warm, dimensional miniature world with readable materials, soft grounding,
clear character silhouettes and an unobtrusive mobile interface. The existing
portfolio, imported machinery, artwork, navigation and gameplay had to remain.

This report records the research and implementation performed during the
reference-driven visual passes. It is separate from the September research-only
notes in [visual-reference-study.md](visual-reference-study.md) and
[frontend-reference-study.md](frontend-reference-study.md). Those earlier book
studies are not presented as research newly performed in this session.

The technical design and historical project notes remain in
[kingdom-visual-design.md](kingdom-visual-design.md).

## What I Investigated

| Question | Evidence inspected | Finding |
| --- | --- | --- |
| Why did High graphics still look flat? | Quality profiles, renderer setup, live scene state and matched quality captures | High mainly increased shadow resolution and update frequency. It did not fix composition, material response or light direction. |
| Why did phones lose depth? | Device defaults, frame-time measurement and quality-governor tests | Touch devices started in Low, which disabled cast shadows and postprocessing. The old promotion threshold below 12 ms excluded ordinary steady 60 Hz frames. |
| Why were edges stepped? | Composer targets and pass order | The off-screen postprocessing target had no MSAA, and no final antialiasing pass was present. |
| Why did colors differ from the reference? | ACES/Neutral captures at the same camera and exposure, plus tone-mapping documentation | Tone mapping contributed to the pale or shifted material colors. Neutral was the better fit for the intended palette. |
| Why did the same models look differently composed? | Projected landmarks and full browser screenshots | Camera position, angle, framing and foreground perspective were substantial parts of the mismatch. |
| Where was depth missing? | Workshop geometry, materials, shadow flags, window UVs and contact layers | Cast/receive flags were already present. Recess shading, surface-specific finishes and reliable contact shading were still needed. |
| Could Blender provide the bake? | Addon connection checks and the installed application | The addon was unreachable. The Store installation was present, but background execution was denied and no command alias was available. |

## How I Researched And Tested

1. **Started from the actual rendering path.** I inspected the modules that
   choose quality, create lights, render postprocessing, construct workshop
   objects, load assets and position the camera. Existing utilities were reused
   instead of treating the project as a new application.
2. **Checked documentation and installed implementations.** General guidance was
   compared with the installed Three.js addon code before choosing APIs. This
   mattered for GTAO depth-buffer handling, disposal and shadow filtering.
3. **Used isolated, repeatable browser captures.** Fixed desktop and phone
   viewports, muted audio, controlled lighting and temporary storage separated
   the visual checks from the user's saved preferences. The editor's embedded
   browser could resize itself, so isolated Chrome was used for stable evidence.
4. **Tested composition with landmarks.** Estimated reference positions included
   the courier, sign, press, and the red building's roof and base. Projection
   tests were paired with screenshots and an actual camera-distance assertion
   to catch obstruction-driven zoom changes.
5. **Used controls rather than relying on impressions alone.** Tone-mapping
   variants kept the camera and exposure fixed. An AO-disabled test intercepted
   only the isolated browser response and asserted that the interception was
   used; it did not rewrite application source.
6. **Validated each small implementation step.** Focused tests covered geometry,
   resource lifetimes, UVs, collision boundaries and quality behavior. Broader
   tests and browser workflows followed once the pieces worked together.

## Sources Actually Used

| Source | What it informed |
| --- | --- |
| [Drei AccumulativeShadows](https://drei.docs.pmnd.rs/staging/accumulative-shadows) and its [implementation](https://github.com/pmndrs/drei/blob/master/src/core/AccumulativeShadows.tsx) | Accumulating soft static shading and avoiding continuous accumulation during normal gameplay. |
| [Drei Environment](https://drei.docs.pmnd.rs/staging/environment) | Separating environment lighting from the visible background and self-hosting HDR assets rather than relying on preset CDNs. |
| [Model-viewer lighting and tone-mapping comparison](https://modelviewer.dev/examples/lightingandenv/) | Differences between ACES, AgX and PBR Neutral, including highlight desaturation and hue behavior. |
| [Poly Haven Studio Small 03](https://polyhaven.com/a/studio_small_03) and [asset license](https://polyhaven.com/license) | Selecting and verifying a reusable CC0 studio environment. |
| Installed Three.js source for `GTAOPass`, `ProgressiveLightMap`, `HDRLoader`, `OutputPass`, `FXAAShader` and the PCF shader chunk | Current API behavior, depth reconstruction, pass order, texture formats, cleanup requirements and fixed-cost shadow filtering. |

Drei was used as a researched technical reference, not installed as a second
renderer. The existing React interface and Three.js world were retained. No
claim is made that the reference image's exact original rendering pipeline was
identified from the screenshot.

## Experiments And Decisions

| Experiment | Decision and reason |
| --- | --- |
| Raise graphics quality alone | Insufficient: more shadow pixels did not change the underlying art direction. |
| Add basic contact maps and FXAA | Retained as an initial improvement, but not treated as sufficient to match the reference. |
| Add geometry-based screen-space AO | Retained in Balanced/High, using existing depth rather than a second geometry render. |
| Increase tiny hardware subdivisions | Rejected when the fitted cabinet exceeded its triangle budget. Small handles were simplified while actual drawer recesses were preserved. |
| Fit only the central scene landmarks | Expanded to include the building roof and base after screenshots exposed foreground distortion. |
| Longer and near-orthographic lenses | Tested and rejected for the complete composition. The final implementation uses the original 50-degree lens and standard camera controls. |
| ACES versus PBR Neutral | Selected Neutral after same-view comparison. This was an artistic fit, not proof that one tone mapper is universally better. |
| Replace procedural environment lighting with an HDR | Retained with reduced environment energy and a procedural loading fallback. The stylized sky was not replaced. |
| Bake static occlusion in Blender | Blocked by addon/executable access. No elevation, permission changes or edits to the user's Blender scene were attempted. |
| Bake through Three.js `ProgressiveLightMap` | Retained. The isolated bake used actual cloned shadow geometry and an unobstructed-light control. |
| Judge bake quality only from transparent PNG previews | Replaced by opacity-distribution checks and opaque diagnostic previews, because alpha-only shading was hard to inspect directly. |

## What Improved

### Lighting, Color And Reflections

- Daylight now reaches the visible storefront faces from a warm front-left key.
  The Day preset uses intensity 3.1 at (-40, 65, 70), hemisphere fill 0.44 and
  reduced rim lighting. Existing night values and weather transitions remain.
- PBR Neutral replaces ACES at exposure 1.08 to preserve more of the intended
  warm paint and teal colors.
- Studio HDR lighting supplies more useful reflections for metal and glass.
  Its energy is scaled to 55% of the existing environment levels; the old room
  environment remains available if the asset has not loaded.
- The supported PCF filter uses radius 3 with a 2048 map in Balanced and radius
  6 with a 4096 map in High, keeping apparent softness consistent.

### Depth And Image Quality

- GTAO reconstructs normals from the existing scene depth. Its depth reference
  follows composer buffer swaps, and AO/denoising stay within a 600,000-pixel
  budget with eight samples each.
- FXAA runs after tone mapping and output conversion. Its texel dimensions
  follow the existing 1.6-million-pixel postprocessing budget.
- Three baked 512-square occlusion textures replace procedural fallbacks on the
  deck, forecourt and shelf wall. A separate 64-square contact map follows the
  courier only on the workshop floors. These contacts also work in Low.
- High permits native 2x rendering when it fits the existing device budget.
  Larger screens still obey the pixel caps; this is not unlimited supersampling.

### Materials And Modeled Detail

- Oiled timber, brushed brass and copper, plaster, painted masonry, ceramic and
  enamel no longer share one generic finish. Three shared relief maps add only
  96 KiB of base texture data.
- The cabinet has ten real recessed drawer panels, raised frames, label holders,
  a set-back plinth, feet and a shaped timber top with inlay. Its physical
  collision boundary is retained, and the complete object stays below 10,000
  triangles before batching.
- Three reels have actual bores, cut-out flanges and wound copper geometry. A
  hinged task lamp adds a weighted base, arms, joints and a spun shade. Each
  reel and the lamp stays below 3,000 triangles and adds no real-time light.
- Windows reuse a 32 KiB room atlas with corrected shaped-pane UVs, varied room
  shading and reversible night glow. Batching preserves the room coordinates.
- Shop signs now receive scene lighting and have fitted edging. Existing mural,
  screen artwork and imported machinery were preserved.

### Composition And Controls

- The final workshop arrival is (-2, 0.8, 24), with yaw 0.6, pitch 0.26, focus
  height 6.5 and distance `max(36, min(84, 27.75/aspect))`. The courier faces the
  workbench, and framing refits on resize until the user adjusts the camera.
- Auto can try Balanced after two frame-time windows below 18 ms. High retains
  its below-12-ms gate; the existing fallback and no-retry ceiling remain.
- On phones, the wide action banner becomes a labeled 44px hand button above
  the joystick, including landscape touch layouts. A smaller location title
  leaves more of the scene visible. Existing actions remain available.

## Offline Bake And Asset Provenance

The bake uses 84 cloned static shadow casters and 48 deterministic hemisphere
samples per receiver, followed by matching unobstructed samples. Dividing by the
unobstructed result converts received-light differences into soft occlusion.
The loader replaces fallback textures safely and ignores late arrivals after
material disposal. It adds no per-frame accumulation to gameplay.

The resulting maps had 135, 92 and 90 distinct opacity levels for the deck,
forecourt and wall. This confirmed spatial variation rather than a uniform dark
overlay. The loaded maps plus courier contact use 3,088 KiB of base texture data,
excluding mipmaps. This is **baked occlusion, not full indirect color-bounce GI**.

The environment is **Studio Small 03 by Greg Zaal**, obtained from Poly Haven
under **CC0**. The self-hosted file is 1024x512 and 1,686,299 bytes. A parser check
verified genuine HDR radiance rather than an LDR preview or an error download.
The three workshop occlusion PNGs were generated from this project's geometry.

## Verification And Its Limits

| Check | Recorded result |
| --- | --- |
| Complete Node regression suite | 484 tests passed after correcting an obsolete hardcoded recovery-spawn assertion. |
| Whole-project TypeScript | Passed during implementation and again after restoring the final renderer before publication. |
| Focused geometry and resource tests | Covered actual drawer recesses, open reel bores, budgets, UVs, night restoration, map replacement and late-load disposal. |
| Desktop/mobile visual sweep | 11 captures passed across Low/Balanced/High, Local sky, night and movement. |
| Reference-sized rendering | Used a real 353x600 touch viewport at DPR 2, plus actual camera-distance, HDR-readiness and asset checks. |
| Compact action control | Portrait and 844x390 landscape checks confirmed a 44px target clear of the joystick. |
| Touch HUD workflow | 28 captures passed, including menus, joystick release, rotation and character controls. |
| High mobile graphics recovery | Deliberate WebGL loss/restoration retained the same document, canvas, scene and player position. |
| Publication restoration | Three fresh reference/control captures passed with the restored HDR, Neutral tone mapping, camera focus and facing direction. |

The complete 484-test run preceded the final restoration of the missing world
entry-point hooks. Before publishing that restoration, the reference browser
check, TypeScript, diagnostics, staged-file audit and whitespace checks were
rerun; the entire 484-test suite was not rerun at that final commit step.

Generated screenshots and reports remain local under `outputs/playtest/`; they
are not bundled into the Git commit. Useful evidence prefixes are
`reference-complete-*`, `reference-final-*` and `reference-restored-*`, with touch
and recovery reports in their corresponding generated subdirectories.

Short local Chrome/Intel Arc timing samples were exploratory. An early AO-only
comparison measured 20.56 ms without AO versus 20.18 ms with AO on desktop, and
17.59 versus 18.15 ms at phone viewport size. A later craft pass used a 90-frame
warm-up and three measured windows, with median-run means of 28.15 ms desktop
and 22.78 ms at phone viewport size. These are different implementation stages,
not a final matched performance comparison or evidence of a universal speedup.

Physical-phone performance, exact pixel equivalence to the supplied image,
full indirect light transport and the hosted deployment were **not verified**.
The image may also include capture/compression differences that were not
independently characterized. No numerical "10000 times better" claim is made.
Passing tests proves specific behavior, not artistic equivalence by itself.

## Reproducing The Checks

The recorded runs used Node 24.14.1. Run these from the repository root with the
project's dependencies installed and a supported modern Node on PATH. Browser
checks also require the browser channel requested by the script, including
Chrome for the workshop checks.

Start the local preview in one terminal:

```sh
npm run dev -- --hostname 127.0.0.1 --port 4332
```

Run checks in another terminal:

```sh
node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --workshop --match-reference --url=http://127.0.0.1:4332 --prefix=reference-report
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --workshop --url=http://127.0.0.1:4332 --prefix=reference-report-sweep
npm exec --yes --package=playwright -- node scripts/check-camera-lifecycle.cjs --url=http://127.0.0.1:4332 --quality=high --browser=chrome --mobile --recover
```

Add `--tone=aces`, `--tone=agx` or `--tone=neutral` to a reference capture for an
isolated tone-mapping comparison. Use `--reference --ao-control` for the
AO-disabled close-up control; this does not alter application source.

After changing static workshop geometry, regenerate its public bake assets:

```sh
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --bake-workshop --url=http://127.0.0.1:4332
```

This last command writes the three workshop ambient PNGs under `public/assets/`
and diagnostic previews under `outputs/playtest/`. Review the previews and rerun
the visual checks before publishing changed bake assets.

## Implementation Map

| Area | Files relative to this document |
| --- | --- |
| Renderer, HDR loading and final world integration | [../app/world.ts](../app/world.ts) |
| Tone-mapped postprocessing, GTAO and FXAA | [../app/kingdom-presentation.ts](../app/kingdom-presentation.ts) |
| Quality profiles and adaptive selection | [../app/quality-tiers.ts](../app/quality-tiers.ts) |
| Lighting and environment response | [../app/world-lighting.ts](../app/world-lighting.ts), [../app/astra-atmosphere.ts](../app/astra-atmosphere.ts), [../app/astra-lighting.ts](../app/astra-lighting.ts) |
| Arrival framing | [../app/astra-moments.ts](../app/astra-moments.ts), [../app/world-config.ts](../app/world-config.ts) |
| Workshop construction and materials | [../app/workshop-neighborhood.ts](../app/workshop-neighborhood.ts), [../app/workshop-details.ts](../app/workshop-details.ts), [../app/workshop-objects.ts](../app/workshop-objects.ts) |
| Offline bake and safe runtime loading | [../app/workshop-lighting.ts](../app/workshop-lighting.ts) |
| Mobile overlay | [../app/hud-controls.css](../app/hud-controls.css) |
| Repeatable visual checks | [../scripts/check-kingdom-visuals.cjs](../scripts/check-kingdom-visuals.cjs) |

## Publication

The visual implementation was pushed to `main` as commit `a70a977` after the
user requested the achieved final visuals. Remote `main` was checked against the
full local commit hash. The renderer restoration was scoped so unrelated local
Gallery removals, multiplayer hosting edits and private modeling/source files
were not included. No unrelated working files were deleted or reset.

This report is a documentation-only follow-up. It does not claim that the public
Vercel deployment has been checked or that this documentation change performs a
new rendering upgrade.
