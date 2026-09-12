# Enterable portfolio exhibits

The current Component Studio and Request Hall are explicitly labeled teaching examples, not the owner's projects. Personal data and source/demo URLs remain unsupplied.

## Replace content

Edit `app/portfolio.ts`. Each typed project record contains identity, purpose, contribution, stack, decisions, links, location/style/color, architecture nodes and directed connections, and a demonstration scenario. Keep stable node IDs and valid edge endpoints. Put real public source/demo links in `links`; do not use guessed URLs. The résumé object in this same file supplies both System Information views.

The supplied demonstration interpreter supports a React color update and a synchronous lookup into scenario records. New real architectures require corresponding simulation behavior in `app/exhibit-state.ts`; changing labels alone must not be presented as an implementation of a different architecture. Add asynchronous message behavior only when verified project material calls for it.

`app/project-world.ts` authors the buildings and consumes the same Exhibit state used by `app/exhibit-view.tsx`. The world updates the demonstrations; the standalone HTML directory supplies its own clock when mounted without the world. Trigger, pause/resume, reset and repeat all operate this common state. Animated tokens, highlighted machinery, explanation text and visible outputs follow its stages. The backend result returns through the service; there is no message broker.

## Visit

Open Projects or click a building to mark its entrance. Walk along the marker, press E at the doorway, then walk inside. Walls and machine plinths block movement; the doorway stays open for return. Inside, use E away from the entrance or Operate this exhibit. Closing the panel restores walking. The on-screen directional controls offer discrete steps in addition to keyboard movement.

The System Information terminal is beside the workshop at x=5, z=25. A persistent header button opens the same information. `/projects` and `/resume` expose shared HTML content without requiring the game canvas.

## Validation

Browser checks performed: distant selection did not teleport; walked into both buildings; opened System Information from its terminal; triggered and paused a React update and observed its completed Lilac result; backend returned 200 / Memory crystal; reset cleared its output; walked out of Request Hall; loaded the HTML directory. Type checking, focused lint, and simulation regression tests cover pause/resume, repeat/reset, valid graph references, successful/missing records, and committed color isolation.

This work does not complete the remaining seven district simulations or certify the entire original game as finished. The renderer remains the procedural base with new authored procedural exhibits. The build reports a large client-chunk warning; no measured performance improvement is claimed.


## Route follow-up (2026-09-07)

Replaced fixed marker waypoints with bounded grid routing against the player collision predicate. Routes avoid exhibit walls and machinery, leave interiors through open doors, and refresh after meaningful movement rather than allocating line geometry every frame. The displayed distance follows the walking path. Added regression cases for wall detours, corner clearance, open-door exits and unreachable destinations. Browser verified clicking the Request Hall exterior marks it without moving the player; walked inside and selected Component Studio to obtain a route back through the doorway. Interior HUD now hides the district minimap, and short desktop layouts separate it from the project instructions.
