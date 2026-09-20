const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{defaultWeather}=require('../app/weather-state.ts'),{createWeatherSky,weatherAtmosphere}=require('../app/weather-sky.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('sun, moon, stars, ambient light and clouds track the same daytime and cloud-cover data',()=>{
  const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.FogExp2();const sun=new T.DirectionalLight('#ffe1ad',2.1),ambient=new T.HemisphereLight('#ffffff','#456789',.85);scene.add(sun,ambient);
  const sky=createWeatherSky(scene,sun),clear={...defaultWeather,kind:'sunny',cloudCover:0};sky.update(clear,.1,false,true,true);
  assert.equal(sky.solar.visible,true);assert.equal(sky.moon.visible,false);assert.equal(sky.stars.visible,false);assert.equal(sky.clouds.children.filter(cloud=>cloud.visible).length,0);const day=ambient.intensity;
  sky.update({...clear,isDay:false},.1,false,true,true);assert.equal(sky.solar.visible,false);assert.equal(sky.moon.visible,true);assert.equal(sky.stars.visible,true);assert.ok(ambient.intensity<day*.4);
  sky.update({...clear,kind:'cloudy',cloudCover:100},.1,false,true,true);assert.equal(sky.clouds.children.filter(cloud=>cloud.visible).length,40);assert.equal(sky.solar.visible,false);
  sky.update({...clear,isDay:false},.1,false,false,true);assert.equal(sky.root.visible,false);assert.equal(ambient.intensity,.85);assert.equal(sun.intensity,2.1);disposeScene(scene);
});

test('weather, travel and tint changes cross-fade over seconds instead of snapping',()=>{
  const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.FogExp2();const sun=new T.DirectionalLight('#ffe1ad',2.1),ambient=new T.HemisphereLight('#ffffff','#456789',.85);sun.position.set(-25,55,25);scene.add(sun,ambient);
  const sky=createWeatherSky(scene,sun),clear={...defaultWeather,kind:'sunny',cloudCover:0};sky.update(clear,0,false,true,true);
  const daySky=scene.background.clone(),dayFog=scene.fog.density;
  sky.update({...clear,kind:'storm',cloudCover:100,precipitation:6},1/60,false,true);
  assert.ok(ambient.intensity<1.14&&ambient.intensity>.65,'one frame moves ambient only part of the way');
  assert.ok(scene.fog.density>dayFog&&scene.fog.density<.0045);assert.ok(!scene.background.equals(daySky));
  const early=sky.update({...clear,kind:'storm',cloudCover:100,precipitation:6},1/60,false,true);assert.ok(early.rainCount>0&&early.rainCount<300,'rain builds up gradually');
  for(let frame=0;frame<600;frame++)sky.update({...clear,kind:'storm',cloudCover:100,precipitation:6},1/60,false,true);
  assert.ok(Math.abs(ambient.intensity-.65)<.01);assert.ok(Math.abs(scene.fog.density-.0045)<1e-5);assert.equal(sky.clouds.children.filter(cloud=>cloud.visible).length,40);
  sky.update(clear,1/60,false,false);assert.ok(ambient.intensity<.85,'leaving the motherboard begins a fade, not a jump');assert.ok(sun.position.y<55&&sun.position.y>22);
  for(let frame=0;frame<600;frame++)sky.update(clear,1/60,false,false);assert.ok(Math.abs(ambient.intensity-.85)<.01);assert.ok(Math.abs(sun.intensity-2.1)<.01);
  sky.tint({fogDensity:.004,fogColor:'#ffd0a0'});for(let frame=0;frame<600;frame++)sky.update(clear,1/60,false,true);
  assert.ok(Math.abs(scene.fog.density-.004)<1e-5);assert.equal(scene.fog.color.getHexString(),'ffd0a0');
  sky.tint({});for(let frame=0;frame<600;frame++)sky.update(clear,1/60,false,true);assert.ok(Math.abs(scene.fog.density-.0013)<1e-5);disposeScene(scene);
});

test('default clouds cover Motherboard Central as well as the commons and respect reduced motion',()=>{
  const scene=new T.Scene(),sky=createWeatherSky(scene,new T.DirectionalLight());sky.update(defaultWeather,.1,false,true,true);
  const visible=sky.clouds.children.filter(cloud=>cloud.visible);assert.ok(visible.some(cloud=>cloud.position.z<10));assert.ok(visible.some(cloud=>cloud.position.z>65));
  assert.ok(visible.every(cloud=>cloud.children.length===1&&cloud.children[0] instanceof T.InstancedMesh&&cloud.children[0].count===4));
  sky.update(defaultWeather,0,true,true);const before=sky.clouds.children.map(cloud=>cloud.position.toArray());sky.update(defaultWeather,1,true,true);assert.deepEqual(sky.clouds.children.map(cloud=>cloud.position.toArray()),before);disposeScene(scene);
});

test('precipitation density follows reported conditions and precipitation while dry cold stays dry',()=>{
  assert.equal(weatherAtmosphere({...defaultWeather,kind:'cold',temperature:-5}).rainCount,0);
  assert.ok(weatherAtmosphere({...defaultWeather,kind:'rain',precipitation:5}).rainCount>weatherAtmosphere({...defaultWeather,kind:'drizzle',precipitation:.1}).rainCount);
  const sleet=weatherAtmosphere({...defaultWeather,kind:'sleet'});assert.ok(sleet.rainCount>0&&sleet.snowCount>0);
  assert.equal(weatherAtmosphere({...defaultWeather,kind:'sunny',precipitation:0}).snowCount,0);
});

test('atmospheric vault tracks weather without disappearing during orbital travel',()=>{
  const scene=new T.Scene(),sky=createWeatherSky(scene,new T.DirectionalLight());
  sky.update({...defaultWeather,isDay:true},0,true,true,true);const daylight=sky.dome.material.uniforms.zenith.value.clone();
  sky.update({...defaultWeather,isDay:false},0,true,true,true);assert.ok(!sky.dome.material.uniforms.zenith.value.equals(daylight));
  sky.update(defaultWeather,0,true,false,true);assert.equal(sky.root.visible,false);assert.equal(sky.dome.visible,true);assert.equal(sky.dome.material.depthWrite,false);assert.equal(sky.dome.parent,scene);disposeScene(scene);
});

test('the sun and moon fit within the permitted upward view from the motherboard workshop',()=>{
  const {createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts');
  const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1.5,.1,4000),sky=createWeatherSky(scene,new T.DirectionalLight());scene.add(player);scene.scale.setScalar(2);player.position.set(0,.8,24);scene.updateMatrixWorld(true);
  const rig=createGameCamera(camera,scene,player);rig.rotate(0,-100,false);rig.update(.016,false,defaultSettings);camera.updateMatrixWorld(true);
  for(const object of [sky.solar,sky.moon]){const projected=object.getWorldPosition(new T.Vector3()).project(camera);assert.ok(Math.abs(projected.x)<.85&&Math.abs(projected.y)<.85)}disposeScene(scene);
});
