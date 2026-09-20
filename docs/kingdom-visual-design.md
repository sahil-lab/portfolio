# Kingdom visual direction

## Material and spatial language

The kingdom combines pearl ceramic, jade substrate, satin brass, cool glazing,
and selective coral accents. District colors remain recognizable. Warm signals
and fine inlays provide detail without turning every surface into a light source.
The original mural, models, signs, portfolio content, and gameplay remain in use.

| Surface | Owner |
| --- | --- |
| Rounded edges, shared deterministic grain, ceramic and metal finishes | `app/crafted-surfaces.ts` |
| District engraving, boulevard signals, edge contacts, common material finishing | `app/kingdom-art.ts` |
| Open atrium ribs and large district silhouettes | `app/awe-world.ts` |
| Weather-driven sky vault, light, instanced clouds, sun and moon | `app/weather-sky.ts` |
| Bounded highlight bloom, quality switching, render-target cleanup | `app/kingdom-presentation.ts` |
| Storefront hardware, glazing, planting, responsive arrival camera | `app/creative-plaza.ts` |
| Instanced home trim, entrance lights, roof panels, waterways | `app/planet-infrastructure.ts` |
| Matching vehicle finishes, window surrounds, running lights | `app/transit-models.ts` |
| HUD, district atlas, dispatch, typography, responsive tools | `app/kingdom-ui.css` |

Preserve thin real edge radii instead of increasing subdivision on every repeated
primitive. Shared materials keep independent mutable instances for animated
machines. Static batching distinguishes clearcoat, reflection strength, and
surface textures, so visually different finishes cannot silently collapse.

Ground inlays do not create collision obstacles. New planted beds occupy clear
lots and participate in collision checks. The small-screen Commons arrival has a
tested sight line past the radio to the kettle storefront. The open atrium no
longer imposes the previous solid ceiling on orbital camera movement.

## Presentation and accessibility

- Space Grotesk and Fraunces are served locally from `public/assets/fonts`, with
  their upstream licenses. There is no runtime font service dependency.
- The HUD retains the existing navigation and interactions, using labeled icons,
  native hover titles, visible focus states, and at least 44px toolbar targets.
- The district atlas uses spatially separated, keyboard-accessible buttons.
- Small screens keep the world full-bleed, with independent camera and movement
  controls and a two-row toolbar when eight 44px targets cannot fit.
- Reduced motion freezes decorative routing signals and honors existing weather
  and character settings. Low quality bypasses bloom and releases its targets.
- Bloom uses a high-pass radiance limit so reflected highlights cannot wash out
  whole streets. Quality can switch in both directions without recreating the
  world or changing player progress.
- Far-away discovery labels fade; full labels return on approach. Existing
  artwork and machine emissions are not recolored by the finishing pass.

## Verification, 20 September 2026

Run with Node 24:

```sh
node --test --test-concurrency=4 tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-kingdom-visuals.cjs --full --prefix=kingdom-optimized
```

The full behavioral suite passed 143 tests. Added checks cover edge geometry,
independent material animation, physical-material batching, ground detail bounds,
reduced motion, Commons sight lines, clear cross streets, and the open atrium.

The visual harness launches isolated headless Edge with software WebGL. It uses
in-memory browser storage and denies location permission; it does not modify the
user's saved game. Captures include the workshop, CPU/RAM/GPU, Commons, Pixel, an
asserted metro arrival on Cache Gardens, and the project panel. Responsive checks
cover 1440x960, 390x844, 320x740, 375x812, 680x850, and 844x390, plus Low quality and
restored Balanced quality. Checks include nonblank canvas pixels, moving content,
walking, loaded fonts, toolbar target sizes, map overlap, and shader errors.
Screenshots are in `outputs/playtest/kingdom-optimized-*.png`.

Software-rendered viewport tests are not real-phone performance certification.
Render counters include post-processing and any shadow refresh in the sampled
frame; they should not be compared directly with earlier scene-only counters.
The existing frame-time and draw/triangle goals remain targets, not a claim of
sustained performance across every route.

Optimized sampled frames: CPU 432 draws / 520,410 triangles; RAM 542 / 569,168;
GPU 649 / 605,372; Commons desktop 1,352 / 717,426; Pixel 1,309 / 700,762.
The wider Commons and Pixel samples still exceed the existing 1,100-draw and
650,000-triangle targets. Shadow-refresh frames can be higher. These are scene
complexity observations, not hardware frame-rate measurements.

Application RSC, client, and SSR bundles compiled. Vercel packaging failed twice
in Nitro dependency copying with Windows `EBUSY` for the nested `content-type`
package. No deployment configuration was changed; the final Vercel output
manifest was not produced. Resolve the file lock or run the build in a clean
environment before deployment.

Focused lint reported existing page-level render-ref and semantic-role issues,
plus the plain navigation anchors retained for the documented Vinext navigation
workaround. The visual modules themselves produced no lint diagnostics.
