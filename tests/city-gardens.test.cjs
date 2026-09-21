const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createArtificialTurf,createPoolCourt}=require('../app/city-gardens.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('pool courts have separate coping, water, turf and a bounded swimming footprint',()=>{
  const court=createPoolCourt(),root=court.root;assert.ok(root.getObjectByName('Pool_RoundedCoping'));assert.ok(root.getObjectByName('City_ArtificialTurf'));assert.ok(root.getObjectByName('Pool_LadderRail'));
  assert.equal(court.contains(0,0),true);assert.equal(court.contains(8,0),false);assert.ok(new T.Box3().setFromObject(root).max.y<1.2);
  const texture=court.water.material.map;court.update(1,true);assert.equal(texture.offset.x,0);court.update(.1,false);assert.ok(texture.offset.x>0);disposeScene(root);
});
test('artificial turf uses local textured geometry with a matte finish',()=>{
  const turf=createArtificialTurf(8,4);assert.equal(turf.material.map.image.width,32);assert.equal(turf.material.roughness,1);assert.ok(Array.from(turf.geometry.attributes.position.array).every(Number.isFinite));disposeScene(turf);
});

test('premium finishing keeps water smooth and turf matte without shifting their colors',()=>{
  const {finishKingdomMaterials}=require('../app/kingdom-art.ts'),scene=new T.Scene(),court=createPoolCourt();scene.add(court.root);
  const original=court.water.material.color.getHex();finishKingdomMaterials(scene);
  assert.equal(court.water.material.roughness,.17);assert.equal(court.water.material.color.getHex(),original);assert.equal(court.root.getObjectByName('City_ArtificialTurf').material.roughness,1);disposeScene(scene);
});

test('public pools leave the Commons boulevard, storefront entrances, and workshop spawn clear',()=>{
  const {createCityPublicSpaces,publicPoolSites}=require('../app/city-public-spaces.ts'),{commonsVenues,commonsSpawn}=require('../app/creative-plaza.ts');
  const scene=new T.Scene(),gardens=createCityPublicSpaces(scene);
  for(let z=0;z<=209;z+=.5)assert.equal(gardens.blocked(0,z,.8),false);
  assert.equal(gardens.blocked(commonsSpawn.x,commonsSpawn.z,.8),false);
  for(const venue of commonsVenues)assert.equal(gardens.blocked(venue.x,venue.z+venue.depth/2+1,.8),false);
  for(const site of publicPoolSites){assert.equal(gardens.blocked(site.x,site.z,.8),true);assert.equal(gardens.blocked(site.x,site.z,8),false)}disposeScene(scene);
});

test('each planet has a pool and turf court clear of landing caps, logo footprints and roads',()=>{
  const {createPlanetInfrastructure}=require('../app/planet-infrastructure.ts'),{createPlanetSurface,planetGeography}=require('../app/planet-geography.ts'),{transitStops}=require('../app/transit-config.ts');
  for(const stop of transitStops.slice(1)){
    const scene=new T.Scene(),surface=createPlanetSurface(stop,stop.radius),city=createPlanetInfrastructure(scene,surface);assert.ok(city.pools.length>0,stop.name+' has no pool');
    for(const pool of city.pools){const direction=pool.position.clone().sub(surface.center).normalize(),land=planetGeography(surface,direction);assert.ok(direction.y<.85);assert.ok(land.road>=9);assert.ok(land.height<=.2&&land.height>=-.1,'Pools must use gentle settlement clearings');assert.equal(city.blocked(pool.position),true)}
    disposeScene(scene);
  }
});

