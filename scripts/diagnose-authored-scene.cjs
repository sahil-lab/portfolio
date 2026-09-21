const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const output = path.resolve('outputs/playtest/authored-world');
const report = { diagnostic: 'Skills, 1280x800, Low, disposable browser', stages: [], assertions: [], errors: [] };
const messages = [];
const log = message => { messages.push(message); console.log(message); };

async function installProbe() {
  const world = globalThis.__authored;
  const three = await import('/node_modules/three/build/three.module.js');
  const geography = await import('/app/planet-geography.ts');
  const renderer = world.renderer;
  const diagnostic = globalThis.__diagnoseScene = {
    three, geography, sequence: 0, label: 'setup-low', frames: [], pointerEvents: [],
    latest: null, active: null, inspectPose: null, pending: null,
  };
  const visible = object => {
    for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false;
    return true;
  };
  const ancestry = object => {
    const chain = [];
    for (let ancestor = object; ancestor && ancestor !== world.scene; ancestor = ancestor.parent) chain.unshift(ancestor);
    return chain;
  };
  const title = object => object.name || `${object.type}#${object.id}`;
  const counters = () => ({ calls: 0, triangles: 0, lines: 0, points: 0, objects: new Set(), callbacks: 0 });
  const add = (table, key, object, delta) => {
    if (!table.has(key)) table.set(key, counters());
    const entry = table.get(key);
    for (const field of ['calls', 'triangles', 'lines', 'points']) entry[field] += delta[field] || 0;
    entry.objects.add(object.id);
  };
  const plain = entry => ({ ...entry, objects: entry.objects.size });
  const top = table => [...table].map(([name, entry]) => ({ name, ...plain(entry) }))
    .sort((left, right) => right.calls - left.calls || right.triangles - left.triangles).slice(0, 10);
  const readInfo = () => {
    const info = renderer.info.render;
    return { calls: info.calls, triangles: info.triangles, lines: info.lines, points: info.points };
  };
  diagnostic.visible = visible;
  diagnostic.ancestry = ancestry;
  diagnostic.title = title;
  diagnostic.summary = frame => ({
    sequence: frame.sequence, stage: frame.stage, quality: 'low', shadowsEnabled: renderer.shadowMap.enabled,
    raw: plain(frame.raw), shadow: plain(frame.shadow), postprocess: plain(frame.postprocess),
    meshBeforeRenderCallbacks: frame.callbacks, shadowCallbacks: frame.shadowCallbacks,
    top10Roots: top(frame.roots), top10NamedBranches: top(frame.branches), top10Prefixes: top(frame.prefixes),
    targets: [...frame.targets], rendererInfo: readInfo(), player: frame.player, planet: frame.planet,
    visibleHomeRoots: frame.visibleHomeRoots, camera: frame.camera, elapsedMs: performance.now() - frame.started,
  });
  const render = renderer.render;
  renderer.render = function (object, camera, ...rest) {
    const previous = diagnostic.active;
    if (object === world.scene && camera === world.camera) {
      const frame = {
        sequence: ++diagnostic.sequence, stage: diagnostic.label, started: performance.now(),
        raw: counters(), shadow: counters(), postprocess: counters(), callbacks: 0, shadowCallbacks: 0,
        roots: new Map(), branches: new Map(), prefixes: new Map(), targets: new Set(),
        player: world.player.position.toArray(), planet: world.transport.journey.current,
        visibleHomeRoots: world.scene.children.filter(child => visible(child) && /City|Workshop|Commons|Awe|Scenery|Batch/i.test(child.name)).map(title),
        camera: world.camera.position.toArray(),
      };
      diagnostic.latest = frame;
      diagnostic.frames.push(frame);
      if (diagnostic.frames.length > 180) diagnostic.frames.shift();
      diagnostic.active = { kind: 'scene', frame };
    } else diagnostic.active = { kind: 'postprocess', frame: diagnostic.latest };
    try { return render.call(this, object, camera, ...rest); }
    finally { diagnostic.active = previous; }
  };
  const direct = renderer.renderBufferDirect;
  renderer.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const before = readInfo();
    const result = direct.call(this, camera, scene, geometry, material, object, group);
    const active = diagnostic.active;
    if (!active?.frame || !object) return result;
    const after = readInfo();
    const delta = Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]]));
    if (delta.calls <= 0) return result;
    const frame = active.frame;
    const kind = active.kind === 'postprocess' ? 'postprocess' : camera === world.camera ? 'raw' : 'shadow';
    const tally = frame[kind];
    for (const field of Object.keys(delta)) tally[field] += delta[field];
    tally.objects.add(object.id);
    frame.targets.add(`${kind}:${renderer.getRenderTarget()?.texture?.name || (renderer.getRenderTarget() ? 'offscreen' : 'screen')}`);
    if (kind === 'raw') {
      const chain = ancestry(object);
      const root = chain[0] || object;
      const named = chain.filter(entry => entry.name).slice(0, 4).map(title).join(' / ');
      const prefix = (object.name || object.type).split(/[_\s]/)[0];
      add(frame.roots, title(root), object, delta);
      add(frame.branches, named || title(root), object, delta);
      add(frame.prefixes, prefix, object, delta);
    }
    return result;
  };
  world.scene.traverse(object => {
    if (!object.isMesh && !object.isLine && !object.isPoints && !object.isSprite) return;
    const before = object.onBeforeRender;
    object.onBeforeRender = function (...args) {
      if (diagnostic.active?.kind === 'scene' && args[2] === world.camera) diagnostic.active.frame.callbacks++;
      return before?.apply(this, args);
    };
    const shadow = object.onBeforeShadow;
    object.onBeforeShadow = function (...args) {
      if (diagnostic.active?.frame) diagnostic.active.frame.shadowCallbacks++;
      return shadow?.apply(this, args);
    };
  });
  const beforeScene = world.scene.onBeforeRender;
  world.scene.onBeforeRender = function (...args) {
    beforeScene?.apply(this, args);
    if (diagnostic.inspectPose) {
      world.camera.position.fromArray(diagnostic.inspectPose.position);
      world.camera.up.fromArray(diagnostic.inspectPose.up);
      world.camera.lookAt(new three.Vector3().fromArray(diagnostic.inspectPose.target));
      world.camera.updateMatrixWorld(true);
    }
  };
  const afterScene = world.scene.onAfterRender;
  world.scene.onAfterRender = function (...args) {
    afterScene?.apply(this, args);
    if (diagnostic.pending && diagnostic.sequence >= diagnostic.pending.after) {
      const pending = diagnostic.pending;
      diagnostic.pending = null;
      const frame = diagnostic.summary(diagnostic.latest);
      pending.resolve({
        frame, measurement: diagnostic.measure?.(),
        image: renderer.domElement.toDataURL('image/png'),
      });
    }
  };
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) {
    document.addEventListener(type, event => {
      if (type === 'pointermove' && !event.buttons) return;
      diagnostic.pointerEvents.push({
        type, target: event.target.tagName, className: String(event.target.className),
        canvas: event.target === renderer.domElement, x: event.clientX, y: event.clientY,
        buttons: event.buttons, pointerId: event.pointerId, deltaY: event.deltaY,
      });
    }, true);
  }
  return {
    revision: three.REVISION, directRenderer: !!world.renderer, directCamera: !!world.camera,
    autoReset: renderer.info.autoReset, shadowsEnabled: renderer.shadowMap.enabled,
    sceneScale: world.scene.scale.toArray(), objects: (() => { let count = 0; world.scene.traverse(() => count++); return count; })(),
  };
}

