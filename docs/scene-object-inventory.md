# App Object Inventory And Coverage

Source inventory: 2 October 2026. Object families are ordered from small details to complete worlds. Repeated placements are grouped; this is not a literal count of every generated bolt, paving stone, mesh or triangle. Streamed and conditional content is included in the inventory.

## Coverage Definitions

1. **Visual share:** percentage of sampled 3D canvas pixels occupied by a category. Camera, viewport and scene selection affect this number. It does not measure source code, modeling effort or physical ground area.
2. **World presence:** percentage of ten worlds in which a category is observed in the sampled loaded scenes. Categories overlap, so this column does not sum to 100%. Unsampled or unloaded content can make observed presence lower than actual presence.
3. **Instance share:** percentage of sampled renderable part-instance occurrences. Repeated instances count separately; a tree or vehicle can have several parts. Objects recurring in multiple snapshots count in each snapshot. This is not a unique artist-authored object census.

The measurement helper is [measure-scene-coverage.cjs](../scripts/measure-scene-coverage.cjs#L1). It uses an isolated browser, category-ID pixel rendering and test-only metadata in the shared batching function. Production scene builders are unchanged. Custom merged geometries outside that function remain combined objects; their lost part counts are not guessed. Mixed or unclassified geometry is reported explicitly.

Visual percentages give each world equal weight, then average its sampled views and desktop/mobile devices. Sky/background is included; HTML UI is excluded. Transparent surfaces use a binary alpha threshold in the ID pass, so this estimates category area rather than the full contribution of physically transmitted light. Counts exclude retained objects belonging to other worlds. Small hardware stays with its identifiable parent category.

## Measured Coverage

Completed local-development survey: **78 nonblank desktop/mobile samples across all ten worlds**. Motherboard has 12 destinations on two viewports; each satellite has station, signature-shop and orbital-overview views on two viewports. Desktop is 1440 x 960; mobile is a 390 x 844 browser viewport, not a physical-device test. Day lighting and reduced motion were used.

| Category | Visual share | Worlds observed | Sampled instance share |
| --- | ---: | ---: | ---: |
| Terrain and water | 18.8% | 10/10 (100%) | 0.9% |
| Roads, paths and paving | 13.7% | 10/10 (100%) | 17.7% |
| Trees, gardens and planting | 5.6% | 10/10 (100%) | 22.5% |
| Buildings and architectural parts | 3.0% | 10/10 (100%) | 7.2% |
| Shops and retail displays | 1.6% | 10/10 (100%) | 1.9% |
| Furniture, lamps and small props | 0.3% | 10/10 (100%) | 7.3% |
| Workshop machines and apparatus | 0.2% | 4/10 (40%) | 1.2% |
| Landmarks and monuments | 1.6% | 10/10 (100%) | 4.4% |
| Characters and living figures | 0.3% | 10/10 (100%) | 14.3% |
| Vehicles and transit | 2.2% | 10/10 (100%) | 2.9% |
| Signs, books and displays | 0.6% | 10/10 (100%) | 6.0% |
| Game installations | 0.2% | 1/10 (10%) | 0.6% |
| Sky and visual effects | 46.1% | 10/10 (100%) | 0.8% |
| Mixed or unclassified scenery | 5.8% | 10/10 (100%) | 12.2% |

Percentages are rounded. Visual and instance shares sum to approximately 100% independently; world presence does not. **These are sampled category measurements, not exact whole-site unique-object percentages.** Classification uses object names, parent groups and available batch metadata. Buildings, shops and landmarks are separate categories; their visible small parts can appear in furniture, planting, display or machinery categories instead.

The instance denominator is **620,411 part-instance occurrences across the 78 snapshots**, not 620,411 unique objects. Some custom meshes combine many source objects, and 12.2% of the sampled occurrences remain mixed/unclassified. The four observed machinery worlds are Motherboard, AI Research, Project Foundry and Skills / Technology; this is not a claim that no mechanical decoration exists elsewhere.

The 46.1% sky/effects share reflects these camera compositions, especially orbital views. It is not modeling work or evidence that almost half the app consists of sky meshes. Detailed props can occupy little screen area but still matter greatly in close views.

Raw measurements, per-view camera positions, loading states, classification gaps and methodology: [coverage.json](../outputs/scene-coverage/full/coverage.json). The same output folder contains the 78 screenshots. These are local generated artifacts and may be ignored by version control.

Reproduce with the local dev server running:

```powershell
node scripts/measure-scene-coverage.cjs --self-test
npm exec --yes --package=playwright -- node scripts/measure-scene-coverage.cjs --url=http://localhost:4332/ --output=outputs/scene-coverage/full
```

## Exact Catalog Presence

These figures describe where configured assets belong, not how much of a screenshot they occupy. A one-world landmark can still be visually dominant within that world.

| Configured asset family | Worlds | World presence |
| --- | --- | --- |
| Signature shops collectively | All ten | 100% |
| Each individual signature shop | Its one assigned world | 10% each |
| Motherboard Commons landmark shops | Motherboard | 10% |
| Original eight workshop districts | Motherboard | 10% |
| Six expanded Motherboard districts | Motherboard | 10% |
| Sahil Plaza and its capital complex | Motherboard | 10% |
| Folded Light Observatory complex | AI Research | 10% |
| Portfolio Assembly Works complex | Project Foundry | 10% |
| Dataflow Aqueduct Conservatory complex | Skills / Technology | 10% |
| The three specialized realm complexes collectively | Research, Foundry and Skills | 30% |
| GitHub/LinkedIn civilization sites collectively | Forge and Citadel | 20% |

Sources: [everyday-config.ts](../app/everyday-config.ts#L1), [creative-plaza.ts](../app/creative-plaza.ts#L1), [world-config.ts](../app/world-config.ts#L1), [city-districts.ts](../app/city-districts.ts#L1), [realm-layout.ts](../app/realm-layout.ts#L1), [civilization-config.ts](../app/civilization-config.ts#L1).

## Small Objects

| Family | Existing objects and components |
| --- | --- |
| Fasteners | Bolts, rivets, screw heads, timber pegs, door hinges, cabinet-pull fasteners, waterwheel bolts and porthole rivets. |
| Seals and joints | Gaskets, compression seals, recessed joints, shadow gaps, collars, sleeve grooves and foundation seals. |
| Metal trim | Brass inlays, copper bands, machined rims, ferrules, bezels, thresholds, edge strips and plate surrounds. |
| Instrument markings | Gauge graduations, needles, dial indices, frequency ticks, clock markings and circuit marks. |
| Electrical details | Contact pins, component leads, terminal pads, plated vias, traces, sockets, bus lines, coils and vents. |
| Decorative details | Sprinkles, pretzel salt, bread scoring, gift ribbons, shoe laces/eyelets, flower centers and labels. |
| Reading props | Books, open books, reference volumes, ledgers, pages, ribbons, folios and dispensed books. |
| Food and merchandise | Cups, mugs, bread, miniature pretzels, produce, ice-cream forms, vending drinks, gifts, toys, keyboards, tools and laboratory instruments. |
| Workshop supplies | Cable reels, winding, inspection chips, cartridges, sample trays, calibration tiles, armatures and insulators. |
| Deliveries | Diagnostic capsules, capsule sockets, tray inserts, parcels, crates, bands and straps. |
| Desk equipment | Monitors, stands, keyboards, laptop props, task lamps, prototype boards, modules and shelves. |
| Personal accessories | Backpacks, satchels, scarves, aprons, hats, spectacles, headsets, tool clips, towels and badges. |

Sources: [workshop-objects.ts](../app/workshop-objects.ts#L1), [press-craft.ts](../app/press-craft.ts#L1), [everyday-places.ts](../app/everyday-places.ts#L1), [capital-gallery.ts](../app/capital-gallery.ts#L1), [cute-resident.ts](../app/cute-resident.ts#L1).

## Landscape And Furniture

| Family | Existing objects and components |
| --- | --- |
| Ground planting | Artificial turf, lawns, curved terrain-following borders, planted islands, meadow flowers and pocket gardens. |
| Low planting | Rounded shrubs, sculpted shrubs, topiary, stems, blossoms, leaves and window boxes. |
| Planters | Ceramic/cast vessels, fitted rims, brass lips, grip recesses, soil, raised beds and garden kerbs. |
| Trees | Branching trunks, boughs, layered crowns, shade/blossom/columnar trees and planet-specific foliage. |
| Banyans | Large crowns, root columns, surface roots, hanging roots and root feet. |
| Special gardens | Cable-vine woodland, conservatory beds, neural topiary, roof gardens and planted tree courts. |
| Natural details | Rocks, river pebbles, stone edging, soil and planting foundations. |
| Seating | Benches, slats, backs, arms, feet, chairs, stools, reading seats, roof benches and pool loungers. |
| Tables | Cafe tables, pedestal tables, desks, workstations, counters and repair benches. |
| Shade | Parasols, striped umbrellas, pergolas and small canopies. |
| Utilities | Recycling/waste bins, lids, slots, tree grates, queue posts, guardrails and posts. |
| Lighting fixtures | Street/park/plaza lamps, masts, bases, brackets, lanterns, caps, crowns, pendants, cords, opal diffusers, cove lights and marquee bulbs. |
| Wayfinding | Carved signs, arrows, placards, enamel plaques, architectural wordmarks, housings and supports. |

Sources: [city-gardens.ts](../app/city-gardens.ts#L1), [astra-canopy.ts](../app/astra-canopy.ts#L1), [canopy-grove.ts](../app/canopy-grove.ts#L1), [civic-kit.ts](../app/civic-kit.ts#L1), [planet-canopy.ts](../app/planet-canopy.ts#L1).

## Infrastructure And Architecture

| Family | Existing objects and components |
| --- | --- |
| Roads | Main/side streets, scenic curved roads, graded shoulders, kerbs, dashes, crosswalks and markings. |
| Walks | Boulevards, promenades, paths, courtyard/radial paving, medallions, circuit rings, thresholds and aprons. |
| Circulation | Stairs, treads, landings, balusters, handrails, upper galleries, sky bridges and service lift. |
| Bridges | Footbridges, arch ribs, rails, aqueduct crossings, service bridges and network skyways. |
| Water structures | Canals, coping, channels, basins, pools, terraces, ladders, rivers and crossings. |
| Lower works | Sunken floors, exposed walls, copper strata, pipes, descending stairs and safety rails. |
| Board infrastructure | Substrate, seams, contacts, current channels, board ribs, etched buses and large circuit paths. |
| Building shells | Foundations, sculpted bodies, structural storeys, base courses, floor bands, setbacks and walls. |
| Entrances | Recesses, doors, panels, jambs, hinges, pulls, steps, porticos, thresholds and callboxes. |
| Windows | Frames, sills, mullions, glazing, clerestories, circular oculi and interior-image surfaces. |
| Balconies | Decks, handrails, return rails, posts, terraces, rooftop seating and planted roofs. |
| Roofs | Butterfly, barrel, swept tile, dome, folded, gable, sawtooth, sail and scalloped designs. |
| Roof equipment | Chimneys, cooling fins, monitors, solar mounts/panels, telescopes, hoists, gantries and dormers. |
| Structural craft | Crossbraces, piers, buttresses, exposed frames, ribs, masonry courses, trellises and beam joints. |

Ten architecture profiles: Atelier Terrace, Basalt Foundry, Garden Conservatory, Citadel Deco, Petal Garden House, Sun Court, Cloud Pavilion, Folded Observatory, Fired-Clay Workshop and Timber Guild Hall. Motherboard residences also have Terrace, Lantern and Workshop variants.

Sources: [building-craft.ts](../app/building-craft.ts#L1), [architecture-profiles.ts](../app/architecture-profiles.ts#L1), [city-architecture.ts](../app/city-architecture.ts#L1), [storybook-street.ts](../app/storybook-street.ts#L1), [planet-infrastructure.ts](../app/planet-infrastructure.ts#L1).

## Machines, Characters And Vehicles

| Family | Existing objects and components |
| --- | --- |
| Workshop assemblies | Fitted repair cabinet and drawers; open cable reels; articulated task lamp; parts shelves; inspection mat; service deck and worklight rail. |
| Packet Press | Body, chamber, columns, crown, vessel, coil, gauge, controls, lever, ram, tray, stock, indicators, return pipes and detailed hardware. |
| Machines | Processor cores, memory shelving, graphics display, packets, index vaults, service pods, conveyors, fans, cooling towers, cranes, trolleys, hooks, counterweights, waterwheels and optical instruments. |
| Curiosities | Musical capacitors, cooling-water baths, compiler kiln, crystal path and miniature cinema. |
| Main character | Courier face/visor/scarf, body, limbs, cuffs, boots, skate wheels, power pack and capsule tray. |
| Named companions | PIP; Mora the owl; Hue the chameleon; Lag the cloud; Miss the gopher; Ledger tortoises; Bit birds. |
| Human residents | Walkers, readers, gardeners, bakers, cafe visitors, maintenance workers and studio workers, with clothing and role accessories. |
| Imported figures | Companion dog, flying angel and suited Sahil monument. |
| Multiplayer figures | Remote courier avatars, ship crew, racers and podium winners. |
| Rovers/cars | Bodies, chassis, bumpers, seats, windscreens, mirrors, lights, tires, wheels and hubs. |
| Metro | Carriages, cabs, windows, roofs, lights, axles, wheels and couplers. |
| Rocket | Body, nose, bands, porthole, rivets, fins and exhaust. |
| Race cars | Comet GT, Vector S and Ion Coupe. |
| Crew starship | Exterior, thrusters, pad, cabin, consoles, windscreen frame and crew. |
| Other movement | Canal ferries, city traffic and tethered balloons with baskets, suspension, ropes and moorings. |

Sources: [courier.ts](../app/courier.ts#L1), [encounter-config.ts](../app/encounter-config.ts#L1), [living-world.ts](../app/living-world.ts#L1), [transit-models.ts](../app/transit-models.ts#L1), [friends-scene.ts](../app/friends-scene.ts#L1).

## Public Venues And Shops

| Venue family | Existing places or equipment |
| --- | --- |
| Parks/play | Willow Park; Play Garden; fountain, walking loop, tower, ladder, slide, swings, seesaw, sandbox and sand. |
| Mall/market | Lantern Shopping Arcade and Weekend Market; wings, atrium, galleries, bridge, storefronts, stalls, counters, awnings and produce. |
| Mall merchandise | Cafe, gifts, toys, books, repairs, keyboards, laboratory instruments and bakery displays. |
| Civic buildings | The Picture House, Community Clinic, Neighborhood School, Open Shelf Library and Community Sports Court. |
| Civic equipment | Cinema marquee/screen/ticket booth/queue posts; medical emblem; school bell/hopscotch; bookshelves; court lines, hoops, backboards and ball. |
| Pool courts | Basins, water, coping, terraces, loungers and ladders. |
| Commons | Copper Kettle building; Sole Studio sneaker building; Frequency House radio building; Paperback Dispenser; Citrus Circuit; Cloud Soft Serve. |

| Signature shop | World | Main sculpture |
| --- | --- | --- |
| Loop & Glaze | Motherboard | Donut, glaze and sprinkles. |
| Copper Crumb | Forge | Pretzel and salt; authored bakery/courtyard. |
| Scoop Cache | Cache Gardens | Cone and gelato scoops. |
| Paper & Steam | Citadel | Teapot, lid, handle and spout. |
| Petal Pantry | Petal Park | Tart, custard and fruit. |
| Sunrise Roastery | Solstice Springs | Coffee cup, sleeve and lid. |
| Nimbus Sugar Works | Cloud Nine | Cone and spun sugar. |
| Prism Optics | AI Research | Telescope and lens. |
| Fold & Fly | Project Foundry | Glider, wings and tailplane. |
| Ribbon & Reel | Skills / Technology | Kite, spars and ribbons. |

Shared shop components include bodies, roofs, doors, windows, shelves, awnings, product displays and sculpture supports. Copper Crumb additionally includes cabinetry, stone counters, oven/hearth, bread racks, bread, pendant lights, lettering, pavers, planted beds, trees, benches and crates. Its procedural version remains a loading/error fallback.

Sources: [everyday-config.ts](../app/everyday-config.ts#L1), [everyday-places.ts](../app/everyday-places.ts#L1), [signature-shops.ts](../app/signature-shops.ts#L1), [creative-plaza.ts](../app/creative-plaza.ts#L1), [02-detail.py](../assets/copper-bakery/02-detail.py#L1).

## Games And Landmarks

- Games: lobby console; chess table, squares and pieces; Sudoku console; table-tennis table/net/ball; target range; Linux PC desk/display/keyboard; race track/rails/gate; winners' podium; crew-starship dock.
- Capital: Sahil Plaza, radial paving, Circuit fountain, Project Pavilion, furnished studios, Project Garden, Canal Promenade and Observation Terrace.
- Fountain: foundation, basins, fluted column, finial support, finial, jets, ribbons, droplets, ripples and mist.
- Pavilion: piers, continuous vault, ribs, rear wall, acoustic fins, glazing, desks, chairs, shelves, lamps, screens and prototype electronics.
- Project studies: Agent handoff, Refinement loop, Memory lookup, Neighborhood search, Component state and Data lineage.
- Cultural objects: suited Sahil monument/podium, Weather Library and Gold Statue Library resume books, market/news boards, Kingdom Chronicle printer/display and portrait installation.
- Lantern Quarter: cafes, music hall, studio, florist, dispatch tower, signal clock and Lantern Arcade with suspended opal lanterns.
- Original exhibit buildings: Component Studio and Request Hall, with display nodes and connections. These are illustrative teaching examples, not claimed implementations of real project systems.

Sources: [friends-activities.ts](../app/friends-activities.ts#L1), [capital-world.ts](../app/capital-world.ts#L1), [capital-pavilion.ts](../app/capital-pavilion.ts#L1), [project-studies.ts](../app/project-studies.ts#L1), [portfolio.ts](../app/portfolio.ts#L1).

## Districts And Worlds

| Expanded Motherboard district | Landmark |
| --- | --- |
| Lantern Quarter | The Signal House. |
| Portside Exchange | The Connector Hall. |
| Memory Terraces | The Reading Aqueduct. |
| Copperworks | The Assembly Crane and lower works. |
| Cache Gardens Promenade | The Seed Library. |
| Clockwork Heights | The Orrery Terrace. |

Original districts: Bootloader Workshop, CPU Core Cities, RAM Library, GPU Rendering District, Network Railway, Database Vaults, Kubernetes Sky Clusters and Kafka Conveyor Railway. Large structures include Processor Cathedral, Memory Forest, Dream Foundry, router towers, index archives, floating pod houses, conveyors, chassis galleries, abyss gap, substrate ribs, cooling intakes and high cable runs.

Planetary assets include terrain, ridges, cliffs, terraces, mesas, forests, rivers, lagoons, settlements, gardens, outposts, stations, platforms, canopies, signs, metro rails, launch pads, resonators and local vehicles. Forge/Citadel add a data bridge, symbolic packets, orbital resume and civilization plaques.

| World | Special places |
| --- | --- |
| Motherboard Central | Home board, capital, original districts, expanded city and Commons. |
| GitHub - The Forge | Foundries, civilization displays and Copper Crumb. |
| Cache Gardens | Forest settlements and horizon outposts. |
| LinkedIn - The Citadel | Towers, water and professional-journey civilization. |
| Petal Park | Blossom canopies and garden villages. |
| Solstice Springs | Sunny terraces, rivers and courtyards. |
| Cloud Nine | Pearl domes and lagoons. |
| AI Research Planet | Folded Light Observatory / Neural Tile Atelier, Model Archive and Southern Lens Observatory. |
| Project Foundry Planet | Portfolio Assembly Works / Project Pattern Press, Portfolio Pattern Archive and Southern Counterweight Works. |
| Skills / Technology Planet | Dataflow Aqueduct Conservatory / Dataflow Gatehouse, Technology Seed Library and Southern Waterwheel Conservatory. |

Motherboard is the home board; the other nine worlds are spherical satellites. City districts are not extra planets. Cache Gardens the satellite and Cache Gardens Promenade the city district are distinct places.

Sources: [city-districts.ts](../app/city-districts.ts#L1), [world-config.ts](../app/world-config.ts#L1), [awe-world.ts](../app/awe-world.ts#L1), [transit-config.ts](../app/transit-config.ts#L1), [realm-layout.ts](../app/realm-layout.ts#L1).

## Effects And Nonmesh Content

- Sky, sun, moon, stars, clouds, haze, fog and local planetary atmosphere.
- Rain, snow, wet surfaces, shallow reflections, ripples, fountain mist, steam, exhaust, thruster glow, data dust and flow signals.
- Workshop mural, portrait, animated face, miniature cinema films and venue imagery.
- Weather, market/news, repository/chronicle, radio, game-score and educational display content.
- Paint/wood/metal/stone textures, interior atlases, lettering, HDR environment, baked contact/AO maps and postprocessing.
- HTML menus, HUD, prompts, subtitles, joystick, movement/camera controls, readers, panels, tuner and multiplayer interfaces are not Blender props and are excluded from 3D coverage.
- Colliders, animation rigs, gravity frames, navigation, streaming, audio, persistence and networking are functional systems, not visible decoration.

Live displays and effects need explicit export/runtime decisions; turning them into static textures or meshes can freeze their content or motion.

## Imported Models

| Asset | Role |
| --- | --- |
| [packet-press.glb](../public/assets/packet-press.glb) | Packet Press. |
| [sah-suited-figure.glb](../public/assets/sah-suited-figure.glb) | Suited monument figure. |
| [roaming-dog.glb](../public/assets/roaming-dog.glb) | Companion dog. |
| [anime-angel.glb](../public/assets/anime-angel.glb) | Flying angel. |
| [copper-bakery.glb](../public/assets/copper-bakery.glb) | Authored bakery/courtyard prototype with separate baked AO. |

The first four use the shared asset manifest; Copper Crumb currently has its own adapter. Most other scenery is procedural. An imported asset does not mean its entire surroundings were authored in Blender.
