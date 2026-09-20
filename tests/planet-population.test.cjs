const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const {createPlanetSurface,planetPoint,planetGeography}=require('../app/planet-geography.ts'),{planetTowns}=require('../app/planet-infrastructure.ts'),{createPlanetPopulation}=require('../app/planet-population.ts'),{disposeScene}=require('../app/scene-resources.ts');
const stop={id:'garden',name:'Garden',x:0,y:160,z:-470,color:'#93b899',theme:'garden'};

test('every planet town has moving residents and traffic distributed over both hemispheres',()=>{
  const surface=createPlanetSurface(stop,96),scene=new T.Scene(),player=new T.Group();player.position.set(1000,1000,1000);
  const population=createPlanetPopulation(scene,surface,planetTowns(surface));assert.equal(population.residents.length,66);assert.equal(population.traffic.length,6);
  assert.ok(population.residents.some(resident=>resident.position.y<surface.center.y));assert.ok(population.residents.some(resident=>resident.position.y>surface.center.y));
  const before=population.residents.map(resident=>resident.position.clone()),traffic=population.traffic.map(vehicle=>vehicle.position.clone());
  for(let frame=0;frame<40;frame++)population.update(.05,false,player,true);
  assert.ok(population.residents.filter((resident,index)=>resident.position.distanceTo(before[index])>.2).length>=50);
  assert.ok(population.traffic.some((vehicle,index)=>vehicle.position.distanceTo(traffic[index])>1));
  for(const resident of population.residents){const direction=resident.position.clone().sub(surface.center).normalize();assert.ok(planetPoint(surface,direction).distanceTo(resident.position)<1e-6);assert.equal(planetGeography(surface,direction).water,false)}
  disposeScene(scene);
});

test('residents speak varied lines, yield to visitors and hide bubbles off-world',()=>{
  const surface=createPlanetSurface(stop,96),scene=new T.Scene(),player=new T.Group(),population=createPlanetPopulation(scene,surface,planetTowns(surface));
  const resident=population.residents[0];player.position.copy(resident.position);const before=resident.position.clone();
  const lines=new Set();for(let index=0;index<8;index++)lines.add(population.interact(player.position));assert.equal(lines.size,8);assert.match(population.prompt(player.position),/Talk to/);
  population.update(.1,false,player,true);assert.ok(resident.position.distanceTo(before)<1e-8);assert.equal(population.speech.sprite.visible,true);
  population.update(.1,true,player,false);assert.equal(population.speech.sprite.visible,false);disposeScene(scene);
});
