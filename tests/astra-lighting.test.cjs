const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {astraLightStory}=require('../app/astra-lighting.ts'),{defaultWeather}=require('../app/weather-state.ts');
const T=require('three'),{astraSkyTint,createAstraAtmosphere}=require('../app/astra-atmosphere.ts');
test('clear daylight retains depth without bleaching the foreground foliage',()=>{
 const {astraPalette}=require('../app/astra-lighting.ts'),look=astraLightStory({...defaultWeather,cloudCover:0,isDay:true,updatedAt:'2026-09-20T12:00'});
 assert.ok(look.fog<.001);assert.ok(look.environment<=.35);
 const leaf=new T.Color(astraPalette.leaf),tip=new T.Color(astraPalette.leafLight);assert.ok(leaf.g>leaf.r&&leaf.g>leaf.b);assert.ok(tip.g>leaf.g);assert.ok(tip.g<.4);
});

test('local daylight lights the workshop fronts with a stronger key than fill',()=>{
 const weather={...defaultWeather,cloudCover:0,isDay:true,updatedAt:'2026-09-20T12:00'},day=astraSkyTint(weather),night=astraSkyTint({...weather,isDay:false});
 assert.ok(day.sunX<0);assert.ok(day.sunZ>0);assert.ok(day.sunY>45);assert.ok(day.sunIntensity/day.ambient>6.5);
 const sun=new T.Color(day.sunColor);assert.ok(sun.r>sun.g&&sun.g>sun.b);
 assert.equal(night.sunX,-40);assert.equal(night.sunZ,-44);assert.equal(night.sunY,36);
});

test('Astra preserves its moonlight values while daylight uses less fill',()=>{
  const noon=astraLightStory({...defaultWeather,cloudCover:0,updatedAt:'2026-09-20T12:00'}),night=astraLightStory({...defaultWeather,isDay:false});
  assert.ok(night.environment<noon.environment*.35);assert.ok(night.ambient<noon.ambient);assert.equal(night.ambient,.24);assert.equal(night.sunlight,.38);assert.equal(night.rim,.4);assert.ok(night.pools>noon.pools*5);
});

test('golden light follows reported wall time without turning rain or night into sunset',()=>{
  const clear={...defaultWeather,cloudCover:10,updatedAt:'2026-09-20T18:00'},golden=astraLightStory(clear),noon=astraLightStory({...clear,updatedAt:'2026-09-20T12:00'});
  assert.ok(golden.golden>.8);assert.equal(noon.golden,0);assert.notEqual(golden.horizon,noon.horizon);assert.ok(golden.ambient<noon.ambient);
  assert.equal(astraLightStory({...clear,kind:'rain'}).golden,0);assert.equal(astraLightStory({...clear,isDay:false}).golden,0);
  assert.equal(astraLightStory({...clear,cloudCover:100}).golden,0);
});

test('weather data remains unchanged and all fallback lighting values are bounded',()=>{
  const source={...defaultWeather,updatedAt:'invalid'},before={...source};
  for(const kind of ['sunny','rain','storm','fog','cold','snow','sleet'])for(const isDay of [true,false]){
    const story=astraLightStory({...source,kind,isDay});
    for(const key of ['ambient','environment','rim','fog','golden','pools'])assert.ok(Number.isFinite(story[key])&&story[key]>=0&&story[key]<=1);
  }
  assert.deepEqual(source,before);
});

test('Astra uses the shared tint hook and restores off-world reflections without changing weather',()=>{
  const scene=new T.Scene();scene.environmentIntensity=.58;const light=new T.HemisphereLight('#eef8f2','#506a67',1.1);scene.add(light);
  const original=light.groundColor.clone(),calls=[],direction=createAstraAtmosphere(scene,look=>calls.push(look));
  direction.update({...defaultWeather,isDay:false},0,true);assert.equal(scene.environmentIntensity,astraLightStory({...defaultWeather,isDay:false}).environment);
  for(let frame=0;frame<100;frame++)direction.update({...defaultWeather,isDay:false},.05,true);
  assert.equal(calls.length,1);assert.ok(scene.environmentIntensity<.21);assert.notEqual(light.groundColor.getHex(),original.getHex());
  for(let frame=0;frame<150;frame++)direction.update(defaultWeather,.05,false);
  assert.deepEqual(calls.at(-1),{});assert.ok(Math.abs(scene.environmentIntensity-.58)<.001);
  for(const channel of ['r','g','b'])assert.ok(Math.abs(light.groundColor[channel]-original[channel])<.001);
  const look=astraSkyTint({...defaultWeather,updatedAt:'2026-09-20T18:00',cloudCover:0});assert.ok(look.sunY<22);assert.ok(look.ambient<.7);
});
