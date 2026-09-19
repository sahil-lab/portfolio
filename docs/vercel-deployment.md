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

## Local verification

```sh
npm ci
npm run build:vercel
node scripts/check-vercel-output.cjs
node node_modules/vite/bin/vite.js preview --config vite.vercel.config.ts --port 3001
```

Visit http://localhost:3001/, `/resume` and `/projects`. The preview runs the generated Vercel output locally; it is not evidence of a successful hosted deployment.

Verified 19 September 2026 on Node 24: production adapter build; root, résumé, projects, GLB and PDF HTTP 200; actual game rendered and Packet Press responded with no browser console errors. All 26 gameplay tests passed. The installed Vercel context plugin requires a new agent session to load its tools. Authenticated Vercel deployment status still needs verification after sign-in.

References: [Vinext deployment documentation](https://github.com/cloudflare/vinext#other-platforms-via-nitro), [Nitro Vercel adapter](https://nitro.build/deploy/providers/vercel).
