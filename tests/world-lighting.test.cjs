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
test('clear daylight has directional contrast and distant haze while night leaves room for local illumination',()=>{
 const day=visualWeather(defaultWeather,'day',0).tint,night=visualWeather(defaultWeather,'night',0).tint;
 assert.ok(day.sunIntensity/day.ambient>6.5);assert.ok(day.ambient<.5);assert.ok(day.directional<=.5);assert.ok(day.fogDensity<.0007);
 assert.ok(day.sunZ>Math.abs(day.sunX));assert.equal(night.sunX,-60);assert.equal(night.sunZ,35);
 assert.ok(night.ambient<.3);assert.ok(night.sunIntensity<.3);assert.ok(night.directional<day.directional);
 assert.equal(night.ambient,.2);assert.equal(night.sunIntensity,.18);assert.equal(night.directional,.18);
 for(const kind of ['fog','storm','rain','snow'])assert.equal(visualWeather({...defaultWeather,kind},'day',0).tint.fogDensity,undefined,'weather visibility stays under the atmosphere controller');
});
test('window glow and wet pavement reuse existing materials and restore daylight finishes',()=>{
 const scene=new T.Scene(),window=new T.MeshStandardMaterial(),paving=new T.MeshStandardMaterial({roughness:.9});window.userData.surface='glass';paving.userData.cityPaving=true;scene.add(new T.Mesh(new T.BoxGeometry(),window),new T.Mesh(new T.BoxGeometry(),paving));const response=createCityLightResponse(scene);response.update(1,1,1);assert.equal(response.count,2);assert.ok(window.emissive.getHex()>0);assert.ok(paving.roughness<.5);response.update(.1,0,0);assert.equal(window.emissive.getHex(),0);assert.equal(paving.roughness,.9);
 assert.equal(parseSave(JSON.stringify({version:1,settings:{worldLighting:'night'}})).settings.worldLighting,'night');assert.equal(parseSave(JSON.stringify({version:1,settings:{worldLighting:'bad'}})).settings.worldLighting,'local');
});
test('authored night glazing levels remain distinct, bounded and reversible without adding lights',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(),levels=[0,.14,.24,.8,NaN,Infinity,3],materials=levels.map(level=>{const material=new T.MeshStandardMaterial({emissive:'#193443',emissiveIntensity:.08});material.userData.surface='glass';material.userData.nightIllumination=level;scene.add(new T.Mesh(geometry,material));return material}),response=createCityLightResponse(scene),expected=[0,.14,.24,.8,.42,.42,1.2];
 response.update(1,1,0);materials.forEach((material,index)=>assert.equal(material.emissiveIntensity,expected[index]));assert.ok(scene.children.every(object=>!object.isLight));
 response.update(.1,0,0);materials.forEach(material=>{assert.equal(material.emissiveIntensity,.08);assert.equal(material.emissive.getHex(),new T.Color('#193443').getHex())});
 materials[0].dispose();assert.equal(response.count,levels.length-1);response.dispose();materials.slice(1).forEach(material=>material.dispose());geometry.dispose();
});

test('practical light emission can feed bloom without raising the ordinary window limit or merging material roles',()=>{
 const {batchScenery}=require('../app/static-batching.ts'),scene=new T.Scene(),geometry=new T.BoxGeometry(),materials=[];
 for(const surface of ['glass','light'])for(let index=0;index<4;index++){const material=new T.MeshStandardMaterial({color:'#fff1cf',emissive:'#ffd195',emissiveIntensity:.2});material.userData.surface=surface;material.userData.nightIllumination=2.4;const mesh=new T.Mesh(geometry.clone(),material);mesh.position.set(index,0,0);scene.add(mesh);materials.push(material)}
 batchScenery(scene,{});assert.equal(scene.children.length,2);const response=createCityLightResponse(scene);response.update(1,1,0);
 for(const mesh of scene.children)assert.equal(mesh.material.emissiveIntensity,mesh.material.userData.surface==='light'?2.4:1.2);
 response.update(.1,0,0);for(const mesh of scene.children)assert.equal(mesh.material.emissiveIntensity,.2);response.dispose();
 const {disposeScene}=require('../app/scene-resources.ts');disposeScene(scene);geometry.dispose();
});

test('steady lighting skips material writes while new materials and external changes still update',context=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial({emissive:'#193443',emissiveIntensity:.08,roughness:.9});material.userData.surface='glass';material.userData.cityPaving=true;scene.add(new T.Mesh(geometry,material));
 const response=createCityLightResponse(scene);response.update(1,.8,.6);const expectedColor=material.emissive.clone(),expectedIntensity=material.emissiveIntensity,expectedRoughness=material.roughness,copy=context.mock.method(material.emissive,'copy');
 let intensity=material.emissiveIntensity,roughness=material.roughness,intensityWrites=0,roughnessWrites=0;
 Object.defineProperty(material,'emissiveIntensity',{configurable:true,get:()=>intensity,set:value=>{intensity=value;intensityWrites++}});
 Object.defineProperty(material,'roughness',{configurable:true,get:()=>roughness,set:value=>{roughness=value;roughnessWrites++}});
 for(let frame=0;frame<60;frame++)response.update(1/60,.8,.6);
 assert.equal(copy.mock.callCount(),0);assert.equal(intensityWrites,0);assert.equal(roughnessWrites,0);
 const added=new T.MeshStandardMaterial({emissive:'#193443',emissiveIntensity:.08,roughness:.9});added.userData.surface='glass';added.userData.cityPaving=true;scene.add(new T.Mesh(geometry,added));response.update(1,.8,.6);
 assert.equal(response.count,2);assert.ok(added.emissive.equals(expectedColor));assert.equal(added.emissiveIntensity,expectedIntensity);assert.equal(added.roughness,expectedRoughness);assert.equal(copy.mock.callCount(),0);
 material.emissive.setRGB(1,0,1);material.emissiveIntensity=2;material.roughness=1;response.update(.01,.8,.6);
 assert.ok(material.emissive.equals(expectedColor));assert.equal(material.emissiveIntensity,expectedIntensity);assert.equal(material.roughness,expectedRoughness);
 material.userData.preserveEmissiveColor=true;response.update(.01,.8,.6);assert.equal(material.emissive.getHexString(),'193443');
 response.update(.01,0,0);assert.equal(material.emissiveIntensity,.08);assert.equal(material.roughness,.9);added.dispose();assert.equal(response.count,1);response.dispose();
 const {disposeScene}=require('../app/scene-resources.ts');disposeScene(scene);
});