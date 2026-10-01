const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createPlanetSurface,planetGeography}=require('../app/planet-geography.ts'),{createPlanetInfrastructure}=require('../app/planet-infrastructure.ts'),{createPlanetPublicSpaces}=require('../app/planet-public-spaces.ts'),{transitStops}=require('../app/transit-config.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('planet public spaces use their own architectural family and stay clear of protected geography',()=>{
 const shopThemes=new Set();
 for(const stop of transitStops.slice(1)){
  const scene=new T.Scene(),surface=createPlanetSurface(stop,stop.radius),infrastructure=createPlanetInfrastructure(scene,surface),publicSpaces=createPlanetPublicSpaces(scene,surface,infrastructure);
  assert.ok(publicSpaces.places.length>=3,stop.name+' has '+publicSpaces.places.length+' public places');
    const shops=publicSpaces.places.filter(place=>place.kind==='shop');assert.equal(shops.length,1,stop.name+' needs its own signature shop');shopThemes.add(shops[0].venue.root.userData.shopTheme);
  for(const place of publicSpaces.places){
   const geography=planetGeography(surface,place.position.clone().sub(surface.center).normalize());assert.equal(geography.water,false);assert.ok(geography.road>place.radius);assert.ok(geography.river>place.radius);assert.ok(publicSpaces.prompt(place.approach));assert.ok(publicSpaces.interact(place.approach));assert.equal(publicSpaces.blocked(place.approach),false,stop.name+' '+place.kind+' entrance blocked');
  }
  publicSpaces.update(.1,false,publicSpaces.places[0].position,true);publicSpaces.update(.1,true,new T.Vector3(),false);assert.ok(publicSpaces.places.every(place=>!place.venue.moving.visible));disposeScene(scene);
 }
 assert.equal(shopThemes.size,transitStops.length-1);
});
