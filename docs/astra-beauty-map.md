# Astra: Beauty Map

Role: visual director. Claude owns engineering, stability, state, and optimization.
This is a composition-led pass, not a replacement of the existing application.
No Git actions. Existing and concurrent work must be preserved.

## Working Boundary

Astra additions use `app/astra-*`, `tests/astra-*`, and `scripts/astra-*` where
possible. Shared-file changes are restricted to visual creation/update hooks,
weather lighting, and camera composition. Do not change APIs, saved state,
interaction logic, transit physics, material batching, or application structure.
Read shared files again immediately before integrating to preserve partner edits.

## Initial Evidence

- Workshop: beautiful original mural and expressive courier; nearly equal light
  across the plaza, pale foreground roofs, and cropped landmarks compete with it.
- Commons: recognizable product-shaped shops; the central weather billboard wins
  the composition over the neighborhood. Large surfaces lack a quieter counterpoint.
- Planet arrival: elegant transit models, but signs and the station roof dominate
  while the globe's depth and horizon are largely hidden.
- Keep: handmade signs, mural, distinct district machinery, shop identities,
  portrait behavior, transit motion, approachable characters, accessible controls.

## Hierarchy To Verify

| Route | Role | Intended Moment | Restraint |
| --- | --- | --- | --- |
| Workshop opening | Hero | Warm human-scale workshop below a coherent distant silhouette | One dominant focal hierarchy; no automatic camera takeover |
| CPU approach | Hero | A warm clock core above cool industrial mass | Dark casing, limited luminous surfaces |
| RAM walk and balcony | Quiet / discovery | A living canopy against the enormous memory stacks | One composed tree, open walking space |
| GPU and board edge | Hero | A suspended color instrument over exposed circuit geology | Cut random floating pixels; emphasize silhouette and depth |
| Network and transit | Transition | A train crossing framed architecture, orbital horizon beyond | Preserve proven motion and reveal paths |
| Vault / Commons threshold | Quiet | Low reflections and warm windows between larger landmarks | Negative space instead of new buildings |
| Commons and Pixel | Discovery | A small garden and an impossible living portrait | Preserve readable displays and voice interactions |
| Market square | Supporting | Warm pools of light, ordered avenues, legible screens | Do not compete with actual information |
| Planet journeys and outposts | Hero / quiet | Thin atmospheric limb, terrain silhouette, readable scale | No opaque atmosphere shell or constant spectacle |
| Night / golden light / rain | Distributed | Distinct lighting stories across existing places | Selective emission, no bloom dependence |

## Review Method

Use `scripts/astra-beauty-audit.cjs` for actual application frames and raw canvas
checks. Review wide views and close views, with the existing UI visible. Weather
overrides and storage are isolated to a disposable browser; live services and
user progress are untouched. Capture unchanged baseline frames first.

Questions at each review: where does the eye land; is the frame legible without
bloom; can the silhouette breathe; does motion have a purpose; would removing
something strengthen it; does it belong to this computer civilization?

## Audit Conclusions

Actual baseline frames were captured for the opening, night, rain, CPU, RAM,
GPU, network, vault, sky bridge, Kafka, Commons, Pixel, markets, metro, rocket,
and all three planetary arrivals. The first baseline batch and the remaining
routes ran separately. No browser or shader errors were recorded.

The largest deficiencies were compositional: foreground houses overwhelmed
the opening; the lighting kept too much studio fill at night; stacked rings
and unmotivated floating pixels weakened landmark identity; trees read as
small props; the circuit abyss was covered by opaque horizontal surfaces.
Train/rocket movement, shop identities, signs, and the original artwork did
not justify replacement. Market screens need clarity, not another spectacle.

## Implemented Moments

