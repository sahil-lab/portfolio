# Sahil's Digital Capital: Master City Plan

## Existing World Contract

- Keep the original Three.js scene, renderer, player, planets, transit, multiplayer games, resume books, weather data, and authored landmarks.
- Local coordinates are shared by movement, buildings, and collisions; the scene applies a final 2x scale. The motherboard extends from x=-550..550 and z=-1241..1399.
- Preserve the Bootloader Atelier at (0,19), Commons at (0,98), game stations along z=152..225, Lantern Quarter at (150,79), the gold statue, and the five authored outer districts.
- Preserve the unique architectural family of every planet. Each generated building has a deterministic address-specific massing, roof, entrance, and detail recipe. Do not replace the worlds with a second scene.
- Portfolio facts come from the current three-page resume distributed under public/assets/resume-book, not the older resume-data record.

## Connected Journey

The capital's principal sequence is **Atelier / Lantern Quarter -> Sahil Plaza -> shopping promenade -> Play Garden -> Willow Park -> waterfront -> observation terrace**. Existing streets and pedestrian crossings connect this sequence to the school, library, market, clinic, cinema, and sports court. The metro and crew ship connect the city to the actual planets.

| Location | Local Center | Purpose and Composition |
| --- | --- | --- |
| Sahil Plaza | (52,180) | Clear portfolio identity, tiered digital fountain, patterned paving, seating steps, project garden, information and resume access. |
| Willow Park | (-50,279) | Curved paths, planted edges, fountain and canal promenade, quiet seating and lookout. |
| Play Garden | (50,279) | Ribbon-cable slide, circuit-frame swings, processor-pin climbing, sandbox and believable play routines. |
| Lantern Shopping Arcade | (150,279) | Open ground-level atrium, distinctive shop wings, glass canopy, upper terraces, cafe seating and warm shop windows. |
| Weekend Market | (-150,179) | Human-scaled stalls, produce and digital craft, crates, awnings, a vendor routine. |
| Picture House | (250,279) | Original procedural short-film display, marquee, ticket booth, seats and arriving visitors. |
| Community Clinic | (250,179) | Reception, waiting seats, civic identity and calm courtyard. |
| Neighborhood School | (-150,79) | Learning court, bell, play markings, shaded seating. |
| Knowledge Repository | (-150,-21) | Reading garden, bookcases, current resume and technology discovery. |
| Sports Court | (50,379) | Court markings, hoop structures, recreation, spectator seating. |

All new sites occupy clear courtyard or protected open space. Existing home footprints, transit approaches, museum/project entrances and multiplayer stations are exclusion areas. New paths must be checked against actual collision geometry, not only a diagram.

## Visual Language

Ceramic and stone building masses, framed glazing, fine dark railings, selective brass hardware, timber joinery, integrated planting and warm light. Computing appears in structure: circuit channels, ribbon paths, pin-frame play equipment, memory-stack libraries, packet transport, and quiet data pulses. No random neon or unrelated prop scatter.

Use foreground planting and street furniture, midground residents and active public spaces, and existing architecture/planets as skyline layers. Each major destination needs a composed approach and an attractive departure view. Repeated components may be instanced; complete buildings must not be identical copies.

## Implementation Order

1. **Foundation:** establish the connected plaza/promenade layout, collision-safe approaches, distinct streetscape kits, planted edges and district lighting. Reuse current roads, bounds, ramps, batching and quality settings.
2. **Hero locations:** build the central fountain and Sahil centerpiece, upgrade parks, the open shopping atrium and waterfront/observation sequence. Keep actual structures walkable where supported by the existing controller.
3. **Human life:** add a bounded set of purposeful resident routines: reading, talking, cafe work, market service, play and maintenance. Finish everyday furniture, shop fronts and recreation.
4. **Portfolio and atmosphere:** link the plaza/library/garden to the latest resume and projects; add restrained water choreography, window/street lighting, weather response and optional visual day/sunset/night cycling without falsifying live weather data.

## Technical Budgets

- Reuse `facade-craft`, `building-craft`, `architecture-neighborhood`, `city-public-spaces`, `everyday-places`, transit and the existing weather/lighting owners.
- Merge static material groups and instance repeated furniture/vegetation. Keep nearby architectural details resident only near the visitor; preserve unique silhouettes at distance.
- Use emissive surfaces for most lamps and windows, not hundreds of real-time point lights. Keep the existing primary sun/shadow budget.
- Use fixed-size particles, animation arrays and resident counts. Distance-cull routine animation and freeze it under reduced motion or pause.
- Keep local data, generated captures and personal source material out of Git. No commit, push, service provisioning or new deployment without a new request.

