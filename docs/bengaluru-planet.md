# Bengaluru: Full-Globe City

## Experience

`/bengaluru` opens the existing kingdom with its Main character and Angel. The city's mapped East/North coordinates wrap across the whole sphere, as requested, rather than occupying a small cap. The original civic-core dataset and cap projection remain available to the asset pipeline and regression tests.

- Walk with the existing keyboard, touch, and on-screen controls; switch Main/Angel without changing city location.
- City arrivals check the loaded map and station obstacles before walking starts. If the nominal rocket exit overlaps mapped geometry, the character is placed at a nearby clear exit; normal walking collisions remain enabled.
- City tools stay closed on arrival and when selecting scenery. Open them explicitly from World > Bengaluru places; Close or Escape dismisses them without pausing movement.
- Search mapped places, including Whitefield, Electronic City, Indiranagar, Koramangala, and Jayanagar. Travel waits for collision-ready tiles and finds clear arrival ground.
- Select a building or mapped surface to store its OSM source link and measured/estimated height information; inspect that selection in the city tools when needed.
- Use the orbital overview for the full map. Nearby geometry is streamed for street views; the overview uses a texture generated from the same vectors.
- The existing graphics, sound, movement, reduced-motion, and camera settings remain in the kingdom controls. No separate avatar or rendering framework was introduced.
- A small, north-up minimap sits in the bottom-left, follows the active Main or Angel character, and shows the nearest mapped area or landmark. Its tightly zoomed, shallow HUD view keeps nearby roads and the position marker clear. The marker uses the same East/North coordinates as the city; nearby landmarks are labeled "Near" because named map points are not neighborhood boundaries.
- Maximize the map for panning, zooming, coordinates, and recentering. Minimize it back to the live-follow HUD or collapse the HUD to a small restore bar. The compact map does not pause movement; the maximized view pauses controls until minimized or dismissed with Escape. The city-tools location label also follows movement instead of retaining the last destination name.
- In the maximized map, the location-pin action requests the device's current position through the browser. After permission is granted, a position inside the mapped Bengaluru area loads nearby tiles and summons the controlled character onto nearby clear ground. Denied permission, unavailable positioning, timeouts, or out-of-area coordinates do not relocate the character. Reported device accuracy is shown; the selected ground may differ from the GPS point to avoid buildings or water.
- Device relocation is a one-shot action, not continuous GPS tracking. It adds no external geocoding request or coordinate storage. Normal game-session position sharing and diagnostics still apply. Automated tests use mock coordinates, not the user's device location.

## Source And Licensing

The normalized snapshot is `assets/bengaluru/snapshots/bengaluru-region-2026-10.json.gz`. It was imported offline from Geofabrik's Southern Zone PBF, not from raster map tiles or a runtime map API.

| Property | Value |
| --- | --- |
| OSM snapshot | 2026-10-09T20:21:04Z |
| Regional PBF bytes | 558,061,016 |
| Regional PBF SHA-256 | `842cea87cac1d3f8657466d248676b787915fe0e94a25da7a9aec137bae5d87f` |
| Normalized snapshot SHA-256, decompressed | `90d3714ebf768cac5a7c865d0d9110b6c859d6a34407f1262c269a7832a819b1` |
| Normalized source elements | 896,789 |
| Building features | 694,620 |
| Road features | 165,025 |
| Green-space features | 10,410 |
| Water features, including linear waterways | 3,854 |
| Published tiles | 4,283, each with near/far GLB and feature metadata |

The AOI is the explicitly versioned study rectangle `bengaluru-study-area-2026-10-v1`: 77.50 to 77.81 degrees longitude, 12.80 to 13.08 degrees latitude. It is **not** an official municipal, district, ward, or five-corporation boundary. The origin is Vidhana Soudha; the arrival anchor is the mapped Cubbon Park area at East 620 m, North -150 m in the local frame.

OSM data remains subject to ODbL 1.0. Visible attribution and source links are included in the street view, orbital view, and fallback. The source archive, import report, retained identifiers/tags, and build configuration provide reproducibility. The import reported 29 incomplete relations in the regional source rather than inventing their missing members; these are listed in the snapshot report. Decorative trees, facade windows, ground shading, and inferred heights are not surveyed observations.

