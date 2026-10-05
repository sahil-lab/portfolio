# World Detail Studies

## Trees: Integrated

[remodel-trees.py](remodel-trees.py) builds the tree/banyan full and distant wood
and crowns in an isolated Blender scene. Ridged curved boughs, layered crown
lobes, reworked root curves and baked vertex contact shading replace the eight
earlier tree parts. The physical trunk anchors and crown envelopes are retained.

| Model | Full Triangles | Distant Triangles |
| --- | ---: | ---: |
| Tree | 4,736 | 1,040 |
| Banyan | 11,052 | 2,286 |

[finalize-world-kit.cjs](finalize-world-kit.cjs) transfers the new parts through
structured glTF buffers and preserves the other thirteen premium-kit parts.
The [published kit](../../public/assets/world-v1/kingdom-world-kit.glb) is
1,186,004 bytes; its [manifest](../../public/assets/world-v1/trees-manifest.json)
records the exact hash, original hash, native source and reviewed candidate.
Earlier premium and original kits remain available as fetch fallbacks.

[trees-before.png](trees-before.png) and [trees-after.png](trees-after.png) are
matched Blender renders. The editable study, baked vertex colors and review
setup are saved in [world-details-study-20261004-r1.blend](world-details-study-20261004-r1.blend),
alongside the pre-existing project scenes.

Eight kit tests pass, including nine-planet planting clearance with the new kit
installed. The [candidate tour](../../outputs/playtest/botanical-candidate-final/checks.json)
passed thirty home/all-nine-planet captures. The [normal-live check](../../outputs/playtest/botanical-live-v2/probe.json)
passed six desktop/mobile views without candidate routes. Motion checks use an
isolated copy sharing the production geometry/materials, so unrelated live scene
pixels cannot produce a false reduced-motion failure. The earlier botanical-live
run failed that whole-scene comparison and is not final evidence.

## Terrain: Integrated

All nine planets have versioned sculpted hill profiles with protected roads,
river channels and landing heights. Both full and distant LODs are generated from
the same height authority used for walking. The loader rejects stale terrain
revisions; unavailable new assets fall back to matching procedural ground, not
an old mesh with different heights. Archived assets remain unchanged and are
tested against the preserved legacy profile.

[finish-terrain.py](finish-terrain.py) creates separate contact/detail UV channels,
terrain self-occlusion and stone normal detail in Blender.
[finalize-terrain.cjs](finalize-terrain.cjs) combines that occlusion with the
retained scene-contact maps without changing geometry buffers. This is not a
fresh full-world GI bake. The [published manifest](../../public/assets/world-v1/terrain/manifest.json)
records all nine GLBs, totaling 25,095,016 bytes. The final maps and nine editable
scenes are saved in [world-details-study-20261004-r2.blend](world-details-study-20261004-r2.blend).

Ten terrain tests pass, including every returned vertex, both LODs, the texture
channels, protected height samples, incompatible-revision rejection and streaming
lifetime. TypeScript and scoped runtime lint pass. The
[candidate tour](../../outputs/playtest/terrain-candidate-final-checks.json) has
64 home/all-nine-planet day/night/orbit captures; the
[normal-live check](../../outputs/playtest/terrain-live-checks.json) has 16 captures
without candidate routes. Both include nonblank canvas, layout, actual loaded
terrain metadata and first-person movement checks, with no browser errors.

These checks establish geometry, placement and rendering behavior, not a
physical-device performance improvement. The subsequent craft integration is
documented below; this is not a claim of individually remodeling every unique mesh.

## Craft Library: Integrated

The [published craft kit](../../public/assets/world-v1/craft-kit.glb) supplies
28 native profiles with 9,870 triangles in 661,856 bytes, below the 750,000-byte
budget. Its [manifest](../../public/assets/world-v1/craft-manifest.json) records
the asset and recipe hashes, native source and fingerprinted candidate review.

- Furniture uses shaped slats, backs, feet, lanterns, bins, planter rims and plaque housings. Bench supports connect to their backs and arms, and soil stays inside the open planter rims.
- Vehicles use new rover and metro bodies, roofs, tyres, rocket hulls and fins. Wheel bindings, axles, couplers, route poses and exhaust remain live. The rocket's fitted window mount keeps the complete glass face exposed.
- Signs retain their arch, arrow and shield faces, fitted lettering and two readable sides, with native support hardware and grounded feet.
- Public venues use sculpted playground roofs, market and mall canopies, tables, shelving, ticket booths and bells. Entry actions, the mall route and playground motion are retained.
- Landmarks use open fountain basins, turned columns and finials, clock drums, sorting housings and turbine blades. Fountain inlays sit continuously on the coping. The clock has twelve markers, two connected hands and a centered hub; its existing drum motion is retained.

The source recipes are [remodel-craft.py](remodel-craft.py),
[remodel-transport.py](remodel-transport.py),
[remodel-venues.py](remodel-venues.py) and
[remodel-landmarks.py](remodel-landmarks.py).
[craft-kit.ts](../../app/craft-kit.ts) loads the kit before world construction,
validates the complete profile set and returns independent fitted geometry.
Unavailable assets retain the existing procedural fallback. Vertex contact
shading and UVs are included; existing material finishes and live content remain.

The editable source is
[world-details-study-20261005-r3.blend](world-details-study-20261005-r3.blend),
1,184,325,429 bytes with 512 packed images. It retains the previous project scenes,
the 74-object craft studio and the original 27,266-object complete assembly, and
adds a separate 60-object library review scene. This is an editable profile
library, not a replacement export of the newly assembled runtime world.
[craft-library-final.png](craft-library-final.png) shows normalized profiles;
their actual fitted proportions and colors appear in the browser captures.

The entire compressed save was independently decoded with Python `zstandard`
0.25.0 using `stream_reader(read_across_frames=True)`: 5,597,892,887 decoded bytes,
the Blender 5.2 header and the final `ENDB` marker. Node 24's streaming decoder
stopped at the first frame on this file; that result was not treated as proof of
corruption. Earlier native studies and the complete-world export remain unchanged.

### Craft Verification

- All 571 regression tests pass across 115 files, with no failures or skips: [final report](../../outputs/world-details-final-regression.xml).
- TypeScript, scoped runtime lint and the plain production build pass: [build log](../../outputs/world-details-build.log). Existing dependency externalization and large-chunk warnings remain.
- The [candidate tour](../../outputs/playtest/craft-candidate-final-checks.json) passed 120 captures, including 52 craft subjects, four furniture assemblies, home views and all nine planets in day, night and orbit. It verifies nonblank pixels, framing, readable faces, interactions, motion and unchanged source hashes.
- The [contact sheet](../../outputs/playtest/craft-candidate-final-contact-sheet.jpg) and final clock, rocket and fountain close-ups were visually inspected before publication.
- The [normal-loader tour](../../outputs/playtest/craft-live-final-checks.json) passed 46 desktop/mobile views without candidate redirects, including vehicle, venue, sign and landmark close-ups, Copper surface/orbit/night views and first-person movement. It records the published asset hash and no browser errors.
- The [Balanced mobile context-recovery check](../../outputs/playtest/camera-lifecycle/balanced-mobile.json) passed camera changes, rotation and one deliberate WebGL loss/restore while retaining the same page, scene, canvas and player position, with nonblank rendering after recovery.

Live screens, lettering, water, weather, particles and interaction-driven geometry
remain runtime systems. This pass covers the selected reusable families, not a
literal replacement of every custom mesh or a physical-phone performance claim.
