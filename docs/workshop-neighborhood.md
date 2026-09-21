# Bootloader Workshop Neighborhood

The visual reference informed spatial layering, proportion, material consistency,
and restrained interface placement. It is not a cafe recreation. The neighborhood
keeps the Living Computer Kingdom's original Packet Press, mural, residents,
project exhibits, and computer-component vocabulary.

## Design

- Circuit-glass windows have chamfered ceramic sockets and fine conductor details.
- Signal Exchange and Memory Stack use contact pins, service cartridges, and
  heat-sink roofs instead of arched windows, canvas awnings, or chimneys.
- The open workshop has component drawers, capacitors, cable reels, inspection
  hardware, and a dispatch rack connected to the existing animated press.
- A cable service gantry links the framing modules behind the workshop. The
  side stair and upper walkway are traversable, not merely background props.
- Ceramic pavers and composite deck panels connect the forecourt; the original
  cooling basin and nearby curiosity stops remain exposed and accessible.
- Neighboring project halls have folded clerestory roofs that hide on approach,
  keeping their interactive interiors visible before the visitor enters.
- The original mural is now interior art on the workshop's west return wall.
- The district atlas opens from its footer icon. Idle dispatch no longer covers
  the opening; starting a delivery or choosing a project makes dispatch available.

## Integration

`app/workshop-neighborhood.ts` owns the structure, collision bounds, stair height,
bridge height, and night-light update. Its local coordinates match existing world
coordinates: spawn `(0, .8, 24)`, press approach `(1, .8, 21)`, stair from
`(12.3, .8, 17.8)` to `(12.3, 8.6, 8.5)`, bridge centered at `(-.5, 8.6, 8)`.

`app/workshop-details.ts` owns the electronic detailing, instanced planting and
paving, and fitted sign canvases. `app/exhibit-canopy.ts` owns the adjacent roof
silhouettes and proximity cutaways. `app/workshop-ui.css` scopes the quieter
arrival treatment and keeps the atlas usable in portrait and landscape.

`world.ts` queries neighborhood height before existing traversal height and adds
its colliders without replacing movement, transit, weather, or saved-state logic.
The elevated opening view is shared by initial startup and Return to Workshop.
The old workshop disk and circular trim are removed rather than layered over the
new rectangular deck.

## Verification

Verified on 21 September 2026: 180 tests pass and TypeScript is clean. The isolated
Edge/Playwright check covers actual press activation, atlas access, stair ascent,
bridge crossing, descent, day and night rendering, Low quality, 390x844 portrait,
and 844x390 landscape. No horizontal overflow or browser/shader errors were found.

```sh
node --test --test-concurrency=4 tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-workshop.cjs
```

The browser check requires Playwright and Edge. Captures are in
`outputs/playtest/workshop/`. It uses isolated storage and denied geolocation;
the user's progress and location are untouched. Software-rendered screenshots
are not physical-device performance certification. No deployment or Git changes
are included in this design pass.