## Scale And Projection

The whole-globe projection preserves recoverable source coordinates and radial building heights, but a planar city cannot cover a sphere without distortion. Longitude wraps at the study-area edges and north/south extremes converge at poles. Those connections are fictional; they are not claims about real Bengaluru street adjacency. The former spherical-cap option is preferable when local map fidelity matters more than full-globe coverage.

The source-space sphere radius is approximately 9,862.778 m. The kingdom uses 0.75 local units per source metre and a 7,398-unit globe. Main retains its existing model; Angel uses a consistent city body height, clearance, foot offset, camera scale, and gait. Walking is calibrated to 2 nominal metres per second and Main's skating to 35 in Bengaluru and the mainland. Shift does not increase these two rates; other planets retain their previous movement profiles. Angel's normal walking follows the same 2 m/s rate, with its separate run and flight modes unchanged. Projection distortion means this is not a guarantee that every traversed globe distance equals a measured real-world distance.

Geometry keeps mapped footprints and holes. The regional loader corrects roof triangle winding after projection, orients walls away from the solid roof footprint, and closes building bases using the same footprint triangulation. Courtyard walls face their open void and courtyard holes remain open through roofs and bases. Known OSM heights take precedence, followed by storey-derived and deterministic defaults. Building parts and minimum heights contribute to collision clearance. The surface uses a fictional spherical ground datum with curb-sized road/park lifts; no surveyed DEM, road grades, bridge deck elevations, or building interiors are included.

## Streets And Architecture

- Carriageway widths use mapped `width:carriageway` or `width` values first. Valid lane counts provide a labeled estimate when width is missing; otherwise the road-class fallback remains. Width provenance is retained in tile metadata.
- Road strips use normalized bend joins and are clipped after expansion, so unequal-length segments and tile boundaries do not distort their width. Asphalt, concrete, paving and unpaved surfaces have distinct treatments. Bridge, tunnel and layer tags are retained, but surveyed elevations and complete grade-separated navigation are not implemented.
- Mapped facade and roof colors take precedence over generic materials. Separate roof vertices prevent roof colors leaking down walls, and known storey counts control facade spacing. Unspecified facade openings and materials remain inferred.
- Tagged gabled, hipped, pyramidal, skillion, dome, onion, round and conical roofs use shaped, closed volumes instead of boxes. Heights stay within the mapped building-part span; unspecified roof heights are inferred. Courtyards remain open. Sloped roof sampling follows the rendered roof surface for landing and collision.
- The regional build no longer exaggerates landmark heights. Vidhana Soudha's separately mapped central dome and corner roof parts retain their own footprints and heights; the High Court and State Central Library retain mapped red facades. These are source-driven interpretations, not newly surveyed or photogrammetric replicas.
- Mapped underground station volumes remain in the feature records but are omitted from above-ground rendering and collision. This prevents underground metro halls from appearing as large surface buildings beside the landmarks.

