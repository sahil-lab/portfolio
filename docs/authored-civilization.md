# Authored Civilization Pass

## Direction and Audit

The brief is interpreted as a coherent miniature civilization, not an increase
in effects or object count. Existing scenery, character rigs, data sources,
display helpers, orbital travel, and the supplied visual references were audited
before each owned implementation slice. The reference informed layering,
readable silhouettes, material contrast, and the relationship between buildings
and daily activity; no reference artwork or model was imported.

The starting workspace already had a 1100 by 2640 local-unit motherboard,
ten times the width and depth of the original 110 by 264 board. This pass keeps
that footprint and the existing scene scale. It replaces the sparse repeating
four-house block layout with four eight-building plans at a smaller human scale,
and reserves space for authored centers instead of simply expanding the slab.

## Motherboard Hierarchy

| Neighborhood | Main Silhouette | Secondary Experience |
| --- | --- | --- |
| Lantern Quarter | Pneumatic sorting tower and clockhouse | Residents, seating, planted corners, cooling turbine, slow street traffic |
| Portside Exchange | Ceramic connector hall and contact tongues | Moving parcel rail, component service stalls, elevated pier walk |
| Memory Terraces | Open archive shelves between two buildings | Reading desk, service nooks, upper gallery |
| Copperworks | Repair gantry, armatures and clay kilns | Upper workshop walk and lower maintenance court with exposed board strata |
| Cache Gardens Promenade | Ribbed conservatory | Growing beds, a vented canopy, quiet planted side paths |
| Clockwork Heights | Cradled telescope and counterweight | Highest district terrace and an instrument-control stop |

`city-districts.ts` defines layout and names. `city-district-world.ts` owns the
five new centers, collision, stairs, gallery height, and local mechanisms.
`city-expansion.ts` retains instanced buildings, distance detail levels and local
crowds. `world.ts` integrates their existing movement and interaction paths.
The Travel panel offers district arrivals without replacing the connected roads.

The lower Copperworks court removes the corresponding physical substrate
sections. Its stair is the only ground-level descent; visitors cannot continue
walking over the opening. The original guarded circuit abyss remains intact.

## Three New Worlds

The new destinations append to the existing persisted travel IDs:

- **AI Research Planet:** chalk ridges, folded ceramic observatories, a model
  archive, and a deterministic neural classification demonstrator. Its weights
  are explicitly hand-set, not claimed to be a trained model.
- **Project Foundry Planet:** basalt steps, fired-clay assembly workshops,
  sawtooth roofs, a gantry and pattern press. Project facts come from the supplied
  resume; teaching computations are labeled separately.
- **Skills / Technology Planet:** green terraces, timber aqueducts, a seed
  library and a waterwheel. Its demonstration runs a real filter/count/render
  pipeline using technologies listed in the resume.

`realm-layout.ts`, `realm-world.ts`, and `realm-demos.ts` own the distinct visual
and interactive designs. Terrain, walking normals, and displayed geometry share
the existing geography authority. All worlds retain whole-sphere movement and
rover support. Distant realms retain silhouettes while their detailed geometry
is hidden; direct rail routes are created when used rather than prebuilding a
fully connected high-detail orbital network.

## Characters and Displays

Characters retain their established names, inventory contracts and interactions.
Ordinary residents now have fitted occupational equipment and distinct motion
profiles; specialist residents retain their original silhouettes. Blinks, gaze,
idle motion, walking and reactions respect Reduced Motion. Whole-planet crowds
remain instanced and skip inactive-world animation uploads.

Important information surfaces use independently oriented front and rear planes
sharing the same updating canvas. The Chronicle, weather/news/market displays,
Pixel, shop plaques, repository/career plaques and orbital resume have tested
face normals, casing clearance and shared updates. Text is not mirrored on the
rear. Existing carved wooden signs retain their two-sided implementation.

## Preserved Boundaries

The GitHub reader, curated resume and LinkedIn profile links, portfolio demos,
weather and news provenance, speaking portrait, optional delivery loop, saved
visits, sound gating, camera collision and original transit controls remain.
No Git actions, deployments, credentials, or account-permission changes were
performed for this pass. Existing concurrent work was retained.

## Review Commands

```sh
node --test --test-concurrency=4 tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-authored-world.cjs --views=arrival,harbor,archive,foundry,garden,observatory
node scripts/check-authored-world.cjs --views=ai-research,project-foundry,skills-technology
node scripts/check-authored-world.cjs --mobile --views=arrival,harbor,workshop,commons
```

Browser checks use isolated local storage and denied geolocation. The script
defers development-only hot reloads while recording one loaded source snapshot.
Captures are actual WebGL frames with the interface, not synthetic renders.
They live under `outputs/playtest/authored-world/`. Physical-device FPS and
long-session thermal behavior cannot be inferred from software-rendered Edge
screenshots; render-budget observations must remain distinct from FPS claims.
