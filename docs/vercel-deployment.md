# Vercel deployment

The original `npm run build` emits a Cloudflare Worker for Sites. It is not a static Vite site and its `dist/client` folder alone cannot serve the application routes on Vercel.

Vercel uses `vercel.json` and the separate `vite.vercel.config.ts`. The build command is `npm run build:vercel`. Vinext and Nitro emit the Vercel Build Output API structure in `.vercel/output`: static assets, a Node server function and a filesystem-first catch-all route. The existing Sites configuration is preserved.

## Existing Vercel project

1. Sign into the team that owns `sahils-projects-5fada0e0/portfolio`.
2. In Settings → Git, connect `sahil-lab/portfolio` if not already connected. Production branch: `main`.
3. Root directory: repository root. Framework preset: Other (`framework: null` in vercel.json). Node.js: 24.x.
4. Allow the repository configuration to set Install Command (`npm ci`) and Build Command (`npm run build:vercel`). Remove any old Output Directory override; Nitro emits `.vercel/output` directly. Do not set output to `dist` or `dist/client`.
5. Deploy the latest main commit, or redeploy after changing project settings. Wait for Ready, then use the deployment's Visit link. The dashboard URL is not the public site URL.

A dashboard 404 can also mean the wrong account/team or an unavailable project; code changes cannot repair account access. Check the deployed `.vercel.app` URL separately.

## Linux PC assets

`npm run build:vercel` automatically runs `prebuild:vercel`, which invokes
`node scripts/build-city-shells.cjs --prepare-friends` before the adapter builds.
This prepares city shells, losslessly packed hero models and the v86 WebAssembly,
firmware, Linux image, license, and manifest under `public/assets/friends-pc`.
These generated files are intentionally ignored by Git, so a fresh deployment
must prepare them even when Linux already works on a developer's computer.
The build needs HTTPS access to the firmware and kernel sources in the preparation
script and fails if those required downloads fail. Do not replace the configured
build command with a direct `vite build` command that skips the npm prebuild hook.

After deploying this change, `/assets/friends-pc/manifest.json` must return JSON,
and all boot files must return HTTP 200. `scripts/check-vercel-output.cjs` checks
that the packaged Linux files match their manifest sizes and SHA-256 hashes.

Leave **Internet** unchecked when testing Linux boot on Vercel. Guest internet
access separately requires `NEXT_PUBLIC_GUEST_RELAY` pointing to a secured HTTPS
relay; the Render multiplayer room service is not that relay. An unconfigured
guest relay does not prevent offline Linux boot. This fix does not expose the
local relay or provision a public proxy.

## Local verification

```sh
npm ci
npm run build:vercel
node scripts/check-vercel-output.cjs
```

These commands validate the generated deployment output without deploying it.
With the current plugins, `vite preview --config vite.vercel.config.ts` can request
a missing `dist/server/index.js`; it is not a reliable runner for this Vercel build.
Local artifact verification must serve `.vercel/output/static` first, then route
remaining requests to the default Fetch handler in
`.vercel/output/functions/__server.func/index.mjs`. The 9 October statue safety
checks used that routing on Node 24, with the verification-only adapter and
desktop/mobile evidence under `outputs/performance/oct9-statue-safety/`.
Local success is not evidence of a successful hosted deployment.

To verify Linux without a guest relay against a running local preview:

```sh
npm exec --yes --package=playwright -- node scripts/check-friends-pc.cjs --offline --url=http://127.0.0.1:3001/
```

The browser check uses a temporary local multiplayer room server, verifies the
real Linux kernel and boot asset responses, and captures desktop/mobile layouts.

Verified 19 September 2026 on Node 24: production adapter build; root, résumé, projects, GLB and PDF HTTP 200; actual game rendered and Packet Press responded with no browser console errors. All 26 gameplay tests passed. The installed Vercel context plugin requires a new agent session to load its tools. Authenticated Vercel deployment status still needs verification after sign-in.

References: [Vinext deployment documentation](https://github.com/cloudflare/vinext#other-platforms-via-nitro), [Nitro Vercel adapter](https://nitro.build/deploy/providers/vercel).
