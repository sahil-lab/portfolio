const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{sampleWorldLighting,visualWeather,createCityLightResponse}=require('../app/world-lighting.ts'),{defaultWeather}=require('../app/weather-state.ts'),{parseSave}=require('../app/persistence.ts');
test('visual day, sunset and night never modify live weather data',()=>{
 const source={...defaultWeather,isDay:true,temperature:22},before=JSON.stringify(source);
 for(const mode of ['local','day','sunset','night','cycle']){const visual=visualWeather(source,mode,220);assert.equal(visual.snapshot.temperature,22);assert.equal(JSON.stringify(source),before);assert.ok(visual.night>=0&&visual.night<=1)}
 assert.equal(visualWeather(source,'night',0).snapshot.isDay,false);assert.equal(source.isDay,true);assert.deepEqual(visualWeather(source,'local',0).tint,{});
});
test('the visual cycle progresses smoothly through daylight, sunset and night',()=>{
 let previous=sampleWorldLighting('cycle',0,true),night=false,sunset=false;
 for(let seconds=1;seconds<=480;seconds++){const next=sampleWorldLighting('cycle',seconds,true);assert.ok(Math.abs(next.night-previous.night)<.06);night||=next.night>.95;sunset||=next.sunset>.9;previous=next}assert.ok(night&&sunset);
});
test('window glow and wet pavement reuse existing materials and restore daylight finishes',()=>{
 const scene=new T.Scene(),window=new T.MeshStandardMaterial(),paving=new T.MeshStandardMaterial({roughness:.9});window.userData.surface='glass';paving.userData.cityPaving=true;scene.add(new T.Mesh(new T.BoxGeometry(),window),new T.Mesh(new T.BoxGeometry(),paving));const response=createCityLightResponse(scene);response.update(1,1,1);assert.equal(response.count,2);assert.ok(window.emissive.getHex()>0);assert.ok(paving.roughness<.5);response.update(.1,0,0);assert.equal(window.emissive.getHex(),0);assert.equal(paving.roughness,.9);
 assert.equal(parseSave(JSON.stringify({version:1,settings:{worldLighting:'night'}})).settings.worldLighting,'night');assert.equal(parseSave(JSON.stringify({version:1,settings:{worldLighting:'bad'}})).settings.worldLighting,'local');
});