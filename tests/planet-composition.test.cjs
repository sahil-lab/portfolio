const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{planetTownComposition}=require('../app/planet-composition.ts'),{transitStops}=require('../app/transit-config.ts'),{createPlanetSurface,planetGeography}=require('../app/planet-geography.ts'),{createPlanetInfrastructure}=require('../app/planet-infrastructure.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('nine neighborhood layouts are spatially distinct and bounded around their existing road corridors',()=>{
 const layouts=transitStops.slice(1).map(stop=>[-1,1].flatMap(side=>[-16,-8,0,8,16].map(along=>planetTownComposition(stop,along,side))));assert.equal(new Set(layouts.map(layout=>JSON.stringify(layout.map(({east,north})=>[east,north])))).size,9);
 for(const layout of layouts)for(const lot of layout){assert.ok(Math.abs(lot.east)<20);assert.ok(Math.abs(lot.north)>=10&&Math.abs(lot.north)<18);assert.ok(lot.height>=.8&&lot.height<=1.3)}
});
test('recomposed towns keep every accepted lot and avoid water, roads and neighboring homes',()=>{
 const {architectureStoreys}=require('../app/building-craft.ts');
 for(const stop of transitStops.slice(1)){
  const scene=new T.Scene(),surface=createPlanetSurface(stop,stop.radius),world=createPlanetInfrastructure(scene,surface),records=world.architecture.flatMap(town=>town.records),composition=world.root.userData.composition;
  assert.equal(records.length,world.buildings.length);assert.equal(records.length,composition.buildings);assert.ok(composition.relocated>0,stop.id);assert.equal(new Set(records.map(record=>record.address)).size,records.length);
    for(const record of records)assert.equal(architectureStoreys(record.height*record.recipe.height,record.recipe.rhythm),architectureStoreys(record.baseHeight*record.recipe.height,record.recipe.rhythm),'existing storey budget for '+record.address);
  world.buildings.forEach((building,index)=>{const terrain=planetGeography(surface,building.position.clone().sub(surface.center).normalize());assert.ok(terrain.road>=5.8&&terrain.river>=5);assert.ok(world.buildings.every((other,otherIndex)=>otherIndex===index||other.position.distanceTo(building.position)>=6.2))});disposeScene(scene);
 }
});