The raw snapshot has width tags on 444 highway features, lane counts on 7,020, and surface tags on 23,398. It has building-level counts on 13,284 building features and roof-shape tags on 1,503, most of which are flat. Coverage is sparse relative to the full city; unknown buildings cannot be claimed as exact real-life replicas. Architectural context was cross-checked against [Vidhana Soudha](https://en.wikipedia.org/wiki/Vidhana_Soudha) and [Attara Kacheri](https://en.wikipedia.org/wiki/Attara_Kacheri). The model continues to use the stored OSM source rather than treating photographs or inconsistent published heights as surveyed geometry.

## Runtime Budgets

- Arrival requests nine nearby detailed tiles, not the complete regional dataset.
- Nearby streaming selects at most 12 wanted tiles, two actual in-flight loads, and a 24 MiB accounted resident budget. That accounting includes geometry estimates, metadata and collision arrays; it is not a browser RSS or physical VRAM measurement.
- Navigation reserves destination tiles until the character handoff completes. Cancellation disposes stale results; failed loads back off instead of retrying each frame.
- Unloaded mapped tiles block walking/landing until collision data is ready. Areas with no mapped tile remain continuous neutral terrain; no random roads or buildings are substituted.
- Resident tile ground grids keep feet and trees at street scale. Shared materials and bounded instanced trees avoid a React component or draw object per building.
- Camera clearance includes the rendered tree crowns as well as mapped buildings, so moving through greenery does not place the camera inside an opaque canopy. Trees do not become walking obstacles.
- Geometry, instance buffers, collision data and material resources are released when their tile or world is unloaded.

All regional GLBs together are about 829.18 MiB on disk, served on demand. They are not one startup download. Geometry and metadata requests carry content hashes to avoid reusing stale city assets after a rebuild. Current assets are uncompressed geometry with vertex colors; Meshopt/Draco and KTX2 are **not** enabled or claimed. The distant SVG is rasterized into a bounded 1536 x 768 texture. Static fallback geography comes from the same snapshot.

The live minimap uses a bounded window of content-versioned 512-pixel WebP tiles at three detail levels. The navigation SVG is rasterized offline, not repainted in full when the player moves. The tile pyramid has 267 images totaling about 15.66 MiB; only the nearby tiles are loaded. This removes the measured vector repaint bottleneck without disabling live position updates.

## Rebuild

Use Node 24 for the build-only SQLite-backed importer. `osm-pbf-parser` is a pinned development dependency; it is not shipped in the browser bundle. Raw regional files and temporary indexes belong under ignored `outputs/geodata/bengaluru/`.

```powershell
node --use-system-ca scripts/import-bengaluru-osm.cjs --config assets/bengaluru/region-config.json --pbf outputs/geodata/bengaluru/southern-zone.osm.pbf --output assets/bengaluru/snapshots/new-region.json.gz --download https://download.geofabrik.de/asia/india/southern-zone-latest.osm.pbf
node --max-old-space-size=6144 scripts/build-bengaluru-planet.cjs --config assets/bengaluru/region-config.json --output public/assets/bengaluru-region-v1 --manifest app/bengaluru-region-manifest.json --stream
node --max-old-space-size=6144 scripts/build-bengaluru-planet.cjs --config assets/bengaluru/region-config.json --output public/assets/bengaluru-region-v1 --manifest app/bengaluru-region-manifest.json --stream --check
node --max-old-space-size=6144 scripts/build-bengaluru-planet.cjs --navigation --config assets/bengaluru/region-config.json --output public/assets/bengaluru-region-v1 --manifest app/bengaluru-region-manifest.json
node --max-old-space-size=6144 scripts/build-bengaluru-planet.cjs --navigation-raster --config assets/bengaluru/region-config.json --output public/assets/bengaluru-region-v1 --manifest app/bengaluru-region-manifest.json
```

The importer refuses to overwrite a snapshot. To adopt a new one, update `snapshot` in the region configuration after reviewing its source hash and report. Build installation backs up previous generated assets; a completed staging directory can be recovered with `--install-staging` after a Windows directory-lock failure. The build's explicit streaming output releases binary files as they are written.

The navigation-only command creates `navigation-map.svg` from the same snapshot without changing 3D tiles. Full builds also include that image. Run the raster command afterward to create the cached map tiles and their app catalog. Its extent is the manifest's local study bounds, with north at the top; the live position marker uses the identical transform. Region names are nearest mapped place points, not surveyed administrative boundaries.

## Verification And Limits

Tests cover geographic inverses, wrap continuity, polygon holes, binary PBF import, source provenance, road widths and joins, roof forms and closure, sloped landing heights, deterministic tile output, real GLB loading, regional memory/concurrency budgets, cancellation, destination handoff, building collisions, character calibration and orbital clearance. Browser checks live in `scripts/check-bengaluru-planet.cjs --regional`; add `--buildings --realism` for ordinary-building and named-landmark views. They capture fresh canvas pixels and desktop/mobile screenshots, use the real characters, and exercise district travel and the no-WebGL fallback.

This is a stylized mapped city, not a digital twin or a Street View replica. No satellite-derived surface masks, DEM terrain, photogrammetry, bespoke surveyed landmark reconstruction, Vue/WordPress packaging, or compressed texture pipeline is claimed. Roof profiles are approximations of the supported tags, not architectural plans. Source coverage and accuracy depend on the pinned OSM snapshot. Desktop Chromium with a mobile viewport is not physical-phone certification, and no universal frame-rate guarantee is made.
