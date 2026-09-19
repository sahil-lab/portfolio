const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../.vercel/output');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
assert.equal(config.version, 3);
assert(config.routes.some(r => r.handle === 'filesystem'), 'Static files must be served');
assert(config.routes.some(r => r.src === '/(.*)' && r.dest === '/__server'), 'App routes need the server fallback');
for (const file of ['static/assets/packet-press.glb', 'static/assets/workshop-mural.webp', 'static/resume-sahil.pdf', 'functions/__server.func/index.mjs']) {
  assert(fs.statSync(path.join(root, file)).size > 0, `Missing deployment file: ${file}`);
}
const runtime = JSON.parse(fs.readFileSync(path.join(root, 'functions/__server.func/.vc-config.json'), 'utf8'));
assert.match(runtime.runtime, /^nodejs\d+\.x$/);
console.log('Vercel output verified: application routing, static assets and Node function.');
