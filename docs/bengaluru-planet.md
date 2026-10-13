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

## Runtime Budgets

- Arrival requests nine nearby detailed tiles, not the complete regional dataset.
- Nearby streaming selects at most 12 wanted tiles, two actual in-flight loads, and a 24 MiB accounted resident budget. That accounting includes geometry estimates, metadata and collision arrays; it is not a browser RSS or physical VRAM measurement.
- Navigation reserves destination tiles until the character handoff completes. Cancellation disposes stale results; failed loads back off instead of retrying each frame.
- Unloaded mapped tiles block walking/landing until collision data is ready. Areas with no mapped tile remain continuous neutral terrain; no random roads or buildings are substituted.
- Resident tile ground grids keep feet and trees at street scale. Shared materials and bounded instanced trees avoid a React component or draw object per building.
- Geometry, instance buffers, collision data and material resources are released when their tile or world is unloaded.

All GLBs together are about 477.35 MiB on disk, served on demand. They are not one startup download. Current assets are uncompressed geometry with vertex colors; Meshopt/Draco and KTX2 are **not** enabled or claimed. The distant SVG is rasterized into a bounded 1536 x 768 texture. Static fallback geography comes from the same snapshot.

## Rebuild

Use Node 24 for the build-only SQLite-backed importer. `osm-pbf-parser` is a pinned development dependency; it is not shipped in the browser bundle. Raw regional files and temporary indexes belong under ignored `outputs/geodata/bengaluru/`.

```powershell
node --use-system-ca scripts/import-bengaluru-osm.cjs --config assets/bengaluru/region-config.json --pbf outputs/geodata/bengaluru/southern-zone.osm.pbf --output assets/bengaluru/snapshots/new-region.json.gz --download https://download.geofabrik.de/asia/india/southern-zone-latest.osm.pbf
node --max-old-space-size=6144 scripts/build-bengaluru-planet.cjs --config assets/bengaluru/region-config.json --output public/assets/bengaluru-region-v1 --manifest app/bengaluru-region-manifest.json --stream
node --max-old-space-size=6144 scripts/build-bengaluru-planet.cjs --config assets/bengaluru/region-config.json --output public/assets/bengaluru-region-v1 --manifest app/bengaluru-region-manifest.json --stream --check
```

The importer refuses to overwrite a snapshot. To adopt a new one, update `snapshot` in the region configuration after reviewing its source hash and report. Build installation backs up previous generated assets; a completed staging directory can be recovered with `--install-staging` after a Windows directory-lock failure. The build's explicit streaming output releases binary files as they are written.

## Verification And Limits

Tests cover geographic inverses, wrap continuity, polygon holes, binary PBF import, source provenance, deterministic tile output, real GLB loading, regional memory/concurrency budgets, cancellation, destination handoff, building collisions, character calibration and orbital clearance. Browser checks live in `scripts/check-bengaluru-planet.cjs --regional`; they capture fresh canvas pixels and desktop/mobile screenshots, use the real characters, and exercise district travel and the no-WebGL fallback.

This is a stylized mapped city, not a digital twin or a Street View replica. No satellite-derived surface masks, DEM terrain, photogrammetry, landmark-specific remodelling, roof-tag architecture, Vue/WordPress packaging, or compressed texture pipeline is claimed. Source coverage and accuracy depend on the pinned OSM snapshot. Desktop Chromium with a mobile viewport is not physical-phone certification, and no universal frame-rate guarantee is made.
