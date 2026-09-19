# The Living Computer Kingdom

A tiny courier explores a living motherboard. Portfolio buildings demonstrate state and architecture; System Information is the résumé. System Information uses the owner's supplied résumé. Interactive architecture exhibits remain explicitly labeled examples pending repository details.

## Run locally

Use Node 24 (minimum 22.13) and npm. From the extracted project root:

```sh
npm ci
npm run build
node node_modules/vinext/dist/cli.js start --port 3000
```

Open http://127.0.0.1:3000/. For development use `npm run dev -- --port 3000`. The `npm start` command instead runs the Cloudflare Worker preview. Keep `.openai/hosting.json`: Vite imports its non-secret binding configuration. Publishing to the original Site requires its owner's separate credentials; none are included.

WASD/arrows move, drag rotates, wheel/pinch zooms, E interacts. Settings includes stable camera, reduced motion, sound, quality and deliberate save reset. Pause offers return to workshop. Touch has a left joystick and right-side camera gestures. `/projects` and `/resume` are direct HTML alternatives.

District terminals are labeled near each district arrival. Approach and press E. Desktop test shortcut: choose district 1–7 on the map, then use Move west five times. This shortcut is for terminal testing; connected walking routes remain available.

## Verify and export

Deploying on Vercel? Use [the Vercel build and settings](docs/vercel-deployment.md). The original build below targets Sites/Cloudflare.

```sh
node --test tests/*.test.cjs tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/measure-download.cjs
python scripts/package-source.py
```

The last command makes `outputs/Kingdom-source.zip` and checks its CRCs and required files. It excludes dependencies, secrets, reference books and rendered frames. The MP4 is a separate deliverable.

Start with [phase completion and remaining work](docs/phase-delivery.md), [asset export instructions](docs/art-assets.md), [cinematic reproduction](docs/audio-cinematic.md), and [measured playtest limitations](docs/performance-playtest.md).

## Editing the kingdom

- `app/portfolio.ts`: verified portfolio replacement point, architecture and scenarios shared by world/HTML views.
- `app/world-config.ts`, `encounter-config.ts`: districts, routes, residents and destinations.
- `app/simulation.ts`, `district-machines.ts`: district behavior and its 3D presentation. Explanations disclose simplified models.
- `app/delivery-state.ts`, `exhibit-state.ts`: delivery and project state machines.
- `app/character-controller.ts`, `game-camera.ts`, `game-input.ts`, `persistence.ts`: movement, camera, input and saves.
- `assets/manifest.json`: ownership, intended use and reproducible art exports.

Most world meshes remain code-authored. Packet Press has an editable Blender source and shipped GLB; the cinematic also includes an editable Blender scene. Do not present demo projects, provisional geometry, or unmeasured performance as final portfolio facts.


