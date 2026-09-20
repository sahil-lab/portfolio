# World engineering systems

Engineering pass supporting the visual direction in `docs/astra-beauty-map.md`.
Goal: let lighting stories, weather and travel look effortless without new cost.

## Atmosphere cross-fade (`app/atmosphere-blend.ts`, `app/weather-sky.ts`)

Every value the sky applies to the scene is a field of `SkyLook` (zenith, horizon,
nadir, background, fog colour/density, sun intensity/colour/position, ambient,
directional scale, cloud colour/count, sun/moon/star opacity, rain/snow counts).
`createWeatherSky(...).update(weather, dt, reduced, active, instant=false)` builds the
target look from the weather (or the deep-space palette when `active` is false),
overlays `sky.tint(partial)`, and damps every field toward it: light and colour at
1.4/s (≈95 % in 2 s), cloud count at .8/s, precipitation counts at .6/s.

- Weather refreshes, boarding a rocket, returning to the motherboard and district
  tints therefore fade instead of snapping. Nothing else should write fog,
  background or sun values directly.
- `tint()` is the integration point for visual direction. `app/astra-atmosphere.ts`
  already supplies a weather-aware partial look; new district or event moods only
  need another partial `SkyLook`.
- `instant=true` settles the blend; use it for initial frames and in tests that
  assert immediately after one update. `weather.update(...)` forwards the flag.

## Shadow stability (`app/lighting-rig.ts`)

The sun frustum follows the courier. `createShadowFollow(sun).follow(anchor,
sceneScale)` snaps the light/target pair to whole shadow texels in the light's
own basis, so static shadows stay pinned while the frustum moves. Without it, the
8 Hz refresh re-rasterised every static shadow on a shifted grid ("swimming").
Pass `scene.scale.x` because frustum extents are in world units.

## Quality tiers and automatic adaptation (`app/quality-tiers.ts`)

| Tier | Pixel ratio cap | Shadows | Shadow map | Shadow refresh | Bloom |
| --- | --- | --- | --- | --- | --- |
| high | 1.5 | yes | 4096 | every frame | yes |
| balanced | 1.25 | yes | 2048 | 8 Hz | yes |
| low | 1 | no | – | – | no |

`Settings.quality` is `'auto' | 'high' | 'balanced' | 'low'`; new visitors start on
`auto`, which begins balanced and reads the 5-second performance windows: p95 above
30 ms steps down immediately; two consecutive windows under 12 ms step up; a tier
that was stepped down from is never re-entered in the session. Explicit choices
bypass the governor. The performance panel shows the effective tier. Add cost
knobs to `QualityProfile` rather than branching on quality strings elsewhere.

## Camera

Wheel/pinch zoom eases toward its target (`damp`, λ = 8). Obstruction clamping is
still applied instantly on the swept ray so the camera never passes through walls.

## Verification

- `tests/world-engine.test.cjs`: texel-snap invariants (landmark shifts by whole
  texels; control case drifts), governor hysteresis, save parsing, blend maths.
- `tests/weather-sky.test.cjs`: fade progresses per frame, converges, tint applies
  and clears, travel fade.
- `scripts/check-world-engine.cjs` (Playwright, installed Edge, SwiftShader): tier
  switching reallocates the shadow map (2048 → 4096 → 1024 request), low tier
  renders fewer passes, auto starts balanced, shadow anchor within one texel of the
  courier, storm fog rises monotonically over 90 frames, no runtime errors.
- Full suite and `tsc --noEmit` pass.
