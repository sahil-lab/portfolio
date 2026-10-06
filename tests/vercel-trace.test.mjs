import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deduplicateTracedPackages } from '../vite.vercel.config.ts';

test('traced package copies have unique destinations without losing files or versions', async context => {
  const root = await mkdtemp(join(tmpdir(), 'kingdom-trace-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const first = join(root, 'node_modules', 'first', 'node_modules', '@scope', 'dependency');
  const second = join(root, 'node_modules', 'second', 'node_modules', '@scope', 'dependency');
  await Promise.all([mkdir(first, { recursive: true }), mkdir(second, { recursive: true })]);
  const original = join(first, 'index.js'), duplicate = join(second, 'index.js'), additional = join(second, 'extra.js');
  await Promise.all([writeFile(original, 'export default 1;'), writeFile(duplicate, 'export default 1;'), writeFile(additional, 'export default 2;')]);
  const packages = { '@scope/dependency': { versions: { '1.0.0': { files: [original, duplicate, original, additional] }, '2.0.0': { files: [duplicate] } } } };
  await deduplicateTracedPackages(packages);
  assert.deepEqual(packages['@scope/dependency'].versions['1.0.0'].files, [original, additional]);
  assert.deepEqual(packages['@scope/dependency'].versions['2.0.0'].files, [duplicate]);
  await writeFile(duplicate, 'export default 3;');
  packages['@scope/dependency'].versions['1.0.0'].files = [original, duplicate];
  await assert.rejects(deduplicateTracedPackages(packages), /Conflicting traced files for @scope\/dependency@1\.0\.0\/index\.js/);
});
