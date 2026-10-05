# Native Signature Shops

## Refined Collection

The October 5 refinement follows the request to bring all signature shops closer
to Copper Crumb's architectural detail, enlarge every shop by three in all
dimensions, and remove the flat name boards. Copper Crumb's native design is
preserved; it receives the same runtime size increase as the other nine shops.

[refine-signatures.py](refine-signatures.py) builds separate `Signature Atelier`
scenes from copies of the earlier models. The new work includes substantial
theme-specific roofs, solid pierced facades, fitted roof-to-wall joins, deep
display sills, tailored awnings, side windows, roof seams and individually
modeled merchandise and equipment. The nine revisions contain 211-284 modeled
parts and 36,028-62,892 triangles each, within the existing 65,000-triangle limit.

Shop names are shallow, fitted 3D letters attached to the front and rear facades,
not text painted onto rectangular panels. The same
[lettering helper](../../app/readable-display.ts) replaces the Bootloader Workshop
plaques; its main name uses the existing dark lintel without an added fascia.
The bundled Helvetiker data retains its original attribution and
[font license](../fonts/LICENSE).

The 3x runtime scale includes complete shop assemblies, rooftop products, name
letters and collision bounds. Plots expand to 60 by 54 units, with terrain-fitted
forecourts and foundations on planets. Shop cameras, city lot reservations and
the neighboring curved roads follow the new size; the original world terrain,
walking controls and unrelated venues are preserved.

[bake-contact.py](bake-contact.py) accepts `--atelier` to generate new 2048-square
contact maps and separate surface-detail UVs. Model/bake pairs use `atelier-`
candidate names; [finalize.cjs](finalize.cjs) accepts `--atelier` and published
the source-matched, reviewed collection to
[signature-v2](../../public/assets/signature-v2/manifest.json). The nine model/map
pairs total 59,278,725 bytes and stream on demand rather than all at startup.
The loader tries a complete v2 pair, then the matching v1 pair on failure, with
rejected and late assets disposed. No existing public model is overwritten.

The editable source is
[signature-atelier-study-20261005.blend](signature-atelier-study-20261005.blend),
1,206,109,318 bytes with 521 packed images across the retained project and new
study scenes. Full multi-frame Zstandard decoding verified the Blender header,
5,658,134,193 decoded bytes and final `ENDB` marker. The previous studies and
27,266-object complete-world archive remain unchanged. Runtime lettering and
placement corrections are recorded in the TypeScript source; this is not a new
static export of the complete assembled world.

### Placement Corrections

The roadside sign shown buried in a graded shoulder is now fully inside the
plaza. Lamps, trees and planted beds also clear both complete road shoulders,
not just the asphalt lanes. Freestanding placards now contribute their actual
bounds to collision and camera checks. Every refined shop is checked against
the visible fixtures around its plot.

The broader audit found twelve city street-tree canopies reaching building lots.
Those trees were shifted within their existing courts; all 944 street trees and
four large banyans are retained. City background lawn strips now exclude all
public plots, fixing the strips visible through shop and library paving. Tests
cover full/distant canopy envelopes, building/public-plot clearance, and both
near and middle-detail lawn instances. All nine planets' planting, public places,
roads, rivers and outpost clearances are also checked.

These checks address unintended placed-object intersections. They are not an
exhaustive all-triangle intersection proof; deliberate construction joints,
objects resting on counters and other intentional model connections remain.

### Final Verification

