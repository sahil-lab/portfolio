# Premium Asset Studies

The reviewed shared-asset pass is integrated into the local website. It is not a
completed redesign of every unique object. See [scope.json](scope.json) for the
remaining bespoke-model work.

## Collectible Packet Press

The user selected a radical cute-collectible direction for the bespoke models.
The first is now integrated as
[collectible-v1/packet-press.glb](../../public/assets/collectible-v1/packet-press.glb).
It has a native rounded housing, oversized dials, porcelain sleeves, brass trim,
glowing chamber and remodeled grip/capsules. Its static assembly has 28,568
triangles; the complete download is 2,008,320 bytes.

[collectible-press.py](collectible-press.py) is the Blender recipe.
[collectible-study-20261003.blend](collectible-study-20261003.blend) preserves the
editable scene and seven packed image dependencies. This is a full study copy,
including earlier scenes, because the restricted connection blocks library writes.
[finalize-collectible-press.cjs](finalize-collectible-press.cjs) restores the exact
original animation samples and the authored linear color factors in structured
glTF. Blender's color-multiply node did not export its factor by itself.

The first white export was rejected. Accepted matched images and hashes are in
[collectible-press-study-v2-checks.json](../../outputs/playtest/collectible-press-study-v2-checks.json).
The later [live tour](../../outputs/playtest/collectible-press-live-v1-checks.json)
loads the actual published asset without source or asset overrides. Nine focused
tests, all thirteen live views, movement, TypeScript, application-module lint and
the production build passed. The original asset remains the loader fallback.
The broad lint command still flags the repository's CommonJS test/tool convention
and two pre-existing unused destructuring bindings in the visual harness.

The historical `--press-study` comparison used the pre-integration original as its
baseline. After integration its baseline is the currently published Press; use
`--collectible-press` for the current live regression check.

## Collectible Copper Bakery

The second bespoke model is integrated with a ribbed pillow roof, blue walls,
rose scalloped awnings, softly beveled open arches, a plump braided pretzel and
fuller display pastries. The new roof is fitted to the wall rather than floating
above the old trim. Small-detail bevels were reduced to retain the existing
60,000-triangle limit; the accepted model has 57,272 triangles.

[collectible-bakery.py](collectible-bakery.py) records the modeling and baking.
[collectible-bakery-study-20261003.blend](collectible-bakery-study-20261003.blend)
contains the editable scene and thirteen packed images, alongside the earlier
study scenes. Surface maps use UV1; the refreshed 2048-square contact bake uses
UV0. The runtime loads the model and bake as a pair and falls back to the complete
original pair if either new resource fails.

The [bakery manifest](../../public/assets/collectible-v1/bakery-manifest.json)
records the 5,355,996-byte GLB and 963,052-byte bake. The first geometry-heavy draft
and the later floating-roof draft were rejected. Accepted comparison evidence is
[baseline v2](../../outputs/playtest/collectible-bakery-baseline-v2-checks.json) and
[candidate v3](../../outputs/playtest/collectible-bakery-candidate-v3-checks.json).
The finalizer checks unchanged original inputs and matching cameras, then verifies
the reviewed candidate hashes before publishing. These historical comparisons
precede the subsequent planet-lighting repair.

The live check found that the world loop was not forwarding weather to planetary
lighting. The call now forwards the selected weather and resets local atmosphere
outside surface views. All 36 nearby venue, Press and lighting tests passed, as
did TypeScript and the production build. The
[final live tour](../../outputs/playtest/collectibles-final-checks.json) passed all
34 desktop/mobile views across ten destinations, including six night views and
orbital reset. It uses the published assets, not candidate routes.

Runtime lint still flags an untouched `prefer-const` declaration in the world
module. The original public assets, earlier complete export and portable archives
were preserved. These two bespoke models plus the shared pass do not constitute
an individual remodel of every object in the world.

## Selected Changes

- A smoother rounded block, dome and separate high-detail facial sphere.
- Softer courier/resident heads and bodies, hands and boots, plus remodeled
  blossoms, shrubs and canopy lobes. Bounds and animation attachments are retained.
- Twelve Blender-baked color, roughness and normal maps for ceramic, stone,
  timber and brushed metal. Original object colors and artwork remain intact.
- Matte resident coats and restrained physical-material highlights.

The dense sphere is restricted to facial details; background spheres remain
lightweight. Wavy roof bevels were rejected, so original roof geometry is retained.
Tree and banyan branching structures, terrain geography and unique hero models
have not been individually remodeled in this pass.

## Sources And Evidence

[premium-study-20261003.blend](premium-study-20261003.blend) contains the Blender
studies and twelve packed texture maps. The Python files in this folder record
the modeling and baking recipes. Candidate GLBs were independently loaded and
checked for identities, dimensions, openings, normals and geometry budgets.

The integrated assets are versioned under
[public/assets/premium-v1/manifest.json](../../public/assets/premium-v1/manifest.json).
The original public GLBs were not overwritten. The owned preview server was
stopped and its port checked before integration, then restarted.

The root-level comparison images include interrupted and superseded experiments.
Do not treat them as final evidence. Fingerprinted historical comparisons are in
`comparisons/`; their browser-only override harness targets the pre-integration
source and is not a regression command for the current application.

Current verification: 533 tests, TypeScript, scoped lint, 46 desktop/mobile views
across all nine planets, graphics-context recovery and a plain production build.
Reports: [regression](../../outputs/premium-shared-regression.xml) and
[visual tour](../../outputs/playtest/premium-shared-final-checks.json).
These are not physical-device performance measurements or a quantified visual
quality multiplier. No commit, push or deployment was performed.
