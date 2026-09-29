const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const packageInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
assert.equal(packageInfo.scripts['prebuild:vercel'], 'npm run friends:prepare', 'Vercel must prepare the generated Linux files before building');
const root = path.resolve(__dirname, '../.vercel/output');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
assert.equal(config.version, 3);
assert(config.routes.some(r => r.handle === 'filesystem'), 'Static files must be served');
assert(config.routes.some(r => r.src === '/(.*)' && r.dest === '/__server'), 'App routes need the server fallback');
for (const file of ['static/assets/packet-press.glb', 'static/assets/workshop-mural.webp', 'static/resume-sahil.pdf', 'functions/__server.func/index.mjs']) {
  assert(fs.statSync(path.join(root, file)).size > 0, `Missing deployment file: ${file}`);
}
const linuxRoot = path.join(root, 'static/assets/friends-pc');
const manifest = JSON.parse(fs.readFileSync(path.join(linuxRoot, 'manifest.json'), 'utf8'));
assert.equal(manifest.guest, 'Buildroot Linux 6.8');
for (const file of ['v86.wasm', 'v86-LICENSE', 'seabios.bin', 'vgabios.bin', 'buildroot-bzimage68.bin']) {
  const asset = manifest.assets.find(entry => entry.file === file);
  assert(asset, `Missing Linux manifest entry: ${file}`);
  const bytes = fs.readFileSync(path.join(linuxRoot, file));
  assert.equal(bytes.length, asset.bytes, `Incorrect deployed Linux file size: ${file}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `Incorrect deployed Linux file hash: ${file}`);
}
const runtime = JSON.parse(fs.readFileSync(path.join(root, 'functions/__server.func/.vc-config.json'), 'utf8'));
assert.match(runtime.runtime, /^nodejs\d+\.x$/);
console.log('Vercel output verified: application routing, static assets, Linux boot files and Node function.');