| Moment | Composition | Motion / Restraint |
| --- | --- | --- |
| Workshop opening | Closer three-quarter frame through the open side of the plaza; mural, courier, and press remain visible | No intro animation or camera takeover |
| Clock cathedral | Armillary crown replaces four stacked halos over the existing processor housing | Slow clock hand and meridian; five-second core accent once per 96 seconds |
| Memory reading tree | One broad, branching canopy and a socket bench between the approaches | Subtle leaf movement; two trees total, not a forest of new props |
| Commons quiet tree | Smaller matching canopy rooted in an existing planter | Keeps central avenue and cross streets open |
| Circuit canyon | Actual opening beyond the existing safety rail reveals stratified PCB edges and a deep current | Slow current; remove surface traces over the opening |
| GPU lens | One suspended faceted optical element inside thinner existing rings | Replaces 63 loose floating pixels; slow rotation |
| Cooling basin | Restrained reflective surface at the existing bath | Three very small ripples |
| Pixel archive | Brass pilasters, a shallow arch, and reading lights around the existing portrait | Voice, text, pixel art, and interaction unchanged |
| Planetary limbs | Thin atmospheric edge with a light-facing side for each globe | Transparent depth-safe shell; does not repaint terrain |
| Rain and night | Five shallow rain mirrors and practical lamp pools; darker fill with warm focal accents | Weather-gated, no extra particle system or stronger bloom |

The master palette lives in `app/astra-lighting.ts`. `astraSkyTint` uses
Claude's `weather.sky.tint` interface; it does not replace the shared weather
engine or cross-fade implementation. Environment and hemispheric color return
to their original off-world values. The authored initial light is applied on
the first frame; later weather transitions remain blended.

## Collaboration Handoff

- New visual modules: `astra-lighting`, `astra-atmosphere`, `astra-canopy`,
  `astra-moments`, `astra-geology`, and `astra-rain` in `app/`.
- `world.ts`: creation/update hooks, first/home camera preset, Pixel framing,
  raised exterior focus, and collision for the two tree trunks only. Preserve
  Claude's shadow scheduler and sky transitions when integrating.
- `awe-world.ts`: remove repeated CPU halos and loose GPU pixels, thin the GPU
  rings, expose side layers of the already guarded abyss. Do not restore its
  opaque surface cover, which would hide the current again.
- `world-scenery.ts`: replace the full rectangular substrate with six simple
  slabs around the existing protected opening. Movement bounds and traversal
  heights are unchanged.
- `kingdom-art.ts`: stop eastern decorative surface traces before the canyon.
- No API, persistence, transit physics, input system, page layout, asset pipeline,
  batching, deployment configuration, or dependency changes in this pass.
- No Git actions. Tests and captures are local, isolated from real saved progress.

## Verification

```sh
node --test tests/astra-*.test.cjs tests/controls.test.cjs tests/kingdom-art.test.cjs tests/painting-interaction.test.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/astra-beauty-audit.cjs --phase=review --views=spawn,clock,canopy,canyon,pixel,metro
node scripts/astra-beauty-audit.cjs --phase=final-mobile --mobile --views=fresh-load,opening-night,canopy,pixel,canyon
node scripts/astra-beauty-audit.cjs --phase=no-bloom --low --views=fresh-load,clock,canopy,canyon,pixel
```

The browser commands require Playwright resolvable in Node and local Edge. They
write actual application screenshots under `outputs/playtest/astra/`. The
`before`, `first-art`, `framed`, and `review` series retain iteration evidence.
The authored-look captures use the shared sky's explicit settle hook to avoid
waiting for software-rendered transitions; they are not transition-duration
measurements. `--low` disables the existing bloom pipeline and shadows.

The 28 focused tests passed and TypeScript was clean after integration with
concurrent work. Checks cover real exposed depth, route and spawn clearance,
camera projection, transparent atmosphere, weather gating, restoration of
off-world light, reduced motion, and the unchanged portrait interaction.
This is visual validation, not a physical-device performance certification.

Final review, 21 September: all five 1200x800 bloom-free views and all five
390x844 mobile views passed nonblank canvas, overflow, and browser/shader-error
checks. Screenshots are the `no-bloom-*` and `final-mobile-*` series. The final
review caught an integration gap where `home()` used the authored camera but
initial setup did not. Startup now applies the same preset after resize, and
`fresh-load` asserts the actual camera yaw without calling `home()` first.
Keep that initialization alongside future quality/configuration changes.

The desktop Pixel view still exceeds the existing scene draw/triangle targets;
engineering optimization and physical-device frame-rate assessment remain with
Claude. No additional performance or deployment claims are made by this pass.

