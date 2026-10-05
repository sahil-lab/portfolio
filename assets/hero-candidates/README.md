# Hero Remodels

## Angel

The reviewed angel is integrated at
[public/assets/hero-v1/angel.glb](../../public/assets/hero-v1/angel.glb), with the
original model retained as a fallback. Its head and hair have a fuller silhouette,
the feather profiles curve gently, and the clothing, skin and pearl finishes use
authored surface maps. A fitted chest badge and halo complete the revision.

The body height, leg landmarks, soles and wing hinge transforms remain unchanged.
The existing runtime skeleton and flight/ground controllers remain authoritative.
The asset contains 248,622 triangles, 71 nodes, 21 materials and two embedded maps;
its download size is 8,329,360 bytes. No personal photographs are embedded.

[remodel-angel.py](remodel-angel.py) records the geometry/material changes and fixed
review camera. [angel-before.png](angel-before.png) and
[angel-after.png](angel-after.png) are fresh matched Blender renders; the viewport
screenshot service returned stale framing and was not used to judge proportions.
[angel-study-20261003.blend](angel-study-20261003.blend) preserves the editable
study, packed maps and review setup alongside the pre-existing project scenes.

[finalize-angel.cjs](finalize-angel.cjs) restores rig names and material factors,
excludes review cameras/lights and checks geometry and download budgets. The
[published manifest](../../public/assets/hero-v1/angel-manifest.json) records the
reviewed hash and original hash. Both the shared world asset manager and standalone
angel loader retain the legacy fallback; loaded-source metadata reports the actual
URL used.

Validation: four original/candidate rig checks, 29 angel/asset-manager tests,
13 control tests, TypeScript, scoped runtime lint and production build passed.
The [live flight report](../../outputs/playtest/angel-collectible-live-final/checks.json)
covers all ten destinations, desktop/mobile/landscape framing, input, pause and
Main restoration. The [live ground report](../../outputs/playtest/angel-collectible-ground-live/checks.json)
covers landing, walking/running, foot contact, takeoff and planetary ground.

The live review exposed an input ownership bug: idle held controls could clear
another button's input on blur. Each control now releases only its own active hold,
with a browser regression. The planetary test awaits the actual streamed landscape;
`canLand()` is only a range/state gate, while the unloaded proxy blocks all ground.
Neither assertion nor collision checking was relaxed.

## Dog

The reviewed [dog model](../../public/assets/hero-v1/dog.glb) is integrated with
the original retained as a fallback. The head/chest silhouette is fuller, with a
teal collar and metal tag. Body and groom use the same bounded deformation;
the original body extrema, paws, four embedded coat/groom images and alpha-cutout
settings are preserved. The export has 86,882 triangles, 26 nodes and eight
materials in 6,117,224 bytes. Its [manifest](../../public/assets/hero-v1/dog-manifest.json)
records the reviewed model and rig hashes.

[remodel-dog.py](remodel-dog.py), [finalize-dog.cjs](finalize-dog.cjs) and
[dog-study-20261003.blend](dog-study-20261003.blend) preserve the authoring process
and editable study. The runtime skeleton still owns locomotion. Groom attachment
now uses connected strands, the actual UV roots and supporting body weights;
leg/paw fur is covered by regression tests.

Validation: 27 dog/asset-loading tests, TypeScript, scoped runtime lint and
production build passed. The [live report](../../outputs/playtest/dog-collectible-live/checks.json)
covers roaming, turns, gait, pause, greeting/audio and four desktop/mobile captures
without candidate routing. Obstructed and detached-groom earlier candidates were
rejected before the accepted candidate-v6 review.

## Portrait Monument

The [portrait model](../../public/assets/hero-v1/monument.glb) is integrated with
the original retained as a fallback. This is a tailoring and surface refinement,
not a new likeness sculpt: the face, posture, normal head proportions and overall
bounds remain unchanged. Raised lapel/collar details, a surface-fitted pin,
brushed tailoring, polished accents and stone detail distinguish the finishes.
The export has 131,300 triangles, 25 nodes, nine materials and four embedded maps
in 6,800,840 bytes. No personal photographs are included.

[remodel-monument.py](remodel-monument.py) records the changes and matched review
camera; [monument-before.png](monument-before.png) and
[monument-after.png](monument-after.png) are fresh renders.
[monument-study-20261003.blend](monument-study-20261003.blend) contains the editable
study and four packed maps alongside the pre-existing project scenes.
[finalize-monument.cjs](finalize-monument.cjs) preserves binary buffers, restores
runtime names and refuses publication without matching review/source hashes.
The [published manifest](../../public/assets/hero-v1/monument-manifest.json) records
the accepted asset and native study.

Validation: 19 portrait/asset-loading tests, TypeScript, scoped runtime lint and
production build passed. The [live report](../../outputs/playtest/monument-collectible-live/checks.json)
covers three desktop/mobile captures, ground contact, reserved lot, collision,
normal depth occlusion and fixed placement through planetary observation.
The pin initially sat behind a lapel; a frontmost-ray regression caught it and
the final candidate-v3 fits the visible lapel surface. The total height remains
101.25 world units, independent of the subsequently reduced bulletin boards.

The remaining object families are tracked in
[scope.json](../premium-candidates/scope.json). Trees, terrain and individual
furniture, vehicle, sign, public-venue and custom-landmark passes are not complete.
These checks are not physical-phone performance measurements.