- All 588 tests passed across 115 files with no failures or skips: [full report](../../outputs/signature-atelier-final-regression.xml).
- TypeScript, scoped runtime lint and the plain production build passed: [build log](../../outputs/signature-atelier-build.log). The untouched workshop `module` loop lint warning, world `prefer-const` warning and existing build warnings are not claimed fixed.
- The [final candidate tour](../../outputs/playtest/signature-atelier-candidate-checks.json) passed 52 views with matching source hashes, all ten shops at 3x scale, raised facade names, close-ups, all-shop night views, interactions, road traversal and two views of the corrected roadside sign.
- The [published-model tour](../../outputs/playtest/signature-atelier-live-checks.json) passed the same 52 views without candidate redirects. The [contact sheet](../../outputs/playtest/signature-atelier-contact-sheet.jpg) shows all ten final shop designs.
- The [workshop lettering review](../../outputs/playtest/workshop-facade-live-checks.json) passed 15 normal and close-up views, including genuinely different settled day/night lighting, quality changes and movement.
- The [Balanced mobile recovery check](../../outputs/playtest/camera-lifecycle/balanced-mobile.json) restored the same page, scene, canvas and player position after one deliberate WebGL loss, with nonblank rendering afterward. This is viewport emulation, not physical-phone FPS certification.

The earlier [3x placement tour](../../outputs/playtest/signature-triple-clearance-checks.json)
and images showing white name panels are intermediate history, not final art
evidence. No commit, push or hosted deployment was performed.

## First Revision Archive

All nine remaining signature themes are integrated alongside the previously
authored Copper Crumb. Original public models and earlier Blender exports were
not overwritten. The following records describe the first revision; its visual
quality is being superseded by the refinement above.

| Shop | Individual Work |
| --- | --- |
| Loop & Glaze | Rounded display bays, glazing conveyor, dispensing vats, sprinkled ring |
| Scoop Cache | Fan canopy, flavor wells, cone rack, layered rooftop scoops |
| Paper & Steam | Timber portals, lattice screens, paper lanterns, tea service and tins |
| Petal Pantry | Petal roof shells, tiered pastries, fruit crates, fluted rooftop tart |
| Sunrise Roastery | Copper vault, roasting drum, bean silos, espresso machine and cups |
| Nimbus Sugar Works | Cloud canopy, pipe loops, spinning bowls and finished spun sugar |
| Prism Optics | Faceted columns, lens wall, assembly benches and focusing scopes |
| Fold & Fly | Hangar lattice, cutting tables, cradles and complete display gliders |
| Ribbon & Reel | Curved sail canopy, spool wall, cutting tables and framed display kites |

## Sources

[build-signature-shops.py](build-signature-shops.py),
[detail-signatures.py](detail-signatures.py) and
[bake-contact.py](bake-contact.py) record the modeling and baking stages.
[signature-shops-study-20261003-r2.blend](signature-shops-study-20261003-r2.blend)
is the saved enriched revision: nine study scenes and 90 packed images, alongside
the pre-existing project scenes. The earlier study copy is retained.

Contact shading is baked from a temporary joined copy so the editable parts and
rooftop assembly remain separate. Contact maps use UV0; material detail uses UV1.
The nine model/bake pairs total 31,770,574 bytes and are streamed as needed.
Individual models contain 85-141 modeled parts and 12,852-35,488 triangles.

## Review And Integration

The first review was rejected because the venue static batch retained old fallback
windows and awnings. The adapter now marks replaceable shops before placement;
they stay outside static batching without losing surrounding gardens. The second
review prompted additional counter merchandise and architectural trim.

[Candidate v3](../../outputs/playtest/signature-candidates-v3-checks.json) records
the accepted 52-view review. [finalize.cjs](finalize.cjs) checked its source and
asset fingerprints before publishing to the new
[signature-v1 manifest](../../public/assets/signature-v1/manifest.json).
Publication is deliberately strict: after changing the factory or reviewed inputs,
another publication requires a new review instead of bypassing the old hashes.

The normal factory now uses the native adapter for all non-Copper themes. The
adapter preserves both sign faces, hero identity, interactions and reduced-motion
behavior, and disposes late results. Procedural fallbacks remain available.

The [live tour](../../outputs/playtest/signature-live-final-checks.json) passed all
52 views without candidate routes. All 39 nearby venue, Press and lighting tests,
TypeScript, scoped runtime lint and the production build passed. The screenshot
draw counts are not physical-device performance measurements.
