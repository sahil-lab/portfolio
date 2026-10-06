# Code Complexity And Optimization Order

## Scope

Scanned 1045 Git-tracked or non-ignored project files at revision 1d3b8a8684de816c886dc829832559361e57b69a. Parsed 586 executable source files, including 132 Python files; 262 are application/server modules. This is an automated, full-file AST audit, not a claim that every file has been manually optimized.

Dependencies, build output, local environments, ignored photos and generated artifacts are excluded by Git ignore rules. Every included asset, document, stylesheet and configuration file is inventoried below without inventing a code complexity score.

## Ranking Method

Score = 5 x maximum function cyclomatic complexity + file decision count + 10 x maximum control nesting + 3 x min(20, local importers). Cyclomatic complexity starts at one per function/module and counts branches, loops, conditional expressions and short-circuit operators. Nested functions are measured separately. Python additionally counts comprehensions and match alternatives. This score is a transparent prioritization heuristic, not Big-O complexity, measured execution time or proof that a file needs rewriting.

## Application Optimization Order

All visuals, effects, content and behavior must be preserved. Start with the highest-ranked application module; follow its owning dependencies when the measured cost lives there. Test and benchmark each change before continuing. Rendering profiles, cold-start timing and frame-time percentiles determine whether an algorithmic change helps.

| Order | File | Score | Max CC | Decisions | Nesting | Local Importers |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | [app/world.ts](../app/world.ts) | 1558 | 177 | 557 | 11 | 2 |
| 2 | [app/page.tsx](../app/page.tsx) | 1076 | 159 | 221 | 6 | 0 |
| 3 | [app/everyday-places.ts](../app/everyday-places.ts) | 1007 | 127 | 224 | 13 | 6 |
| 4 | [server/friends-server.mjs](../server/friends-server.mjs) | 758 | 108 | 176 | 3 | 4 |
| 5 | [app/realm-world.ts](../app/realm-world.ts) | 743 | 101 | 159 | 7 | 3 |
| 6 | [app/building-craft.ts](../app/building-craft.ts) | 733 | 96 | 103 | 12 | 10 |
| 7 | [app/friends-hub.tsx](../app/friends-hub.tsx) | 679 | 92 | 176 | 4 | 1 |
| 8 | [app/city-district-world.ts](../app/city-district-world.ts) | 506 | 64 | 110 | 7 | 2 |
| 9 | [server/friends-games.mjs](../server/friends-games.mjs) | 457 | 57 | 133 | 3 | 3 |
| 10 | [app/signature-shops.ts](../app/signature-shops.ts) | 456 | 55 | 62 | 11 | 3 |
| 11 | [app/architecture-kit.ts](../app/architecture-kit.ts) | 453 | 47 | 107 | 9 | 7 |
| 12 | [app/city-architecture.ts](../app/city-architecture.ts) | 425 | 55 | 64 | 5 | 12 |
| 13 | [app/friends-activities.ts](../app/friends-activities.ts) | 415 | 38 | 123 | 9 | 4 |
| 14 | [app/street-life.ts](../app/street-life.ts) | 406 | 51 | 102 | 4 | 3 |
| 15 | [app/living-world.ts](../app/living-world.ts) | 401 | 42 | 132 | 5 | 3 |
| 16 | [app/city-expansion.ts](../app/city-expansion.ts) | 392 | 46 | 94 | 5 | 6 |
| 17 | [app/capital-world.ts](../app/capital-world.ts) | 390 | 46 | 108 | 4 | 4 |
| 18 | [app/city-landmarks.ts](../app/city-landmarks.ts) | 384 | 54 | 78 | 3 | 2 |
| 19 | [app/transit-world.ts](../app/transit-world.ts) | 376 | 23 | 167 | 7 | 8 |
| 20 | [app/planet-infrastructure.ts](../app/planet-infrastructure.ts) | 367 | 42 | 81 | 4 | 12 |
| 21 | [app/planet-canopy.ts](../app/planet-canopy.ts) | 364 | 49 | 80 | 3 | 3 |
| 22 | [app/workshop-details.ts](../app/workshop-details.ts) | 361 | 48 | 75 | 4 | 2 |
| 23 | [app/complete-scene-export.ts](../app/complete-scene-export.ts) | 358 | 40 | 92 | 6 | 2 |
| 24 | [app/creative-plaza.ts](../app/creative-plaza.ts) | 353 | 35 | 100 | 6 | 6 |
| 25 | [app/dog-rig.ts](../app/dog-rig.ts) | 313 | 33 | 72 | 7 | 2 |
| 26 | [app/transit-canopy.ts](../app/transit-canopy.ts) | 300 | 34 | 34 | 9 | 2 |
| 27 | [app/dog-wander.ts](../app/dog-wander.ts) | 299 | 32 | 80 | 5 | 3 |
| 28 | [app/courier.ts](../app/courier.ts) | 299 | 34 | 53 | 4 | 12 |
| 29 | [app/astra-lighting.ts](../app/astra-lighting.ts) | 295 | 39 | 38 | 5 | 4 |
| 30 | [app/street-birds.ts](../app/street-birds.ts) | 292 | 30 | 86 | 5 | 2 |
| 31 | [app/radio-tuner.tsx](../app/radio-tuner.tsx) | 286 | 33 | 78 | 4 | 1 |
| 32 | [app/capital-fountain.ts](../app/capital-fountain.ts) | 279 | 33 | 55 | 5 | 3 |
| 33 | [app/planet-public-spaces.ts](../app/planet-public-spaces.ts) | 268 | 33 | 41 | 5 | 4 |
| 34 | [app/friends-games-ui.tsx](../app/friends-games-ui.tsx) | 265 | 15 | 127 | 6 | 1 |
| 35 | [app/persistence.ts](../app/persistence.ts) | 261 | 29 | 46 | 1 | 21 |
| 36 | [app/angel-controls.tsx](../app/angel-controls.tsx) | 256 | 31 | 48 | 5 | 1 |
| 37 | [app/game-camera.ts](../app/game-camera.ts) | 254 | 28 | 55 | 2 | 13 |
| 38 | [app/facade-craft.ts](../app/facade-craft.ts) | 245 | 30 | 49 | 4 | 2 |
| 39 | [app/weather-state.ts](../app/weather-state.ts) | 242 | 21 | 63 | 2 | 18 |
| 40 | [app/weather-sky.ts](../app/weather-sky.ts) | 240 | 24 | 55 | 5 | 5 |
| 41 | [app/planet-streaming.ts](../app/planet-streaming.ts) | 239 | 26 | 80 | 2 | 3 |
| 42 | [app/simulation.ts](../app/simulation.ts) | 233 | 26 | 48 | 4 | 5 |
| 43 | [app/civilization-world.ts](../app/civilization-world.ts) | 226 | 22 | 58 | 4 | 6 |
| 44 | [app/project-page-previews.ts](../app/project-page-previews.ts) | 225 | 24 | 59 | 4 | 2 |
| 45 | [app/static-batching.ts](../app/static-batching.ts) | 225 | 17 | 40 | 4 | 34 |
| 46 | [app/window-interiors.ts](../app/window-interiors.ts) | 224 | 23 | 24 | 7 | 5 |
| 47 | [app/flying-angel.ts](../app/flying-angel.ts) | 222 | 21 | 81 | 3 | 2 |
| 48 | [app/neighborhood.ts](../app/neighborhood.ts) | 219 | 22 | 64 | 3 | 5 |
| 49 | [app/capital-life.ts](../app/capital-life.ts) | 219 | 24 | 43 | 5 | 2 |
| 50 | [app/walking-route.ts](../app/walking-route.ts) | 219 | 24 | 42 | 3 | 9 |
| 51 | [app/bulletin-data.ts](../app/bulletin-data.ts) | 216 | 21 | 70 | 2 | 7 |
| 52 | [app/panels.tsx](../app/panels.tsx) | 208 | 28 | 45 | 2 | 1 |
| 53 | [app/awe-world.ts](../app/awe-world.ts) | 203 | 25 | 42 | 3 | 2 |
| 54 | [app/city-gardens.ts](../app/city-gardens.ts) | 202 | 22 | 35 | 3 | 9 |
| 55 | [app/angel-gait.ts](../app/angel-gait.ts) | 201 | 26 | 28 | 4 | 1 |
| 56 | [app/angel-flight.ts](../app/angel-flight.ts) | 200 | 20 | 42 | 4 | 6 |
| 57 | [app/planet-lighting.ts](../app/planet-lighting.ts) | 197 | 28 | 28 | 2 | 3 |
| 58 | [app/forge-feed.ts](../app/forge-feed.ts) | 196 | 21 | 43 | 3 | 6 |
| 59 | [app/kingdom-art.ts](../app/kingdom-art.ts) | 195 | 20 | 37 | 4 | 6 |
| 60 | [app/traversal.ts](../app/traversal.ts) | 194 | 15 | 42 | 5 | 9 |
| 61 | [app/angel-ground.ts](../app/angel-ground.ts) | 191 | 19 | 51 | 3 | 5 |
| 62 | [app/angel-locomotion.ts](../app/angel-locomotion.ts) | 186 | 18 | 40 | 5 | 2 |
| 63 | [app/craft-kit.ts](../app/craft-kit.ts) | 185 | 16 | 36 | 3 | 13 |
| 64 | [app/bulletin-world.ts](../app/bulletin-world.ts) | 183 | 15 | 66 | 3 | 4 |
| 65 | [app/complete-world-export.ts](../app/complete-world-export.ts) | 180 | 19 | 42 | 4 | 1 |
| 66 | [app/press-craft.ts](../app/press-craft.ts) | 180 | 17 | 39 | 5 | 2 |
| 67 | [app/friends-computer.tsx](../app/friends-computer.tsx) | 179 | 19 | 51 | 3 | 1 |
| 68 | [app/planet-population.ts](../app/planet-population.ts) | 179 | 19 | 45 | 3 | 3 |
| 69 | [app/bulletin-feed.ts](../app/bulletin-feed.ts) | 178 | 16 | 72 | 2 | 2 |
| 70 | [app/copper-bakery.ts](../app/copper-bakery.ts) | 178 | 14 | 42 | 6 | 2 |
| 71 | [app/resident-instances.ts](../app/resident-instances.ts) | 178 | 16 | 40 | 4 | 6 |
| 72 | [app/cute-resident.ts](../app/cute-resident.ts) | 177 | 14 | 38 | 3 | 13 |
| 73 | [app/project-world.ts](../app/project-world.ts) | 176 | 17 | 52 | 3 | 3 |
| 74 | [app/angel-rig.ts](../app/angel-rig.ts) | 176 | 16 | 40 | 5 | 2 |
| 75 | [app/transit-panel.tsx](../app/transit-panel.tsx) | 176 | 21 | 28 | 4 | 1 |
| 76 | [app/world-scenery.ts](../app/world-scenery.ts) | 173 | 22 | 34 | 2 | 3 |
| 77 | [app/architecture-neighborhood.ts](../app/architecture-neighborhood.ts) | 172 | 17 | 46 | 2 | 7 |
| 78 | [app/street-performers.ts](../app/street-performers.ts) | 170 | 16 | 34 | 5 | 2 |
| 79 | [app/dog-gait.ts](../app/dog-gait.ts) | 170 | 22 | 24 | 3 | 2 |
| 80 | [app/transit-models.ts](../app/transit-models.ts) | 169 | 16 | 34 | 4 | 5 |
| 81 | [app/crafted-surfaces.ts](../app/crafted-surfaces.ts) | 169 | 9 | 24 | 4 | 24 |
| 82 | [app/radio-data.ts](../app/radio-data.ts) | 168 | 18 | 43 | 2 | 5 |
| 83 | [app/weather-world.ts](../app/weather-world.ts) | 166 | 17 | 39 | 3 | 4 |
| 84 | [app/scene-resources.ts](../app/scene-resources.ts) | 166 | 10 | 16 | 4 | 86 |
| 85 | [app/friends-voice.ts](../app/friends-voice.ts) | 165 | 15 | 47 | 4 | 1 |
| 86 | [app/friends-client.ts](../app/friends-client.ts) | 165 | 15 | 39 | 3 | 7 |
| 87 | [components/ui/chart.tsx](../components/ui/chart.tsx) | 164 | 18 | 54 | 2 | 0 |
| 88 | [app/district-machines.ts](../app/district-machines.ts) | 162 | 17 | 41 | 3 | 2 |
| 89 | [app/world-lighting.ts](../app/world-lighting.ts) | 162 | 11 | 34 | 4 | 11 |
| 90 | [app/capital-gallery.ts](../app/capital-gallery.ts) | 162 | 17 | 18 | 5 | 3 |
| 91 | [app/authored-terrain.ts](../app/authored-terrain.ts) | 158 | 15 | 31 | 4 | 4 |
| 92 | [app/painting-ai.ts](../app/painting-ai.ts) | 157 | 11 | 37 | 5 | 5 |
| 93 | [app/astra-canopy.ts](../app/astra-canopy.ts) | 156 | 17 | 29 | 3 | 4 |
| 94 | [app/canopy-grove.ts](../app/canopy-grove.ts) | 155 | 12 | 41 | 3 | 8 |
| 95 | [app/speech-bubble.ts](../app/speech-bubble.ts) | 148 | 14 | 29 | 4 | 3 |
| 96 | [app/project-installations.ts](../app/project-installations.ts) | 147 | 10 | 38 | 5 | 3 |
| 97 | [app/lantern-arcade.ts](../app/lantern-arcade.ts) | 147 | 17 | 16 | 4 | 2 |
| 98 | [app/signature-shop-asset.ts](../app/signature-shop-asset.ts) | 146 | 13 | 45 | 3 | 2 |
| 99 | [app/world-kit.ts](../app/world-kit.ts) | 140 | 10 | 40 | 2 | 10 |
| 100 | [app/character-controller.ts](../app/character-controller.ts) | 140 | 16 | 18 | 3 | 4 |
| 101 | [app/wooden-sign.ts](../app/wooden-sign.ts) | 138 | 11 | 26 | 3 | 9 |
| 102 | [app/capital-pavilion.ts](../app/capital-pavilion.ts) | 138 | 16 | 19 | 3 | 3 |
| 103 | [app/radio-player.ts](../app/radio-player.ts) | 136 | 15 | 35 | 2 | 2 |
| 104 | [app/architecture-profiles.ts](../app/architecture-profiles.ts) | 135 | 7 | 8 | 5 | 14 |
| 105 | [app/planet-surface.ts](../app/planet-surface.ts) | 134 | 12 | 36 | 2 | 6 |
| 106 | [app/kingdom-audio.ts](../app/kingdom-audio.ts) | 131 | 13 | 37 | 2 | 3 |
| 107 | [app/civic-kit.ts](../app/civic-kit.ts) | 130 | 8 | 43 | 2 | 9 |
| 108 | [app/packet-press-asset.ts](../app/packet-press-asset.ts) | 128 | 11 | 34 | 3 | 3 |
| 109 | [app/workshop-neighborhood.ts](../app/workshop-neighborhood.ts) | 128 | 12 | 29 | 3 | 3 |
| 110 | [app/roaming-dog.ts](../app/roaming-dog.ts) | 126 | 11 | 35 | 3 | 2 |
| 111 | [app/astra-moments.ts](../app/astra-moments.ts) | 126 | 13 | 25 | 3 | 2 |
| 112 | [server/friends-relay.mjs](../server/friends-relay.mjs) | 125 | 12 | 42 | 2 | 1 |
| 113 | [app/portrait-speaker.ts](../app/portrait-speaker.ts) | 125 | 10 | 30 | 3 | 5 |
| 114 | [app/planet-geography.ts](../app/planet-geography.ts) | 124 | 6 | 14 | 2 | 31 |
| 115 | [lib/bulletin-feeds.ts](../lib/bulletin-feeds.ts) | 123 | 9 | 39 | 3 | 3 |
| 116 | [lib/radio-directory.ts](../lib/radio-directory.ts) | 122 | 11 | 31 | 3 | 2 |
| 117 | [app/spatial-index.ts](../app/spatial-index.ts) | 120 | 9 | 14 | 4 | 7 |
| 118 | [app/everyday-config.ts](../app/everyday-config.ts) | 116 | 11 | 11 | 2 | 10 |
| 119 | [app/painting-speech.ts](../app/painting-speech.ts) | 115 | 8 | 39 | 3 | 2 |
| 120 | [app/planet-biomes.ts](../app/planet-biomes.ts) | 115 | 9 | 12 | 4 | 6 |
| 121 | [app/shop-architecture.ts](../app/shop-architecture.ts) | 114 | 11 | 13 | 4 | 2 |
| 122 | [app/game-input.ts](../app/game-input.ts) | 113 | 11 | 32 | 2 | 2 |
| 123 | [app/paving-material.ts](../app/paving-material.ts) | 113 | 14 | 14 | 2 | 3 |
| 124 | [app/static-transforms.ts](../app/static-transforms.ts) | 113 | 10 | 14 | 1 | 13 |
| 125 | [app/planet-composition.ts](../app/planet-composition.ts) | 112 | 14 | 13 | 2 | 3 |
| 126 | [app/transit-config.ts](../app/transit-config.ts) | 112 | 6 | 12 | 1 | 52 |
| 127 | [app/kingdom-chronicle.ts](../app/kingdom-chronicle.ts) | 110 | 11 | 16 | 3 | 3 |
| 128 | [app/transit-motion.ts](../app/transit-motion.ts) | 109 | 9 | 26 | 2 | 6 |
| 129 | [app/ground-occlusion.ts](../app/ground-occlusion.ts) | 108 | 7 | 12 | 4 | 7 |
| 130 | [app/friends-world.ts](../app/friends-world.ts) | 106 | 12 | 20 | 2 | 2 |
| 131 | [app/premium-materials.ts](../app/premium-materials.ts) | 105 | 8 | 20 | 3 | 5 |
| 132 | [app/workshop-lighting.ts](../app/workshop-lighting.ts) | 103 | 9 | 22 | 3 | 2 |
| 133 | [app/storybook-street.ts](../app/storybook-street.ts) | 102 | 9 | 28 | 2 | 3 |
| 134 | [app/life-kit.ts](../app/life-kit.ts) | 102 | 9 | 22 | 2 | 5 |
| 135 | [app/painting-interaction.ts](../app/painting-interaction.ts) | 101 | 8 | 35 | 2 | 2 |
| 136 | [app/gold-monument.ts](../app/gold-monument.ts) | 99 | 7 | 28 | 3 | 2 |
| 137 | [app/resume-book.ts](../app/resume-book.ts) | 96 | 6 | 37 | 2 | 3 |
| 138 | [app/quality-tiers.ts](../app/quality-tiers.ts) | 96 | 9 | 16 | 2 | 5 |
| 139 | [app/project-study-controls.tsx](../app/project-study-controls.tsx) | 96 | 12 | 13 | 2 | 1 |
| 140 | [app/project-bulletins.ts](../app/project-bulletins.ts) | 95 | 7 | 31 | 2 | 3 |
| 141 | [app/friends-scene.ts](../app/friends-scene.ts) | 95 | 10 | 16 | 2 | 3 |
| 142 | [app/kingdom-voices.ts](../app/kingdom-voices.ts) | 95 | 10 | 12 | 3 | 1 |
| 143 | [app/work-scheduler.ts](../app/work-scheduler.ts) | 93 | 8 | 18 | 2 | 5 |
| 144 | [app/asset-manager.ts](../app/asset-manager.ts) | 91 | 8 | 19 | 2 | 4 |
| 145 | [app/visible-geometry.ts](../app/visible-geometry.ts) | 91 | 10 | 15 | 2 | 2 |
| 146 | [app/painting-conversation.ts](../app/painting-conversation.ts) | 91 | 10 | 12 | 2 | 3 |
| 147 | [app/world-assets.ts](../app/world-assets.ts) | 91 | 9 | 10 | 3 | 2 |
| 148 | [app/atmosphere-blend.ts](../app/atmosphere-blend.ts) | 90 | 8 | 14 | 3 | 2 |
| 149 | [app/delivery-state.ts](../app/delivery-state.ts) | 89 | 8 | 15 | 1 | 8 |
| 150 | [app/realm-layout.ts](../app/realm-layout.ts) | 87 | 5 | 8 | 3 | 8 |
| 151 | [app/audio-score.ts](../app/audio-score.ts) | 84 | 10 | 12 | 1 | 4 |
| 152 | [app/realm-demos.ts](../app/realm-demos.ts) | 81 | 6 | 19 | 2 | 4 |
| 153 | [app/exhibit-view.tsx](../app/exhibit-view.tsx) | 80 | 8 | 11 | 2 | 3 |
| 154 | [app/readable-display.ts](../app/readable-display.ts) | 79 | 3 | 3 | 1 | 17 |
| 155 | [app/astra-atmosphere.ts](../app/astra-atmosphere.ts) | 77 | 8 | 11 | 2 | 2 |
| 156 | [app/city-public-spaces.ts](../app/city-public-spaces.ts) | 76 | 5 | 19 | 2 | 4 |
| 157 | [app/city-districts.ts](../app/city-districts.ts) | 75 | 4 | 8 | 2 | 9 |
| 158 | [app/resume-book-reader.tsx](../app/resume-book-reader.tsx) | 74 | 8 | 11 | 2 | 1 |
| 159 | [server/friends-store.mjs](../server/friends-store.mjs) | 73 | 6 | 7 | 3 | 2 |
| 160 | [components/ui/sidebar.tsx](../components/ui/sidebar.tsx) | 72 | 8 | 22 | 1 | 0 |
| 161 | [app/exhibit-state.ts](../app/exhibit-state.ts) | 72 | 5 | 10 | 1 | 9 |
| 162 | [app/workshop-objects.ts](../app/workshop-objects.ts) | 71 | 6 | 15 | 2 | 2 |
| 163 | [app/astra-geology.ts](../app/astra-geology.ts) | 67 | 5 | 7 | 2 | 5 |
| 164 | [app/planet-movement.ts](../app/planet-movement.ts) | 65 | 5 | 4 | 3 | 2 |
| 165 | [app/world-config.ts](../app/world-config.ts) | 65 | 1 | 0 | 0 | 23 |
| 166 | [lib/utils.ts](../lib/utils.ts) | 65 | 1 | 0 | 0 | 58 |
| 167 | [app/civilization-observation.tsx](../app/civilization-observation.tsx) | 64 | 7 | 6 | 2 | 1 |
| 168 | [app/kettle-steam.ts](../app/kettle-steam.ts) | 63 | 6 | 7 | 2 | 2 |
| 169 | [app/exhibit-canopy.ts](../app/exhibit-canopy.ts) | 62 | 6 | 6 | 2 | 2 |
| 170 | [app/civilization-config.ts](../app/civilization-config.ts) | 61 | 3 | 2 | 2 | 8 |
| 171 | [app/collision-world.ts](../app/collision-world.ts) | 60 | 6 | 11 | 1 | 3 |
| 172 | [app/resident-dialogue.ts](../app/resident-dialogue.ts) | 58 | 4 | 3 | 2 | 5 |
| 173 | [app/civilization-link.ts](../app/civilization-link.ts) | 56 | 5 | 5 | 2 | 2 |
| 174 | [app/lighting-rig.ts](../app/lighting-rig.ts) | 55 | 5 | 4 | 2 | 2 |
| 175 | [components/ui/carousel.tsx](../components/ui/carousel.tsx) | 54 | 4 | 14 | 2 | 0 |
| 176 | [app/radio-location.ts](../app/radio-location.ts) | 54 | 4 | 8 | 2 | 2 |
| 177 | [components/ui/drawer.tsx](../components/ui/drawer.tsx) | 53 | 7 | 8 | 1 | 0 |
| 178 | [app/astra-rain.ts](../app/astra-rain.ts) | 53 | 4 | 7 | 2 | 2 |
| 179 | [components/ui/toast.tsx](../components/ui/toast.tsx) | 52 | 7 | 7 | 1 | 0 |
| 180 | [app/planet-rotation.ts](../app/planet-rotation.ts) | 49 | 5 | 5 | 1 | 3 |
| 181 | [lib/orbit-course.ts](../lib/orbit-course.ts) | 49 | 3 | 3 | 1 | 7 |
| 182 | [app/api/radio/stations/route.ts](../app/api/radio/stations/route.ts) | 48 | 6 | 5 | 1 | 1 |
| 183 | [app/interactions.ts](../app/interactions.ts) | 46 | 4 | 3 | 2 | 1 |
| 184 | [app/touch-controls.tsx](../app/touch-controls.tsx) | 44 | 4 | 11 | 1 | 1 |
| 185 | [app/performance-budget.ts](../app/performance-budget.ts) | 43 | 5 | 5 | 1 | 1 |
| 186 | [app/shader-preparation.ts](../app/shader-preparation.ts) | 41 | 4 | 5 | 1 | 2 |
| 187 | [app/portfolio.ts](../app/portfolio.ts) | 41 | 1 | 0 | 0 | 12 |
| 188 | [components/ui/button.tsx](../components/ui/button.tsx) | 41 | 1 | 0 | 0 | 12 |
| 189 | [components/ui/calendar.tsx](../components/ui/calendar.tsx) | 38 | 4 | 8 | 1 | 0 |
| 190 | [lib/friends-protocol.ts](../lib/friends-protocol.ts) | 38 | 1 | 0 | 0 | 11 |
| 191 | [app/comfort-settings.tsx](../app/comfort-settings.tsx) | 37 | 4 | 4 | 1 | 1 |
| 192 | [components/ui/slider.tsx](../components/ui/slider.tsx) | 37 | 3 | 2 | 2 | 0 |
| 193 | [components/ui/field.tsx](../components/ui/field.tsx) | 36 | 4 | 6 | 1 | 0 |
| 194 | [app/kingdom-presentation.ts](../app/kingdom-presentation.ts) | 36 | 3 | 5 | 1 | 2 |
| 195 | [app/project-studies.ts](../app/project-studies.ts) | 36 | 3 | 2 | 1 | 3 |
| 196 | [components/ui/message-scroller.tsx](../components/ui/message-scroller.tsx) | 33 | 4 | 3 | 1 | 0 |
| 197 | [app/transit-visibility.ts](../app/transit-visibility.ts) | 31 | 2 | 2 | 1 | 3 |
| 198 | [components/ui/toggle-group.tsx](../components/ui/toggle-group.tsx) | 29 | 5 | 4 | 0 | 0 |
| 199 | [components/ui/attachment.tsx](../components/ui/attachment.tsx) | 28 | 3 | 3 | 1 | 0 |
| 200 | [components/ui/pagination.tsx](../components/ui/pagination.tsx) | 27 | 3 | 2 | 1 | 0 |
| 201 | [app/limb-ik.ts](../app/limb-ik.ts) | 27 | 2 | 1 | 1 | 2 |
| 202 | [components/ui/input-group.tsx](../components/ui/input-group.tsx) | 27 | 2 | 1 | 1 | 2 |
| 203 | [app/hud-category.tsx](../app/hud-category.tsx) | 25 | 2 | 2 | 1 | 1 |
| 204 | [components/ui/sheet.tsx](../components/ui/sheet.tsx) | 23 | 2 | 1 | 0 | 4 |
| 205 | [app/asset-manifest.ts](../app/asset-manifest.ts) | 23 | 1 | 0 | 0 | 6 |
| 206 | [components/ui/dialog.tsx](../components/ui/dialog.tsx) | 21 | 2 | 2 | 0 | 3 |
| 207 | [app/play/page.tsx](../app/play/page.tsx) | 21 | 2 | 1 | 1 | 0 |
| 208 | [app/gold-monument-site.ts](../app/gold-monument-site.ts) | 20 | 1 | 0 | 0 | 5 |
| 209 | [components/ui/combobox.tsx](../components/ui/combobox.tsx) | 18 | 3 | 3 | 0 | 0 |
| 210 | [components/ui/input-otp.tsx](../components/ui/input-otp.tsx) | 17 | 3 | 2 | 0 | 0 |
| 211 | [app/resume-content.tsx](../app/resume-content.tsx) | 17 | 2 | 1 | 0 | 2 |
| 212 | [app/encounter-config.ts](../app/encounter-config.ts) | 17 | 1 | 0 | 0 | 4 |
| 213 | [components/ui/separator.tsx](../components/ui/separator.tsx) | 17 | 1 | 0 | 0 | 4 |
| 214 | [components/ui/breadcrumb.tsx](../components/ui/breadcrumb.tsx) | 11 | 2 | 1 | 0 | 0 |
| 215 | [components/ui/resizable.tsx](../components/ui/resizable.tsx) | 11 | 2 | 1 | 0 | 0 |
| 216 | [app/transit-state.ts](../app/transit-state.ts) | 11 | 1 | 0 | 0 | 2 |
| 217 | [components/ui/input.tsx](../components/ui/input.tsx) | 11 | 1 | 0 | 0 | 2 |
| 218 | [app/city-district-menu.tsx](../app/city-district-menu.tsx) | 8 | 1 | 0 | 0 | 1 |
| 219 | [components/ui/dropdown-menu.tsx](../components/ui/dropdown-menu.tsx) | 8 | 1 | 0 | 0 | 1 |
| 220 | [components/ui/label.tsx](../components/ui/label.tsx) | 8 | 1 | 0 | 0 | 1 |
| 221 | [components/ui/popover.tsx](../components/ui/popover.tsx) | 8 | 1 | 0 | 0 | 1 |
| 222 | [components/ui/skeleton.tsx](../components/ui/skeleton.tsx) | 8 | 1 | 0 | 0 | 1 |
| 223 | [components/ui/tabs.tsx](../components/ui/tabs.tsx) | 8 | 1 | 0 | 0 | 1 |
| 224 | [components/ui/textarea.tsx](../components/ui/textarea.tsx) | 8 | 1 | 0 | 0 | 1 |
| 225 | [components/ui/toggle.tsx](../components/ui/toggle.tsx) | 8 | 1 | 0 | 0 | 1 |
| 226 | [components/ui/tooltip.tsx](../components/ui/tooltip.tsx) | 8 | 1 | 0 | 0 | 1 |
| 227 | [hooks/use-mobile.ts](../hooks/use-mobile.ts) | 8 | 1 | 0 | 0 | 1 |
| 228 | [app/api/bulletins/markets/route.ts](../app/api/bulletins/markets/route.ts) | 5 | 1 | 0 | 0 | 0 |
| 229 | [app/api/bulletins/news/route.ts](../app/api/bulletins/news/route.ts) | 5 | 1 | 0 | 0 | 0 |
| 230 | [app/layout.tsx](../app/layout.tsx) | 5 | 1 | 0 | 0 | 0 |
| 231 | [app/projects/page.tsx](../app/projects/page.tsx) | 5 | 1 | 0 | 0 | 0 |
| 232 | [app/resume/page.tsx](../app/resume/page.tsx) | 5 | 1 | 0 | 0 | 0 |
| 233 | [components/ui/accordion.tsx](../components/ui/accordion.tsx) | 5 | 1 | 0 | 0 | 0 |
| 234 | [components/ui/alert-dialog.tsx](../components/ui/alert-dialog.tsx) | 5 | 1 | 0 | 0 | 0 |
| 235 | [components/ui/alert.tsx](../components/ui/alert.tsx) | 5 | 1 | 0 | 0 | 0 |
| 236 | [components/ui/aspect-ratio.tsx](../components/ui/aspect-ratio.tsx) | 5 | 1 | 0 | 0 | 0 |
| 237 | [components/ui/avatar.tsx](../components/ui/avatar.tsx) | 5 | 1 | 0 | 0 | 0 |
| 238 | [components/ui/badge.tsx](../components/ui/badge.tsx) | 5 | 1 | 0 | 0 | 0 |
| 239 | [components/ui/bubble.tsx](../components/ui/bubble.tsx) | 5 | 1 | 0 | 0 | 0 |
| 240 | [components/ui/button-group.tsx](../components/ui/button-group.tsx) | 5 | 1 | 0 | 0 | 0 |
| 241 | [components/ui/card.tsx](../components/ui/card.tsx) | 5 | 1 | 0 | 0 | 0 |
| 242 | [components/ui/checkbox.tsx](../components/ui/checkbox.tsx) | 5 | 1 | 0 | 0 | 0 |
| 243 | [components/ui/collapsible.tsx](../components/ui/collapsible.tsx) | 5 | 1 | 0 | 0 | 0 |
| 244 | [components/ui/command.tsx](../components/ui/command.tsx) | 5 | 1 | 0 | 0 | 0 |
| 245 | [components/ui/context-menu.tsx](../components/ui/context-menu.tsx) | 5 | 1 | 0 | 0 | 0 |
| 246 | [components/ui/direction.tsx](../components/ui/direction.tsx) | 5 | 1 | 0 | 0 | 0 |
| 247 | [components/ui/empty.tsx](../components/ui/empty.tsx) | 5 | 1 | 0 | 0 | 0 |
| 248 | [components/ui/hover-card.tsx](../components/ui/hover-card.tsx) | 5 | 1 | 0 | 0 | 0 |
| 249 | [components/ui/item.tsx](../components/ui/item.tsx) | 5 | 1 | 0 | 0 | 0 |
| 250 | [components/ui/kbd.tsx](../components/ui/kbd.tsx) | 5 | 1 | 0 | 0 | 0 |
| 251 | [components/ui/marker.tsx](../components/ui/marker.tsx) | 5 | 1 | 0 | 0 | 0 |
| 252 | [components/ui/menubar.tsx](../components/ui/menubar.tsx) | 5 | 1 | 0 | 0 | 0 |
| 253 | [components/ui/message.tsx](../components/ui/message.tsx) | 5 | 1 | 0 | 0 | 0 |
| 254 | [components/ui/native-select.tsx](../components/ui/native-select.tsx) | 5 | 1 | 0 | 0 | 0 |
| 255 | [components/ui/navigation-menu.tsx](../components/ui/navigation-menu.tsx) | 5 | 1 | 0 | 0 | 0 |
| 256 | [components/ui/progress.tsx](../components/ui/progress.tsx) | 5 | 1 | 0 | 0 | 0 |
| 257 | [components/ui/radio-group.tsx](../components/ui/radio-group.tsx) | 5 | 1 | 0 | 0 | 0 |
| 258 | [components/ui/scroll-area.tsx](../components/ui/scroll-area.tsx) | 5 | 1 | 0 | 0 | 0 |
| 259 | [components/ui/select.tsx](../components/ui/select.tsx) | 5 | 1 | 0 | 0 | 0 |
| 260 | [components/ui/spinner.tsx](../components/ui/spinner.tsx) | 5 | 1 | 0 | 0 | 0 |
| 261 | [components/ui/switch.tsx](../components/ui/switch.tsx) | 5 | 1 | 0 | 0 | 0 |
| 262 | [components/ui/table.tsx](../components/ui/table.tsx) | 5 | 1 | 0 | 0 | 0 |

