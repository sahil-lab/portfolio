# Sculpted City Neighborhoods

The supplied city references inform the quality and visual language: rounded
building volumes, projecting floor bands, recessed blue glazing, balconies,
planted terraces, and readable object-shaped landmarks. Their exact buildings,
logos, or assets are not copied.

## Coverage

- Motherboard district houses use `city-architecture.ts`, retaining their lots
  and district identities. RAM keeps its shorter house so the reading balcony
  and stair remain clear. Existing workshop and project architecture remains.
- All three planetary settlements use taller, two-level homes with floor bands,
  balconies, roof turf, planting, and blue or steel-blue windows. These details
  are instanced. The Forge and Citadel keep their established brand palettes;
  Cache Gardens remains the greener civilian world.
- The Copper Kettle has a smoothly turned body over a layered glazed storefront.
  Sole Studio retains its sneaker silhouette with rounded laces, an oculus,
  panorama windows, a layered sole, and a turf-fronted terrace. Frequency House
  gains a planted roof terrace. Existing shop interactions are retained.
- Three pool courts sit at Central `(-23, 48)`, the kettle neighborhood
  `(-25, 95)`, and the shoe neighborhood `(28, 94)`. Each planet also receives
  pool courts in free spaces near its towns, outside road, river, landing, and
  profile-logo exclusions.
- Pools have shaped coping, a tiled blue water surface, ladder rails, loungers,
  and locally textured artificial turf. Water is collision-bounded landscaping,
  not a new swimming mechanic. Reduced Motion stops the texture motion.

## Soft Material Direction

`crafted-surfaces.ts` uses shallow deterministic grain, satin paint and ceramic,
and brushed metal. The shared `finishKingdomMaterials` pass controls clearcoat,
roughness, and reflection intensity without recoloring objects or changing
their live emission values. Warm pearl trim balances teal, coral, blue and green
accents. Warmth is not a beige filter over every planet.

Explicit `material.userData.surface` values preserve natural turf and polished
glass/water. Mapped artwork and vertex-colored landscapes retain their authored
surface behavior. The asynchronously refined Packet Press and courier equipment
receive matching soft finishes in their own material constructors.

## Ownership and Checks

New modules: `city-architecture.ts`, `city-gardens.ts`, `city-public-spaces.ts`,
and `shop-architecture.ts`. Integrations are in the existing scenery, planet
infrastructure, Commons, and world update/collision hooks. Shared geometry,
saved visits, profile data, transit paths and input semantics are retained.

```sh
node --test tests/city-architecture.test.cjs tests/city-gardens.test.cjs tests/shop-architecture.test.cjs
node --test --test-concurrency=4 tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-city-neighborhoods.cjs
```

The browser check uses isolated Edge with software WebGL, in-memory storage and
denied geolocation. It visits both stores through their existing interactions,
boards for every planet, checks actual pool and building geometry, and records
desktop/mobile captures in `outputs/playtest/city-neighborhoods/`. No Git or
deployment action is included. Viewport emulation is not a physical-device
frame-rate certification.

## Verified Results

The full 195-test suite passed during this pass, and TypeScript was clean.
After the final flat-ground placement and terrain-conforming turf corrections,
19 focused pool, transit, and orbital-rotation checks passed again. Every planet
has six pool courts; the Forge and Citadel retain 47 residential buildings each,
and Cache Gardens retains 42.

Desktop captures cover Central, both named shops, a Central pool, and settlement
and pool views on every planet. Phone captures cover Central, Commons, and Sole
Studio; water texture offsets remain unchanged with Reduced Motion enabled.
The completed capture subsets reported no application or shader errors and no
horizontal overflow. Planet-pool inspection positions are dry, collision-free,
and checked against camera obstructions. The harness rejects loading-screen
captures and defers Vite hot reloads within its disposable browser session.

The busy Commons mobile sample still reached 1,329 draw calls and 833,496
triangles, above the existing targets. The work is visually and behaviorally
verified, not certified for sustained mobile frame rate. Pool water remains a
visual feature with a blocked footprint; swimming controls were not introduced.