## Verification

- Unit tests: unique architecture geometry, bounds, all-sided details, resident routine limits, fountain timing, lighting transitions, and clear public approaches.
- Integration checks: original scene/renderer/planet identities, player movement, actual stairs and elevated surfaces, transit/game access, and latest-resume links.
- Browser evidence: day, sunset and night; street, medium and overhead views; mobile and desktop. Check canvas pixels and framing, not only object existence.
- Evaluate the real visitor journey and acknowledge any remaining limitations. Do not claim the entire creative brief complete merely because every item has a named object.

## Implemented In This Pass

- The existing scene now opens at Sahil Plaza with a framed identity sign, current-resume access, project garden, tiered fountain, canal footbridge, and climbable observation terrace. First-time visitors start in Far view; saved camera preferences are preserved.
- Five continuous promenades connect the plaza to the park, playground, shopping arcade, market, and library. Wide forecourts transition to narrower venue entrances. Walking colliders remain local when camera bounds receive the world's 2x scale.
- Nine city venues provide parks, play equipment, shopping, market stalls, cinema, clinic, school, library, and sports. The motherboard mall has a usable staircase, upper galleries, and sky bridge. The cinema displays an original procedural short.
- All nine satellite planets retain their original geography and transit, with distinct architectural families and six surveyed public places each. Building recipes vary massing, proportions, roofs, entrances, stairs, and facade details by address; components and materials are shared deliberately.
- Fourteen capital residents have bounded reading, conversation, gardening, working, serving, playing, and maintenance routines. Fountain crown, conversation, and cascade patterns blend continuously; the royal cascade descends from the upper bowl into the lower basin.
- Day, sunset, night, and cycle controls affect the capital's visual atmosphere without changing the live weather reading. Windows, street lighting, and paving respond to night and wet conditions.
- Nearby facade detail is streamed by proximity. Regional skyline batches retain individual building silhouettes and reduce wide-plaza draw calls by about 800 compared with the first implementation. Civic collision indexing reduces the standalone plaza construction check from roughly 15 seconds to 1.5 seconds.

## Verification Evidence

- Focused tests cover actual geometric variation, four-sided details, material and triangle limits, camera framing, fountain continuity, resident motion, public entrances, world-scaled collisions, spherical movement, transit, and multiplayer regressions.
- The live-world promenade check sampled 3,272 positions over all five routes without missing ground or blocked walking positions.
- Both browser suites passed. [../scripts/check-capital.cjs](../scripts/check-capital.cjs) checks the real UI, current resume, first-visit framing, fountain animation, all nine city venues, upper-mall traversal, and observation stairs. [../scripts/check-architecture.cjs](../scripts/check-architecture.cjs) checks the original scene and planet identities, complete roof framing, nearby detail, and mesh visibility on all nine planets.
- Browser captures use local headless Edge at 1440x960 and an emulated 390x844 mobile viewport. Generated evidence is under `outputs/playtest/capital` and `outputs/playtest/architecture`; it is not a physical-device or production-performance certification.

## Remaining Limits

- The complete world still exceeds the 1,100-draw / 650,000-triangle target in wide views. A representative Low-quality plaza capture is approximately 2,850 draws and 1.41 million triangles. Existing detailed characters and landmarks remain intact; a broader asset/LOD performance pass is still required.
- Planetary mall galleries are modeled, but the spherical walking controller does not yet traverse their elevated floors. The motherboard mall, canal bridge, and observation terrace are traversable.
- Civic buildings and storefronts are interactive scenes, not complete interior simulations or transactional shops. Generated buildings share an architectural vocabulary; they are not individually authored interior environments.
- Location-specific audio, umbrellas and puddles, a larger waterfront, additional bridge/tunnel families, secret rooms, and longer resident stories remain follow-up work from the larger brief.
- New plaza portfolio links use the current distributed resume. Older standalone resume/project pages and career data have not been reconciled in this pass.
- Existing broader lint findings in the main page and legacy modules remain outside this change. No new deployment, commit, or push is included.
