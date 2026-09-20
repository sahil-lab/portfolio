# Prompt 2 — orbital neighborhoods

Implemented September 20, 2026. The motherboard remains the portfolio hub; Copper Dunes, Cache Gardens and Prism Moon are fictional satellite components of the same living computer.

## Play

Use Node 22.13 or newer (verified with Node 24.19), `npm ci`, then `npm run dev`. Open http://localhost:3000/.

Open **Travel → Go to Motherboard Central**, then interact at the station. Choose a satellite and **Board metro**. A rocket pad at every stop offers a return or onward trip. Boarding requires proximity; choosing a destination alone does not teleport the player. **Arrive now** skips travel motion. Settings provides emergency return to the workshop.

Each satellite has one visitor rover, two independently driven resident rovers, three wandering residents, a vendor, a hot-dog stand, a bench, a planter, an interactive resonator and a clear perimeter driving lane. E boards/parks the visitor car, talks to the vendor or activates the nearby resonator. Walking and driving use WASD/arrows or the touch joystick. Residents display timed Hi / Hello / Good morning speech bubbles. Traffic yields to pedestrians and the player's car; blocked drivers wait and reverse direction.

## Space and implementation

- World dimensions are doubled uniformly; the courier retains its original physical size. Walking speed is compensated for the scale. Local gameplay coordinates keep doors, stairs, floors and collision aligned. Camera tracking uses world coordinates.
- Fewer scattered capacitors, traces, overhead cables and dust particles. Background GPU/router structures have moved away from their teaching machines. Eight perimeter landmarks per satellite leave the central square open.
- Rails and journeys share cubic paths with northbound station approaches. Vehicles and repeated static geometry are batched. These are authored arcade transport paths, not a full railway or orbital physics model; the train is a rigid consist.
- `transit-config.ts`: typed stops and journey state. `transit-world.ts`: boarding, rides, driving, collision and visited-world storage. `transit-models.ts`: original procedural vehicles. `neighborhood.ts`: residents, stalls, greetings and yielding traffic. `transit-panel.tsx`: accessible travel controls.
- Versioned visited-world storage is optional and validated; reset clears it. Reload intentionally returns to the workshop while preserving discoveries/deliveries. Vehicle locations and resident positions are session state.
- All new models are editable TypeScript source. This expansion does not claim new Blender/GLB exports or a finished cinematic.

## Verification

- TypeScript check passed; 35 focused tests passed, including the existing delivery, save, simulation, input, camera and resource tests.
- New tests cover every destination and return trip, duplicate boarding, resumed delta clamping, station endpoints, segment collision, height separation, traffic yielding, two-minute full-layout traffic laps, doubled-world camera tracking and walking/boarding/driving/parking on a satellite.
- Browser play: workshop → metro → Copper Dunes; workshop → metro → Cache Gardens; workshop → metro → Prism Moon → walk to rover → board → drive → park → walk to rocket → launch home. Arrival skipping, boarding proximity, parked vehicle collision and pedestrian avoidance were exercised. Screenshot evidence was inspected in the task's browser tool outputs.
- Desktop measurement: Windows, Chrome 153 in Codex browser, Intel UHD Graphics (ANGLE D3D11), 1280×720 CSS/render pixels, Balanced setting, stationary Cache Gardens platform after a metro trip: **27.9 FPS average, 42.4 ms p95, 154 draws, 55,702 triangles**. This is a development-build browser observation, not a claim of meeting 60 FPS or a physical-phone test.
- Production Sites build passed. Conservative sum of all gzipped client files: **1,130,345 bytes**, including the résumé, GLB and mural; this is not a network HAR and excludes HTML/HTTP overhead. Vercel production build also passed.
- Physical mobile performance and new multi-touch/browser-emulation routes remain unverified. Existing independent-pointer cancellation/pinch tests pass. Mobile navigation has a three-column layout and keeps 44px minimum targets.

The full earlier seven-district/delivery/art/trailer production brief is broader than this expansion; this record does not mark those remaining phase checks complete.
