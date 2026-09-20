const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
global.document={createElement:()=>{const canvas={width:0,height:0};const context=new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});canvas.getContext=()=>context;return canvas;}};
const {createCreativePlaza,commonsVenues,commonsSpawn}=require('../app/creative-plaza.ts'),{createWeatherWorld}=require('../app/weather-world.ts'),{defaultWeather}=require('../app/weather-state.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('commons venues have separated lots and a clear central promenade',()=>{
  for(const [index,venue] of commonsVenues.entries())for(const other of commonsVenues.slice(index+1))assert.ok(Math.abs(venue.x-other.x)>(venue.width+other.width)/2+3||Math.abs(venue.z-other.z)>(venue.depth+other.depth)/2+3,venue.id+' crowds '+other.id);
  const scene=new T.Scene(),player=new T.Group(),plaza=createCreativePlaza(scene,player,{notice(){},subtitle(){},sound(){}});
  assert.ok(plaza.root.userData.staticCameraBounds.length>=6,'shop and vending bodies must obstruct the camera');
  assert.equal(plaza.blocked(commonsSpawn.x,commonsSpawn.z,.8),false);
  for(let z=50;z<=138;z+=.5)assert.equal(plaza.blocked(0,z,.8),false,'a shop blocks the central avenue at '+z);
  for(const venue of commonsVenues){player.position.set(venue.x,.8,venue.z+venue.depth/2+1.5);assert.equal(plaza.blocked(player.position.x,player.position.z,.8),false);assert.equal(plaza.interact(),true)}
  player.position.set(-24,.8,78);assert.match(plaza.prompt(),/Pixel/);assert.equal(plaza.interact(),true);plaza.update(.1,false,true);assert.equal(plaza.speaker.speaking,false);assert.match(plaza.voice.speech.snapshot.error,/Voice input is unavailable/);plaza.dispose();disposeScene(scene);
});

test('weather screen switches rain and snow without changing the readable default details',()=>{
  const scene=new T.Scene(),player=new T.Group(),sun=new T.DirectionalLight(),weather=createWeatherWorld(scene,player,sun);
  assert.ok(scene.getObjectByName('Weather_Display'));assert.equal(weather.snapshot.temperature,25);
  weather.update(.1,false,true,false);assert.equal(scene.getObjectByName('Weather_Rain').visible,false);assert.equal(scene.getObjectByName('Weather_Clouds').visible,true);
  weather.set({...defaultWeather,kind:'rain',label:'Rain',cloudCover:90});weather.update(.1,false,true,false);assert.equal(scene.getObjectByName('Weather_Rain').visible,true);
  weather.set({...defaultWeather,kind:'snow',label:'Snow',temperature:-2});weather.update(.1,false,true,false);assert.equal(scene.getObjectByName('Weather_Snow').visible,true);assert.equal(scene.getObjectByName('Weather_Rain').visible,false);
  weather.set({...defaultWeather,kind:'cold',label:'Cold',temperature:-3});weather.update(.1,false,true,false);assert.ok(sun.color.b>sun.color.r);assert.equal(scene.getObjectByName('Weather_Snow').visible,false);
  weather.update(.1,true,false,false);assert.equal(scene.getObjectByName('Weather_Snow').visible,false);assert.equal(weather.blocked(11.5,63,.8),true);assert.equal(weather.blocked(0,70,.8),false);disposeScene(scene);
});

test('walking routes connect the expanded commons back to the portfolio district',()=>{
  const {planWalkingRoute}=require('../app/walking-route.ts');
  const route=planWalkingRoute({x:0,z:135},{x:13,z:42},()=>false);
  assert.ok(route.length>1);assert.deepEqual(route[0],{x:0,z:135});assert.deepEqual(route[route.length-1],{x:13,z:42});
});

test('Pixel interaction directly starts and stops recognition without opening a panel',()=>{
  const previous=global.SpeechRecognition;let capture,starts=0,stops=0,enabled=0;
  global.SpeechRecognition=class{constructor(){capture=this}start(){starts++;this.onstart?.()}stop(){stops++;this.onend?.()}abort(){}};
  const scene=new T.Scene(),player=new T.Group();const plaza=createCreativePlaza(scene,player,{notice(){},subtitle(){},sound(){},enableVoice:()=>enabled++});
  try{
    player.position.set(-24,.8,81);plaza.update(.1,false,true);assert.equal(starts,0);assert.match(plaza.prompt(),/Speak to Pixel/);
    assert.equal(plaza.interact(),true);assert.equal(starts,1);assert.equal(enabled,1);assert.equal(capture.continuous,true);assert.match(plaza.prompt(),/Stop and send/);assert.equal(plaza.speaker.speaking,false);
    plaza.interact();assert.equal(stops,1);assert.match(plaza.voice.speech.snapshot.error,/No speech/);assert.equal(plaza.portraitCanvas.width,768);
  }finally{plaza.dispose();disposeScene(scene);if(previous)global.SpeechRecognition=previous;else delete global.SpeechRecognition}
});

test('the complete weather screen fits the commons arrival view on desktop and narrow phones',()=>{
  const {createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts');
  for(const [width,height] of [[1440,960],[390,844],[320,926]])for(const stableCamera of [false,true]){
    const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,width/height,.1,4000),sun=new T.DirectionalLight();scene.add(player);scene.scale.setScalar(2);player.position.set(commonsSpawn.x,commonsSpawn.y,commonsSpawn.z);createWeatherWorld(scene,player,sun);scene.updateMatrixWorld(true);
    const rig=createGameCamera(camera,scene,player);rig.reset({yaw:0,pitch:.23,zoom:Math.max(54,Math.min(160,40/camera.aspect)),focusHeight:10});rig.update(.016,false,{...defaultSettings,stableCamera},false,10);camera.updateMatrixWorld(true);
    const screen=scene.getObjectByName('Weather_Display'),positions=screen.geometry.getAttribute('position');
    for(let index=0;index<positions.count;index++){const point=new T.Vector3().fromBufferAttribute(positions,index).applyMatrix4(screen.matrixWorld).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,`${width}x${height} crops the weather screen`)}disposeScene(scene);
  }
});
