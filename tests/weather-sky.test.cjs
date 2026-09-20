const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{defaultWeather}=require('../app/weather-state.ts'),{createWeatherSky,weatherAtmosphere}=require('../app/weather-sky.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('sun, moon, stars, ambient light and clouds track the same daytime and cloud-cover data',()=>{
  const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.FogExp2();const sun=new T.DirectionalLight('#ffe1ad',2.1),ambient=new T.HemisphereLight('#ffffff','#456789',.85);scene.add(sun,ambient);
  const sky=createWeatherSky(scene,sun),clear={...defaultWeather,kind:'sunny',cloudCover:0};sky.update(clear,.1,false,true);
  assert.equal(sky.solar.visible,true);assert.equal(sky.moon.visible,false);assert.equal(sky.stars.visible,false);assert.equal(sky.clouds.children.filter(cloud=>cloud.visible).length,0);const day=ambient.intensity;
  sky.update({...clear,isDay:false},.1,false,true);assert.equal(sky.solar.visible,false);assert.equal(sky.moon.visible,true);assert.equal(sky.stars.visible,true);assert.ok(ambient.intensity<day*.4);
  sky.update({...clear,kind:'cloudy',cloudCover:100},.1,false,true);assert.equal(sky.clouds.children.filter(cloud=>cloud.visible).length,40);assert.equal(sky.solar.visible,false);
  sky.update({...clear,isDay:false},.1,false,false);assert.equal(sky.root.visible,false);assert.equal(ambient.intensity,.85);assert.equal(sun.intensity,2.1);disposeScene(scene);
});

test('default clouds cover Motherboard Central as well as the commons and respect reduced motion',()=>{
  const scene=new T.Scene(),sky=createWeatherSky(scene,new T.DirectionalLight());sky.update(defaultWeather,.1,false,true);
  const visible=sky.clouds.children.filter(cloud=>cloud.visible);assert.ok(visible.some(cloud=>cloud.position.z<10));assert.ok(visible.some(cloud=>cloud.position.z>65));
  sky.update(defaultWeather,0,true,true);const before=sky.clouds.children.map(cloud=>cloud.position.toArray());sky.update(defaultWeather,1,true,true);assert.deepEqual(sky.clouds.children.map(cloud=>cloud.position.toArray()),before);disposeScene(scene);
});

test('precipitation density follows reported conditions and precipitation while dry cold stays dry',()=>{
  assert.equal(weatherAtmosphere({...defaultWeather,kind:'cold',temperature:-5}).rainCount,0);
  assert.ok(weatherAtmosphere({...defaultWeather,kind:'rain',precipitation:5}).rainCount>weatherAtmosphere({...defaultWeather,kind:'drizzle',precipitation:.1}).rainCount);
  const sleet=weatherAtmosphere({...defaultWeather,kind:'sleet'});assert.ok(sleet.rainCount>0&&sleet.snowCount>0);
  assert.equal(weatherAtmosphere({...defaultWeather,kind:'sunny',precipitation:0}).snowCount,0);
});

test('the sun and moon fit within the permitted upward view from the motherboard workshop',()=>{
  const {createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts');
  const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1.5,.1,4000),sky=createWeatherSky(scene,new T.DirectionalLight());scene.add(player);scene.scale.setScalar(2);player.position.set(0,.8,24);scene.updateMatrixWorld(true);
  const rig=createGameCamera(camera,scene,player);rig.rotate(0,-100,false);rig.update(.016,false,defaultSettings);camera.updateMatrixWorld(true);
  for(const object of [sky.solar,sky.moon]){const projected=object.getWorldPosition(new T.Vector3()).project(camera);assert.ok(Math.abs(projected.x)<.85&&Math.abs(projected.y)<.85)}disposeScene(scene);
});