## All Source Files, Descending

| Rank | File | Scope | Language | Score | Max CC | Decisions | Functions | Nonblank Lines |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | [app/world.ts](../app/world.ts) | application | TypeScript | 1558 | 177 | 557 | 170 | 310 |
| 2 | [scripts/check-kingdom-visuals.cjs](../scripts/check-kingdom-visuals.cjs) | tooling | JavaScript | 1274 | 167 | 379 | 258 | 454 |
| 3 | [app/page.tsx](../app/page.tsx) | application | TypeScript | 1076 | 159 | 221 | 164 | 157 |
| 4 | [app/everyday-places.ts](../app/everyday-places.ts) | application | TypeScript | 1007 | 127 | 224 | 32 | 248 |
| 5 | [assets/signature-candidates/refine-signatures.py](../assets/signature-candidates/refine-signatures.py) | tooling | Python | 778 | 97 | 173 | 17 | 463 |
| 6 | [server/friends-server.mjs](../server/friends-server.mjs) | server | JavaScript | 758 | 108 | 176 | 47 | 183 |
| 7 | [app/realm-world.ts](../app/realm-world.ts) | application | TypeScript | 743 | 101 | 159 | 59 | 439 |
| 8 | [app/building-craft.ts](../app/building-craft.ts) | application | TypeScript | 733 | 96 | 103 | 16 | 143 |
| 9 | [app/friends-hub.tsx](../app/friends-hub.tsx) | application | TypeScript | 679 | 92 | 176 | 69 | 77 |
| 10 | [assets/premium-candidates/collectible-bakery.py](../assets/premium-candidates/collectible-bakery.py) | tooling | Python | 668 | 102 | 108 | 4 | 355 |
| 11 | [assets/signature-candidates/build-signature-shops.py](../assets/signature-candidates/build-signature-shops.py) | tooling | Python | 667 | 85 | 112 | 14 | 439 |
| 12 | [app/city-district-world.ts](../app/city-district-world.ts) | application | TypeScript | 506 | 64 | 110 | 29 | 223 |
| 13 | [assets/hero-candidates/remodel-angel.py](../assets/hero-candidates/remodel-angel.py) | tooling | Python | 476 | 68 | 86 | 3 | 214 |
| 14 | [server/friends-games.mjs](../server/friends-games.mjs) | server | JavaScript | 457 | 57 | 133 | 44 | 204 |
| 15 | [assets/sah-face/package_face.py](../assets/sah-face/package_face.py) | tooling | Python | 457 | 71 | 72 | 2 | 152 |
| 16 | [app/signature-shops.ts](../app/signature-shops.ts) | application | TypeScript | 456 | 55 | 62 | 12 | 103 |
| 17 | [app/architecture-kit.ts](../app/architecture-kit.ts) | application | TypeScript | 453 | 47 | 107 | 25 | 77 |
| 18 | [assets/anime-figure/02_outfit_refinement.py](../assets/anime-figure/02_outfit_refinement.py) | tooling | Python | 432 | 63 | 67 | 4 | 203 |
| 19 | [assets/signature-candidates/detail-signatures.py](../assets/signature-candidates/detail-signatures.py) | tooling | Python | 428 | 53 | 63 | 3 | 156 |
| 20 | [app/city-architecture.ts](../app/city-architecture.ts) | application | TypeScript | 425 | 55 | 64 | 9 | 146 |
| 21 | [app/friends-activities.ts](../app/friends-activities.ts) | application | TypeScript | 415 | 38 | 123 | 47 | 186 |
| 22 | [scripts/check-street-life.cjs](../scripts/check-street-life.cjs) | tooling | JavaScript | 411 | 39 | 156 | 64 | 93 |
| 23 | [app/street-life.ts](../app/street-life.ts) | application | TypeScript | 406 | 51 | 102 | 35 | 150 |
| 24 | [app/living-world.ts](../app/living-world.ts) | application | TypeScript | 401 | 42 | 132 | 32 | 88 |
| 25 | [assets/premium-candidates/collectible-press.py](../assets/premium-candidates/collectible-press.py) | tooling | Python | 400 | 54 | 70 | 9 | 258 |
| 26 | [app/city-expansion.ts](../app/city-expansion.ts) | application | TypeScript | 392 | 46 | 94 | 42 | 161 |
| 27 | [app/capital-world.ts](../app/capital-world.ts) | application | TypeScript | 390 | 46 | 108 | 27 | 149 |
| 28 | [assets/hero-candidates/remodel-monument.py](../assets/hero-candidates/remodel-monument.py) | tooling | Python | 388 | 57 | 63 | 2 | 180 |
| 29 | [assets/world-candidates/remodel-trees.py](../assets/world-candidates/remodel-trees.py) | tooling | Python | 385 | 49 | 80 | 5 | 227 |
| 30 | [app/city-landmarks.ts](../app/city-landmarks.ts) | application | TypeScript | 384 | 54 | 78 | 23 | 192 |
| 31 | [assets/anime-figure/03_face_and_hair.py](../assets/anime-figure/03_face_and_hair.py) | tooling | Python | 382 | 53 | 67 | 8 | 285 |
| 32 | [app/transit-world.ts](../app/transit-world.ts) | application | TypeScript | 376 | 23 | 167 | 69 | 256 |
| 33 | [assets/anime-figure/package_character.py](../assets/anime-figure/package_character.py) | tooling | Python | 371 | 55 | 56 | 3 | 146 |
| 34 | [app/planet-infrastructure.ts](../app/planet-infrastructure.ts) | application | TypeScript | 367 | 42 | 81 | 34 | 138 |
| 35 | [assets/anime-figure/04_expression_and_hair_fit.py](../assets/anime-figure/04_expression_and_hair_fit.py) | tooling | Python | 365 | 51 | 50 | 1 | 115 |
| 36 | [app/planet-canopy.ts](../app/planet-canopy.ts) | application | TypeScript | 364 | 49 | 80 | 27 | 82 |
| 37 | [app/workshop-details.ts](../app/workshop-details.ts) | application | TypeScript | 361 | 48 | 75 | 15 | 161 |
| 38 | [assets/hero-candidates/remodel-dog.py](../assets/hero-candidates/remodel-dog.py) | tooling | Python | 360 | 50 | 70 | 3 | 195 |
| 39 | [app/complete-scene-export.ts](../app/complete-scene-export.ts) | application | TypeScript | 358 | 40 | 92 | 18 | 74 |
| 40 | [app/creative-plaza.ts](../app/creative-plaza.ts) | application | TypeScript | 353 | 35 | 100 | 30 | 209 |
| 41 | [assets/cinematic/render_trailer.py](../assets/cinematic/render_trailer.py) | tooling | Python | 353 | 47 | 48 | 2 | 99 |
| 42 | [assets/dog-digital-double/steps/09_groom_guides.py](../assets/dog-digital-double/steps/09_groom_guides.py) | tooling | Python | 345 | 39 | 60 | 1 | 180 |
| 43 | [assets/planets/bake-planets.py](../assets/planets/bake-planets.py) | tooling | Python | 333 | 49 | 48 | 0 | 111 |
| 44 | [assets/dog-digital-double/steps/15_groom_round_two.py](../assets/dog-digital-double/steps/15_groom_round_two.py) | tooling | Python | 330 | 43 | 55 | 1 | 134 |
| 45 | [assets/premium-candidates/world-kit-study.py](../assets/premium-candidates/world-kit-study.py) | tooling | Python | 329 | 38 | 59 | 3 | 160 |
| 46 | [assets/dog-digital-double/steps/29_owner_web_fur.py](../assets/dog-digital-double/steps/29_owner_web_fur.py) | tooling | Python | 329 | 45 | 44 | 0 | 153 |
| 47 | [assets/premium-candidates/architecture-study.py](../assets/premium-candidates/architecture-study.py) | tooling | Python | 324 | 40 | 64 | 5 | 162 |
| 48 | [assets/anime-figure/01_character_base.py](../assets/anime-figure/01_character_base.py) | tooling | Python | 323 | 40 | 73 | 6 | 265 |
| 49 | [assets/street-life/build-life-kit.py](../assets/street-life/build-life-kit.py) | tooling | Python | 318 | 38 | 58 | 5 | 182 |
| 50 | [app/dog-rig.ts](../app/dog-rig.ts) | application | TypeScript | 313 | 33 | 72 | 15 | 119 |
| 51 | [assets/dog-digital-double/steps/18_web_export.py](../assets/dog-digital-double/steps/18_web_export.py) | tooling | Python | 312 | 40 | 52 | 1 | 205 |
| 52 | [assets/reference-dog/prepare_blend.py](../assets/reference-dog/prepare_blend.py) | tooling | Python | 304 | 42 | 44 | 7 | 234 |
| 53 | [assets/anime-figure/05_surface_polish.py](../assets/anime-figure/05_surface_polish.py) | tooling | Python | 303 | 44 | 43 | 1 | 112 |
| 54 | [app/transit-canopy.ts](../app/transit-canopy.ts) | application | TypeScript | 300 | 34 | 34 | 6 | 49 |
| 55 | [tests/everyday-places.test.cjs](../tests/everyday-places.test.cjs) | test | JavaScript | 299 | 15 | 164 | 106 | 254 |
| 56 | [app/dog-wander.ts](../app/dog-wander.ts) | application | TypeScript | 299 | 32 | 80 | 15 | 136 |
| 57 | [app/courier.ts](../app/courier.ts) | application | TypeScript | 299 | 34 | 53 | 10 | 59 |
| 58 | [assets/reference-dog/model.mjs](../assets/reference-dog/model.mjs) | configuration | JavaScript | 298 | 32 | 92 | 31 | 434 |
| 59 | [scripts/measure-scene-coverage.cjs](../scripts/measure-scene-coverage.cjs) | tooling | JavaScript | 296 | 27 | 101 | 78 | 158 |
| 60 | [assets/world-kit/03-bake-kit.py](../assets/world-kit/03-bake-kit.py) | tooling | Python | 295 | 44 | 45 | 1 | 149 |
| 61 | [app/astra-lighting.ts](../app/astra-lighting.ts) | application | TypeScript | 295 | 39 | 38 | 1 | 33 |
| 62 | [app/street-birds.ts](../app/street-birds.ts) | application | TypeScript | 292 | 30 | 86 | 18 | 94 |
| 63 | [scripts/check-shadow-boundary.cjs](../scripts/check-shadow-boundary.cjs) | tooling | JavaScript | 292 | 34 | 62 | 23 | 75 |
| 64 | [app/radio-tuner.tsx](../app/radio-tuner.tsx) | application | TypeScript | 286 | 33 | 78 | 33 | 79 |
| 65 | [assets/world-candidates/remodel-craft.py](../assets/world-candidates/remodel-craft.py) | tooling | Python | 286 | 29 | 61 | 4 | 247 |
| 66 | [scripts/rank-complexity.cjs](../scripts/rank-complexity.cjs) | tooling | JavaScript | 285 | 34 | 65 | 26 | 115 |
| 67 | [scripts/check-architecture.cjs](../scripts/check-architecture.cjs) | tooling | JavaScript | 281 | 33 | 56 | 30 | 55 |
| 68 | [assets/sah-face/steps/23_gold_monument.py](../assets/sah-face/steps/23_gold_monument.py) | tooling | Python | 281 | 42 | 41 | 0 | 141 |
| 69 | [scripts/check-capital.cjs](../scripts/check-capital.cjs) | tooling | JavaScript | 279 | 30 | 89 | 90 | 122 |
| 70 | [app/capital-fountain.ts](../app/capital-fountain.ts) | application | TypeScript | 279 | 33 | 55 | 11 | 94 |
| 71 | [assets/signature-candidates/bake-contact.py](../assets/signature-candidates/bake-contact.py) | tooling | Python | 275 | 37 | 40 | 2 | 132 |
| 72 | [assets/anime-figure/package_angel.py](../assets/anime-figure/package_angel.py) | tooling | Python | 272 | 37 | 37 | 2 | 89 |
| 73 | [assets/sah-face/steps/03_anatomical_features.py](../assets/sah-face/steps/03_anatomical_features.py) | tooling | Python | 270 | 38 | 40 | 2 | 205 |
| 74 | [app/planet-public-spaces.ts](../app/planet-public-spaces.ts) | application | TypeScript | 268 | 33 | 41 | 19 | 55 |
| 75 | [app/friends-games-ui.tsx](../app/friends-games-ui.tsx) | application | TypeScript | 265 | 15 | 127 | 73 | 89 |
| 76 | [assets/sah-face/fit_profile_depth.py](../assets/sah-face/fit_profile_depth.py) | tooling | Python | 264 | 35 | 49 | 7 | 146 |
| 77 | [assets/world-kit/02-compose-kit.py](../assets/world-kit/02-compose-kit.py) | tooling | Python | 264 | 32 | 44 | 4 | 123 |
| 78 | [app/persistence.ts](../app/persistence.ts) | application | TypeScript | 261 | 29 | 46 | 7 | 34 |
| 79 | [assets/anime-figure/06_finish_character.py](../assets/anime-figure/06_finish_character.py) | tooling | Python | 259 | 35 | 34 | 0 | 86 |
| 80 | [app/angel-controls.tsx](../app/angel-controls.tsx) | application | TypeScript | 256 | 31 | 48 | 27 | 40 |
| 81 | [assets/world-candidates/remodel-landmarks.py](../assets/world-candidates/remodel-landmarks.py) | tooling | Python | 255 | 29 | 60 | 3 | 174 |
| 82 | [assets/sah-face/steps/01_reference_head.py](../assets/sah-face/steps/01_reference_head.py) | tooling | Python | 255 | 37 | 40 | 3 | 198 |
| 83 | [scripts/compare-runtime.cjs](../scripts/compare-runtime.cjs) | tooling | JavaScript | 254 | 25 | 89 | 58 | 98 |
| 84 | [app/game-camera.ts](../app/game-camera.ts) | application | TypeScript | 254 | 28 | 55 | 15 | 56 |
| 85 | [scripts/profile-world.cjs](../scripts/profile-world.cjs) | tooling | JavaScript | 252 | 25 | 77 | 62 | 73 |
| 86 | [assets/copper-bakery/02-detail.py](../assets/copper-bakery/02-detail.py) | tooling | Python | 251 | 33 | 56 | 8 | 186 |
| 87 | [scripts/check-camera-lifecycle.cjs](../scripts/check-camera-lifecycle.cjs) | tooling | JavaScript | 250 | 29 | 65 | 70 | 107 |
| 88 | [assets/world-candidates/remodel-transport.py](../assets/world-candidates/remodel-transport.py) | tooling | Python | 248 | 27 | 53 | 3 | 154 |
| 89 | [app/facade-craft.ts](../app/facade-craft.ts) | application | TypeScript | 245 | 30 | 49 | 8 | 99 |
| 90 | [assets/sah-face/analyze_references.py](../assets/sah-face/analyze_references.py) | tooling | Python | 245 | 32 | 45 | 3 | 187 |
| 91 | [tests/roaming-dog.test.cjs](../tests/roaming-dog.test.cjs) | test | JavaScript | 244 | 24 | 84 | 105 | 186 |
| 92 | [assets/world-candidates/remodel-venues.py](../assets/world-candidates/remodel-venues.py) | tooling | Python | 243 | 26 | 63 | 4 | 169 |
| 93 | [app/weather-state.ts](../app/weather-state.ts) | application | TypeScript | 242 | 21 | 63 | 17 | 70 |
| 94 | [assets/world-return/bake-scene-finish.py](../assets/world-return/bake-scene-finish.py) | tooling | Python | 240 | 26 | 70 | 7 | 245 |
| 95 | [app/weather-sky.ts](../app/weather-sky.ts) | application | TypeScript | 240 | 24 | 55 | 10 | 95 |
| 96 | [app/planet-streaming.ts](../app/planet-streaming.ts) | application | TypeScript | 239 | 26 | 80 | 48 | 79 |
| 97 | [assets/sah-face/steps/09_stubble_and_brows.py](../assets/sah-face/steps/09_stubble_and_brows.py) | tooling | Python | 237 | 28 | 37 | 2 | 157 |
| 98 | [assets/dog-digital-double/steps/16_eye_windows_and_wave.py](../assets/dog-digital-double/steps/16_eye_windows_and_wave.py) | tooling | Python | 237 | 28 | 27 | 0 | 88 |
| 99 | [app/simulation.ts](../app/simulation.ts) | application | TypeScript | 233 | 26 | 48 | 27 | 29 |
| 100 | [assets/sah-face/package_gold.py](../assets/sah-face/package_gold.py) | tooling | Python | 232 | 32 | 32 | 2 | 80 |
| 101 | [scripts/import-complete-world.py](../scripts/import-complete-world.py) | tooling | Python | 231 | 26 | 71 | 8 | 207 |
| 102 | [assets/signature-candidates/finalize.cjs](../assets/signature-candidates/finalize.cjs) | configuration | JavaScript | 230 | 30 | 30 | 8 | 34 |
| 103 | [assets/dog-digital-double/steps/07_retopology.py](../assets/dog-digital-double/steps/07_retopology.py) | tooling | Python | 229 | 35 | 34 | 0 | 129 |
| 104 | [assets/dog-digital-double/steps/03_sculpt_primary.py](../assets/dog-digital-double/steps/03_sculpt_primary.py) | tooling | Python | 227 | 33 | 32 | 1 | 102 |
| 105 | [app/civilization-world.ts](../app/civilization-world.ts) | application | TypeScript | 226 | 22 | 58 | 28 | 143 |
| 106 | [scripts/check-gold-monument.cjs](../scripts/check-gold-monument.cjs) | tooling | JavaScript | 225 | 23 | 60 | 74 | 130 |
| 107 | [app/project-page-previews.ts](../app/project-page-previews.ts) | application | TypeScript | 225 | 24 | 59 | 21 | 66 |
| 108 | [app/static-batching.ts](../app/static-batching.ts) | application | TypeScript | 225 | 17 | 40 | 13 | 52 |
| 109 | [app/window-interiors.ts](../app/window-interiors.ts) | application | TypeScript | 224 | 23 | 24 | 4 | 23 |
| 110 | [assets/dog-digital-double/steps/20_validate_and_save.py](../assets/dog-digital-double/steps/20_validate_and_save.py) | tooling | Python | 223 | 34 | 33 | 0 | 79 |
| 111 | [scripts/verify-complete-world.cjs](../scripts/verify-complete-world.cjs) | tooling | JavaScript | 223 | 29 | 28 | 4 | 18 |
| 112 | [app/flying-angel.ts](../app/flying-angel.ts) | application | TypeScript | 222 | 21 | 81 | 26 | 103 |
| 113 | [app/neighborhood.ts](../app/neighborhood.ts) | application | TypeScript | 219 | 22 | 64 | 30 | 113 |
| 114 | [app/capital-life.ts](../app/capital-life.ts) | application | TypeScript | 219 | 24 | 43 | 14 | 68 |
| 115 | [app/walking-route.ts](../app/walking-route.ts) | application | TypeScript | 219 | 24 | 42 | 11 | 31 |
| 116 | [app/bulletin-data.ts](../app/bulletin-data.ts) | application | TypeScript | 216 | 21 | 70 | 15 | 62 |
| 117 | [scripts/diagnose-authored-scene.cjs](../scripts/diagnose-authored-scene.cjs) | tooling | JavaScript | 214 | 13 | 119 | 108 | 522 |
| 118 | [scripts/export-cinematic.cjs](../scripts/export-cinematic.cjs) | tooling | JavaScript | 214 | 20 | 34 | 19 | 36 |
| 119 | [assets/dog-digital-double/steps/27_owner_face_and_groom.py](../assets/dog-digital-double/steps/27_owner_face_and_groom.py) | tooling | Python | 213 | 24 | 23 | 0 | 87 |
| 120 | [assets/architecture/03-bake-surfaces.py](../assets/architecture/03-bake-surfaces.py) | tooling | Python | 209 | 30 | 29 | 0 | 81 |
| 121 | [assets/sah-face/steps/18_profile_surface_and_ears.py](../assets/sah-face/steps/18_profile_surface_and_ears.py) | tooling | Python | 209 | 30 | 29 | 2 | 153 |
| 122 | [assets/sah-face/steps/19_profile_color_and_attachment.py](../assets/sah-face/steps/19_profile_color_and_attachment.py) | tooling | Python | 209 | 30 | 29 | 1 | 123 |
| 123 | [app/panels.tsx](../app/panels.tsx) | application | TypeScript | 208 | 28 | 45 | 64 | 29 |
| 124 | [app/awe-world.ts](../app/awe-world.ts) | application | TypeScript | 203 | 25 | 42 | 27 | 121 |
| 125 | [assets/architecture/02-bake-export.py](../assets/architecture/02-bake-export.py) | tooling | Python | 203 | 29 | 28 | 0 | 61 |
| 126 | [app/city-gardens.ts](../app/city-gardens.ts) | application | TypeScript | 202 | 22 | 35 | 8 | 67 |
| 127 | [app/angel-gait.ts](../app/angel-gait.ts) | application | TypeScript | 201 | 26 | 28 | 8 | 41 |
| 128 | [app/angel-flight.ts](../app/angel-flight.ts) | application | TypeScript | 200 | 20 | 42 | 15 | 92 |
| 129 | [assets/sah-face/steps/17_profile_depth_pass.py](../assets/sah-face/steps/17_profile_depth_pass.py) | tooling | Python | 200 | 25 | 25 | 3 | 101 |
| 130 | [assets/premium-candidates/render-architecture-study.py](../assets/premium-candidates/render-architecture-study.py) | tooling | Python | 199 | 25 | 24 | 1 | 69 |
| 131 | [app/planet-lighting.ts](../app/planet-lighting.ts) | application | TypeScript | 197 | 28 | 28 | 4 | 26 |
| 132 | [app/forge-feed.ts](../app/forge-feed.ts) | application | TypeScript | 196 | 21 | 43 | 14 | 39 |
| 133 | [app/kingdom-art.ts](../app/kingdom-art.ts) | application | TypeScript | 195 | 20 | 37 | 9 | 111 |
| 134 | [app/traversal.ts](../app/traversal.ts) | application | TypeScript | 194 | 15 | 42 | 11 | 40 |
| 135 | [assets/world-candidates/finalize-craft.cjs](../assets/world-candidates/finalize-craft.cjs) | configuration | JavaScript | 193 | 27 | 28 | 9 | 30 |
| 136 | [app/angel-ground.ts](../app/angel-ground.ts) | application | TypeScript | 191 | 19 | 51 | 8 | 82 |
| 137 | [assets/copper-bakery/03-bake.py](../assets/copper-bakery/03-bake.py) | tooling | Python | 191 | 28 | 31 | 2 | 85 |
| 138 | [assets/sah-face/steps/04_lids_and_primary_shape.py](../assets/sah-face/steps/04_lids_and_primary_shape.py) | tooling | Python | 189 | 25 | 24 | 0 | 118 |
| 139 | [assets/world-candidates/finish-terrain.py](../assets/world-candidates/finish-terrain.py) | tooling | Python | 188 | 22 | 38 | 3 | 149 |
| 140 | [tests/street-life.test.cjs](../tests/street-life.test.cjs) | test | JavaScript | 187 | 12 | 87 | 77 | 167 |
| 141 | [app/angel-locomotion.ts](../app/angel-locomotion.ts) | application | TypeScript | 186 | 18 | 40 | 11 | 67 |
| 142 | [app/craft-kit.ts](../app/craft-kit.ts) | application | TypeScript | 185 | 16 | 36 | 9 | 48 |
| 143 | [assets/dog-digital-double/steps/12_groom_round_one_prepare.py](../assets/dog-digital-double/steps/12_groom_round_one_prepare.py) | tooling | Python | 185 | 26 | 25 | 0 | 73 |
| 144 | [scripts/check-roaming-dog.cjs](../scripts/check-roaming-dog.cjs) | tooling | JavaScript | 184 | 19 | 49 | 37 | 99 |
| 145 | [scripts/export-complete-world.cjs](../scripts/export-complete-world.cjs) | tooling | JavaScript | 184 | 22 | 44 | 42 | 42 |
| 146 | [assets/sah-face/steps/12_crown_fit_and_buzz_cut.py](../assets/sah-face/steps/12_crown_fit_and_buzz_cut.py) | tooling | Python | 184 | 27 | 29 | 2 | 145 |
| 147 | [app/bulletin-world.ts](../app/bulletin-world.ts) | application | TypeScript | 183 | 15 | 66 | 34 | 112 |
| 148 | [assets/dog-digital-double/steps/19_fix_web_materials.py](../assets/dog-digital-double/steps/19_fix_web_materials.py) | tooling | Python | 181 | 22 | 21 | 0 | 53 |
| 149 | [app/complete-world-export.ts](../app/complete-world-export.ts) | application | TypeScript | 180 | 19 | 42 | 17 | 52 |
| 150 | [app/press-craft.ts](../app/press-craft.ts) | application | TypeScript | 180 | 17 | 39 | 14 | 123 |
| 151 | [assets/sah-face/steps/10_hairline_and_eye_refinement.py](../assets/sah-face/steps/10_hairline_and_eye_refinement.py) | tooling | Python | 180 | 23 | 25 | 2 | 125 |
| 152 | [app/friends-computer.tsx](../app/friends-computer.tsx) | application | TypeScript | 179 | 19 | 51 | 26 | 50 |
| 153 | [app/planet-population.ts](../app/planet-population.ts) | application | TypeScript | 179 | 19 | 45 | 24 | 121 |
| 154 | [app/bulletin-feed.ts](../app/bulletin-feed.ts) | application | TypeScript | 178 | 16 | 72 | 22 | 35 |
| 155 | [app/copper-bakery.ts](../app/copper-bakery.ts) | application | TypeScript | 178 | 14 | 42 | 16 | 41 |
| 156 | [app/resident-instances.ts](../app/resident-instances.ts) | application | TypeScript | 178 | 16 | 40 | 17 | 54 |
| 157 | [assets/architecture/01-author-architecture.py](../assets/architecture/01-author-architecture.py) | tooling | Python | 178 | 23 | 33 | 5 | 139 |
| 158 | [app/cute-resident.ts](../app/cute-resident.ts) | application | TypeScript | 177 | 14 | 38 | 12 | 101 |
| 159 | [app/project-world.ts](../app/project-world.ts) | application | TypeScript | 176 | 17 | 52 | 37 | 51 |
| 160 | [app/angel-rig.ts](../app/angel-rig.ts) | application | TypeScript | 176 | 16 | 40 | 18 | 83 |
| 161 | [app/transit-panel.tsx](../app/transit-panel.tsx) | application | TypeScript | 176 | 21 | 28 | 9 | 26 |
| 162 | [scripts/astra-beauty-audit.cjs](../scripts/astra-beauty-audit.cjs) | tooling | JavaScript | 175 | 20 | 45 | 28 | 81 |
| 163 | [scripts/check-hud-dropdowns.cjs](../scripts/check-hud-dropdowns.cjs) | tooling | JavaScript | 175 | 20 | 45 | 41 | 104 |
| 164 | [app/world-scenery.ts](../app/world-scenery.ts) | application | TypeScript | 173 | 22 | 34 | 12 | 40 |
| 165 | [app/architecture-neighborhood.ts](../app/architecture-neighborhood.ts) | application | TypeScript | 172 | 17 | 46 | 21 | 66 |
| 166 | [assets/anime-figure/09_angel_wings.py](../assets/anime-figure/09_angel_wings.py) | tooling | Python | 171 | 23 | 26 | 1 | 145 |
| 167 | [assets/anime-figure/07_garment_clearance.py](../assets/anime-figure/07_garment_clearance.py) | tooling | Python | 171 | 22 | 21 | 2 | 70 |
| 168 | [app/street-performers.ts](../app/street-performers.ts) | application | TypeScript | 170 | 16 | 34 | 10 | 79 |
| 169 | [app/dog-gait.ts](../app/dog-gait.ts) | application | TypeScript | 170 | 22 | 24 | 11 | 46 |
| 170 | [app/transit-models.ts](../app/transit-models.ts) | application | TypeScript | 169 | 16 | 34 | 7 | 60 |
| 171 | [app/crafted-surfaces.ts](../app/crafted-surfaces.ts) | application | TypeScript | 169 | 9 | 24 | 5 | 51 |
| 172 | [assets/dog-digital-double/steps/28_owner_cheek_silhouette.py](../assets/dog-digital-double/steps/28_owner_cheek_silhouette.py) | tooling | Python | 169 | 20 | 19 | 0 | 70 |
| 173 | [app/radio-data.ts](../app/radio-data.ts) | application | TypeScript | 168 | 18 | 43 | 9 | 41 |
| 174 | [app/weather-world.ts](../app/weather-world.ts) | application | TypeScript | 166 | 17 | 39 | 14 | 79 |
| 175 | [app/scene-resources.ts](../app/scene-resources.ts) | application | TypeScript | 166 | 10 | 16 | 2 | 16 |
| 176 | [app/friends-voice.ts](../app/friends-voice.ts) | application | TypeScript | 165 | 15 | 47 | 31 | 80 |
| 177 | [app/friends-client.ts](../app/friends-client.ts) | application | TypeScript | 165 | 15 | 39 | 21 | 82 |
| 178 | [components/ui/chart.tsx](../components/ui/chart.tsx) | application | TypeScript | 164 | 18 | 54 | 14 | 336 |
| 179 | [scripts/check-angel.cjs](../scripts/check-angel.cjs) | tooling | JavaScript | 162 | 15 | 57 | 78 | 143 |
| 180 | [app/district-machines.ts](../app/district-machines.ts) | application | TypeScript | 162 | 17 | 41 | 32 | 38 |
| 181 | [assets/dog-digital-double/steps/08_coat_maps.py](../assets/dog-digital-double/steps/08_coat_maps.py) | tooling | Python | 162 | 19 | 37 | 4 | 160 |
| 182 | [app/world-lighting.ts](../app/world-lighting.ts) | application | TypeScript | 162 | 11 | 34 | 10 | 43 |
| 183 | [app/capital-gallery.ts](../app/capital-gallery.ts) | application | TypeScript | 162 | 17 | 18 | 5 | 47 |
| 184 | [scripts/check-friends.cjs](../scripts/check-friends.cjs) | tooling | JavaScript | 159 | 14 | 49 | 69 | 129 |
| 185 | [assets/anime-figure/08_final_face_smoothing.py](../assets/anime-figure/08_final_face_smoothing.py) | tooling | Python | 159 | 20 | 19 | 1 | 68 |
| 186 | [assets/dog-digital-double/steps/13_groom_round_one_comb.py](../assets/dog-digital-double/steps/13_groom_round_one_comb.py) | tooling | Python | 159 | 20 | 19 | 0 | 56 |
| 187 | [app/authored-terrain.ts](../app/authored-terrain.ts) | application | TypeScript | 158 | 15 | 31 | 7 | 27 |
| 188 | [app/painting-ai.ts](../app/painting-ai.ts) | application | TypeScript | 157 | 11 | 37 | 27 | 99 |
| 189 | [assets/sah-face/steps/13_material_and_eye_match.py](../assets/sah-face/steps/13_material_and_eye_match.py) | tooling | Python | 157 | 23 | 22 | 1 | 92 |
| 190 | [app/astra-canopy.ts](../app/astra-canopy.ts) | application | TypeScript | 156 | 17 | 29 | 10 | 77 |
| 191 | [app/canopy-grove.ts](../app/canopy-grove.ts) | application | TypeScript | 155 | 12 | 41 | 19 | 102 |
| 192 | [assets/dog-digital-double/steps/14_groom_color_transport.py](../assets/dog-digital-double/steps/14_groom_color_transport.py) | tooling | Python | 155 | 21 | 20 | 0 | 91 |
| 193 | [assets/sah-face/steps/07_fit_scalp_outline.py](../assets/sah-face/steps/07_fit_scalp_outline.py) | tooling | Python | 154 | 22 | 24 | 1 | 78 |
| 194 | [assets/copper-bakery/01-shell.py](../assets/copper-bakery/01-shell.py) | tooling | Python | 152 | 16 | 42 | 8 | 147 |
| 195 | [tests/realm-detail.test.cjs](../tests/realm-detail.test.cjs) | test | JavaScript | 151 | 13 | 56 | 53 | 163 |
| 196 | [scripts/check-canopy.cjs](../scripts/check-canopy.cjs) | tooling | JavaScript | 151 | 14 | 51 | 33 | 55 |
| 197 | [tests/transit-motion.test.cjs](../tests/transit-motion.test.cjs) | test | JavaScript | 149 | 12 | 49 | 37 | 154 |
| 198 | [app/speech-bubble.ts](../app/speech-bubble.ts) | application | TypeScript | 148 | 14 | 29 | 8 | 84 |
| 199 | [scripts/render-reference-dog.cjs](../scripts/render-reference-dog.cjs) | tooling | JavaScript | 148 | 19 | 23 | 24 | 45 |
| 200 | [tests/city-expansion.test.cjs](../tests/city-expansion.test.cjs) | test | JavaScript | 147 | 11 | 52 | 49 | 101 |
| 201 | [app/project-installations.ts](../app/project-installations.ts) | application | TypeScript | 147 | 10 | 38 | 17 | 52 |
| 202 | [assets/dog-digital-double/steps/30_owner_eyelid_aperture.py](../assets/dog-digital-double/steps/30_owner_eyelid_aperture.py) | tooling | Python | 147 | 18 | 17 | 0 | 89 |
| 203 | [app/lantern-arcade.ts](../app/lantern-arcade.ts) | application | TypeScript | 147 | 17 | 16 | 6 | 49 |
| 204 | [app/signature-shop-asset.ts](../app/signature-shop-asset.ts) | application | TypeScript | 146 | 13 | 45 | 17 | 49 |
| 205 | [scripts/check-authored-world.cjs](../scripts/check-authored-world.cjs) | tooling | JavaScript | 145 | 13 | 50 | 52 | 109 |
| 206 | [assets/sah-face/steps/render_view.py](../assets/sah-face/steps/render_view.py) | tooling | Python | 145 | 16 | 15 | 0 | 67 |
| 207 | [tests/new-worlds.test.cjs](../tests/new-worlds.test.cjs) | test | JavaScript | 143 | 9 | 48 | 64 | 217 |
| 208 | [assets/dog-digital-double/steps/inspect_render_visibility.py](../assets/dog-digital-double/steps/inspect_render_visibility.py) | tooling | Python | 143 | 19 | 18 | 0 | 26 |
| 209 | [assets/sah-face/steps/06_cranium_and_lid_refinement.py](../assets/sah-face/steps/06_cranium_and_lid_refinement.py) | tooling | Python | 143 | 19 | 18 | 0 | 70 |
| 210 | [scripts/blender_mcp_client.py](../scripts/blender_mcp_client.py) | tooling | Python | 142 | 14 | 22 | 2 | 86 |
| 211 | [assets/dog-digital-double/steps/diagnose_sculpt_context.py](../assets/dog-digital-double/steps/diagnose_sculpt_context.py) | tooling | Python | 141 | 17 | 16 | 0 | 24 |
| 212 | [app/world-kit.ts](../app/world-kit.ts) | application | TypeScript | 140 | 10 | 40 | 12 | 40 |
| 213 | [app/character-controller.ts](../app/character-controller.ts) | application | TypeScript | 140 | 16 | 18 | 2 | 17 |
| 214 | [assets/premium-candidates/material-study.py](../assets/premium-candidates/material-study.py) | tooling | Python | 139 | 16 | 19 | 3 | 104 |
| 215 | [assets/sah-face/steps/15_profile_finish.py](../assets/sah-face/steps/15_profile_finish.py) | tooling | Python | 139 | 20 | 19 | 1 | 117 |
| 216 | [scripts/check-angel-ground.cjs](../scripts/check-angel-ground.cjs) | tooling | JavaScript | 138 | 12 | 48 | 49 | 94 |
| 217 | [app/wooden-sign.ts](../app/wooden-sign.ts) | application | TypeScript | 138 | 11 | 26 | 7 | 97 |
| 218 | [app/capital-pavilion.ts](../app/capital-pavilion.ts) | application | TypeScript | 138 | 16 | 19 | 4 | 52 |
| 219 | [app/radio-player.ts](../app/radio-player.ts) | application | TypeScript | 136 | 15 | 35 | 22 | 53 |
| 220 | [scripts/check-city-neighborhoods.cjs](../scripts/check-city-neighborhoods.cjs) | tooling | JavaScript | 135 | 11 | 50 | 45 | 105 |
| 221 | [assets/sah-face/steps/22_profile_surface_finish.py](../assets/sah-face/steps/22_profile_surface_finish.py) | tooling | Python | 135 | 16 | 15 | 0 | 50 |
| 222 | [app/architecture-profiles.ts](../app/architecture-profiles.ts) | application | TypeScript | 135 | 7 | 8 | 3 | 33 |
| 223 | [app/planet-surface.ts](../app/planet-surface.ts) | application | TypeScript | 134 | 12 | 36 | 15 | 80 |
| 224 | [scripts/check-player-controls.cjs](../scripts/check-player-controls.cjs) | tooling | JavaScript | 134 | 14 | 34 | 42 | 83 |
| 225 | [assets/dog-digital-double/viewer.mjs](../assets/dog-digital-double/viewer.mjs) | configuration | JavaScript | 133 | 12 | 33 | 16 | 69 |
| 226 | [assets/sah-face/steps/05_native_sculpt.py](../assets/sah-face/steps/05_native_sculpt.py) | tooling | Python | 133 | 19 | 18 | 0 | 105 |
| 227 | [assets/street-life/finalize-life.cjs](../assets/street-life/finalize-life.cjs) | configuration | JavaScript | 133 | 17 | 18 | 6 | 16 |
| 228 | [app/kingdom-audio.ts](../app/kingdom-audio.ts) | application | TypeScript | 131 | 13 | 37 | 15 | 30 |
| 229 | [assets/dog-digital-double/steps/25_sync_aligned_exports.py](../assets/dog-digital-double/steps/25_sync_aligned_exports.py) | tooling | Python | 131 | 17 | 16 | 0 | 82 |
| 230 | [assets/sah-face/steps/14_attach_detail_and_validate.py](../assets/sah-face/steps/14_attach_detail_and_validate.py) | tooling | Python | 131 | 17 | 16 | 0 | 74 |
| 231 | [app/civic-kit.ts](../app/civic-kit.ts) | application | TypeScript | 130 | 8 | 43 | 23 | 81 |
| 232 | [assets/world-kit/01-author-kit.py](../assets/world-kit/01-author-kit.py) | tooling | Python | 130 | 10 | 30 | 7 | 155 |
| 233 | [scripts/complete-export-format.cjs](../scripts/complete-export-format.cjs) | tooling | JavaScript | 129 | 6 | 9 | 4 | 23 |
| 234 | [app/packet-press-asset.ts](../app/packet-press-asset.ts) | application | TypeScript | 128 | 11 | 34 | 18 | 90 |
| 235 | [app/workshop-neighborhood.ts](../app/workshop-neighborhood.ts) | application | TypeScript | 128 | 12 | 29 | 5 | 98 |
| 236 | [app/roaming-dog.ts](../app/roaming-dog.ts) | application | TypeScript | 126 | 11 | 35 | 18 | 54 |
| 237 | [app/astra-moments.ts](../app/astra-moments.ts) | application | TypeScript | 126 | 13 | 25 | 13 | 100 |
| 238 | [assets/premium-candidates/finalize-collectible-bakery.cjs](../assets/premium-candidates/finalize-collectible-bakery.cjs) | configuration | JavaScript | 126 | 16 | 16 | 5 | 34 |
| 239 | [server/friends-relay.mjs](../server/friends-relay.mjs) | server | JavaScript | 125 | 12 | 42 | 28 | 66 |
| 240 | [app/portrait-speaker.ts](../app/portrait-speaker.ts) | application | TypeScript | 125 | 10 | 30 | 15 | 46 |
| 241 | [tests/city-canopy.test.cjs](../tests/city-canopy.test.cjs) | test | JavaScript | 125 | 14 | 15 | 14 | 22 |
| 242 | [app/planet-geography.ts](../app/planet-geography.ts) | application | TypeScript | 124 | 6 | 14 | 10 | 63 |
| 243 | [lib/bulletin-feeds.ts](../lib/bulletin-feeds.ts) | application | TypeScript | 123 | 9 | 39 | 23 | 89 |
| 244 | [tests/gold-monument.test.cjs](../tests/gold-monument.test.cjs) | test | JavaScript | 123 | 7 | 38 | 64 | 121 |
| 245 | [assets/premium-candidates/compare-runtime.cjs](../assets/premium-candidates/compare-runtime.cjs) | configuration | JavaScript | 123 | 10 | 33 | 41 | 41 |
| 246 | [tests/display-integrations.test.cjs](../tests/display-integrations.test.cjs) | test | JavaScript | 123 | 9 | 18 | 46 | 121 |
| 247 | [lib/radio-directory.ts](../lib/radio-directory.ts) | application | TypeScript | 122 | 11 | 31 | 13 | 39 |
| 248 | [tests/static-batching.test.cjs](../tests/static-batching.test.cjs) | test | JavaScript | 121 | 9 | 36 | 26 | 64 |
| 249 | [scripts/check-resume-book.cjs](../scripts/check-resume-book.cjs) | tooling | JavaScript | 120 | 10 | 30 | 35 | 59 |
| 250 | [app/spatial-index.ts](../app/spatial-index.ts) | application | TypeScript | 120 | 9 | 14 | 4 | 14 |
| 251 | [scripts/check-friends-world.cjs](../scripts/check-friends-world.cjs) | tooling | JavaScript | 119 | 11 | 34 | 38 | 68 |
| 252 | [tests/city-architecture.test.cjs](../tests/city-architecture.test.cjs) | test | JavaScript | 117 | 8 | 47 | 26 | 168 |
| 253 | [assets/sah-face/steps/11_profile_and_scalp_check.py](../assets/sah-face/steps/11_profile_and_scalp_check.py) | tooling | Python | 117 | 18 | 17 | 0 | 35 |
| 254 | [assets/cinematic/edit_trailer.py](../assets/cinematic/edit_trailer.py) | tooling | Python | 117 | 13 | 12 | 0 | 48 |
| 255 | [scripts/check-city-redesign.cjs](../scripts/check-city-redesign.cjs) | tooling | JavaScript | 116 | 9 | 31 | 32 | 82 |
| 256 | [tests/world-engine.test.cjs](../tests/world-engine.test.cjs) | test | JavaScript | 116 | 14 | 26 | 9 | 96 |
| 257 | [assets/dog-digital-double/steps/01_references.py](../assets/dog-digital-double/steps/01_references.py) | tooling | Python | 116 | 14 | 16 | 1 | 134 |
| 258 | [assets/anime-figure/serve.cjs](../assets/anime-figure/serve.cjs) | configuration | JavaScript | 116 | 12 | 13 | 6 | 22 |
| 259 | [app/everyday-config.ts](../app/everyday-config.ts) | application | TypeScript | 116 | 11 | 11 | 2 | 36 |
| 260 | [app/painting-speech.ts](../app/painting-speech.ts) | application | TypeScript | 115 | 8 | 39 | 23 | 79 |
| 261 | [app/planet-biomes.ts](../app/planet-biomes.ts) | application | TypeScript | 115 | 9 | 12 | 4 | 35 |
| 262 | [tests/capital-fountain.test.cjs](../tests/capital-fountain.test.cjs) | test | JavaScript | 114 | 9 | 29 | 15 | 50 |
| 263 | [tests/signs.test.cjs](../tests/signs.test.cjs) | test | JavaScript | 114 | 10 | 24 | 39 | 142 |
| 264 | [assets/blender/build_packet_press.py](../assets/blender/build_packet_press.py) | tooling | Python | 114 | 11 | 19 | 6 | 127 |
| 265 | [app/shop-architecture.ts](../app/shop-architecture.ts) | application | TypeScript | 114 | 11 | 13 | 5 | 62 |
| 266 | [tests/world-kit.test.cjs](../tests/world-kit.test.cjs) | test | JavaScript | 113 | 9 | 38 | 42 | 92 |
| 267 | [app/game-input.ts](../app/game-input.ts) | application | TypeScript | 113 | 11 | 32 | 16 | 20 |
| 268 | [app/paving-material.ts](../app/paving-material.ts) | application | TypeScript | 113 | 14 | 14 | 3 | 46 |
| 269 | [app/static-transforms.ts](../app/static-transforms.ts) | application | TypeScript | 113 | 10 | 14 | 7 | 24 |
| 270 | [assets/sah-face/steps/20_profile_texture_cleanup.py](../assets/sah-face/steps/20_profile_texture_cleanup.py) | tooling | Python | 113 | 14 | 13 | 0 | 42 |
| 271 | [assets/sah-face/steps/21_profile_ear_alignment.py](../assets/sah-face/steps/21_profile_ear_alignment.py) | tooling | Python | 113 | 14 | 13 | 0 | 47 |
| 272 | [assets/world-candidates/finalize-terrain.cjs](../assets/world-candidates/finalize-terrain.cjs) | configuration | JavaScript | 112 | 12 | 22 | 13 | 43 |
| 273 | [app/planet-composition.ts](../app/planet-composition.ts) | application | TypeScript | 112 | 14 | 13 | 1 | 15 |
| 274 | [app/transit-config.ts](../app/transit-config.ts) | application | TypeScript | 112 | 6 | 12 | 6 | 39 |
| 275 | [assets/dog-digital-double/steps/04_face_correction.py](../assets/dog-digital-double/steps/04_face_correction.py) | tooling | Python | 111 | 14 | 21 | 3 | 174 |
| 276 | [scripts/prepare-friends-pc.mjs](../scripts/prepare-friends-pc.mjs) | tooling | JavaScript | 111 | 12 | 11 | 1 | 24 |
| 277 | [scripts/assemble-complete-world.cjs](../scripts/assemble-complete-world.cjs) | tooling | JavaScript | 110 | 10 | 20 | 8 | 15 |
| 278 | [app/kingdom-chronicle.ts](../app/kingdom-chronicle.ts) | application | TypeScript | 110 | 11 | 16 | 12 | 51 |
| 279 | [vite.vercel.config.ts](../vite.vercel.config.ts) | configuration | TypeScript | 110 | 8 | 7 | 1 | 29 |
| 280 | [app/transit-motion.ts](../app/transit-motion.ts) | application | TypeScript | 109 | 9 | 26 | 17 | 104 |
| 281 | [assets/reference-dog/studio.mjs](../assets/reference-dog/studio.mjs) | configuration | JavaScript | 109 | 10 | 19 | 13 | 88 |
| 282 | [app/ground-occlusion.ts](../app/ground-occlusion.ts) | application | TypeScript | 108 | 7 | 12 | 9 | 36 |
| 283 | [app/friends-world.ts](../app/friends-world.ts) | application | TypeScript | 106 | 12 | 20 | 11 | 53 |
| 284 | [assets/world-candidates/finalize-world-kit.cjs](../assets/world-candidates/finalize-world-kit.cjs) | configuration | JavaScript | 105 | 12 | 25 | 13 | 52 |
| 285 | [app/premium-materials.ts](../app/premium-materials.ts) | application | TypeScript | 105 | 8 | 20 | 7 | 31 |
| 286 | [assets/reference-dog/serve.cjs](../assets/reference-dog/serve.cjs) | configuration | JavaScript | 105 | 13 | 17 | 8 | 27 |
| 287 | [assets/dog-digital-double/steps/10_groom_nodes.py](../assets/dog-digital-double/steps/10_groom_nodes.py) | tooling | Python | 105 | 12 | 15 | 1 | 182 |
| 288 | [assets/dog-digital-double/steps/26_likeness_eye_pass.py](../assets/dog-digital-double/steps/26_likeness_eye_pass.py) | tooling | Python | 105 | 11 | 10 | 0 | 47 |
| 289 | [tests/angel-rig.test.cjs](../tests/angel-rig.test.cjs) | test | JavaScript | 104 | 9 | 19 | 15 | 36 |
| 290 | [app/workshop-lighting.ts](../app/workshop-lighting.ts) | application | TypeScript | 103 | 9 | 22 | 14 | 83 |
| 291 | [app/storybook-street.ts](../app/storybook-street.ts) | application | TypeScript | 102 | 9 | 28 | 12 | 50 |
| 292 | [scripts/check-civilizations.cjs](../scripts/check-civilizations.cjs) | tooling | JavaScript | 102 | 9 | 27 | 36 | 76 |
| 293 | [app/life-kit.ts](../app/life-kit.ts) | application | TypeScript | 102 | 9 | 22 | 9 | 29 |
| 294 | [assets/sah-face/analyze_profiles.py](../assets/sah-face/analyze_profiles.py) | tooling | Python | 102 | 12 | 12 | 1 | 80 |
| 295 | [tests/readable-displays.test.cjs](../tests/readable-displays.test.cjs) | test | JavaScript | 102 | 8 | 12 | 36 | 70 |
| 296 | [app/painting-interaction.ts](../app/painting-interaction.ts) | application | TypeScript | 101 | 8 | 35 | 14 | 60 |
| 297 | [assets/anime-figure/viewer.mjs](../assets/anime-figure/viewer.mjs) | configuration | JavaScript | 101 | 7 | 26 | 15 | 78 |
| 298 | [tests/authored-terrain.test.cjs](../tests/authored-terrain.test.cjs) | test | JavaScript | 101 | 8 | 21 | 37 | 70 |
| 299 | [assets/dog-digital-double/steps/02_blockout.py](../assets/dog-digital-double/steps/02_blockout.py) | tooling | Python | 100 | 13 | 15 | 2 | 152 |
| 300 | [tests/angel-flight.test.cjs](../tests/angel-flight.test.cjs) | test | JavaScript | 99 | 6 | 29 | 30 | 94 |
| 301 | [app/gold-monument.ts](../app/gold-monument.ts) | application | TypeScript | 99 | 7 | 28 | 10 | 49 |
| 302 | [assets/hero-candidates/finalize-angel.cjs](../assets/hero-candidates/finalize-angel.cjs) | configuration | JavaScript | 99 | 13 | 14 | 4 | 26 |
| 303 | [scripts/check-radio-kettle.cjs](../scripts/check-radio-kettle.cjs) | tooling | JavaScript | 97 | 7 | 32 | 58 | 58 |
| 304 | [assets/premium-candidates/finalize-collectible-press.cjs](../assets/premium-candidates/finalize-collectible-press.cjs) | configuration | JavaScript | 97 | 11 | 22 | 8 | 65 |
| 305 | [app/resume-book.ts](../app/resume-book.ts) | application | TypeScript | 96 | 6 | 37 | 33 | 88 |
| 306 | [app/quality-tiers.ts](../app/quality-tiers.ts) | application | TypeScript | 96 | 9 | 16 | 9 | 44 |
| 307 | [assets/hero-candidates/finalize-dog.cjs](../assets/hero-candidates/finalize-dog.cjs) | configuration | JavaScript | 96 | 12 | 16 | 7 | 27 |
| 308 | [app/project-study-controls.tsx](../app/project-study-controls.tsx) | application | TypeScript | 96 | 12 | 13 | 6 | 16 |
| 309 | [assets/dog-digital-double/serve.cjs](../assets/dog-digital-double/serve.cjs) | configuration | JavaScript | 96 | 12 | 13 | 6 | 20 |
| 310 | [app/project-bulletins.ts](../app/project-bulletins.ts) | application | TypeScript | 95 | 7 | 31 | 20 | 58 |
| 311 | [app/friends-scene.ts](../app/friends-scene.ts) | application | TypeScript | 95 | 10 | 16 | 6 | 56 |
| 312 | [tests/character-population.test.cjs](../tests/character-population.test.cjs) | test | JavaScript | 95 | 10 | 15 | 25 | 53 |
| 313 | [app/kingdom-voices.ts](../app/kingdom-voices.ts) | application | TypeScript | 95 | 10 | 12 | 5 | 7 |
| 314 | [tests/planet-canopy.test.cjs](../tests/planet-canopy.test.cjs) | test | JavaScript | 94 | 10 | 14 | 16 | 18 |
| 315 | [scripts/export-planet-sources.cjs](../scripts/export-planet-sources.cjs) | tooling | JavaScript | 94 | 9 | 9 | 7 | 22 |
| 316 | [app/work-scheduler.ts](../app/work-scheduler.ts) | application | TypeScript | 93 | 8 | 18 | 8 | 16 |
| 317 | [tests/project-installations.test.cjs](../tests/project-installations.test.cjs) | test | JavaScript | 93 | 9 | 18 | 21 | 24 |
| 318 | [assets/premium-candidates/verify-architecture.cjs](../assets/premium-candidates/verify-architecture.cjs) | configuration | JavaScript | 93 | 12 | 13 | 7 | 25 |
| 319 | [tests/press-craft.test.cjs](../tests/press-craft.test.cjs) | test | JavaScript | 92 | 8 | 32 | 24 | 98 |
| 320 | [app/asset-manager.ts](../app/asset-manager.ts) | application | TypeScript | 91 | 8 | 19 | 18 | 27 |
| 321 | [app/visible-geometry.ts](../app/visible-geometry.ts) | application | TypeScript | 91 | 10 | 15 | 6 | 34 |
| 322 | [app/painting-conversation.ts](../app/painting-conversation.ts) | application | TypeScript | 91 | 10 | 12 | 13 | 33 |
| 323 | [app/world-assets.ts](../app/world-assets.ts) | application | TypeScript | 91 | 9 | 10 | 7 | 27 |
| 324 | [app/atmosphere-blend.ts](../app/atmosphere-blend.ts) | application | TypeScript | 90 | 8 | 14 | 5 | 40 |
| 325 | [tests/capital-world.test.cjs](../tests/capital-world.test.cjs) | test | JavaScript | 89 | 6 | 29 | 46 | 44 |
| 326 | [tests/city-district-world.test.cjs](../tests/city-district-world.test.cjs) | test | JavaScript | 89 | 6 | 19 | 22 | 56 |
| 327 | [app/delivery-state.ts](../app/delivery-state.ts) | application | TypeScript | 89 | 8 | 15 | 15 | 18 |
| 328 | [assets/hero-candidates/finalize-monument.cjs](../assets/hero-candidates/finalize-monument.cjs) | configuration | JavaScript | 89 | 11 | 14 | 4 | 32 |
| 329 | [assets/dog-digital-double/steps/23_inspect_atlas_samples.py](../assets/dog-digital-double/steps/23_inspect_atlas_samples.py) | tooling | Python | 89 | 10 | 9 | 0 | 31 |
| 330 | [scripts/verify-dog-web.cjs](../scripts/verify-dog-web.cjs) | tooling | JavaScript | 89 | 8 | 9 | 8 | 24 |
| 331 | [scripts/check-dog-web.cjs](../scripts/check-dog-web.cjs) | tooling | JavaScript | 88 | 8 | 18 | 22 | 48 |
| 332 | [tests/transit.test.cjs](../tests/transit.test.cjs) | test | JavaScript | 88 | 6 | 18 | 78 | 93 |
| 333 | [app/realm-layout.ts](../app/realm-layout.ts) | application | TypeScript | 87 | 5 | 8 | 10 | 65 |
| 334 | [tests/transit-visibility.test.cjs](../tests/transit-visibility.test.cjs) | test | JavaScript | 86 | 7 | 31 | 49 | 142 |
| 335 | [tests/workshop-neighborhood.test.cjs](../tests/workshop-neighborhood.test.cjs) | test | JavaScript | 86 | 5 | 31 | 40 | 94 |
| 336 | [scripts/check-world-engine.cjs](../scripts/check-world-engine.cjs) | tooling | JavaScript | 86 | 7 | 21 | 29 | 65 |
| 337 | [tests/speech.test.cjs](../tests/speech.test.cjs) | test | JavaScript | 86 | 6 | 16 | 27 | 83 |
| 338 | [scripts/render_dog_master.py](../scripts/render_dog_master.py) | tooling | Python | 86 | 11 | 11 | 1 | 46 |
| 339 | [assets/dog-digital-double/steps/diagnose_retopology.py](../assets/dog-digital-double/steps/diagnose_retopology.py) | tooling | Python | 85 | 11 | 10 | 0 | 21 |
| 340 | [assets/sah-face/steps/16_profile_comparison_cameras.py](../assets/sah-face/steps/16_profile_comparison_cameras.py) | tooling | Python | 85 | 11 | 10 | 0 | 75 |
| 341 | [scripts/check-board-views.cjs](../scripts/check-board-views.cjs) | tooling | JavaScript | 84 | 6 | 24 | 26 | 46 |
| 342 | [app/audio-score.ts](../app/audio-score.ts) | application | TypeScript | 84 | 10 | 12 | 7 | 38 |
| 343 | [assets/dog-digital-double/steps/11_lookdev_first_groom.py](../assets/dog-digital-double/steps/11_lookdev_first_groom.py) | tooling | Python | 83 | 9 | 8 | 2 | 80 |
| 344 | [app/realm-demos.ts](../app/realm-demos.ts) | application | TypeScript | 81 | 6 | 19 | 30 | 62 |
| 345 | [assets/sah-face/steps/inspect_import.py](../assets/sah-face/steps/inspect_import.py) | tooling | Python | 81 | 12 | 11 | 0 | 13 |
| 346 | [app/exhibit-view.tsx](../app/exhibit-view.tsx) | application | TypeScript | 80 | 8 | 11 | 10 | 11 |
| 347 | [tests/reference-dog.test.mjs](../tests/reference-dog.test.mjs) | test | JavaScript | 80 | 8 | 10 | 4 | 38 |
| 348 | [tests/exhibit-state.test.cjs](../tests/exhibit-state.test.cjs) | test | JavaScript | 79 | 8 | 19 | 13 | 31 |
| 349 | [assets/sah-face/steps/08_smooth_scalp_transition.py](../assets/sah-face/steps/08_smooth_scalp_transition.py) | tooling | Python | 79 | 10 | 9 | 0 | 43 |
| 350 | [scripts/package-source.py](../scripts/package-source.py) | tooling | Python | 79 | 10 | 9 | 0 | 32 |
| 351 | [app/readable-display.ts](../app/readable-display.ts) | application | TypeScript | 79 | 3 | 3 | 3 | 23 |
| 352 | [tests/cute-resident-life.test.cjs](../tests/cute-resident-life.test.cjs) | test | JavaScript | 78 | 7 | 13 | 20 | 61 |
| 353 | [app/astra-atmosphere.ts](../app/astra-atmosphere.ts) | application | TypeScript | 77 | 8 | 11 | 4 | 36 |
| 354 | [assets/dog-digital-double/steps/inspect_web_export_settings.py](../assets/dog-digital-double/steps/inspect_web_export_settings.py) | tooling | Python | 77 | 8 | 7 | 0 | 13 |
| 355 | [tests/civic-kit.test.cjs](../tests/civic-kit.test.cjs) | test | JavaScript | 76 | 7 | 21 | 28 | 47 |
| 356 | [tests/controls.test.cjs](../tests/controls.test.cjs) | test | JavaScript | 76 | 5 | 21 | 58 | 120 |
| 357 | [app/city-public-spaces.ts](../app/city-public-spaces.ts) | application | TypeScript | 76 | 5 | 19 | 19 | 37 |
| 358 | [tests/astra-moments.test.cjs](../tests/astra-moments.test.cjs) | test | JavaScript | 76 | 8 | 16 | 6 | 41 |
| 359 | [assets/dog-digital-double/steps/22_render_clay_diagnostic.py](../assets/dog-digital-double/steps/22_render_clay_diagnostic.py) | tooling | Python | 75 | 11 | 10 | 0 | 29 |
| 360 | [tests/audio.test.cjs](../tests/audio.test.cjs) | test | JavaScript | 75 | 7 | 10 | 27 | 16 |
| 361 | [app/city-districts.ts](../app/city-districts.ts) | application | TypeScript | 75 | 4 | 8 | 7 | 31 |
| 362 | [scripts/check-bulletins.cjs](../scripts/check-bulletins.cjs) | tooling | JavaScript | 74 | 5 | 19 | 28 | 59 |
| 363 | [scripts/check-workshop.cjs](../scripts/check-workshop.cjs) | tooling | JavaScript | 74 | 5 | 19 | 28 | 60 |
| 364 | [app/resume-book-reader.tsx](../app/resume-book-reader.tsx) | application | TypeScript | 74 | 8 | 11 | 19 | 31 |
| 365 | [tests/city-districts.test.cjs](../tests/city-districts.test.cjs) | test | JavaScript | 74 | 7 | 9 | 5 | 17 |
| 366 | [scripts/check-friends-pc.cjs](../scripts/check-friends-pc.cjs) | tooling | JavaScript | 73 | 9 | 18 | 18 | 34 |
| 367 | [server/friends-store.mjs](../server/friends-store.mjs) | server | JavaScript | 73 | 6 | 7 | 9 | 43 |
| 368 | [components/ui/sidebar.tsx](../components/ui/sidebar.tsx) | application | TypeScript | 72 | 8 | 22 | 34 | 674 |
| 369 | [app/exhibit-state.ts](../app/exhibit-state.ts) | application | TypeScript | 72 | 5 | 10 | 17 | 19 |
| 370 | [tests/angel-ground.test.cjs](../tests/angel-ground.test.cjs) | test | JavaScript | 71 | 6 | 21 | 14 | 57 |
| 371 | [scripts/check-pixel-direct.cjs](../scripts/check-pixel-direct.cjs) | tooling | JavaScript | 71 | 5 | 16 | 48 | 91 |
| 372 | [app/workshop-objects.ts](../app/workshop-objects.ts) | application | TypeScript | 71 | 6 | 15 | 16 | 100 |
| 373 | [tests/commons.test.cjs](../tests/commons.test.cjs) | test | JavaScript | 71 | 6 | 11 | 30 | 53 |
| 374 | [assets/cinematic/package_sources.py](../assets/cinematic/package_sources.py) | tooling | Python | 71 | 7 | 6 | 0 | 11 |
| 375 | [tests/bulletin-world.test.cjs](../tests/bulletin-world.test.cjs) | test | JavaScript | 70 | 5 | 15 | 29 | 43 |
| 376 | [scripts/verify-dog-package.cjs](../scripts/verify-dog-package.cjs) | tooling | JavaScript | 70 | 8 | 10 | 3 | 32 |
| 377 | [tests/astra-lighting.test.cjs](../tests/astra-lighting.test.cjs) | test | JavaScript | 70 | 6 | 10 | 8 | 44 |
| 378 | [tests/weather-sky.test.cjs](../tests/weather-sky.test.cjs) | test | JavaScript | 69 | 9 | 14 | 16 | 51 |
| 379 | [tests/spatial-index.test.cjs](../tests/spatial-index.test.cjs) | test | JavaScript | 68 | 6 | 18 | 18 | 23 |
| 380 | [assets/dog-digital-double/owner_revision_report.py](../assets/dog-digital-double/owner_revision_report.py) | tooling | Python | 68 | 8 | 8 | 1 | 49 |
| 381 | [scripts/check-object-craft.cjs](../scripts/check-object-craft.cjs) | tooling | JavaScript | 67 | 5 | 12 | 32 | 49 |
| 382 | [tests/resident-instances.test.cjs](../tests/resident-instances.test.cjs) | test | JavaScript | 67 | 5 | 12 | 18 | 41 |
| 383 | [app/astra-geology.ts](../app/astra-geology.ts) | application | TypeScript | 67 | 5 | 7 | 4 | 49 |
| 384 | [assets/dog-digital-double/steps/render_single_view.py](../assets/dog-digital-double/steps/render_single_view.py) | tooling | Python | 67 | 8 | 7 | 0 | 52 |
| 385 | [assets/sah-face/steps/render_profile_revision.py](../assets/sah-face/steps/render_profile_revision.py) | tooling | Python | 67 | 8 | 7 | 0 | 32 |
| 386 | [assets/dog-digital-double/steps/24_alignment_and_shading.py](../assets/dog-digital-double/steps/24_alignment_and_shading.py) | tooling | Python | 65 | 7 | 10 | 1 | 46 |
| 387 | [tests/planet-geography.test.cjs](../tests/planet-geography.test.cjs) | test | JavaScript | 65 | 5 | 10 | 8 | 38 |
| 388 | [app/planet-movement.ts](../app/planet-movement.ts) | application | TypeScript | 65 | 5 | 4 | 3 | 17 |
| 389 | [app/world-config.ts](../app/world-config.ts) | application | TypeScript | 65 | 1 | 0 | 4 | 22 |
| 390 | [lib/utils.ts](../lib/utils.ts) | application | TypeScript | 65 | 1 | 0 | 1 | 5 |
| 391 | [tests/character-courier.test.cjs](../tests/character-courier.test.cjs) | test | JavaScript | 64 | 7 | 9 | 15 | 69 |
| 392 | [tests/planet-biomes.test.cjs](../tests/planet-biomes.test.cjs) | test | JavaScript | 64 | 5 | 9 | 7 | 14 |
| 393 | [app/civilization-observation.tsx](../app/civilization-observation.tsx) | application | TypeScript | 64 | 7 | 6 | 1 | 17 |
| 394 | [tests/friends-games.test.mjs](../tests/friends-games.test.mjs) | test | JavaScript | 63 | 6 | 13 | 20 | 75 |
| 395 | [app/kettle-steam.ts](../app/kettle-steam.ts) | application | TypeScript | 63 | 6 | 7 | 3 | 51 |
| 396 | [tests/architecture-kit.test.cjs](../tests/architecture-kit.test.cjs) | test | JavaScript | 62 | 5 | 17 | 27 | 41 |
| 397 | [app/exhibit-canopy.ts](../app/exhibit-canopy.ts) | application | TypeScript | 62 | 6 | 6 | 3 | 27 |
| 398 | [tests/building-craft.test.cjs](../tests/building-craft.test.cjs) | test | JavaScript | 61 | 5 | 16 | 9 | 28 |
| 399 | [scripts/inspect-visual-reference.cjs](../scripts/inspect-visual-reference.cjs) | tooling | JavaScript | 61 | 8 | 11 | 24 | 57 |
| 400 | [tests/window-interiors.test.cjs](../tests/window-interiors.test.cjs) | test | JavaScript | 61 | 6 | 11 | 9 | 18 |
| 401 | [scripts/build-performance.mjs](../scripts/build-performance.mjs) | tooling | JavaScript | 61 | 7 | 6 | 0 | 17 |
| 402 | [app/civilization-config.ts](../app/civilization-config.ts) | application | TypeScript | 61 | 3 | 2 | 4 | 27 |
| 403 | [app/collision-world.ts](../app/collision-world.ts) | application | TypeScript | 60 | 6 | 11 | 5 | 14 |
| 404 | [tests/architecture-profiles.test.cjs](../tests/architecture-profiles.test.cjs) | test | JavaScript | 60 | 6 | 10 | 5 | 22 |
| 405 | [tests/world-lighting.test.cjs](../tests/world-lighting.test.cjs) | test | JavaScript | 60 | 6 | 10 | 12 | 38 |
| 406 | [tests/capital-pavilion.test.cjs](../tests/capital-pavilion.test.cjs) | test | JavaScript | 59 | 6 | 9 | 5 | 11 |
| 407 | [tests/asset-manager.test.cjs](../tests/asset-manager.test.cjs) | test | JavaScript | 58 | 4 | 8 | 22 | 29 |
| 408 | [app/resident-dialogue.ts](../app/resident-dialogue.ts) | application | TypeScript | 58 | 4 | 3 | 3 | 40 |
| 409 | [tests/capital-framing.test.cjs](../tests/capital-framing.test.cjs) | test | JavaScript | 56 | 6 | 6 | 3 | 17 |
| 410 | [app/civilization-link.ts](../app/civilization-link.ts) | application | TypeScript | 56 | 5 | 5 | 5 | 31 |
| 411 | [app/lighting-rig.ts](../app/lighting-rig.ts) | application | TypeScript | 55 | 5 | 4 | 3 | 27 |
| 412 | [components/ui/carousel.tsx](../components/ui/carousel.tsx) | application | TypeScript | 54 | 4 | 14 | 13 | 215 |
| 413 | [app/radio-location.ts](../app/radio-location.ts) | application | TypeScript | 54 | 4 | 8 | 5 | 17 |
| 414 | [components/ui/drawer.tsx](../components/ui/drawer.tsx) | application | TypeScript | 53 | 7 | 8 | 13 | 207 |
| 415 | [tests/planet-composition.test.cjs](../tests/planet-composition.test.cjs) | test | JavaScript | 53 | 5 | 8 | 12 | 16 |
| 416 | [app/astra-rain.ts](../app/astra-rain.ts) | application | TypeScript | 53 | 4 | 7 | 4 | 27 |
| 417 | [tests/planet-rotation.test.cjs](../tests/planet-rotation.test.cjs) | test | JavaScript | 52 | 4 | 12 | 22 | 57 |
| 418 | [components/ui/toast.tsx](../components/ui/toast.tsx) | application | TypeScript | 52 | 7 | 7 | 13 | 204 |
| 419 | [tests/arrival-camera.test.cjs](../tests/arrival-camera.test.cjs) | test | JavaScript | 52 | 5 | 7 | 19 | 20 |
| 420 | [tests/commons-view.test.cjs](../tests/commons-view.test.cjs) | test | JavaScript | 52 | 5 | 7 | 4 | 19 |
| 421 | [tests/packet-press.test.mjs](../tests/packet-press.test.mjs) | test | JavaScript | 52 | 5 | 7 | 7 | 40 |
| 422 | [tests/friends-scene.test.cjs](../tests/friends-scene.test.cjs) | test | JavaScript | 51 | 4 | 11 | 9 | 42 |
| 423 | [scripts/render-resume.py](../scripts/render-resume.py) | tooling | Python | 51 | 5 | 6 | 1 | 62 |
| 424 | [app/planet-rotation.ts](../app/planet-rotation.ts) | application | TypeScript | 49 | 5 | 5 | 4 | 24 |
| 425 | [assets/sah-face/bootstrap_connection.py](../assets/sah-face/bootstrap_connection.py) | tooling | Python | 49 | 5 | 4 | 0 | 26 |
| 426 | [lib/orbit-course.ts](../lib/orbit-course.ts) | application | TypeScript | 49 | 3 | 3 | 4 | 46 |
| 427 | [app/api/radio/stations/route.ts](../app/api/radio/stations/route.ts) | application | TypeScript | 48 | 6 | 5 | 2 | 8 |
| 428 | [tests/city-gardens.test.cjs](../tests/city-gardens.test.cjs) | test | JavaScript | 47 | 4 | 7 | 13 | 33 |
| 429 | [tests/cute-characters.test.cjs](../tests/cute-characters.test.cjs) | test | JavaScript | 47 | 4 | 7 | 8 | 22 |
| 430 | [assets/sah-face/finish_review.py](../assets/sah-face/finish_review.py) | tooling | Python | 46 | 6 | 6 | 3 | 79 |
| 431 | [tests/crafted-surfaces.test.cjs](../tests/crafted-surfaces.test.cjs) | test | JavaScript | 46 | 4 | 6 | 5 | 31 |
| 432 | [app/interactions.ts](../app/interactions.ts) | application | TypeScript | 46 | 4 | 3 | 2 | 10 |
| 433 | [tests/planet-surface.test.cjs](../tests/planet-surface.test.cjs) | test | JavaScript | 45 | 3 | 10 | 19 | 47 |
| 434 | [assets/cinematic/verify_video.py](../assets/cinematic/verify_video.py) | tooling | Python | 45 | 6 | 5 | 0 | 18 |
| 435 | [assets/world-kit/04-export-kit.py](../assets/world-kit/04-export-kit.py) | tooling | Python | 45 | 6 | 5 | 0 | 25 |
| 436 | [tests/route-performance.test.cjs](../tests/route-performance.test.cjs) | test | JavaScript | 45 | 4 | 5 | 5 | 11 |
| 437 | [app/touch-controls.tsx](../app/touch-controls.tsx) | application | TypeScript | 44 | 4 | 11 | 12 | 9 |
| 438 | [assets/dog-digital-double/comparison_sheet.py](../assets/dog-digital-double/comparison_sheet.py) | tooling | Python | 44 | 4 | 4 | 1 | 29 |
| 439 | [scripts/render-sah-face.py](../scripts/render-sah-face.py) | tooling | Python | 44 | 4 | 4 | 1 | 39 |
| 440 | [tests/planet-public-spaces.test.cjs](../tests/planet-public-spaces.test.cjs) | test | JavaScript | 44 | 4 | 4 | 10 | 23 |
| 441 | [tests/resume-book.test.cjs](../tests/resume-book.test.cjs) | test | JavaScript | 44 | 4 | 4 | 11 | 25 |
| 442 | [tests/shop-architecture.test.cjs](../tests/shop-architecture.test.cjs) | test | JavaScript | 44 | 4 | 4 | 7 | 12 |
| 443 | [tests/canopy-trees.test.cjs](../tests/canopy-trees.test.cjs) | test | JavaScript | 43 | 3 | 8 | 12 | 21 |
| 444 | [tests/character-specialists.test.cjs](../tests/character-specialists.test.cjs) | test | JavaScript | 43 | 3 | 8 | 26 | 55 |
| 445 | [app/performance-budget.ts](../app/performance-budget.ts) | application | TypeScript | 43 | 5 | 5 | 3 | 9 |
| 446 | [assets/dog-digital-double/bootstrap_connection.py](../assets/dog-digital-double/bootstrap_connection.py) | tooling | Python | 43 | 4 | 3 | 0 | 28 |
| 447 | [tests/civilizations.test.cjs](../tests/civilizations.test.cjs) | test | JavaScript | 42 | 3 | 7 | 22 | 47 |
| 448 | [tests/workshop-objects.test.cjs](../tests/workshop-objects.test.cjs) | test | JavaScript | 41 | 4 | 11 | 11 | 37 |
| 449 | [app/shader-preparation.ts](../app/shader-preparation.ts) | application | TypeScript | 41 | 4 | 5 | 10 | 22 |
| 450 | [app/portfolio.ts](../app/portfolio.ts) | application | TypeScript | 41 | 1 | 0 | 1 | 29 |
| 451 | [components/ui/button.tsx](../components/ui/button.tsx) | application | TypeScript | 41 | 1 | 0 | 1 | 54 |
| 452 | [assets/reference-dog/finish_previews.py](../assets/reference-dog/finish_previews.py) | tooling | Python | 40 | 5 | 5 | 1 | 43 |
| 453 | [tests/camera-motion.test.cjs](../tests/camera-motion.test.cjs) | test | JavaScript | 40 | 3 | 5 | 8 | 26 |
| 454 | [tests/capital-life.test.cjs](../tests/capital-life.test.cjs) | test | JavaScript | 40 | 5 | 5 | 19 | 20 |
| 455 | [assets/cinematic/verify_scene.py](../assets/cinematic/verify_scene.py) | tooling | Python | 39 | 5 | 4 | 0 | 13 |
| 456 | [scripts/prepare-civilization-logos.cjs](../scripts/prepare-civilization-logos.cjs) | tooling | JavaScript | 39 | 3 | 4 | 12 | 26 |
| 457 | [scripts/verify-reference-dog.cjs](../scripts/verify-reference-dog.cjs) | tooling | JavaScript | 39 | 3 | 4 | 6 | 23 |
| 458 | [tests/batch-transforms.test.cjs](../tests/batch-transforms.test.cjs) | test | JavaScript | 39 | 3 | 4 | 3 | 11 |
| 459 | [tests/bulletin-feeds.test.cjs](../tests/bulletin-feeds.test.cjs) | test | JavaScript | 39 | 3 | 4 | 21 | 34 |
| 460 | [tests/bulletin-watch.test.cjs](../tests/bulletin-watch.test.cjs) | test | JavaScript | 39 | 3 | 4 | 31 | 22 |
| 461 | [tests/static-transforms.test.cjs](../tests/static-transforms.test.cjs) | test | JavaScript | 39 | 3 | 4 | 8 | 35 |
| 462 | [assets/anime-figure/check_viewer.cjs](../assets/anime-figure/check_viewer.cjs) | configuration | JavaScript | 38 | 4 | 8 | 20 | 39 |
| 463 | [components/ui/calendar.tsx](../components/ui/calendar.tsx) | application | TypeScript | 38 | 4 | 8 | 8 | 221 |
| 464 | [assets/sah-face/prepare_profile_color.py](../assets/sah-face/prepare_profile_color.py) | tooling | Python | 38 | 3 | 3 | 1 | 71 |
| 465 | [lib/friends-protocol.ts](../lib/friends-protocol.ts) | application | TypeScript | 38 | 1 | 0 | 0 | 37 |
| 466 | [tests/planet-lighting.test.cjs](../tests/planet-lighting.test.cjs) | test | JavaScript | 37 | 4 | 7 | 9 | 27 |
| 467 | [app/comfort-settings.tsx](../app/comfort-settings.tsx) | application | TypeScript | 37 | 4 | 4 | 9 | 8 |
| 468 | [components/ui/slider.tsx](../components/ui/slider.tsx) | application | TypeScript | 37 | 3 | 2 | 2 | 48 |
| 469 | [tests/visible-geometry.test.cjs](../tests/visible-geometry.test.cjs) | test | JavaScript | 37 | 3 | 2 | 5 | 20 |
| 470 | [components/ui/field.tsx](../components/ui/field.tsx) | application | TypeScript | 36 | 4 | 6 | 13 | 218 |
| 471 | [app/kingdom-presentation.ts](../app/kingdom-presentation.ts) | application | TypeScript | 36 | 3 | 5 | 10 | 58 |
| 472 | [app/project-studies.ts](../app/project-studies.ts) | application | TypeScript | 36 | 3 | 2 | 7 | 26 |
| 473 | [tests/transit-canopy.test.cjs](../tests/transit-canopy.test.cjs) | test | JavaScript | 35 | 4 | 5 | 3 | 12 |
| 474 | [assets/dog-digital-double/finish_media.py](../assets/dog-digital-double/finish_media.py) | tooling | Python | 34 | 4 | 4 | 1 | 46 |
| 475 | [tests/friends-server.test.mjs](../tests/friends-server.test.mjs) | test | JavaScript | 33 | 3 | 8 | 30 | 80 |
| 476 | [assets/anime-figure/render_review.py](../assets/anime-figure/render_review.py) | tooling | Python | 33 | 4 | 3 | 0 | 24 |
| 477 | [components/ui/message-scroller.tsx](../components/ui/message-scroller.tsx) | application | TypeScript | 33 | 4 | 3 | 6 | 121 |
| 478 | [tests/delivery.test.cjs](../tests/delivery.test.cjs) | test | JavaScript | 32 | 3 | 7 | 9 | 16 |
| 479 | [tests/streamed-resources.test.cjs](../tests/streamed-resources.test.cjs) | test | JavaScript | 32 | 3 | 7 | 29 | 50 |
| 480 | [tests/friends-relay.test.mjs](../tests/friends-relay.test.mjs) | test | JavaScript | 31 | 3 | 6 | 13 | 37 |
| 481 | [app/transit-visibility.ts](../app/transit-visibility.ts) | application | TypeScript | 31 | 2 | 2 | 2 | 9 |
| 482 | [tests/weather.test.cjs](../tests/weather.test.cjs) | test | JavaScript | 30 | 3 | 5 | 30 | 47 |
| 483 | [components/ui/toggle-group.tsx](../components/ui/toggle-group.tsx) | application | TypeScript | 29 | 5 | 4 | 2 | 82 |
| 484 | [tests/planet-population.test.cjs](../tests/planet-population.test.cjs) | test | JavaScript | 29 | 3 | 4 | 15 | 24 |
| 485 | [components/ui/attachment.tsx](../components/ui/attachment.tsx) | application | TypeScript | 28 | 3 | 3 | 9 | 194 |
| 486 | [scripts/check-vercel-output.cjs](../scripts/check-vercel-output.cjs) | tooling | JavaScript | 28 | 3 | 3 | 3 | 27 |
| 487 | [tests/astra-canopy.test.cjs](../tests/astra-canopy.test.cjs) | test | JavaScript | 28 | 3 | 3 | 4 | 14 |
| 488 | [tests/portrait.test.cjs](../tests/portrait.test.cjs) | test | JavaScript | 28 | 3 | 3 | 17 | 20 |
| 489 | [vite.config.ts](../vite.config.ts) | configuration | TypeScript | 28 | 3 | 3 | 1 | 54 |
| 490 | [components/ui/pagination.tsx](../components/ui/pagination.tsx) | application | TypeScript | 27 | 3 | 2 | 7 | 123 |
| 491 | [app/limb-ik.ts](../app/limb-ik.ts) | application | TypeScript | 27 | 2 | 1 | 2 | 14 |
| 492 | [components/ui/input-group.tsx](../components/ui/input-group.tsx) | application | TypeScript | 27 | 2 | 1 | 7 | 147 |
| 493 | [app/hud-category.tsx](../app/hud-category.tsx) | application | TypeScript | 25 | 2 | 2 | 4 | 15 |
| 494 | [tests/architecture-neighborhood.test.cjs](../tests/architecture-neighborhood.test.cjs) | test | JavaScript | 24 | 2 | 4 | 11 | 17 |
| 495 | [tests/radio-directory.test.cjs](../tests/radio-directory.test.cjs) | test | JavaScript | 24 | 2 | 4 | 18 | 31 |
| 496 | [tests/complete-scene-export.test.cjs](../tests/complete-scene-export.test.cjs) | test | JavaScript | 23 | 2 | 3 | 18 | 33 |
| 497 | [tests/districts.test.cjs](../tests/districts.test.cjs) | test | JavaScript | 23 | 2 | 3 | 16 | 8 |
| 498 | [tests/forge-feed.test.cjs](../tests/forge-feed.test.cjs) | test | JavaScript | 23 | 2 | 3 | 13 | 26 |
| 499 | [tests/kingdom-art.test.cjs](../tests/kingdom-art.test.cjs) | test | JavaScript | 23 | 2 | 3 | 5 | 21 |
| 500 | [tests/painting-ai.test.cjs](../tests/painting-ai.test.cjs) | test | JavaScript | 23 | 2 | 3 | 42 | 52 |
| 501 | [components/ui/sheet.tsx](../components/ui/sheet.tsx) | application | TypeScript | 23 | 2 | 1 | 10 | 126 |
| 502 | [app/asset-manifest.ts](../app/asset-manifest.ts) | application | TypeScript | 23 | 1 | 0 | 0 | 7 |
| 503 | [scripts/measure-download.cjs](../scripts/measure-download.cjs) | tooling | JavaScript | 22 | 2 | 2 | 6 | 7 |
| 504 | [tests/bulletin-data.test.cjs](../tests/bulletin-data.test.cjs) | test | JavaScript | 22 | 2 | 2 | 11 | 33 |
| 505 | [tests/dialogue.test.cjs](../tests/dialogue.test.cjs) | test | JavaScript | 22 | 2 | 2 | 9 | 14 |
| 506 | [tests/planet-streaming.test.cjs](../tests/planet-streaming.test.cjs) | test | JavaScript | 22 | 2 | 2 | 29 | 29 |
| 507 | [tests/premium-materials.test.cjs](../tests/premium-materials.test.cjs) | test | JavaScript | 22 | 2 | 2 | 7 | 13 |
| 508 | [components/ui/dialog.tsx](../components/ui/dialog.tsx) | application | TypeScript | 21 | 2 | 2 | 10 | 146 |
| 509 | [app/play/page.tsx](../app/play/page.tsx) | application | TypeScript | 21 | 2 | 1 | 1 | 5 |
| 510 | [assets/dog-digital-double/steps/05_reference_gate.py](../assets/dog-digital-double/steps/05_reference_gate.py) | tooling | Python | 21 | 2 | 1 | 0 | 25 |
| 511 | [assets/dog-digital-double/steps/06_camera_fit.py](../assets/dog-digital-double/steps/06_camera_fit.py) | tooling | Python | 21 | 2 | 1 | 0 | 35 |
| 512 | [assets/sah-face/prepare_skin_reference.py](../assets/sah-face/prepare_skin_reference.py) | tooling | Python | 21 | 2 | 1 | 1 | 34 |
| 513 | [assets/sah-face/steps/02_align_and_render.py](../assets/sah-face/steps/02_align_and_render.py) | tooling | Python | 21 | 2 | 1 | 0 | 36 |
| 514 | [tests/astra-geology.test.cjs](../tests/astra-geology.test.cjs) | test | JavaScript | 21 | 2 | 1 | 4 | 13 |
| 515 | [tests/ground-occlusion.test.cjs](../tests/ground-occlusion.test.cjs) | test | JavaScript | 21 | 2 | 1 | 12 | 21 |
| 516 | [tests/painting-conversation.test.cjs](../tests/painting-conversation.test.cjs) | test | JavaScript | 21 | 2 | 1 | 15 | 18 |
| 517 | [tests/radio-player.test.cjs](../tests/radio-player.test.cjs) | test | JavaScript | 21 | 2 | 1 | 25 | 27 |
| 518 | [tests/resources.test.cjs](../tests/resources.test.cjs) | test | JavaScript | 21 | 2 | 1 | 7 | 21 |
| 519 | [tests/shader-preparation.test.cjs](../tests/shader-preparation.test.cjs) | test | JavaScript | 21 | 2 | 1 | 25 | 29 |
| 520 | [app/gold-monument-site.ts](../app/gold-monument-site.ts) | application | TypeScript | 20 | 1 | 0 | 0 | 1 |
| 521 | [components/ui/combobox.tsx](../components/ui/combobox.tsx) | application | TypeScript | 18 | 3 | 3 | 16 | 280 |
| 522 | [tests/kettle-steam.test.cjs](../tests/kettle-steam.test.cjs) | test | JavaScript | 18 | 3 | 3 | 6 | 12 |
| 523 | [components/ui/input-otp.tsx](../components/ui/input-otp.tsx) | application | TypeScript | 17 | 3 | 2 | 4 | 78 |
| 524 | [tests/exhibit-canopy.test.cjs](../tests/exhibit-canopy.test.cjs) | test | JavaScript | 17 | 3 | 2 | 2 | 11 |
| 525 | [app/resume-content.tsx](../app/resume-content.tsx) | application | TypeScript | 17 | 2 | 1 | 13 | 15 |
| 526 | [app/encounter-config.ts](../app/encounter-config.ts) | application | TypeScript | 17 | 1 | 0 | 0 | 16 |
| 527 | [components/ui/separator.tsx](../components/ui/separator.tsx) | application | TypeScript | 17 | 1 | 0 | 1 | 21 |
| 528 | [components/ui/breadcrumb.tsx](../components/ui/breadcrumb.tsx) | application | TypeScript | 11 | 2 | 1 | 7 | 113 |
| 529 | [components/ui/resizable.tsx](../components/ui/resizable.tsx) | application | TypeScript | 11 | 2 | 1 | 3 | 44 |
| 530 | [tests/friends-world.test.cjs](../tests/friends-world.test.cjs) | test | JavaScript | 11 | 2 | 1 | 6 | 16 |
| 531 | [app/transit-state.ts](../app/transit-state.ts) | application | TypeScript | 11 | 1 | 0 | 0 | 3 |
| 532 | [components/ui/input.tsx](../components/ui/input.tsx) | application | TypeScript | 11 | 1 | 0 | 1 | 17 |
| 533 | [app/city-district-menu.tsx](../app/city-district-menu.tsx) | application | TypeScript | 8 | 1 | 0 | 3 | 8 |
| 534 | [components/ui/dropdown-menu.tsx](../components/ui/dropdown-menu.tsx) | application | TypeScript | 8 | 1 | 0 | 15 | 254 |
| 535 | [components/ui/label.tsx](../components/ui/label.tsx) | application | TypeScript | 8 | 1 | 0 | 1 | 16 |
| 536 | [components/ui/popover.tsx](../components/ui/popover.tsx) | application | TypeScript | 8 | 1 | 0 | 6 | 81 |
| 537 | [components/ui/skeleton.tsx](../components/ui/skeleton.tsx) | application | TypeScript | 8 | 1 | 0 | 1 | 11 |
| 538 | [components/ui/tabs.tsx](../components/ui/tabs.tsx) | application | TypeScript | 8 | 1 | 0 | 4 | 74 |
| 539 | [components/ui/textarea.tsx](../components/ui/textarea.tsx) | application | TypeScript | 8 | 1 | 0 | 1 | 15 |
| 540 | [components/ui/toggle.tsx](../components/ui/toggle.tsx) | application | TypeScript | 8 | 1 | 0 | 1 | 40 |
| 541 | [components/ui/tooltip.tsx](../components/ui/tooltip.tsx) | application | TypeScript | 8 | 1 | 0 | 4 | 59 |
| 542 | [hooks/use-mobile.ts](../hooks/use-mobile.ts) | application | TypeScript | 8 | 1 | 0 | 4 | 17 |
| 543 | [app/api/bulletins/markets/route.ts](../app/api/bulletins/markets/route.ts) | application | TypeScript | 5 | 1 | 0 | 1 | 4 |
| 544 | [app/api/bulletins/news/route.ts](../app/api/bulletins/news/route.ts) | application | TypeScript | 5 | 1 | 0 | 1 | 4 |
| 545 | [app/layout.tsx](../app/layout.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 20 |
| 546 | [app/projects/page.tsx](../app/projects/page.tsx) | application | TypeScript | 5 | 1 | 0 | 2 | 4 |
| 547 | [app/resume/page.tsx](../app/resume/page.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 2 |
| 548 | [assets/art/optimize_mural.py](../assets/art/optimize_mural.py) | tooling | Python | 5 | 1 | 0 | 0 | 6 |
| 549 | [assets/dog-digital-double/steps/restore_sculpt_checkpoint.py](../assets/dog-digital-double/steps/restore_sculpt_checkpoint.py) | tooling | Python | 5 | 1 | 0 | 0 | 3 |
| 550 | [components/ui/accordion.tsx](../components/ui/accordion.tsx) | application | TypeScript | 5 | 1 | 0 | 4 | 72 |
| 551 | [components/ui/alert-dialog.tsx](../components/ui/alert-dialog.tsx) | application | TypeScript | 5 | 1 | 0 | 12 | 172 |
| 552 | [components/ui/alert.tsx](../components/ui/alert.tsx) | application | TypeScript | 5 | 1 | 0 | 4 | 69 |
| 553 | [components/ui/aspect-ratio.tsx](../components/ui/aspect-ratio.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 20 |
| 554 | [components/ui/avatar.tsx](../components/ui/avatar.tsx) | application | TypeScript | 5 | 1 | 0 | 6 | 100 |
| 555 | [components/ui/badge.tsx](../components/ui/badge.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 48 |
| 556 | [components/ui/bubble.tsx](../components/ui/bubble.tsx) | application | TypeScript | 5 | 1 | 0 | 4 | 120 |
| 557 | [components/ui/button-group.tsx](../components/ui/button-group.tsx) | application | TypeScript | 5 | 1 | 0 | 3 | 81 |
| 558 | [components/ui/card.tsx](../components/ui/card.tsx) | application | TypeScript | 5 | 1 | 0 | 7 | 94 |
| 559 | [components/ui/checkbox.tsx](../components/ui/checkbox.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 24 |
| 560 | [components/ui/collapsible.tsx](../components/ui/collapsible.tsx) | application | TypeScript | 5 | 1 | 0 | 3 | 16 |
| 561 | [components/ui/command.tsx](../components/ui/command.tsx) | application | TypeScript | 5 | 1 | 0 | 9 | 181 |
| 562 | [components/ui/context-menu.tsx](../components/ui/context-menu.tsx) | application | TypeScript | 5 | 1 | 0 | 15 | 254 |
| 563 | [components/ui/direction.tsx](../components/ui/direction.tsx) | application | TypeScript | 5 | 1 | 0 | 0 | 5 |
| 564 | [components/ui/empty.tsx](../components/ui/empty.tsx) | application | TypeScript | 5 | 1 | 0 | 6 | 95 |
| 565 | [components/ui/hover-card.tsx](../components/ui/hover-card.tsx) | application | TypeScript | 5 | 1 | 0 | 3 | 45 |
| 566 | [components/ui/item.tsx](../components/ui/item.tsx) | application | TypeScript | 5 | 1 | 0 | 10 | 187 |
| 567 | [components/ui/kbd.tsx](../components/ui/kbd.tsx) | application | TypeScript | 5 | 1 | 0 | 2 | 23 |
| 568 | [components/ui/marker.tsx](../components/ui/marker.tsx) | application | TypeScript | 5 | 1 | 0 | 3 | 65 |
| 569 | [components/ui/menubar.tsx](../components/ui/menubar.tsx) | application | TypeScript | 5 | 1 | 0 | 16 | 265 |
| 570 | [components/ui/message.tsx](../components/ui/message.tsx) | application | TypeScript | 5 | 1 | 0 | 6 | 84 |
| 571 | [components/ui/native-select.tsx](../components/ui/native-select.tsx) | application | TypeScript | 5 | 1 | 0 | 3 | 59 |
| 572 | [components/ui/navigation-menu.tsx](../components/ui/navigation-menu.tsx) | application | TypeScript | 5 | 1 | 0 | 8 | 160 |
| 573 | [components/ui/progress.tsx](../components/ui/progress.tsx) | application | TypeScript | 5 | 1 | 0 | 5 | 75 |
| 574 | [components/ui/radio-group.tsx](../components/ui/radio-group.tsx) | application | TypeScript | 5 | 1 | 0 | 2 | 33 |
| 575 | [components/ui/scroll-area.tsx](../components/ui/scroll-area.tsx) | application | TypeScript | 5 | 1 | 0 | 2 | 50 |
| 576 | [components/ui/select.tsx](../components/ui/select.tsx) | application | TypeScript | 5 | 1 | 0 | 9 | 189 |
| 577 | [components/ui/spinner.tsx](../components/ui/spinner.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 14 |
| 578 | [components/ui/switch.tsx](../components/ui/switch.tsx) | application | TypeScript | 5 | 1 | 0 | 1 | 28 |
| 579 | [components/ui/table.tsx](../components/ui/table.tsx) | application | TypeScript | 5 | 1 | 0 | 8 | 105 |
| 580 | [next.config.ts](../next.config.ts) | configuration | TypeScript | 5 | 1 | 0 | 0 | 3 |
| 581 | [scripts/finalize-blender-return.cjs](../scripts/finalize-blender-return.cjs) | tooling | JavaScript | 5 | 1 | 0 | 10 | 16 |
| 582 | [tests/astra-rain.test.cjs](../tests/astra-rain.test.cjs) | test | JavaScript | 5 | 1 | 0 | 2 | 11 |
| 583 | [tests/multiplayer-avatar.test.cjs](../tests/multiplayer-avatar.test.cjs) | test | JavaScript | 5 | 1 | 0 | 2 | 15 |
| 584 | [tests/painting-interaction.test.cjs](../tests/painting-interaction.test.cjs) | test | JavaScript | 5 | 1 | 0 | 32 | 41 |
| 585 | [tests/painting-speech.test.cjs](../tests/painting-speech.test.cjs) | test | JavaScript | 5 | 1 | 0 | 43 | 50 |
| 586 | [tests/vercel-trace.test.mjs](../tests/vercel-trace.test.mjs) | test | JavaScript | 5 | 1 | 0 | 2 | 22 |

## Non-Executable File Inventory

These files have no applicable control-flow complexity score. They are retained, not candidates for removal. Byte size alone does not establish browser cost.

| File | Kind | Bytes |
| --- | --- | ---: |
| [assets/cinematic/scene.json](../assets/cinematic/scene.json) | style/config/document | 13730339 |
| [assets/hero-candidates/angel.raw.glb](../assets/hero-candidates/angel.raw.glb) | asset/other | 8330576 |
| [public/assets/hero-v1/angel.glb](../public/assets/hero-v1/angel.glb) | asset/other | 8329360 |
| [assets/hero-candidates/angel.glb](../assets/hero-candidates/angel.glb) | asset/other | 8329360 |
| [public/assets/roaming-dog.glb](../public/assets/roaming-dog.glb) | asset/other | 7272524 |
| [assets/hero-candidates/monument.raw.glb](../assets/hero-candidates/monument.raw.glb) | asset/other | 6801372 |
| [public/assets/hero-v1/monument.glb](../public/assets/hero-v1/monument.glb) | asset/other | 6800840 |
| [assets/hero-candidates/monument.glb](../assets/hero-candidates/monument.glb) | asset/other | 6800840 |
| [assets/hero-candidates/dog.raw.glb](../assets/hero-candidates/dog.raw.glb) | asset/other | 6117608 |
| [public/assets/hero-v1/dog.glb](../public/assets/hero-v1/dog.glb) | asset/other | 6117224 |
| [assets/hero-candidates/dog.glb](../assets/hero-candidates/dog.glb) | asset/other | 6117224 |
| [public/assets/signature-v2/tart.glb](../public/assets/signature-v2/tart.glb) | asset/other | 5884488 |
| [assets/signature-candidates/atelier-tart.glb](../assets/signature-candidates/atelier-tart.glb) | asset/other | 5884488 |
| [assets/signature-candidates/atelier-tart.raw.glb](../assets/signature-candidates/atelier-tart.raw.glb) | asset/other | 5884068 |
| [assets/cinematic/original-score.wav](../assets/cinematic/original-score.wav) | asset/other | 5760044 |
| [public/assets/anime-angel.glb](../public/assets/anime-angel.glb) | asset/other | 5424876 |
| [assets/premium-candidates/copper-bakery-collectible.raw.glb](../assets/premium-candidates/copper-bakery-collectible.raw.glb) | asset/other | 5356892 |
| [public/assets/collectible-v1/copper-bakery.glb](../public/assets/collectible-v1/copper-bakery.glb) | asset/other | 5355996 |
| [assets/premium-candidates/copper-bakery-collectible.glb](../assets/premium-candidates/copper-bakery-collectible.glb) | asset/other | 5355996 |
| [assets/cinematic/KingdomTrailer.blend](../assets/cinematic/KingdomTrailer.blend) | asset/other | 5311137 |
| [public/assets/signature-v2/donut.glb](../public/assets/signature-v2/donut.glb) | asset/other | 5270328 |
| [assets/signature-candidates/atelier-donut.glb](../assets/signature-candidates/atelier-donut.glb) | asset/other | 5270328 |
| [assets/signature-candidates/atelier-donut.raw.glb](../assets/signature-candidates/atelier-donut.raw.glb) | asset/other | 5269924 |
| [public/assets/signature-v2/gelato.glb](../public/assets/signature-v2/gelato.glb) | asset/other | 5005184 |
| [assets/signature-candidates/atelier-gelato.glb](../assets/signature-candidates/atelier-gelato.glb) | asset/other | 5005184 |
| [assets/signature-candidates/atelier-gelato.raw.glb](../assets/signature-candidates/atelier-gelato.raw.glb) | asset/other | 5004792 |
| [public/assets/signature-v2/tea.glb](../public/assets/signature-v2/tea.glb) | asset/other | 4488760 |
| [assets/signature-candidates/atelier-tea.glb](../assets/signature-candidates/atelier-tea.glb) | asset/other | 4488760 |
| [assets/signature-candidates/atelier-tea.raw.glb](../assets/signature-candidates/atelier-tea.raw.glb) | asset/other | 4488392 |
| [public/assets/signature-v2/cotton.glb](../public/assets/signature-v2/cotton.glb) | asset/other | 4348436 |
| [assets/signature-candidates/atelier-cotton.glb](../assets/signature-candidates/atelier-cotton.glb) | asset/other | 4348436 |
| [assets/signature-candidates/atelier-cotton.raw.glb](../assets/signature-candidates/atelier-cotton.raw.glb) | asset/other | 4348112 |
| [public/assets/signature-v2/prism.glb](../public/assets/signature-v2/prism.glb) | asset/other | 4294672 |
| [assets/signature-candidates/atelier-prism.glb](../assets/signature-candidates/atelier-prism.glb) | asset/other | 4294672 |
| [assets/signature-candidates/atelier-prism.raw.glb](../assets/signature-candidates/atelier-prism.raw.glb) | asset/other | 4294336 |
| [public/assets/signature-v2/coffee.glb](../public/assets/signature-v2/coffee.glb) | asset/other | 4216340 |
| [assets/signature-candidates/atelier-coffee.glb](../assets/signature-candidates/atelier-coffee.glb) | asset/other | 4216340 |
| [assets/signature-candidates/atelier-coffee.raw.glb](../assets/signature-candidates/atelier-coffee.raw.glb) | asset/other | 4216016 |
| [public/assets/signature-v2/glider.glb](../public/assets/signature-v2/glider.glb) | asset/other | 4161380 |
| [assets/signature-candidates/atelier-glider.glb](../assets/signature-candidates/atelier-glider.glb) | asset/other | 4161380 |
| [assets/signature-candidates/atelier-glider.raw.glb](../assets/signature-candidates/atelier-glider.raw.glb) | asset/other | 4161064 |
| [public/assets/sah-suited-figure.glb](../public/assets/sah-suited-figure.glb) | asset/other | 4042156 |
| [public/assets/signature-v1/tart.glb](../public/assets/signature-v1/tart.glb) | asset/other | 4032996 |
| [assets/signature-candidates/tart.glb](../assets/signature-candidates/tart.glb) | asset/other | 4032996 |
| [assets/signature-candidates/tart.raw.glb](../assets/signature-candidates/tart.raw.glb) | asset/other | 4032596 |
| [public/assets/signature-v2/kite.glb](../public/assets/signature-v2/kite.glb) | asset/other | 4004332 |
| [assets/signature-candidates/atelier-kite.glb](../assets/signature-candidates/atelier-kite.glb) | asset/other | 4004332 |
| [assets/signature-candidates/atelier-kite.raw.glb](../assets/signature-candidates/atelier-kite.raw.glb) | asset/other | 4003980 |
| [public/assets/signature-v1/donut.glb](../public/assets/signature-v1/donut.glb) | asset/other | 3373820 |
| [assets/signature-candidates/donut.glb](../assets/signature-candidates/donut.glb) | asset/other | 3373820 |
| [assets/signature-candidates/donut.raw.glb](../assets/signature-candidates/donut.raw.glb) | asset/other | 3373436 |
| [public/assets/signature-v1/gelato.glb](../public/assets/signature-v1/gelato.glb) | asset/other | 3260468 |
| [assets/signature-candidates/gelato.glb](../assets/signature-candidates/gelato.glb) | asset/other | 3260468 |
| [assets/signature-candidates/gelato.raw.glb](../assets/signature-candidates/gelato.raw.glb) | asset/other | 3260092 |
| [public/assets/world-v1/terrain/copper.glb](../public/assets/world-v1/terrain/copper.glb) | asset/other | 3091856 |
| [assets/world-candidates/terrain/copper.glb](../assets/world-candidates/terrain/copper.glb) | asset/other | 3091856 |
| [public/assets/world-v1/terrain/petal.glb](../public/assets/world-v1/terrain/petal.glb) | asset/other | 3058884 |
| [assets/world-candidates/terrain/petal.glb](../assets/world-candidates/terrain/petal.glb) | asset/other | 3058884 |
| [public/assets/world-v1/terrain/prism.glb](../public/assets/world-v1/terrain/prism.glb) | asset/other | 3003232 |
| [assets/world-candidates/terrain/prism.glb](../assets/world-candidates/terrain/prism.glb) | asset/other | 3003232 |
| [public/assets/world-v1/terrain/solstice.glb](../public/assets/world-v1/terrain/solstice.glb) | asset/other | 2995996 |
| [assets/world-candidates/terrain/solstice.glb](../assets/world-candidates/terrain/solstice.glb) | asset/other | 2995996 |
| [public/assets/world-v1/terrain/cloud.glb](../public/assets/world-v1/terrain/cloud.glb) | asset/other | 2968292 |
| [assets/world-candidates/terrain/cloud.glb](../assets/world-candidates/terrain/cloud.glb) | asset/other | 2968292 |
| [public/assets/world-v1/terrain/garden.glb](../public/assets/world-v1/terrain/garden.glb) | asset/other | 2872152 |
| [assets/world-candidates/terrain/garden.glb](../assets/world-candidates/terrain/garden.glb) | asset/other | 2872152 |
| [public/assets/signature-v1/cotton.glb](../public/assets/signature-v1/cotton.glb) | asset/other | 2511512 |
| [assets/signature-candidates/cotton.glb](../assets/signature-candidates/cotton.glb) | asset/other | 2511512 |
| [assets/signature-candidates/cotton.raw.glb](../assets/signature-candidates/cotton.raw.glb) | asset/other | 2511208 |
| [public/assets/signature-v1/kite.glb](../public/assets/signature-v1/kite.glb) | asset/other | 2476436 |
| [assets/signature-candidates/kite.glb](../assets/signature-candidates/kite.glb) | asset/other | 2476436 |
| [assets/signature-candidates/kite.raw.glb](../assets/signature-candidates/kite.raw.glb) | asset/other | 2476108 |
| [public/assets/planets/blender-final/copper.glb](../public/assets/planets/blender-final/copper.glb) | asset/other | 2432828 |
| [public/assets/signature-v1/glider.glb](../public/assets/signature-v1/glider.glb) | asset/other | 2421952 |
| [assets/signature-candidates/glider.glb](../assets/signature-candidates/glider.glb) | asset/other | 2421952 |
| [assets/signature-candidates/glider.raw.glb](../assets/signature-candidates/glider.raw.glb) | asset/other | 2421652 |
| [public/assets/signature-v1/tea.glb](../public/assets/signature-v1/tea.glb) | asset/other | 2407060 |
| [assets/signature-candidates/tea.glb](../assets/signature-candidates/tea.glb) | asset/other | 2407060 |
| [assets/signature-candidates/tea.raw.glb](../assets/signature-candidates/tea.raw.glb) | asset/other | 2406724 |
| [public/assets/planets/blender-final/petal.glb](../public/assets/planets/blender-final/petal.glb) | asset/other | 2399352 |
| [public/assets/signature-v1/prism.glb](../public/assets/signature-v1/prism.glb) | asset/other | 2380180 |
| [assets/signature-candidates/prism.glb](../assets/signature-candidates/prism.glb) | asset/other | 2380180 |
| [assets/signature-candidates/prism.raw.glb](../assets/signature-candidates/prism.raw.glb) | asset/other | 2379864 |
| [public/assets/world-v1/terrain/ai-research.glb](../public/assets/world-v1/terrain/ai-research.glb) | asset/other | 2374472 |
| [assets/world-candidates/terrain/ai-research.glb](../assets/world-candidates/terrain/ai-research.glb) | asset/other | 2374472 |
| [public/assets/world-v1/terrain/project-foundry.glb](../public/assets/world-v1/terrain/project-foundry.glb) | asset/other | 2368452 |
| [assets/world-candidates/terrain/project-foundry.glb](../assets/world-candidates/terrain/project-foundry.glb) | asset/other | 2368452 |
| [public/assets/world-v1/terrain/skills-technology.glb](../public/assets/world-v1/terrain/skills-technology.glb) | asset/other | 2361680 |
| [assets/world-candidates/terrain/skills-technology.glb](../assets/world-candidates/terrain/skills-technology.glb) | asset/other | 2361680 |
| [public/assets/planets/blender-final/prism.glb](../public/assets/planets/blender-final/prism.glb) | asset/other | 2350804 |
| [public/assets/planets/blender-final/solstice.glb](../public/assets/planets/blender-final/solstice.glb) | asset/other | 2343572 |
| [assets/art/workshop-mural-source.png](../assets/art/workshop-mural-source.png) | asset/other | 2334690 |
| [public/assets/signature-v1/coffee.glb](../public/assets/signature-v1/coffee.glb) | asset/other | 2331160 |
| [assets/signature-candidates/coffee.glb](../assets/signature-candidates/coffee.glb) | asset/other | 2331160 |
| [assets/signature-candidates/coffee.raw.glb](../assets/signature-candidates/coffee.raw.glb) | asset/other | 2330852 |
| [public/assets/planets/blender-final/cloud.glb](../public/assets/planets/blender-final/cloud.glb) | asset/other | 2307400 |
| [public/assets/planets/blender-final/garden.glb](../public/assets/planets/blender-final/garden.glb) | asset/other | 2213960 |
| [public/assets/sah-gold-head.glb](../public/assets/sah-gold-head.glb) | asset/other | 2209136 |
| [assets/world-candidates/terrain-raw/copper.glb](../assets/world-candidates/terrain-raw/copper.glb) | asset/other | 2096116 |
| [public/assets/signature-v2/gelato-ao.png](../public/assets/signature-v2/gelato-ao.png) | asset/other | 2016614 |
| [assets/signature-candidates/atelier-gelato-ao.png](../assets/signature-candidates/atelier-gelato-ao.png) | asset/other | 2016614 |
| [public/assets/collectible-v1/packet-press.glb](../public/assets/collectible-v1/packet-press.glb) | asset/other | 2008320 |
| [assets/premium-candidates/packet-press-collectible.glb](../assets/premium-candidates/packet-press-collectible.glb) | asset/other | 2008320 |
| [assets/premium-candidates/packet-press-collectible.raw.glb](../assets/premium-candidates/packet-press-collectible.raw.glb) | asset/other | 2005316 |
| [public/assets/signature-v2/prism-ao.png](../public/assets/signature-v2/prism-ao.png) | asset/other | 1981548 |
| [assets/signature-candidates/atelier-prism-ao.png](../assets/signature-candidates/atelier-prism-ao.png) | asset/other | 1981548 |
| [public/assets/signature-v2/glider-ao.png](../public/assets/signature-v2/glider-ao.png) | asset/other | 1970571 |
| [assets/signature-candidates/atelier-glider-ao.png](../assets/signature-candidates/atelier-glider-ao.png) | asset/other | 1970571 |
| [public/assets/signature-v2/donut-ao.png](../public/assets/signature-v2/donut-ao.png) | asset/other | 1959384 |
| [assets/signature-candidates/atelier-donut-ao.png](../assets/signature-candidates/atelier-donut-ao.png) | asset/other | 1959384 |
| [public/assets/signature-v2/kite-ao.png](../public/assets/signature-v2/kite-ao.png) | asset/other | 1954968 |
| [assets/signature-candidates/atelier-kite-ao.png](../assets/signature-candidates/atelier-kite-ao.png) | asset/other | 1954968 |
| [public/assets/signature-v2/tart-ao.png](../public/assets/signature-v2/tart-ao.png) | asset/other | 1953993 |
| [assets/signature-candidates/atelier-tart-ao.png](../assets/signature-candidates/atelier-tart-ao.png) | asset/other | 1953993 |
| [public/assets/signature-v2/tea-ao.png](../public/assets/signature-v2/tea-ao.png) | asset/other | 1946229 |
| [assets/signature-candidates/atelier-tea-ao.png](../assets/signature-candidates/atelier-tea-ao.png) | asset/other | 1946229 |
| [public/assets/signature-v2/coffee-ao.png](../public/assets/signature-v2/coffee-ao.png) | asset/other | 1915065 |
| [assets/signature-candidates/atelier-coffee-ao.png](../assets/signature-candidates/atelier-coffee-ao.png) | asset/other | 1915065 |
| [assets/world-candidates/craft-library-final.png](../assets/world-candidates/craft-library-final.png) | asset/other | 1914519 |
| [public/assets/signature-v2/cotton-ao.png](../public/assets/signature-v2/cotton-ao.png) | asset/other | 1906433 |
| [assets/signature-candidates/atelier-cotton-ao.png](../assets/signature-candidates/atelier-cotton-ao.png) | asset/other | 1906433 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-workshop-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-workshop-desktop.png) | asset/other | 1874655 |
| [assets/premium-candidates/baseline-workshop-desktop.png](../assets/premium-candidates/baseline-workshop-desktop.png) | asset/other | 1873425 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-workshop-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-workshop-desktop.png) | asset/other | 1872838 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-workshop-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-workshop-desktop.png) | asset/other | 1871892 |
| [assets/premium-candidates/candidate-workshop-desktop.png](../assets/premium-candidates/candidate-workshop-desktop.png) | asset/other | 1871107 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-workshop-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-workshop-desktop.png) | asset/other | 1867991 |
| [assets/world-candidates/terrain-raw/petal.glb](../assets/world-candidates/terrain-raw/petal.glb) | asset/other | 1859320 |
| [assets/world-candidates/terrain-raw/prism.glb](../assets/world-candidates/terrain-raw/prism.glb) | asset/other | 1850756 |
| [assets/world-candidates/terrain-raw/solstice.glb](../assets/world-candidates/terrain-raw/solstice.glb) | asset/other | 1848216 |
| [assets/world-candidates/terrain-raw/cloud.glb](../assets/world-candidates/terrain-raw/cloud.glb) | asset/other | 1838324 |
| [public/assets/copper-bakery.glb](../public/assets/copper-bakery.glb) | asset/other | 1835524 |
| [assets/world-candidates/terrain-raw/garden.glb](../assets/world-candidates/terrain-raw/garden.glb) | asset/other | 1826068 |
| [public/assets/planets/blender-final/project-foundry.glb](../public/assets/planets/blender-final/project-foundry.glb) | asset/other | 1772140 |
| [public/assets/planets/blender-final/ai-research.glb](../public/assets/planets/blender-final/ai-research.glb) | asset/other | 1769868 |
| [public/assets/planets/blender-final/skills-technology.glb](../public/assets/planets/blender-final/skills-technology.glb) | asset/other | 1762132 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-plaza-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-plaza-desktop.png) | asset/other | 1697297 |
| [assets/premium-candidates/candidate-plaza-desktop.png](../assets/premium-candidates/candidate-plaza-desktop.png) | asset/other | 1696141 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-plaza-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-plaza-desktop.png) | asset/other | 1695820 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-plaza-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-plaza-desktop.png) | asset/other | 1695306 |
| [assets/premium-candidates/baseline-plaza-desktop.png](../assets/premium-candidates/baseline-plaza-desktop.png) | asset/other | 1694280 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-plaza-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-plaza-desktop.png) | asset/other | 1694169 |
| [public/assets/studio_small_03_1k.hdr](../public/assets/studio_small_03_1k.hdr) | asset/other | 1686299 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-lantern-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-lantern-desktop.png) | asset/other | 1623779 |
| [assets/premium-candidates/baseline-lantern-desktop.png](../assets/premium-candidates/baseline-lantern-desktop.png) | asset/other | 1623517 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-lantern-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-lantern-desktop.png) | asset/other | 1623216 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-lantern-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-lantern-desktop.png) | asset/other | 1618170 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-lantern-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-lantern-desktop.png) | asset/other | 1617901 |
| [assets/premium-candidates/candidate-lantern-desktop.png](../assets/premium-candidates/candidate-lantern-desktop.png) | asset/other | 1617601 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-character-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-character-desktop.png) | asset/other | 1569220 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-character-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-character-desktop.png) | asset/other | 1567722 |
| [assets/premium-candidates/baseline-character-desktop.png](../assets/premium-candidates/baseline-character-desktop.png) | asset/other | 1566493 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-character-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-character-desktop.png) | asset/other | 1552144 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-character-desktop.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-character-desktop.png) | asset/other | 1546546 |
| [assets/premium-candidates/candidate-character-desktop.png](../assets/premium-candidates/candidate-character-desktop.png) | asset/other | 1544477 |
| [assets/world-candidates/terrain-raw/project-foundry.glb](../assets/world-candidates/terrain-raw/project-foundry.glb) | asset/other | 1424148 |
| [assets/world-candidates/terrain-raw/skills-technology.glb](../assets/world-candidates/terrain-raw/skills-technology.glb) | asset/other | 1413224 |
| [assets/world-candidates/terrain-raw/ai-research.glb](../assets/world-candidates/terrain-raw/ai-research.glb) | asset/other | 1400920 |
| [assets/signature-candidates/atelier-donut-finished.png](../assets/signature-candidates/atelier-donut-finished.png) | asset/other | 1365056 |
| [public/assets/planets/blender-final/copper-scene-ao.png](../public/assets/planets/blender-final/copper-scene-ao.png) | asset/other | 1355440 |
| [assets/world-candidates/terrain/copper-contact-ao.png](../assets/world-candidates/terrain/copper-contact-ao.png) | asset/other | 1339722 |
| [assets/premium-candidates/architecture-candidate.png](../assets/premium-candidates/architecture-candidate.png) | asset/other | 1334638 |
| [assets/signature-candidates/atelier-donut-shape.png](../assets/signature-candidates/atelier-donut-shape.png) | asset/other | 1325197 |
| [public/assets/planets/blender-final/petal-scene-ao.png](../public/assets/planets/blender-final/petal-scene-ao.png) | asset/other | 1320950 |
| [assets/premium-candidates/architecture-baseline.png](../assets/premium-candidates/architecture-baseline.png) | asset/other | 1306840 |
| [assets/world-candidates/terrain/petal-contact-ao.png](../assets/world-candidates/terrain/petal-contact-ao.png) | asset/other | 1305025 |
| [public/assets/planets/blender-final/prism-scene-ao.png](../public/assets/planets/blender-final/prism-scene-ao.png) | asset/other | 1274525 |
| [public/assets/planets/blender-final/solstice-scene-ao.png](../public/assets/planets/blender-final/solstice-scene-ao.png) | asset/other | 1264354 |
| [assets/world-candidates/terrain/prism-contact-ao.png](../assets/world-candidates/terrain/prism-contact-ao.png) | asset/other | 1255420 |
| [assets/world-candidates/terrain/solstice-contact-ao.png](../assets/world-candidates/terrain/solstice-contact-ao.png) | asset/other | 1244419 |
| [public/assets/planets/blender-final/cloud-scene-ao.png](../public/assets/planets/blender-final/cloud-scene-ao.png) | asset/other | 1242916 |
| [assets/world-candidates/terrain/cloud-contact-ao.png](../assets/world-candidates/terrain/cloud-contact-ao.png) | asset/other | 1231328 |
| [public/assets/world-v1/kingdom-world-kit.glb](../public/assets/world-v1/kingdom-world-kit.glb) | asset/other | 1186004 |
| [assets/world-candidates/kingdom-world-kit.glb](../assets/world-candidates/kingdom-world-kit.glb) | asset/other | 1186004 |
| [assets/hero-candidates/dog-before.png](../assets/hero-candidates/dog-before.png) | asset/other | 1175374 |
| [assets/hero-candidates/dog-after.png](../assets/hero-candidates/dog-after.png) | asset/other | 1164595 |
| [public/assets/planets/blender-final/garden-scene-ao.png](../public/assets/planets/blender-final/garden-scene-ao.png) | asset/other | 1153477 |
| [assets/world-candidates/terrain/garden-contact-ao.png](../assets/world-candidates/terrain/garden-contact-ao.png) | asset/other | 1139407 |
| [assets/world-candidates/terrain-copper-render.png](../assets/world-candidates/terrain-copper-render.png) | asset/other | 1111588 |
| [assets/hero-candidates/monument-after.png](../assets/hero-candidates/monument-after.png) | asset/other | 1089514 |
| [public/assets/planets/blender-final/ai-research-scene-ao.png](../public/assets/planets/blender-final/ai-research-scene-ao.png) | asset/other | 1084880 |
| [public/assets/planets/blender-final/project-foundry-scene-ao.png](../public/assets/planets/blender-final/project-foundry-scene-ao.png) | asset/other | 1083420 |
| [assets/world-candidates/terrain-source/solstice.glb](../assets/world-candidates/terrain-source/solstice.glb) | asset/other | 1082224 |
| [assets/world-candidates/terrain-source/prism.glb](../assets/world-candidates/terrain-source/prism.glb) | asset/other | 1082216 |
| [assets/world-candidates/terrain-source/copper.glb](../assets/world-candidates/terrain-source/copper.glb) | asset/other | 1082216 |
| [assets/world-candidates/terrain-source/cloud.glb](../assets/world-candidates/terrain-source/cloud.glb) | asset/other | 1082216 |
| [assets/world-candidates/terrain-source/garden.glb](../assets/world-candidates/terrain-source/garden.glb) | asset/other | 1082204 |
| [assets/world-candidates/terrain-source/petal.glb](../assets/world-candidates/terrain-source/petal.glb) | asset/other | 1082196 |
| [assets/planets/source/solstice.glb](../assets/planets/source/solstice.glb) | asset/other | 1082160 |
| [assets/planets/source/prism.glb](../assets/planets/source/prism.glb) | asset/other | 1082152 |
| [assets/planets/source/copper.glb](../assets/planets/source/copper.glb) | asset/other | 1082152 |
| [assets/planets/source/cloud.glb](../assets/planets/source/cloud.glb) | asset/other | 1082152 |
| [assets/planets/source/garden.glb](../assets/planets/source/garden.glb) | asset/other | 1082144 |
| [assets/planets/source/petal.glb](../assets/planets/source/petal.glb) | asset/other | 1082132 |
| [assets/world-candidates/terrain/ai-research-contact-ao.png](../assets/world-candidates/terrain/ai-research-contact-ao.png) | asset/other | 1075511 |
| [assets/hero-candidates/monument-before.png](../assets/hero-candidates/monument-before.png) | asset/other | 1074752 |
| [public/assets/planets/blender-final/skills-technology-scene-ao.png](../public/assets/planets/blender-final/skills-technology-scene-ao.png) | asset/other | 1074088 |
| [public/assets/planets/petal.glb](../public/assets/planets/petal.glb) | asset/other | 1071372 |
| [assets/world-candidates/terrain/project-foundry-contact-ao.png](../assets/world-candidates/terrain/project-foundry-contact-ao.png) | asset/other | 1071291 |
| [public/assets/planets/copper.glb](../public/assets/planets/copper.glb) | asset/other | 1070272 |
| [public/assets/planets/solstice.glb](../public/assets/planets/solstice.glb) | asset/other | 1069384 |
| [public/assets/planets/prism.glb](../public/assets/planets/prism.glb) | asset/other | 1066536 |
| [assets/world-candidates/terrain/skills-technology-contact-ao.png](../assets/world-candidates/terrain/skills-technology-contact-ao.png) | asset/other | 1061674 |
| [public/assets/planets/cloud.glb](../public/assets/planets/cloud.glb) | asset/other | 1057096 |
| [public/assets/planets/garden.glb](../public/assets/planets/garden.glb) | asset/other | 1053580 |
| [assets/hero-candidates/angel-after.png](../assets/hero-candidates/angel-after.png) | asset/other | 1048456 |
| [assets/hero-candidates/angel-before.png](../assets/hero-candidates/angel-before.png) | asset/other | 1042352 |
| [assets/world-candidates/craft-assembly.png](../assets/world-candidates/craft-assembly.png) | asset/other | 1032110 |
| [public/assets/collectible-v1/copper-bakery-ao.png](../public/assets/collectible-v1/copper-bakery-ao.png) | asset/other | 963052 |
| [assets/premium-candidates/copper-bakery-collectible-ao.png](../assets/premium-candidates/copper-bakery-collectible-ao.png) | asset/other | 963052 |
| [assets/world-candidates/trees.raw.glb](../assets/world-candidates/trees.raw.glb) | asset/other | 956200 |
| [assets/world-candidates/trees-before.png](../assets/world-candidates/trees-before.png) | asset/other | 937101 |
| [assets/world-candidates/trees-after.png](../assets/world-candidates/trees-after.png) | asset/other | 934352 |
| [public/assets/world-finish/motherboard-scene-ao.png](../public/assets/world-finish/motherboard-scene-ao.png) | asset/other | 900192 |
| [public/assets/signature-v1/tart-ao.png](../public/assets/signature-v1/tart-ao.png) | asset/other | 816081 |
| [assets/signature-candidates/tart-ao.png](../assets/signature-candidates/tart-ao.png) | asset/other | 816081 |
| [public/assets/signature-v1/cotton-ao.png](../public/assets/signature-v1/cotton-ao.png) | asset/other | 745512 |
| [assets/signature-candidates/cotton-ao.png](../assets/signature-candidates/cotton-ao.png) | asset/other | 745512 |
| [public/assets/signature-v1/gelato-ao.png](../public/assets/signature-v1/gelato-ao.png) | asset/other | 740596 |
| [assets/signature-candidates/gelato-ao.png](../assets/signature-candidates/gelato-ao.png) | asset/other | 740596 |
| [public/assets/signature-v1/prism-ao.png](../public/assets/signature-v1/prism-ao.png) | asset/other | 732599 |
| [assets/signature-candidates/prism-ao.png](../assets/signature-candidates/prism-ao.png) | asset/other | 732599 |
| [public/assets/signature-v1/glider-ao.png](../public/assets/signature-v1/glider-ao.png) | asset/other | 725032 |
| [assets/signature-candidates/glider-ao.png](../assets/signature-candidates/glider-ao.png) | asset/other | 725032 |
| [public/assets/signature-v1/tea-ao.png](../public/assets/signature-v1/tea-ao.png) | asset/other | 718329 |
| [assets/signature-candidates/tea-ao.png](../assets/signature-candidates/tea-ao.png) | asset/other | 718329 |
| [public/assets/premium-v1/kingdom-world-kit.glb](../public/assets/premium-v1/kingdom-world-kit.glb) | asset/other | 717608 |
| [assets/premium-candidates/kingdom-world-kit.glb](../assets/premium-candidates/kingdom-world-kit.glb) | asset/other | 717608 |
| [assets/world-candidates/terrain-source/project-foundry.glb](../assets/world-candidates/terrain-source/project-foundry.glb) | asset/other | 707444 |
| [assets/world-candidates/terrain-source/ai-research.glb](../assets/world-candidates/terrain-source/ai-research.glb) | asset/other | 707436 |
| [assets/world-candidates/terrain-source/skills-technology.glb](../assets/world-candidates/terrain-source/skills-technology.glb) | asset/other | 707424 |
| [assets/planets/source/project-foundry.glb](../assets/planets/source/project-foundry.glb) | asset/other | 707380 |
| [assets/planets/source/ai-research.glb](../assets/planets/source/ai-research.glb) | asset/other | 707372 |
| [assets/planets/source/skills-technology.glb](../assets/planets/source/skills-technology.glb) | asset/other | 707356 |
| [public/assets/signature-v1/kite-ao.png](../public/assets/signature-v1/kite-ao.png) | asset/other | 701186 |
| [assets/signature-candidates/kite-ao.png](../assets/signature-candidates/kite-ao.png) | asset/other | 701186 |
| [public/assets/signature-v1/coffee-ao.png](../public/assets/signature-v1/coffee-ao.png) | asset/other | 699853 |
| [assets/signature-candidates/coffee-ao.png](../assets/signature-candidates/coffee-ao.png) | asset/other | 699853 |
| [public/assets/signature-v1/donut-ao.png](../public/assets/signature-v1/donut-ao.png) | asset/other | 695802 |
| [assets/signature-candidates/donut-ao.png](../assets/signature-candidates/donut-ao.png) | asset/other | 695802 |
| [public/assets/planets/project-foundry.glb](../public/assets/planets/project-foundry.glb) | asset/other | 681920 |
| [public/assets/planets/skills-technology.glb](../public/assets/planets/skills-technology.glb) | asset/other | 679844 |
| [public/assets/planets/ai-research.glb](../public/assets/planets/ai-research.glb) | asset/other | 678992 |
| [public/assets/world-v1/craft-kit.glb](../public/assets/world-v1/craft-kit.glb) | asset/other | 661856 |
| [assets/world-candidates/craft-kit.glb](../assets/world-candidates/craft-kit.glb) | asset/other | 661856 |
| [public/assets/world-finish/motherboard-contact.png](../public/assets/world-finish/motherboard-contact.png) | asset/other | 616014 |
| [public/assets/copper-bakery-ao.png](../public/assets/copper-bakery-ao.png) | asset/other | 561523 |
| [public/assets/kingdom-world-kit.glb](../public/assets/kingdom-world-kit.glb) | asset/other | 542596 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-workshop-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-workshop-mobile.png) | asset/other | 523567 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-workshop-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-workshop-mobile.png) | asset/other | 523449 |
| [assets/premium-candidates/baseline-workshop-mobile.png](../assets/premium-candidates/baseline-workshop-mobile.png) | asset/other | 523279 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-workshop-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-workshop-mobile.png) | asset/other | 521282 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-workshop-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-workshop-mobile.png) | asset/other | 521070 |
| [assets/premium-candidates/candidate-workshop-mobile.png](../assets/premium-candidates/candidate-workshop-mobile.png) | asset/other | 520588 |
| [public/assets/premium-v1/stone-normal.png](../public/assets/premium-v1/stone-normal.png) | asset/other | 515700 |
| [assets/premium-candidates/stone-normal.png](../assets/premium-candidates/stone-normal.png) | asset/other | 515700 |
| [public/assets/packet-press.glb](../public/assets/packet-press.glb) | asset/other | 482120 |
| [public/assets/world-finish/timber-normal.png](../public/assets/world-finish/timber-normal.png) | asset/other | 463383 |
| [public/assets/world-finish/brushed-normal.png](../public/assets/world-finish/brushed-normal.png) | asset/other | 455380 |
| [public/assets/world-finish/stone-normal.png](../public/assets/world-finish/stone-normal.png) | asset/other | 451944 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-plaza-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-plaza-mobile.png) | asset/other | 444859 |
| [assets/premium-candidates/candidate-plaza-mobile.png](../assets/premium-candidates/candidate-plaza-mobile.png) | asset/other | 444612 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-plaza-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-plaza-mobile.png) | asset/other | 444587 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-plaza-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-plaza-mobile.png) | asset/other | 440347 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-plaza-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-plaza-mobile.png) | asset/other | 440212 |
| [assets/premium-candidates/baseline-plaza-mobile.png](../assets/premium-candidates/baseline-plaza-mobile.png) | asset/other | 440167 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-character-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-character-mobile.png) | asset/other | 435297 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-character-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-character-mobile.png) | asset/other | 435267 |
| [assets/premium-candidates/baseline-character-mobile.png](../assets/premium-candidates/baseline-character-mobile.png) | asset/other | 435037 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-character-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-character-mobile.png) | asset/other | 434914 |
| [assets/premium-candidates/candidate-character-mobile.png](../assets/premium-candidates/candidate-character-mobile.png) | asset/other | 434224 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-character-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-character-mobile.png) | asset/other | 433229 |
| [package-lock.json](../package-lock.json) | style/config/document | 416733 |
| [public/assets/life-v1/life-kit.glb](../public/assets/life-v1/life-kit.glb) | asset/other | 413076 |
| [assets/street-life/life-kit.glb](../assets/street-life/life-kit.glb) | asset/other | 413076 |
| [Pasted Image](../Pasted%20Image) | asset/other | 410750 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-lantern-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/baseline-lantern-mobile.png) | asset/other | 396806 |
| [assets/premium-candidates/baseline-lantern-mobile.png](../assets/premium-candidates/baseline-lantern-mobile.png) | asset/other | 396773 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-lantern-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/baseline-lantern-mobile.png) | asset/other | 396612 |
| [assets/premium-candidates/candidate-lantern-mobile.png](../assets/premium-candidates/candidate-lantern-mobile.png) | asset/other | 396205 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-lantern-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/candidate-lantern-mobile.png) | asset/other | 396049 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-lantern-mobile.png](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/candidate-lantern-mobile.png) | asset/other | 396041 |
| [public/assets/architecture-ceramic-relief.png](../public/assets/architecture-ceramic-relief.png) | asset/other | 364244 |
| [public/assets/world-finish/ceramic-normal.png](../public/assets/world-finish/ceramic-normal.png) | asset/other | 354320 |
| [public/assets/world-asphalt-relief.png](../public/assets/world-asphalt-relief.png) | asset/other | 350541 |
| [assets/world-candidates/terrain-raw/copper-self-ao.png](../assets/world-candidates/terrain-raw/copper-self-ao.png) | asset/other | 344068 |
| [public/assets/architecture-brushed-relief.png](../public/assets/architecture-brushed-relief.png) | asset/other | 331929 |
| [public/assets/architecture-stone-relief.png](../public/assets/architecture-stone-relief.png) | asset/other | 308652 |
| [assets/blender/PacketPress.blend](../assets/blender/PacketPress.blend) | asset/other | 300247 |
| [public/assets/architecture-timber-relief.png](../public/assets/architecture-timber-relief.png) | asset/other | 295085 |
| [public/assets/premium-v1/ceramic-normal.png](../public/assets/premium-v1/ceramic-normal.png) | asset/other | 291124 |
| [assets/premium-candidates/ceramic-normal.png](../assets/premium-candidates/ceramic-normal.png) | asset/other | 291124 |
| [public/assets/premium-v1/timber-normal.png](../public/assets/premium-v1/timber-normal.png) | asset/other | 278523 |
| [assets/premium-candidates/timber-normal.png](../assets/premium-candidates/timber-normal.png) | asset/other | 278523 |
| [public/assets/premium-v1/brushed-normal.png](../public/assets/premium-v1/brushed-normal.png) | asset/other | 278044 |
| [assets/premium-candidates/brushed-normal.png](../assets/premium-candidates/brushed-normal.png) | asset/other | 278044 |
| [public/resume-sahil.pdf](../public/resume-sahil.pdf) | asset/other | 252132 |
| [public/assets/resume-book/page-2.webp](../public/assets/resume-book/page-2.webp) | asset/other | 248710 |
| [public/assets/resume-book/page-3.webp](../public/assets/resume-book/page-3.webp) | asset/other | 232982 |
| [public/assets/resume-book/page-1.webp](../public/assets/resume-book/page-1.webp) | asset/other | 231556 |
| [public/assets/workshop-ambient-forecourt.png](../public/assets/workshop-ambient-forecourt.png) | asset/other | 202042 |
| [public/assets/premium-v1/stone-roughness.png](../public/assets/premium-v1/stone-roughness.png) | asset/other | 186843 |
| [assets/premium-candidates/stone-roughness.png](../assets/premium-candidates/stone-roughness.png) | asset/other | 186843 |
| [public/assets/workshop-ambient-deck.png](../public/assets/workshop-ambient-deck.png) | asset/other | 184104 |
| [public/assets/premium-v1/brushed-roughness.png](../public/assets/premium-v1/brushed-roughness.png) | asset/other | 178547 |
| [assets/premium-candidates/brushed-roughness.png](../assets/premium-candidates/brushed-roughness.png) | asset/other | 178547 |
| [public/assets/premium-v1/ceramic-roughness.png](../public/assets/premium-v1/ceramic-roughness.png) | asset/other | 154807 |
| [assets/premium-candidates/ceramic-roughness.png](../assets/premium-candidates/ceramic-roughness.png) | asset/other | 154807 |
| [public/assets/workshop-ambient-wall.png](../public/assets/workshop-ambient-wall.png) | asset/other | 150295 |
| [public/assets/workshop-mural.webp](../public/assets/workshop-mural.webp) | asset/other | 149858 |
| [public/assets/premium-v1/timber-roughness.png](../public/assets/premium-v1/timber-roughness.png) | asset/other | 132279 |
| [assets/premium-candidates/timber-roughness.png](../assets/premium-candidates/timber-roughness.png) | asset/other | 132279 |
| [assets/world-candidates/terrain-raw/project-foundry-self-ao.png](../assets/world-candidates/terrain-raw/project-foundry-self-ao.png) | asset/other | 127070 |
| [public/assets/premium-v1/stone-color.png](../public/assets/premium-v1/stone-color.png) | asset/other | 126962 |
| [assets/premium-candidates/stone-color.png](../assets/premium-candidates/stone-color.png) | asset/other | 126962 |
| [public/assets/premium-v1/architecture-kit.glb](../public/assets/premium-v1/architecture-kit.glb) | asset/other | 116020 |
| [assets/premium-candidates/architecture-kit.glb](../assets/premium-candidates/architecture-kit.glb) | asset/other | 116020 |
| [assets/world-candidates/terrain-raw/skills-technology-self-ao.png](../assets/world-candidates/terrain-raw/skills-technology-self-ao.png) | asset/other | 113303 |
| [assets/world-candidates/terrain-raw/petal-self-ao.png](../assets/world-candidates/terrain-raw/petal-self-ao.png) | asset/other | 105546 |
| [public/assets/premium-v1/timber-color.png](../public/assets/premium-v1/timber-color.png) | asset/other | 105409 |
| [assets/premium-candidates/timber-color.png](../assets/premium-candidates/timber-color.png) | asset/other | 105409 |
| [assets/world-candidates/terrain-raw/prism-self-ao.png](../assets/world-candidates/terrain-raw/prism-self-ao.png) | asset/other | 103026 |
| [assets/world-candidates/terrain-raw/ai-research-self-ao.png](../assets/world-candidates/terrain-raw/ai-research-self-ao.png) | asset/other | 102047 |
| [assets/world-candidates/terrain-raw/cloud-self-ao.png](../assets/world-candidates/terrain-raw/cloud-self-ao.png) | asset/other | 101443 |
| [assets/world-candidates/terrain-raw/solstice-self-ao.png](../assets/world-candidates/terrain-raw/solstice-self-ao.png) | asset/other | 96728 |
| [assets/world-candidates/terrain-raw/garden-self-ao.png](../assets/world-candidates/terrain-raw/garden-self-ao.png) | asset/other | 93408 |
| [public/assets/premium-v1/brushed-color.png](../public/assets/premium-v1/brushed-color.png) | asset/other | 86446 |
| [assets/premium-candidates/brushed-color.png](../assets/premium-candidates/brushed-color.png) | asset/other | 86446 |
| [public/assets/premium-v1/ceramic-color.png](../public/assets/premium-v1/ceramic-color.png) | asset/other | 77008 |
| [assets/premium-candidates/ceramic-color.png](../assets/premium-candidates/ceramic-color.png) | asset/other | 77008 |
| [public/assets/architecture-kit.glb](../public/assets/architecture-kit.glb) | asset/other | 71828 |
| [assets/fonts/helvetiker_regular.typeface.json](../assets/fonts/helvetiker_regular.typeface.json) | style/config/document | 63182 |
| [public/assets/resume-book/resume.pdf](../public/assets/resume-book/resume.pdf) | asset/other | 63131 |
| [Sahil_Upadhyay_Resume_3pages(4).pdf](../Sahil_Upadhyay_Resume_3pages(4).pdf) | asset/other | 63131 |
| [assets/signature-candidates/__pycache__/refine-signatures.cpython-312.pyc](../assets/signature-candidates/__pycache__/refine-signatures.cpython-312.pyc) | asset/other | 53226 |
| [docs/kingdom-visual-design.md](kingdom-visual-design.md) | style/config/document | 51782 |
| [docs/performance-streaming.md](performance-streaming.md) | style/config/document | 42511 |
| [docs/visual-reference-study.md](visual-reference-study.md) | style/config/document | 31350 |
| [docs/art-assets.md](art-assets.md) | style/config/document | 30038 |
| [app/friends-hub.css](../app/friends-hub.css) | style/config/document | 27035 |
| [assets/blender/textures/Paint_WarmPlaster.png](../assets/blender/textures/Paint_WarmPlaster.png) | asset/other | 23393 |
| [assets/blender/textures/Paint_Periwinkle.png](../assets/blender/textures/Paint_Periwinkle.png) | asset/other | 23150 |
| [docs/scene-object-inventory.md](scene-object-inventory.md) | style/config/document | 22354 |
| [public/assets/fonts/space-grotesk-latin-variable.woff2](../public/assets/fonts/space-grotesk-latin-variable.woff2) | asset/other | 22288 |
| [assets/blender/textures/Paint_Sage.png](../assets/blender/textures/Paint_Sage.png) | asset/other | 22120 |
| [assets/blender/textures/Paint_Terracotta.png](../assets/blender/textures/Paint_Terracotta.png) | asset/other | 21999 |
| [assets/blender/textures/Metal_BrushedCopper.png](../assets/blender/textures/Metal_BrushedCopper.png) | asset/other | 21983 |
| [app/hud-controls.css](../app/hud-controls.css) | style/config/document | 21034 |
| [app/kingdom-ui.css](../app/kingdom-ui.css) | style/config/document | 20788 |
| [assets/street-life/__pycache__/build-life-kit.cpython-312.pyc](../assets/street-life/__pycache__/build-life-kit.cpython-312.pyc) | asset/other | 20298 |
| [app/globals.css](../app/globals.css) | style/config/document | 18872 |
| [docs/workshop-visual-research-report.md](workshop-visual-research-report.md) | style/config/document | 18348 |
| [assets/blender/textures/Rubber_DeepIndigo.png](../assets/blender/textures/Rubber_DeepIndigo.png) | asset/other | 18337 |
| [assets/world-candidates/__pycache__/remodel-landmarks.cpython-312.pyc](../assets/world-candidates/__pycache__/remodel-landmarks.cpython-312.pyc) | asset/other | 18263 |
| [public/assets/fonts/fraunces-latin-500.woff2](../public/assets/fonts/fraunces-latin-500.woff2) | asset/other | 18000 |
| [app/civilization-logo-outlines.json](../app/civilization-logo-outlines.json) | style/config/document | 14080 |
| [assets/signature-candidates/__pycache__/bake-contact.cpython-312.pyc](../assets/signature-candidates/__pycache__/bake-contact.cpython-312.pyc) | asset/other | 13666 |
| [app/resume-data.json](../app/resume-data.json) | style/config/document | 12907 |
| [README.md](../README.md) | style/config/document | 12581 |
| [public/assets/resume-book/pages.json](../public/assets/resume-book/pages.json) | style/config/document | 12260 |
| [docs/capital-masterplan.md](capital-masterplan.md) | style/config/document | 12256 |
| [assets/street-life/README.md](../assets/street-life/README.md) | style/config/document | 10841 |
| [docs/frontend-reference-study.md](frontend-reference-study.md) | style/config/document | 10640 |
| [docs/multiplayer.md](multiplayer.md) | style/config/document | 9647 |
| [docs/astra-beauty-map.md](astra-beauty-map.md) | style/config/document | 9477 |
| [assets/signature-candidates/README.md](../assets/signature-candidates/README.md) | style/config/document | 8956 |
| [assets/premium-candidates/scope.json](../assets/premium-candidates/scope.json) | style/config/document | 8780 |
| [public/assets/world-finish/manifest.json](../public/assets/world-finish/manifest.json) | style/config/document | 8706 |
| [assets/world-candidates/README.md](../assets/world-candidates/README.md) | style/config/document | 8379 |
| [assets/dog-digital-double/README.md](../assets/dog-digital-double/README.md) | style/config/document | 8255 |
| [docs/angel-mode.md](angel-mode.md) | style/config/document | 7535 |
| [public/assets/world-paving-relief.png](../public/assets/world-paving-relief.png) | asset/other | 7318 |
| [docs/performance-playtest.md](performance-playtest.md) | style/config/document | 7254 |
| [docs/phase-delivery.md](phase-delivery.md) | style/config/document | 7161 |
| [assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/runtime-comparison.json](../assets/premium-candidates/comparisons/2026-10-03T10-45-32.977Z/runtime-comparison.json) | style/config/document | 7060 |
| [assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/runtime-comparison.json](../assets/premium-candidates/comparisons/2026-10-03T10-51-10.665Z/runtime-comparison.json) | style/config/document | 7055 |
| [assets/premium-candidates/README.md](../assets/premium-candidates/README.md) | style/config/document | 6638 |
| [assets/premium-candidates/runtime-comparison.json](../assets/premium-candidates/runtime-comparison.json) | style/config/document | 6631 |
| [public/assets/brands/LICENSE.md](../public/assets/brands/LICENSE.md) | style/config/document | 6568 |
| [docs/modular-controls.md](modular-controls.md) | style/config/document | 6367 |
| [docs/hud-controls.md](hud-controls.md) | style/config/document | 5976 |
| [app/radio-ui.css](../app/radio-ui.css) | style/config/document | 5967 |
| [assets/hero-candidates/README.md](../assets/hero-candidates/README.md) | style/config/document | 5928 |
| [assets/world-candidates/terrain-source/manifest.json](../assets/world-candidates/terrain-source/manifest.json) | style/config/document | 5836 |
| [assets/planets/source/manifest.json](../assets/planets/source/manifest.json) | style/config/document | 5833 |
| [docs/authored-civilization.md](authored-civilization.md) | style/config/document | 5704 |
| [app/angel-ui.css](../app/angel-ui.css) | style/config/document | 5664 |
| [docs/audio-cinematic.md](audio-cinematic.md) | style/config/document | 5648 |
| [docs/profile-civilizations.md](profile-civilizations.md) | style/config/document | 5199 |
| [docs/complete-world-export.md](complete-world-export.md) | style/config/document | 4963 |
| [docs/city-neighborhoods.md](city-neighborhoods.md) | style/config/document | 4659 |
| [app/resume-book.css](../app/resume-book.css) | style/config/document | 4653 |
| [docs/gold-head.md](gold-head.md) | style/config/document | 4577 |
| [assets/sah-face/README.md](../assets/sah-face/README.md) | style/config/document | 4531 |
| [public/assets/fonts/fraunces-LICENSE.txt](../public/assets/fonts/fraunces-LICENSE.txt) | style/config/document | 4504 |
| [assets/manifest.json](../assets/manifest.json) | style/config/document | 4495 |
| [docs/prompt-2-backlog.md](prompt-2-backlog.md) | style/config/document | 4453 |
| [public/assets/fonts/space-grotesk-LICENSE.txt](../public/assets/fonts/space-grotesk-LICENSE.txt) | style/config/document | 4401 |
| [assets/reference-dog/README.md](../assets/reference-dog/README.md) | style/config/document | 4134 |
| [app/transit.css](../app/transit.css) | style/config/document | 4066 |
| [docs/vercel-deployment.md](vercel-deployment.md) | style/config/document | 3969 |
| [public/assets/world-v1/terrain/manifest.json](../public/assets/world-v1/terrain/manifest.json) | style/config/document | 3807 |
| [docs/radio-and-kettle.md](radio-and-kettle.md) | style/config/document | 3797 |
| [assets/anime-figure/README.md](../assets/anime-figure/README.md) | style/config/document | 3770 |
| [docs/project-exhibits.md](project-exhibits.md) | style/config/document | 3702 |
| [assets/world-candidates/terrain/manifest.json](../assets/world-candidates/terrain/manifest.json) | style/config/document | 3639 |
| [docs/world-engineering.md](world-engineering.md) | style/config/document | 3509 |
| [docs/resume-book.md](resume-book.md) | style/config/document | 3433 |
| [docs/object-craft.md](object-craft.md) | style/config/document | 3415 |
| [docs/workshop-neighborhood.md](workshop-neighborhood.md) | style/config/document | 3304 |
| [assets/dog-digital-double/viewer.html](../assets/dog-digital-double/viewer.html) | style/config/document | 3278 |
| [docs/roaming-dog.md](roaming-dog.md) | style/config/document | 3188 |
| [assets/premium-candidates/architecture-verification.json](../assets/premium-candidates/architecture-verification.json) | style/config/document | 3145 |
| [public/assets/signature-v2/manifest.json](../public/assets/signature-v2/manifest.json) | style/config/document | 3080 |
| [public/assets/signature-v1/manifest.json](../public/assets/signature-v1/manifest.json) | style/config/document | 3062 |
| [docs/courier-loop.md](courier-loop.md) | style/config/document | 3046 |
| [assets/signature-candidates/atelier-manifest.json](../assets/signature-candidates/atelier-manifest.json) | style/config/document | 2940 |
| [assets/signature-candidates/manifest.json](../assets/signature-candidates/manifest.json) | style/config/document | 2925 |
| [assets/anime-figure/viewer.css](../assets/anime-figure/viewer.css) | style/config/document | 2925 |
| [assets/reference-dog/preview.html](../assets/reference-dog/preview.html) | style/config/document | 2870 |
| [app/civilizations.css](../app/civilizations.css) | style/config/document | 2566 |
| [package.json](../package.json) | style/config/document | 2398 |
| [public/assets/premium-v1/manifest.json](../public/assets/premium-v1/manifest.json) | style/config/document | 2348 |
| [assets/fonts/LICENSE](../assets/fonts/LICENSE) | asset/other | 2006 |
| [public/assets/world-v1/craft-manifest.json](../public/assets/world-v1/craft-manifest.json) | style/config/document | 1923 |
| [app/workshop-ui.css](../app/workshop-ui.css) | style/config/document | 1905 |
| [assets/anime-figure/viewer.html](../assets/anime-figure/viewer.html) | style/config/document | 1792 |
| [assets/world-candidates/craft-manifest.json](../assets/world-candidates/craft-manifest.json) | style/config/document | 1697 |
| [assets/premium-candidates/material-verification.json](../assets/premium-candidates/material-verification.json) | style/config/document | 1614 |
| [assets/art/mural-prompt.md](../assets/art/mural-prompt.md) | style/config/document | 1505 |
| [public/assets/world-v1/trees-manifest.json](../public/assets/world-v1/trees-manifest.json) | style/config/document | 1387 |
| [.oxlintrc.json](../.oxlintrc.json) | style/config/document | 1370 |
| [assets/world-candidates/trees-manifest.json](../assets/world-candidates/trees-manifest.json) | style/config/document | 1112 |
| [assets/premium-candidates/material-profile.json](../assets/premium-candidates/material-profile.json) | style/config/document | 828 |
| [public/assets/brands/github.svg](../public/assets/brands/github.svg) | asset/other | 822 |
| [.gitignore](../.gitignore) | asset/other | 762 |
| [render.yaml](../render.yaml) | style/config/document | 731 |
| [public/assets/life-v1/manifest.json](../public/assets/life-v1/manifest.json) | style/config/document | 723 |
| [public/favicon.svg](../public/favicon.svg) | asset/other | 712 |
| [tsconfig.json](../tsconfig.json) | style/config/document | 704 |
| [public/assets/collectible-v1/bakery-manifest.json](../public/assets/collectible-v1/bakery-manifest.json) | style/config/document | 692 |
| [assets/hero-candidates/dog-manifest.json](../assets/hero-candidates/dog-manifest.json) | style/config/document | 676 |
| [public/assets/brands/linkedin.svg](../public/assets/brands/linkedin.svg) | asset/other | 610 |
| [public/assets/brands/SOURCES.md](../public/assets/brands/SOURCES.md) | style/config/document | 584 |
| [public/assets/collectible-v1/manifest.json](../public/assets/collectible-v1/manifest.json) | style/config/document | 529 |
| [assets/street-life/manifest.json](../assets/street-life/manifest.json) | style/config/document | 520 |
| [public/assets/hero-v1/dog-manifest.json](../public/assets/hero-v1/dog-manifest.json) | style/config/document | 519 |
| [components.json](../components.json) | style/config/document | 516 |
| [public/assets/hero-v1/angel-manifest.json](../public/assets/hero-v1/angel-manifest.json) | style/config/document | 481 |
| [public/assets/hero-v1/monument-manifest.json](../public/assets/hero-v1/monument-manifest.json) | style/config/document | 458 |
| [assets/premium-candidates/packet-press-export.json](../assets/premium-candidates/packet-press-export.json) | style/config/document | 351 |
| [assets/hero-candidates/angel-manifest.json](../assets/hero-candidates/angel-manifest.json) | style/config/document | 319 |
| [assets/hero-candidates/monument-manifest.json](../assets/hero-candidates/monument-manifest.json) | style/config/document | 310 |
| [.oxfmtrc.json](../.oxfmtrc.json) | style/config/document | 260 |
| [assets/premium-candidates/bakery-export.json](../assets/premium-candidates/bakery-export.json) | style/config/document | 218 |
| [vercel.json](../vercel.json) | style/config/document | 150 |
| [.openai/hosting.json](../.openai/hosting.json) | style/config/document | 96 |
| [scripts/resume-requirements.txt](../scripts/resume-requirements.txt) | style/config/document | 33 |
| [docs/code-complexity.md](code-complexity.md) | generated-report | generated |

## Reproduce

Run the installed Node interpreter on scripts/rank-complexity.cjs with --python pointing to the verified Python interpreter. Add --self-test to validate the two parsers. The JSON inventory in outputs/performance/complexity-inventory.json records every file hash, metrics, local dependencies and highest-complexity functions. Metrics describe the current working tree based on the recorded revision, including uncommitted changes; they are not a historical checkout of that revision.