function installMeasurements() {
  const world = globalThis.__authored;
  const diagnostic = globalThis.__diagnoseScene;
  const three = diagnostic.three;
  const corners = box => {
    const points = [];
    for (const horizontal of [box.min.x, box.max.x]) for (const height of [box.min.y, box.max.y]) {
      for (const depth of [box.min.z, box.max.z]) points.push(new three.Vector3(horizontal, height, depth));
    }
    return points;
  };
  const round = number => Math.round(number * 10000) / 10000;
  const vector = point => point.toArray().map(round);
  const projection = points => {
    const coordinates = points.map(point => {
      const cameraPoint = point.clone().applyMatrix4(world.camera.matrixWorldInverse);
      const projected = point.clone().project(world.camera);
      return { depth: -cameraPoint.z, ndc: projected };
    });
    const inFront = coordinates.filter(point => point.depth > 0);
    if (!inFront.length) return { allBehind: true, points: coordinates.length };
    const minimum = axis => Math.min(...inFront.map(point => point.ndc[axis]));
    const maximum = axis => Math.max(...inFront.map(point => point.ndc[axis]));
    const rect = { left: (minimum('x') + 1) * 640, right: (maximum('x') + 1) * 640, top: (1 - maximum('y')) * 400, bottom: (1 - minimum('y')) * 400 };
    return {
      pixelBounds: Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, round(value)])),
      ndcMin: ['x', 'y', 'z'].map(axis => round(minimum(axis))), ndcMax: ['x', 'y', 'z'].map(axis => round(maximum(axis))),
      depthRange: [Math.min(...coordinates.map(point => point.depth)), Math.max(...coordinates.map(point => point.depth))].map(round),
      behindCamera: coordinates.filter(point => point.depth <= 0).length,
      nearClipped: coordinates.filter(point => point.depth < world.camera.near).length,
      farClipped: coordinates.filter(point => point.depth > world.camera.far).length,
      cornersInFrustum: coordinates.filter(point => point.depth > 0 && Math.abs(point.ndc.x) <= 1 && Math.abs(point.ndc.y) <= 1 && Math.abs(point.ndc.z) <= 1).length,
      totalCorners: coordinates.length,
      note: 'Projected geometry bounding-box corners, not a pixel visibility percentage',
    };
  };
  const winding = geometry => {
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    if (!positions || !normals) return null;
    const count = geometry.index?.count ?? positions.count;
    let agree = 0, oppose = 0, degenerate = 0;
    for (let offset = 0; offset + 2 < Math.min(count, 72); offset += 3) {
      const indices = [0, 1, 2].map(delta => geometry.index ? geometry.index.getX(offset + delta) : offset + delta);
      const vertices = indices.map(index => new three.Vector3().fromBufferAttribute(positions, index));
      const normal = indices.reduce((sum, index) => sum.add(new three.Vector3().fromBufferAttribute(normals, index)), new three.Vector3());
      const face = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
      const dot = face.dot(normal);
      if (Math.abs(dot) < 1e-8) degenerate++; else if (dot > 0) agree++; else oppose++;
    }
    return { agree, oppose, degenerate, note: 'At most 24 local triangles compared with vertex normals' };
  };
  diagnostic.measure = () => {
    const landscape = world.transport.landscapes[world.transport.journey.current];
    const landmark = landscape?.realm?.landmarks[0];
    if (!landmark) return null;
    world.scene.updateMatrixWorld(true);
    world.camera.updateMatrixWorld(true);
    const surface = world.transport.surfaces[world.transport.journey.current];
    const origin = landmark.root.getWorldPosition(new three.Vector3());
    const rotation = landmark.root.getWorldQuaternion(new three.Quaternion());
    const inverse = landmark.root.matrixWorld.clone().invert();
    const architecturePoints = [], samples = [], includedNames = new Map();
    const accepted = /^(Aqueduct_|Dataflow_|Wheel_|SkillsDetail_)/;
    const inspectPart = (object, partName, matrix, instance) => {
      if (!accepted.test(partName) || !diagnostic.visible(object)) return;
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox) return;
      const center = object.geometry.boundingBox.getCenter(new three.Vector3()).applyMatrix4(matrix);
      const localCenter = center.clone().applyMatrix4(inverse);
      if (Math.abs(localCenter.x) > 35 || localCenter.z < -35 || localCenter.z > 25 || localCenter.y < -8 || localCenter.y > 45) return;
      const points = corners(object.geometry.boundingBox).map(point => point.applyMatrix4(matrix));
      architecturePoints.push(...points);
      includedNames.set(partName, (includedNames.get(partName) || 0) + 1);
      if (samples.length < 14 && !samples.some(sample => sample.name === partName)) {
        const clearances = points.map(point => {
          const localPoint = world.scene.worldToLocal(point.clone());
          const normal = localPoint.clone().sub(surface.center).normalize();
          return localPoint.sub(diagnostic.geography.planetPoint(surface, normal)).dot(normal) * world.scene.scale.x;
        });
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        samples.push({
          name: partName, mesh: diagnostic.title(object), instance, worldCenter: vector(center), landmarkLocalCenter: vector(localCenter),
          projectedCenter: projection([center]), terrainCornerClearance: [Math.min(...clearances), Math.max(...clearances)].map(round),
          determinant: round(matrix.determinant()), winding: winding(object.geometry),
          materials: materials.map(material => ({ side: material.side, transparent: material.transparent, opacity: material.opacity, depthTest: material.depthTest, depthWrite: material.depthWrite })),
        });
      }
    };
    landscape.realm.root.traverse(object => {
      if (!object.isMesh) return;
      if (object.isInstancedMesh) {
        for (let instance = 0; instance < object.count; instance++) {
          const matrix = new three.Matrix4();
          object.getMatrixAt(instance, matrix);
          inspectPart(object, object.userData.partNames?.[instance] || object.name, object.matrixWorld.clone().multiply(matrix), instance);
        }
      } else inspectPart(object, object.name, object.matrixWorld, null);
    });
    const mainBox = new three.Box3().setFromObject(landmark.root);
    const architectureBox = new three.Box3().setFromPoints(architecturePoints);
    const center = architectureBox.isEmpty() ? origin : architectureBox.getCenter(new three.Vector3());
    const playerWorld = world.player.getWorldPosition(new three.Vector3());
    const forward = world.camera.getWorldDirection(new three.Vector3());
    const horizontalForward = forward.clone().projectOnPlane(world.player.up);
    const horizontalOffset = world.camera.position.clone().sub(playerWorld).projectOnPlane(world.player.up);
    const targetDistance = -horizontalOffset.dot(horizontalForward) / horizontalForward.lengthSq();
    const actualTarget = world.camera.position.clone().addScaledVector(forward, targetDistance);
    const direction = world.camera.position.clone().sub(actualTarget).normalize();
    const cameraDistance = world.camera.position.distanceTo(actualTarget);
    const ray = new three.Ray(actualTarget, direction);
    const hits = [];
    world.scene.traverse(object => {
      const bounds = [...(object.userData.staticCameraBounds || [])];
      if (object.isMesh && object.userData.cameraSolid) bounds.push(new three.Box3().setFromObject(object).expandByScalar(.3));
      for (const bound of bounds) {
        if (bound.containsPoint(actualTarget)) continue;
        const point = ray.intersectBox(bound, new three.Vector3());
        if (point) hits.push({ name: diagnostic.ancestry(object).map(diagnostic.title).join(' / ') || 'Scene', effectiveVisible: diagnostic.visible(object), distance: round(actualTarget.distanceTo(point)), bound: { min: vector(bound.min), max: vector(bound.max) } });
      }
    });
    hits.sort((left, right) => left.distance - right.distance);
    const rawObjects = [];
    world.scene.traverse(object => { if (object.isMesh && diagnostic.latest.raw.objects.has(object.id)) rawObjects.push(object); });
    const sightlines = samples.filter(sample => /Aqueduct_(TimberPier|CarvedTrough)|Dataflow_Sluice/.test(sample.name)).slice(0, 3).map(sample => {
      const target = new three.Vector3().fromArray(sample.worldCenter);
      const distance = world.camera.position.distanceTo(target);
      const raycaster = new three.Raycaster(world.camera.position, target.sub(world.camera.position).normalize(), 0, distance + .5);
      return { target: sample.name, distance: round(distance), hits: raycaster.intersectObjects(rawObjects, false).slice(0, 4).map(hit => ({ name: diagnostic.title(hit.object), instance: hit.instanceId, distance: round(hit.distance) })) };
    });
    diagnostic.architecturePoints = architecturePoints;
    diagnostic.architectureCenter = center;
    diagnostic.landmarkRotation = rotation;
    return {
      landmark: landmark.name, mainPositionLocal: vector(landmark.position), getWorldPosition: vector(origin), sceneTransformedMainPosition: vector(world.scene.localToWorld(landmark.position.clone())),
      rootVisible: diagnostic.visible(landmark.root), rootBox: { min: vector(mainBox.min), max: vector(mainBox.max), projection: projection(corners(mainBox)) },
      architectureBox: { min: vector(architectureBox.min), max: vector(architectureBox.max), size: vector(architectureBox.getSize(new three.Vector3())), projection: projection(architecturePoints), parts: Object.fromEntries(includedNames) },
      camera: {
        position: vector(world.camera.position), forward: vector(forward), up: vector(world.camera.up), quaternion: world.camera.quaternion.toArray(),
        fov: world.camera.fov, aspect: world.camera.aspect, near: world.camera.near, far: world.camera.far,
        landmarkLocalPosition: vector(world.camera.position.clone().applyMatrix4(inverse)),
        aimAngleToOriginDegrees: round(forward.angleTo(origin.clone().sub(world.camera.position)) * 180 / Math.PI),
        aimAngleToArchitectureCenterDegrees: round(forward.angleTo(center.clone().sub(world.camera.position)) * 180 / Math.PI),
        playerWorld: vector(playerWorld), inferredLookTarget: vector(actualTarget), inferredFocusHeight: round(actualTarget.clone().sub(playerWorld).dot(world.player.up)),
        distanceToPlayerFocus: round(cameraDistance), nearestObstructions: hits.slice(0, 10),
      },
      interactionPointLocal: vector(landmark.interactionPoint), distanceToInteraction: round(world.player.position.distanceTo(landmark.interactionPoint)),
      samples, sightlines, poseKind: diagnostic.inspectPose ? 'DIAGNOSTIC OVERRIDE, NOT NORMAL GAMEPLAY' : 'normal gameplay',
    };
  };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const sourceFiles = ['app/world.ts', 'app/game-camera.ts', 'app/game-input.ts', 'app/realm-world.ts', 'app/transit-world.ts', 'app/kingdom-presentation.ts', 'scripts/check-authored-world.cjs'];
  const fingerprint = () => Object.fromEntries(sourceFiles.map(file => [file, require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  report.sourcesBefore = fingerprint();
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const deadline = setTimeout(() => { report.errors.push('Diagnostic exceeded eight-minute deadline'); void browser.close(); }, 480000);
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      const settings = { muted: true, volume: .6, stableCamera: false, reducedMotion: false, quality: 'low' };
      const storage = new Map([['living-computer-kingdom:v1', JSON.stringify({ version: 1, settings, delivery: null })]]);
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) } });
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(success, error) { error({ code: 1 }); } } });
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.routeWebSocket(url => url.hostname === 'localhost' && url.port === '3000', client => {
      const server = client.connectToServer();
      server.onMessage(message => {
        let event;
        try { event = JSON.parse(String(message)); } catch { client.send(message); return; }
        if (event.type !== 'update' && event.type !== 'full-reload') client.send(message);
      });
    });
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /THREE|Shader|WebGL/.test(message.text())) report.errors.push(message.text()); });
    log('Opening existing localhost:3000 once, isolated storage, Low from startup, 1280x800.');
    await page.goto('http://localhost:3000/?authored-scene-diagnostic=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('.loading').waitFor({ state: 'hidden', timeout: 90000 });
    await page.waitForFunction(() => {
      const main = document.querySelector('main');
      if (!main) return false;
      let fiber = main[Object.keys(main).find(key => key.startsWith('__reactFiber$'))];
      while (fiber) {
        let hook = fiber.memoizedState;
        while (hook) {
          const world = hook.memoizedState?.current;
          if (world?.scene && world?.city && world?.camera && world?.renderer) { globalThis.__authored = world; return true; }
          hook = hook.next;
        }
        fiber = fiber.return;
      }
      return false;
    });
    report.probe = await page.evaluate(installProbe);
    assert.equal(report.probe.shadowsEnabled, false, 'Low must be active from startup');
    await page.evaluate(installMeasurements);
    report.scene = await page.evaluate(() => globalThis.__authored.scene.uuid);
    log('Probe installed: ' + JSON.stringify(report.probe));

    async function saveSample(name, sample, screenshot = true) {
      fs.writeFileSync(path.join(output, `${name}-raw.png`), Buffer.from(sample.image.split(',')[1], 'base64'));
      delete sample.image;
      report.stages.push({ name, ...sample });
      const frame = sample.frame;
      log(`${name}: raw ${frame.raw.calls} draws / ${frame.raw.triangles} triangles / ${frame.raw.objects} objects; shadows ${frame.shadow.calls}; postprocess ${frame.postprocess.calls}; callbacks ${frame.meshBeforeRenderCallbacks}; renderer ${frame.rendererInfo.calls}`);
      log('Top 10 roots: ' + JSON.stringify(frame.top10Roots));
      log('Top 10 prefixes: ' + JSON.stringify(frame.top10Prefixes));
      if (sample.measurement) log('Camera: ' + JSON.stringify({ ...sample.measurement.camera, architectureProjection: sample.measurement.architectureBox.projection }));
      assert.equal(frame.raw.calls + frame.shadow.calls + frame.postprocess.calls, frame.rendererInfo.calls, 'Actual draw instrumentation must reconcile with renderer.info');
      assert.equal(frame.shadow.calls, 0, 'Low must not render shadows');
      assert.equal(frame.postprocess.calls, 0, 'Low must not run a composer');
      if (screenshot) await page.screenshot({ path: path.join(output, `${name}-page.png`), timeout: 90000 });
      assert.equal(await page.evaluate(() => globalThis.__authored.scene.uuid), report.scene, 'Page must not reload');
      fs.writeFileSync(path.join(output, 'diagnose-authored-scene.json'), JSON.stringify(report, null, 2));
    }
    async function capture(name, frames = 3) {
      const sample = await page.evaluate(({ name, frames }) => {
        const diagnostic = globalThis.__diagnoseScene;
        diagnostic.label = name;
        return new Promise(resolve => { diagnostic.pending = { after: diagnostic.sequence + frames, resolve }; });
      }, { name, frames });
      await saveSample(name, sample);
      return sample;
    }
    const destination = await page.evaluate(async () => {
      const { transitStops } = await import('/app/transit-config.ts');
      const index = transitStops.findIndex(stop => stop.id === 'skills-technology');
      globalThis.__authored.home();
      globalThis.__authored.goTransitHub();
      return { index, name: transitStops[index].name };
    });
    await page.getByRole('button', { name: 'Interact', exact: true }).click();
    await page.locator('.transit-panel').waitFor({ state: 'visible' });
    await page.locator('.planet-destinations').getByRole('button').filter({ hasText: destination.name }).click();
    await page.getByRole('button', { name: /Board metro/ }).click();
    await page.waitForFunction(() => globalThis.__authored.transport.journey.mode === 'metro');
    if (await page.locator('.transit-panel').isVisible()) await page.keyboard.press('Escape');
    report.boarding = { actualStationBoard: true, destination };
    log('Boarded Skills using station UI; using the existing arriveNow hook to skip travel time.');
    const arrival = await page.evaluate(() => {
      const world = globalThis.__authored, diagnostic = globalThis.__diagnoseScene;
      const before = { sequence: diagnostic.sequence, stats: world.renderStats(), stage: diagnostic.latest?.stage };
      world.transport.arriveNow();
      const immediate = { sequence: diagnostic.sequence, stats: world.renderStats(), planet: world.transport.journey.current };
      diagnostic.label = 'skills-landing-frame-1-low';
      return new Promise(resolve => { diagnostic.pending = { after: diagnostic.sequence + 1, resolve: sample => resolve({ before, immediate, ...sample }) }; });
    });
    report.arrivalTransition = { before: arrival.before, immediate: arrival.immediate };
    await saveSample('skills-landing-frame-1-low', arrival);
    await capture('skills-landing-settled-low', 12);
    report.landingFrameHistory = await page.evaluate(() => globalThis.__diagnoseScene.frames.filter(frame => frame.stage.startsWith('skills-landing')).map(frame => ({ sequence: frame.sequence, stage: frame.stage, rawCalls: frame.raw.calls, triangles: frame.raw.triangles, roots: [...frame.roots].map(([name, entry]) => ({ name, calls: entry.calls })).sort((left, right) => right.calls - left.calls).slice(0, 10) })));

    report.walk = await page.evaluate(() => {
      const world = globalThis.__authored;
      const target = world.transport.landscapes[world.transport.journey.current].realm.landmarks[0].interactionPoint;
      const start = world.player.position.clone();
      let steps = 0, stalled = 0;
      for (let step = 0; step < 12; step++) world.step(0, 1);
      for (let step = 0; step < 8; step++) world.step(1, 0);
      while (world.player.position.distanceTo(target) > 2.3 && steps < 260) {
        const previous = world.player.position.clone();
        const frame = world.player.userData.surfaceFrame ?? world.player.quaternion.clone().identity();
        const direction = target.clone().sub(world.player.position).projectOnPlane(world.player.up).applyQuaternion(frame.clone().invert()).normalize();
        const angles = stalled > 1 ? [.7, -.7, 1.1, -1.1, 1.6, -1.6, 0] : [0, .35, -.35, .7, -.7, 1.1, -1.1];
        for (const angle of angles) {
          const horizontal = direction.x * Math.cos(angle) + direction.z * Math.sin(angle);
          const depth = -direction.x * Math.sin(angle) + direction.z * Math.cos(angle);
          world.step(horizontal, depth);
          if (world.player.position.distanceTo(previous) > .01) break;
        }
        stalled = world.player.position.distanceTo(previous) < .01 ? stalled + 1 : 0;
        steps++;
        if (stalled > 8) break;
      }
      return { approach: '12 south + 8 east, then spherical walking', steps, distance: world.player.position.distanceTo(target), travelled: world.player.position.distanceTo(start), prompt: world.transport.prompt(), position: world.player.position.toArray() };
    });
    log('Physical walk: ' + JSON.stringify(report.walk));
    assert.ok(report.walk.distance < 5, 'Regular walking must reach the demo');
    await page.getByRole('button', { name: 'Interact', exact: true }).click();
    await capture('skills-demo-before-drag-low', 6);
    report.turn = await page.evaluate(() => {
      const world = globalThis.__authored, player = world.player;
      const landmark = world.transport.landscapes[world.transport.journey.current].realm.landmarks[0];
      const frame = player.userData.surfaceFrame;
      const target = player.getWorldPosition(player.position.clone()).addScaledVector(player.up, 1.5);
      const current = world.camera.position.clone().sub(target).normalize().applyQuaternion(frame.clone().invert());
      const desired = player.position.clone().set(0, 0, 1).applyQuaternion(landmark.rotation).applyQuaternion(frame.clone().invert());
      const yaw = Math.atan2(desired.x, desired.z), now = Math.atan2(current.x, current.z);
      let delta = yaw - now;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      return { x: -delta / .005, y: (.48 - Math.asin(current.y)) / .004, desiredYaw: yaw, currentYaw: now, delta, currentPitch: Math.asin(current.y) };
    });
    const canvas = await page.locator('.world canvas').boundingBox();
    const drag = { x: canvas.x + canvas.width * .5, y: canvas.y + canvas.height * .55 };
    async function performDrag(label, horizontal, vertical, steps) {
      const hit = await page.evaluate(point => {
        const element = document.elementFromPoint(point.x, point.y);
        return { canvas: element === globalThis.__authored.renderer.domElement, element: element?.tagName, className: String(element?.className), text: element?.textContent?.slice(0, 180), stack: document.elementsFromPoint(point.x, point.y).slice(0, 6).map(item => `${item.tagName}.${item.className}`) };
      }, drag);
      report.assertions.push({ name: `${label}: elementFromPoint is canvas`, passed: hit.canvas, hit });
      log(`${label} hit test: ${JSON.stringify(hit)}`);
      try { assert.equal(hit.canvas, true, 'Drag origin must hit the canvas'); }
      catch (error) { log('UI INTERCEPTION: ' + error.message); return false; }
      await page.mouse.move(drag.x, drag.y);
      await page.mouse.down();
      await page.mouse.move(drag.x + horizontal, drag.y + vertical, { steps });
      await page.mouse.up();
      return true;
    }
    report.turn.applied = await performDrag('existing demo drag', report.turn.x, report.turn.y, 8);
    await capture('skills-demo-after-drag-low', 8);
    report.retreat = await page.evaluate(() => {
      const world = globalThis.__authored, player = world.player;
      const landmark = world.transport.landscapes[world.transport.journey.current].realm.landmarks[0];
      const before = player.position.toArray();
      for (let step = 0; step < 11; step++) {
        const direction = player.position.clone().sub(landmark.position).projectOnPlane(player.up).applyQuaternion(player.userData.surfaceFrame.clone().invert()).normalize();
        world.step(direction.x, direction.z);
      }
      return { before, after: player.position.toArray() };
    });
    report.architectureDragApplied = await performDrag('existing architecture drag', 0, -65, 5);
    await page.mouse.wheel(0, 400);
    await capture('skills-existing-architecture-low', 18);
    report.pointerEvents = await page.evaluate(() => globalThis.__diagnoseScene.pointerEvents);
    report.demo = await page.evaluate(() => globalThis.__authored.transport.landscapes[globalThis.__authored.transport.journey.current].realm.demo.snapshot);

    report.inspectPose = await page.evaluate(() => {
      const diagnostic = globalThis.__diagnoseScene, world = globalThis.__authored, three = diagnostic.three;
      diagnostic.measure();
      const center = diagnostic.architectureCenter;
      const up = new three.Vector3(0, 1, 0).applyQuaternion(diagnostic.landmarkRotation);
      const offset = new three.Vector3(.5, .45, 1).normalize().applyQuaternion(diagnostic.landmarkRotation);
      const right = new three.Vector3().crossVectors(up, offset).normalize();
      const cameraUp = new three.Vector3().crossVectors(offset, right).normalize();
      const tangent = Math.tan(world.camera.fov * Math.PI / 360);
      let distance = 1;
      for (const point of diagnostic.architecturePoints) {
        const relative = point.clone().sub(center);
        distance = Math.max(distance, relative.dot(offset) + Math.max(Math.abs(relative.dot(cameraUp)) / tangent, Math.abs(relative.dot(right)) / (tangent * world.camera.aspect)));
      }
      diagnostic.inspectPose = { position: center.clone().addScaledVector(offset, distance * 1.18).toArray(), target: center.toArray(), up: up.toArray(), label: 'DIAGNOSTIC CAMERA OVERRIDE, NOT NORMAL GAMEPLAY' };
      return diagnostic.inspectPose;
    });
    log('Taking diagnostic-only fitted camera view of the real, unchanged scene after walking.');
    await capture('diagnostic-only-skills-inspect-camera-low', 2);
    await page.evaluate(() => { globalThis.__diagnoseScene.inspectPose = null; });
    report.balanced = 'Not run: Low draw counts reconcile exactly with raw scene draws and exclude both shadow and postprocess work.';
    report.completed = true;
    assert.deepEqual(report.errors, [], 'Browser shader/runtime errors');
  } catch (error) {
    report.failure = error.stack || String(error);
    process.exitCode = 1;
    log('DIAGNOSTIC FAILURE: ' + report.failure);
    if (page && !page.isClosed()) {
      try { await page.screenshot({ path: path.join(output, 'diagnostic-failure.png'), timeout: 15000 }); } catch {}
    }
  } finally {
    await browser.close();
    clearTimeout(deadline);
    report.browserClosed = true;
    report.sourcesAfter = fingerprint();
    report.sourceDrift = sourceFiles.filter(file => report.sourcesBefore[file] !== report.sourcesAfter[file]);
    if (report.sourceDrift.length) log('SOURCE DRIFT: ' + report.sourceDrift.join(', '));
    log(`Finished: exit ${process.exitCode || 0}; disposable browser closed; no child execution left running.`);
    fs.writeFileSync(path.join(output, 'diagnose-authored-scene.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output, 'diagnose-authored-scene.log'), messages.join('\n') + '\n');
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

