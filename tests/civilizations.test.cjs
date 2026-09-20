const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {civilizationFor,civilizations,careerTimeline,careerSource}=require('../app/civilization-config.ts');
const T=require('three'),{createCivilizationWorld,logoContains,civilizationLogoDirection,civilizationLogoReserved}=require('../app/civilization-world.ts'),{createPlanetSurface}=require('../app/planet-geography.ts'),{transitStops}=require('../app/transit-config.ts'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};

test('civilizations reuse saved destination IDs and distinguish monochrome from blue and white',()=>{
  assert.equal(civilizationFor({id:'copper'}),'github');assert.equal(civilizationFor({id:'prism'}),'linkedin');
  assert.equal(civilizationFor({id:'garden'}),null);assert.equal(civilizationFor({id:'motherboard'}),null);
  assert.equal(civilizations.github.url,'https://github.com/sahil-lab');assert.equal(civilizations.linkedin.glass,'#0a66c2');
  assert.equal(civilizations.github.badge,'FORGE VISITED');assert.equal(civilizations.linkedin.badge,'CITADEL VISITED');
});

test('career districts use supplied records without inferring employers or a current role',()=>{
  assert.ok(careerTimeline.some(entry=>entry.name==='Persistent Systems Limited'));
  assert.ok(careerTimeline.some(entry=>entry.name==='Lovely Professional University (LPU)'));
  assert.ok(!careerTimeline.some(entry=>/Mercedes|TEKsystems|Microsoft|Amazon/.test(entry.name)));
  assert.match(careerSource,/curated, not a live/);assert.ok(careerTimeline.every(entry=>entry.dates&&entry.role));
});

test('official footprints keep the GitHub cutout and LinkedIn letter islands distinct',()=>{
  assert.equal(logoContains('github',12,3),true);assert.equal(logoContains('github',12,12),false);
  assert.equal(logoContains('linkedin',1,1),true);assert.equal(logoContains('linkedin',5,15),false);assert.equal(logoContains('linkedin',11,15),false);
});

test('giant architectural logos face the kingdom and preserve flat landing areas',()=>{
  for(const index of [1,3]){
    const scene=new T.Scene(),surface=createPlanetSurface(transitStops[index],transitStops[index].radius),world=createCivilizationWorld(scene,surface);
    assert.ok(world.root.userData.logoWidth>surface.radius);assert.ok(world.logoNormal.z>.85);
    assert.equal(world.blocked(new T.Vector3(surface.stop.x,surface.stop.y,surface.stop.z)),false);
    assert.equal(civilizationLogoReserved(surface,new T.Vector3(0,1,0)),false);
    assert.equal(civilizationLogoReserved(surface,civilizationLogoDirection(12,12,surface.radius,90)),true);
    assert.ok(world.landmarks.length>=5);world.update(1,true);disposeScene(scene);
  }
});

test('curved water exposes its outward face above the plinth, with clear white letter cutouts',()=>{
  const scene=new T.Scene(),surface=createPlanetSurface(transitStops[3],transitStops[3].radius),world=createCivilizationWorld(scene,surface);scene.updateMatrixWorld(true);
  const direction=civilizationLogoDirection(19,4,surface.radius,91),origin=surface.center.clone().addScaledVector(direction,surface.radius+40);
  const ray=new T.Raycaster(origin,direction.clone().negate()),pool=world.root.getObjectByName('Citadel_LinkedInReflectingPool');
  const hit=ray.intersectObject(pool)[0];assert.ok(hit,'The outer water face must be visible from orbit');assert.ok(hit.face.normal.dot(direction)>.5);
  const plinth=ray.intersectObject(world.root.getObjectByName('Citadel_WhiteLogoPlinth'))[0];assert.ok(plinth.distance-hit.distance>.35);disposeScene(scene);
});


